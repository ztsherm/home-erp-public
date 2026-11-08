import { describe, expect, it } from "vitest";
import { assertValidPin, isValidPin } from "./pin";

describe("PIN Validation", () => {
  it("accepts valid 4-digit numeric PINs", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("0000")).toBe(true);
    expect(isValidPin("9999")).toBe(true);
    expect(isValidPin(" 4321 ")).toBe(true);
    expect(assertValidPin("1234")).toBe("1234");
  });

  it("rejects non-4-digit strings and non-numeric inputs", () => {
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("abcd")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin("")).toBe(false);
    expect(isValidPin(null)).toBe(false);
    expect(isValidPin(undefined)).toBe(false);
    expect(() => assertValidPin("123")).toThrow("PIN must be exactly 4 digits.");
    expect(() => assertValidPin("abcd")).toThrow("PIN must be exactly 4 digits.");
  });
});
