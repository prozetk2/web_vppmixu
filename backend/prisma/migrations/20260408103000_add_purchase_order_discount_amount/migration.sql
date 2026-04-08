ALTER TABLE "purchase_order"
ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC DEFAULT 0;
