

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  concurrency: number = 5,
): Promise<R[]> {
  const results: R[] = [];
  const chunks = chunk(items, batchSize);

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.flatMap((chunk) => chunk.map(processor)),
    );
    results.push(...batchResults);
  }

  return results;
}


export async function batchCreate<T>(
  createFn: (data: T[]) => Promise<any>,
  items: T[],
  batchSize: number = 100,
): Promise<void> {
  const chunks = chunk(items, batchSize);

  for (const chunk of chunks) {
    await createFn(chunk);
  }
}


export async function batchUpdate<T>(
  updateFn: (data: T[]) => Promise<any>,
  items: T[],
  batchSize: number = 100,
): Promise<void> {
  const chunks = chunk(items, batchSize);

  for (const chunk of chunks) {
    await updateFn(chunk);
  }
}


