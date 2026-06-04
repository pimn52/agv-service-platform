-- ============================================================
-- AGV Service Platform V1 — 物流配送
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 用户信息表（关联 Supabase Auth）
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  avatar      TEXT,
  org_name    TEXT,
  org_type    TEXT CHECK (org_type IN ('logistics', 'merchant', 'property')),
  balance     INTEGER NOT NULL DEFAULT 0,  -- 余额（分）
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 订单主表（所有服务类型共用）
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL CHECK (service_type IN ('logistics', 'vending', 'security')),
  status          TEXT NOT NULL DEFAULT 'pending',
  amount          INTEGER NOT NULL DEFAULT 0,
  payment_method  TEXT CHECK (payment_method IN ('balance', 'wechat', 'alipay', 'enterprise', 'invoice')),
  estimated_time  INTEGER,  -- 预计用时（分钟）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  detail          JSONB         -- V2: 完整订单 JSON（stops/waybills/ftlWaybills/compartments 等）
);

-- 3. 物流订单详情表
CREATE TABLE IF NOT EXISTS public.order_logistics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_mode         TEXT NOT NULL DEFAULT 'full_load' CHECK (delivery_mode IN ('full_load', 'ltl')),
  vehicle_id            TEXT,
  vehicle_name          TEXT,
  vehicle_model         TEXT,
  vehicle_plate         TEXT,
  -- 发货方
  sender_name           TEXT,
  sender_phone          TEXT,
  sender_address        JSONB,
  -- 收货方
  receiver_name         TEXT,
  receiver_phone        TEXT,
  receiver_address      JSONB,
  -- 货物
  cargo_info            TEXT,
  cargo_type            TEXT,
  cargo_weight          REAL,           -- kg
  special_requirements  TEXT[],
  -- 路线
  origin                JSONB,          -- { lat, lng, address }
  destination           JSONB,
  distance              REAL,           -- km
  -- 费用
  estimated_cost        INTEGER,
  actual_cost           INTEGER,
  -- 追踪
  remaining_distance    REAL,
  remaining_time        INTEGER,        -- 分钟
  delivery_time         TEXT
);

-- 4. 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'action_required', 'special')),
  service_type  TEXT CHECK (service_type IN ('logistics', 'vending', 'security')),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT false,
  dismissed     BOOLEAN NOT NULL DEFAULT false,
  postponed     BOOLEAN NOT NULL DEFAULT false,
  action_label  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 5. 发票表
CREATE TABLE IF NOT EXISTS public.invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id      TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'normal' CHECK (type IN ('normal', 'special')),
  title         TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued')),
  issued_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- invoices RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);


-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON public.orders(service_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================================
-- Row Level Security（安全规则）
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles：用户只能读写自己的
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- orders：用户只能操作自己的订单
CREATE POLICY "Users can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON public.orders FOR DELETE
  USING (auth.uid() = user_id);

-- order_logistics：通过 order_id 关联权限
CREATE POLICY "Users can read own logistics"
  ON public.order_logistics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_logistics.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own logistics"
  ON public.order_logistics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_logistics.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own logistics"
  ON public.order_logistics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_logistics.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- notifications：用户只能看自己的
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 触发器：新用户注册时自动创建 profile
-- ============================================================
-- 触发器：新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, balance, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    0,        -- 初始余额 0
    NEW.created_at,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 补建已注册用户（如有缺失）+ 更新旧用户余额
-- ============================================================
INSERT INTO public.profiles (id, name, balance, created_at, updated_at)
SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'name', u.email), 500000, u.created_at, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- UPDATE public.profiles SET balance = 500000 WHERE balance = 0; -- 不再需要初始余额

-- 验证
SELECT u.email, p.name, p.balance
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;
