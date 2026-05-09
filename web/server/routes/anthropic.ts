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

// Anthropic → OpenAI 请求转换
function convertAnthropicToOpenAI(body: any) {
  const messages: any[] = []

  // Anthropic 的 system 是顶级字段，OpenAI 放在 messages[0]
  if (body.system) {
    messages.push({ role: 'system', content: typeof body.system === 'string' ? body.system : normalizeContent(body.system) })
  }

  // 转换 messages
  for (const msg of body.messages || []) {
    messages.push({
      role: msg.role,
      content: normalizeContent(msg.content),
    })
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

  return openaiBody
}

// OpenAI → Anthropic 非流式响应转换
function convertOpenAIToAnthropic(openaiResponse: any, requestModel: string) {
  const choice = openaiResponse.choices?.[0]
  const content = choice?.message?.content || ''
  const finishReason = choice?.finish_reason || 'stop'

  const stopReasonMap: Record<string, string> = {
    stop: 'end_turn',
    length: 'max_tokens',
    tool_calls: 'tool_use',
    content_filter: 'end_turn',
  }

  return {
    id: openaiResponse.id || `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: content }],
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
  let blockStarted = false
  let inputTokens = 0
  let outputTokens = 0
  let buf = ''

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

  openaiRes.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    const lines = buf.split('\n')
    buf = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        // 结束
        if (blockStarted) {
          writeSSE(anthropicRes, 'content_block_stop', { type: 'content_block_stop', index: 0 })
        }
        writeSSE(anthropicRes, 'message_delta', {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: outputTokens },
        })
        writeSSE(anthropicRes, 'message_stop', { type: 'message_stop' })
        anthropicRes.end()
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

        if (delta?.content) {
          if (!blockStarted) {
            blockStarted = true
            writeSSE(anthropicRes, 'content_block_start', {
              type: 'content_block_start',
              index: 0,
              content_block: { type: 'text', text: '' },
            })
          }
          writeSSE(anthropicRes, 'content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: delta.content },
          })
        }

        // 处理 finish_reason
        if (parsed.choices?.[0]?.finish_reason) {
          const finishReason = parsed.choices[0].finish_reason
          if (blockStarted) {
            writeSSE(anthropicRes, 'content_block_stop', { type: 'content_block_stop', index: 0 })
            blockStarted = false
          }
          const stopReasonMap: Record<string, string> = {
            stop: 'end_turn',
            length: 'max_tokens',
            tool_calls: 'tool_use',
          }
          writeSSE(anthropicRes, 'message_delta', {
            type: 'message_delta',
            delta: { stop_reason: stopReasonMap[finishReason] || 'end_turn', stop_sequence: null },
            usage: { output_tokens: outputTokens },
          })
          writeSSE(anthropicRes, 'message_stop', { type: 'message_stop' })
          anthropicRes.end()
          return
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
      if (blockStarted) {
        writeSSE(anthropicRes, 'content_block_stop', { type: 'content_block_stop', index: 0 })
      }
      writeSSE(anthropicRes, 'message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: outputTokens },
      })
      writeSSE(anthropicRes, 'message_stop', { type: 'message_stop' })
      anthropicRes.end()
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
