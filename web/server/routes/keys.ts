import { Router } from 'express'
import { store } from '../store.js'
import { randomBytes } from 'crypto'

export const keysRouter = Router()

keysRouter.get('/keys', (_req, res) => {
  try {
    const config = store.getConfig()
    res.json(config.apiKeys || [])
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

keysRouter.post('/keys', (req, res) => {
  try {
    const config = store.getConfig()
    const newKey = {
      id: randomBytes(8).toString('hex'),
      name: req.body.name || 'API Key',
      key: 'sk-' + randomBytes(24).toString('hex'),
      enabled: true,
      createdAt: Date.now(),
      usageCount: 0,
      description: req.body.description || '',
    }
    const keys = [...(config.apiKeys || []), newKey]
    store.updateConfig({ apiKeys: keys })
    res.json(newKey)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

keysRouter.delete('/keys/:id', (req, res) => {
  try {
    const config = store.getConfig()
    const keys = (config.apiKeys || []).filter((k: any) => k.id !== req.params.id)
    store.updateConfig({ apiKeys: keys })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
