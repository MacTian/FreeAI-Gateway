import { Router } from 'express'
import { store } from '../store.js'

export const configRouter = Router()

configRouter.get('/config', (_req, res) => {
  try {
    res.json(store.getConfig())
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

configRouter.put('/config', (req, res) => {
  try {
    const updated = store.updateConfig(req.body)
    res.json(updated)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
