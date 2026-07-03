import type { PrismaClient } from '../../generated/prisma/client';

const aiProvidersData = [
  { value: 'openai', label: 'OpenAI', color: 'blue', enabled: true },
  { value: 'anthropic', label: 'Anthropic', color: 'purple', enabled: true },
  { value: 'gemini', label: 'Gemini', color: 'green', enabled: true },
  { value: 'deepseek', label: 'DeepSeek', color: 'geekblue', enabled: true },
];

export async function seedAiProviders(prisma: PrismaClient): Promise<void> {
  console.log('Seeding AI providers...');

  const seedResults = await Promise.allSettled(
    aiProvidersData.map(
      (provider, index) => prisma.$executeRaw`
      INSERT INTO ai_providers (value, label, color, enabled, sort_order)
      VALUES (
        ${provider.value},
        ${provider.label},
        ${provider.color},
        ${provider.enabled},
        ${index}
      )
      ON CONFLICT (value) DO UPDATE
      SET label = EXCLUDED.label,
          color = EXCLUDED.color,
          enabled = EXCLUDED.enabled,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
    `,
    ),
  );
  const failedSeed = seedResults.find((result) => result.status === 'rejected');

  if (failedSeed?.status === 'rejected') {
    throw failedSeed.reason;
  }

  console.log(`Seeded ${aiProvidersData.length} AI providers.`);
}
