-- CreateTable
CREATE TABLE "TiebreakerPick" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamOrder" TEXT NOT NULL,

    CONSTRAINT "TiebreakerPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TiebreakerPick_userId_groupId_key" ON "TiebreakerPick"("userId", "groupId");

-- AddForeignKey
ALTER TABLE "TiebreakerPick" ADD CONSTRAINT "TiebreakerPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
