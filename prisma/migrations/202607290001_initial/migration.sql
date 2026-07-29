CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE "ClassroomStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "ResourceType" AS ENUM ('DOCUMENT', 'VIDEO', 'LINK', 'AUDIO', 'PRESENTATION');
CREATE TYPE "ActivityType" AS ENUM ('ASSIGNMENT', 'QUIZ', 'FORUM', 'PROJECT');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'STUDENT',
  "avatarUrl" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Classroom" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6d5dfc', "coverUrl" TEXT,
  "inviteCode" TEXT NOT NULL, "status" "ClassroomStatus" NOT NULL DEFAULT 'DRAFT',
  "teacherId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Classroom_inviteCode_key" ON "Classroom"("inviteCode");

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL, "classroomId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE', "progress" INTEGER NOT NULL DEFAULT 0,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Enrollment_classroomId_studentId_key" ON "Enrollment"("classroomId", "studentId");

CREATE TABLE "Module" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false, "classroomId" TEXT NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Module_classroomId_position_key" ON "Module"("classroomId", "position");

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "content" JSONB, "position" INTEGER NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false, "moduleId" TEXT NOT NULL,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Lesson_moduleId_position_key" ON "Lesson"("moduleId", "position");

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "type" "ResourceType" NOT NULL,
  "url" TEXT NOT NULL, "size" INTEGER, "lessonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "type" "ActivityType" NOT NULL, "dueAt" TIMESTAMP(3), "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "lessonId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
  "id" TEXT NOT NULL, "content" TEXT, "fileUrl" TEXT, "score" DOUBLE PRECISION,
  "feedback" TEXT, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gradedAt" TIMESTAMP(3), "activityId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Submission_activityId_studentId_key" ON "Submission"("activityId", "studentId");

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL, "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Module" ADD CONSTRAINT "Module_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
