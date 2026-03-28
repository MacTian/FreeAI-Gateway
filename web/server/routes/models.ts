import { Router } from 'express'
import { store } from '../store.js'

export const modelsRouter = Router()

modelsRouter.get('/models', (_req, res) => {
  try {
    const providers = store.getProviders()
    const models: string[] = []
    for (const p of providers) {
      if (p.enabled && p.supportedModels) {
        models.push(...p.supportedModels)
      }
    }
    // OpenAI-compatible format
    const data = [...new Set(models)].map(id => ({
      id,
      object: 'model',
      created: Date.now(),
      owned_by: 'chat2api',
    }))
    res.json({ object: 'list', data })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
