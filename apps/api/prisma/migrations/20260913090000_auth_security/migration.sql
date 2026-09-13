ALTER TABLE "User" ADD COLUMN "firebaseUid" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorReminderDismissedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
