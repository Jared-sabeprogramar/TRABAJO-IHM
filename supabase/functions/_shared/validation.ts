import { HttpError } from "./http.ts";
export function dni(value: unknown): string {
  if (typeof value !== "string" || !/^\d{8}$/.test(value))
    throw new HttpError(400, "El DNI debe tener exactamente ocho dígitos.");
  return value;
}
export function report(input: Record<string, unknown>) {
  const categories = [
    "no_ramp",
    "blocked_sidewalk",
    "stairs",
    "narrow_access",
    "damaged_surface",
    "other",
  ];
  if (
    typeof input.name !== "string" ||
    input.name.trim().length < 3 ||
    input.name.trim().length > 120 ||
    typeof input.description !== "string" ||
    input.description.trim().length < 10 ||
    input.description.trim().length > 1000 ||
    typeof input.latitude !== "number" ||
    !Number.isFinite(input.latitude) ||
    Math.abs(input.latitude) > 90 ||
    typeof input.longitude !== "number" ||
    !Number.isFinite(input.longitude) ||
    Math.abs(input.longitude) > 180 ||
    typeof input.category !== "string" ||
    !categories.includes(input.category)
  )
    throw new HttpError(
      400,
      "Revisa el lugar, sus coordenadas y la descripción (10 a 1000 caracteres).",
    );
  return {
    name: input.name.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    category: input.category,
    description: input.description.trim(),
  };
}
export async function fingerprint(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
