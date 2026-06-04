# 业务流设计

> **依赖关系**
> - 被 `CLAUDE.md` 触发规则读取（业务流/状态机/通知 → 先读本文件）
> - 被我关联：`verification/state-machine-tests.md`（改我必同步，本文件为唯一源）
> - 引用：`memory/terminology.md`、`src/constants/status-labels.ts`、`architecture-decisions.md`
> - 下单页操作流程见 `page-architecture.md`

## 整车配送

```
pending→pricing→paying→dispatching→dispatched→[车辆到达]→loading→in_transit→arrived→unloading→completed
```
- 内部标识：`deliveryMode: 'full_load'`
- dispatched：无按钮，系统自动调度，通知"已调度正前往发货地"
- 车辆到达（定时器触发）：通知"已到达请开始装货" + 按钮「开始装货」🔵💫
- loading：按钮「装货完成」🔵💫 → in_transit（发车）
- arrived（收货地）：按钮「开始卸货」🔵💫
- unloading：按钮「卸货完成」🔵💫 → completed

## 散件直送

```
pending→pricing→paying→dispatching→dispatched→[车辆到达]→picking_up→in_transit→arrived→picked_up→completed
```
- 内部标识：`deliveryMode: 'ltl'`
- 下单页结构：运单列表（每张运单 = 投件地址 + 取件地址 + 货物）+ 系统自动拼车
- 客户不编排路线，不指定车辆；系统在后台完成格口分配与车辆调度
- dispatched：无按钮，系统自动调度，通知"已调度正前往投件点"
- 车辆到达（定时器触发）：通知"已到达请开始投件"
  - 未投运单：按钮「投件 第N单 {格口}」🔵💫（按运单独立操作）
  - 已投运单：显示「第N单 已投件」（灰色，不可操作）
  - 全部投件完成后：按钮「全部投件完成，确认发车」🔵💫 → in_transit（发车）
- arrived（取件点）：按运单独立「开始取件」🔵💫
- picked_up：按运单独立「确认取件」🔵💫；全部完成后订单 completed
- 费用确认页提示："系统已为您匹配拼车车辆，预计节省 XX% 运费"（传达动态调度价值）
- 每张运单独立追踪：格口号、验证码、交接记录

## 巡游贩卖

```
pending→...→dispatched/started→selling⇄vending_paused→arrived→completed
```
- dispatched/started：按钮「路线规划」（须完成才能开始行程）
- 路线规划完成后：按钮「开始行程」🔵 出现
- selling/vending_active：暂停⇄继续贩卖、货物操作→结束行程、路线规划(查看/修改)
- vending_paused：继续贩卖、货物操作→结束行程、路线规划
- arrived：按钮「交还车辆」🔵💫 → completed

## 安防巡检

```
pending→...→dispatched/started→patrolling⇄patrolling_paused→arrived→completed
```
- dispatched/started：按钮「路线规划」（须完成才能开始巡检）
- 路线规划完成后：按钮「开始巡检」🔵 出现
- patrolling：暂停⇄继续巡检、结束巡检(如无需物资操作)、路线规划(查看/修改)
- patrolling_paused：继续巡检、设备测试、物资操作(如有)→结束巡检、路线规划
- arrived：按钮「交还车辆」🔵💫 → completed

## 按钮三级分级

| 级 | 样式 | 触发条件 | 示例 |
|:--:|------|------|------|
| 🔵💫 | 蓝色呼吸 | 车到了/做完了，必须马上操作 | 开始装货、装货完成、开始卸货、卸货完成、开始投件、投件完成、开始取件、确认取件、交还车辆 |
| 🔵 | 蓝色 | 需要操作但不紧迫 | 开始行程、开始巡检、暂停贩卖、路线规划(无路线时) |
| ⚪ | 灰色 | 辅助功能/当前不推荐 | 设备测试、货物操作、暂停巡检(任务未完成)、路线规划(有路线时) |

## 通知规则
- **状态驱动**：消息随订单状态自动产生和消失
- **general**：8 秒后自动消失
- **special**：需用户行动，按钮"去处理/稍后"，状态变化时消失
- **订单完成/取消**：卡片+消息立即清除
- **车牌号前缀**：所有通知带车牌号
- **多点位逐站触发**（整车 1→N / N→1）：
  - 下单时：每个经停点给时间窗（如"14:00-14:30"），不承诺精确时间
  - 离开上一站时：自动推送下一站通知——"车辆已从 [上站] 出发，预计 XX 分钟到达您的站点"
  - 到达前 3 分钟：二次提醒——"车辆即将到达，请准备接货"
- **演示定时通知**：
  - 8-10s：dispatched→车辆到达通知（special）
  - 1min：路线优化通知（general）
  - 3min：即将到达通知（general）

## 确认弹窗规则
- 装货完成→发车 / 卸货完成→签收
- 投件完成→发车 / 确认取件
- 结束行程→返回 / 结束巡检→返回
- 交还车辆→完成
