import { describe, it, expect, beforeEach } from "vitest";
import { compareStore } from "./compare";

const mk = (n: number) => ({ key: `room-${n}`, kind: "room" as const, name: `R${n}` });

describe("comparador", () => {
  beforeEach(() => compareStore.clear());
  it("permite no máximo 3 itens", () => {
    [1, 2, 3].forEach((n) => compareStore.toggle(mk(n)));
    expect(compareStore.toggle(mk(4))).toBe(false);
    expect(compareStore.get()).toHaveLength(3);
  });
});
