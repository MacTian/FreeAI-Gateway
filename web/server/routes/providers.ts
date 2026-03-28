import { Router } from 'express'
import axios from 'axios'
import { store } from '../store.js'

export const providersRouter = Router()

// 静态路由必须在动态路由 /:id 之前注册

// GET /providers/builtin
providersRouter.get('/providers/builtin', (_req, res) => {
  res.json([])
})

// POST /providers/check-all
providersRouter.post('/providers/check-all', async (_req, res) => {
  try {
    const providers = store.getProviders()
    const results = await Promise.all(
      providers.map(async p => {
        const result = await checkProviderStatus(p.id)
        store.updateProvider(p.id, { status: result.status, lastStatusCheck: Date.now() })
        return { id: p.id, ...result }
      })
    )
    res.json({ success: true, results })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /providers/import
providersRouter.post('/providers/import', (req, res) => {
  try {
    const { json } = req.body
    if (!json) return res.status(400).json({ error: 'json required' })
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data
    const p = store.addProvider(rest)
    res.status(201).json(p)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// GET /providers
providersRouter.get('/providers', (_req, res) => {
  try {
    res.json(store.getProviders())
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /providers
providersRouter.post('/providers', (req, res) => {
  try {
    const p = store.addProvider(req.body)
    res.status(201).json(p)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /providers/:id/export
providersRouter.get('/providers/:id/export', (req, res) => {
  try {
    const provider = store.getProviders().find(p => p.id === req.params.id)
    if (!provider) return res.status(404).json({ error: 'Provider not found' })
    res.json(JSON.stringify(provider, null, 2))
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /providers/:id/check
providersRouter.post('/providers/:id/check', async (req, res) => {
  try {
    const provider = store.getProviders().find(p => p.id === req.params.id)
    if (!provider) return res.status(404).json({ error: 'Provider not found' })
    const result = await checkProviderStatus(req.params.id)
    const updated = store.updateProvider(req.params.id, { status: result.status, lastStatusCheck: Date.now() })
    res.json({ success: true, ...result, provider: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /providers/:id/duplicate
providersRouter.post('/providers/:id/duplicate', (req, res) => {
  try {
    const provider = store.getProviders().find(p => p.id === req.params.id)
    if (!provider) return res.status(404).json({ error: 'Provider not found' })
    const { id: _id, ...rest } = provider
    const dup = store.addProvider({ ...rest, name: rest.name + ' (副本)' })
    res.status(201).json(dup)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /providers/:id
providersRouter.put('/providers/:id', (req, res) => {
  try {
    const p = store.updateProvider(req.params.id, req.body)
    if (!p) return res.status(404).json({ error: 'Provider not found' })
    res.json(p)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /providers/:id
providersRouter.delete('/providers/:id', (req, res) => {
  try {
    const ok = store.deleteProvider(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Provider not found' })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// 检测供应商连通性
async function checkProviderStatus(id: string): Promise<{ status: 'online' | 'offline'; latency?: number; error?: string }> {
  const provider = store.getProviders().find(p => p.id === id)
  if (!provider) return { status: 'offline', error: 'Provider not found' }
  const start = Date.now()
  try {
    const response = await axios.get(provider.apiEndpoint, { timeout: 8000, validateStatus: () => true })
    return {
      status: 'online',
      latency: Date.now() - start,
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined,
    }
  } catch (e: any) {
    return {
      status: 'offline',
      latency: Date.now() - start,
      error: e?.message || 'Request failed',
    }
  }
}
