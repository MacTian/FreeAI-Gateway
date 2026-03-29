import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppearanceSettings,
  GeneralSettings,
  DataManagement,
  SecuritySettings,
  ManagementApiSettings,
} from '@/components/settings'
import { Sun, Settings as SettingsIcon, Database, Shield, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'appearance', icon: Sun, labelKey: 'settings.appearance' },
  { key: 'general', icon: SettingsIcon, labelKey: 'settings.generalSettings' },
  { key: 'data', icon: Database, labelKey: 'settings.data' },
  { key: 'security', icon: Shield, labelKey: 'settings.security' },
  { key: 'managementApi', icon: Key, labelKey: 'settings.managementApi.title' },
]

export function Settings() {
  const { t } = useTranslation()
  const [active, setActive] = useState('appearance')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light tracking-tight t-heading font-headline">{t('settings.title')}</h2>
        <p className="text-sm t-sub">{t('settings.description')}</p>
      </div>

      {/* 导航卡片 */}
      <div className="glass-card border border-white/5 p-2 flex flex-wrap gap-1">
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-xl text-sm transition-all',
              active === key
                ? 'bg-cyan-400/10 text-cyan-400'
                : 't-sub hover:bg-white/5 hover:t-body'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="space-y-6">
        {active === 'appearance' && <AppearanceSettings />}
        {active === 'general' && <GeneralSettings />}
        {active === 'data' && <DataManagement />}
        {active === 'security' && <SecuritySettings />}
        {active === 'managementApi' && <ManagementApiSettings />}
      </div>
    </div>
  )
}
