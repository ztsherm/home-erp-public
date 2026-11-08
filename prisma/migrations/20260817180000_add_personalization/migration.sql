CREATE TABLE "SavedFilter" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pageKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecentRecord" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecentRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SavedFilter_userId_pageKey_name_key" ON "SavedFilter"("userId", "pageKey", "name");
CREATE INDEX "SavedFilter_householdId_userId_pageKey_idx" ON "SavedFilter"("householdId", "userId", "pageKey");
CREATE UNIQUE INDEX "Favorite_userId_href_key" ON "Favorite"("userId", "href");
CREATE INDEX "Favorite_householdId_userId_createdAt_idx" ON "Favorite"("householdId", "userId", "createdAt");
CREATE UNIQUE INDEX "RecentRecord_userId_href_key" ON "RecentRecord"("userId", "href");
CREATE INDEX "RecentRecord_householdId_userId_viewedAt_idx" ON "RecentRecord"("householdId", "userId", "viewedAt");
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentRecord" ADD CONSTRAINT "RecentRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentRecord" ADD CONSTRAINT "RecentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
