export async function asyncForEach<T>(
  array: T[],
  callback: (item: T, index: number) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i);
  }
}
