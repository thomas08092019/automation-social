-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "appId" TEXT,
ADD COLUMN     "appSecret" TEXT,
ADD COLUMN     "redirectUri" TEXT,
ADD COLUMN     "socialAppId" TEXT;

-- CreateTable
CREATE TABLE "social_apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "appId" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_apps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_apps_platform_appId_userId_key" ON "social_apps"("platform", "appId", "userId");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_socialAppId_fkey" FOREIGN KEY ("socialAppId") REFERENCES "social_apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_apps" ADD CONSTRAINT "social_apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
