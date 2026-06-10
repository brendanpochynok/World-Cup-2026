-- CreateTable
CREATE TABLE "FeeVote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeVote_userId_key" ON "FeeVote"("userId");

-- AddForeignKey
ALTER TABLE "FeeVote" ADD CONSTRAINT "FeeVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
