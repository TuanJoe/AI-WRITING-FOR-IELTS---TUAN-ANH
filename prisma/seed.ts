import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEFAULT_PROMPT_SYSTEM_INSTRUCTION,
  DEFAULT_PROMPT_USER_TEMPLATE,
  DEFAULT_GENERATION_CONFIG,
} from "./default-prompt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --- Seed admin user ---------------------------------------------------
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL || "admin@ielts-scorer.local"
  ).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "SUPER_ADMIN" },
    create: {
      email: adminEmail,
      passwordHash,
      authProvider: "credentials",
      name: "Super Admin",
      role: "SUPER_ADMIN",
      subscriptionPlan: "UNLIMITED",
      dailyQuota: 100000,
      monthlyQuota: 1000000,
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // --- Demo student ------------------------------------------------------
  const studentHash = await bcrypt.hash("Student123!", 10);
  const student = await prisma.user.upsert({
    where: { email: "student@ielts-scorer.local" },
    update: {},
    create: {
      email: "student@ielts-scorer.local",
      passwordHash: studentHash,
      authProvider: "credentials",
      name: "Demo Student",
      role: "STUDENT",
    },
  });
  console.log(`✓ Demo student: ${student.email}`);

  // --- Default production prompt (section 17) -----------------------------
  await prisma.aIPrompt.upsert({
    where: {
      code_version: { code: "ielts_writing_full_scoring_v1", version: "1.0.0" },
    },
    update: { status: "PUBLISHED", isDefault: true },
    create: {
      name: "IELTS Writing Full Scoring Prompt",
      code: "ielts_writing_full_scoring_v1",
      version: "1.0.0",
      taskType: null, // handles both Task 1 and Task 2
      modelProvider: "gemini",
      modelName: process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash",
      systemInstruction: DEFAULT_PROMPT_SYSTEM_INSTRUCTION,
      userPromptTemplate: DEFAULT_PROMPT_USER_TEMPLATE,
      generationConfig: DEFAULT_GENERATION_CONFIG,
      status: "PUBLISHED",
      isDefault: true,
      createdBy: admin.id,
      publishedBy: admin.id,
      publishedAt: new Date(),
    },
  });
  console.log("✓ Default scoring prompt published");

  // --- Model pricing (section 9) — edit in CMS as prices change ----------
  const pricingRows = [
    {
      modelName: "gemini-2.5-flash",
      inputPricePer1mTokens: 0.3,
      outputPricePer1mTokens: 2.5,
      cachedInputPricePer1mTokens: 0.075,
    },
    {
      modelName: "gemini-2.5-pro",
      inputPricePer1mTokens: 1.25,
      outputPricePer1mTokens: 10.0,
      cachedInputPricePer1mTokens: 0.31,
    },
  ];
  for (const row of pricingRows) {
    const exists = await prisma.aIModelPricing.findFirst({
      where: { provider: "gemini", modelName: row.modelName, effectiveTo: null },
    });
    if (!exists) {
      await prisma.aIModelPricing.create({
        data: {
          provider: "gemini",
          currency: "USD",
          sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
          createdBy: admin.id,
          ...row,
        },
      });
    }
  }
  console.log("✓ Model pricing seeded");

  // --- Exchange rate -----------------------------------------------------
  const rate = parseFloat(process.env.SEED_USD_VND_RATE || "25400");
  const existingRate = await prisma.exchangeRate.findFirst({
    where: { baseCurrency: "USD", targetCurrency: "VND" },
  });
  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        baseCurrency: "USD",
        targetCurrency: "VND",
        rate,
        source: "seed",
      },
    });
  }
  console.log(`✓ Exchange rate USD->VND: ${rate}`);

  // --- Default routing rule ---------------------------------------------
  const existingRule = await prisma.aIModelRoutingRule.findFirst({
    where: { planCode: "FREE", featureCode: "scoring", taskType: null },
  });
  if (!existingRule) {
    await prisma.aIModelRoutingRule.create({
      data: {
        planCode: "FREE",
        featureCode: "scoring",
        taskType: null,
        provider: "gemini",
        modelName: process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash",
        priority: 100,
        isActive: true,
      },
    });
  }
  console.log("✓ Default routing rule seeded");

  // --- Feature flags -----------------------------------------------------
  const flags = [
    { key: "file_upload_enabled", value: "false", description: "Allow image/PDF essay upload" },
    { key: "teacher_features_enabled", value: "false", description: "Enable teacher assignment features" },
  ];
  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: { ...flag, updatedBy: admin.id },
    });
  }
  console.log("✓ Feature flags seeded");

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
