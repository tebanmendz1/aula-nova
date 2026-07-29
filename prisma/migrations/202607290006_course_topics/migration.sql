CREATE TABLE "Topic" ("id" TEXT NOT NULL,"title" TEXT NOT NULL,"description" TEXT,"position" INTEGER NOT NULL,"lessonId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Topic_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Topic_lessonId_position_key" ON "Topic"("lessonId","position");
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
