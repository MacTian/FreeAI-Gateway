import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/api'
import { Search, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogEntry {
  id: string
  timestamp: number
  level: string
  message: string
  status?: string
  accountId?: string
  providerId?: string
  requestId?: string
  data?: Record<string, unknown>
}

export function RequestLogList() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getLogs(500)
      setLogs(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filtered = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter && log.status !== levelFilter) return false
    if (keyword && !log.message.toLowerCase().includes(keyword.toLowerCase())) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const handleClear = async () => {
    if (!confirm(t('logs.confirmClear') || '确认清空所有日志？')) return
    try {
      await api.clearLogs()
      setLogs([])
      setPage(0)
    } catch {
      // ignore
    }
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString()
  }

  const levelColor = (level: string, status?: string) => {
    if (status === 'error' || level === 'error') return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (status === 'success' || level === 'info') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (level === 'warn') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">{t('logs.requestLogs') || '请求日志'}</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} className="text-red-400 hover:text-red-300">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 t-hint" />
            <Input
              placeholder={t('logs.searchPlaceholder') || '搜索日志...'}
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
          <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(0) }}>
            <SelectTrigger className="w-28 bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="info">成功</SelectItem>
              <SelectItem value="error">失败</SelectItem>
              <SelectItem value="warn">警告</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-40">时间</TableHead>
                <TableHead className="w-16">级别</TableHead>
                <TableHead>消息</TableHead>
                <TableHead className="w-24">供应商</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 t-hint">
                    {isLoading ? '加载中...' : '暂无日志'}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((log) => (
                  <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-xs t-sub font-mono">{formatTime(log.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', levelColor(log.level, log.status))}>
                        {log.status || log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-md truncate">{log.message}</TableCell>
                    <TableCell className="text-xs t-hint">{log.providerId || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm t-sub">
            <span>共 {filtered.length} 条</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="icon"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>{page + 1} / {totalPages}</span>
              <Button
                variant="ghost" size="icon"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
