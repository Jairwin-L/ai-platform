import { sanitizeForErrorReporting } from './redact';

export type ErrorReporter = (payload: unknown) => void | Promise<void>;

export async function reportSanitizedError(
  reporter: ErrorReporter,
  payload: unknown,
): Promise<void> {
  await reporter(sanitizeForErrorReporting(payload));
}
