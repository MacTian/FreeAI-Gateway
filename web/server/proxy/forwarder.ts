import axios from 'axios'
import { Readable } from 'stream'
import { store } from '../store.js'
import type { Provider, Account } from '../types.js'
import { selectTarget } from './loadbalancer.js'

// 收集 SSE 流中的所有 chunks，拼成一个完整的 chat.completion 对象
async function collectSSEToCompletion(stream: Readable, model: string): Promise<any> {
  return new Promise((resolve, reject) => {
    let fullContent = ''
    let fullReasoning = ''
    let id = ''
    let toolCalls: any[] = []
    let finishReason = 'stop'
    let buf = ''

    stream.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (!id && parsed.id) id = parsed.id
          const delta = parsed.choices?.[0]?.delta
          if (!delta) continue
          if (delta.content) fullContent += delta.content
          if (delta.reasoning_content) fullReasoning += delta.reasoning_content
          if (delta.tool_calls) {
            delta.tool_calls.forEach((tc: any) => {
              const idx = tc.index ?? toolCalls.length
              if (!toolCalls[idx]) toolCalls[idx] = { ...tc, function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' } }
              else if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments
            })
            finishReason = 'tool_calls'
          }
          if (parsed.choices?.[0]?.finish_reason) finishReason = parsed.choices[0].finish_reason
        } catch { /* ignore */ }
      }
    })
    stream.once('error', reject)
    stream.once('end', () => {
      const validToolCalls = toolCalls.filter(Boolean)
      // 按函数名去重（部分供应商如 Qwen 会重复发送相同的 tool_call）
      const seenFnNames = new Set<string>()
      const dedupedToolCalls = validToolCalls.filter((tc: any) => {
        const key = tc.function?.name + JSON.stringify(tc.function?.arguments)
        if (seenFnNames.has(key)) return false
        seenFnNames.add(key)
        return true
      })
      resolve({
        id: id || '',
        model,
        object: 'chat.completion',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: dedupedToolCalls.length > 0 ? null : (fullContent || null),
            reasoning_content: fullReasoning || null,
            ...(dedupedToolCalls.length > 0 ? { tool_calls: dedupedToolCalls } : {}),
          },
          finish_reason: finishReason,
        }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        created: Math.floor(Date.now() / 1000),
      })
    })
  })
}

export interface ChatMessage {
  role: string
  content: string | any[]
  tool_calls?: any[]
  tool_call_id?: string
  name?: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  top_p?: number
  tools?: any[]
  tool_choice?: any
  [key: string]: any
}

export interface ForwardResult {
  success: boolean
  data?: any
  error?: string
  statusCode?: number
}

// 懒加载适配器，避免启动时 import 报错
let adapters: any = null
async function getAdapters() {
  if (!adapters) {
    try {
      adapters = await import('./adapters/index.js')
    } catch (e) {
      console.warn('[Forwarder] Failed to load adapters, using generic forward:', e)
      adapters = {}
    }
  }
  return adapters
}

// 根据 provider vendor/id 判断使用哪个适配器
function getProviderVendor(provider: Provider): string {
  const id = (provider as any).vendor || provider.id || ''
  const name = (provider.name || '').toLowerCase()
  const endpoint = (provider.apiEndpoint || '').toLowerCase()
  if (id === 'glm' || name.includes('glm') || name.includes('chatglm') || endpoint.includes('chatglm')) return 'glm'
  if (id === 'deepseek' || name.includes('deepseek') || endpoint.includes('deepseek')) return 'deepseek'
  if (id === 'kimi' || name.includes('kimi') || endpoint.includes('kimi') || endpoint.includes('moonshot')) return 'kimi'
  if (id === 'minimax' || name.includes('minimax') || endpoint.includes('minimax')) return 'minimax'
  if (id === 'qwen' || name.includes('qwen') || name.includes('通义') || endpoint.includes('qwen')) return 'qwen'
  if (id === 'qwen-ai' || endpoint.includes('dashscope')) return 'qwen-ai'
  if (id === 'zai' || name.includes('zai') || name.includes('z.ai') || endpoint.includes('zaibot') || endpoint.includes('chat.z.ai')) return 'zai'
  if (id === 'perplexity' || name.includes('perplexity') || endpoint.includes('perplexity.ai')) return 'perplexity'
  return 'generic'
}

// 把 OpenAI 请求格式化为供应商格式并转发
export async function forwardRequest(
  req: ChatCompletionRequest,
  res: any  // Express Response (for streaming)
): Promise<ForwardResult> {
  const target = selectTarget(undefined, undefined, req.model)
  if (!target) {
    return { success: false, error: '没有可用的供应商账户。请在管理界面添加供应商并配置账户。', statusCode: 503 }
  }

  const { provider, account } = target

  const startTime = Date.now()
  try {
    store.incrementAccountUsage(account.id)
    const result = await dispatchToProvider(provider, account, req, res)
    const duration = Date.now() - startTime
    store.addRequestLog({
      id: crypto.randomUUID(),
      providerId: provider.id,
      accountId: account.id,
      model: req.model,
      success: result.success,
      duration,
      timestamp: Date.now(),
    })
    return result
  } catch (err: any) {
    const duration = Date.now() - startTime
    console.error('[Forwarder] Error:', err.message)
    store.updateAccount(account.id, { status: 'error', errorMessage: err.message })
    store.addRequestLog({
      id: crypto.randomUUID(),
      providerId: provider.id,
      accountId: account.id,
      model: req.model,
      success: false,
      duration,
      timestamp: Date.now(),
    })
    return { success: false, error: err.message, statusCode: 502 }
  }
}

async function dispatchToProvider(
  provider: Provider,
  account: Account,
  req: ChatCompletionRequest,
  res: any
): Promise<ForwardResult> {
  const vendor = getProviderVendor(provider)
  const adps = await getAdapters()

  try {
    switch (vendor) {
      case 'glm': {
        const { GLMAdapter, GLMStreamHandler } = adps
        if (!GLMAdapter) break
        const adapter = new GLMAdapter(provider, account)
        const { response } = await adapter.chatCompletion(req)
        const handler = new GLMStreamHandler(req.model)
        if (req.stream) {
          const transStream = await handler.handleStream(response.data)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve, reject) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] Stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          // 自动清理 GLM 会话
          const convId = handler.getConversationId()
          if (convId) adapter.deleteConversation(convId).catch(() => {})
          return { success: true }
        } else {
          // 非流式模式：先经过 handleStream 转换（捕获图片等内容），再收集 SSE chunks 拼成完整结果
          const transStream = await handler.handleStream(response.data)
          const data = await collectSSEToCompletion(transStream, req.model)
          // 自动清理 GLM 会话，防止 GLM 页面积累历史记录
          const convId = handler.getConversationId()
          if (convId) adapter.deleteConversation(convId).catch(() => {})
          return { success: true, data }
        }
      }
      case 'deepseek': {
        const { DeepSeekAdapter, DeepSeekStreamHandler } = adps
        if (!DeepSeekAdapter) break
        const adapter = new DeepSeekAdapter(provider, account)
        const { response, sessionId } = await adapter.chatCompletion(req)
        const handler = new DeepSeekStreamHandler(req.model)
        if (req.stream) {
          const transStream = await handler.handleStream(response.data)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve, reject) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] Stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          if (sessionId) adapter.deleteSession(sessionId).catch(() => {})
          return { success: true }
        } else {
          const data = await handler.handleNonStream(response.data)
          if (sessionId) adapter.deleteSession(sessionId).catch(() => {})
          return { success: true, data }
        }
      }
      case 'kimi': {
        const { KimiAdapter, KimiStreamHandler } = adps
        if (!KimiAdapter) break
        const adapter = new KimiAdapter(provider, account)
        const { response, conversationId } = await adapter.chatCompletion(req)
        const handler = new KimiStreamHandler(req.model, conversationId)
        if (req.stream) {
          const transStream = await handler.handleStream(response.data)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve, reject) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] Stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          if (conversationId) adapter.deleteConversation(conversationId).catch(() => {})
          return { success: true }
        } else {
          const data = await handler.handleNonStream(response.data)
          if (conversationId) adapter.deleteConversation(conversationId).catch(() => {})
          return { success: true, data }
        }
      }
      case 'minimax': {
        const { MiniMaxAdapter, MiniMaxStreamHandler } = adps
        if (!MiniMaxAdapter) break
        const adapter = new MiniMaxAdapter(provider, account)
        const { response, stream, chatId } = await adapter.chatCompletion(req)
        if (response && response.status >= 400) {
          throw new Error(`MiniMax API error: HTTP ${response.status}`)
        }
        const handler = new MiniMaxStreamHandler(req.model, chatId, async (cid) => {
          adapter.deleteChat(cid).catch(() => {})
        })
        if (req.stream && stream) {
          const transStream = await handler.handleStream(stream.stream as any)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] MiniMax stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          return { success: true }
        } else if (response) {
          adapter.deleteChat(chatId).catch(() => {})
          return { success: true, data: response.data }
        }
        break
      }
      case 'qwen': {
        const { QwenAdapter, QwenStreamHandler } = adps
        if (!QwenAdapter) break
        const adapter = new QwenAdapter(provider, account)
        const result = await adapter.chatCompletion(req)
        const handler = new QwenStreamHandler(req.model)
        if (req.stream) {
          const transStream = await handler.handleStream(result.response.data, result.response)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve, reject) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] Stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          const sessionId = handler.getSessionId()
          if (sessionId) adapter.deleteSession(sessionId).catch(() => {})
          return { success: true }
        } else {
          // 非流式模式：先经过 handleStream 转换，再收集 SSE chunks
          const transStream = await handler.handleStream(result.response.data, result.response)
          const data = await collectSSEToCompletion(transStream, req.model)
          const sessionId = handler.getSessionId()
          if (sessionId) adapter.deleteSession(sessionId).catch(() => {})
          return { success: true, data }
        }
      }
      case 'zai': {
        const { ZaiAdapter, ZaiStreamHandler } = adps
        if (!ZaiAdapter) break
        const adapter = new ZaiAdapter(provider, account)
        const { response, chatId } = await adapter.chatCompletion(req)
        const handler = new ZaiStreamHandler(req.model)
        handler.token = account.credentials?.token || account.credentials?.apiKey || ''
        if (req.stream) {
          const transStream = await handler.handleStream(response.data)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve, reject) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] Stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          if (chatId) adapter.deleteChat(chatId).catch(() => {})
          return { success: true }
        } else {
          const data = await handler.handleNonStream(response.data)
          if (chatId) adapter.deleteChat(chatId).catch(() => {})
          return { success: true, data }
        }
      }
      case 'perplexity': {
        const { PerplexityAdapter, PerplexityStreamHandler } = adps
        if (!PerplexityAdapter) break
        const adapter = new PerplexityAdapter(provider, account)
        const { stream, sessionId } = await adapter.chatCompletion(req)
        const handler = new PerplexityStreamHandler(req.model, sessionId, undefined, adapter)
        if (req.stream) {
          const transStream = await handler.handleStream(stream)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')
          transStream.pipe(res)
          await new Promise<void>((resolve, reject) => {
            transStream.on('end', resolve)
            transStream.on('error', (e) => { console.error('[Forwarder] Stream error:', e.message); resolve() })
            res.on('close', resolve)
          })
          if (sessionId) adapter.deleteSession(sessionId).catch(() => {})
          return { success: true }
        } else {
          const data = await handler.handleNonStream(stream)
          if (sessionId) adapter.deleteSession(sessionId).catch(() => {})
          return { success: true, data }
        }
      }
      default:
        break
    }
  } catch (err: any) {
    console.error(`[Forwarder][${vendor}] Adapter error:`, err.message)
    // 适配器失败则降级到通用转发
  }

  // 通用 HTTP 转发（兜底）
  return await genericForward(provider, account, req, res)
}

// 通用 HTTP 转发：直接把 OpenAI 格式请求转发到自定义端点
async function genericForward(
  provider: Provider,
  account: Account,
  req: ChatCompletionRequest,
  res: any
): Promise<ForwardResult> {
  const endpoint = provider.apiEndpoint + (provider.chatPath || '/v1/chat/completions')
  const token = account.credentials?.token || account.credentials?.apiKey || ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...provider.headers,
  }

  if (req.stream) {
    const response = await axios.post(endpoint, req, {
      headers,
      responseType: 'stream',
      timeout: 120000,
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    response.data.pipe(res)
    await new Promise<void>((resolve, reject) => {
      response.data.on('end', resolve)
      response.data.on('error', reject)
    })
    return { success: true }
  } else {
    const response = await axios.post(endpoint, req, { headers, timeout: 120000 })
    return { success: true, data: response.data }
  }
}
