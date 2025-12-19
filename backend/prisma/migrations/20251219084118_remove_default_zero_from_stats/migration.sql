-- AlterTable
ALTER TABLE "customer" ALTER COLUMN "current_debt" DROP DEFAULT,
ALTER COLUMN "debt_days" DROP DEFAULT,
ALTER COLUMN "total_sales" DROP DEFAULT,
ALTER COLUMN "total_sales_after_return" DROP DEFAULT;
