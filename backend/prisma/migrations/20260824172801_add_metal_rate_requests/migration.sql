-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "MetalRateRequest" (
    "id" SERIAL NOT NULL,
    "oldRate" DECIMAL(10,2) NOT NULL,
    "newRate" DECIMAL(10,2) NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "previewJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetalRateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetalRateRequest_status_idx" ON "MetalRateRequest"("status");

-- CreateIndex
CREATE INDEX "MetalRateRequest_requestedById_idx" ON "MetalRateRequest"("requestedById");

-- AddForeignKey
ALTER TABLE "MetalRateRequest" ADD CONSTRAINT "MetalRateRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalRateRequest" ADD CONSTRAINT "MetalRateRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
