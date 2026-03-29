import express from 'express'
import { store } from './store.js'
import cors from 'cors'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { configRouter } from './routes/config.js'
import { getAllSlotStats } from './proxy/concurrencyQueue.js'
import { providersRouter } from './routes/providers.js'
import { accountsRouter } from './routes/accounts.js'
import { proxyRouter } from './routes/proxy.js'
import { keysRouter } from './routes/keys.js'
import { logsRouter } from './routes/logs.js'
import { modelsRouter } from './routes/models.js'
import { appRouter } from './routes/app.js'
import { oauthRouter } from './routes/oauth.js'
import { v1Router } from './routes/v1.js'
import { sessionsRouter } from './routes/sessions.js'
import { promptsRouter } from './routes/prompts.js'
import { managementRouter } from './routes/management.js'

// 全局未捕获异常处理，防止进程崩溃
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err.message)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason)
})

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }))
app.get('/healthz', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }))
app.get('/api/concurrency', (_req, res) => res.json(getAllSlotStats()))
app.get('/readyz', (_req, res) => {
  const providers = store.getProviders().filter((p: any) => p.enabled)
  const accounts = store.getAccounts().filter((a: any) => a.status === 'active')
  if (providers.length === 0 || accounts.length === 0) {
    return res.status(503).json({ status: 'not_ready', reason: 'no active providers or accounts' })
  }
  res.json({ status: 'ready', providers: providers.length, accounts: accounts.length })
})

app.use('/api', appRouter)
app.use('/api', configRouter)
app.use('/api', providersRouter)
app.use('/api', accountsRouter)
app.use('/api', proxyRouter)
app.use('/api', keysRouter)
app.use('/api', logsRouter)
app.use('/api', modelsRouter)
app.use('/api', oauthRouter)
app.use('/api', sessionsRouter)
app.use('/api', promptsRouter)
app.use('/api', managementRouter)

// OpenAI 兼容 API
app.use('/v1', v1Router)

// Serve frontend static files (必须放在 /api 和 /v1 路由之后，不然会把 /v1/models 吃成 index.html)
const clientDist = join(dirname(fileURLToPath(import.meta.url)), '../client/dist')
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/v1') || req.path === '/health') return next()
    res.sendFile(join(clientDist, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Chat2API Web Server running on http://localhost:${PORT}`)

  // 启动时重置所有 error 状态账号为 active（error 可能是上次运行时临时失败导致的）
  try {
    const accounts = store.getAccounts()
    let resetCount = 0
    for (const account of accounts) {
      if (account.status === 'error') {
        store.updateAccount(account.id, { status: 'active', errorMessage: '' })
        resetCount++
      }
    }
    if (resetCount > 0) {
      console.log(`[Store] Reset ${resetCount} error account(s) to active on startup`)
    }
  } catch (e) {
    console.error('[Store] Failed to reset error accounts:', e)
  }
})
