/*
  Warnings:

  - You are about to drop the `Coalition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Donation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `coalitionId` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Coalition_name_key";

-- DropIndex
DROP INDEX "Donation_transactionHash_key";

-- DropIndex
DROP INDEX "TaskParticipant_taskId_userId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Coalition";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Comment";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Donation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TaskParticipant";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "intraId" INTEGER,
    "googleId" TEXT,
    "suiWalletAddress" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "email", "firstName", "googleId", "id", "intraId", "lastName", "role", "suiWalletAddress", "updatedAt", "username") SELECT "avatar", "createdAt", "email", "firstName", "googleId", "id", "intraId", "lastName", "role", "suiWalletAddress", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_intraId_key" ON "User"("intraId");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
