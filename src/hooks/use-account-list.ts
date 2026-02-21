import { useState, useMemo, useCallback, useDeferredValue } from 'react'
import type { AccountResponse } from '../api/types'

// 可排序字段类型
export type SortField = 'status' | 'auth_type' | 'last_used' | 'account_type' | 'resets_at'
export type SortDirection = 'asc' | 'desc'

// 筛选选项值类型
export type StatusFilter = 'all' | 'valid' | 'invalid' | 'rate_limited'
export type AuthTypeFilter = 'all' | 'cookie_only' | 'oauth_only' | 'both'
export type AccountTypeFilter = 'all' | 'free' | 'pro' | 'max'

// Hook 返回类型
export interface UseAccountListReturn {
    // 数据
    accounts: AccountResponse[]
    paginatedAccounts: AccountResponse[]
    filteredAccounts: AccountResponse[]
    loading: boolean
    setAccounts: (accounts: AccountResponse[]) => void
    setLoading: (loading: boolean) => void

    // 选择
    selectedIds: Set<string>
    toggleSelect: (uuid: string) => void
    toggleSelectPage: () => void
    selectAll: () => void
    clearSelection: () => void
    isAllSelected: boolean
    isPageAllSelected: boolean

    // 分页
    page: number
    pageSize: number
    setPage: (page: number) => void
    setPageSize: (size: number) => void
    totalPages: number
    totalFiltered: number

    // 筛选
    searchQuery: string
    setSearchQuery: (query: string) => void
    statusFilter: StatusFilter
    setStatusFilter: (filter: StatusFilter) => void
    authTypeFilter: AuthTypeFilter
    setAuthTypeFilter: (filter: AuthTypeFilter) => void
    accountTypeFilter: AccountTypeFilter
    setAccountTypeFilter: (filter: AccountTypeFilter) => void

    // 排序
    sortField: SortField | null
    sortDirection: SortDirection | null
    toggleSort: (field: SortField) => void
    setSort: (field: SortField | null, direction: SortDirection | null) => void
}

// 获取账户类型排序权重
function getAccountTypeWeight(account: AccountResponse): number {
    if (account.is_max) return 2
    if (account.is_pro) return 1
    return 0
}

// 获取状态排序权重
function getStatusWeight(status: string): number {
    switch (status) {
        case 'valid': return 0
        case 'rate_limited': return 1
        case 'invalid': return 2
        default: return 3
    }
}

// 账户列表管理 Hook：筛选 → 排序 → 分页 + 选择
export function useAccountList(): UseAccountListReturn {
    // 原始数据
    const [accounts, setAccounts] = useState<AccountResponse[]>([])
    const [loading, setLoading] = useState(true)

    // 筛选状态
    const [searchQuery, setSearchQueryRaw] = useState('')
    const [statusFilter, setStatusFilterRaw] = useState<StatusFilter>('all')
    const [authTypeFilter, setAuthTypeFilterRaw] = useState<AuthTypeFilter>('all')
    const [accountTypeFilter, setAccountTypeFilterRaw] = useState<AccountTypeFilter>('all')

    // 搜索防抖：使用 React 19 useDeferredValue
    const deferredSearchQuery = useDeferredValue(searchQuery)

    // 排序状态
    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection | null>(null)

    // 分页状态
    const [page, setPage] = useState(1)
    const [pageSize, setPageSizeRaw] = useState(20)

    // 选择状态
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // 筛选变化时自动回到第 1 页
    const setSearchQuery = useCallback((query: string) => {
        setSearchQueryRaw(query)
        setPage(1)
    }, [])

    const setStatusFilter = useCallback((filter: StatusFilter) => {
        setStatusFilterRaw(filter)
        setPage(1)
    }, [])

    const setAuthTypeFilter = useCallback((filter: AuthTypeFilter) => {
        setAuthTypeFilterRaw(filter)
        setPage(1)
    }, [])

    const setAccountTypeFilter = useCallback((filter: AccountTypeFilter) => {
        setAccountTypeFilterRaw(filter)
        setPage(1)
    }, [])

    const setPageSize = useCallback((size: number) => {
        setPageSizeRaw(size)
        setPage(1)
    }, [])

    // 排序三态循环：null → asc → desc → null
    const toggleSort = useCallback((field: SortField) => {
        if (sortField !== field) {
            // 切换到新列：升序
            setSortField(field)
            setSortDirection('asc')
        } else if (sortDirection === 'asc') {
            // 同列：升序 → 降序
            setSortDirection('desc')
        } else {
            // 同列：降序 → 清除排序
            setSortField(null)
            setSortDirection(null)
        }
        setPage(1)
    }, [sortField, sortDirection])

    // 直接设置排序（移动端排序 Sheet 用）
    const setSort = useCallback((field: SortField | null, direction: SortDirection | null) => {
        setSortField(field)
        setSortDirection(direction)
        setPage(1)
    }, [])

    // 第一步：筛选
    const filteredAccounts = useMemo(() => {
        return accounts.filter(account => {
            // UUID 搜索
            if (deferredSearchQuery && !account.organization_uuid.toLowerCase().includes(deferredSearchQuery.toLowerCase())) {
                return false
            }
            // 状态筛选
            if (statusFilter !== 'all' && account.status !== statusFilter) {
                return false
            }
            // 认证方式筛选
            if (authTypeFilter !== 'all' && account.auth_type !== authTypeFilter) {
                return false
            }
            // 账户类型筛选
            if (accountTypeFilter !== 'all') {
                if (accountTypeFilter === 'max' && !account.is_max) return false
                if (accountTypeFilter === 'pro' && !account.is_pro) return false
                if (accountTypeFilter === 'free' && (account.is_pro || account.is_max)) return false
            }
            return true
        })
    }, [accounts, deferredSearchQuery, statusFilter, authTypeFilter, accountTypeFilter])

    // 第二步：排序
    const sortedAccounts = useMemo(() => {
        if (!sortField || !sortDirection) return filteredAccounts

        const sorted = [...filteredAccounts]
        const dir = sortDirection === 'asc' ? 1 : -1

        sorted.sort((a, b) => {
            switch (sortField) {
                case 'status':
                    return (getStatusWeight(a.status) - getStatusWeight(b.status)) * dir
                case 'auth_type':
                    return a.auth_type.localeCompare(b.auth_type) * dir
                case 'last_used':
                    return (new Date(a.last_used).getTime() - new Date(b.last_used).getTime()) * dir
                case 'account_type':
                    return (getAccountTypeWeight(a) - getAccountTypeWeight(b)) * dir
                case 'resets_at': {
                    // 按重置时间排序，null 值排末尾
                    const aTime = a.resets_at ? new Date(a.resets_at).getTime() : (dir > 0 ? Infinity : -Infinity)
                    const bTime = b.resets_at ? new Date(b.resets_at).getTime() : (dir > 0 ? Infinity : -Infinity)
                    return (aTime - bTime) * dir
                }
                default:
                    return 0
            }
        })

        return sorted
    }, [filteredAccounts, sortField, sortDirection])

    // 分页计算
    const totalFiltered = sortedAccounts.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

    // 第三步：分页切片
    const paginatedAccounts = useMemo(() => {
        const start = (page - 1) * pageSize
        return sortedAccounts.slice(start, start + pageSize)
    }, [sortedAccounts, page, pageSize])

    // 选择操作
    const toggleSelect = useCallback((uuid: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(uuid)) {
                next.delete(uuid)
            } else {
                next.add(uuid)
            }
            return next
        })
    }, [])

    // 切换当前页全选
    const toggleSelectPage = useCallback(() => {
        setSelectedIds(prev => {
            const pageUuids = paginatedAccounts.map(a => a.organization_uuid)
            const allPageSelected = pageUuids.every(uuid => prev.has(uuid))

            const next = new Set(prev)
            if (allPageSelected) {
                // 取消当前页选择
                pageUuids.forEach(uuid => next.delete(uuid))
            } else {
                // 选中当前页全部
                pageUuids.forEach(uuid => next.add(uuid))
            }
            return next
        })
    }, [paginatedAccounts])

    // 选中所有筛选结果
    const selectAll = useCallback(() => {
        const allUuids = sortedAccounts.map(a => a.organization_uuid)
        setSelectedIds(new Set(allUuids))
    }, [sortedAccounts])

    // 清除选择
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set())
    }, [])

    // 当前页是否全选
    const isPageAllSelected = paginatedAccounts.length > 0 &&
        paginatedAccounts.every(a => selectedIds.has(a.organization_uuid))

    // 所有筛选结果是否全选
    const isAllSelected = sortedAccounts.length > 0 &&
        sortedAccounts.every(a => selectedIds.has(a.organization_uuid))

    return {
        accounts,
        paginatedAccounts,
        filteredAccounts,
        loading,
        setAccounts,
        setLoading,

        selectedIds,
        toggleSelect,
        toggleSelectPage,
        selectAll,
        clearSelection,
        isAllSelected,
        isPageAllSelected,

        page,
        pageSize,
        setPage,
        setPageSize,
        totalPages,
        totalFiltered,

        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        authTypeFilter,
        setAuthTypeFilter,
        accountTypeFilter,
        setAccountTypeFilter,

        sortField,
        sortDirection,
        toggleSort,
        setSort,
    }
}
