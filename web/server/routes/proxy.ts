import { Router } from 'express'
import { store } from '../store.js'

export const proxyRouter = Router()

// 代理能力已内置于当前 web server（/v1/* 路由）
// 不再维护独立监听端口，proxyRunning 反映服务是否启用代理功能
let proxyEnabled = true
let proxyStartTime: number = Date.now()

// 服务启动时检查 autoStartProxy 配置
;(function autoStart() {
  try {
    const config = store.getConfig()
    proxyEnabled = config.autoStartProxy !== false
  } catch (e) {
    console.error('[Proxy] Auto-start failed:', e)
  }
})()

proxyRouter.post('/proxy/start', async (_req, res) => {
  try {
    proxyEnabled = true
    proxyStartTime = Date.now()
    const config = store.getConfig()
    store.updateConfig({ autoStartProxy: true })
    res.json({ success: true, port: config.proxyPort || 0, host: '0.0.0.0' })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

proxyRouter.post('/proxy/stop', (_req, res) => {
  try {
    proxyEnabled = false
    store.updateConfig({ autoStartProxy: false })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

proxyRouter.get('/proxy/status', (_req, res) => {
  const config = store.getConfig()
  // port 返回当前服务端口（由环境变量或默认值决定）
  const serverPort = Number(process.env.PORT) || 3000
  res.json({
    isRunning: proxyEnabled,
    port: serverPort,
    host: '0.0.0.0',
    uptime: proxyEnabled ? Math.floor((Date.now() - proxyStartTime) / 1000) : 0,
    connections: 0,
    internalMode: true, // 标识代理已内置于 web server
  })
})

proxyRouter.get('/proxy/statistics', (_req, res) => {
  const stats = store.getStatistics()
  res.json(stats)
})

proxyRouter.post('/proxy/reset-statistics', (_req, res) => {
  store.resetStatistics()
  res.json({ success: true })
})

proxyRouter.get('/proxy/statistics/today', (_req, res) => {
  try {
    const stats = store.getStatistics()
    const today = new Date().toISOString().slice(0, 10)
    const dailyStats = (stats as any).dailyStats?.[today] || { totalRequests: 0, successRequests: 0, failedRequests: 0 }
    res.json({ ...stats, ...dailyStats, date: today })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

export { proxyEnabled }
