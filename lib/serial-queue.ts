export type SerialQueue = <T>(operation: () => Promise<T>) => Promise<T>;

export function createSerialQueue(): SerialQueue {
  let tail = Promise.resolve();
  return <T>(operation: () => Promise<T>) => {
    const next = tail.then(operation, operation);
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}
