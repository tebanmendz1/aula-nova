ALTER TABLE "Resource" ADD COLUMN "topicId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "topicId" TEXT;
CREATE INDEX "Resource_topicId_idx" ON "Resource"("topicId");
CREATE INDEX "Activity_topicId_idx" ON "Activity"("topicId");
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
