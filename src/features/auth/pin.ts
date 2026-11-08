export const PIN_REGEX = /^\d{4}$/;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_REGEX.test(pin.trim());
}

export function assertValidPin(pin: unknown): string {
  if (typeof pin !== "string" || !PIN_REGEX.test(pin.trim())) {
    throw new Error("PIN must be exactly 4 digits.");
  }
  return pin.trim();
}
