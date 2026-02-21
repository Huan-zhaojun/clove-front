import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AccountPaginationProps {
    page: number
    pageSize: number
    totalFiltered: number
    totalPages: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// 分页控件：每页条数选择 + 页码信息 + 翻页按钮
export function AccountPagination({
    page,
    pageSize,
    totalFiltered,
    totalPages,
    onPageChange,
    onPageSizeChange,
}: AccountPaginationProps) {
    const start = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, totalFiltered)

    return (
        <div className='flex flex-col sm:flex-row items-center justify-between gap-3 text-sm'>
            {/* 每页条数 */}
            <div className='flex items-center gap-2'>
                <span className='text-muted-foreground'>每页</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={v => onPageSizeChange(Number(v))}
                >
                    <SelectTrigger size='sm' className='w-[80px]'>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(size => (
                            <SelectItem key={size} value={size.toString()}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className='text-muted-foreground'>条</span>
            </div>

            {/* 页码信息 */}
            <span className='text-muted-foreground'>
                第 {start}-{end} 项，共 {totalFiltered} 项
            </span>

            {/* 翻页按钮 */}
            <div className='flex items-center gap-1'>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className='h-4 w-4' />
                    上一页
                </Button>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                >
                    下一页
                    <ChevronRight className='h-4 w-4' />
                </Button>
            </div>
        </div>
    )
}
