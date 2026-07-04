import { prisma } from '@/lib/prisma';
import { normalizeAiProviderOptions, type AiProviderOption } from './provider-options';

function isMissingProviderOptionsTable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && error.code === 'P2021') {
    return true;
  }

  if ('code' in error && error.code === 'P2010') {
    const meta = 'meta' in error ? error.meta : null;
    const serializedMeta = JSON.stringify(meta);

    return serializedMeta.includes('42P01');
  }

  return false;
}

export function getProviderOptionsStorageErrorMessage(error: unknown, fallback: string): string {
  if (isMissingProviderOptionsTable(error)) {
    return 'AI Provider 存储尚未初始化，请先执行“vp run prisma:push”。';
  }

  return fallback;
}

function toAiProviderOptions(rows: IByok.ProviderOptionRow[]): AiProviderOption[] {
  return normalizeAiProviderOptions(
    rows.map((row) => ({
      value: row.value,
      label: row.label,
      color: row.color,
      enabled: row.enabled,
    })),
  );
}

async function fetchAiProviderRows(): Promise<IByok.ProviderOptionRow[]> {
  return prisma.$queryRaw<IByok.ProviderOptionRow[]>`
    SELECT value, label, color, enabled, sort_order
    FROM ai_providers
    ORDER BY sort_order ASC, id ASC
  `;
}

export async function getStoredAiProviderOptions(): Promise<AiProviderOption[]> {
  return toAiProviderOptions(await fetchAiProviderRows());
}

export async function updateStoredAiProviderOptions(options: AiProviderOption[]): Promise<void> {
  const normalizedOptions = normalizeAiProviderOptions(options);

  await prisma.$transaction(async (transaction) => {
    const existingRows = await transaction.$queryRaw<Array<{ value: string }>>`
      SELECT value
      FROM ai_providers
    `;
    const nextValues = new Set<string>(normalizedOptions.map((option) => option.value));
    const removedValues = existingRows
      .map((row) => row.value)
      .filter((value) => !nextValues.has(value));

    if (removedValues.length > 0) {
      const deleteResults = await Promise.allSettled(
        removedValues.map((value) => transaction.$executeRaw`
          DELETE FROM ai_providers
          WHERE value = ${value}
        `),
      );
      const failedDelete = deleteResults.find((result) => result.status === 'rejected');

      if (failedDelete?.status === 'rejected') {
        throw failedDelete.reason;
      }
    }

    const upsertResults = await Promise.allSettled(
      normalizedOptions.map((option, index) => transaction.$executeRaw`
        INSERT INTO ai_providers (value, label, color, enabled, sort_order)
        VALUES (
          ${option.value},
          ${option.label},
          ${option.color},
          ${option.enabled},
          ${index}
        )
        ON CONFLICT (value) DO UPDATE
        SET label = EXCLUDED.label,
            color = EXCLUDED.color,
            enabled = EXCLUDED.enabled,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
      `),
    );
    const failedUpsert = upsertResults.find((result) => result.status === 'rejected');

    if (failedUpsert?.status === 'rejected') {
      throw failedUpsert.reason;
    }
  });
}
