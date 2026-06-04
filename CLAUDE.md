# 城市无人车综合服务平台 — 项目指引

> **依赖关系**：我是项目入口文件，所有会话自动加载。我的触发规则指向：`memory/terminology.md`、`architecture-decisions.md`、`findings.md`、`business-flows.md`、`page-architecture.md`、`data-models.md`、`task_plan.md`、`progress.md`、`verification/`

## 产品定位
城市无人车商用运营 B2B 客户端演示版，洪攀个人演示作品。

三大业务线：**物流配送**（整车/散件）、**巡游贩卖**、**安防巡检**。手机 APP 体验（桌面端模拟 iPhone 手机壳，移动端全屏自适应）。

技术栈：Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Zustand + Supabase

## 硬约束

### 术语
> 完整规范见 `memory/terminology.md`，涉及任何 UI 标签、按钮文案、状态文字前必须先读该文件。整车/散件术语绝不混用。

### 功能边界
- 不做 N→N 配送、不提供装卸方式配置、路线规划仅贩卖巡检、车辆故障不做客户端
- 完整边界见 `architecture-decisions.md` 架构决策表

### UI 设计
- 不自行添加参考设计中没有的元素
- 不自行添加未明确要求的功能

## 工作流

接收任务 → 检查（约束 · 参考 · 规范，不确定就问） → 出方案 → 确认 → 动手（最小改动 · 易于维护） → 验证（ts-check → 一致性校验） → 记录（同步核心文件） → 下一步

## 触发规则

| 开始做 | 先读 |
|--------|------|
| UI 标签 / 按钮 / 状态文案 | `memory/terminology.md` |
| 业务流 / 状态机 / 通知 | `business-flows.md` |
| 架构设计 / 数据模型 | `architecture-decisions.md`（决策记录）、`data-models.md`（数据约束/状态机） |
| 页面布局 / UI 架构 | `page-architecture.md` |
| 开始新任务 | `task_plan.md` + `progress.md`（了解进度），然后查 `architecture-decisions.md` 底部的关联文档表了解完整文档地图 |
| 修改状态标签 / 按钮逻辑 / 通知模板 | 先 grep 全项目涉及此标签的所有文件，评估影响面 |
| 修改了业务流/状态机/通知规则 | 同步更新 `verification/state-machine-tests.md` |
| 修改了任何 .md 文件 | 运行 `/agv-consistency-check`（术语残留 + 文档引用 + 状态对齐 + E2E 测试流） |
| 声称完成功能前 | 验证：① `pnpm ts-check` ② `/agv-consistency-check`（覆盖全部 4 节，含浏览器截图与 E2E 流程） |
| 会话结束 | 写入 `progress.md` |

## 协作准则
- 始终用中文回复
- 不理解就问，不要靠猜
- 发现不合理直接指出，不要先斩后奏
- 动作要快，但别快到让我跟不上你的节奏
- 主动管好项目进度，保持文档更新

## 开发原则
- 演示导向：时刻问自己"这个功能对演示有多大价值？"
- 存量代码遵循最小改动、增量开发以易于维护为准绳

### 子 Agent 铁律
> 详细规则见 `findings.md`「子 Agent 派发规范」章节和 `verification/state-machine-tests.md」

- 派发前给 AC，要求 FTL/LTL 对称验证，Mock 必须走工厂
- 返回后验证：`pnpm ts-check` → `/agv-consistency-check`
- 三步全过才汇报"完成"

## 启动命令
```bash
pnpm dev          # 开发服务器 localhost:5000
pnpm build        # 生产构建
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint
```
