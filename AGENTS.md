# 城市无人车服务平台 - 项目说明

## 项目概览

城市无人车服务平台客户端，B2B 综合运营平台网页版 MVP，模拟手机 APP 使用效果。
支持三大核心服务：物流配送、巡游贩卖、安防巡检。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5 (strict)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4
- **State**: Zustand
- **Icons**: Lucide React
- **Map**: MVP阶段使用模拟地图，预留高德地图升级接口

## 目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 主页（AppShell入口）
│   ├── globals.css               # 全局样式（含手机模拟壳样式）
│   └── api/                      # API Routes（预留后端接口）
│       ├── orders/               # 订单 CRUD
│       ├── tracking/[id]/        # 追踪信息
│       ├── user/profile/         # 用户信息
│       └── cities/               # 城市列表
├── components/
│   ├── layout/                   # 布局组件
│   │   ├── app-shell.tsx         # 主壳（Tab切换 + 子页面栈）
│   │   ├── bottom-nav.tsx        # 底部4Tab导航
│   │   ├── status-bar.tsx        # 模拟/真实状态栏
│   │   └── sub-page-renderer.tsx # 子页面渲染器（含返回栏）
│   ├── home/                     # 首页模块
│   │   ├── home-page.tsx         # 首页主组件
│   │   ├── city-selector.tsx     # 城市选择器
│   │   ├── search-bar.tsx        # 搜索栏
│   │   ├── service-entry.tsx     # 下单入口卡片
│   │   ├── order-dynamics.tsx    # 订单动态面板（三段式）
│   │   └── service-links.tsx     # 客服/合作入口
│   ├── tracking/                 # 服务跟踪页
│   │   └── tracking-page.tsx     # 跟踪页（数据看板+地图+折叠进度）
│   ├── order/                    # 订单管理页
│   │   ├── order-page.tsx        # 订单列表
│   │   └── order-detail-page.tsx # 订单详情
│   ├── order-create/             # 下单流程页
│   │   ├── delivery-order-page.tsx   # 配送下单（整车/零担+批量）
│   │   ├── cruise-order-page.tsx     # 巡游下单（贩卖/安防+套餐）
│   │   ├── cost-confirm-page.tsx     # 费用确认
│   │   ├── payment-result-page.tsx   # 支付结果
│   │   └── route-planning-page.tsx   # 路线规划（停留点+任务设置）
│   ├── profile/                  # 个人中心页
│   │   ├── profile-page.tsx      # 个人中心主页面
│   │   ├── recharge-page.tsx     # 充值页
│   │   ├── invoice-page.tsx      # 发票管理页
│   │   ├── address-page.tsx      # 地址管理页
│   │   └── settings-page.tsx     # 设置页
│   ├── shared/                   # 通用组件
│   │   ├── scanner-page.tsx      # 扫码页
│   │   ├── customer-service-page.tsx  # 客服页
│   │   ├── customer-service-dialog.tsx # 客服弹窗
│   │   └── cooperation-page.tsx  # 企业合作页
│   └── ui/                       # shadcn/ui 组件库
├── store/                        # Zustand 状态管理
│   ├── use-app-store.ts          # 全局状态（Tab/城市/页面栈/通知）
│   ├── use-order-store.ts        # 订单状态（列表/表单/费用/创建）
│   └── use-user-store.ts         # 用户状态（登录/余额）
├── services/                     # API 接口层（预留，MVP用Mock）
├── types/                        # TypeScript 类型定义
│   ├── order.ts                  # 订单/通知/费用类型
│   ├── vehicle.ts                # 车型/配套套餐类型
│   ├── user.ts                   # 用户类型
│   ├── tracking.ts               # 追踪类型
│   ├── route-planning.ts         # 路线规划类型
│   └── index.ts                  # 统一导出
├── constants/                    # 常量
│   ├── cities.ts                 # 城市列表
│   └── services.ts               # 服务配置/车型参数/任务清单/套餐
├── mock/                         # Mock 数据
│   └── data.ts                   # 完整 Mock 数据集
└── hooks/                        # 自定义 Hooks
```

## 页面导航架构

- **底部4Tab**：首页 / 服务跟踪 / 订单 / 我的
- **子页面栈**：模拟 APP push/pop 导航，通过 `useAppStore` 的 `pageStack` 管理
- **桌面端**：居中显示 375×812 手机模拟框 + 模拟状态栏；移动端全屏+真实状态栏
- **顶部栏**：桌面端模拟手机状态栏（真实时间/信号/电池），与刘海齐平；移动端使用手机真实状态栏

## 核心业务规则

### 订单摘要显示

根据服务类型显示不同的摘要信息：
- **物流配送**：显示"发货地址 → 收货地址"，字段为 `senderAddress`/`receiverAddress`（Location | string 类型）
- **巡游贩卖/安防巡检**：显示取车地点，字段为 `pickupLocation`（string 类型）
- 注意：Order 类型中 `origin`/`destination` 字段已废弃，使用 `senderAddress`/`receiverAddress`

### 车辆标识统一

所有页面统一使用"车型名 · 车牌号"格式显示车辆信息（如"Z5 中型配送车 · 京A·UV001"），由 `getVehicleDisplay(order)` 函数统一生成。相关字段：`vehicleModel` + `vehiclePlate`。

### 首页订单动态面板

三段式布局：
1. **消息栏**：一行显示即时操作提醒，可滚动/下拉展开
2. **车辆展示区**：无人车照片+车牌+订单摘要，支持左右滑动/翻页切换
3. **操作按钮**：根据订单状态动态展示，互切按钮（开始↔结束行程）

操作按钮完整映射：
- **物流配送**：dispatched→装货(高亮), loading→装货(灰), in_transit→无操作, arrived→卸货(高亮)+自助取件, unloading→卸货(灰)+自助取件, picked_up→自助取件+自助收件(高亮)
- **巡游贩卖**：dispatched/started→开始行程(高亮)+路线规划, vending_active/selling→结束行程+暂停贩卖(高亮)+货物操作+路线规划, vending_paused→结束行程+开始贩卖(高亮)+货物操作+路线规划
- **安防巡检**：dispatched/started→开始行程(高亮)+路线规划, patrolling→结束行程+物资操作+设备测试(高亮)+路线规划

路线规划按钮通过 `pushPage({ key: 'route-plan', data: { orderId, serviceType } })` 跳转。

通知红点逻辑：
- 一般提示：点击阅后即消失
- 特殊提示：有"稍后处理"按钮，点击后红点变灰

### 服务跟踪页

顶栏：在途订单切换下拉（显示"订单类型 · 车牌号"，不用"服务跟踪"标题）
进度栏：默认折叠，位于数据看板上方，点击展开
数据看板：根据服务类型展示不同可视化：
- **物流**：环形进度图+关键指标卡片+电量进度条
- **贩卖**：运营模式指示+销售指标+库存条形图+热销商品TOP4+销售趋势柱形图
- **安防**：环形进度图+异常事件卡片+设备状态灯+电量进度条+实时巡检视频
地图栏：右上角路线规划悬浮按钮（仅巡游/安防）
"返回首页操作"：轻量横条，跳转首页对应订单面板

### 路线规划

三种点位：任务停留点（定时+任务列表）、非任务停留点（定时无任务）、经过点（不停留）
路段任务：两点间行驶途中执行的任务
下单前可选规划，下单后可修改

### 车型体系

每种服务类型有多个车型，每个车型有配套套餐，下单时选车型后只能选对应套餐。
整车配送选车型（显示载重/空间/续航），零担不选车型。

### 配送下单增强

- **货物类型**：预置分类（日用品快消品/生鲜冷链/电子设备/文件包裹/其他），通过下拉选择
- **特殊要求**：勾选项（冷链/易碎/加急），影响车型推荐和费用
- **费用明细**：拆分为里程费+基础费+优惠+特殊附加费，提交前自动计算
- **保存草稿**：与提交按钮并列，暂存当前填写内容
- **服务协议**：提交前需勾选确认
- **车型选择**：统一卡片布局，横向滚动+左右箭头，选中蓝色边框+浅蓝背景，显示车型图片+参数+价格
- **底部固定栏**：预估费用摘要+确认下单按钮（禁用时显示"请先完善信息"提示）

### 巡游租车增强

- **套餐可视化**：2小时/半天/全天三档并列选择，高亮选中项
- **费用明细**：拆分为基础服务费+套餐费+附加费，套餐价格不含¥前缀
- **预期参考数据**：展示同区域日均销售额区间参考（如"¥800-1,200"），标注"参考数据"
- **保存草稿**：与确认下单并列
- **车型选择**：与配送下单统一卡片布局，横向滚动+左右箭头
- **底部固定栏**：预估费用摘要+确认下单按钮

### 安防巡检增强

- **车辆数量推荐**：基于巡检面积智能推荐车辆数量及原因说明
- **月度套餐**：1个月/3个月/6个月+对应折扣（越长期越优惠）
- **保存为模板**：与提交并列，可复用配置创建周期性订单
- **车型选择**：与配送下单统一卡片布局

### 批量操作（公共信息+差异列表模式）

批量模式核心原则：**只填差异，共享的填一次**。
- **配送批量**：公共信息区（发货地址/发货人/车型/货物类型/特殊要求）只填一次；收货列表每条仅填差异信息（收货地+收货人+货物+重量）
- **巡游批量**：公共配置区（服务类型/联系人/套餐档位）只填一次；车辆列表每条仅填差异信息（区域/车型/设备/路线）
- **费用**：显示合计+单均（如"3单合计 ¥127.50，均 ¥42.50/单"）
- **单条↔批量互通**：切换时公共信息自动带入，不丢数据
- **CSV导入**：下载模板+上传解析+预览确认填入

### 路线规划推荐路线

路线规划页顶部提供推荐路线快捷入口（基于当前城市和服务类型过滤），点击一键加载预设停留点和任务配置。推荐路线数据在 `RECOMMENDED_ROUTES` 常量中配置。

### 费用确认页

- 展示费用明细拆分（里程费/基础费/服务费/套餐费/附加费/优惠）
- 服务协议勾选确认（未勾选时按钮禁用+红色提示"请先勾选服务协议"）
- 支持多种支付方式选择

### 子页面导航

配送下单、巡游租车、路线规划三个页面自带返回按钮栏（返回+标题+操作按钮），sub-page-renderer 通过 `PAGES_WITH_OWN_NAV` 集合控制不显示默认返回栏。

## 订单工作流

用户发起订单 → 计算运费 → 确认支付 → 调度无人车 → 实时追踪与人车交互 → 订单完成

## 构建和测试命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发环境（端口5000）
pnpm ts-check         # TypeScript 类型检查
pnpm lint             # ESLint 检查
pnpm lint:build       # ESLint 静态构建检查
pnpm build            # 生产构建
pnpm start            # 启动生产环境
```

## 代码风格指南

- 仅使用 pnpm 管理依赖
- 严格 TypeScript，禁止隐式 any
- 函数参数和返回值必须标注类型
- `SubPage` 类型从 `@/store` 导入，不从 `@/types` 导入
- `City` 类型从 `@/constants/cities` 或 `@/types` 导入
- 使用 'use client' 指令处理客户端组件
- 严禁在 JSX 中直接使用 typeof window / Date.now() / Math.random()
- 所有组件遵循 shadcn/ui 风格规范
- Notification 类型使用 `AppNotification` 避免与浏览器原生 Notification 冲突

## 配色方案

- 主色：#1677FF（淡雅蓝）
- 辅助蓝背景：#E6F0FF
- 页面底色：#F5F6FA（浅灰）
- 卡片：#FFFFFF
- 成功绿：#52C41A
- 警告橙：#FAAD14
- 危险红：#FF4D4F

## 后续迭代方向

- 接入高德地图 JS API 2.0（替换模拟地图）
- 接入真实后端 API（替换 Mock 数据）
- WebSocket 实时追踪推送
- 3D 无人车模型展示
- 语音交互功能
- 智能调度算法
- 动态定价系统
- 充电管理与低电量预警
- 设备故障告警与远程控制
