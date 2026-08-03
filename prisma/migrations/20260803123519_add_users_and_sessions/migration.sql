/*
  Warnings:

  - Added the required column `userId` to the `ClothingItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Outfit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Seed a default account (chosen and confirmed by the user) to own any pre-existing wardrobe data.
-- Username: me / Password: closet123
INSERT INTO "User" ("id", "username", "passwordHash") VALUES ('default-user-0001', 'me', '$2b$10$PROBtqJW8UhIVkBn6Jw4depf.nq6mNVTG00lgJrWVoPXx3AOlQNMW');

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClothingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "pattern" TEXT,
    "season" TEXT NOT NULL,
    "formality" INTEGER,
    "material" TEXT,
    "brand" TEXT,
    "notes" TEXT,
    "aiTagged" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" REAL,
    "aiRawResponse" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "needsWash" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClothingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClothingItem" ("aiConfidence", "aiRawResponse", "aiTagged", "brand", "category", "createdAt", "displayPath", "favorite", "formality", "id", "imagePath", "material", "needsWash", "notes", "pattern", "primaryColor", "season", "secondaryColor", "status", "subcategory", "updatedAt", "userId") SELECT "aiConfidence", "aiRawResponse", "aiTagged", "brand", "category", "createdAt", "displayPath", "favorite", "formality", "id", "imagePath", "material", "needsWash", "notes", "pattern", "primaryColor", "season", "secondaryColor", "status", "subcategory", "updatedAt", 'default-user-0001' FROM "ClothingItem";
DROP TABLE "ClothingItem";
ALTER TABLE "new_ClothingItem" RENAME TO "ClothingItem";
CREATE TABLE "new_Outfit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "occasion" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiReasoning" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Outfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Outfit" ("aiGenerated", "aiReasoning", "createdAt", "favorite", "id", "name", "occasion", "userId") SELECT "aiGenerated", "aiReasoning", "createdAt", "favorite", "id", "name", "occasion", 'default-user-0001' FROM "Outfit";
DROP TABLE "Outfit";
ALTER TABLE "new_Outfit" RENAME TO "Outfit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
