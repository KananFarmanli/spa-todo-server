-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Queue', 'Development', 'Done');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'Queue';
