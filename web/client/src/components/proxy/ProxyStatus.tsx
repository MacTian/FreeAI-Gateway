import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useProxyStore } from '@/stores/proxyStore'
import { useProvidersStore } from '@/stores/providersStore'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Activity,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  BarChart3,
  Timer,
  TrendingUp,
  Cpu,
  Server,
} from 'lucide-react'

interface ProxyStatusProps {
  onStatusChange?: () => void
}

export function ProxyStatus({ onStatusChange }: ProxyStatusProps) {
  const { t } = useTranslation()
  const {
    proxyStatus,
    proxyStatistics,
    fetchProxyStatus,
    fetchProxyStatistics,
    startProxy,
    stopProxy,
    isLoading,
  } = useProxyStore()
  const { toast } = useToast()
  const { providers } = useProvidersStore()
  
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchProxyStatus()
    fetchProxyStatistics()
    
    const statusInterval = setInterval(() => {
      fetchProxyStatus()
      fetchProxyStatistics()
    }, 5000)
    
    return () => {
      clearInterval(statusInterval)
    }
  }, [fetchProxyStatus, fetchProxyStatistics])

  const handleStart = async () => {
    const success = await startProxy()
    if (success) {
      toast({
        title: t('common.success'),
        description: t('dashboard.proxyRunning'),
      })
      onStatusChange?.()
    } else {
      toast({
        title: t('common.error'),
        description: t('dashboard.proxyStopped'),
        variant: 'destructive',
      })
    }
  }

  const handleStop = async () => {
    const success = await stopProxy()
    if (success) {
      toast({
        title: t('common.success'),
        description: t('dashboard.proxyStopped'),
      })
      onStatusChange?.()
    } else {
      toast({
        title: t('common.error'),
        description: 'Unable to stop proxy service',
        variant: 'destructive',
      })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchProxyStatus(), fetchProxyStatistics()])
    setIsRefreshing(false)
  }

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getSuccessRate = (): number => {
    const total = proxyStatistics?.totalRequests ?? 0
    const success = proxyStatistics?.successRequests ?? 0
    if (total === 0) return 0
    return Math.round((success / total) * 100)
  }

  const isRunning = proxyStatus?.isRunning ?? false

  const statsCards = [
    {
      title: t('dashboard.totalRequests'),
      value: proxyStatistics?.totalRequests ?? 0,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: t('common.success'),
      value: proxyStatistics?.successRequests ?? 0,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      title: t('common.error'),
      value: proxyStatistics?.failedRequests ?? 0,
      icon: XCircle,
      color: 'text-destructive',
    },
    {
      title: t('dashboard.successRate'),
      value: `${getSuccessRate()}%`,
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      title: t('dashboard.avgLatency'),
      value: formatLatency(proxyStatistics?.avgLatency ?? 0),
      icon: Timer,
      color: 'text-amber-500',
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>{t('dashboard.proxyStatus')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isRunning ? 'default' : 'secondary'}
                className={isRunning ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                {isRunning ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('dashboard.running')}
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    {t('dashboard.stopped')}
                  </>
                )}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>{t('proxy.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('dashboard.port')}</p>
              <p className="text-2xl font-bold">{proxyStatus?.port ?? '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('dashboard.runtime')}</p>
              <p className="text-2xl font-bold">
                {isRunning && proxyStatus?.uptime
                  ? formatUptime(proxyStatus.uptime)
                  : '-'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 text-[#0b1326] text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Play className="h-4 w-4" />
                {t('dashboard.startProxy')}
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold hover:bg-white/20 disabled:opacity-50 transition-all"
              >
                <Square className="h-4 w-4" />
                {t('dashboard.stopProxy')}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>{t('logs.title')}</CardTitle>
          </div>
          <CardDescription>{t('proxy.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {statsCards.map((stat, index) => (
              <Card
                key={index}
                hover
                className="bg-muted/30 border-0 shadow-none"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                      <stat.icon className={cn('h-4 w-4', stat.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(proxyStatistics?.modelUsage && Object.keys(proxyStatistics.modelUsage).length > 0) ||
           (proxyStatistics?.providerUsage && Object.keys(proxyStatistics.providerUsage).length > 0) ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {proxyStatistics?.modelUsage && Object.keys(proxyStatistics.modelUsage).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">{t('providers.modelUsage')}</h4>
                  </div>
                  <div className="space-y-1.5">
                    {(Object.entries(proxyStatistics.modelUsage) as [string, number][])
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([model, count]) => {
                        const total = Object.values(proxyStatistics.modelUsage).reduce((a, b) => a + b, 0)
                        const percentage = Math.round((count / total) * 100)
                        return (
                          <div 
                            key={model} 
                            className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              <code className="text-xs truncate" title={model}>{model}</code>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                {count}
                              </Badge>
                              <span className="text-xs text-muted-foreground w-8 text-right">{percentage}%</span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {proxyStatistics?.providerUsage && Object.keys(proxyStatistics.providerUsage).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">{t('providers.providerDistribution')}</h4>
                  </div>
                  <div className="space-y-1.5">
                    {(Object.entries(proxyStatistics.providerUsage) as [string, number][])
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([providerId, count]) => {
                        const total = Object.values(proxyStatistics.providerUsage).reduce((a, b) => a + b, 0)
                        const percentage = Math.round((count / total) * 100)
                        return (
                          <div 
                            key={providerId} 
                            className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              <span className="text-sm truncate" title={providerId}>{providers.find(p => p.id === providerId)?.name || providerId}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                {count}
                              </Badge>
                              <span className="text-xs text-muted-foreground w-8 text-right">{percentage}%</span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProxyStatus
