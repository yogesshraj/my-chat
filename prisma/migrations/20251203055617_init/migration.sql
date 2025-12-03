-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromUser" TEXT NOT NULL,
    "toUser" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_fromUser_toUser_idx" ON "Message"("fromUser", "toUser");

-- CreateIndex
CREATE INDEX "Message_toUser_fromUser_idx" ON "Message"("toUser", "fromUser");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
