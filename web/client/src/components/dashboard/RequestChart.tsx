import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity } from 'lucide-react'

export interface ChartDataPoint {
  time: string
  requests: number
  success: number
  failed: number
}

export interface RequestChartProps {
  data: ChartDataPoint[]
  className?: string
}

export function RequestChart({ data, className }: RequestChartProps) {
  const { t } = useTranslation()

  return (
    <div className={`bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl border border-white/5 p-6 ${className ?? ''}`}
      style={{ boxShadow: 'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
          <Activity className="h-4 w-4 text-cyan-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">{t('dashboard.requestsTrend')}</h3>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e2740',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: '#dbe2fd',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
            />
            <Line
              type="monotone"
              dataKey="requests"
              name={t('dashboard.totalRequests')}
              stroke="rgba(76,215,246,0.8)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#4cd7f6' }}
            />
            <Line
              type="monotone"
              dataKey="success"
              name={t('common.success')}
              stroke="rgba(52,211,153,0.8)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#34d399' }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name={t('common.error')}
              stroke="rgba(248,113,113,0.8)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f87171' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
