# 项目概述

Clove 前端管理界面，基于 React 19 + TypeScript + Vite 7 + Tailwind CSS 4 构建。

# 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（热重载）
pnpm dev
# 访问 http://localhost:5173
# API 请求会代理到后端 http://localhost:5201

# 构建生产版本
pnpm build
# 产物输出到 dist/

# 代码检查
pnpm lint

# 预览构建产物
pnpm preview
```

# 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite 7 | 构建工具 |
| Tailwind CSS 4 | 样式 |
| Radix UI | 无样式组件库 |
| React Router | 路由 |
| Axios | HTTP 请求 |
| Lucide React | 图标 |

# 目录结构

```
src/
├── api/          # API 请求封装
├── components/   # 可复用组件
│   └── ui/       # 基础 UI 组件（shadcn/ui 风格）
├── hooks/        # 自定义 Hooks
├── lib/          # 工具函数
├── pages/        # 页面组件
│   ├── Login.tsx      # 登录页
│   ├── Dashboard.tsx  # 仪表盘
│   ├── Accounts.tsx   # 账户管理
│   └── Settings.tsx   # 设置页
├── utils/        # 工具函数
├── App.tsx       # 根组件（路由配置）
├── main.tsx      # 入口文件
└── index.css     # 全局样式
```

# 开发代理

开发时 Vite 会将 API 请求代理到后端：

```typescript
// vite.config.ts
proxy: {
    '/api': { target: 'http://localhost:5201' },
    '/health': { target: 'http://localhost:5201' },
}
```

**开发流程**：先启动后端 `clove`，再启动前端 `pnpm dev`

# 路径别名

使用 `@` 别名指向 `src/` 目录：

```typescript
import { Button } from '@/components/ui/button'
```

# 构建部署

构建产物需要复制到后端的 `app/static/` 目录：

```bash
pnpm build
cp -r dist/* ../app/static/
```