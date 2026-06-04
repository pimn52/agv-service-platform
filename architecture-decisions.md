# 架构决策记录

> **依赖关系**：被 `CLAUDE.md` 触发规则读取（架构设计/数据模型 → 先读本文件）。本文件为手动维护的架构决策记录，不受 planning-with-files-zh 管理。动态研究发现见 `findings.md`（由 skill 自动维护）。
> - 被我关联：`business-flows.md`（业务流）、`page-architecture.md`（页面架构）、`verification/state-machine-tests.md`（测试用例）
> - 引用：`memory/terminology.md`（术语唯一源）、`memory/vehicle-specs.md`（车型数据）
> - 改我时注意：术语变更需同步更新 `business-flows.md`

## 项目定位
- 城市无人车综合服务 B2B 平台客户端（演示版）
- 洪攀个人演示作品
- 三大业务线：物流配送（整车/散件）、巡游贩卖、安防巡检

## 术语规范（摘要）

> 完整规范见 `memory/terminology.md`。涉及任何 UI 标签、按钮、状态文字前必须先读该文件。

| 服务线 | 操作术语 | 旧称（已弃用） |
|--------|----------|---------------|
| 整车配送 | 装货 / 卸货 | — |
| 散件直送 | 投件 / 取件 | 零担、交件 |
- 两条线术语绝不混用
- 代码标识保留行业标准（`'ltl'`、`'picking_up'`、`'picked_up'`）
- 业务逻辑细节见 `business-flows.md`

## 架构决策

| 决策 | 理由 | 日期 |
|------|------|------|
| 演示模式跳过 Supabase 认证 | 零摩擦进入，断网也能跑 | 05-20 |
| 统一数据层 `src/data/` | 组件不再直接 import mock | 05-21 |
| 状态标签统一到 status-labels.ts | 消除重复定义 | 05-20 |
| 通知系统由组件内部自管理 | store 通知无使用者 | 05-20 |
| 自建 Tour 和 Toast 组件 | 不引入第三方依赖 | 05-20 |
| 批量模式融入内联 | 去掉开关，收发货/车辆区域底部"+ 添加" | 05-22 |
| 地址簿 Portal + 自动方向 | 彻底解决 dropdown 被卡片裁剪 | 05-22 |
| 时间段三栏式选择器 | 日期/4h区间/半小时，24h全覆盖 | 05-22 |
| 车型支持多选 | 同车型可叠加数量，不同车型可混选 | 05-22 |
| 路线规划仅贩卖/巡检 | 物流配送路线是后台调度，不给客户 | 05-22 |
| 配送地点用 RouteStop 统一模型 | 以经停点列表替代二分 sender/receiver，原生支持 1→N 和 N→1 | 05-24 |
| 不做 N→N 配送模式 | AGV 载货空间有限，混装需要复杂调度，超出能力边界 | 05-24 |
| 不提供装卸方式配置 | 笼车交换/月台对接属企业定制方案，商业级产品默认人工装卸 | 05-24 |
| 装货点在前、卸货点在后 | AGV 不混装：先装完所有货，再依次卸货，路线顺序天然约束 | 05-24 |
| 装货/卸货互斥锁定（仅整车） | 整车订单最多 N→1 或 1→N，添加第二个装货点锁定集货模式 | 05-24 |
| 物流配送双线重构：整车配送 + 散件直送 | 无人车无中转场、无分拨能力 | 05-25 |
| 散件直送不设 N→1/1→N | 运单天然 1→1，路线编排由系统后台完成 | 05-25 |
| 引入运单 + 格口 + 趟次三层模型 | 订单管钱、运单管货、趟次管车；格口独立锁控 | 05-25 |
| 1 订 N 单商业容器模型 | B2B 行业惯例：一次决策一次付款，运单作为操作单元 | 05-26 |
| 固定报价 + 拼车返利定价 | B2B 客户需要价格确定性用于采购审批 | 05-26 |
| 动态加单：车辆中途可接新运单 | 有空格口 + 路线可达 + 不违约时，算法实时优化 | 05-26 |
| 滚动发车 + 月台预约 | 不等齐发车，分时靠港避免仓库拥堵 | 05-26 |
| 多点位通知：时间窗 + 逐站触发 | 下单时承诺时间段，离开上一站时通知下一站 | 05-26 |
| RouteStop 模型仅用于整车配送 | 散件的经停点概念下沉到运单层 | 05-26 |
| atPickup 字段持久化到 store | 区分 arrived 是装货/投件点还是卸货/取件点；弃用 React ref | 05-27 |
| currentStopIndex 多站卸货推进 | 卸完一站自动推进到下一站（3s 站间延迟） | 05-27 |
| demo 定时器仅自动 dispatched→arrived | 其余状态转换必须由用户点击触发 | 05-27 |
| 通知/按钮逻辑改用 store 的 atPickup | 不再依赖组件 ref | 05-27 |
| 代码层与产品层两层分离 | 代码标识用行业标准，产品层用差异化中文标签 | 05-27 |
| 回退 `dropping_off` → `picking_up` | picking_up 是物流行业标准操作码 | 05-27 |
| TMS/WMS 集成策略：先独立、留接口、不分叉 | 第一阶段闭环自运行；第二阶段定义标准 API 边界层 | 05-27 |
| 产品定位：传统 TMS 的 AV 执行插件 | 护城河在格口级货物管理 + 无人车动态调度 + 客户自助投取件 | 05-27 |
| 整车运单模型：一运单 = 一车 + 一路线 | 整车和散件共用运单作为操作单元 | 05-27 |
| 同订单同方向约束（整车） | 同一整车订单内所有运单必须同方向 | 05-27 |
| 产品商业边界：发货工具不是运营后台 | 客户端只做下单/追踪/操作/支付 | 05-27 |
| 经停点级状态机解耦 | 订单状态反映整体生命周期，stopStatus 独立描述作业进度 | 05-28 |
| StopStatus 扩展 skipped / exception | skipped（无人接收自动跳过）和 exception（货物异常） | 05-28 |
| advanceStopStatus 自动生成交接记录 | 经停点推进时自动创建 HandoverRecord | 05-28 |
| 签收弹窗三态模型 | 正常签收/轻微异常继续签收/严重异常拒绝签收 | 05-28 |
| 收货人不在自动跳过 | 15s 无人响应 → 警告 → 20s 自动跳过 | 05-28 |
| 车辆故障不做客户端 | 故障检测是后台/运营端的事；客户端只收通知 | 05-28 |
| stop-utils.ts 工具抽象层 | 统一 stopStatus()、getActiveStopIndex() 等逻辑 | 05-28 |
| 运营数据看板：按业务线 Tab 分面 | 物流/贩卖/安防各有四指标，放在"我的"页面 | 05-29 |
| Tab 智能显示逻辑 | 新用户全展、单一用户折叠、多业务用户有订单才展开 | 05-29 |
| 车型方案确定：5+3+3 全真实车型 | 物流5款、贩卖3款、安防3款，参数取自厂商公开数据 | 05-28 |
| 车型决定套餐（贩卖/安防） | 巡游贩卖和安防巡检改为车型绑定套餐 | 05-28 |
| 物流特殊要求限车型 | 冷链→Z5/X6、超大件→X6、易碎品→全部可选 | 05-28 |
| 散件返利逻辑修正 | 两层：满舱折扣（下单时）+ 拼车返利（支付后） | 05-28 |
| 多方操作权限边界 | 客户端为下单人指挥中心；经停点联系人 token 临时授权 | 05-28 |
| E6 不提制造商标价 | 整车厂商业策略与平台产品无关 | 05-28 |
| 车型规格独立文档 | 车型参数存于 `memory/vehicle-specs.md` | 05-28 |
| 数据流收口三层架构 | `order-factory.ts`（构建）、`order-mutator.ts`（变更含 `deriveOrderStatus`）、`order-reader.ts`（读取）三文件唯一入口，禁止在组件内逐字段构造 Order | 06-02 |
| DeliveryForm 判别联合类型 | `FTLDeliveryForm（deliveryMode: 'full_load'）` vs `LTLDeliveryForm（deliveryMode: 'ltl'）`，TypeScript 编译期阻止字段混用；`stops` 字段从 DeliveryForm 删除 | 06-02 |
| deriveOrderStatus 为 LTL 唯一派生源 | LTL 订单状态必须从 `waybill.status` 集合 bottom-up 派生，UI 层禁止从运单原始数据自行推导状态标签；运单是 leader，订单是 follower | 06-03 |
| 演示模式即产品策略 | 演示模式不是临时补丁，是产品当前完整形态；用户注册→演示模式→8条预置订单+自下单入演示循环；架构已预留 IoT 接口，真车对接不重构 | 06-03 |
| 演示可信度增强四件套 | ①模拟节点标注"生产环境由 XX 触发"小字；②平台架构页（数据流图）；③Tour 结构化演示说明；④用户自下单自动进入 demo 循环 | 06-03 |
| 物流配送封板上线 | 一订多车烂摊子→整改→审计→封板；物流板块作为首发业务线独立上线，贩卖/安防后续跟进 | 06-04 |
| 双模式架构：演示模式 + 真实注册用户 | 演示模式零摩擦进入（跳过 Supabase 认证，用 demo_user 身份加载预置订单，创建订单仅存内存不持久化）；真实用户完整走 Supabase 认证+持久化。两种模式共享同一套订单工厂→变更→读取三层代码路径，仅持久化层分叉 | 06-03 |

## 关键文件

| 文件 | 职责 |
|------|------|
| `src/constants/status-labels.ts` | 全项目唯一状态标签源 |
| `src/constants/services.ts` | CONTACT、SECURITY_RENTAL_PLANS、CARGO_TYPES |
| `src/components/shared/address-book-button.tsx` | Portal 渲染地址簿，自动方向 |
| `src/components/shared/time-slot-picker.tsx` | 三栏时间段选择器 |
| `src/components/home/order-dynamics.tsx` | 首页按钮+通知核心逻辑 |
| `src/data/addresses.ts` | 地址簿预设数据 |

## 术语变更影响面

核心术语变更时，以下文件必须同步检查：

| 术语层 | 文件 | 检查重点 |
|--------|------|---------|
| 类型定义 | `src/types/order.ts` | TypeScript 字面量类型、注释 |
| 状态标签 | `src/constants/status-labels.ts` | label 文案 |
| 服务配置 | `src/constants/services.ts` | description 文案 |
| Store | `src/store/use-order-store.ts`、`src/store/use-app-store.ts` | 类型引用、默认值 |
| 数据层 | `src/data/orders.ts` | 类型断言 |
| Mock 数据 | `src/mock/data.ts` | 状态值、label、description、注释 |
| 数据库 | `sql/schema.sql` | CHECK 约束、默认值 |
| Supabase | `src/lib/supabase/database.types.ts` | 联合类型字面量 |
| 下单组件 | `src/components/order-create/*.tsx` | 模式字面量、UI 标签、提示文案 |
| 业务组件 | `src/components/order/*.tsx`、`src/components/tracking/*.tsx`、`src/components/home/*.tsx` | 状态判断、label 文案、注释 |
| 项目文档 | `CLAUDE.md`、`architecture-decisions.md`、`task_plan.md` | 硬约束表、业务流、关键决策 |
| 术语规范 | `memory/terminology.md` | 全文 |

**刷新流程**：改术语/标识 → grep 旧值全量扫 → 逐一更新 → grep 确认零残留 → ts-check

## 用户模式策略

两种用户模式共享同一套订单工厂→变更→读取三层代码路径，仅持久化层 `data/orders.ts` 通过 `isDemoUser()` 分叉。下游组件无感知：无论是 demo 内存订单还是 Supabase 持久化订单，组件从 store 读取的数据结构完全一致。

| 维度 | 演示模式 | 真实注册用户 |
|------|----------|-------------|
| 入口 | LandingPage 选择"演示体验" | LandingPage 选择"登录/注册"→跳转 AuthPage |
| 用户身份 | `DEMO_USER`（id: `demo_user`），不经过 Supabase 认证 | Supabase Auth 用户（UUID） |
| 初始数据 | `MOCK_ORDERS` 8 条预置演示订单（`isDemoUser` 返回 true 时加载） | 查询 Supabase `orders` 表，新用户无历史数据 |
| 订单创建 | `data/orders.ts` `createOrder` → `isDemoUser` 分支 → 生成 `DEMO-时间戳` ID，仅存 Zustand store 内存 | `createOrder` → Supabase insert，数据持久化 |
| 共享层 | 两者共用 `order-factory.ts`（构建）、`order-mutator.ts`（变更）、`order-reader.ts`（读取）、`rebate.ts`（返利） — 仅持久化层 `data/orders.ts` 的 `isDemoUser` 检查分叉 | 同左 |
| 退出机制 | Profile 页"退出演示模式"按钮 → `exitDemoMode()` → 恢复 Supabase 会话（如果之前登录过） | Profile 页"退出登录" |
| 数据隔离 | 演示发票、演示地址簿仅 demo 用户可见；真实用户不显示演示数据 | 真实用户仅见自己的数据 |

### 关键实现文件

| 文件 | 职责 |
|------|------|
| `src/store/use-auth-store.ts` | `setDemoMode()` / `exitDemoMode()` / 演示用户初始化 |
| `src/data/orders.ts` | `isDemoUser()` 分叉判断，持久化 vs 内存写入 |
| `src/components/landing/landing-page.tsx` | 入口选择（演示体验 vs 登录/注册） |
| `src/components/auth/auth-page.tsx` | 真实登录/注册 |
| `src/components/profile/profile-page.tsx` | 演示↔真实切换 |

## 关联文档

| 文档 | 内容 |
|------|------|
| `business-flows.md` | 四条业务流状态机、按钮分级、通知规则、弹窗规则 |
| `page-architecture.md` | 四页面架构、运营看板布局、下单页操作流程、跨页面一致性 |
| `verification/state-machine-tests.md` | 状态机测试用例、演示数据验证、自动化截图脚本 |
| `data-models.md` | RouteStop、运单/格口/趟次数据模型与状态机 |
| `findings.md` | 动态研究发现与子 Agent 规范（planning-with-files-zh 自动维护） |
| `memory/vehicle-specs.md` | 车型规格与业务约束联动 |
| `memory/supabase-config.md` | Supabase 配置、数据库状态与测试账号 |
| `memory/deploy-checklist.md` | 部署上线待办清单 |
