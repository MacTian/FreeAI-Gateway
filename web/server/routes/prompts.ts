import { Router } from 'express'
import { store } from '../store.js'
import { randomUUID } from 'crypto'

export const promptsRouter = Router()

promptsRouter.get('/prompts', (_req, res) => {
  try {
    const config = store.getConfig()
    res.json((config as any).prompts || [])
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

promptsRouter.get('/prompts/builtin', (_req, res) => {
  res.json([])
})

promptsRouter.get('/prompts/custom', (_req, res) => {
  try {
    const config = store.getConfig()
    res.json((config as any).prompts || [])
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

promptsRouter.post('/prompts', (req, res) => {
  try {
    const config = store.getConfig()
    const prompts: any[] = (config as any).prompts || []
    const newPrompt = { id: randomUUID(), createdAt: Date.now(), ...req.body }
    prompts.push(newPrompt)
    store.updateConfig({ prompts } as any)
    res.status(201).json(newPrompt)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

promptsRouter.put('/prompts/:id', (req, res) => {
  try {
    const config = store.getConfig()
    let prompts: any[] = (config as any).prompts || []
    const idx = prompts.findIndex((p: any) => p.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })
    prompts[idx] = { ...prompts[idx], ...req.body, updatedAt: Date.now() }
    store.updateConfig({ prompts } as any)
    res.json(prompts[idx])
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

promptsRouter.delete('/prompts/:id', (req, res) => {
  try {
    const config = store.getConfig()
    let prompts: any[] = (config as any).prompts || []
    const filtered = prompts.filter((p: any) => p.id !== req.params.id)
    if (filtered.length === prompts.length) return res.status(404).json({ error: 'Not found' })
    store.updateConfig({ prompts: filtered } as any)
    res.json({ success: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})
