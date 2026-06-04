# 状态机测试用例

> **本文件为 `business-flows.md` 的派生文档。** 所有状态名称、按钮文案、通知内容以 `business-flows.md` 为唯一源。如两者冲突，先更新 `business-flows.md`，再同步本文件。被 `CLAUDE.md` 三步验证第③步引用。

每次修改按钮、通知、状态逻辑后，对照检查。

## 整车配送 (FTL)

| 状态 | 预期按钮 | 预期通知 | 卡片状态标签 |
|------|---------|---------|------------|
| dispatched | **无按钮** | general: "{plate} 已调度，正前往{src}" | 运输中 |
| 车辆到达(定时器触发) | **开始装货** 🔵💫 | special: "{plate} 已到达{src}，请开始装货" | 运输中 |
| loading | **装货完成** 🔵💫 | special: "{plate} 已到达{src}，请装货" | 装货中 |
| in_transit | 无按钮 | general: "{plate} 已发车" | 运输中 |
| arrived | **开始卸货** 🔵💫 | special: "{plate} 已到达{dst}，请卸货" | 已到达 |
| unloading | **卸货完成** 🔵💫 | general: "{plate} 卸货中" | 卸货中 |
| completed | 无按钮 | general: "{plate} 订单完成" | 已完成 |
| cancelled | 无按钮 | - | 已取消 |

关键检查点：
- [ ] dispatched 状态下**不能出现任何操作按钮**
- [ ] 车辆到达后按钮自动从无变为「开始装货」🔵💫
- [ ] loading→in_transit 有确认弹窗「确认装货完成并发车？」
- [ ] arrived→unloading 有确认弹窗「确认开始卸货？」
- [ ] unloading→completed 有确认弹窗「确认签收？」
- [ ] 绝不出现"交件"(已弃用旧术语)

## 散件直送 (LTL) — 多运单并行操作

LTL 多运单拼一车时，每单独立操作（参考快递柜每格口一键）：

| 状态 | 预期按钮 | 预期通知 | 卡片状态标签 |
|------|---------|---------|------------|
| dispatched | **无按钮** | general: "{plate} 已调度，正前往{投件地址}" | 待发车 |
| 车辆到达投件点(定时器) | **每单独立「投件 第N单 {格口}」🔵💫** | special: "{plate} 已到达{投件地址}，请开始投件" | 待投件 |
| picking_up | 未投：「投件 第N单 {格口}」🔵💫；已投：「第N单 已投件 ✓」；**全投完后：「全部投件完成，确认发车」🔵💫** | — | 投件中 |
| in_transit | 无按钮 | — | 运输中 |
| 车辆到达取件点(定时器) | **每单独立「取件 第N单 {格口}」🔵💫** | special: "{plate} 已到达{取件地址}，请自助取件" | 待取件 |
| picked_up | 未取：「确认取件 第N单 {格口}」🔵💫；已取：「第N单 已取件 ✓」；**全取完后：「全部取件完成，确认完结」🔵💫** | general: "{plate} 请确认取件" | 取件中 |
| completed | 无按钮 | — | 已完成 |

关键检查点：
- [ ] 绝不出现"装货""卸货"字样
- [ ] 绝不出现"交件""确认收货"(旧术语)
- [ ] 多运单时每单独立按钮，互不阻塞
- [ ] 全部投件完成才出现"确认发车"按钮
- [ ] L2 Tab 按车切：「京A·L001 · 3张运单」；订单仅1运单时不显示运单数
- [ ] **未选中但有待办操作的Tab呼吸闪烁**；已选中Tab不闪
- [ ] 按钮操作时自动跳转到对应车辆Tab
- [ ] Mock 数据 compartments 必须通过 `buildLTLCompartments()` 生成

## 巡游贩卖

| 状态 | 预期按钮 | 预期通知 |
|------|---------|---------|
| dispatched / started | **路线规划**（未规划时为 🔵，已规划后保留查看/修改）| general: "{plate} 已就位" |
| 路线规划完成 | **开始行程** 🔵 出现 | general: "{plate} 路线已规划，可开始行程" |
| selling / vending_active | **暂停贩卖**、**货物操作**→**结束行程**、**路线**(查看/修改) | general: "{plate} 贩卖中" |
| vending_paused | **继续贩卖**、**货物操作**→**结束行程**、**路线**(查看/修改) | general: "{plate} 贩卖暂停" |
| arrived | **交还车辆** 🔵💫 | special: "{plate} 已到达，请交还车辆" |
| completed | 无按钮 | general: "{plate} 行程结束" |

关键检查点：
- [ ] 未完成路线规划时「开始行程」按钮**不可见**
- [ ] 路线规划(查看/修改)在有路线时为 ⚪ 灰色，无路线时为 🔵 蓝色
- [ ] 货物操作→结束行程：有确认弹窗「确认结束行程？」
- [ ] 「路线规划」「货物操作」在前/后置按钮区域正确区分

## 安防巡检

| 状态 | 预期按钮 | 预期通知 |
|------|---------|---------|
| dispatched / started | **路线规划**（未规划时为 🔵）| general: "{plate} 已就位" |
| 路线规划完成 | **开始巡检** 🔵 出现 | general: "{plate} 路线已规划" |
| patrolling | **设备测试**、**物资操作**→**结束巡检**、**路线**(查看/修改) | general: "{plate} 巡检中" |
| arrived | **交还车辆** 🔵💫 | special: "{plate} 已到达，请交还车辆" |
| completed | 无按钮 | general: "{plate} 巡检完成" |

关键检查点：
- [ ] 贩卖和巡检的"交还车辆"按钮逻辑和样式需一致
- [ ] 物资操作→结束巡检：有确认弹窗「确认结束巡检？」
- [ ] 设备测试为 ⚪ 灰色辅助按钮

## 车型锁验证（FTL 下单页）

| 操作 | 预期结果 |
|------|------|
| FTL 下单，不勾特殊要求 | 全部 5 款物流车型可选 |
| FTL 下单，勾选「冷链」 | 仅 Z5、X6 可选 |
| FTL 下单，勾选「超大件」 | 仅 X6 可选 |
| FTL 下单，先选 Z2，再勾「冷链」 | Z2 自动取消选择，提示无兼容车型或仅显示 Z5/X6 |
| FTL 下单，勾「冷链」+「超大件」 | 仅 X6 可选（两个约束的交集） |
| FTL 下单，勾「易碎」 | 全部车型仍可选 |

## 拼车返利验证

| 场景 | 预期 |
|------|------|
| LTL 1 运单下单 | 费用确认页无返利提示 |
| LTL 3 运单同地址下单（≤ 单车格口） | 显示「独占一车折扣 ¥6.00（3运单 × ¥2/单）」 |
| LTL 5 运单同地址下单（> 单车格口 3） | 显示「拼车返利预计 ¥20.00（5运单 × ¥4/单）」，2车 |

## LTL 状态推导契约

### 单一真相源

| 数据 | 来源 | 规则 |
|------|------|------|
| `order.status` | `deriveOrderStatus`（`order-mutator.ts`） | 从运单状态推导，唯一派生点 |
| `resolveAtPickup(order)` | `order-mutator.ts` | 优先从运单当前状态判断，无法判断时回退到 `order.atPickup` |
| `order.atPickup` | `updateOrderStatus` logistics 分支（`use-order-store.ts`） | 基于 prevStatus→status **过渡方向**唯一写入：`dispatched→arrived`=true，`in_transit→arrived`=false |

### 为什么 atPickup 不能完全派生

两次 `arrived` 到达时运单都是 `arrived` 状态，无法从当前值区分——第一次是 assigned→arrived（投件点），第二次是 in_transit→arrived（取件点）。过渡方向信息只能由执行过渡的代码（`updateOrderStatus`）在过渡时记录。

### UI 层约束

- 判断订单阶段：读 `order.status` + `resolveAtPickup(order)`
- **禁止**遍历 waybill 原始数据自行推导状态标签
- 照片区：`LTL_STATUS_LABEL[order.status]` 查表映射
- 按钮区：`getActionsForOrder` 用 `order.status` + `resolveAtPickup(order)` 分支

## 演示数据验证

每次改完状态机逻辑后，确认 8 条演示订单表现正确：

| 订单 | 业务 | 状态 | 自动事件 |
|------|------|------|---------|
| DEMO-001 | 整车 | dispatched | 8s 后自动到达→出现「开始装货」按钮 |
| DEMO-002 | 整车 | completed | 无按钮，卡片可关闭 |
| DEMO-003 | 散件 | dispatched | 10s 后自动到达→出现「开始投件」按钮 |
| DEMO-004 | 散件 | completed | 无按钮 |
| DEMO-005 | 贩卖 | selling | 显示暂停/货物操作/路线按钮 |
| DEMO-006 | 贩卖 | completed | 无按钮 |
| DEMO-007 | 巡检 | patrolling | 显示设备测试/物资操作/路线按钮 |
| DEMO-008 | 巡检 | cancelled | 无按钮 |

## 自动化验证

运行 `bash verification/automated-checks.sh` 快速截图全流程。需先启动 `pnpm dev`。
