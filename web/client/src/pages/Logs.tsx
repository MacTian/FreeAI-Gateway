import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RequestLogList } from '@/components/logs'
import { api } from '@/api'
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts'

export default function LogsPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, successRate: 0 })
  const [trendData, setTrendData] = useState<{date: string, total: number, success: number, error: number}[]>([])

  useEffect(() => {
    api.getLogStats().then((d: any) => {
      const total = d.total || 0
      const success = d.success || 0
      const error = d.failed || d.error || 0
      const successRate = total > 0 ? Math.round((success / total) * 100) : 0
      setStats({ total, success, error, successRate })
    }).catch(() => {})
    api.getLogTrend(12).then((trend: any[]) => {
      if (trend && trend.length > 0) setTrendData(trend)
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* 页面头部 + 迷你趋势图 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400">实时监控</div>
          <h2 className="text-3xl font-light tracking-tight text-white font-headline">{t('logs.title')}</h2>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">{t('logs.description')}</p>
        </div>
        {/* 迷你趋势折线图卡片 */}
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] p-6 rounded-xl border border-white/5 flex flex-col justify-between" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">请求趋势</span>
            <span className="text-xs text-cyan-400 font-medium">{stats.successRate}% 成功率</span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e2740', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: '#dbe2fd' }}
                  labelFormatter={(label) => label}
                  formatter={(value: any, name: string) => [value, name === 'total' ? '总计' : name === 'success' ? '成功' : '失败']}
                />
                <Line type="monotone" dataKey="total" stroke="rgba(76,215,246,0.8)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="success" stroke="rgba(52,211,153,0.7)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="error" stroke="rgba(248,113,113,0.7)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-500">
            <span>总计 {stats.total}</span>
            <span className="text-emerald-400">{stats.success} 成功</span>
            <span className="text-red-400">{stats.error} 失败</span>
          </div>
        </div>
      </section>

      {/* 日志表格 */}
      <RequestLogList />
    </div>
  )
}
