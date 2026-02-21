import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { accountsApi } from '@/api/client'

interface AccountSelectionToolbarProps {
    selectedCount: number
    selectedIds: Set<string>
    onClearSelection: () => void
    onDeleteComplete: () => void
}

// 批量操作工具栏：选中数量 + 批量删除 + 取消选择
export function AccountSelectionToolbar({
    selectedCount,
    selectedIds,
    onClearSelection,
    onDeleteComplete,
}: AccountSelectionToolbarProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // 执行批量删除
    const handleBatchDelete = async () => {
        setDeleting(true)
        try {
            const result = await accountsApi.batchDelete({
                organization_uuids: Array.from(selectedIds),
            })
            const data = result.data

            if (data.failure_count === 0) {
                toast.success(`成功删除 ${data.success_count} 个账户`)
            } else {
                toast.warning(
                    `删除完成：${data.success_count} 个成功，${data.failure_count} 个失败`
                )
            }

            onClearSelection()
            onDeleteComplete()
        } catch {
            toast.error('批量删除请求失败')
        } finally {
            setDeleting(false)
            setDeleteDialogOpen(false)
        }
    }

    if (selectedCount === 0) return null

    return (
        <>
            <div className='flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2'>
                <span className='text-sm font-medium'>
                    已选 {selectedCount} 项
                </span>
                <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleting}
                >
                    <Trash2 className='mr-1 h-4 w-4' />
                    批量删除
                </Button>
                <Button
                    variant='ghost'
                    size='sm'
                    onClick={onClearSelection}
                >
                    <X className='mr-1 h-4 w-4' />
                    取消选择
                </Button>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确定要删除选中的 {selectedCount} 个账户吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。删除后这些账户将从 Clove 中移除，但不会影响您在 Claude.ai 中的数据。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBatchDelete}
                            disabled={deleting}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {deleting ? '删除中...' : '删除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
