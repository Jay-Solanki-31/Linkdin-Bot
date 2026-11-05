import { it, expect, vi } from "vitest";
import { boundedQueue } from "../../src/utils/boundedQueue.js";
it("bounds an unavailable Redis call without treating it as nonexecution", async () => {
  vi.useFakeTimers();
  try {
    let finish;
    const command = new Promise((resolve) => {
      finish = resolve;
    });
    const result = boundedQueue(() => command, 5000);
    const rejected = expect(result).rejects.toThrow("QUEUE_UNAVAILABLE");
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    finish("late result");
    await Promise.resolve();
  } finally {
    vi.useRealTimers();
  }
});
