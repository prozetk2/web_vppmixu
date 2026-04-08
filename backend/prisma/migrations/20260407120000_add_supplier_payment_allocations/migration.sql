CREATE TABLE "supplier_payment_allocation" (
    "id" BIGSERIAL NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "purchase_order_id" BIGINT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payment_allocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_payment_allocation_payment_id_purchase_order_id_key"
ON "supplier_payment_allocation"("payment_id", "purchase_order_id");

CREATE INDEX "supplier_payment_allocation_payment_id_idx"
ON "supplier_payment_allocation"("payment_id");

CREATE INDEX "supplier_payment_allocation_purchase_order_id_idx"
ON "supplier_payment_allocation"("purchase_order_id");

ALTER TABLE "supplier_payment_allocation"
ADD CONSTRAINT "supplier_payment_allocation_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "supplier_payment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_payment_allocation"
ADD CONSTRAINT "supplier_payment_allocation_purchase_order_id_fkey"
FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
