-- ============================================================
-- Migration corrective : synchronisation schema.prisma ↔ DB
-- Problèmes corrigés :
--   1. alerts.asset_id : NOT NULL → nullable
--   2. alerts.location_id : colonne absente → ajoutée
--   3. alerts FK asset_id : RESTRICT → SET NULL (cohérent avec nullable)
--   4. asset_movements.from_location_id : NOT NULL → nullable
--   5. asset_movements.user_id : colonne absente → ajoutée
--   6. asset_movements.scan_id : colonne absente → ajoutée
-- ============================================================

-- -----------------------------------------------------------
-- 1. alerts : rendre asset_id nullable
-- -----------------------------------------------------------
ALTER TABLE "alerts" ALTER COLUMN "asset_id" DROP NOT NULL;

-- -----------------------------------------------------------
-- 2. alerts : ajouter la colonne location_id (nullable)
-- -----------------------------------------------------------
ALTER TABLE "alerts" ADD COLUMN "location_id" UUID;

-- -----------------------------------------------------------
-- 3. alerts FK asset_id : recréer en SET NULL (nullable)
-- -----------------------------------------------------------
ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "alerts_asset_id_fkey";
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------
-- 4. alerts FK location_id : nouvelle contrainte
-- -----------------------------------------------------------
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------
-- 5. asset_movements : rendre from_location_id nullable
-- -----------------------------------------------------------
ALTER TABLE "asset_movements" ALTER COLUMN "from_location_id" DROP NOT NULL;

-- -----------------------------------------------------------
-- 6. asset_movements : recréer FK from_location_id en SET NULL
-- -----------------------------------------------------------
ALTER TABLE "asset_movements" DROP CONSTRAINT IF EXISTS "asset_movements_from_location_id_fkey";
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_location_id_fkey"
    FOREIGN KEY ("from_location_id") REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------
-- 7. asset_movements : ajouter user_id (nullable initialement
--    pour éviter de casser les lignes existantes)
-- -----------------------------------------------------------
ALTER TABLE "asset_movements" ADD COLUMN "user_id" UUID;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------
-- 8. asset_movements : ajouter scan_id (nullable)
-- -----------------------------------------------------------
ALTER TABLE "asset_movements" ADD COLUMN "scan_id" UUID;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_scan_id_fkey"
    FOREIGN KEY ("scan_id") REFERENCES "scans"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
