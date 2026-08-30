-- 商家代收款结清方：后台与商家共用 cod_settled，补上是谁结的，避免两边各结各的后对不上
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS cod_settled_by text,
  ADD COLUMN IF NOT EXISTS cod_settled_by_id text,
  ADD COLUMN IF NOT EXISTS cod_settled_by_name text;

COMMENT ON COLUMN public.packages.cod_settled_by IS
  '商家代收款结清方：admin | merchant';
COMMENT ON COLUMN public.packages.cod_settled_by_id IS
  '结清操作者 ID（后台用户名或店铺/商家 ID）';
COMMENT ON COLUMN public.packages.cod_settled_by_name IS
  '结清操作者显示名';

CREATE INDEX IF NOT EXISTS idx_packages_cod_settled_by
  ON public.packages (cod_settled_by)
  WHERE cod_settled IS TRUE;
