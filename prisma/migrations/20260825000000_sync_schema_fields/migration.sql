-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CHECKED_IN';

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('CONCERT', 'SPORTS', 'SEMINAR', 'WEBINAR', 'EXHIBITION', 'WORKSHOP', 'FESTIVAL');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "category" "EventCategory" NOT NULL DEFAULT 'CONCERT',
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "checkedInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "snapRedirectUrl" TEXT,
ADD COLUMN     "snapToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
