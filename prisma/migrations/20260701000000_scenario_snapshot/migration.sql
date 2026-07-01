-- CreateTable
CREATE TABLE "ScenarioSnapshot" (
    "id" SERIAL NOT NULL,
    "signature" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioSnapshot_signature_key" ON "ScenarioSnapshot"("signature");
