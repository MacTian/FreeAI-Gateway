import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSettingsStore } from '@/stores/settingsStore'
import { Lock, FileText } from 'lucide-react'

export function SecuritySettings() {
  const { t } = useTranslation()
  const { credentialEncryption, setCredentialEncryption, logDesensitization, setLogDesensitization } = useSettingsStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-violet-400" />
            <Label className="t-body text-sm font-semibold">{t('settings.credentialEncryption')}</Label>
          </div>
          <p className="text-xs t-sub">{t('settings.credentialEncryptionHelp')}</p>
        </div>
        <Switch checked={credentialEncryption} onCheckedChange={setCredentialEncryption} />
      </div>

      <div className="h-px bg-white/5" />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-400" />
            <Label className="t-body text-sm font-semibold">{t('settings.logDesensitization')}</Label>
          </div>
          <p className="text-xs t-sub">{t('settings.logDesensitizationHelp')}</p>
        </div>
        <Switch checked={logDesensitization} onCheckedChange={setLogDesensitization} />
      </div>

      {logDesensitization && (
        <div className="rounded-xl bg-av-background/60 border border-white/5 p-4 text-xs">
          <p className="t-sub font-medium mb-2">{t('settings.example')}</p>
          <div className="space-y-1 font-mono t-hint">
            <p>原始: sk-1234567890abcdef1234567890abcdef</p>
            <p className="text-cyan-400">脱敏: sk-1234****cdef</p>
          </div>
        </div>
      )}
    </div>
  )
}
