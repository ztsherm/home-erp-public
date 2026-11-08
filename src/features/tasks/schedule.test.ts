import { describe, expect, it } from "vitest";
import { nextTaskDateFromCompletion, nextTaskDueDate } from "@/features/tasks/schedule";

describe("nextTaskDueDate", () => {
  it("returns the configured next task date when it is overdue", () => {
    const dueDate = nextTaskDueDate(new Date("2026-08-01T12:00:00.000Z"), 7, new Date("2026-08-13T12:00:00.000Z"));
    expect(dueDate?.toISOString().slice(0, 10)).toBe("2026-08-01");
  });

  it("returns the configured next task date when it is due today", () => {
    const dueDate = nextTaskDueDate(new Date("2026-08-13T12:00:00.000Z"), 30, new Date("2026-08-13T12:00:00.000Z"));
    expect(dueDate?.toISOString().slice(0, 10)).toBe("2026-08-13");
  });

  it("does not create future tasks early", () => {
    const dueDate = nextTaskDueDate(new Date("2026-08-20T12:00:00.000Z"), 30, new Date("2026-08-13T12:00:00.000Z"));
    expect(dueDate).toBeNull();
  });

  it("does not schedule invalid intervals", () => {
    const dueDate = nextTaskDueDate(new Date("2026-08-01T12:00:00.000Z"), 0, new Date("2026-08-13T12:00:00.000Z"));
    expect(dueDate).toBeNull();
  });

  it("calculates next task date from completion date plus interval", () => {
    const nextDate = nextTaskDateFromCompletion(new Date("2026-08-13T12:00:00.000Z"), 7);
    expect(nextDate?.toISOString().slice(0, 10)).toBe("2026-08-20");
  });
});
