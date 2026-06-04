---
name: deploy-checklist
description: 部署上线待办清单
metadata:
  type: project
---

## 部署上线 — 仅剩 2 步

### 步骤 1：Git 初始化 + GitHub 推送
```bash
git init
git add .
git commit -m "AGV 无人车服务平台 v2.0"
# 在 GitHub 创建仓库后：
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin master
```

### 步骤 2：Vercel 部署
1. vercel.com → Import Project → 选择 GitHub 仓库
2. 环境变量（从 .env.local 复制）：
   - NEXT_PUBLIC_SUPABASE_URL=https://essdfjsegzaygbkqadxd.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_b1uINFHvmI27ypu96PcgBA_REmit2gy
3. Framework: Next.js，自动检测
4. Deploy

### 已验证就绪
- TypeScript 检查通过
- 生产构建通过
- Supabase 数据库可用
- 注册/登录全链路可用
- 演示数据完整展示
- 可信度四件套已实现
