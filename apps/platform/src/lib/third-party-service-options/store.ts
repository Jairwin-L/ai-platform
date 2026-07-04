import { prisma } from '@/lib/prisma';
import { normalizeThirdPartyServiceOptions, type ThirdPartyServiceOption } from './options';

function isMissingServiceOptionsStorage(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && (error.code === 'P2021' || error.code === 'P2022')) {
    return true;
  }

  if ('code' in error && error.code === 'P2010') {
    const meta = 'meta' in error ? error.meta : null;
    const serializedMeta = JSON.stringify(meta);

    return serializedMeta.includes('42P01') || serializedMeta.includes('42703');
  }

  return false;
}

export function getServiceOptionsStorageErrorMessage(error: unknown, fallback: string): string {
  if (isMissingServiceOptionsStorage(error)) {
    return '第三方服务存储结构尚未初始化，请先执行“vp run prisma:push”。';
  }

  return fallback;
}

function toThirdPartyServiceOptions(
  rows: IThirdPartyServiceOptions.ServiceOptionRow[],
): ThirdPartyServiceOption[] {
  return normalizeThirdPartyServiceOptions(
    rows.map((row) => ({
      value: row.value,
      label: row.label,
      color: row.color,
      apiKeyUrl: row.api_key_url ?? undefined,
      enabled: row.enabled,
    })),
  );
}

async function fetchThirdPartyServiceRows(): Promise<
  IThirdPartyServiceOptions.ServiceOptionRow[]
> {
  return prisma.$queryRaw<IThirdPartyServiceOptions.ServiceOptionRow[]>`
    SELECT value, label, color, api_key_url, enabled, sort_order
    FROM third_party_services
    ORDER BY sort_order ASC, id ASC
  `;
}

export async function getStoredThirdPartyServiceOptions(): Promise<ThirdPartyServiceOption[]> {
  return toThirdPartyServiceOptions(await fetchThirdPartyServiceRows());
}

export async function updateStoredThirdPartyServiceOptions(
  options: ThirdPartyServiceOption[],
): Promise<void> {
  const normalizedOptions = normalizeThirdPartyServiceOptions(options);

  await prisma.$transaction(async (transaction) => {
    const existingRows = await transaction.$queryRaw<Array<{ value: string }>>`
      SELECT value
      FROM third_party_services
    `;
    const nextValues = new Set<string>(normalizedOptions.map((option) => option.value));
    const removedValues = existingRows
      .map((row) => row.value)
      .filter((value) => !nextValues.has(value));

    if (removedValues.length > 0) {
      const deleteResults = await Promise.allSettled(
        removedValues.map((value) => transaction.$executeRaw`
          DELETE FROM third_party_services
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
        INSERT INTO third_party_services (value, label, color, api_key_url, enabled, sort_order)
        VALUES (
          ${option.value},
          ${option.label},
          ${option.color},
          ${option.apiKeyUrl ?? null},
          ${option.enabled},
          ${index}
        )
        ON CONFLICT (value) DO UPDATE
        SET label = EXCLUDED.label,
            color = EXCLUDED.color,
            api_key_url = EXCLUDED.api_key_url,
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
