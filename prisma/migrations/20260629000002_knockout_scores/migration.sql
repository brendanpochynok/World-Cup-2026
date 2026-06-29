-- AlterTable
ALTER TABLE "KnockoutMatch" ADD COLUMN "homeScore" INTEGER;
ALTER TABLE "KnockoutMatch" ADD COLUMN "awayScore" INTEGER;
ALTER TABLE "KnockoutMatch" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'scheduled';
