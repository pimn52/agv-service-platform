# 任务计划

> **依赖关系**：被 `CLAUDE.md` 触发规则读取、`progress.md` 每会话同步。关联 `architecture-decisions.md`（决策）、`business-flows.md`（业务流）

> 城市无人车综合服务 B2B 平台客户端（演示版）
> 三条业务线：物流配送 / 巡游贩卖 / 安防巡检

---

## 整体进度

| # | 阶段 | 状态 |
|---|------|:--:|
| 1 | 基础架构：策略对齐 + 演示数据 + 导览 | ✅ |
| 2 | 物流配送：术语重构 + 业务模型深化 | ✅ |
| 3 | 物流配送：下单页重构（整车/散件双线） | ✅ |
| 4 | 物流配送：运营模型落地（运单/格口/趟次） | ✅ |
| 5 | 物流配送：经停点状态机解耦 + 异常处理 | ✅ |
| 6 | 物流配送：签收交接凭证 + 运营看板 | ✅ |
| 7 | 物流配送：返利 Bug + 车型方案 + 费用展示对齐 + 封板 | ✅ |
| 8 | 认证体系：登录/注册 + Supabase 对接 + 演示切换 | ✅ |
| 9 | 可信度体系：模拟标记 + 平台架构页 + 演示说明书 + 品牌栏 | ✅ |
| 10 | 数据流收口：Order 构建/变更/读取三层唯一入口 | ✅ |
| 11 | 部署：Supabase 迁移 + Git+GitHub+Vercel 自动部署 | ✅ |
| 12 | 巡游贩卖：术语审视 + 业务模型深化 | 🔜 |
| 13 | 安防巡检：术语审视 + 业务模型深化 | 🔜 |

---

## 当前阶段：数据流收口完成，物流配送 FTL/LTL 对齐待续

### 数据流收口已完成

| 层 | 文件 | 职责 |
|------|------|------|
| 构建层 | `src/lib/order-factory.ts` | buildOrder / buildDemoOrder — 创建 Order 的唯一入口 |
| 变更层 | `src/lib/order-mutator.ts` | applyMutation(order, action) — 状态变更唯一入口，status 自动派生 |
| 读取层 | `src/lib/order-reader.ts` | getOrderStops / getOrderAddresses / getOrderSummary 等 — 权威读取函数 |

**旧代码已迁移**：data/orders.ts（两套构造→工厂）、use-order-store.ts（三个方法→mutator）、order-dynamics-helpers.ts（68行→11行，委托给 reader）

### 物流配送已完成

| 能力 | 状态 | 关键文件 |
|------|:--:|------|
| 整车配送下单（运单列表+经停点+车型） | ✅ | `delivery-order-page.tsx` |
| 散件直送下单（运单列表+自动拼车） | ✅ | `delivery-order-page.tsx` |
| 经停点级状态机（stopStatus 解耦） | ✅ | `use-order-store.ts` L272-320 |
| 多站卸货逐站推进 + 收货人不在自动跳过 | ✅ | `order-dynamics.tsx`, `use-demo-timers.ts` |
| 签收三态确认（正常/轻微异常/严重异常） | ✅ | `confirm-dialog.tsx` |
| 交接记录自动生成（HandoverRecord） | ✅ | `use-order-store.ts` advanceStopStatus |
| 运单层状态机（散件） | ✅ | `use-order-store.ts` updateWaybillStatus |
| 运营看板（业务线×Tab×四指标） | ✅ | `profile-page.tsx`（新增区块） |
| 页面架构统一（首页/追踪/订单/我的） | ✅ | `findings.md` 页面架构章节 |
| 术语体系（整车装/卸、散件投/取，代码层行业标准） | ✅ | `memory/terminology.md` |
| 拼车返利 | ⚠️ | `payment-result-page.tsx` L33-59 返利不触发（reset 时序 Bug） |

### 物流配送待修

| 事项 | 优先级 | 说明 |
|------|:--:|------|
| LTL 返利不触发 | ✅ | 已修：`payment-result-page.tsx` 改从 `getOrderById()` 读真实订单数据，不再依赖 `deliveryForm` |

---

## 贩卖板块待审视

| 维度 | 当前状态 | 需要做的 |
|------|----------|----------|
| 术语 | 未审查 | "巡游贩卖/安防巡检"产品名称是否精准？操作术语（开始行程/暂停贩卖/交还车辆）是否专业？ |
| 业务模型 | 停留在表单层 | 套餐的"按天定价"与 constants 的"一次性定价"数据双重且不一致 |
| 运营深度 | 浅 | 没有类似物流的"格口/运单/趟次"三层模型——贩卖的等价物是什么？货架管理？补货触发？收入结算？ |
| 状态机 | 基本可用 | 贩卖中⇄暂停→结束，正确但不够细——是否缺少"补货中""设备故障""点位切换"等状态？ |
| 演示说服力 | 一般 | 预期销售数据、ROI 计算是静态的 Mock，行业内人士会质疑数据来源 |

---

## 安防板块待审视

| 维度 | 当前状态 | 需要做的 |
|------|----------|----------|
| 术语 | 未审查 | "巡检/设备测试/物资操作"是否精准？ |
| 业务模型 | 停留在表单层 | 租赁方案（1/3/6 个月）直接套用传统设备租赁，安防巡检车的核心付费应是按覆盖面积+频次+视频存储 |
| 运营深度 | 浅 | 没有告警联动、设备协议对接、巡检报告等核心能力的概念说明 |
| 状态机 | 基本可用 | deviceTest 按钮无操作处理函数（死按钮）；物资操作只是布尔值切换 |
| 演示说服力 | 弱 | 实时视频是 CSS 模拟的灰色盒子，行业内人士一眼看出是假的 |

---

## 技术债务

| 事项 | 说明 |
|------|------|
| Supabase 与前端类型脱节 | `order_logistics` 表缺少 stops/waybills/compartments/handoverRecords 等列；目前仅 demo 模式可用 |
| 追踪页地图为占位符 | 没有接入真实地图 SDK（Amap/Mapbox） |
| 路由规划页地图为占位符 | 同上 |
| 巡游/安防定价数据双重 | `cruise-order-page.tsx` 和 `constants/services.ts` 各有一套定价 |
| deviceTest 按钮无操作 | 安防巡检中的设备测试按钮没有 onClick |
| route-planning "保存草稿"按钮无效 | 没有 onClick 处理函数 |
| CostBreakdown 的 fen/yuan 单位混用 | Mock 数据用分（`1800`=18元），创建流程用元（`35`=35元） |

---

## 关键决策参考

详见 `findings.md`（业务逻辑单一真相源）和 `memory/terminology.md`（术语规范）。
