-- Backfill existing users so email verification does not lock them out
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
