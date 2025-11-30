-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "intraId" INTEGER,
    "googleId" TEXT,
    "suiWalletAddress" TEXT,
    "profileId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "realWalletAddress" TEXT,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "tasksParticipated" INTEGER NOT NULL DEFAULT 0,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "donationsCount" INTEGER NOT NULL DEFAULT 0,
    "totalDonated" BIGINT NOT NULL DEFAULT 0,
    "reputationScore" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "NFTAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nftObjectId" TEXT,
    "achievementType" TEXT NOT NULL,
    "taskId" TEXT,
    "metadataUrl" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NFTAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_intraId_key" ON "User"("intraId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "NFTAchievement_nftObjectId_key" ON "NFTAchievement"("nftObjectId");
