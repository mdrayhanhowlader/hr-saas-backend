-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'BIOMETRIC', 'MOBILE', 'WEB');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('FINGERPRINT', 'FACE', 'CARD', 'PIN');

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "biometricId" TEXT;

-- CreateTable
CREATE TABLE "biometric_devices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL DEFAULT 'FINGERPRINT',
    "location" TEXT,
    "ipAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_devices_deviceId_key" ON "biometric_devices"("deviceId");

-- AddForeignKey
ALTER TABLE "biometric_devices" ADD CONSTRAINT "biometric_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
