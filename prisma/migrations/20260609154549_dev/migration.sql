-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "hashedRefreshToken" TEXT,
    "quitReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "motivation" TEXT,
    "priorQuitAttempts" TEXT,
    "primaryInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "username" TEXT,
    "sex" TEXT,
    "country" TEXT,
    "countryFlag" TEXT,
    "currency" TEXT,
    "quitDatePreset" TEXT,
    "quitDate" TIMESTAMPTZ(3),
    "streakStart" TIMESTAMPTZ(3),
    "cigarettesPerDay" INTEGER,
    "cigarettesPerDayNote" TEXT,
    "packPrice" TEXT,
    "yearsSmoking" TEXT,
    "cigarettesPerPack" INTEGER,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "slip_events" (
    "slip_event_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "cigarettesCount" INTEGER,
    "previousStreakStart" TIMESTAMPTZ(3),
    "loggedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slip_events_pkey" PRIMARY KEY ("slip_event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "slip_events" ADD CONSTRAINT "slip_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
