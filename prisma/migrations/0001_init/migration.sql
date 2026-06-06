-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'SUPPORT', 'PRODUCT_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK_1', 'TASK_2');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'TESTING', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('VALID', 'REPAIRED', 'INVALID');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "authProvider" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "dailyQuota" INTEGER NOT NULL DEFAULT 5,
    "monthlyQuota" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "questionPrompt" TEXT NOT NULL,
    "essayText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WritingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptId" TEXT,
    "promptVersion" TEXT,
    "overallBand" DOUBLE PRECISION NOT NULL,
    "overallBandRaw" DOUBLE PRECISION NOT NULL,
    "taskAchievementScore" DOUBLE PRECISION,
    "taskResponseScore" DOUBLE PRECISION,
    "coherenceAndCohesionScore" DOUBLE PRECISION NOT NULL,
    "lexicalResourceScore" DOUBLE PRECISION NOT NULL,
    "grammaticalRangeAndAccuracyScore" DOUBLE PRECISION NOT NULL,
    "resultJson" JSONB NOT NULL,
    "rawModelOutput" TEXT NOT NULL,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'VALID',
    "modelConfidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorCorrection" (
    "id" TEXT NOT NULL,
    "scoringResultId" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "subcriterion" TEXT,
    "tag" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "paragraphIndex" INTEGER,
    "sentenceIndex" INTEGER,
    "originalText" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "impactOnScore" TEXT,
    "suggestedLearningFocus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPrompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "taskType" "TaskType",
    "modelProvider" TEXT NOT NULL DEFAULT 'gemini',
    "modelName" TEXT NOT NULL,
    "systemInstruction" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "outputSchema" JSONB,
    "generationConfig" JSONB,
    "status" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "AIPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTestRun" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "testName" TEXT,
    "sampleSubmissionId" TEXT,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "expectedScore" DOUBLE PRECISION,
    "actualScore" DOUBLE PRECISION,
    "scoreDiff" DOUBLE PRECISION,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCostVnd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "submissionId" TEXT,
    "scoringResultId" TEXT,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptId" TEXT,
    "promptVersion" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "thinkingTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cachedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thinkingCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exchangeRateUsdVnd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostVnd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" "UsageStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelPricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "inputPricePer1mTokens" DOUBLE PRECISION NOT NULL,
    "outputPricePer1mTokens" DOUBLE PRECISION NOT NULL,
    "cachedInputPricePer1mTokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIModelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "targetCurrency" TEXT NOT NULL DEFAULT 'VND',
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelRoutingRule" (
    "id" TEXT NOT NULL,
    "planCode" TEXT NOT NULL DEFAULT 'FREE',
    "taskType" "TaskType",
    "featureCode" TEXT NOT NULL DEFAULT 'scoring',
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "modelName" TEXT NOT NULL,
    "promptId" TEXT,
    "generationConfig" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModelRoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "WritingSubmission_userId_idx" ON "WritingSubmission"("userId");

-- CreateIndex
CREATE INDEX "WritingSubmission_status_idx" ON "WritingSubmission"("status");

-- CreateIndex
CREATE INDEX "WritingSubmission_taskType_idx" ON "WritingSubmission"("taskType");

-- CreateIndex
CREATE INDEX "WritingSubmission_createdAt_idx" ON "WritingSubmission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringResult_submissionId_key" ON "ScoringResult"("submissionId");

-- CreateIndex
CREATE INDEX "ScoringResult_promptId_idx" ON "ScoringResult"("promptId");

-- CreateIndex
CREATE INDEX "ScoringResult_overallBand_idx" ON "ScoringResult"("overallBand");

-- CreateIndex
CREATE INDEX "ErrorCorrection_scoringResultId_idx" ON "ErrorCorrection"("scoringResultId");

-- CreateIndex
CREATE INDEX "ErrorCorrection_tag_idx" ON "ErrorCorrection"("tag");

-- CreateIndex
CREATE INDEX "AIPrompt_code_idx" ON "AIPrompt"("code");

-- CreateIndex
CREATE INDEX "AIPrompt_status_idx" ON "AIPrompt"("status");

-- CreateIndex
CREATE INDEX "AIPrompt_taskType_idx" ON "AIPrompt"("taskType");

-- CreateIndex
CREATE UNIQUE INDEX "AIPrompt_code_version_key" ON "AIPrompt"("code", "version");

-- CreateIndex
CREATE INDEX "PromptTestRun_promptId_idx" ON "PromptTestRun"("promptId");

-- CreateIndex
CREATE INDEX "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AIUsageLog_submissionId_idx" ON "AIUsageLog"("submissionId");

-- CreateIndex
CREATE INDEX "AIUsageLog_modelName_idx" ON "AIUsageLog"("modelName");

-- CreateIndex
CREATE INDEX "AIUsageLog_promptVersion_idx" ON "AIUsageLog"("promptVersion");

-- CreateIndex
CREATE INDEX "AIUsageLog_status_idx" ON "AIUsageLog"("status");

-- CreateIndex
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIModelPricing_provider_modelName_idx" ON "AIModelPricing"("provider", "modelName");

-- CreateIndex
CREATE INDEX "AIModelPricing_effectiveFrom_idx" ON "AIModelPricing"("effectiveFrom");

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_targetCurrency_effectiveDate_idx" ON "ExchangeRate"("baseCurrency", "targetCurrency", "effectiveDate");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "AIModelRoutingRule_planCode_taskType_featureCode_isActive_idx" ON "AIModelRoutingRule"("planCode", "taskType", "featureCode", "isActive");

-- AddForeignKey
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringResult" ADD CONSTRAINT "ScoringResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WritingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringResult" ADD CONSTRAINT "ScoringResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "AIPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCorrection" ADD CONSTRAINT "ErrorCorrection_scoringResultId_fkey" FOREIGN KEY ("scoringResultId") REFERENCES "ScoringResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTestRun" ADD CONSTRAINT "PromptTestRun_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "AIPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WritingSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

