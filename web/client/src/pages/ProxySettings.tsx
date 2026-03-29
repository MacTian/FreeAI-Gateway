import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ProxyConfigForm,
  LoadBalanceConfig,
  ProxyStatus,
  AdvancedConfig,
} from '@/components/proxy'
import { useProxyStore } from '@/stores/proxyStore'
import { Settings, Scale, Activity, Settings2 } from 'lucide-react'

export function ProxySettings() {
  const { t } = useTranslation()
  const { fetchAppConfig, fetchProxyStatus, fetchProxyStatistics } = useProxyStore()
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    fetchAppConfig()
    fetchProxyStatus()
    fetchProxyStatistics()
  }, [])

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dbe2fd] p-6 space-y-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
      <div>
        <h2 className="text-3xl font-light tracking-tight text-white font-headline">{t('proxy.title')}</h2>
        <p className="text-sm text-[#bcc9cd]">{t('proxy.description')}</p>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1">
          <TabsTrigger value="status" className="flex items-center gap-2 py-2 px-3 flex-1 min-w-0">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline truncate">{t('proxy.statusMonitoring')}</span>
          </TabsTrigger>
          <TabsTrigger value="basic" className="flex items-center gap-2 py-2 px-3 flex-1 min-w-0">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline truncate">{t('proxy.basicConfig')}</span>
          </TabsTrigger>
          <TabsTrigger value="loadbalance" className="flex items-center gap-2 py-2 px-3 flex-1 min-w-0">
            <Scale className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline truncate">{t('proxy.loadBalancing')}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2 py-2 px-3 flex-1 min-w-0">
            <Settings2 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline truncate">{t('proxy.advancedConfig')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <ProxyStatus />
        </TabsContent>

        <TabsContent value="basic" className="mt-6">
          <ProxyConfigForm />
        </TabsContent>

        <TabsContent value="loadbalance" className="mt-6">
          <LoadBalanceConfig />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedConfig />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProxySettings
