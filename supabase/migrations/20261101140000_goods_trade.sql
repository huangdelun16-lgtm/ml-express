-- 缅甸商品买卖：和快递库存、代购分开。金额只用缅币。

CREATE TABLE IF NOT EXISTS public.goods_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  spec text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '件',
  cost_mmk bigint NOT NULL DEFAULT 0 CHECK (cost_mmk >= 0),
  price_mmk bigint NOT NULL DEFAULT 0 CHECK (price_mmk >= 0),
  qty_on_hand integer NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  qty_with_supplier integer NOT NULL DEFAULT 0 CHECK (qty_with_supplier >= 0),
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goods_products ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.goods_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goods_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goods_supplier_stock (
  product_id uuid NOT NULL REFERENCES public.goods_products(id),
  supplier_id uuid NOT NULL REFERENCES public.goods_suppliers(id),
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.goods_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('purchase', 'consign', 'recall', 'sale')),
  product_id uuid NOT NULL REFERENCES public.goods_products(id),
  supplier_id uuid REFERENCES public.goods_suppliers(id),
  customer_id uuid REFERENCES public.goods_customers(id),
  qty integer NOT NULL CHECK (qty > 0),
  unit_mmk bigint NOT NULL DEFAULT 0 CHECK (unit_mmk >= 0),
  total_mmk bigint NOT NULL DEFAULT 0 CHECK (total_mmk >= 0),
  cost_mmk bigint NOT NULL DEFAULT 0 CHECK (cost_mmk >= 0),
  note text NOT NULL DEFAULT '',
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goods_movements_occurred ON public.goods_movements (occurred_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_movements_product ON public.goods_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_goods_movements_supplier ON public.goods_movements (supplier_id);
CREATE INDEX IF NOT EXISTS idx_goods_movements_customer ON public.goods_movements (customer_id);
CREATE INDEX IF NOT EXISTS idx_goods_supplier_stock_supplier ON public.goods_supplier_stock (supplier_id);

COMMENT ON TABLE public.goods_products IS '缅甸买卖的商品。qty_on_hand 在自己手上，qty_with_supplier 在供应商处代卖。';
COMMENT ON TABLE public.goods_movements IS '进货、交给供应商代卖、从供应商收回、销售。金额为缅币。';

ALTER TABLE public.goods_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_supplier_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all goods_products" ON public.goods_products;
CREATE POLICY "Allow all goods_products" ON public.goods_products FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all goods_suppliers" ON public.goods_suppliers;
CREATE POLICY "Allow all goods_suppliers" ON public.goods_suppliers FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all goods_customers" ON public.goods_customers;
CREATE POLICY "Allow all goods_customers" ON public.goods_customers FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all goods_supplier_stock" ON public.goods_supplier_stock;
CREATE POLICY "Allow all goods_supplier_stock" ON public.goods_supplier_stock FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all goods_movements" ON public.goods_movements;
CREATE POLICY "Allow all goods_movements" ON public.goods_movements FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.goods_products, public.goods_suppliers, public.goods_customers, public.goods_supplier_stock, public.goods_movements TO anon, authenticated;

CREATE OR REPLACE VIEW public.goods_movement_totals
WITH (security_invoker = true) AS
SELECT
  coalesce(sum(total_mmk) FILTER (WHERE kind = 'purchase'), 0)::bigint AS purchase_mmk,
  coalesce(sum(total_mmk) FILTER (WHERE kind = 'sale'), 0)::bigint AS sale_mmk,
  coalesce(sum(cost_mmk) FILTER (WHERE kind = 'sale'), 0)::bigint AS sale_cost_mmk
FROM public.goods_movements;

GRANT SELECT ON public.goods_movement_totals TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.goods_apply_movement(
  p_kind text,
  p_product_id uuid,
  p_supplier_id uuid,
  p_customer_id uuid,
  p_qty integer,
  p_unit_mmk bigint,
  p_note text,
  p_occurred_on date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.goods_products%ROWTYPE;
  v_held integer;
  v_total bigint;
  v_cost bigint;
  v_basis bigint;
  v_new_cost bigint;
  v_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION '数量要大于 0';
  END IF;
  IF p_unit_mmk IS NOT NULL AND p_unit_mmk < 0 THEN
    RAISE EXCEPTION '金额不能小于 0';
  END IF;

  SELECT * INTO v_product FROM public.goods_products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '没有这个商品';
  END IF;

  IF p_kind = 'purchase' THEN
    IF p_supplier_id IS NULL THEN
      RAISE EXCEPTION '请选择供应商';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.goods_suppliers WHERE id = p_supplier_id) THEN
      RAISE EXCEPTION '没有这个供应商';
    END IF;
    IF p_unit_mmk IS NULL THEN
      RAISE EXCEPTION '请填写进价';
    END IF;
    v_total := p_qty::bigint * p_unit_mmk;
    v_basis := (v_product.qty_on_hand + v_product.qty_with_supplier)::bigint;
    IF v_basis > 0 THEN
      v_new_cost := (v_basis * v_product.cost_mmk + v_total) / (v_basis + p_qty);
    ELSE
      v_new_cost := p_unit_mmk;
    END IF;
    UPDATE public.goods_products
      SET qty_on_hand = qty_on_hand + p_qty,
          cost_mmk = v_new_cost,
          updated_at = now()
      WHERE id = p_product_id;
    INSERT INTO public.goods_movements (kind, product_id, supplier_id, qty, unit_mmk, total_mmk, cost_mmk, note, occurred_on)
    VALUES ('purchase', p_product_id, p_supplier_id, p_qty, p_unit_mmk, v_total, v_total, coalesce(p_note, ''), coalesce(p_occurred_on, CURRENT_DATE))
    RETURNING id INTO v_id;

  ELSIF p_kind = 'consign' THEN
    IF p_supplier_id IS NULL THEN
      RAISE EXCEPTION '请选择供应商';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.goods_suppliers WHERE id = p_supplier_id) THEN
      RAISE EXCEPTION '没有这个供应商';
    END IF;
    IF v_product.qty_on_hand < p_qty THEN
      RAISE EXCEPTION '手上的货不够';
    END IF;
    UPDATE public.goods_products
      SET qty_on_hand = qty_on_hand - p_qty,
          qty_with_supplier = qty_with_supplier + p_qty,
          updated_at = now()
      WHERE id = p_product_id;
    INSERT INTO public.goods_supplier_stock (product_id, supplier_id, qty)
    VALUES (p_product_id, p_supplier_id, p_qty)
    ON CONFLICT (product_id, supplier_id)
    DO UPDATE SET qty = public.goods_supplier_stock.qty + EXCLUDED.qty;
    INSERT INTO public.goods_movements (kind, product_id, supplier_id, qty, unit_mmk, total_mmk, cost_mmk, note, occurred_on)
    VALUES ('consign', p_product_id, p_supplier_id, p_qty, 0, 0, 0, coalesce(p_note, ''), coalesce(p_occurred_on, CURRENT_DATE))
    RETURNING id INTO v_id;

  ELSIF p_kind = 'recall' THEN
    IF p_supplier_id IS NULL THEN
      RAISE EXCEPTION '请选择供应商';
    END IF;
    SELECT qty INTO v_held
    FROM public.goods_supplier_stock
    WHERE product_id = p_product_id AND supplier_id = p_supplier_id
    FOR UPDATE;
    IF v_held IS NULL OR v_held < p_qty THEN
      RAISE EXCEPTION '这个供应商手里的货不够';
    END IF;
    UPDATE public.goods_supplier_stock
      SET qty = qty - p_qty
      WHERE product_id = p_product_id AND supplier_id = p_supplier_id;
    DELETE FROM public.goods_supplier_stock
      WHERE product_id = p_product_id AND supplier_id = p_supplier_id AND qty = 0;
    UPDATE public.goods_products
      SET qty_on_hand = qty_on_hand + p_qty,
          qty_with_supplier = qty_with_supplier - p_qty,
          updated_at = now()
      WHERE id = p_product_id;
    INSERT INTO public.goods_movements (kind, product_id, supplier_id, qty, unit_mmk, total_mmk, cost_mmk, note, occurred_on)
    VALUES ('recall', p_product_id, p_supplier_id, p_qty, 0, 0, 0, coalesce(p_note, ''), coalesce(p_occurred_on, CURRENT_DATE))
    RETURNING id INTO v_id;

  ELSIF p_kind = 'sale' THEN
    IF p_customer_id IS NULL THEN
      RAISE EXCEPTION '请选择客户';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.goods_customers WHERE id = p_customer_id) THEN
      RAISE EXCEPTION '没有这个客户';
    END IF;
    IF p_unit_mmk IS NULL THEN
      RAISE EXCEPTION '请填写售价';
    END IF;
    v_total := p_qty::bigint * p_unit_mmk;
    v_cost := p_qty::bigint * v_product.cost_mmk;
    IF p_supplier_id IS NOT NULL THEN
      SELECT qty INTO v_held
      FROM public.goods_supplier_stock
      WHERE product_id = p_product_id AND supplier_id = p_supplier_id
      FOR UPDATE;
      IF v_held IS NULL OR v_held < p_qty THEN
        RAISE EXCEPTION '这个供应商手里的货不够';
      END IF;
      UPDATE public.goods_supplier_stock
        SET qty = qty - p_qty
        WHERE product_id = p_product_id AND supplier_id = p_supplier_id;
      DELETE FROM public.goods_supplier_stock
        WHERE product_id = p_product_id AND supplier_id = p_supplier_id AND qty = 0;
      UPDATE public.goods_products
        SET qty_with_supplier = qty_with_supplier - p_qty,
            updated_at = now()
        WHERE id = p_product_id;
    ELSE
      IF v_product.qty_on_hand < p_qty THEN
        RAISE EXCEPTION '手上的货不够';
      END IF;
      UPDATE public.goods_products
        SET qty_on_hand = qty_on_hand - p_qty,
            updated_at = now()
        WHERE id = p_product_id;
    END IF;
    INSERT INTO public.goods_movements (kind, product_id, supplier_id, customer_id, qty, unit_mmk, total_mmk, cost_mmk, note, occurred_on)
    VALUES ('sale', p_product_id, p_supplier_id, p_customer_id, p_qty, p_unit_mmk, v_total, v_cost, coalesce(p_note, ''), coalesce(p_occurred_on, CURRENT_DATE))
    RETURNING id INTO v_id;
  ELSE
    RAISE EXCEPTION '未知类型';
  END IF;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.goods_apply_movement(text, uuid, uuid, uuid, integer, bigint, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.goods_apply_movement(text, uuid, uuid, uuid, integer, bigint, text, date) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'goods-images',
  'goods-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS goods_images_insert ON storage.objects;
CREATE POLICY goods_images_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'goods-images');

DROP POLICY IF EXISTS goods_images_select ON storage.objects;
CREATE POLICY goods_images_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'goods-images');

DROP POLICY IF EXISTS goods_images_update ON storage.objects;
CREATE POLICY goods_images_update ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'goods-images')
  WITH CHECK (bucket_id = 'goods-images');

DROP POLICY IF EXISTS goods_images_delete ON storage.objects;
CREATE POLICY goods_images_delete ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'goods-images');

NOTIFY pgrst, 'reload schema';
