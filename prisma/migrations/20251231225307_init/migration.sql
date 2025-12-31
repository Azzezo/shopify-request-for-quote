-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "notificationEmail" TEXT NOT NULL DEFAULT '',
    "phoneNumber" TEXT NOT NULL DEFAULT '+353 (0)1 8118920',
    "formTitle" TEXT NOT NULL DEFAULT 'Request a Quote',
    "formDescription" TEXT NOT NULL DEFAULT 'Or feel free to call us',
    "successMessage" TEXT NOT NULL DEFAULT 'Thank you! We will get back to you shortly.',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuoteSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "productVariantId" TEXT,
    "variantTitle" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "requestDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");

-- CreateIndex
CREATE INDEX "QuoteSubmission_shop_idx" ON "QuoteSubmission"("shop");

-- CreateIndex
CREATE INDEX "QuoteSubmission_status_idx" ON "QuoteSubmission"("status");

-- CreateIndex
CREATE INDEX "QuoteSubmission_createdAt_idx" ON "QuoteSubmission"("createdAt");
