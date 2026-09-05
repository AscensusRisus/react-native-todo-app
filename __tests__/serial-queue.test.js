import { createSerialQueue } from "../lib/serial-queue";

describe("serial queue", () => {
  it("runs overlapping operations in insertion order", async () => {
    const queue = createSerialQueue();
    const order = [];
    let releaseFirst;
    const first = queue(async () => {
      await new Promise((resolve) => { releaseFirst = resolve; });
      order.push("first");
    });
    const second = queue(async () => { order.push("second"); });

    await Promise.resolve();
    expect(order).toEqual([]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first", "second"]);
  });

  it("continues processing after an operation fails", async () => {
    const queue = createSerialQueue();
    const next = queue(async () => { throw new Error("temporary failure"); }).catch((error) => error.message);
    const afterFailure = queue(async () => "processed");
    await expect(next).resolves.toBe("temporary failure");
    await expect(afterFailure).resolves.toBe("processed");
  });
});
