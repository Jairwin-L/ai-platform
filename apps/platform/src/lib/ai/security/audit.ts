import crypto from 'node:crypto';
import { logger } from '@/lib/server/logger';
import { redactSensitiveData } from './redact';

export interface ByokAuditEvent {
  eventType: string;
  actorId?: string;
  provider?: string;
  requestId?: string;
  ip?: string;
  result: 'success' | 'blocked' | 'failed';
  reasonCode?: string;
}

function hashValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return crypto.createHash('sha256').update(value).digest('hex');
}

export function writeByokAuditEvent(event: ByokAuditEvent): void {
  const payload = redactSensitiveData({
    eventType: event.eventType,
    occurredAt: new Date().toISOString(),
    actorIdHash: hashValue(event.actorId),
    provider: event.provider,
    requestId: event.requestId,
    ipHash: hashValue(event.ip),
    result: event.result,
    reasonCode: event.reasonCode,
  });

  logger.info(payload, `BYOK audit: ${event.eventType}`);
}
