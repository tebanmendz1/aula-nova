CREATE TYPE "InvitationMode" AS ENUM ('SINGLE_USE', 'REUSABLE', 'CLOSED');
ALTER TABLE "Classroom" ADD COLUMN "invitationMode" "InvitationMode" NOT NULL DEFAULT 'SINGLE_USE';
