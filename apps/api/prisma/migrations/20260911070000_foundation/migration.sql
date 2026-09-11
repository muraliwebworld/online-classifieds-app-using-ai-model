-- Initial classifieds application schema.
-- This migration must run against the dedicated classifieds application database,
-- not the database used by n8n.

CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PUBLISHED', 'REJECTED', 'EXPIRED', 'ARCHIVED');
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVIEW');

CREATE TABLE "User" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL, "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Category" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Location" (
    "id" TEXT NOT NULL, "city" TEXT NOT NULL, "district" TEXT,
    "state" TEXT, "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(10,7), "longitude" DECIMAL(10,7),
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL, "sellerId" TEXT NOT NULL, "categoryId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR',
    "originalTitle" TEXT, "originalDescription" TEXT,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT, "publishedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL, "listingId" TEXT NOT NULL, "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL, "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "listingId")
);
CREATE TABLE "Report" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL, "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiProcessingJob" (
    "id" TEXT NOT NULL, "listingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued', "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");
CREATE INDEX "Listing_categoryId_status_idx" ON "Listing"("categoryId", "status");
CREATE INDEX "Listing_locationId_status_idx" ON "Listing"("locationId", "status");
CREATE INDEX "ListingImage_listingId_sortOrder_idx" ON "ListingImage"("listingId", "sortOrder");
CREATE INDEX "Report_listingId_idx" ON "Report"("listingId");
CREATE INDEX "AiProcessingJob_listingId_status_idx" ON "AiProcessingJob"("listingId", "status");

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiProcessingJob" ADD CONSTRAINT "AiProcessingJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
