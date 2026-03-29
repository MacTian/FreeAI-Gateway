import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettingsStore, LogLevel } from '@/stores/settingsStore'
import { useToast } from '@/hooks/use-toast'
import { Database, Download, Upload, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function DataManagement() {
  const { t } = useTranslation()
  const { logLevel, setLogLevel, logRetentionDays, setLogRetentionDays, maxLogs, setMaxLogs } = useSettingsStore()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleExportConfig = async () => {
    setIsExporting(true)
    try {
      const config = {
        version: '1.1.2',
        exportedAt: new Date().toISOString(),
        settings: localStorage.getItem('chat2api-settings'),
      }
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat2api-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({
        title: t('common.success'),
        description: t('settings.exportSuccess'),
      })
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.exportFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const config = JSON.parse(text)
      if (config.settings) {
        localStorage.setItem('chat2api-settings', config.settings)
        toast({
          title: t('common.success'),
          description: t('settings.importSuccess'),
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.importFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      sessionStorage.clear()
      toast({
        title: t('common.success'),
        description: t('settings.cacheCleared'),
      })
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.cacheClearFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleResetApp = async () => {
    setIsResetting(true)
    try {
      localStorage.clear()
      sessionStorage.clear()
      
      if (window.electronAPI?.store?.clearAll) {
        await window.electronAPI.store.clearAll()
      }
      
      toast({
        title: t('common.success'),
        description: t('settings.resetSuccess'),
      })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.resetFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Database className="h-4 w-4 text-emerald-400" />{t('settings.logSettings')}</h4>
          <p className="text-xs text-slate-400">{t('settings.logRetentionDays')}</p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <Label htmlFor="log-level" className="text-slate-300 text-xs font-medium">{t('settings.logLevel')}</Label>
              <Select value={logLevel} onValueChange={(value) => setLogLevel(value as LogLevel)}>
                <SelectTrigger id="log-level" className="bg-white/5 border-white/10 text-slate-200 h-8 text-xs">
                  <SelectValue placeholder={t('settings.selectLogLevel')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2740] border-white/10">
                  <SelectItem value="debug" className="text-white text-xs">Debug</SelectItem>
                  <SelectItem value="info" className="text-white text-xs">Info</SelectItem>
                  <SelectItem value="warn" className="text-white text-xs">Warn</SelectItem>
                  <SelectItem value="error" className="text-white text-xs">Error</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">{t('settings.logLevelHelp')}</p>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <Label htmlFor="log-retention" className="text-slate-300 text-xs font-medium">{t('settings.logRetentionDays')}</Label>
              <Input
                id="log-retention"
                type="number"
                min={1}
                max={365}
                value={logRetentionDays}
                onChange={(e) => setLogRetentionDays(parseInt(e.target.value) || 30)}
                className="bg-white/5 border-white/10 text-slate-200 h-8 text-xs"
              />
              <p className="text-xs text-slate-500">{t('settings.logRetentionHelp')}</p>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <Label htmlFor="max-logs" className="text-slate-300 text-xs font-medium">{t('settings.maxLogs')}</Label>
              <Input
                id="max-logs"
                type="number"
                min={100}
                max={100000}
                value={maxLogs}
                onChange={(e) => setMaxLogs(parseInt(e.target.value) || 10000)}
                className="bg-white/5 border-white/10 text-slate-200 h-8 text-xs"
              />
              <p className="text-xs text-slate-500">{t('settings.maxLogsHelp')}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Download className="h-4 w-4 text-emerald-400" />{t('settings.dataManagement')}</h4>
          <p className="text-xs text-slate-400">{t('settings.dataManagementDesc')}</p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExportConfig}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? t('settings.exporting') : t('settings.exportConfig')}
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              <Button
                variant="outline"
                disabled={isImporting}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? t('settings.importing') : t('settings.importConfig')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2 text-red-400"><AlertTriangle className="h-4 w-4" />{t('settings.dangerZone')}</h4>
          <p className="text-xs text-slate-400">{t('settings.dangerZoneDesc')}</p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleClearCache}
              disabled={isClearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? t('settings.clearing') : t('settings.clearCache')}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('settings.resetApp')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('settings.confirmReset')}</DialogTitle>
                  <DialogDescription>
                    {t('settings.confirmResetDesc')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {}}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleResetApp}
                    disabled={isResetting}
                  >
                    {isResetting ? t('settings.resetting') : t('settings.confirmReset')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  )
}
