import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Trash2, RefreshCw, Clock, Zap, Layers } from 'lucide-react'
import { api } from '@/api'

interface SessionConfig {
  mode: 'single' | 'multi'
  sessionTimeout: number
  maxMessagesPerSession: number
  deleteAfterTimeout: boolean
  maxSessionsPerAccount: number
}

interface Session {
  id: string
  providerId: string
  accountId: string
  model?: string
  messages: any[]
  createdAt: number
  lastActiveAt: number
  endedAt?: number
}

export function SessionManagement() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [config, setConfig] = useState<SessionConfig>({
    mode: 'single',
    sessionTimeout: 30,
    maxMessagesPerSession: 50,
    deleteAfterTimeout: true,
    maxSessionsPerAccount: 3,
  })
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetch('/api/sessions/config').then(r => r.json())
      if (data.mode) setConfig(data)
    } catch (e) {
      console.error('Failed to load session config:', e)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetch('/api/sessions').then(r => r.json())
      setSessions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load sessions:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadSessions()
  }, [])

  const handleConfigChange = (updates: Partial<SessionConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const saveConfig = async () => {
    setIsSaving(true)
    try {
      await fetch('/api/sessions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setHasChanges(false)
      toast({ title: t('common.success'), description: t('session.configSaved') })
    } catch {
      toast({ title: t('common.error'), description: t('session.configSaveFailed'), variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      toast({ title: t('common.success'), description: t('session.deleted') })
    } catch {
      toast({ title: t('common.error'), description: t('session.deleteFailed'), variant: 'destructive' })
    }
  }

  const handleClearAll = async () => {
    try {
      await fetch('/api/sessions', { method: 'DELETE' })
      setSessions([])
      toast({ title: t('common.success'), description: t('session.allCleared') })
    } catch {
      toast({ title: t('common.error'), description: t('session.clearFailed'), variant: 'destructive' })
    }
  }

  const handleCleanExpired = async () => {
    try {
      const data = await fetch('/api/sessions/clean', { method: 'POST' }).then(r => r.json())
      await loadSessions()
      toast({ title: t('common.success'), description: `清理了 ${data.cleaned} 个过期会话` })
    } catch {
      toast({ title: t('common.error'), description: '清理失败', variant: 'destructive' })
    }
  }

  const formatTime = (ts: number) => {
    if (!ts) return '-'
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (mins > 0) return `${mins}分钟前`
    return '刚刚'
  }

  const getSessionStatus = (session: Session) => {
    if (session.endedAt) return 'ended'
    const timeout = config.sessionTimeout * 60 * 1000
    if (Date.now() - session.lastActiveAt > timeout) return 'expired'
    return 'active'
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    expired: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    ended: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  }
  const statusLabels: Record<string, string> = { active: '活跃', expired: '过期', ended: '已结束' }

  const activeSessions = sessions.filter(s => getSessionStatus(s) === 'active')

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold t-heading">会话模式</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* 单轮模式 */}
          <button
            onClick={() => handleConfigChange({ mode: 'single' })}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${
              config.mode === 'single'
                ? 'border-cyan-400/60 bg-cyan-400/10'
                : 'border-white/10 hover:border-white/20 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Zap className={`h-5 w-5 ${config.mode === 'single' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="font-semibold t-heading">单轮模式</span>
              {config.mode === 'single' && <span className="ml-auto text-[10px] font-bold bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded-full">当前</span>}
            </div>
            <p className="text-xs t-sub leading-relaxed">每次请求独立处理，不保留上下文。适合简单问答、代码补全等场景，延迟更低。</p>
          </button>
          {/* 多轮模式 */}
          <button
            onClick={() => handleConfigChange({ mode: 'multi' })}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${
              config.mode === 'multi'
                ? 'border-cyan-400/60 bg-cyan-400/10'
                : 'border-white/10 hover:border-white/20 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className={`h-5 w-5 ${config.mode === 'multi' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="font-semibold t-heading">多轮模式</span>
              {config.mode === 'multi' && <span className="ml-auto text-[10px] font-bold bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded-full">当前</span>}
            </div>
            <p className="text-xs t-sub leading-relaxed">保留对话历史，支持连续上下文。适合复杂对话、代码调试等需要多轮交互的场景。</p>
          </button>
        </div>

        {/* 多轮参数 */}
        {config.mode === 'multi' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="text-xs font-medium t-sub">会话超时（分钟）</label>
              <input
                type="number" min={1} max={1440}
                value={config.sessionTimeout}
                onChange={e => handleConfigChange({ sessionTimeout: parseInt(e.target.value) || 30 })}
                className="w-full h-8 px-3 rounded-lg text-xs bg-white/5 border border-white/10 t-heading focus:outline-none focus:border-cyan-400/50"
              />
              <p className="text-[10px] t-hint">超过此时间无活动则会话过期</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium t-sub">最大消息数</label>
              <input
                type="number" min={1} max={500}
                value={config.maxMessagesPerSession}
                onChange={e => handleConfigChange({ maxMessagesPerSession: parseInt(e.target.value) || 50 })}
                className="w-full h-8 px-3 rounded-lg text-xs bg-white/5 border border-white/10 t-heading focus:outline-none focus:border-cyan-400/50"
              />
              <p className="text-[10px] t-hint">每个会话保留的最大消息条数</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium t-sub">每账号最大会话数</label>
              <input
                type="number" min={1} max={20}
                value={config.maxSessionsPerAccount}
                onChange={e => handleConfigChange({ maxSessionsPerAccount: parseInt(e.target.value) || 3 })}
                className="w-full h-8 px-3 rounded-lg text-xs bg-white/5 border border-white/10 t-heading focus:outline-none focus:border-cyan-400/50"
              />
              <p className="text-[10px] t-hint">超出后自动清理最旧的会话</p>
            </div>
            <div className="flex items-center justify-between md:col-span-3 pt-2">
              <div>
                <p className="text-sm font-medium t-heading">超时后自动删除</p>
                <p className="text-xs t-hint">过期会话自动从存储中删除</p>
              </div>
              <Switch
                checked={config.deleteAfterTimeout}
                onCheckedChange={v => handleConfigChange({ deleteAfterTimeout: v })}
              />
            </div>
          </div>
        )}

        {hasChanges && (
          <div className="flex justify-end mt-4">
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-cyan-400 text-[#0b1326] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存配置'}
            </button>
          </div>
        )}
      </div>

      {/* 活跃会话列表（仅多轮模式显示） */}
      {config.mode === 'multi' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-semibold t-heading">活跃会话</h3>
              <span className="text-[10px] font-bold bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full">{activeSessions.length}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={loadSessions} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 t-sub hover:t-heading hover:bg-white/5 transition-all flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> 刷新
              </button>
              <button onClick={handleCleanExpired} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 t-sub hover:t-heading hover:bg-white/5 transition-all">
                清理过期
              </button>
              <button onClick={handleClearAll} className="px-3 py-1.5 rounded-lg text-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                清空全部
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center t-hint text-sm">加载中...</div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center t-hint text-sm">暂无会话记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['供应商', '账号', '模型', '消息数', '状态', '最后活跃', '操作'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider t-hint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const status = getSessionStatus(session)
                    return (
                      <tr key={session.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-3 t-body font-medium truncate max-w-[120px]">{session.providerId}</td>
                        <td className="px-3 py-3 t-sub truncate max-w-[100px]">{session.accountId}</td>
                        <td className="px-3 py-3 t-sub">{session.model || '—'}</td>
                        <td className="px-3 py-3 t-body">{session.messages?.length ?? 0}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[status]}`}>
                            {statusLabels[status]}
                          </span>
                        </td>
                        <td className="px-3 py-3 t-hint">{formatTime(session.lastActiveAt)}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => handleDeleteSession(session.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
