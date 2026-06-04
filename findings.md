# 发现与决策

> **本文件由 planning-with-files-zh 自动维护**，记录动态研究发现与子 Agent 规范。项目架构决策与不变量见 `architecture-decisions.md`。两文件各司其职，本文件可能被 skill 覆盖。

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

### 环境状态（2026-06-03）

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Node.js | ✅ 就绪 | v24.15.0 |
| pnpm | ✅ 就绪 | 已通过 corepack 安装 |
| Git | ✅ 就绪 | 仓库已初始化 |
| node_modules | ✅ 就绪 | 依赖已安装 |
| .env.local | ✅ 就绪 | Supabase URL/Key 已配置 |
| ts-check | ✅ 通过 | 零错误 |
| pnpm build | ✅ 通过 | 生产构建成功 |
| dev server | ✅ 就绪 | localhost:5000 |

## 技术决策
| 决策 | 理由 |
|------|------|
| 使用 pnpm 管理依赖 | 项目已有 pnpm-lock.yaml，npmrc 配置了 pnpm 镜像源 |
| 需初始化 Git 仓库 | 有 .gitignore 但无 .git 目录，开发迭代需要版本控制 |
| 需创建 .env 文件 | server.ts 和 api-client.ts 依赖环境变量 |
| 数据流三层收口（2026-06-02） | 消除 Order 对象的多路径构造/修改/读取，确保唯一数据来源和接口 |

### 数据流收口架构（2026-06-02）

**问题**：Order 对象存在三条构造路径（mock/data.ts 手写、data/orders.ts demo/Supabase 两套逻辑、store 内联）、三种状态修改方法互不知情、六个组件各自写 fallback 读取链。

**决策**：建立三层唯一入口——

| 层 | 文件 | 职责 |
|------|------|------|
| 构建层 | `src/lib/order-factory.ts` | `buildOrder(spec)` / `buildDemoOrder(spec)` — 创建 Order 的唯一入口 |
| 变更层 | `src/lib/order-mutator.ts` | `applyMutation(order, action)` — 状态变更唯一入口，订单状态自动派生 |
| 读取层 | `src/lib/order-reader.ts` | `getOrderStops()` / `getOrderAddresses()` / `getOrderSummary()` 等 — 权威读取函数 |

**规则**：
- 禁止在 factory/mutator/reader 之外逐字段构造 Order、直接修改 stops/waybills、或手写 fallback 链
- 物流配送场景下 order.status 必须从底层数据派生（deriveOrderStatus），不得直接设置
- 新增 Order 字段只需改 factory + reader，消费方自动获得默认值
- DeliveryForm 为判别联合类型：`FTLDeliveryForm`（有 ftlWaybills 无 ltlWaybills）/ `LTLDeliveryForm`（有 ltlWaybills 无 ftlWaybills），`stops` 字段已删除，TypeScript 编译期阻止字段混用
- **单一真相源**（2026-06-03）：`deriveOrderStatus` 是 LTL 订单状态的唯一派生函数，UI 层禁止从 waybill/stop 原始数据自行推导状态标签，只能读 `order.status` + `order.atPickup` 做映射

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| pnpm 未安装 | 通过 `corepack enable pnpm` 或 `npm install -g pnpm` 安装 |
| 无 .env 文件 | 根据 server.ts 和 api-client.ts 的引用创建 .env.local |
| 无 Git 仓库 | 初始化 `git init` 并创建首次提交 |

## 子 Agent 派发规范

> 被 `CLAUDE.md` 开发原则引用。

### 派发前
1. 必须给出最小验收标准（AC），Agent prompt 末尾写明
2. 涉及 FTL/LTL 双线改动，prompt 必须要求两边对称验证
3. 修改 Mock 数据，必须要求通过工厂函数生成（`buildDemoOrder` + `buildLTLCompartments`），不得手写 JSON

### 返回后验证
1. `pnpm ts-check`，不通过则要求 Agent 修复
2. `/agv-consistency-check`（术语残留 + 文档引用 + 状态对齐 + E2E 测试流，含浏览器截图）
3. 两步全过才汇报"完成"

### FTL/LTL 双线对称规则
- L2 Tab、交接记录、操作按钮等相同 UI 模式使用**相同代码结构**
- 新增功能必须同时考虑两边是否需要
- 审查时逐项对照 FTL ↔ LTL 不对称点

### Mock 数据工厂规则
- 演示数据必须通过 `buildDemoOrder()` 生成基础结构
- LTL 订单 compartments 必须通过 `buildLTLCompartments()` 生成
- 禁止手写 compartments、vehiclePlate 等派生字段
- 修改 Order 类型后同步更新工厂函数和 Mock 数据

## Supabase 运维注意事项

> **核心原则**：`sql/schema.sql` 是数据库的唯一定义源。任何表结构、RLS 策略、触发器的变更必须同步到 Supabase。

### 同步流程
1. 修改 `sql/schema.sql` → 提交 git
2. 打开 Supabase SQL Editor 执行**新增/变更**的 SQL 片段（幂等，`IF NOT EXISTS` 保护）
3. 执行后验证：查 `pg_policies`、`pg_tables`、`pg_trigger` 确认生效
4. 如果 Supabase 部署状态不确定，整份 `sql/schema.sql` 粘贴执行即可

### RLS 策略检查清单
每次新增表或修改权限后，确认以下策略齐全：

| 表 | SELECT | INSERT | UPDATE | DELETE |
|----|:--:|:--:|:--:|:--:|
| profiles | ✅ | ✅ | ✅ | — |
| orders | ✅ | ✅ | ✅ | ✅ |
| order_logistics | ✅ | ✅ | ✅ | — |
| notifications | ✅ | — | ✅ | — |
| invoices | ✅ | ✅ | ✅ | ✅ |

### 前端 ↔ Supabase 持久化映射

| 前端操作 | 内存 | Supabase | 备注 |
|----------|:--:|:--:|------|
| 创建订单 | ✅ | INSERT `orders` | `detail` JSONB 存完整 Order |
| 订单状态变更 | ✅ | UPDATE `status` + `detail` | fire-and-forget，失败不阻塞 UI |
| 运单状态变更 | ✅ | UPDATE `detail` | 同上 |
| 删除订单 | ✅ | DELETE `orders` | DEMO- 前缀跳过 |
| 余额变更 | ✅ | ❌ 不同步 | 仅演示用途，生产不用 |
| 发票申请 | ✅ | INSERT `invoices` | 演示用户用 mock |
| 用户注册 | — | `handle_new_user()` 触发器自动建 profile | 初始余额 0 |

### 常见坑
- **RLS 策略缺 DELETE**：前端 `delete()` 静默失败，刷新后订单复活 → 检查 `pg_policies` 确认 DELETE 策略存在
- **`detail` JSONB 中 ID 不一致**：入库时 ID 是工厂 ID，`mapOrderRow` 强制覆写 `row.id`，insert 后回写 `detail` 同步 UUID
- **演示用户不写 Supabase**：所有 `syncOrderToSupabase()` / `deleteOrder` 等操作检查 `id.startsWith('DEMO-')` 跳过

## 物流异常状态语义

### 无人签收（FTL 自动跳过）
- **触发**：FTL 卸货点 `arrived` 后 40s 无人点击"开始卸货"
- **车辆状态**：经停点（stop）标记为 `skipped`，生成带 `anomalyNote: '无人接收'` 的交接记录
- **运单状态**：`in_progress`（未完成但非异常，自动跳过不算 exception）
- **订单状态**：自动推进到下一经停点，若全部跳过则最终订单 `completed`
- **UI 表现**：按钮显示 `无人签收 ⚠ · {地址}`，灰显不可操作

### 异常待处理
- **触发**：用户主动在签收确认弹窗中选择"拒绝签收"或"继续签收（记录异常）"
- **车辆/运单状态**：
  - FTL：经停点设为 `exception`，运单 `exception`，订单 `arrived`（阻塞）
  - LTL：运单 `exception`，订单 `arrived`（阻塞，`deriveOrderStatusFromLtlWbs` 映射）
- **UI 表现**：按钮显示 `异常待处理`，灰显不可操作，提示"请联系客服或调度人员处理"

| 场景 | Stop 状态 | Waybill 状态 | Order 状态 | 是否自动恢复 |
|------|-----------|-------------|------------|:--:|
| 无人签收（FTL） | `skipped` | `in_progress` | 下一站状态 | ✅ 自动跳过 |
| 货物异常（FTL） | `exception` | `exception` | `arrived` | ❌ 需人工 |
| 货物异常（LTL） | — | `exception` | `arrived` | ❌ 需人工 |

## 资源
- `CLAUDE.md` — 项目指引与触发规则
- `architecture-decisions.md` — 架构决策记录
- `scripts/dev.sh` — 本地开发启动脚本（端口 5000）
- `sql/schema.sql` — 数据库 Schema（唯一权威源）

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
