---
name: agv-consistency-check
description: AGV 项目一致性校验——术语残留检测、文档引用验证、状态-按钮-通知对齐检查。变更后运行，防止返工。
user-invocable: true
---

# AGV 一致性校验

三点快速检查，每次改完状态、标签、按钮或通知后跑一遍，避免连锁返工。

## 1. 术语一致性

检查已废弃的旧术语是否有残留（全项目不应出现）：

```bash
cd "C:/Users/ASUS/Documents/AI coding/AGV service platform-APP"

# 检查旧术语残留："交件"（已改为投件）、"零担"（已改为散件）
echo "=== 废弃术语检查 ==="
grep -rn "交件" --include="*.tsx" --include="*.ts" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.next src/ memory/ *.md 2>/dev/null \
  && echo "❌ 残留旧术语"交件"，应改为"投件"" || echo "✅ 交件 无残留"

grep -rn "零担" --include="*.tsx" --include="*.ts" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.next src/ memory/ *.md 2>/dev/null \
  && echo "❌ 残留旧术语"零担"，应改为"散件"" || echo "✅ 零担 无残留"
```

## 2. 文档引用校验

从所有 Markdown 文件提取反引号中的文件路径，逐一验证存在性：

```bash
cd "C:/Users/ASUS/Documents/AI coding/AGV service platform-APP"

# 提取 CLAUDE.md / task_plan.md / findings.md / progress.md / memory/*.md
# 中被反引号包裹的文件路径，检查是否存在
grep -ohP '(?<=`)[a-zA-Z0-9_/.-]+\.(?:md|ts|tsx|js|json|css|sql)(?=`)' \
  CLAUDE.md task_plan.md findings.md progress.md architecture-decisions.md memory/*.md 2>/dev/null \
  | sort -u | while read f; do
    [ -f "$f" ] || echo "BROKEN: $f"
  done
```

## 3. 状态-按钮-通知对齐

从 `architecture-decisions.md` 的关键文件和术语变更影响面表中提取关键模式，对照代码：

```bash
# 检查 findings.md 中列出的关键文件是否都存在于 src/
for f in \
  src/constants/status-labels.ts \
  src/constants/services.ts \
  src/components/shared/address-book-button.tsx \
  src/components/shared/time-slot-picker.tsx \
  src/components/home/order-dynamics.tsx \
  src/data/addresses.ts; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ MISSING: $f"
done
```

## 4. 端到端测试流

改动涉及下单、支付、状态流转、追踪页时，走完整链路：

```bash
cd "C:/Users/ASUS/Documents/AI coding/AGV service platform-APP"

# 确保 dev server 运行
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q 200 || (pnpm dev & sleep 5)

# 1. 打开首页 → 进入演示模式 → 截图
agent-browser open http://localhost:5000
sleep 2
agent-browser snapshot -i | grep -q "演示体验" && agent-browser click @e3  # 点演示体验
sleep 2
agent-browser snapshot -i | grep -q "跳过" && agent-browser click @e3      # 跳过引导

# 2. 验证演示订单展示正确
echo "=== 演示订单检查 ==="
agent-browser snapshot -i | grep -E "运单[0-9]|京A·" && echo "✅ L2 Tab 正常" || echo "❌ L2 Tab 异常"
agent-browser snapshot -i | grep "张运单" && echo "✅ LTL 多运单展示" || echo "⚠ LTL 运单数"

# 3. 新建物流订单 → 支付 → 验证流转
agent-browser snapshot -i | grep -q "配送下单" && agent-browser click @e6  # 点配送下单
sleep 2
# … 填写表单、提交、支付 …
# agent-browser fill … → click 确认下单 → click 确认支付

# 4. 等待调度 → 截图首页操作按钮
sleep 12
agent-browser snapshot -i | grep -E "投件|装货" && echo "✅ 操作按钮正常" || echo "❌ 按钮缺失"

echo "=== 端到端测试完成 ==="
agent-browser close
```

### 快速检查清单
- [ ] DEMO-001（整车 dispatched）无操作按钮，8s 后出现"开始装货"
- [ ] DEMO-003（散件 dispatched）10s 后出现投件按钮，L2 按车切
- [ ] 新建 FTL 订单：车牌不为空（非 "--"）
- [ ] 新建 LTL 订单：compartments 生成正确车牌（非 "v_002"）
- [ ] L2 Tab 未选中但有操作的车闪烁，选中车不闪
- [ ] 多运单时每单独立投件/取件按钮

## 使用方式

每次完成一个功能点后，告诉 Claude：`运行一致性校验` 或 `/agv-consistency-check`
