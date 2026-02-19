import { useState, useEffect } from 'react'
import { Network, Edit2, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { proxiesApi } from '@/api/client'
import type { ProxySettings, ProxyMode, RotationStrategy } from '@/api/types'
import { toast } from 'sonner'

interface DynamicProxySettingsProps {
    proxySettings: ProxySettings | null | undefined
    fixedUrl: string | null | undefined  // 仅用于向后兼容读取旧配置
    onSettingsChange: (settings: ProxySettings) => void
}

const PROXY_MODE_LABELS: Record<ProxyMode, string> = {
    disabled: '禁用',
    fixed: '固定代理',
    dynamic: '动态代理池',
}

const ROTATION_STRATEGY_LABELS: Record<RotationStrategy, string> = {
    sequential: '顺序循环',
    random: '随机选择',
    random_no_repeat: '随机不重复',
    per_account: '按账户映射',
}

const DEFAULT_PROXY_SETTINGS: ProxySettings = {
    mode: 'disabled',  // 默认禁用代理
    fixed_url: null,
    rotation_strategy: 'sequential',
    rotation_interval: 300,
    cooldown_duration: 1800,
    fallback_strategy: 'sequential',
}

export function DynamicProxySettings({
    proxySettings,
    fixedUrl,
    onSettingsChange,
}: DynamicProxySettingsProps) {
    // 使用有效的代理设置（合并默认值）
    const effectiveSettings: ProxySettings = {
        ...DEFAULT_PROXY_SETTINGS,
        ...proxySettings,
    }

    // 根据旧配置 proxy_url 推断模式
    const effectiveMode: ProxyMode = proxySettings?.mode ?? (fixedUrl ? 'fixed' : 'disabled')

    const [proxyListOpen, setProxyListOpen] = useState(false)
    const [proxyContent, setProxyContent] = useState('')
    const [proxyCount, setProxyCount] = useState(0)
    const [loadingProxies, setLoadingProxies] = useState(false)
    const [savingProxies, setSavingProxies] = useState(false)

    // 加载代理列表
    const loadProxies = async () => {
        setLoadingProxies(true)
        try {
            const response = await proxiesApi.get()
            setProxyContent(response.data.content)
            setProxyCount(response.data.count)
        } catch (error) {
            console.error('Failed to load proxies:', error)
        } finally {
            setLoadingProxies(false)
        }
    }

    // 保存代理列表
    const saveProxies = async () => {
        setSavingProxies(true)
        try {
            const response = await proxiesApi.update({ content: proxyContent })
            setProxyCount(response.data.count)
            toast.success(`已保存 ${response.data.count} 个代理`)
            setProxyListOpen(false)
        } catch (error) {
            console.error('Failed to save proxies:', error)
            toast.error('保存代理列表失败')
        } finally {
            setSavingProxies(false)
        }
    }

    // 当打开弹窗时加载代理列表
    useEffect(() => {
        if (proxyListOpen) {
            loadProxies()
        }
    }, [proxyListOpen])

    // 初始加载代理数量
    useEffect(() => {
        if (effectiveMode === 'dynamic') {
            loadProxies()
        }
    }, [effectiveMode])

    // 处理模式变更
    const handleModeChange = (newMode: ProxyMode) => {
        const newSettings: ProxySettings = {
            ...effectiveSettings,
            mode: newMode,
        }
        onSettingsChange(newSettings)
    }

    // 处理固定代理 URL 变更
    const handleFixedUrlChange = (url: string) => {
        // 只更新 proxy settings，proxy_url 已废弃
        const newSettings: ProxySettings = {
            ...effectiveSettings,
            fixed_url: url || null,
        }
        onSettingsChange(newSettings)
    }

    // 处理轮换策略变更
    const handleStrategyChange = (strategy: RotationStrategy) => {
        const newSettings: ProxySettings = {
            ...effectiveSettings,
            rotation_strategy: strategy,
        }
        onSettingsChange(newSettings)
    }

    // 处理轮换间隔变更
    const handleIntervalChange = (interval: number) => {
        const newSettings: ProxySettings = {
            ...effectiveSettings,
            rotation_interval: interval,
        }
        onSettingsChange(newSettings)
    }

    // 处理冷却时间变更
    const handleCooldownChange = (cooldown: number) => {
        const newSettings: ProxySettings = {
            ...effectiveSettings,
            cooldown_duration: cooldown,
        }
        onSettingsChange(newSettings)
    }

    // 处理回退策略变更
    const handleFallbackChange = (strategy: RotationStrategy) => {
        const newSettings: ProxySettings = {
            ...effectiveSettings,
            fallback_strategy: strategy,
        }
        onSettingsChange(newSettings)
    }

    return (
        <div className="space-y-4">
            {/* 代理模式选择 */}
            <div className="space-y-2">
                <Label>代理模式</Label>
                <Select value={effectiveMode} onValueChange={handleModeChange}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(PROXY_MODE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 固定代理模式 - URL 输入 */}
            {effectiveMode === 'fixed' && (
                <div className="space-y-2">
                    <Label htmlFor="fixed-proxy-url">代理 URL</Label>
                    <Input
                        id="fixed-proxy-url"
                        value={effectiveSettings.fixed_url || fixedUrl || ''}
                        onChange={(e) => handleFixedUrlChange(e.target.value)}
                        placeholder="http://host:port 或 socks5://user:pass@host:port"
                    />
                </div>
            )}

            {/* 动态代理模式 - 代理池设置 */}
            {effectiveMode === 'dynamic' && (
                <div className="space-y-4">
                    {/* 代理列表 */}
                    <div className="space-y-2">
                        <Label>代理列表</Label>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                                <Network className="h-3 w-3" />
                                {proxyCount} 个代理
                            </Badge>
                            <Dialog open={proxyListOpen} onOpenChange={setProxyListOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1">
                                        <Edit2 className="h-3 w-3" />
                                        编辑
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>编辑代理列表</DialogTitle>
                                        <DialogDescription>
                                            每行一个代理，支持多种格式。空行和 # 开头的注释会被忽略。
                                        </DialogDescription>
                                    </DialogHeader>
                                    {loadingProxies ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : (
                                        <Textarea
                                            value={proxyContent}
                                            onChange={(e) => setProxyContent(e.target.value)}
                                            placeholder={`# 支持的格式：
http://host:port
http://user:pass@host:port
socks5://host:port
host:port
host:port:user:pass`}
                                            className="min-h-[300px] max-h-[70vh] overflow-y-auto font-mono text-sm"
                                        />
                                    )}
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setProxyListOpen(false)}
                                        >
                                            取消
                                        </Button>
                                        <Button
                                            onClick={saveProxies}
                                            disabled={savingProxies}
                                            className="gap-1"
                                        >
                                            {savingProxies ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                            保存
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* 轮换策略 */}
                    <div className="space-y-2">
                        <Label>轮换策略</Label>
                        <Select
                            value={effectiveSettings.rotation_strategy}
                            onValueChange={handleStrategyChange}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ROTATION_STRATEGY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 轮换间隔（非 per_account 策略时显示） */}
                    {effectiveSettings.rotation_strategy !== 'per_account' && (
                        <div className="space-y-2">
                            <Label htmlFor="rotation-interval">轮换间隔 (秒)</Label>
                            <Input
                                id="rotation-interval"
                                type="number"
                                value={effectiveSettings.rotation_interval}
                                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 300)}
                                min={1}
                            />
                            <p className="text-xs text-muted-foreground">
                                定时任务每隔此时间切换到下一个代理
                            </p>
                        </div>
                    )}

                    {/* 回退策略（per_account 策略时显示） */}
                    {effectiveSettings.rotation_strategy === 'per_account' && (
                        <div className="space-y-2">
                            <Label>回退策略</Label>
                            <Select
                                value={effectiveSettings.fallback_strategy}
                                onValueChange={handleFallbackChange}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ROTATION_STRATEGY_LABELS)
                                        .filter(([value]) => value !== 'per_account')
                                        .map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                无法确定账户时使用的策略
                            </p>
                        </div>
                    )}

                    {/* 冷却时间 */}
                    <div className="space-y-2">
                        <Label htmlFor="cooldown-duration">冷却时间 (秒)</Label>
                        <Input
                            id="cooldown-duration"
                            type="number"
                            value={effectiveSettings.cooldown_duration}
                            onChange={(e) => handleCooldownChange(parseInt(e.target.value) || 1800)}
                            min={0}
                        />
                        <p className="text-xs text-muted-foreground">
                            代理标记为不健康后的冷却恢复时间
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
