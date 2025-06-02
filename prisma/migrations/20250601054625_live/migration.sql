-- CreateTable
CREATE TABLE "LiveInterview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "targetRole" TEXT,
    "targetLevel" TEXT,
    "resumeText" TEXT,
    "transcript" TEXT,
    "feedback" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveInterview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LiveInterview" ADD CONSTRAINT "LiveInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
