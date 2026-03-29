import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ProxyConfigForm,
  LoadBalanceConfig,
  ProxyStatus,
  AdvancedConfig,
} from '@/components/proxy'
import { useProxyStore } from '@/stores/proxyStore'
import { Settings, Scale, Activity, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'status', icon: Activity, labelKey: 'proxy.statusMonitoring' },
  { key: 'basic', icon: Settings, labelKey: 'proxy.basicConfig' },
  { key: 'loadbalance', icon: Scale, labelKey: 'proxy.loadBalancing' },
  { key: 'advanced', icon: Settings2, labelKey: 'proxy.advancedConfig' },
]

export function ProxySettings() {
  const { t } = useTranslation()
  const { fetchAppConfig, fetchProxyStatus, fetchProxyStatistics } = useProxyStore()
  const hasLoadedRef = useRef(false)
  const [active, setActive] = useState('status')

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    fetchAppConfig()
    fetchProxyStatus()
    fetchProxyStatistics()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light tracking-tight t-heading font-headline">{t('proxy.title')}</h2>
        <p className="text-sm t-sub">{t('proxy.description')}</p>
      </div>

      {/* 导航卡片 */}
      <div className="glass-card border border-white/5 p-2 flex flex-wrap gap-1">
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-xl text-sm transition-all flex-1 min-w-0 justify-center',
              active === key
                ? 'bg-cyan-400/10 text-cyan-400'
                : 't-sub hover:bg-white/5 hover:t-body'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline truncate">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="space-y-6">
        {active === 'status' && <ProxyStatus />}
        {active === 'basic' && <ProxyConfigForm />}
        {active === 'loadbalance' && <LoadBalanceConfig />}
        {active === 'advanced' && <AdvancedConfig />}
      </div>
    </div>
  )
}

export default ProxySettings
