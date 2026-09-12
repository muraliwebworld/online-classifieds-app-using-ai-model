CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT, "price" DECIMAL(12,2) NOT NULL,
  "interval" TEXT NOT NULL DEFAULT 'monthly', "active" BOOLEAN NOT NULL DEFAULT true,
  "features" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");
CREATE TABLE "UserSubscription" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active', "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserSubscription_userId_status_idx" ON "UserSubscription"("userId", "status");
CREATE TABLE "MessageThread" (
  "id" TEXT NOT NULL, "listingId" TEXT NOT NULL, "buyerId" TEXT NOT NULL, "sellerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageThread_listingId_buyerId_sellerId_key" ON "MessageThread"("listingId", "buyerId", "sellerId");
CREATE TABLE "Message" (
  "id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "senderId" TEXT NOT NULL, "receiverId" TEXT NOT NULL,
  "body" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");
CREATE TABLE "ThemeSetting" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ThemeSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ThemeSetting_key_key" ON "ThemeSetting"("key");
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
