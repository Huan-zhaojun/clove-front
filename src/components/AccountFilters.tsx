import { Search, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import type { StatusFilter, AuthTypeFilter, AccountTypeFilter, SortField, SortDirection } from '@/hooks/use-account-list'

interface AccountFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    statusFilter: StatusFilter
    onStatusFilterChange: (filter: StatusFilter) => void
    authTypeFilter: AuthTypeFilter
    onAuthTypeFilterChange: (filter: AuthTypeFilter) => void
    accountTypeFilter: AccountTypeFilter
    onAccountTypeFilterChange: (filter: AccountTypeFilter) => void
    isAllSelected: boolean
    onSelectAll: () => void
    onClearSelection: () => void
    sortField: SortField | null
    sortDirection: SortDirection | null
    onSetSort: (field: SortField | null, direction: SortDirection | null) => void
    isMobile?: boolean
}

// 排序选项配置
const SORT_OPTIONS: { field: SortField | null; label: string }[] = [
    { field: null, label: '默认排序' },
    { field: 'status', label: '状态' },
    { field: 'account_type', label: '账户类型' },
    { field: 'last_used', label: '最后使用时间' },
    { field: 'resets_at', label: '重置时间' },
]

// 筛选下拉菜单组件（桌面端和移动端 Sheet 内共用）
function FilterSelects({
    statusFilter,
    onStatusFilterChange,
    authTypeFilter,
    onAuthTypeFilterChange,
    accountTypeFilter,
    onAccountTypeFilterChange,
    className = '',
}: Pick<AccountFiltersProps, 'statusFilter' | 'onStatusFilterChange' | 'authTypeFilter' | 'onAuthTypeFilterChange' | 'accountTypeFilter' | 'onAccountTypeFilterChange'> & { className?: string }) {
    return (
        <div className={className}>
            <Select value={statusFilter} onValueChange={v => onStatusFilterChange(v as StatusFilter)}>
                <SelectTrigger className='w-full md:w-[120px]'>
                    <SelectValue placeholder='状态' />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>全部状态</SelectItem>
                    <SelectItem value='valid'>正常</SelectItem>
                    <SelectItem value='rate_limited'>限流中</SelectItem>
                    <SelectItem value='invalid'>无效</SelectItem>
                </SelectContent>
            </Select>

            <Select value={authTypeFilter} onValueChange={v => onAuthTypeFilterChange(v as AuthTypeFilter)}>
                <SelectTrigger className='w-full md:w-[140px]'>
                    <SelectValue placeholder='认证方式' />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>全部认证</SelectItem>
                    <SelectItem value='cookie_only'>Cookie</SelectItem>
                    <SelectItem value='oauth_only'>OAuth</SelectItem>
                    <SelectItem value='both'>Cookie + OAuth</SelectItem>
                </SelectContent>
            </Select>

            <Select value={accountTypeFilter} onValueChange={v => onAccountTypeFilterChange(v as AccountTypeFilter)}>
                <SelectTrigger className='w-full md:w-[120px]'>
                    <SelectValue placeholder='账户类型' />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>全部类型</SelectItem>
                    <SelectItem value='free'>Free</SelectItem>
                    <SelectItem value='pro'>Pro</SelectItem>
                    <SelectItem value='max'>Max</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

// 移动端排序 Sheet 内容
function SortSheetContent({
    sortField,
    sortDirection,
    onSetSort,
}: Pick<AccountFiltersProps, 'sortField' | 'sortDirection' | 'onSetSort'>) {
    return (
        <div className='px-4 pb-2'>
            {/* 排序选项列表 */}
            <div className='space-y-1'>
                {SORT_OPTIONS.map(option => {
                    const isSelected = sortField === option.field
                    return (
                        <button
                            key={option.field ?? 'default'}
                            type='button'
                            className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                isSelected
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                            }`}
                            onClick={() => {
                                if (option.field === null) {
                                    // 默认排序：清除
                                    onSetSort(null, null)
                                } else if (!isSelected) {
                                    // 选中新字段：默认升序
                                    onSetSort(option.field, 'asc')
                                }
                            }}
                        >
                            {/* Radio 圆点 */}
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-primary' : 'border-muted-foreground/30'
                            }`}>
                                {isSelected && (
                                    <div className='h-2 w-2 rounded-full bg-primary' />
                                )}
                            </div>
                            <span>{option.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* 方向切换按钮（始终渲染，未选择排序字段时 disabled） */}
            <div className='flex gap-2 pt-3'>
                <Button
                    variant={sortField && sortDirection === 'asc' ? 'default' : 'outline'}
                    className='flex-1'
                    size='sm'
                    disabled={!sortField}
                    onClick={() => sortField && onSetSort(sortField, 'asc')}
                >
                    <ArrowUp className='mr-1.5 h-4 w-4' />
                    升序
                </Button>
                <Button
                    variant={sortField && sortDirection === 'desc' ? 'default' : 'outline'}
                    className='flex-1'
                    size='sm'
                    disabled={!sortField}
                    onClick={() => sortField && onSetSort(sortField, 'desc')}
                >
                    <ArrowDown className='mr-1.5 h-4 w-4' />
                    降序
                </Button>
            </div>
        </div>
    )
}

// 账户筛选工具栏：搜索框 + 状态/认证/类型筛选 + 全选 + 排序
export function AccountFilters({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    authTypeFilter,
    onAuthTypeFilterChange,
    accountTypeFilter,
    onAccountTypeFilterChange,
    isAllSelected,
    onSelectAll,
    onClearSelection,
    sortField,
    sortDirection,
    onSetSort,
    isMobile,
}: AccountFiltersProps) {
    // 是否有活跃筛选条件
    const hasActiveFilters = statusFilter !== 'all' || authTypeFilter !== 'all' || accountTypeFilter !== 'all'
    // 是否有活跃排序
    const hasActiveSort = sortField !== null

    if (isMobile) {
        return (
            <div className='flex gap-2'>
                {/* 搜索框 */}
                <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                        placeholder='搜索 UUID...'
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className='pl-9 !pr-7'
                    />
                    {searchQuery && (
                        <button
                            type='button'
                            onClick={() => onSearchChange('')}
                            className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                        >
                            <X className='h-4 w-4' />
                        </button>
                    )}
                </div>

                {/* 筛选按钮 */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant={hasActiveFilters ? 'default' : 'outline'} size='icon'>
                            <SlidersHorizontal className='h-4 w-4' />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side='bottom'>
                        <SheetHeader>
                            <SheetTitle>筛选条件</SheetTitle>
                        </SheetHeader>
                        <FilterSelects
                            className='flex flex-col gap-3 px-4'
                            statusFilter={statusFilter}
                            onStatusFilterChange={onStatusFilterChange}
                            authTypeFilter={authTypeFilter}
                            onAuthTypeFilterChange={onAuthTypeFilterChange}
                            accountTypeFilter={accountTypeFilter}
                            onAccountTypeFilterChange={onAccountTypeFilterChange}
                        />
                        {/* 移动端全选 */}
                        <div className='border-t mx-4 pt-3 pb-2'>
                            <div className='flex items-center gap-2'>
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={checked => {
                                        if (checked) onSelectAll()
                                        else onClearSelection()
                                    }}
                                />
                                <span className='text-sm text-muted-foreground'>全选</span>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* 排序按钮 */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant={hasActiveSort ? 'default' : 'outline'} size='icon'>
                            <ArrowUpDown className='h-4 w-4' />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side='bottom'>
                        <SheetHeader>
                            <SheetTitle>排序方式</SheetTitle>
                        </SheetHeader>
                        <SortSheetContent
                            sortField={sortField}
                            sortDirection={sortDirection}
                            onSetSort={onSetSort}
                        />
                    </SheetContent>
                </Sheet>
            </div>
        )
    }

    // 桌面端：水平排列
    return (
        <div className='flex items-center gap-3'>
            <div className='relative flex-1 max-w-[340px]'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                    placeholder='搜索 UUID...'
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    className='pl-9 !pr-6'
                />
                {searchQuery && (
                    <button
                        type='button'
                        onClick={() => onSearchChange('')}
                        className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                    >
                        <X className='h-4 w-4' />
                    </button>
                )}
            </div>
            <FilterSelects
                className='flex items-center gap-3'
                statusFilter={statusFilter}
                onStatusFilterChange={onStatusFilterChange}
                authTypeFilter={authTypeFilter}
                onAuthTypeFilterChange={onAuthTypeFilterChange}
                accountTypeFilter={accountTypeFilter}
                onAccountTypeFilterChange={onAccountTypeFilterChange}
            />
            {/* 全选（筛选栏最右侧） */}
            <div className='flex items-center gap-2'>
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={checked => {
                        if (checked) onSelectAll()
                        else onClearSelection()
                    }}
                />
                <span className='text-sm text-muted-foreground whitespace-nowrap'>全选</span>
            </div>
        </div>
    )
}
