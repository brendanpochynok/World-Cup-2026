ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Grant admin access to poch
UPDATE "User" SET "isAdmin" = true WHERE "username" = 'poch';
