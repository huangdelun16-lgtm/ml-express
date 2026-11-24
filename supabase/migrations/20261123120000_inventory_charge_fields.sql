-- 收费方式和收费公斤单独记下。weight 仍是秤上的实际重量，出口成本继续只用它。

ALTER TABLE inventory_store_items
  ADD COLUMN IF NOT EXISTS charge_basis text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS charge_weight_kg numeric;

COMMENT ON COLUMN inventory_store_items.charge_basis IS 'volume 或 weight。空表示旧单还没记下。';
COMMENT ON COLUMN inventory_store_items.charge_weight_kg IS '用来收费的公斤。出口成本不要读这一列。';

CREATE OR REPLACE FUNCTION public.inventory_apply_charge_note()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  src text := COALESCE(NEW.note, '');
  kg_text text;
BEGIN
  IF src !~ '收费' THEN
    RETURN NEW;
  END IF;
  IF NULLIF(BTRIM(COALESCE(NEW.weight, '')), '') IS NULL
     AND NULLIF(BTRIM(COALESCE(NEW.spec, '')), '') IS NULL THEN
    RETURN NEW;
  END IF;
  IF src ~ '收费体积' THEN
    NEW.charge_basis := 'volume';
  ELSIF src ~ '收费重量' THEN
    NEW.charge_basis := 'weight';
  END IF;
  kg_text := substring(src from '收费(?:体积|重量)[[:space:]]+([0-9]+(?:[.][0-9]+)?)');
  IF kg_text IS NOT NULL AND kg_text <> '' THEN
    NEW.charge_weight_kg := kg_text::numeric;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_store_items_charge_note ON inventory_store_items;
CREATE TRIGGER inventory_store_items_charge_note
  BEFORE INSERT OR UPDATE OF note ON inventory_store_items
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_apply_charge_note();

CREATE OR REPLACE FUNCTION public.inventory_copy_charge_from_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src text := COALESCE(NEW.note, '');
  basis text := '';
  kg_text text;
  kg numeric := NULL;
BEGIN
  IF src !~ '收费' THEN
    RETURN NEW;
  END IF;
  IF src ~ '收费体积' THEN
    basis := 'volume';
  ELSIF src ~ '收费重量' THEN
    basis := 'weight';
  END IF;
  kg_text := substring(src from '收费(?:体积|重量)[[:space:]]+([0-9]+(?:[.][0-9]+)?)');
  IF kg_text IS NOT NULL AND kg_text <> '' THEN
    kg := kg_text::numeric;
  END IF;
  IF basis <> '' OR kg IS NOT NULL THEN
    UPDATE inventory_store_items
    SET
      charge_basis = CASE WHEN basis <> '' THEN basis ELSE charge_basis END,
      charge_weight_kg = COALESCE(kg, charge_weight_kg)
    WHERE id = NEW.item_id
      AND (
        NULLIF(BTRIM(COALESCE(weight, '')), '') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(spec, '')), '') IS NOT NULL
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_stock_movements_charge_note ON inventory_stock_movements;
CREATE TRIGGER inventory_stock_movements_charge_note
  AFTER INSERT OR UPDATE OF note ON inventory_stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_copy_charge_from_movement();

REVOKE ALL ON FUNCTION public.inventory_copy_charge_from_movement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inventory_copy_charge_from_movement() TO authenticated, service_role;

UPDATE inventory_store_items AS item
SET
  charge_basis = CASE
    WHEN picked.note ~ '收费体积' THEN 'volume'
    WHEN picked.note ~ '收费重量' THEN 'weight'
    ELSE item.charge_basis
  END,
  charge_weight_kg = COALESCE(
    (substring(picked.note from '收费(?:体积|重量)[[:space:]]+([0-9]+(?:[.][0-9]+)?)'))::numeric,
    item.charge_weight_kg
  )
FROM (
  SELECT DISTINCT ON (item_id) item_id, note
  FROM inventory_stock_movements
  WHERE note ~ '收费(体积|重量)'
  ORDER BY item_id, created_at DESC
) AS picked
WHERE item.id = picked.item_id
  AND (
    NULLIF(BTRIM(COALESCE(item.weight, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(item.spec, '')), '') IS NOT NULL
  );

UPDATE inventory_store_items
SET
  charge_basis = CASE
    WHEN note ~ '收费体积' THEN 'volume'
    WHEN note ~ '收费重量' THEN 'weight'
    ELSE charge_basis
  END,
  charge_weight_kg = COALESCE(
    (substring(note from '收费(?:体积|重量)[[:space:]]+([0-9]+(?:[.][0-9]+)?)'))::numeric,
    charge_weight_kg
  )
WHERE note ~ '收费(体积|重量)'
  AND (
    NULLIF(BTRIM(COALESCE(weight, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(spec, '')), '') IS NOT NULL
  );
