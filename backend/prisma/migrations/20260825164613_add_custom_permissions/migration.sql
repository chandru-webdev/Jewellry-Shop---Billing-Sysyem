-- AlterTable: Add customPermissions column to User table
ALTER TABLE "User" ADD COLUMN "customPermissions" JSONB;
