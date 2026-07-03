import { sanitizeForErrorReporting } from './redact';

export type ErrorReporter = IByok.ErrorReporter;

export async function reportSanitizedError(
  reporter: ErrorReporter,
  payload: unknown,
): Promise<void> {
  await reporter(sanitizeForErrorReporting(payload));
}
