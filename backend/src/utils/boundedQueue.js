// A timed-out Redis command may finish later. All callers must use deterministic
// job IDs or conditional writes, and must never interpret timeout as nonexecution.
export async function boundedQueue(operation, timeoutMs = 5000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("QUEUE_UNAVAILABLE")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
