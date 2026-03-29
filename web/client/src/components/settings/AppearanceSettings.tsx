import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import { useSettingsStore, Theme, Language } from '@/stores/settingsStore'
import { Sun, Moon, PanelLeft, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AppearanceSettings() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { sidebarCollapsed, setSidebarCollapsed, language, setLanguage } = useSettingsStore()

  return (
    <div className="space-y-4">
      {/* 主题 */}
      <div className="glass-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Sun className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold t-heading">{t('settings.theme')}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold t-heading">{t('settings.theme')}</p>
            <p className="text-xs t-sub mt-1">根据环境光线自动调节或手动选择</p>
          </div>
          <div className="flex bg-av-background/60 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setTheme('dark' as Theme)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark' ? 'bg-cyan-400/20 text-cyan-400' : 't-sub hover:t-heading'
              }`}
            >
              <Moon className="h-3.5 w-3.5 inline mr-1" />
              {t('settings.themeDark')}
            </button>
            <button
              onClick={() => setTheme('light' as Theme)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light' ? 'bg-cyan-400/20 text-cyan-400' : 't-sub hover:t-heading'
              }`}
            >
              <Sun className="h-3.5 w-3.5 inline mr-1" />
              {t('settings.themeLight')}
            </button>
          </div>
        </div>
      </div>

      {/* 语言 */}
      <div className="glass-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Languages className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold t-heading">{t('settings.language')}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold t-heading">{t('settings.language')}</p>
            <p className="text-xs t-sub mt-1">{t('settings.languageHelp')}</p>
          </div>
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="w-[160px] bg-av-background border-white/10 text-cyan-400">
              <SelectValue placeholder={t('settings.language')} />
            </SelectTrigger>
            <SelectContent className="bg-av-surface-high border-white/10">
              <SelectItem value="zh-CN" className="t-heading">{t('settings.languageZh')}</SelectItem>
              <SelectItem value="en-US" className="t-heading">{t('settings.languageEn')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 侧边栏 */}
      <div className="glass-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <PanelLeft className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold t-heading">{t('settings.sidebar')}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="t-body text-sm font-medium">{t('settings.sidebarCollapsed')}</Label>
            <p className="text-xs t-sub mt-1">{t('settings.sidebarCollapsedHelp')}</p>
          </div>
          <Switch checked={sidebarCollapsed} onCheckedChange={setSidebarCollapsed} />
        </div>
      </div>
    </div>
  )
}
