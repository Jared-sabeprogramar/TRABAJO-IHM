import { HttpError } from './http.ts';

export function photoBytes(value: unknown): Uint8Array | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length > 700000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new HttpError(400, 'La foto debe ser JPEG y ocupar como máximo 512 KB.');
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(value.split(',')[1]), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(400, 'No se pudo leer la foto. Vuelve a tomarla.');
  }
  if (bytes.length > 524288 || bytes.length < 4 || bytes[0] !== 255 ||
      bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) {
    throw new HttpError(400, 'La foto no es un JPEG válido de hasta 512 KB.');
  }
  return bytes;
}
