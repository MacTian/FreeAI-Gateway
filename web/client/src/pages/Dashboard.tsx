import { useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useDashboardStore } from '@/stores/dashboardStore'
import { api } from '@/api'
import { RequestChart } from '@/components/dashboard'


export function Dashboard() {
  const navigate = useNavigate()
  const {
    stats,
    providers,
    activities,
    isLoading,
    lastUpdated,
    proxyStatus,
    refreshData,
  } = useDashboardStore()
  const proxyRunning = proxyStatus?.isRunning ?? false
  const [proxyLoading, setProxyLoading] = useState(false)

  const handleToggleProxy = async (start: boolean) => {
    if (proxyLoading) return
    setProxyLoading(true)
    try {
      if (start) {
        await api.startProxy()
      } else {
        await api.stopProxy()
      }
      await refreshData()
    } catch (e) {
      console.error(e)
    } finally {
      setProxyLoading(false)
    }
  }

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(() => { refreshData() }, [refreshData])

  useEffect(() => {
    refreshData()
    intervalRef.current = setInterval(refreshData, 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [refreshData])

  const totalRequests = stats?.totalRequests ?? 0
  const successRate = stats?.successRate ?? 0
  const avgLatency = stats?.avgLatency ?? 0
  const activeProviders = stats?.activeAccounts ?? 0

  // 周请求趋势（真实数据）
  const [trendData, setTrendData] = useState<{date: string, total: number, success: number, error: number}[]>([])
  useEffect(() => {
    api.getLogTrend(7).then((trend: any[]) => {
      if (trend && trend.length > 0) setTrendData(trend)
    }).catch(() => {})
  }, [])

  const statusDot = (ok: boolean) => ok
    ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span><span className="text-[10px] text-slate-400">运行中</span></span>
    : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span><span className="text-[10px] text-slate-400">离线</span></span>

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-light tracking-tight text-white font-headline">全局概览</h2>
          <p className="text-slate-400 text-sm">监控网关实时流量与服务健康状态</p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Stats 卡片 4列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 总请求数 */}
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl p-6 border border-white/5 relative overflow-hidden group" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl group-hover:bg-cyan-400/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-cyan-400 bg-cyan-400/10 p-2 rounded-lg" style={{fontFamily:'Material Symbols Outlined'}}>speed</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400">实时</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">总请求数</p>
          <p className="text-3xl font-light text-white tracking-tighter">{totalRequests.toLocaleString()}</p>
        </div>

        {/* 成功率 */}
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl p-6 border border-white/5 relative overflow-hidden group" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-emerald-400 bg-emerald-400/10 p-2 rounded-lg" style={{fontFamily:'Material Symbols Outlined'}}>check_circle</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">稳定</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">成功率</p>
          <p className="text-3xl font-light text-white tracking-tighter">{successRate.toFixed(1)}%</p>
        </div>

        {/* 平均延迟 */}
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl p-6 border border-white/5 relative overflow-hidden group" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-amber-400 bg-amber-400/10 p-2 rounded-lg" style={{fontFamily:'Material Symbols Outlined'}}>timer</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">ms</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">平均延迟</p>
          <p className="text-3xl font-light text-white tracking-tighter">{avgLatency > 0 ? `${avgLatency}ms` : '—'}</p>
        </div>

        {/* 活跃供应商 */}
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl p-6 border border-white/5 relative overflow-hidden group" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-400/10 rounded-full blur-2xl group-hover:bg-violet-400/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-violet-400 bg-violet-400/10 p-2 rounded-lg" style={{fontFamily:'Material Symbols Outlined'}}>hub</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-violet-400">供应商</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">活跃供应商</p>
          <p className="text-3xl font-light text-white tracking-tighter">{activeProviders}</p>
        </div>
      </div>

      {/* 中间区域：图表 + 供应商列表 | 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 2/3：请求趋势图 + 供应商 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 请求趋势图 */}
          <RequestChart data={trendData.map(d => ({
            time: ['日','一','二','三','四','五','六'][new Date(d.date).getDay()],
            requests: d.total,
            success: d.success,
            failed: d.error,
          }))} />

          {/* 供应商状态 */}
          <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-3xl p-6 border border-white/5" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">供应商状态</h3>
              <button onClick={() => navigate('/providers')} className="text-[10px] text-cyan-400 hover:underline">全部查看</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {providers && providers.length > 0 ? providers.slice(0, 6).map((p: any) => (
                <div key={p.id} className="bg-[#1e2740]/40 backdrop-blur-[30px] p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {(p.name || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {statusDot(p.status !== 'error')}
                    <span className="text-[10px] text-slate-500">{p.requestCount ?? 0} 请求</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center text-slate-500 text-sm py-8">暂无供应商数据</div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧 1/3：最近活动 + 系统报告 */}
        <div className="space-y-6">
          <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-3xl p-6 border border-white/5 h-full" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">最近活动</h3>
            </div>
            <div className="space-y-6">
              {activities && activities.length > 0 ? activities.slice(0, 5).map((item: any, i: number) => {
                const isError = item.type === 'error'
                const colorClass = isError ? 'red' : i % 3 === 0 ? 'cyan' : i % 3 === 1 ? 'violet' : 'emerald'
                const icon = isError ? 'error' : 'api'
                const now = Date.now()
                const diff = now - item.timestamp
                const timeStr = diff < 60000 ? '刚刚' : diff < 3600000 ? `${Math.floor(diff/60000)}分钟前` : `${Math.floor(diff/3600000)}小时前`
                return (
                  <div key={item.id || i} className="flex gap-4 group">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{background: `rgba(${isError?'239,68,68':colorClass==='cyan'?'76,215,246':colorClass==='violet'?'167,139,250':'52,211,153'},0.1)`, color: isError?'#ef4444':colorClass==='cyan'?'#4cd7f6':colorClass==='violet'?'#a78bfa':'#34d399'}}>
                        <span className="material-symbols-outlined text-[20px]" style={{fontFamily:'Material Symbols Outlined'}}>{icon}</span>
                      </div>
                      {i < 4 && <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-white/5"></div>}
                    </div>
                    <div className="flex flex-col flex-1 pb-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate max-w-[140px]">{item.title || item.modelName || item.providerName || '请求记录'}</span>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">{timeStr}</span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description || (item.providerName ? `供应商: ${item.providerName}` : '')}</p>
                    </div>
                  </div>
                )
              }) : (
                <p className="text-slate-500 text-sm text-center py-8">暂无最近活动</p>
              )}
            </div>

            {/* 系统报告卡片 */}
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/10 border border-white/5" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-white">代理状态</h4>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${proxyRunning ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></span>
                  <span className={`text-[10px] font-bold ${proxyRunning ? 'text-emerald-400' : 'text-red-400'}`}>{proxyRunning ? '运行中' : '已停止'}</span>
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleToggleProxy(true)}
                  disabled={proxyRunning || proxyLoading}
                  className="flex-1 py-2 bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0b1326] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                >
                  启动
                </button>
                <button
                  onClick={() => handleToggleProxy(false)}
                  disabled={!proxyRunning || proxyLoading}
                  className="flex-1 py-2 bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                >
                  停止
                </button>
              </div>
              <button
                onClick={() => navigate('/proxy')}
                className="w-full mt-2 py-1.5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:border-cyan-400/30 hover:text-cyan-400 transition-all"
              >
                代理设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
