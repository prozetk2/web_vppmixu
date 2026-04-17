CREATE TABLE "customer_payment" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT,
    "customer_id" BIGINT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT,
    "collector" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_payment_code_key"
ON "customer_payment"("code");

ALTER TABLE "customer_payment"
ADD CONSTRAINT "customer_payment_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_payment_allocation" (
    "id" BIGSERIAL NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payment_allocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_payment_allocation_payment_id_invoice_id_key"
ON "customer_payment_allocation"("payment_id", "invoice_id");

CREATE INDEX "customer_payment_allocation_payment_id_idx"
ON "customer_payment_allocation"("payment_id");

CREATE INDEX "customer_payment_allocation_invoice_id_idx"
ON "customer_payment_allocation"("invoice_id");

ALTER TABLE "customer_payment_allocation"
ADD CONSTRAINT "customer_payment_allocation_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "customer_payment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_payment_allocation"
ADD CONSTRAINT "customer_payment_allocation_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
