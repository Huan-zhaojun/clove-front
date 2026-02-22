import { useState, useRef } from 'react'
import { Loader2, CheckCircle, AlertCircle, XCircle, Cookie, FileText, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { accountsApi } from '../api/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useIsMobile } from '@/hooks/use-mobile'

interface BatchRefreshModalProps {
    organizationUuids: string[]
    onClose: () => void
}

interface RefreshResultItem {
    organizationUuid: string
    status: 'pending' | 'processing' | 'success' | 'error' | 'cancelled'
    previousStatus?: string
    newStatus?: string
    error?: string
}

// 状态名称映射
function getStatusName(status: string) {
    switch (status) {
        case 'valid':
            return '正常'
        case 'invalid':
            return '无效'
        case 'rate_limited':
            return '限流中'
        default:
            return status
    }
}

// 结果图标（根据 newStatus 复用账户状态图标）
function getResultIcon(item: RefreshResultItem) {
    switch (item.status) {
        case 'success':
            if (item.newStatus === 'valid') return <CheckCircle className='h-4 w-4 text-green-500' />
            if (item.newStatus === 'rate_limited') return <AlertCircle className='h-4 w-4 text-yellow-500' />
            return <XCircle className='h-4 w-4 text-red-500' />
        case 'error':
            return <XCircle className='h-4 w-4 text-red-500' />
        case 'processing':
            return <Loader2 className='h-4 w-4 animate-spin' />
        case 'cancelled':
            return <XCircle className='h-4 w-4 text-muted-foreground' />
        default: // pending
            return <Cookie className='h-4 w-4 text-muted-foreground' />
    }
}

export function BatchRefreshModal({ organizationUuids, onClose }: BatchRefreshModalProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [results, setResults] = useState<RefreshResultItem[]>([])
    const [concurrency, setConcurrency] = useState(3)
    const [showResults, setShowResults] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleted, setDeleted] = useState(false)
    const isMobile = useIsMobile()
    const cancelledRef = useRef(false)

    // 并发批量刷新（Worker Pool 模式）
    const startProcessing = async () => {
        setShowResults(true)
        cancelledRef.current = false
        setIsProcessing(true)

        const initialResults: RefreshResultItem[] = organizationUuids.map(uuid => ({
            organizationUuid: uuid,
            status: 'pending',
        }))
        setResults(initialResults)

        // Worker Pool: 共享索引，多个 worker 并发拉取任务
        let nextIndex = 0
        const totalCount = organizationUuids.length

        const processOne = async () => {
            while (true) {
                const i = nextIndex++
                if (i >= totalCount) return

                // 检查是否已取消
                if (cancelledRef.current) {
                    setResults(prev => {
                        const updated = [...prev]
                        if (updated[i]?.status === 'pending') {
                            updated[i] = { ...updated[i], status: 'cancelled' }
                        }
                        return updated
                    })
                    return
                }

                // 标记为处理中
                setResults(prev => {
                    const updated = [...prev]
                    updated[i] = { ...updated[i], status: 'processing' }
                    return updated
                })

                try {
                    // 批量操作跳过全局 toast 错误提示
                    const response = await accountsApi.refreshAccount(
                        organizationUuids[i],
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        { skipToast: true } as any,
                    )
                    const data = response.data

                    setResults(prev => {
                        const updated = [...prev]
                        updated[i] = {
                            ...updated[i],
                            status: 'success',
                            previousStatus: data.previous_status,
                            newStatus: data.new_status,
                        }
                        return updated
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    const errorMessage = error.response?.data?.detail?.message
                        || error.response?.data?.detail
                        || '刷新失败'

                    setResults(prev => {
                        const updated = [...prev]
                        updated[i] = {
                            ...updated[i],
                            status: 'error',
                            error: typeof errorMessage === 'string' ? errorMessage : '刷新失败',
                        }
                        return updated
                    })
                }
            }
        }

        // 启动 min(concurrency, totalCount) 个 worker 并发执行
        const workerCount = Math.min(concurrency, totalCount)
        const workers = Array.from({ length: workerCount }, () => processOne())
        await Promise.allSettled(workers)

        // 扫尾：将剩余 pending 标记为 cancelled
        if (cancelledRef.current) {
            setResults(prev =>
                prev.map(r => (r.status === 'pending' ? { ...r, status: 'cancelled' } : r)),
            )
        }

        setIsProcessing(false)
    }

    const getProgress = () => {
        if (results.length === 0) return 0
        const processed = results.filter(r => r.status === 'success' || r.status === 'error' || r.status === 'cancelled').length
        return (processed / results.length) * 100
    }

    const getProcessingCount = () => results.filter(r => r.status === 'processing').length
    const getSuccessCount = () => results.filter(r => r.status === 'success').length
    const getErrorCount = () => results.filter(r => r.status === 'error').length
    const getCancelledCount = () => results.filter(r => r.status === 'cancelled').length

    // 结果文字
    const getResultText = (item: RefreshResultItem) => {
        if (item.status === 'success' && item.previousStatus && item.newStatus) {
            if (item.previousStatus !== item.newStatus) {
                return `${getStatusName(item.previousStatus)} → ${getStatusName(item.newStatus)}`
            }
            return getStatusName(item.newStatus)
        }
        if (item.status === 'error' && item.error) {
            return item.error
        }
        return null
    }

    // 构建成功明细文案（仅展示非正常状态）
    const getSuccessDetail = () => {
        const successItems = results.filter(r => r.status === 'success' && r.newStatus)
        if (successItems.length === 0) return ''

        // 统计各 newStatus 计数，过滤掉正常状态
        const counts: Record<string, number> = {}
        for (const item of successItems) {
            const status = item.newStatus!
            if (status === 'valid') continue
            counts[status] = (counts[status] || 0) + 1
        }

        const parts = Object.entries(counts).map(([status, count]) => `${count} 个${getStatusName(status)}`)
        if (parts.length === 0) return ''
        return `(${parts.join('，')})`
    }

    // 取消批量处理
    const handleCancel = () => {
        cancelledRef.current = true
    }

    // 关闭弹窗
    const handleClose = () => {
        if (isProcessing) {
            handleCancel()
            return
        }
        onClose()
    }

    // 获取无效账户 UUID 列表
    const invalidUuids = results
        .filter(r => r.status === 'success' && r.newStatus === 'invalid')
        .map(r => r.organizationUuid)

    // 删除无效账户
    const handleDeleteInvalid = async () => {
        setDeleting(true)
        try {
            await accountsApi.batchDelete({ organization_uuids: invalidUuids })
            setDeleted(true)
            toast.success(`已删除 ${invalidUuids.length} 个无效账户`)
        } catch {
            toast.error('删除无效账户失败')
        } finally {
            setDeleting(false)
        }
    }

    const bodyContent = (
        <>
            {!showResults ? (
                <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>
                        将刷新 <span className='font-medium text-foreground'>{organizationUuids.length}</span> 个账户的状态，
                        验证其有效性、同步账户类型，并检测限流账户是否已恢复。
                    </p>
                </div>
            ) : (
                <div className='space-y-4'>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                            <Label>处理进度</Label>
                            <span className='text-sm text-muted-foreground'>
                                {getProcessingCount() > 0 && `${getProcessingCount()} 处理中 / `}
                                {getSuccessCount()} 成功 / {getErrorCount()} 失败
                                {getCancelledCount() > 0 && ` / ${getCancelledCount()} 已取消`}
                                {' '}/ {results.length} 总计
                            </span>
                        </div>
                        <Progress value={getProgress()} className='h-2' />
                    </div>

                    <div className='border rounded-lg max-h-[300px] overflow-y-auto'>
                        <div className='divide-y'>
                            {results.map((result, index) => (
                                <div key={index} className='p-3 flex items-start gap-3'>
                                    <div className='mt-0.5'>{getResultIcon(result)}</div>
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-mono text-xs' title={result.organizationUuid}>
                                            {result.organizationUuid}
                                        </p>
                                        {getResultText(result) && (
                                            <p className={`text-xs mt-1 ${
                                                result.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                                            }`}>
                                                {getResultText(result)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {!isProcessing && results.length > 0 && (
                        <Alert>
                            <FileText className='h-4 w-4' />
                            <AlertDescription>
                                {getCancelledCount() > 0 ? '处理已取消！' : '处理完成！'}
                                成功刷新 {getSuccessCount()} 个账户{getSuccessDetail()}
                                {getErrorCount() > 0 && `，${getErrorCount()} 个失败`}
                                {getCancelledCount() > 0 && `，${getCancelledCount()} 个已取消`}。
                            </AlertDescription>
                        </Alert>
                    )}

                    {!isProcessing && invalidUuids.length > 0 && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='w-full'
                            disabled={deleting || deleted}
                            onClick={handleDeleteInvalid}
                        >
                            {deleting ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Trash2 className='h-4 w-4' />
                            )}
                            {deleted
                                ? `已删除 ${invalidUuids.length} 个无效账户`
                                : `删除 ${invalidUuids.length} 个无效账户`}
                        </Button>
                    )}
                </div>
            )}
        </>
    )

    // 并发数选择器组件
    const concurrencySelector = (
        <div className='flex items-center gap-2 mr-auto'>
            <Label htmlFor='concurrency' className='text-sm whitespace-nowrap'>
                并发
            </Label>
            <Select value={String(concurrency)} onValueChange={v => setConcurrency(Number(v))}>
                <SelectTrigger size='sm' className='w-[4.5rem]'>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='1'>1</SelectItem>
                    <SelectItem value='2'>2</SelectItem>
                    <SelectItem value='3'>3</SelectItem>
                    <SelectItem value='5'>5</SelectItem>
                    <SelectItem value='10'>10</SelectItem>
                    <SelectItem value='20'>20</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )

    const footerContent = (
        <>
            {!showResults ? (
                <>
                    {concurrencySelector}
                    <Button type='button' variant='outline' onClick={handleClose}>
                        取消
                    </Button>
                    <Button onClick={startProcessing}>
                        开始刷新
                    </Button>
                </>
            ) : (
                <>
                    {isProcessing && (
                        <Button type='button' variant='outline' onClick={handleCancel}>
                            取消
                        </Button>
                    )}
                    <Button onClick={handleClose} disabled={isProcessing}>
                        {isProcessing ? '处理中...' : '完成'}
                    </Button>
                </>
            )}
        </>
    )

    if (isMobile === undefined) {
        return null
    }

    if (!isMobile) {
        return (
            <Dialog open={true} onOpenChange={handleClose}>
                <DialogContent
                    className='sm:max-w-[600px]'
                    onInteractOutside={e => {
                        if (isProcessing) e.preventDefault()
                    }}
                    onEscapeKeyDown={e => {
                        if (isProcessing) e.preventDefault()
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            <div className='flex items-center gap-2'>
                                <RefreshCw className='h-5 w-5' />
                                批量刷新账户
                            </div>
                        </DialogTitle>
                        <DialogDescription>刷新选中账户的状态</DialogDescription>
                    </DialogHeader>
                    <div className='py-4'>{bodyContent}</div>
                    <DialogFooter>{footerContent}</DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={true} onOpenChange={open => { if (!isProcessing || open) handleClose() }} dismissible={!isProcessing}>
            <DrawerContent>
                <div className='max-h-[90vh] overflow-auto'>
                    <DrawerHeader>
                        <DrawerTitle>
                            <div className='flex items-center gap-2'>
                                <RefreshCw className='h-5 w-5' />
                                批量刷新账户
                            </div>
                        </DrawerTitle>
                        <DrawerDescription>刷新选中账户的状态</DrawerDescription>
                    </DrawerHeader>
                    <div className='px-4 pb-4'>{bodyContent}</div>
                    <DrawerFooter className='flex-row justify-end space-x-2'>{footerContent}</DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
