export function throwIfRejected(results: Array<PromiseSettledResult<unknown>>): void {
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (rejected) {
    throw rejected.reason;
  }
}
