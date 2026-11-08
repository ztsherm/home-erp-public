export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = text(formData, key);
  return value ? Number(value) : fallback;
}

export function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00.000Z`) : undefined;
}
