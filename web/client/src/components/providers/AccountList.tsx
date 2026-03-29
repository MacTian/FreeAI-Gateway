/**
 * Account List Component
 * Displays all accounts under a provider with status and actions
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Clock,
  User,
  RefreshCw,
  AlertCircle,
  Activity,
  Plus,
  Trash
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Account, AccountStatus } from '@/types/electron'
import { cn } from '@/lib/utils'

interface AccountListProps {
  accounts: Account[]
  providerId: string
  onAddAccount: () => void
  onEditAccount: (account: Account) => void
  onDeleteAccount: (id: string) => void
  onValidateAccount: (id: string) => void
  onViewDetail: (account: Account) => void
}

export function AccountList({
  accounts,
  providerId,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onValidateAccount,
  onViewDetail,
}: AccountListProps) {
  const { t } = useTranslation()
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set())
  const [clearingChatsId, setClearingChatsId] = useState<string | null>(null)
  const [showClearChatsDialog, setShowClearChatsDialog] = useState(false)
  const [selectedAccountForClear, setSelectedAccountForClear] = useState<Account | null>(null)

  const statusConfig: Record<AccountStatus, { 
    labelKey: string
    color: string
    bgColor: string
    icon: typeof Check
  }> = {
    active: {
      labelKey: 'providers.active',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: Check,
    },
    inactive: {
      labelKey: 'providers.inactive',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: Clock,
    },
    expired: {
      labelKey: 'providers.expired',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      icon: AlertCircle,
    },
    error: {
      labelKey: 'common.error',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: X,
    },
  }

  const handleValidate = async (id: string) => {
    setValidatingIds(prev => new Set(prev).add(id))
    try {
      await onValidateAccount(id)
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleClearChats = (account: Account) => {
    setSelectedAccountForClear(account)
    setShowClearChatsDialog(true)
  }

  const confirmClearChats = async () => {
    if (!selectedAccountForClear) return
    
    setClearingChatsId(selectedAccountForClear.id)
    try {
      const result = await window.electronAPI.accounts.clearChats(selectedAccountForClear.id)
      if (result.success) {
        console.log(t('providers.clearChatsSuccess'))
      } else {
        console.error(result.error || t('providers.clearChatsFailed'))
      }
    } catch (error) {
      console.error('Failed to clear chats:', error)
    } finally {
      setClearingChatsId(null)
      setShowClearChatsDialog(false)
      setSelectedAccountForClear(null)
    }
  }

  const activeCount = accounts.filter(a => a.status === 'active').length
  const totalCount = accounts.length

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatUsage = (account: Account) => {
    if (account.dailyLimit) {
      return `${account.todayUsed || 0} / ${account.dailyLimit}`
    }
    return account.todayUsed || 0
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-[#131b2e]/40 backdrop-blur-[40px] rounded-2xl border border-white/5 flex flex-col items-center justify-center py-12" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.05)'}}>
        <User className="h-12 w-12 text-slate-500 mb-4" />
        <p className="text-base font-medium text-slate-400">{t('common.noData')}</p>
        <p className="text-sm text-slate-500 mb-6">{t('providers.clickToAddProvider')}</p>
        <button onClick={onAddAccount} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 text-[#0b1326] text-sm font-bold hover:opacity-90 transition-all">
          <Plus className="h-4 w-4" />
          {t('providers.addAccount')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('providers.total')}: {totalCount}</span>
          <span>•</span>
          <span className="text-green-600">{activeCount} {t('providers.onlineCount')}</span>
        </div>
        <button onClick={onAddAccount} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-400 text-[#0b1326] text-xs font-bold hover:opacity-90 transition-all">
          <Plus className="h-3.5 w-3.5" />
          {t('providers.addAccount')}
        </button>
      </div>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-3 pr-4">
          {accounts.map((account) => {
            const config = statusConfig[account.status]
            const StatusIcon = config.icon
            const isValidating = validatingIds.has(account.id)

            return (
              <div
                key={account.id}
                className="bg-[#131b2e]/40 backdrop-blur-[40px] rounded-2xl border border-white/5 hover:bg-[#131b2e]/60 transition-all cursor-pointer overflow-hidden"
                style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.05)'}}
                onClick={() => onViewDetail(account)}
              >
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* 状态图标 */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      account.status === 'active' ? 'bg-emerald-500/10' :
                      account.status === 'error' ? 'bg-red-500/10' : 'bg-white/5'
                    )}>
                      <User className={cn('h-5 w-5',
                        account.status === 'active' ? 'text-emerald-400' :
                        account.status === 'error' ? 'text-red-400' : 'text-slate-400'
                      )} />
                    </div>
                    {/* 名称 + 状态 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">{account.name}</span>
                        {account.status === 'active' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-400"></span>活跃
                          </span>
                        )}
                        {account.status === 'error' && (
                          <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <span className="w-1 h-1 rounded-full bg-red-400"></span>错误
                          </span>
                        )}
                        {account.status === 'inactive' && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>停用
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        {account.email && <span className="truncate max-w-[120px]">{account.email}</span>}
                        <span>请求: {account.requestCount || 0}</span>
                        <span>今日: {formatUsage(account)}</span>
                        {account.lastUsed && <span>{formatDate(account.lastUsed)}</span>}
                      </div>
                      {account.status === 'error' && account.errorMessage && (
                        <p className="text-[10px] text-red-400 mt-1 truncate">{account.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewDetail(account)
                            }}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            {t('common.details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleValidate(account.id)
                            }}
                            disabled={isValidating}
                          >
                            <RefreshCw className={cn(
                              'mr-2 h-4 w-4',
                              isValidating && 'animate-spin'
                            )} />
                            {isValidating ? t('oauth.validating') : t('providers.validateCredentials')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditAccount(account)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {t('providers.editAccount')}
                          </DropdownMenuItem>
                          {/* Show Clear Chats for qwen-ai and minimax providers */}
                          {(providerId === 'qwen-ai' || providerId === 'minimax') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleClearChats(account)
                                }}
                                disabled={clearingChatsId === account.id}
                                className="text-amber-600"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                {clearingChatsId === account.id ? t('common.loading') : t('providers.clearChats')}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteAccount(account.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('providers.deleteAccount')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Clear Chats Confirmation Dialog */}
      <Dialog open={showClearChatsDialog} onOpenChange={setShowClearChatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('providers.clearChats')}</DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p>{t('providers.clearChatsConfirm')}</p>
                <p className="text-amber-600 font-medium">{t('providers.clearChatsWarning')}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowClearChatsDialog(false)
              setSelectedAccountForClear(null)
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={confirmClearChats}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AccountList
