/*
  Warnings:

  - You are about to drop the column `targetLevel` on the `LiveInterview` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL', 'BEHAVIOURAL', 'MIXED');

-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('INTERN', 'ENTRY_LEVEL', 'JUNIOR', 'ASSOCIATE', 'MID_LEVEL', 'SENIOR', 'LEAD', 'PRINCIPAL', 'STAFF', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'EXECUTIVE');

-- AlterTable
ALTER TABLE "LiveInterview" DROP COLUMN "targetLevel",
ADD COLUMN     "jobLevel" "JobLevel",
ADD COLUMN     "type" "InterviewType";
