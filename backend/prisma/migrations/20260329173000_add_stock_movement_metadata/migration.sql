ALTER TABLE "stock_movement"
ADD COLUMN "reference_type" TEXT,
ADD COLUMN "reference_id" BIGINT,
ADD COLUMN "reference_code" TEXT,
ADD COLUMN "display_quantity" NUMERIC(18, 3),
ADD COLUMN "display_unit" TEXT;
