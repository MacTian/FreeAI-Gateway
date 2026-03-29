import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff,
  Shield,
  Clock,
  BarChart3,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ApiKey } from '@/types/electron'

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'sk-'
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export default function ApiKeysPage() {
  const { t } = useTranslation()
  const { config, updateConfig, fetchConfig } = useSettingsStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const apiKeys = config?.apiKeys || []

  const handleToggleEnabled = async (keyId: string, enabled: boolean) => {
    const updatedKeys = apiKeys.map(k => 
      k.id === keyId ? { ...k, enabled } : k
    )
    await updateConfig({ apiKeys: updatedKeys })
    toast({
      title: enabled ? t('apiKeys.keyEnabled') : t('apiKeys.keyDisabled'),
      description: enabled ? t('apiKeys.keyEnabled') : t('apiKeys.keyDisabled'),
    })
  }

  const handleAddKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: t('apiKeys.pleaseEnterName'),
        description: t('apiKeys.keyNameRequired'),
        variant: 'destructive',
      })
      return
    }

    const newKey: ApiKey = {
      id: generateId(),
      name: newKeyName.trim(),
      key: generateApiKey(),
      enabled: true,
      createdAt: Date.now(),
      usageCount: 0,
    }

    await updateConfig({ apiKeys: [...apiKeys, newKey] })
    setShowAddDialog(false)
    setNewKeyName('')
  }

  const handleDeleteKey = async () => {
    if (!deleteKeyId) return
    
    const updatedKeys = apiKeys.filter(k => k.id !== deleteKeyId)
    await updateConfig({ apiKeys: updatedKeys })
    setDeleteKeyId(null)
    toast({
      title: t('apiKeys.deleted'),
      description: t('apiKeys.keyDeleted'),
    })
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: t('apiKeys.copied'),
      description: t('apiKeys.copiedToClipboard'),
    })
  }

  const handleToggleVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const handleToggleGlobalEnabled = async (enabled: boolean) => {
    await updateConfig({ enableApiKey: enabled })
    toast({
      title: enabled ? t('apiKeys.authEnabled') : t('apiKeys.authDisabled'),
      description: enabled ? t('apiKeys.authEnabled') : t('apiKeys.authDisabled'),
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const maskKey = (key: string) => {
    if (key.length <= 10) return key
    return key.substring(0, 7) + '****' + key.substring(key.length - 4)
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* 页面头部 + 3个统计卡片 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400 mb-2">密钥管理</div>
          <h1 className="text-3xl font-light tracking-tight text-white font-headline">{t('apiKeys.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('apiKeys.description')}</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 text-[#0b1326] text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          {t('apiKeys.newApiKey')}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] p-6 rounded-2xl border border-white/5" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">活动密钥</span>
            <Key className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-light text-white">{apiKeys.filter(k => k.enabled).length}</div>
          <div className="mt-2 text-xs text-slate-500">共 {apiKeys.length} 个密钥</div>
        </div>
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] p-6 rounded-2xl border border-white/5" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">总请求量</span>
            <BarChart3 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-light text-white">{apiKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0).toLocaleString()}</div>
          <div className="mt-2 text-xs text-slate-500">所有密钥累计</div>
        </div>
        <div className="bg-[#131b2e]/60 backdrop-blur-[40px] p-6 rounded-2xl border border-white/5 relative overflow-hidden" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">认证状态</span>
            <span className={`flex h-2 w-2 rounded-full ${config?.enableApiKey ? 'bg-green-500' : 'bg-slate-500'}`}></span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium text-white">{config?.enableApiKey ? '已启用' : '已禁用'}</div>
            <Switch checked={config?.enableApiKey || false} onCheckedChange={handleToggleGlobalEnabled} />
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Shield className="h-20 w-20 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* 密钥列表表格 */}
      <div className="bg-[#131b2e]/60 backdrop-blur-[40px] rounded-2xl border border-white/5 overflow-hidden" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.05)'}}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{t('apiKeys.apiKeyList')}</h3>
        </div>
        {apiKeys.length === 0 ? (
          <div className="text-center py-16">
            <Key className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">{t('apiKeys.noApiKeys')}</p>
            <p className="text-slate-500 text-sm mt-1">{t('apiKeys.clickToCreate')}</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{t('apiKeys.name')}</th>
                <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{t('apiKeys.apiKey')}</th>
                <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{t('apiKeys.createdAt')}</th>
                <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 text-right">{t('apiKeys.operations')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="group hover:bg-cyan-400/5 transition-all duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white">{apiKey.name}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${apiKey.enabled ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                          <span className="text-[10px] text-slate-500">{apiKey.enabled ? '启用' : '禁用'}</span>
                          <span className="text-[10px] text-slate-600 ml-2"><BarChart3 className="h-2.5 w-2.5 inline mr-0.5" />{apiKey.usageCount || 0} 次</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white/5 text-cyan-300 px-2 py-1 rounded font-mono">
                        {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                      </code>
                      <button onClick={() => handleToggleVisibility(apiKey.id)} className="text-slate-500 hover:text-white transition-colors">
                        {visibleKeys.has(apiKey.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(apiKey.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Switch checked={apiKey.enabled} onCheckedChange={(checked) => handleToggleEnabled(apiKey.id, checked)} />
                      <button onClick={() => handleCopyKey(apiKey.key)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded hover:bg-white/5">
                        <Copy className="h-3.5 w-3.5" />
                        复制
                      </button>
                      <button onClick={() => setDeleteKeyId(apiKey.id)} className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 安全提示 */}
      <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-start gap-4">
        <Shield className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-400">安全提示</p>
          <p className="text-xs text-slate-400 mt-1">请勿泄露您的 API 密钥。如果您的密钥已公开，请立即将其删除并重新生成。我们建议定期轮换密钥以提高安全性。</p>
        </div>
      </div>

      {/* 添加密钥弹窗 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiKeys.createApiKey')}</DialogTitle>
            <DialogDescription>{t('apiKeys.createApiKeyDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">{t('apiKeys.keyName')}</Label>
              <Input id="key-name" placeholder={t('apiKeys.keyNamePlaceholder')} value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('apiKeys.cancel')}</Button>
            <Button onClick={handleAddKey}>{t('apiKeys.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiKeys.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('apiKeys.confirmDeleteDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKeyId(null)}>{t('apiKeys.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteKey}>{t('apiKeys.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
