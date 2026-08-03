-- CreateTable
CREATE TABLE "ClothingItem" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "occasion" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiReasoning" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OutfitItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outfitId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutfitItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WearLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wornAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT,
    "outfitId" TEXT,
    CONSTRAINT "WearLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WearLog_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OutfitItem_outfitId_itemId_key" ON "OutfitItem"("outfitId", "itemId");
