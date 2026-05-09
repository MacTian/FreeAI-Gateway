/**
 * Anthropic 兼容 API 路由
 * POST /v1/messages — 接受 Anthropic 格式，转发为 OpenAI 格式
 */
import { Router, Request, Response } from 'express'
import { store } from '../store.js'
import { forwardRequest } from '../proxy/forwarder.js'
import { selectTarget } from '../proxy/loadbalancer.js'
import { apiKeyAuth } from './v1.js'
import { randomUUID } from 'crypto'

export const anthropicRouter = Router()

// Anthropic content block: string | array of content objects
function normalizeContent(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block.type === 'text') return block.text
        if (block.type === 'image') return '[image]'
        return ''
      })
      .join('')
  }
  return String(content || '')
}

// 从 Anthropic content blocks 中提取 tool_use blocks
function extractToolUseBlocks(content: any): any[] {
  if (!Array.isArray(content)) return []
  return content.filter((block: any) => block.type === 'tool_use')
}

// 从 Anthropic content blocks 中提取 tool_result blocks (role=user 时的工具返回)
function extractToolResultMessages(msg: any): { toolResultMessages: any[], hasTextContent: boolean } {
  if (!Array.isArray(msg.content)) {
    return { toolResultMessages: [], hasTextContent: !!msg.content }
  }

  const toolResultBlocks = msg.content.filter((block: any) => block.type === 'tool_result')
  const otherBlocks = msg.content.filter((block: any) => block.type !== 'tool_result')

  // 每个 tool_result 变成一个独立的 user 消息（带 tool_call_id）
  const toolResultMessages = toolResultBlocks.map((block: any) => ({
    role: 'tool',
    tool_call_id: block.tool_use_id || '',
    content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
  }))

  return {
    toolResultMessages,
    hasTextContent: otherBlocks.length > 0,
  }
}

// Anthropic → OpenAI 请求转换
function convertAnthropicToOpenAI(body: any) {
  const messages: any[] = []

  // Anthropic 的 system 是顶级字段，OpenAI 放在 messages[0]
  if (body.system) {
    messages.push({
      role: 'system',
      content: typeof body.system === 'string' ? body.system : normalizeContent(body.system),
    })
  }

  // 转换 messages
  for (const msg of body.messages || []) {
    if (msg.role === 'assistant') {
      // assistant 消息：需要保留 tool_calls（Anthropic 格式是 content 中的 tool_use blocks）
      const toolUseBlocks = extractToolUseBlocks(msg.content)

      if (toolUseBlocks.length > 0) {
        // 有工具调用：转成 OpenAI 的 tool_calls 格式
        const toolCalls = toolUseBlocks.map((block: any, idx: number) => ({
          id: block.id || `call_${idx}`,
          type: 'function',
          function: {
            name: block.name || '',
            arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input || {}),
          },
        }))

        const textContent = normalizeContent(msg.content)
        messages.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls,
        })
      } else {
        // 普通 assistant 消息
        messages.push({
          role: 'assistant',
          content: normalizeContent(msg.content),
        })
      }
    } else if (msg.role === 'user') {
      // user 消息：需要检查是否包含 tool_result blocks
      if (Array.isArray(msg.content)) {
        const { toolResultMessages, hasTextContent } = extractToolResultMessages(msg)

        // 先添加 tool 角色的消息（每个 tool_result 一个）
        messages.push(...toolResultMessages)

        // 如果还有普通文本内容，添加 user 消息
        if (hasTextContent) {
          const textBlocks = msg.content.filter((block: any) => block.type !== 'tool_result')
          messages.push({
            role: 'user',
            content: normalizeContent(textBlocks),
          })
        }
      } else {
        messages.push({
          role: 'user',
          content: normalizeContent(msg.content),
        })
      }
    } else {
      messages.push({
        role: msg.role,
        content: normalizeContent(msg.content),
      })
    }
  }

  const openaiBody: any = {
    model: body.model,
    messages,
    stream: !!body.stream,
  }

  if (body.max_tokens) openaiBody.max_tokens = body.max_tokens
  if (body.temperature !== undefined) openaiBody.temperature = body.temperature
  if (body.top_p !== undefined) openaiBody.top_p = body.top_p
  if (body.stop_sequences) openaiBody.stop = body.stop_sequences

  // 透传 tools 定义（Anthropic → OpenAI 格式转换）
  if (body.tools && Array.isArray(body.tools)) {
    openaiBody.tools = body.tools.map((tool: any) => {
      // Anthropic 格式: { name, description, input_schema }
      // OpenAI 格式: { type: 'function', function: { name, description, parameters } }
      if (tool.type === 'function') return tool // 已经是 OpenAI 格式
      return {
        type: 'function',
        function: {
          name: tool.name || '',
          description: tool.description || '',
          parameters: tool.input_schema || {},
        },
      }
    })
  }

  if (body.tool_choice) {
    if (typeof body.tool_choice === 'object' && body.tool_choice.type === 'auto') {
      openaiBody.tool_choice = 'auto'
    } else if (typeof body.tool_choice === 'object' && body.tool_choice.type === 'any') {
      openaiBody.tool_choice = 'required'
    } else if (typeof body.tool_choice === 'object' && body.tool_choice.name) {
      openaiBody.tool_choice = {
        type: 'function',
        function: { name: body.tool_choice.name },
      }
    } else {
      openaiBody.tool_choice = body.tool_choice
    }
  }

  return openaiBody
}

// OpenAI tool_call → Anthropic tool_use content block
function openaiToolCallToAnthropicToolUse(tc: any, index: number) {
  return {
    type: 'tool_use',
    id: tc.id || `toolu_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    name: tc.function?.name || '',
    input: (() => {
      try {
        return JSON.parse(tc.function?.arguments || '{}')
      } catch {
        return {}
      }
    })(),
  }
}

// OpenAI → Anthropic 非流式响应转换
function convertOpenAIToAnthropic(openaiResponse: any, requestModel: string) {
  const choice = openaiResponse.choices?.[0]
  const message = choice?.message
  const content = message?.content
  const toolCalls = message?.tool_calls
  const finishReason = choice?.finish_reason || 'stop'

  const stopReasonMap: Record<string, string> = {
    stop: 'end_turn',
    length: 'max_tokens',
    tool_calls: 'tool_use',
    content_filter: 'end_turn',
  }

  // 构建 Anthropic content blocks
  const anthropicContent: any[] = []

  // 如果有 tool_calls，先添加文本内容（如果有），然后添加 tool_use blocks
  if (toolCalls && toolCalls.length > 0) {
    if (content) {
      anthropicContent.push({ type: 'text', text: content })
    }
    for (let i = 0; i < toolCalls.length; i++) {
      anthropicContent.push(openaiToolCallToAnthropicToolUse(toolCalls[i], i))
    }
  } else if (content) {
    anthropicContent.push({ type: 'text', text: content })
  }

  // 确保至少有一个 content block
  if (anthropicContent.length === 0) {
    anthropicContent.push({ type: 'text', text: '' })
  }

  return {
    id: openaiResponse.id || `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    content: anthropicContent,
    model: requestModel,
    stop_reason: stopReasonMap[finishReason] || 'end_turn',
    usage: {
      input_tokens: openaiResponse.usage?.prompt_tokens || 0,
      output_tokens: openaiResponse.usage?.completion_tokens || 0,
    },
  }
}

// 写 SSE 事件
function writeSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// OpenAI → Anthropic 流式响应转换
function handleAnthropicStream(openaiRes: Response, anthropicRes: Response, requestModel: string, requestId: string) {
  let started = false
  let textBlockIndex: number | null = null // 当前 text content block 的 index
  let inputTokens = 0
  let outputTokens = 0
  let buf = ''
  let toolCallBuffers: Map<number, {
    id: string
    name: string
    arguments: string
    contentBlockIndex: number
    blockStarted: boolean
  }> = new Map()
  let nextContentBlockIndex = 0
  let pendingStopReason: string | null = null

  // 发送 message_start
  writeSSE(anthropicRes, 'message_start', {
    type: 'message_start',
    message: {
      id: requestId,
      type: 'message',
      role: 'assistant',
      content: [],
      model: requestModel,
      stop_reason: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  })

  function finalizeStream(stopReason: string) {
    if (anthropicRes.writableEnded) return

    // 关闭所有未完成的 tool_use blocks
    for (const [, tc] of toolCallBuffers) {
      if (tc.blockStarted) {
        writeSSE(anthropicRes, 'content_block_stop', { type: 'content_block_stop', index: tc.contentBlockIndex })
      }
    }
    toolCallBuffers.clear()

    // 关闭 text block
    if (textBlockIndex !== null) {
      writeSSE(anthropicRes, 'content_block_stop', { type: 'content_block_stop', index: textBlockIndex })
      textBlockIndex = null
    }

    writeSSE(anthropicRes, 'message_delta', {
      type: 'message_delta',
      delta: { stop_reason: stopReason, stop_sequence: null },
      usage: { output_tokens: outputTokens },
    })
    writeSSE(anthropicRes, 'message_stop', { type: 'message_stop' })
    anthropicRes.end()
  }

  openaiRes.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    const lines = buf.split('\n')
    buf = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        finalizeStream(pendingStopReason || 'end_turn')
        return
      }

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta

        // 提取 usage
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens || inputTokens
          outputTokens = parsed.usage.completion_tokens || outputTokens
        }

        // 处理文本内容
        if (delta?.content) {
          if (textBlockIndex === null) {
            textBlockIndex = nextContentBlockIndex++
            writeSSE(anthropicRes, 'content_block_start', {
              type: 'content_block_start',
              index: textBlockIndex,
              content_block: { type: 'text', text: '' },
            })
          }
          writeSSE(anthropicRes, 'content_block_delta', {
            type: 'content_block_delta',
            index: textBlockIndex,
            delta: { type: 'text_delta', text: delta.content },
          })
        }

        // 处理 tool_calls（流式聚合）
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index
            if (idx === undefined) continue

            let buffered = toolCallBuffers.get(idx)
            if (!buffered) {
              buffered = {
                id: tc.id || `toolu_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
                contentBlockIndex: nextContentBlockIndex++,
                blockStarted: false,
              }
              toolCallBuffers.set(idx, buffered)
            } else {
              if (tc.id) buffered.id = tc.id
              if (tc.function?.name) buffered.name = tc.function.name
              if (tc.function?.arguments) buffered.arguments += tc.function.arguments
            }

            // 当 name 到达时，发送 content_block_start
            if (!buffered.blockStarted && buffered.name) {
              buffered.blockStarted = true
              // 先关闭 text block（如果有）
              if (textBlockIndex !== null) {
                writeSSE(anthropicRes, 'content_block_stop', { type: 'content_block_stop', index: textBlockIndex })
                textBlockIndex = null
              }
              writeSSE(anthropicRes, 'content_block_start', {
                type: 'content_block_start',
                index: buffered.contentBlockIndex,
                content_block: {
                  type: 'tool_use',
                  id: buffered.id,
                  name: buffered.name,
                  input: {},
                },
              })
            }

            // 当 arguments 到达时，发送 input_json_delta
            if (buffered.blockStarted && tc.function?.arguments) {
              writeSSE(anthropicRes, 'content_block_delta', {
                type: 'content_block_delta',
                index: buffered.contentBlockIndex,
                delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
              })
            }
          }
        }

        // 处理 finish_reason
        if (parsed.choices?.[0]?.finish_reason) {
          const finishReason = parsed.choices[0].finish_reason
          const stopReasonMap: Record<string, string> = {
            stop: 'end_turn',
            length: 'max_tokens',
            tool_calls: 'tool_use',
          }
          pendingStopReason = stopReasonMap[finishReason] || 'end_turn'
          // 不立即结束，等 [DONE] 或 stream end 时 finalize
        }
      } catch { /* ignore parse errors */ }
    }
  })

  openaiRes.on('error', (err: Error) => {
    console.error('[Anthropic Stream] Error:', err.message)
    if (!anthropicRes.writableEnded) anthropicRes.end()
  })

  openaiRes.on('end', () => {
    if (!anthropicRes.writableEnded) {
      finalizeStream(pendingStopReason || 'end_turn')
    }
  })
}

// POST /v1/messages
anthropicRouter.post('/messages', apiKeyAuth, async (req: Request, res: Response) => {
  const body = req.body
  const bodySize = JSON.stringify(body).length
  console.log(`[Anthropic] 收到请求, body大小: ${(bodySize / 1024).toFixed(1)}KB, messages: ${body.messages?.length || 0}`)

  if (bodySize > 50 * 1024 * 1024) {
    console.error(`[Anthropic] 请求体过大: ${(bodySize / 1024 / 1024).toFixed(1)}MB`)
    return res.status(413).json({
      type: 'error',
      error: { type: 'invalid_request_error', message: `Request body too large (${(bodySize / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.` },
    })
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'messages is required' },
    })
  }

  // 转换为 OpenAI 格式
  const openaiBody = convertAnthropicToOpenAI(body)
  const requestModel = body.model

  // 模型映射
  const config = store.getConfig()
  let targetModel = openaiBody.model
  let targetProviderId: string | undefined
  let targetAccountId: string | undefined

  if (config.modelMappings && config.modelMappings[openaiBody.model]) {
    const mapping = config.modelMappings[openaiBody.model]
    targetModel = mapping.actualModel || targetModel
    targetProviderId = mapping.preferredProviderId
    targetAccountId = mapping.preferredAccountId
  }

  openaiBody.model = targetModel

  // 检查可用 target
  const target = selectTarget(targetProviderId, targetAccountId, targetModel)
  if (!target) {
    return res.status(503).json({
      type: 'error',
      error: { type: 'service_unavailable', message: '没有可用的供应商账户。请在管理界面添加供应商并配置账户。' },
    })
  }

  // 记录日志
  const requestSize = JSON.stringify(body).length
  console.log(`[Anthropic] 请求体大小: ${(requestSize / 1024).toFixed(1)}KB, model: ${requestModel}`)
  if (requestSize > 100 * 1024) {
    console.log(`[Anthropic] 大请求体 - messages count: ${body.messages?.length}, system length: ${typeof body.system === 'string' ? body.system.length : 'N/A'}`)
  }
  const logId = store.addLogWithId({
    level: 'info',
    message: `[Anthropic] 请求: ${requestModel} → ${target.provider.name}`,
    timestamp: Date.now(),
    data: { model: requestModel, provider: target.provider.id, account: target.account.id, format: 'anthropic' },
  } as any)

  const startTime = Date.now()
  const requestId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`

  if (body.stream) {
    // 流式：设置 Anthropic SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    // forwardRequest 需要一个 Express Response 对象（调用 setHeader 等方法）
    // 创建一个代理对象，包装 PassThrough 流，模拟 Express Response 接口
    const { PassThrough } = await import('stream')
    const proxyStream = new PassThrough()
    const proxyRes: any = proxyStream
    proxyRes.setHeader = () => proxyRes  // no-op，headers 已在真实 res 上设置
    proxyRes.status = () => proxyRes
    proxyRes.json = (data: any) => { proxyRes.write(JSON.stringify(data)); return proxyRes }
    proxyRes.headersSent = false

    // 把 proxyStream 的 OpenAI SSE 转成 Anthropic SSE 写到真实 res
    handleAnthropicStream(proxyStream, res, requestModel, requestId)

    try {
      const result = await forwardRequest(openaiBody, proxyRes)
      const duration = Date.now() - startTime

      store.incrementStats(duration, result.success)
      store.addRequestLog({
        id: logId || '',
        providerId: target.provider.id,
        accountId: target.account.id,
        model: requestModel,
        success: result.success,
        duration,
        timestamp: startTime,
      })

      if (!result.success && !res.writableEnded) {
        writeSSE(res, 'error', { type: 'error', error: { type: 'api_error', message: result.error || '转发失败' } })
        res.end()
      }
    } catch (err: any) {
      console.error('[Anthropic Router] Stream error:', err)
      if (!res.writableEnded) {
        writeSSE(res, 'error', { type: 'error', error: { type: 'api_error', message: err.message } })
        res.end()
      }
    }
  } else {
    // 非流式
    try {
      // forwardRequest 需要一个 res 对象来 pipe 流式响应
      // 对于非流式，我们需要收集完整的 OpenAI 响应
      const { PassThrough } = await import('stream')
      const proxyStream = new PassThrough()

      const result = await forwardRequest(openaiBody, proxyStream as any)
      const duration = Date.now() - startTime

      store.incrementStats(duration, result.success)
      store.addRequestLog({
        id: logId || '',
        providerId: target.provider.id,
        accountId: target.account.id,
        model: requestModel,
        success: result.success,
        duration,
        timestamp: startTime,
      })

      if (!result.success) {
        return res.status(result.statusCode || 500).json({
          type: 'error',
          error: { type: 'api_error', message: result.error || '转发失败' },
        })
      }

      if (result.data) {
        // result.data 是 OpenAI 格式的完整响应
        const anthropicResponse = convertOpenAIToAnthropic(result.data, requestModel)
        res.json(anthropicResponse)
      } else {
        // 可能流式响应已经被 pipe 到 proxyStream，需要收集
        // 这种情况不应该发生在非流式请求中
        res.status(500).json({
          type: 'error',
          error: { type: 'api_error', message: 'Unexpected empty response' },
        })
      }
    } catch (err: any) {
      console.error('[Anthropic Router] Error:', err)
      if (!res.headersSent) {
        res.status(500).json({
          type: 'error',
          error: { type: 'api_error', message: err.message },
        })
      }
    }
  }
})

// OPTIONS 预检
anthropicRouter.options('*', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Anthropic-Version')
  res.status(204).end()
})
