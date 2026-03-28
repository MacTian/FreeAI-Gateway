import { Router } from 'express'
import { store } from '../store.js'

export const oauthRouter = Router()

// Provider login URL + token key 映射
const PROVIDER_LOGIN_INFO: Record<string, { loginUrl: string; tokenKey: string; instructions: string }> = {
  kimi: {
    loginUrl: 'https://www.kimi.com',
    tokenKey: 'Authorization',
    instructions: '登录后，打开开发者工具 (F12) → Network 标签，随便发一条消息，找任意请求的 Request Headers，复制 Authorization 字段值（去掉前面的 Bearer ）',
  },
  deepseek: {
    loginUrl: 'https://chat.deepseek.com',
    tokenKey: 'userToken',
    instructions: '登录后，打开开发者工具 (F12) → Application → Local Storage → https://chat.deepseek.com，找到 userToken 字段，复制其值',
  },
  glm: {
    loginUrl: 'https://chatglm.cn',
    tokenKey: 'chatglm_refresh_token',
    instructions: '登录后，打开开发者工具 (F12) → Application → Cookies → chatglm.cn，找到 chatglm_refresh_token 字段，复制其值',
  },
  qwen: {
    loginUrl: 'https://www.qianwen.com',
    tokenKey: 'tongyi_sso_ticket',
    instructions: '登录后，打开开发者工具 (F12) → Application → Cookies → qianwen.com，找到 tongyi_sso_ticket 字段，复制其值',
  },
  minimax: {
    loginUrl: 'https://agent.minimaxi.com',
    tokenKey: '_token',
    instructions: '登录后，打开开发者工具 (F12) → Application → Local Storage → agent.minimaxi.com，找到 _token 字段，复制其值',
  },
  cursor: {
    loginUrl: 'https://www.cursor.com',
    tokenKey: 'WorkosCursorSessionToken',
    instructions: '登录后，打开开发者工具 (F12) → Application → Cookies → cursor.com，找到 WorkosCursorSessionToken 字段，复制其值',
  },
  claude: {
    loginUrl: 'https://claude.ai',
    tokenKey: 'sessionKey',
    instructions: '登录后，打开开发者工具 (F12) → Application → Cookies → claude.ai，找到 sessionKey 字段，复制其值',
  },
  openai: {
    loginUrl: 'https://chat.openai.com',
    tokenKey: '__Secure-next-auth.session-token',
    instructions: '登录后，打开开发者工具 (F12) → Application → Cookies → chat.openai.com，找到 __Secure-next-auth.session-token 字段，复制其值',
  },
}

function getProviderInfo(providerId: string) {
  return PROVIDER_LOGIN_INFO[providerId] || {
    loginUrl: `https://${providerId}.com`,
    tokenKey: 'token',
    instructions: `登录 ${providerId} 后，打开开发者工具 (F12) → Application → Cookies 或 Local Storage，找到认证 token 并复制`,
  }
}

// POST /oauth/in-app-login — 返回登录 URL 和 token 获取说明
oauthRouter.post('/oauth/in-app-login', (req, res) => {
  try {
    const { providerId } = req.body
    if (!providerId) return res.status(400).json({ error: 'providerId required' })
    const info = getProviderInfo(providerId)
    res.json({ success: true, ...info, providerId })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /oauth/in-app-login/cancel — stub
oauthRouter.post('/oauth/in-app-login/cancel', (_req, res) => {
  res.json({ success: true })
})

// POST /oauth/token — 保存 token 到账号 credentials
oauthRouter.post('/oauth/token', (req, res) => {
  try {
    const { providerId, providerType, token, realUserID } = req.body
    if (!token) return res.status(400).json({ error: 'token required' })
    const pid = providerId || providerType
    res.json({
      success: true,
      providerId: pid,
      providerType: pid,
      credentials: { token },
      ...(realUserID ? { accountInfo: { name: realUserID } } : {}),
    })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /oauth/validate — stub
oauthRouter.post('/oauth/validate', (_req, res) => {
  res.json({ valid: true })
})

// POST /oauth/refresh — stub
oauthRouter.post('/oauth/refresh', (_req, res) => {
  res.json({ success: true })
})

// GET /oauth/status — idle
oauthRouter.get('/oauth/status', (_req, res) => {
  res.json({ status: 'idle' })
})

// POST /oauth/start — stub
oauthRouter.post('/oauth/start', (_req, res) => {
  res.json({ success: true })
})

// POST /oauth/cancel — stub
oauthRouter.post('/oauth/cancel', (_req, res) => {
  res.json({ success: true })
})
