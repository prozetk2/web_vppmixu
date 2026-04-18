CREATE TABLE "customer_debt_adjustment" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT,
    "customer_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "executor" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_debt_adjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_debt_adjustment_code_key"
ON "customer_debt_adjustment"("code");

CREATE INDEX "customer_debt_adjustment_customer_id_idx"
ON "customer_debt_adjustment"("customer_id");

ALTER TABLE "customer_debt_adjustment"
ADD CONSTRAINT "customer_debt_adjustment_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "supplier_debt_adjustment" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT,
    "supplier_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "executor" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_debt_adjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_debt_adjustment_code_key"
ON "supplier_debt_adjustment"("code");

CREATE INDEX "supplier_debt_adjustment_supplier_id_idx"
ON "supplier_debt_adjustment"("supplier_id");

ALTER TABLE "supplier_debt_adjustment"
ADD CONSTRAINT "supplier_debt_adjustment_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

