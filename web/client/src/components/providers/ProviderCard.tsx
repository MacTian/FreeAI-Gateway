import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
  Copy,
  RefreshCw,
  Plus,
  LogIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProviderIcon } from '@/lib/providerIcons'
import { useState } from 'react'
import type { Provider, ProviderStatus } from '@/types/electron'

interface ProviderCardProps {
  provider: Provider
  status?: ProviderStatus
  accountCount: number
  activeAccountCount: number
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onCheckStatus: (id: string) => void
  onManageAccounts: (id: string) => void
  className?: string
}

export function ProviderCard({
  provider,
  status,
  accountCount,
  activeAccountCount,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onCheckStatus,
  onManageAccounts,
  className,
}: ProviderCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const currentStatus = provider.status || status || 'unknown'
  const icon = getProviderIcon(provider)

  const getProviderName = () => {
    if (provider.type === 'builtin' && provider.id) {
      return t(`${provider.id}.name`, { defaultValue: provider.name })
    }
    return provider.name
  }

  const statusBadge = () => {
    if (currentStatus === 'online') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          在线
        </span>
      )
    } else if (currentStatus === 'offline') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          离线
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        未知
      </span>
    )
  }

  return (
    <div
      className={cn(
        'bg-[#131b2e]/40 backdrop-blur-[40px] rounded-2xl border border-white/5 overflow-hidden transition-all hover:bg-[#131b2e]/60',
        'shadow-[inset_0.5px_0.5px_0_0_rgba(255,255,255,0.05)]',
        className
      )}
    >
      {/* 主行 */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* 图标 */}
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-cyan-500/20 shrink-0 overflow-hidden">
            {icon ? (
              <img src={icon} alt={getProviderName()} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-lg font-bold text-cyan-400">{getProviderName().slice(0,2).toUpperCase()}</span>
            )}
          </div>
          {/* 名称 + 状态 */}
          <div>
            <h3 className="text-base font-semibold text-white">{getProviderName()}</h3>
            <div className="flex gap-3 mt-1.5 items-center">
              {statusBadge()}
              <span className="text-xs text-slate-400">账号: {accountCount} ({activeAccountCount} 活跃)</span>
              <span className="text-xs text-slate-400">模型: {provider.supportedModels?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-3">
          <Switch
            checked={provider.enabled !== false}
            onCheckedChange={(checked) => onToggle(provider.id, checked)}
          />
          <button
            onClick={() => onCheckStatus(provider.id)}
            className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-all"
            title="检查状态"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1e2740] border-white/10">
              <DropdownMenuItem onClick={() => onEdit(provider.id)} className="text-white hover:bg-white/5">
                <Edit className="w-4 h-4 mr-2" /> {t('providers.editProvider')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(provider.id)} className="text-white hover:bg-white/5">
                <Copy className="w-4 h-4 mr-2" /> {t('providers.duplicateProvider')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => onDelete(provider.id)} className="text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" /> {t('providers.deleteProvider')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开：账号管理 */}
      {expanded && (
        <div className="border-t border-white/5 bg-black/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">账号列表</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManageAccounts(provider.id)}
              className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            >
              {accountCount === 0 ? (
                <><Plus className="w-3 h-3 mr-1" /> 添加账号</>
              ) : (
                <><LogIn className="w-3 h-3 mr-1" /> 管理账号</>
              )}
            </Button>
          </div>
          {accountCount === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">暂无账号，点击上方按钮添加</p>
          ) : (
            <p className="text-xs text-slate-400">{accountCount} 个账号，{activeAccountCount} 个活跃</p>
          )}
        </div>
      )}
    </div>
  )
}

export default ProviderCard
