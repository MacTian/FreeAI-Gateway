import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Trash2, RefreshCw, Clock, Info } from 'lucide-react'

export function SessionManagement() {
  const { t } = useTranslation()
  const { toast } = useToast()
  
  const [config, setConfig] = useState<{
    mode: 'single' | 'multi'
    sessionTimeout: number
    maxMessagesPerSession: number
    deleteAfterTimeout: boolean
    maxSessionsPerAccount: number
  }>({
    mode: 'single',
    sessionTimeout: 30,
    maxMessagesPerSession: 50,
    deleteAfterTimeout: true,
    maxSessionsPerAccount: 3,
  })
  
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadConfig()
    loadSessions()
  }, [])

  const loadConfig = async () => {
    try {
      const sessionConfig = await window.electronAPI.session.getConfig()
      setConfig(sessionConfig)
    } catch (error) {
      console.error('Failed to load session config:', error)
    }
  }

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const allSessions = await window.electronAPI.session.getAll()
      setSessions(allSessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigChange = (updates: Partial<typeof config>) => {
    setConfig(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const saveConfig = async () => {
    try {
      await window.electronAPI.session.updateConfig(config)
      setHasChanges(false)
      toast({
        title: t('common.success'),
        description: t('session.configSaved'),
      })
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('session.configSaveFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await window.electronAPI.session.delete(sessionId)
      await loadSessions()
      toast({
        title: t('common.success'),
        description: t('session.sessionDeleted'),
      })
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('session.sessionDeleteFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleClearAllSessions = async () => {
    try {
      await window.electronAPI.session.clearAll()
      await loadSessions()
      toast({
        title: t('common.success'),
        description: t('session.sessionsCleared'),
      })
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('session.sessionsClearFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleCleanExpired = async () => {
    try {
      const count = await window.electronAPI.session.cleanExpired()
      await loadSessions()
      toast({
        title: t('common.success'),
        description: t('session.expiredCleaned', { count }),
      })
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('session.expiredCleanFailed'),
        variant: 'destructive',
      })
    }
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return t('session.justNow')
    if (minutes < 60) return t('session.minutesAgo', { count: minutes })
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('session.hoursAgo', { count: hours })
    
    const days = Math.floor(hours / 24)
    return t('session.daysAgo', { count: days })
  }

  const getSessionStatus = (session: any) => {
    const timeoutMs = config.sessionTimeout * 60 * 1000
    const now = Date.now()
    const isExpired = (now - session.lastActiveAt) >= timeoutMs
    
    if (session.status === 'deleted') return 'deleted'
    if (session.status === 'expired' || isExpired) return 'expired'
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">{t('session.active')}</Badge>
      case 'expired':
        return <Badge variant="secondary">{t('session.expired')}</Badge>
      case 'deleted':
        return <Badge variant="destructive">{t('session.deleted')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('session.sessionMode')}
          </CardTitle>
          <CardDescription>
            {t('session.sessionModeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${config.mode === 'single' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
              onClick={() => handleConfigChange({ mode: 'single' })}
            >
              <div className="space-y-2">
                <Label className="font-medium cursor-pointer text-base">
                  {t('session.singleTurnMode')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('session.singleTurnModeDescription')}
                </p>
              </div>
            </div>
            
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${config.mode === 'multi' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
              onClick={() => handleConfigChange({ mode: 'multi' })}
            >
              <div className="space-y-2">
                <Label className="font-medium cursor-pointer text-base">
                  {t('session.multiTurnMode')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('session.multiTurnModeDescription')}
                </p>
              </div>
            </div>
          </div>

          {config.mode === 'single' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-4 border-t">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm font-medium text-muted-foreground">{t('session.modeOptions')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="delete-after-chat">{t('session.deleteAfterChat')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('session.deleteAfterChatHint')}
                  </p>
                </div>
                <Switch
                  id="delete-after-chat"
                  checked={config.deleteAfterTimeout}
                  onCheckedChange={(checked) => handleConfigChange({ deleteAfterTimeout: checked })}
                />
              </div>
            </div>
          )}

          {config.mode === 'multi' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-4 border-t">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm font-medium text-muted-foreground">{t('session.modeOptions')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">{t('session.sessionTimeout')}</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    max={1440}
                    value={config.sessionTimeout}
                    onChange={(e) => handleConfigChange({ sessionTimeout: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-muted-foreground">{t('session.sessionTimeoutHint')}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxMessages">{t('session.maxMessages')}</Label>
                  <Input
                    id="maxMessages"
                    type="number"
                    min={1}
                    max={500}
                    value={config.maxMessagesPerSession}
                    onChange={(e) => handleConfigChange({ maxMessagesPerSession: parseInt(e.target.value) || 50 })}
                  />
                  <p className="text-xs text-muted-foreground">{t('session.maxMessagesHint')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxSessions">{t('session.maxSessionsPerAccount')}</Label>
                  <Input
                    id="maxSessions"
                    type="number"
                    min={1}
                    max={10}
                    value={config.maxSessionsPerAccount}
                    onChange={(e) => handleConfigChange({ maxSessionsPerAccount: parseInt(e.target.value) || 3 })}
                  />
                  <p className="text-xs text-muted-foreground">{t('session.maxSessionsPerAccountHint')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="delete-after-timeout">{t('session.deleteAfterTimeout')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('session.deleteAfterTimeoutHint')}
                  </p>
                </div>
                <Switch
                  id="delete-after-timeout"
                  checked={config.deleteAfterTimeout}
                  onCheckedChange={(checked) => handleConfigChange({ deleteAfterTimeout: checked })}
                />
              </div>
            </div>
          )}

          {hasChanges && (
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={saveConfig}>
                {t('common.save')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {config.mode === 'multi' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('session.activeSessions')}
                </CardTitle>
                <CardDescription>
                  {t('session.activeSessionsDescription')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSessions}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {t('common.refresh')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCleanExpired}
                >
                  {t('session.cleanExpired')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAllSessions}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('session.clearAll')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('session.noSessions')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div>{t('session.provider')}</div>
                  <div>{t('session.account')}</div>
                  <div>{t('session.model')}</div>
                  <div>{t('session.messages')}</div>
                  <div>{t('session.lastActive')}</div>
                  <div>{t('common.actions')}</div>
                </div>
                
                {sessions.map((session) => {
                  const status = getSessionStatus(session)
                  return (
                    <div
                      key={session.id}
                      className="grid grid-cols-6 gap-2 text-sm py-2 border-b items-center"
                    >
                      <div className="truncate">{session.providerId}</div>
                      <div className="truncate">{session.accountId}</div>
                      <div className="truncate">{session.model || '-'}</div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        <span>{session.messages.length}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatTime(session.lastActiveAt)}
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
