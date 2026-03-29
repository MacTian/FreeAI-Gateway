import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AppearanceSettings,
  GeneralSettings,
  DataManagement,
  SecuritySettings,
  ManagementApiSettings,
} from '@/components/settings'
import { Sun, Settings as SettingsIcon, Database, Shield, Key } from 'lucide-react'

export function Settings() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dbe2fd] p-6 space-y-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
      <div>
        <h2 className="text-3xl font-light tracking-tight text-white font-headline">{t('settings.title')}</h2>
        <p className="text-sm text-[#bcc9cd]">{t('settings.description')}</p>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1.5 bg-[#131b2e]/60 backdrop-blur-[40px] border border-white/5 rounded-2xl">
          <TabsTrigger value="appearance" className="flex items-center gap-2 py-2 px-4 rounded-xl data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400 data-[state=active]:border-r-0 text-slate-400">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.appearance')}</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2 py-2 px-4 rounded-xl data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400 data-[state=active]:border-r-0 text-slate-400">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.generalSettings')}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2 py-2 px-4 rounded-xl data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400 data-[state=active]:border-r-0 text-slate-400">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.data')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2 px-4 rounded-xl data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400 data-[state=active]:border-r-0 text-slate-400">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.security')}</span>
          </TabsTrigger>
          <TabsTrigger value="managementApi" className="flex items-center gap-2 py-2 px-4 rounded-xl data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400 data-[state=active]:border-r-0 text-slate-400">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.managementApi.title')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <DataManagement />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="managementApi" className="mt-6">
          <ManagementApiSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
