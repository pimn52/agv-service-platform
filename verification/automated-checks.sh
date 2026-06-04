#!/bin/bash
# AGV 状态机自动化截图验证
# 用法：bash verification/automated-checks.sh

set -e
cd "$(dirname "$0")/.."

echo "=== 启动开发服务器 ==="
pnpm dev &
DEV_PID=$!
sleep 3

echo ""
echo "=== DEMO-001：整车 dispatched，检查无按钮 ==="
agent-browser open http://localhost:5000
agent-browser wait 2000
agent-browser snapshot -i

echo ""
echo "=== 等 10s 后车辆到达 ==="
agent-browser wait 10000
agent-browser snapshot -i

echo ""
echo "=== DEMO-005：贩卖 selling，检查按钮 ==="
agent-browser snapshot -i

echo ""
echo "=== 完成，关闭服务器 ==="
kill $DEV_PID 2>/dev/null
