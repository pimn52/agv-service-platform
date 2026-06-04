---
name: supabase-config
description: Supabase 项目配置、数据库状态与测试账号
metadata:
  type: project
---

## Supabase 项目

- 项目名: pimn52's Project
- 区域: AWS ap-southeast-2
- URL: https://essdfjsegzaygbkqadxd.supabase.co
- Anon Key: sb_publishable_b1uINFHvmI27ypu96PcgBA_REmit2gy（已配在 .env.local）
- 注意：RLS 无 DELETE 策略，客户端无法删除订单

## 数据库状态
- `detail` JSONB 列已添加到 orders 表
- Email 确认已关闭
- 触发器: 新用户注册自动创建 profile，赠 ¥5000 余额
- 规范 Schema: `sql/schema.sql`（幂等，可重复执行）

## 认证配置
- 关闭了 Email Confirmation（注册即登录）
- AuthPage 支持邮箱和手机号（手机号映射为 phone_XXX@agv.user）

## 测试账号

### 账号 1（洪攀个人）
- 邮箱: 1@1 / 密码: test001
- 用途: 注册→登录→下单→追踪 全链路测试

### 账号 2（历史测试）
- 邮箱: test2024@example.com / 密码: test123456
- 用途: 早期开发测试
