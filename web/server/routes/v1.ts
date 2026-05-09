/**
 * OpenAI 兼容 API 路由
 * POST /v1/chat/completions
 * GET  /v1/models
 */
import { Router, Request, Response } from 'express'
import { store } from '../store.js'
import { forwardRequest } from '../proxy/forwarder.js'
import { selectTarget } from '../proxy/loadbalancer.js'

export const v1Router = Router()

// API Key 验证中间件
export function apiKeyAuth(req: Request, res: Response, next: Function) {
  const config = store.getConfig()
  if (!config.enableApiKey || !config.apiKeys || config.apiKeys.length === 0) {
    return next()
  }
  const authHeader = req.headers['authorization'] || ''
  const providedKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.query.api_key as string) || req.headers['x-api-key'] as string

  if (!providedKey) {
    return res.status(401).json({ error: { message: 'API key is required', type: 'invalid_request_error', code: 'missing_api_key' } })
  }
  const validKey = config.apiKeys.find(k => k.key === providedKey && k.enabled)
  if (!validKey) {
    return res.status(401).json({ error: { message: 'Invalid API key', type: 'invalid_request_error', code: 'invalid_api_key' } })
  }
  // 更新使用统计
  const updatedKeys = config.apiKeys.map(k =>
    k.id === validKey.id ? { ...k, lastUsedAt: Date.now(), usageCount: k.usageCount + 1 } : k
  )
  store.updateConfig({ apiKeys: updatedKeys })
  next()
}

// GET /v1/models — 返回所有已启用供应商的模型列表
v1Router.get('/models', apiKeyAuth, (_req: Request, res: Response) => {
  const providers = store.getProviders().filter(p => p.enabled)
  const models: any[] = []
  for (const provider of providers) {
    const providerModels = provider.supportedModels || []
    for (const modelName of providerModels) {
      models.push({
        id: modelName,
        object: 'model',
        created: Math.floor(provider.createdAt / 1000),
        owned_by: provider.id,
        provider: provider.id,
      })
    }
  }
  // 也包含模型映射里的模型
  const config = store.getConfig()
  if (config.modelMappings) {
    for (const [reqModel] of Object.entries(config.modelMappings)) {
      if (!models.find(m => m.id === reqModel)) {
        models.push({ id: reqModel, object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'chat2api' })
      }
    }
  }
  res.json({ object: 'list', data: models })
})

// POST /v1/chat/completions — 核心转发
v1Router.post('/chat/completions', apiKeyAuth, async (req: Request, res: Response) => {
  const body = req.body

  if (!body.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: { message: 'messages is required', type: 'invalid_request_error' } })
  }

  // 检查模型映射
  const config = store.getConfig()
  let targetModel = body.model
  let targetProviderId: string | undefined
  let targetAccountId: string | undefined

  if (config.modelMappings && config.modelMappings[body.model]) {
    const mapping = config.modelMappings[body.model]
    targetModel = mapping.actualModel || targetModel
    targetProviderId = mapping.preferredProviderId
    targetAccountId = mapping.preferredAccountId
  }

  const reqBody = { ...body, model: targetModel }

  // 检查是否有可用 target
  const target = selectTarget(targetProviderId, targetAccountId, targetModel)
  if (!target) {
    return res.status(503).json({
      error: {
        message: '没有可用的供应商账户。请在管理界面添加供应商并配置账户。',
        type: 'service_unavailable',
        code: 'no_available_provider',
      },
    })
  }

  // 记录请求日志
  const logId = store.addLogWithId({
    level: 'info',
    message: `请求: ${body.model} → ${target.provider.name}`,
    timestamp: Date.now(),
    data: { model: body.model, provider: target.provider.id, account: target.account.id },
  } as any)

  const startTime = Date.now()

  if (body.stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  try {
    const result = await forwardRequest(reqBody, res)
    const duration = Date.now() - startTime

    // 更新统计
    store.incrementStats(duration, result.success)
    store.addRequestLog({
      id: logId || '',
      providerId: target.provider.id,
      accountId: target.account.id,
      model: body.model,
      success: result.success,
      duration,
      timestamp: startTime,
    })

    if (!result.success) {
      if (!res.headersSent) {
        res.status(result.statusCode || 500).json({
          error: { message: result.error || '转发失败', type: 'server_error' },
        })
      }
    } else if (!body.stream && result.data) {
      res.json(result.data)
    }
  } catch (err: any) {
    console.error('[v1Router] Unhandled error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message, type: 'server_error' } })
    }
  }
})

// OPTIONS 预检
v1Router.options('*', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
  res.status(204).end()
})
