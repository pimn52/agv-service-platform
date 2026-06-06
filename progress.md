# 进度日志

> **依赖关系**：被 `CLAUDE.md` 触发规则读取（会话结束写入、新任务先读）。关联 `task_plan.md`（阶段进度）、`findings.md`（决策记录）

## 会话：2026-06-05 ~ 06-06（Vercel 部署 + 移动端适配 + Bug 修复收尾）

### 地址编辑保存失效 ✅
- **根因**：`delivery-order-page.tsx` 两个 `useEffect` 执行顺序竞态——sessionStorage 恢复先于 store 恢复，后者覆盖前者
- **修复**：合并两 Effect 为一个，sessionStorage 数据优先，设 `mountIdRef` 阻断 store 恢复
- **FTL 追加修复**：DeliveryOrderPage 重挂载时 `useState` 初始化新 ID，导致 sessionStorage 的 `currentWaybillId` 匹配失效。改为存全部 ftlWaybills 全量替换（与 LTL 对称）

### 通知不消失 ✅
- **根因**：通知重新生成时只保留 `postponed` 标记，没保留 `dismissed`
- **修复**：`order-dynamics.tsx` 通知生成 effect 同步保留 `dismissedIds`

### 多车 LTL 签收流程修复 ✅
- `deriveOrderStatusFromLtlWbs`：多车时只有全车辆完成才返回 `completed`，未完成车辆取最紧急状态
- `getActionsForOrder` `arrived` 分支：按车辆独立判断投件/取件，用 `handoverRecords` 区分第一/第二次到达
- 多车 Tab 自动切换：当前车辆无待办时自动跳到有操作的车辆（FTL/LTL 双线）
- 状态标签统一：删除自定义 `LTL_STATUS_LABEL`，全用 `STATUS_LABELS`

### 移动端显示适配 ✅
- `layout.tsx`：JS 运行时注入 `viewport-fit=cover`（绕过 Next.js 16 不渲染该属性的问题）
- `globals.css`：phone-shell mobile 加 `padding-top/bottom: env(safe-area-inset-*)`
- `page.tsx`：外层 `<div>` 全部加 `sm:` 前缀，PC 端不受影响
- `app-shell.tsx`：移除冗余 safe-area spacer（phone-shell padding 已处理）
- Tour 遮罩圆角：读取 phone-shell 实际 `borderRadius`，手机端显示为 0（消除与设备物理圆角不匹配的硬编码）

### 下单页交互对齐 ✅
- 确认下单按钮始终可点，点击触发表单校验 → 底部栏红色提示
- FTL 无车型不显价、LTL 无地址不显价（costEst 空值检查）
- 地址/联系人提示色恢复为灰色（红色仅用于底部校验提示）

### Vercel 部署 ✅
- 发现 Vercel 未连接 Git → 部署的是 CLI 手动上传的旧版本
- 连接 GitHub 后 push 即可自动部署，验证 `viewport-fit`、`sm:` 前缀等生效

### 涉及文件
| 操作 | 文件 |
|:--:|------|
| 修改 | `src/app/layout.tsx`、`page.tsx`、`globals.css` |
| 修改 | `src/components/layout/app-shell.tsx` |
| 修改 | `src/components/home/order-dynamics.tsx` |
| 修改 | `src/store/use-order-store.ts`、`src/lib/order-mutator.ts` |
| 修改 | `src/components/order-create/delivery-order-page.tsx`、`address-edit-page.tsx` |
| 修改 | `src/components/tour/tour-overlay.tsx` |
| 修改 | `src/store/use-app-store.ts` |

### Bug 1：LTL 一订多车签收第一辆后结束订单 ✅
- `use-order-store.ts` L244-269：`updateOrderStatus` 的 LTL 分支移除 `completed` 映射（不再批量推进全订单运单）
- L277-287：FTL/LTL 统一改用 `deriveOrderStatus` 派生状态，删除危险 fallback `derived === o.status && status !== o.status → force target`
- 多车场景下第一辆车完成不再导致订单结束

### Bug 2：散件多车按钮显示对齐整车 ✅
- 上一轮已改为按全部运单遍历（不按选中车辆过滤），本轮确认无需额外修改

### Bug 3：独占一车减免 + 拼车返利逻辑重写 ✅
- `rebate.ts` 完全重写：引入 `VEHICLE_COMPARTMENT_COUNT` 车型格口映射（来源 vehicle-specs.md）
- 独占一车：运单数 ≥ 车型格口数 → ¥2/运单 → 下单前抵扣
- 拼车返利：运单数 < 车型格口数 → ¥4/运单 → 仅在支付结果页展示
- FTL 直接返回 null
- `delivery-order-page.tsx`：LTL 费用预估引入独占一车减免计算
- `cost-confirm-page.tsx`：移除拼车返利预期文案，保留独占提示
- `payment-result-page.tsx`：移除 full_car_discount 展示，仅保留 carpool_rebate

### Bug 4：FTL 首页状态标签与追踪页对齐 ✅
- `order-dynamics.tsx` L1345：first stop pending + dispatched → "已调度"（蓝色），替代"待发车"

### Bug 5：FTL 无人签收跳站后 UI 处理 ✅
- 按钮区：跳站 stop 显示灰置"无人签收 ⚠ · 地址"按钮
- Tab 通知状态：`skipped` 同 `exception` 触发黄色 ⚠ 图标
- 通知消息：跳站触发生成持久通知

## 会话：2026-06-03（Bug 修复回合二 — 折扣/回滚/跳站客服）

### Bug 1 回滚修复 ✅
- `use-order-store.ts` L285-291：恢复 LTL fallback `if (derived === o.status && status !== o.status) { return {...next, status}; }`
- 保留删除 `case 'completed'`（防止多车场景批量推进）
- 该 fallback 对 LTL 非物流状态流转（如 picking_up → picked_up）是必需的

### Bug 3a 折扣金额交换 ✅
- `rebate.ts` L13-14：`FULL_CAR_DISCOUNT_PER_WAYBILL` 2→4，`REBATE_PER_WAYBILL` 4→2
- 独占一车减免 ¥4/运单（原来 2），拼车返利 ¥2/运单（原来 4）
- 同步更新所有注释中的金额（JSDoc、行内注释、接口注释）

### Bug 3b 费用确认页拼车信息 ✅
- `cost-confirm-page.tsx` L305-318：当前仅展示 `full_car_discount`，无 `carpool_rebate` 显示 — 无需修改

### Bug 3c 独占一车减免调试 ✅
- `delivery-order-page.tsx` L369-375：添加 `console.log` 输出 waybill pickupAddress + computeRebate 结果
- 端到端测试确认：3 运单同投件地址 → `{amount:12, type:"full_car_discount"}` → UI 显示"独占一车减免 -¥4.00 x 3单"

### Bug 3d 冷链特殊要求展开持久化 ✅
- `delivery-order-page.tsx` L187-197：新增 `ltlAutoExpandedRef` + useEffect，LTL 运单 specialRequirements 非空时自动展开特殊要求区域

### Bug 5 扩展：跳站异常接入在线客服 ✅
- `customer-service-dialog.tsx` `useExceptionMessage`：
  - filter 中新增 FTL `skipped` stop 检测
  - 优先检测 `skipped`，其次 `exception`
  - skipped 时异常类型文案："收货方不在现场（系统自动跳过）"
- 客服提示文案：跳站场景显示"请联系客服或调度人员处理"

### 验证结果
- `pnpm ts-check`：零错误
- `pnpm build`：成功
- 术语检查：无混用

---

## 会话：2026-06-02（数据流收口）

### 数据流三层收口 ✅
- **工厂层** `src/lib/order-factory.ts`：buildOrder / buildDemoOrder 替代三处手写 Order 构造
  - `data/orders.ts`：demo 路径和 Supabase 路径均改为调用工厂，删除 ~60 行手写字段映射
- **变更层** `src/lib/order-mutator.ts`：applyMutation(order, action) 统一状态变更入口
  - `use-order-store.ts`：advanceStopStatus ~100行 → 1行 applyMutation 调用，updateWaybillStatus ~30行 → 1行
  - updateOrderStatus 物流场景改为 deriveOrderStatus 派生，不再直接设 status
- **读取层** `src/lib/order-reader.ts`：getOrderStops / getOrderAddresses / getOrderSummary / hasActiveAction
  - `order-dynamics-helpers.ts`：68行 → 11行，委托给 reader
- **表单层** DeliveryForm 三数组收口为判别联合类型
  - 删除废弃 `stops` 字段；`FTLDeliveryForm` 只有 `ftlWaybills`，`LTLDeliveryForm` 只有 `ltlWaybills`
  - `setDeliveryForm` 改为完整赋值（不再 Partial spread），杜绝跨模式字段污染
  - 修复 LTL CSV 导入写入死数据 `stops` 的 Bug → 改为写 `ltlWaybills`
- **验证**：pnpm ts-check 零错误通过

### 文件变更清单
| 操作 | 文件 |
|:--:|------|
| 新增 | `src/lib/order-factory.ts`、`src/lib/order-mutator.ts`、`src/lib/order-reader.ts` |
| 修改 | `src/data/orders.ts`、`src/store/use-order-store.ts` |
| 修改 | `src/components/home/order-dynamics-helpers.ts`、`src/components/order-create/delivery-order-page.tsx` |
| 更新 | `findings.md`、`task_plan.md`、`progress.md` |

### 待继续
- 贩卖/安防板块审视

### 治理措施沉淀（2026-06-03）
- CLAUDE.md 精简为项目级规则，详细规范移至 findings.md「子 Agent 派发规范」
- `agv-consistency-check.md` 新增第 4 节「端到端测试流」
- `verification/state-machine-tests.md` 更新 LTL 多运单 + 车型锁 + 拼车返利验证用例
- `data-models.md` 新增车型约束表 + 拼车返利模型
- DEMO-003/004 Mock 数据改为通过 `buildLTLCompartments` 生成

### FTL 车型锁 + 返利重构（2026-06-03）
- FTL 下单页：车型选择按特殊要求过滤（冷链→Z5/X6，超大件→X6）；不兼容车型自动清除
- `rebate.ts`：返利分两种——`full_car_discount`（独占一车 ¥2/单）和 `carpool_rebate`（系统拼车 ¥4/单）
- 费用确认页和支付结果页按返利类型区分显示

---

## 会话：2026-06-01 ~ 06-02（部署冲刺）

### P0 Bug 修复 ✅
- LTL 返利不触发：`payment-result-page.tsx` 从 `deliveryForm` 改为 `getOrderById(orderId)` 读取真实订单数据

### 追踪页修复 ✅
- L1 标题恢复 `业务类型 · 地址→地址` 格式，跟随 L2 选中运单数据同步
- L1 右侧"切换"按钮加 ChevronDown 图标，与左侧"操作"按钮对称
- L2 Tab 标签：FTL 格式改为 `运单N · 车牌号`（对标首页），压缩按钮高度 py-1.5→py-1
- `stripDistrict` 扩展支持 `XX市XX区` 格式
- 进度栏状态标题字号 13px→12px（对齐 L2 Tab 层级）

### 车型方案对齐 memory/vehicle-specs.md ✅
- 物流：lm_p3(P3模块)→lm_e6(E6散件), X3紧凑→X3城配(520kg), X6标准→X6重载(1130kg)
- 贩卖：vm_large(大型贩卖)→vm_smart(智能零售专车)
- 安防：sm_adv(高级巡检)→移动哨兵车
- 套餐：每车型 2 个套餐→1 个绑定套餐，UI 显示"绑定套餐（车型决定）"，去掉包选择交互
- 下单页图片对齐首页 140px，车辆图片替换为透明底 PNG
- 涉及文件：constants/services.ts, cruise-order-page.tsx, cruise-vehicle-configurator.tsx, vehicle-data-helpers.ts, delivery-order-page.tsx, mock/data.ts

### 费用展示对齐 ✅
- 交付页 FTL 费用显示：`¥70.00×2` → `¥35.00 × 2车`（单台单价 × N车）
- LTL 费用计算标准化：`costEst` 字段统一为总计值
- LTL 订单摘要展示全部运单路线（对标 FTL）
- `setCostBreakdown` 统一路径

### 认证与演示入口重构 ✅
- LandingPage：去掉倒计时，主动选择"演示体验（推荐）"或"登录 / 注册"
- AuthPage：🏙️→无人车 SVG 图标，支持邮箱/手机号双输入
- Profile：演示↔真实账号一键切换（`exitDemoMode` 恢复 Supabase 会话）
- 发票隔离：真实用户不显示演示发票
- 地址簿：新用户提示"保留演示地址？"+ 删除按钮 + localStorage 持久化选择

### 部署基础设施 ✅
- Supabase：数据库可用，`detail` JSONB 列已加，email 确认已关闭
- SQL 合并为单一 `sql/schema.sql`（幂等可重复执行）
- 注册→登录→首页全链路验证通过（test2024@example.com / test123456）

### 可信度四件套 ✅
- ① 模拟标记：首页 arrived→"演示模式自动模拟车辆行驶。生产环境中由车辆 GPS 实时触发"；追踪页地图→"位置数据来自车辆 IoT 上报（演示模式为模拟轨迹）"
- ② 平台架构页：「我的」→「平台架构」：客户端APP→调度引擎→无人车队→经停点联系人→交接凭证，含车辆遥测箭头 + 模拟数据层说明
- ③ 演示说明书：Tour 第 5/5 步，用户原文描述
- ④ 首页品牌栏："© 洪攀 · 演示环境 · 状态机/数据模型/报价引擎与生产一致 · IoT 接口已预留"

### 待完成
- [ ] Git 初始化 + GitHub 推送 + Vercel 部署
- [ ] 贩卖/安防板块深度审视（后续迭代）

### 运营数据看板 ✅
- 在"我的"页面余额区和菜单之间插入运营看板区块
- 三条业务线各自四指标卡片（物流：本月运费+准时率+异常率+在途运单；贩卖：销售额+单车日均+库存周转+在售车辆；安防：覆盖率+设备在线+告警+在巡车辆）
- "在途"类指标从 store 实时取，其余为静态演示值
- Tab 智能显示：新用户全展示（含引导）、单一业务用户折叠未使用 Tab、多业务用户展开有订单的 Tab

### 页面架构决策 — 纳入 findings.md ✅
- 首页：在途订单动态面板（Tab×业务线）+ 两张下单卡片常驻
- 服务跟踪：下拉列表切换在途订单，按业务线渲染专属 Dashboard
- 订单列表：全部/进行中/已完成，列表项按服务类型区分
- 我的：运营看板 + 功能菜单
- 所有"在途"类指标共享同一 store 数据源

### 文档体系刷新 ✅
- `task_plan.md` 全面重写：反映当前三阶段（物流封板/贩卖审视/安防审视）
- `progress.md` 补录 05-28~05-29 所有进度
- `findings.md` 新增页面架构章节 + 架构决策表新增运营看板/Tab智能显示
- `memory/terminology.md` 变更记录更新

---

## 会话：2026-05-28

### 经停点状态机全面审查 ✅
- `advanceStopStatus` default 分支修复：`anyCompleted ? 'in_transit' : 'dispatched'`（站间行驶状态下不复显 dispatched）
- `StopStatus` 扩展为 6 状态：`pending | arrived | in_progress | completed | skipped | exception`
- `RouteStop` 新增 `handoverRecords?: HandoverRecord[]` 字段

### 签收交接凭证 ✅
- `ConfirmDialog` 重构为三态：正常签收 / 轻微异常继续签收（记录 anomalyNote） / 严重异常拒绝签收（stop→exception 阻断）
- `advanceStopStatus` 自动生成 HandoverRecord（type 由 stop type 推导）

### 收货人不在自动跳过 ✅
- `useDemoTimers` 新增 15s 警告 + 20s 自动跳过逻辑
- 防过期定时器覆盖（completed/skipped 状态保护）
- 跳过后生成"无人接收"异常记录 + 3s 推进下一站
- `getActiveStopIndex` 同时跳过 completed 和 skipped

### stop-utils.ts 工具抽象层 ✅
- 统一 `stopStatus()`、`getActiveStopIndex()`、`getCurrentDeliveryNumber()`、`areAllStopsCompleted()` 等函数
- store 和组件不再各自实现判断逻辑

### 架构决策同步 ✅
- `findings.md` 新增 8 条架构决策（经停点解耦、skipped/exception 扩展、交接记录、三态弹窗、收货人跳过、车辆故障不做客户端、stop-utils）
- 物流配送板块审查通过，进入封板阶段

---

## 会话：2026-05-27

### LTL 多运单状态机 Bug 修复 ✅
- 取件按钮消失：改从 store 读 waybill.status 代替 React ref
- 竞态条件订单卡死：定时器回调检查未完成运单，全完成则跳过
- LogisticsDashboard LTL 进度归零：新增 LTL 分支基于运单状态计算
- LTL 时间线绿勾覆盖蓝圈：completed 条件从 `completedWbs>0` 改为 `allDone`
- FTL 多站卸货距离/时间不更新：中间站 return 前补齐

### 导航跳转修复 ✅
- 订单页→追踪页失效：补齐 setActiveOrderId
- 支付成功页→追踪页缺失：补齐
- 追踪页返回首页 Tab 被覆盖：保留原始 tab 上下文
- 巡游/安防返回首页被拉到物流：加 sessionStorage 防重入

### 架构优化 ✅
- atPickup 双源删除，全部改用 store 的 order.atPickup
- 定时器提取到 useDemoTimers hook
- getLogisticsAddresses/getOrderSummary 提取到 order-dynamics-helpers.ts
- LocalNotification 类型独立文件
- updateWaybillStatus/updateOrderField 新增 store 方法

### Phase 1: 类型 & Mock 数据地基 ✅
- 新增 Compartment、CargoItem、HandoverRecord、WaybillStatus、Trip 类型
- Waybill 从 6 字段扩展为 17 字段完整运营版
- Order 加 compartments 字段
- Mock DEMO-001→整车 in_transit，DEMO-003→散件 1订3单
- MOCK_TRACKING 同步更新

### 显示桥接 + 多运单状态机 + 返利 ✅
- 首页：整车 RouteStop 路线、散件"N张运单·1车"
- 订单详情：整车经停点卡片、散件运单卡片
- 追踪页：散件运单状态栏+动态时间线
- 多运单逐单投件/取件按钮（格口标签+剩余单数）
- 返利：computeRebate()→支付成功→余额更新→通知推送

---

## 会话：2026-05-25 ~ 05-26

### 物流配送双线重构 ✅
- 整车配送 + 散件直送替换整车/零担二分
- 术语体系：装货/卸货（整车）、投件/取件（散件）
- 代码层保留 `'ltl'`、`'picking_up'`、`'picked_up'` 行业标准标识
- 产品层使用"散件直送""投件中""已取件"差异化中文标签
- TMS/WMS 集成策略确定：先独立、留接口、不分叉
- 整车运单模型：一运单一车一路线
- 同订单同方向约束：全配送或全集货

### 运单/格口/趟次三层模型 ✅
- 订单管钱 → 运单管货 → 趟次管车
- 格口独立锁控（GPS绑定+运单范围+时间窗）
- 散件不做 N→1/1→N
- RouteStop 仅用于整车配送
- 固定报价 + 拼车返利定价
- 动态加单、滚动发车、月台预约
- 多点位逐站触发通知

---

## 早期会话（2026-05-20 ~ 05-24）

### 05-24：RouteStop 统一模型 ✅
- 经停点列表替代 sender/receiver 二分
- 1→N 和 N→1 支持，不做 N→N

### 05-20~22：基础架构 ✅
- 策略对齐 + 演示数据种子（8条订单）
- 术语统一 + 状态标签统一源
- 下单页批量模式 + 三栏时间 + 多车型

---

## 错误日志

| 时间戳 | 错误 | 解决方案 |
|--------|------|---------|
| 05-28 | advanceStopStatus default→dispatched 闪烁 | 改为 anyCompleted ? 'in_transit' : 'dispatched' |
| 05-27 | LTL 多运单 ref 重挂载丢失进度 | 改从 store waybill.status 读 |
| 05-27 | 竞态条件 complete→arrived 覆盖 | setTimeout 回调校验 |
| 05-27 | LogisticsDashboard LTL 进度归零 | 新增 LTL 分支 |
| 05-27 | 取件按钮消失 | 弃用 ref，改用 store |
| 05-20 | Supabase SSR 客户端服务端为 null | 改为方法内 createClient() |
| 05-20 | profiles 触发器未生效 | 合并到 schema.sql |
| 05-20 | 构建缓存引用已删除 API 路由 | rm -rf .next |
| 05-21 | security notifications switch 缺失 | 补全 switch 语句 |
