export function isLikelyNetworkError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error ?? '');

  return /network|fetch|timeout|failed to fetch|offline|enetunreach|abort|timed out|socket|connection|network request failed/i.test(
    msg,
  );
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'networkTimeout',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
