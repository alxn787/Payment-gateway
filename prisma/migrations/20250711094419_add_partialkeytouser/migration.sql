/*
  Warnings:

  - You are about to drop the `PartialKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PartialKey" DROP CONSTRAINT "PartialKey_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partialKey" TEXT;

-- DropTable
DROP TABLE "PartialKey";
