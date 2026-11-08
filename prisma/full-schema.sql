-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'MISSING', 'NEEDS_MAINTENANCE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ITEM_PUTAWAY', 'ITEM_TRANSFER', 'ITEM_CONSUMPTION', 'ITEM_MAINTENANCE', 'ITEM_LOAN');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'TRANSACTION');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RecordFieldKind" AS ENUM ('FREE_TEXT', 'DATE', 'INTEGER', 'CHECKBOX', 'LIST', 'RECORD');

-- CreateEnum
CREATE TYPE "ListSelectionMode" AS ENUM ('SINGLE', 'MULTI');

-- CreateEnum
CREATE TYPE "ReportVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ReportFilterOperator" AS ENUM ('CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'ON_OR_AFTER', 'ON_OR_BEFORE', 'LAST_7_DAYS', 'LAST_30_DAYS', 'IS_EMPTY', 'IS_NOT_EMPTY');

-- CreateEnum
CREATE TYPE "ReportFilterRole" AS ENUM ('CRITERIA', 'FILTER');

-- CreateEnum
CREATE TYPE "WorkflowScript" AS ENUM ('GENERATE_SCHEDULED_ITEM_TASKS');

-- CreateEnum
CREATE TYPE "WorkflowCadence" AS ENUM ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "peopleId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentRecord" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "upc" TEXT,
    "minQuantity" DECIMAL(12,2),
    "targetQuantity" DECIMAL(12,2),
    "purchasePrice" DECIMAL(12,2),
    "purchaseDate" TIMESTAMP(3),
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLocation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPutaway" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemLocationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemPutaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTransfer" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromItemLocationId" TEXT NOT NULL,
    "toItemLocationId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemConsumption" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemLocationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMaintenance" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "vendor" TEXT,
    "cost" DECIMAL(12,2),
    "notes" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLoan" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "conditionNotes" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "relatedRecordTypeId" TEXT NOT NULL,
    "relatedRecordId" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "People" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationshipTypeOptionId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "profilePhotoUrl" TEXT,
    "friendOfPeopleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "birthday" TIMESTAMP(3),
    "anniversary" TIMESTAMP(3),
    "employer" TEXT,
    "jobTitle" TEXT,
    "interestOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "pin" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "People_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSchedule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "assignedToId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTaskSchedule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "taskScheduleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemTaskSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "taskScheduleId" TEXT,
    "assignedToId" TEXT,
    "completedById" TEXT,
    "maintenanceRecordId" TEXT,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "nextTaskDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "peopleId" TEXT,
    "action" "ActivityAction" NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "script" "WorkflowScript" NOT NULL,
    "cadence" "WorkflowCadence" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" "WorkflowRunStatus",
    "lastSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" TEXT,
    "error" TEXT,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordType" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "systemType" BOOLEAN NOT NULL DEFAULT false,
    "editableRecords" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordField" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "recordTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "RecordFieldKind" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "listId" TEXT,
    "relatedRecordTypeId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppList" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "selectionMode" "ListSelectionMode" NOT NULL DEFAULT 'SINGLE',
    "allowAddOnRecord" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppListOption" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppListOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseTable" TEXT NOT NULL,
    "visibility" "ReportVisibility" NOT NULL DEFAULT 'PRIVATE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportColumn" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "columnKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportFilter" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "columnKey" TEXT NOT NULL,
    "operator" "ReportFilterOperator" NOT NULL DEFAULT 'CONTAINS',
    "value" TEXT NOT NULL,
    "role" "ReportFilterRole" NOT NULL DEFAULT 'CRITERIA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Household_slug_key" ON "Household"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_peopleId_key" ON "User"("peopleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

-- CreateIndex
CREATE INDEX "User_householdId_status_idx" ON "User"("householdId", "status");

-- CreateIndex
CREATE INDEX "Favorite_householdId_userId_createdAt_idx" ON "Favorite"("householdId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_href_key" ON "Favorite"("userId", "href");

-- CreateIndex
CREATE INDEX "RecentRecord_householdId_userId_viewedAt_idx" ON "RecentRecord"("householdId", "userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecentRecord_userId_href_key" ON "RecentRecord"("userId", "href");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Location_householdId_idx" ON "Location"("householdId");

-- CreateIndex
CREATE INDEX "Location_householdId_active_idx" ON "Location"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Location_householdId_name_key" ON "Location"("householdId", "name");

-- CreateIndex
CREATE INDEX "Room_householdId_idx" ON "Room"("householdId");

-- CreateIndex
CREATE INDEX "Room_householdId_locationId_idx" ON "Room"("householdId", "locationId");

-- CreateIndex
CREATE INDEX "Room_householdId_active_idx" ON "Room"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Room_householdId_locationId_name_key" ON "Room"("householdId", "locationId", "name");

-- CreateIndex
CREATE INDEX "Area_householdId_idx" ON "Area"("householdId");

-- CreateIndex
CREATE INDEX "Area_householdId_locationId_idx" ON "Area"("householdId", "locationId");

-- CreateIndex
CREATE INDEX "Area_householdId_roomId_idx" ON "Area"("householdId", "roomId");

-- CreateIndex
CREATE INDEX "Area_householdId_active_idx" ON "Area"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Area_householdId_roomId_name_key" ON "Area"("householdId", "roomId", "name");

-- CreateIndex
CREATE INDEX "Item_householdId_idx" ON "Item"("householdId");

-- CreateIndex
CREATE INDEX "Item_householdId_active_idx" ON "Item"("householdId", "active");

-- CreateIndex
CREATE INDEX "Item_householdId_status_idx" ON "Item"("householdId", "status");

-- CreateIndex
CREATE INDEX "Item_householdId_name_idx" ON "Item"("householdId", "name");

-- CreateIndex
CREATE INDEX "Item_householdId_serialNumber_idx" ON "Item"("householdId", "serialNumber");

-- CreateIndex
CREATE INDEX "Item_householdId_upc_idx" ON "Item"("householdId", "upc");

-- CreateIndex
CREATE INDEX "Item_householdId_active_updatedAt_idx" ON "Item"("householdId", "active", "updatedAt");

-- CreateIndex
CREATE INDEX "ItemLocation_householdId_idx" ON "ItemLocation"("householdId");

-- CreateIndex
CREATE INDEX "ItemLocation_householdId_itemId_idx" ON "ItemLocation"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemLocation_householdId_itemId_updatedAt_idx" ON "ItemLocation"("householdId", "itemId", "updatedAt");

-- CreateIndex
CREATE INDEX "ItemLocation_householdId_locationId_idx" ON "ItemLocation"("householdId", "locationId");

-- CreateIndex
CREATE INDEX "ItemLocation_householdId_roomId_idx" ON "ItemLocation"("householdId", "roomId");

-- CreateIndex
CREATE INDEX "ItemLocation_householdId_areaId_idx" ON "ItemLocation"("householdId", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLocation_householdId_itemId_areaId_key" ON "ItemLocation"("householdId", "itemId", "areaId");

-- CreateIndex
CREATE INDEX "ItemPutaway_householdId_idx" ON "ItemPutaway"("householdId");

-- CreateIndex
CREATE INDEX "ItemPutaway_householdId_active_idx" ON "ItemPutaway"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemPutaway_householdId_itemId_idx" ON "ItemPutaway"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemPutaway_householdId_itemId_createdAt_idx" ON "ItemPutaway"("householdId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemPutaway_householdId_itemLocationId_idx" ON "ItemPutaway"("householdId", "itemLocationId");

-- CreateIndex
CREATE INDEX "ItemPutaway_householdId_createdAt_idx" ON "ItemPutaway"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPutaway_householdId_transactionNo_key" ON "ItemPutaway"("householdId", "transactionNo");

-- CreateIndex
CREATE INDEX "ItemTransfer_householdId_idx" ON "ItemTransfer"("householdId");

-- CreateIndex
CREATE INDEX "ItemTransfer_householdId_active_idx" ON "ItemTransfer"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemTransfer_householdId_itemId_idx" ON "ItemTransfer"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemTransfer_householdId_itemId_createdAt_idx" ON "ItemTransfer"("householdId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemTransfer_householdId_createdAt_idx" ON "ItemTransfer"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemTransfer_householdId_transactionNo_key" ON "ItemTransfer"("householdId", "transactionNo");

-- CreateIndex
CREATE INDEX "ItemConsumption_householdId_idx" ON "ItemConsumption"("householdId");

-- CreateIndex
CREATE INDEX "ItemConsumption_householdId_active_idx" ON "ItemConsumption"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemConsumption_householdId_itemId_idx" ON "ItemConsumption"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemConsumption_householdId_itemId_createdAt_idx" ON "ItemConsumption"("householdId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemConsumption_householdId_itemLocationId_idx" ON "ItemConsumption"("householdId", "itemLocationId");

-- CreateIndex
CREATE INDEX "ItemConsumption_householdId_createdAt_idx" ON "ItemConsumption"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemConsumption_householdId_transactionNo_key" ON "ItemConsumption"("householdId", "transactionNo");

-- CreateIndex
CREATE INDEX "ItemMaintenance_householdId_idx" ON "ItemMaintenance"("householdId");

-- CreateIndex
CREATE INDEX "ItemMaintenance_householdId_active_idx" ON "ItemMaintenance"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemMaintenance_householdId_itemId_idx" ON "ItemMaintenance"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemMaintenance_householdId_itemId_createdAt_idx" ON "ItemMaintenance"("householdId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemMaintenance_householdId_createdAt_idx" ON "ItemMaintenance"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaintenance_householdId_transactionNo_key" ON "ItemMaintenance"("householdId", "transactionNo");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_idx" ON "ItemLoan"("householdId");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_active_idx" ON "ItemLoan"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_itemId_idx" ON "ItemLoan"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_borrowerId_idx" ON "ItemLoan"("householdId", "borrowerId");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_actualReturnDate_idx" ON "ItemLoan"("householdId", "actualReturnDate");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_createdAt_idx" ON "ItemLoan"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLoan_householdId_transactionNo_key" ON "ItemLoan"("householdId", "transactionNo");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_idx" ON "FileRecord"("householdId");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_active_idx" ON "FileRecord"("householdId", "active");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_relatedRecordTypeId_relatedRecordId_idx" ON "FileRecord"("householdId", "relatedRecordTypeId", "relatedRecordId");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_name_idx" ON "FileRecord"("householdId", "name");

-- CreateIndex
CREATE INDEX "People_householdId_idx" ON "People"("householdId");

-- CreateIndex
CREATE INDEX "People_householdId_active_idx" ON "People"("householdId", "active");

-- CreateIndex
CREATE INDEX "People_householdId_name_idx" ON "People"("householdId", "name");

-- CreateIndex
CREATE INDEX "TaskSchedule_householdId_idx" ON "TaskSchedule"("householdId");

-- CreateIndex
CREATE INDEX "TaskSchedule_householdId_active_idx" ON "TaskSchedule"("householdId", "active");

-- CreateIndex
CREATE INDEX "TaskSchedule_householdId_assignedToId_idx" ON "TaskSchedule"("householdId", "assignedToId");

-- CreateIndex
CREATE INDEX "ItemTaskSchedule_householdId_idx" ON "ItemTaskSchedule"("householdId");

-- CreateIndex
CREATE INDEX "ItemTaskSchedule_householdId_itemId_idx" ON "ItemTaskSchedule"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemTaskSchedule_householdId_taskScheduleId_idx" ON "ItemTaskSchedule"("householdId", "taskScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemTaskSchedule_householdId_itemId_taskScheduleId_key" ON "ItemTaskSchedule"("householdId", "itemId", "taskScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_maintenanceRecordId_key" ON "Task"("maintenanceRecordId");

-- CreateIndex
CREATE INDEX "Task_householdId_idx" ON "Task"("householdId");

-- CreateIndex
CREATE INDEX "Task_householdId_itemId_dueDate_idx" ON "Task"("householdId", "itemId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_householdId_status_idx" ON "Task"("householdId", "status");

-- CreateIndex
CREATE INDEX "Task_householdId_status_assignedToId_dueDate_idx" ON "Task"("householdId", "status", "assignedToId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_householdId_dueDate_idx" ON "Task"("householdId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_householdId_nextTaskDate_idx" ON "Task"("householdId", "nextTaskDate");

-- CreateIndex
CREATE INDEX "Task_householdId_taskScheduleId_idx" ON "Task"("householdId", "taskScheduleId");

-- CreateIndex
CREATE INDEX "Task_householdId_assignedToId_idx" ON "Task"("householdId", "assignedToId");

-- CreateIndex
CREATE INDEX "Task_householdId_completedById_idx" ON "Task"("householdId", "completedById");

-- CreateIndex
CREATE INDEX "ActivityLog_householdId_idx" ON "ActivityLog"("householdId");

-- CreateIndex
CREATE INDEX "ActivityLog_householdId_recordType_idx" ON "ActivityLog"("householdId", "recordType");

-- CreateIndex
CREATE INDEX "ActivityLog_householdId_recordType_recordId_createdAt_idx" ON "ActivityLog"("householdId", "recordType", "recordId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_householdId_action_idx" ON "ActivityLog"("householdId", "action");

-- CreateIndex
CREATE INDEX "ActivityLog_householdId_createdAt_idx" ON "ActivityLog"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "Workflow_householdId_idx" ON "Workflow"("householdId");

-- CreateIndex
CREATE INDEX "Workflow_householdId_active_idx" ON "Workflow"("householdId", "active");

-- CreateIndex
CREATE INDEX "Workflow_householdId_script_idx" ON "Workflow"("householdId", "script");

-- CreateIndex
CREATE INDEX "Workflow_active_nextRunAt_idx" ON "Workflow"("active", "nextRunAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_householdId_idx" ON "WorkflowRun"("householdId");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowRun_householdId_startedAt_idx" ON "WorkflowRun"("householdId", "startedAt");

-- CreateIndex
CREATE INDEX "RecordType_householdId_idx" ON "RecordType"("householdId");

-- CreateIndex
CREATE INDEX "RecordType_householdId_active_idx" ON "RecordType"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RecordType_householdId_key_key" ON "RecordType"("householdId", "key");

-- CreateIndex
CREATE INDEX "RecordField_householdId_idx" ON "RecordField"("householdId");

-- CreateIndex
CREATE INDEX "RecordField_householdId_recordTypeId_idx" ON "RecordField"("householdId", "recordTypeId");

-- CreateIndex
CREATE INDEX "RecordField_householdId_active_idx" ON "RecordField"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RecordField_recordTypeId_key_key" ON "RecordField"("recordTypeId", "key");

-- CreateIndex
CREATE INDEX "AppList_householdId_idx" ON "AppList"("householdId");

-- CreateIndex
CREATE INDEX "AppList_householdId_active_idx" ON "AppList"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AppList_householdId_key_key" ON "AppList"("householdId", "key");

-- CreateIndex
CREATE INDEX "AppListOption_householdId_idx" ON "AppListOption"("householdId");

-- CreateIndex
CREATE INDEX "AppListOption_householdId_listId_idx" ON "AppListOption"("householdId", "listId");

-- CreateIndex
CREATE INDEX "AppListOption_householdId_active_idx" ON "AppListOption"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AppListOption_listId_value_key" ON "AppListOption"("listId", "value");

-- CreateIndex
CREATE INDEX "Report_householdId_idx" ON "Report"("householdId");

-- CreateIndex
CREATE INDEX "Report_householdId_active_name_idx" ON "Report"("householdId", "active", "name");

-- CreateIndex
CREATE INDEX "Report_householdId_active_idx" ON "Report"("householdId", "active");

-- CreateIndex
CREATE INDEX "Report_householdId_visibility_idx" ON "Report"("householdId", "visibility");

-- CreateIndex
CREATE INDEX "Report_ownerUserId_idx" ON "Report"("ownerUserId");

-- CreateIndex
CREATE INDEX "ReportColumn_householdId_idx" ON "ReportColumn"("householdId");

-- CreateIndex
CREATE INDEX "ReportColumn_householdId_reportId_idx" ON "ReportColumn"("householdId", "reportId");

-- CreateIndex
CREATE INDEX "ReportColumn_householdId_active_idx" ON "ReportColumn"("householdId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ReportColumn_reportId_columnKey_key" ON "ReportColumn"("reportId", "columnKey");

-- CreateIndex
CREATE INDEX "ReportFilter_householdId_idx" ON "ReportFilter"("householdId");

-- CreateIndex
CREATE INDEX "ReportFilter_householdId_reportId_idx" ON "ReportFilter"("householdId", "reportId");

-- CreateIndex
CREATE INDEX "ReportFilter_householdId_active_idx" ON "ReportFilter"("householdId", "active");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_peopleId_fkey" FOREIGN KEY ("peopleId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentRecord" ADD CONSTRAINT "RecentRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentRecord" ADD CONSTRAINT "RecentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLocation" ADD CONSTRAINT "ItemLocation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLocation" ADD CONSTRAINT "ItemLocation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLocation" ADD CONSTRAINT "ItemLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLocation" ADD CONSTRAINT "ItemLocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLocation" ADD CONSTRAINT "ItemLocation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPutaway" ADD CONSTRAINT "ItemPutaway_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPutaway" ADD CONSTRAINT "ItemPutaway_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPutaway" ADD CONSTRAINT "ItemPutaway_itemLocationId_fkey" FOREIGN KEY ("itemLocationId") REFERENCES "ItemLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPutaway" ADD CONSTRAINT "ItemPutaway_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_fromItemLocationId_fkey" FOREIGN KEY ("fromItemLocationId") REFERENCES "ItemLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_toItemLocationId_fkey" FOREIGN KEY ("toItemLocationId") REFERENCES "ItemLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_itemLocationId_fkey" FOREIGN KEY ("itemLocationId") REFERENCES "ItemLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMaintenance" ADD CONSTRAINT "ItemMaintenance_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMaintenance" ADD CONSTRAINT "ItemMaintenance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMaintenance" ADD CONSTRAINT "ItemMaintenance_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLoan" ADD CONSTRAINT "ItemLoan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLoan" ADD CONSTRAINT "ItemLoan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLoan" ADD CONSTRAINT "ItemLoan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_relatedRecordTypeId_fkey" FOREIGN KEY ("relatedRecordTypeId") REFERENCES "RecordType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "People" ADD CONSTRAINT "People_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_taskScheduleId_fkey" FOREIGN KEY ("taskScheduleId") REFERENCES "TaskSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskScheduleId_fkey" FOREIGN KEY ("taskScheduleId") REFERENCES "TaskSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "ItemMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_peopleId_fkey" FOREIGN KEY ("peopleId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordType" ADD CONSTRAINT "RecordType_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordField" ADD CONSTRAINT "RecordField_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordField" ADD CONSTRAINT "RecordField_recordTypeId_fkey" FOREIGN KEY ("recordTypeId") REFERENCES "RecordType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordField" ADD CONSTRAINT "RecordField_listId_fkey" FOREIGN KEY ("listId") REFERENCES "AppList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordField" ADD CONSTRAINT "RecordField_relatedRecordTypeId_fkey" FOREIGN KEY ("relatedRecordTypeId") REFERENCES "RecordType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppList" ADD CONSTRAINT "AppList_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppListOption" ADD CONSTRAINT "AppListOption_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppListOption" ADD CONSTRAINT "AppListOption_listId_fkey" FOREIGN KEY ("listId") REFERENCES "AppList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportColumn" ADD CONSTRAINT "ReportColumn_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportColumn" ADD CONSTRAINT "ReportColumn_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFilter" ADD CONSTRAINT "ReportFilter_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFilter" ADD CONSTRAINT "ReportFilter_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
