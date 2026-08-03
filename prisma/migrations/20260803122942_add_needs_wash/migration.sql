-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClothingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ClothingItem" ("aiConfidence", "aiRawResponse", "aiTagged", "brand", "category", "createdAt", "displayPath", "favorite", "formality", "id", "imagePath", "material", "notes", "pattern", "primaryColor", "season", "secondaryColor", "status", "subcategory", "updatedAt") SELECT "aiConfidence", "aiRawResponse", "aiTagged", "brand", "category", "createdAt", "displayPath", "favorite", "formality", "id", "imagePath", "material", "notes", "pattern", "primaryColor", "season", "secondaryColor", "status", "subcategory", "updatedAt" FROM "ClothingItem";
DROP TABLE "ClothingItem";
ALTER TABLE "new_ClothingItem" RENAME TO "ClothingItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
