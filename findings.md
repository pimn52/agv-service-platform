# 发现与决策

## 需求
- 熟悉 AGV service platform-APP 项目
- 确认后续开发部署环境是否就绪

## 研究发现

### 项目概览
- **名称：** 城市无人车服务 (AGV Service Platform)
- **定位：** B2B 城市无人车综合服务平台 MVP
- **三大核心业务：** 物流配送、巡游贩卖、安防巡检
- **当前版本：** v0.4.0

### 技术栈
| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.1.1 |
| UI | React | 19.2.3 |
| 语言 | TypeScript (strict) | ~5.x |
| 组件库 | shadcn/ui (Radix UI) | -- |
| 样式 | Tailwind CSS | v4 |
| 状态管理 | Zustand | 5.0.13 |
| 图表 | Recharts | 2.15.4 |
| 表单 | react-hook-form + zod | -- |
| ORM (未启用) | Drizzle ORM | 0.45.x |
| 数据库 (未启用) | PostgreSQL (pg) | 8.16.x |
| 后端云 (未启用) | Supabase | 2.95.3 |
| 云存储 (未启用) | AWS S3 SDK | 3.958.0 |
| 包管理器 | pnpm | 9.0.0 |
| 构建 | tsup + tsx | -- |

### 架构特点
- **手机壳模拟：** 桌面端显示为 375x812 的 iPhone 框架；移动端全屏
- **页面栈导航：** 用 Zustand 管理 push/pop 的页面栈，非 Next.js 路由跳转
- **4 个主 Tab：** 首页 / 服务追踪 / 订单 / 我的
- **当前全 Mock 数据：** 所有数据来自 `src/mock/data.ts`，API 路由和服务层均为 stub
- **后端依赖已安装但未集成：** Drizzle ORM、pg、Supabase、AWS S3 均在 package.json 但代码中未引用

### 环境检查结果

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Node.js | ✅ 就绪 | v24.15.0（满足 nodejs-24 要求） |
| npm | ✅ 就绪 | 11.12.1 |
| pnpm | ❌ 缺失 | 未安装，需通过 corepack 或 npm 安装 |
| Git | ✅ 就绪 | 2.54.0 |
| Git 仓库 | ❌ 未初始化 | 无 .git 目录 |
| node_modules | ❌ 未安装 | 需运行 pnpm install |
| .env 文件 | ❌ 缺失 | 无任何环境变量文件 |
| tsx (全局) | ❌ 缺失 | 仅在项目中作为 devDependency |
| corepack | ✅ 可用 | 0.34.6 |

### 缺失的关键配置
- `NEXT_PUBLIC_API_BASE` — API 基础 URL（api-client.ts 中引用）
- `HOSTNAME` / `PORT` — 服务端监听配置（server.ts 中引用，默认端口 5000）
- `COZE_PROJECT_ENV` — Coze 部署环境标识

## 技术决策
| 决策 | 理由 |
|------|------|
| 使用 pnpm 管理依赖 | 项目已有 pnpm-lock.yaml，npmrc 配置了 pnpm 镜像源 |
| 需初始化 Git 仓库 | 有 .gitignore 但无 .git 目录，开发迭代需要版本控制 |
| 需创建 .env 文件 | server.ts 和 api-client.ts 依赖环境变量 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| pnpm 未安装 | 通过 `corepack enable pnpm` 或 `npm install -g pnpm` 安装 |
| 无 .env 文件 | 根据 server.ts 和 api-client.ts 的引用创建 .env.local |
| 无 Git 仓库 | 初始化 `git init` 并创建首次提交 |

## 资源
- README.md — 项目说明和快速开始
- AGENTS.md — 详细技术文档和业务规则
- .coze — Coze 部署配置
- scripts/dev.sh — 本地开发启动脚本（端口 5000）

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
