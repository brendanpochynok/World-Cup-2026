-- CreateTable
CREATE TABLE "KnockoutMatch" (
    "id" SERIAL NOT NULL,
    "round" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "home" TEXT,
    "away" TEXT,
    "kickoff" TIMESTAMP(3),

    CONSTRAINT "KnockoutMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnockoutMatch_round_slot_key" ON "KnockoutMatch"("round", "slot");
