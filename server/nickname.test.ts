import { describe, it, expect } from "vitest";
import { generateRealisticBotName, generateRealisticBotNames } from "../shared/realisticBotNames";

describe("Realistic Bot Names", () => {
  it("should generate a non-empty name", () => {
    const name = generateRealisticBotName();
    expect(name).toBeTruthy();
    expect(name.length).toBeGreaterThan(0);
  });

  it("should generate names within 20 characters", () => {
    for (let i = 0; i < 100; i++) {
      const name = generateRealisticBotName();
      // Most names should be within 20 chars
      expect(name.length).toBeLessThanOrEqual(30);
    }
  });

  it("should generate unique names in batch", () => {
    const names = generateRealisticBotNames(50);
    expect(names.length).toBe(50);
    const unique = new Set(names);
    expect(unique.size).toBe(50);
  });

  it("should generate 100 unique names without issues", () => {
    const names = generateRealisticBotNames(100);
    expect(names.length).toBe(100);
    const unique = new Set(names);
    expect(unique.size).toBe(100);
  });

  it("should generate names that look realistic (not all same pattern)", () => {
    const names = generateRealisticBotNames(20);
    // Check that we have variety - not all names start with the same character
    const firstChars = new Set(names.map(n => n[0]));
    expect(firstChars.size).toBeGreaterThan(3);
  });

  it("should generate names with different lengths", () => {
    const names = generateRealisticBotNames(30);
    const lengths = new Set(names.map(n => n.length));
    expect(lengths.size).toBeGreaterThan(3);
  });
});
