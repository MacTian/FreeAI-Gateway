import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore, OAuthProxyMode } from '@/stores/settingsStore'
import { Zap, Globe } from 'lucide-react'

export function GeneralSettings() {
  const { t } = useTranslation()
  const {
    autoStartProxy,
    setAutoStartProxy,
    oauthProxyMode,
    setOauthProxyMode,
  } = useSettingsStore()

  return (
    <div className="space-y-4">
      {/* 代理设置 */}
      <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-[#4cd7f6]" />
          <h3 className="text-base font-semibold text-white">{t('settings.autoStart')}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-start-proxy" className="text-[#dbe2fd] text-sm font-medium">{t('settings.autoStartProxy')}</Label>
            <p className="text-xs text-[#bcc9cd]">{t('settings.autoStartProxyHelp')}</p>
          </div>
          <Switch
            id="auto-start-proxy"
            checked={autoStartProxy}
            onCheckedChange={setAutoStartProxy}
          />
        </div>
      </div>

      {/* 网络代理 */}
      <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="h-5 w-5 text-[#4cd7f6]" />
          <h3 className="text-base font-semibold text-white">{t('settings.networkProxy')}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-[#dbe2fd] text-sm font-medium">{t('settings.oauthProxyMode')}</Label>
            <p className="text-xs text-[#bcc9cd]">{t('settings.oauthProxyModeHelp')}</p>
          </div>
          <Select
            value={oauthProxyMode}
            onValueChange={(value) => setOauthProxyMode(value as OAuthProxyMode)}
          >
            <SelectTrigger className="w-[180px] bg-[#0b1326] border-white/10 text-white">
              <SelectValue placeholder={t('settings.oauthProxyMode')} />
            </SelectTrigger>
            <SelectContent className="bg-[#1e2740] border-white/10">
              <SelectItem value="system" className="text-white">{t('settings.oauthProxySystem')}</SelectItem>
              <SelectItem value="none" className="text-white">{t('settings.oauthProxyNone')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
