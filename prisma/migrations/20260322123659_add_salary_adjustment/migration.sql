-- CreateTable
CREATE TABLE "salary_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "previousSalary" DECIMAL(65,30) NOT NULL,
    "newSalary" DECIMAL(65,30) NOT NULL,
    "adjustmentType" TEXT NOT NULL DEFAULT 'INCREMENT',
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_adjustments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "salary_adjustments" ADD CONSTRAINT "salary_adjustments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_adjustments" ADD CONSTRAINT "salary_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
