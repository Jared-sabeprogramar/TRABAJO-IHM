import {
  serve,
  context,
  body,
  response,
  HttpError,
  quota,
} from "../_shared/http.ts";
import { report } from "../_shared/validation.ts";
import { photoBytes } from "../_shared/photo.ts";
serve(async (req) => {
  const ctx = await context(req);
  await quota(ctx, "report", 20);
  const payload = await body(req, 720000);
  const input = report(payload);
  const photo = photoBytes(payload.photo);
  const identity = await ctx.admin.rpc('acces_identity_status', { p_user: ctx.user.id });
  if (identity.error) throw new HttpError(503, 'No se pudo comprobar tu acceso.');
  if (!identity.data) throw new HttpError(403, 'Accede con tu DNI antes de enviar un reporte.');
  const photoPath = photo ? `${ctx.user.id}/${crypto.randomUUID()}.jpg` : null;
  if (photo && photoPath) {
    const upload = await ctx.admin.storage.from('report-photos').upload(photoPath, photo, {
      contentType: 'image/jpeg', upsert: false,
    });
    if (upload.error) throw new HttpError(503, 'No se pudo guardar la foto. Tu reporte todavía no se envió. Intenta nuevamente.');
  }
  const { data, error } = await ctx.admin.rpc("acces_submit_report_with_photo", {
    p_user: ctx.user.id,
    p_name: input.name,
    p_lat: input.latitude,
    p_lng: input.longitude,
    p_category: input.category,
    p_description: input.description,
    p_photo_path: photoPath,
  });
  if (error) {
    // Remove only the new object from this failed submission.
    if (photoPath) await ctx.admin.storage.from('report-photos').remove([photoPath]);
    const messages: Record<string, string> = {
      IDENTIFICATION_REQUIRED: "Accede con tu DNI antes de enviar un reporte.",
      DUPLICATE_REPORT:
        "Ya existe un reporte activo con ese DNI para este lugar.",
      DAILY_LIMIT: "Puedes registrar hasta cinco reportes al día.",
      REPORT_REJECTED:
        "Este reporte fue rechazado y no puede enviarse de nuevo.",
      INVALID_REPORT: "Revisa los datos del reporte.",
    };
    const key = Object.keys(messages).find((k) => error.message.includes(k));
    throw new HttpError(
      key === "IDENTIFICATION_REQUIRED"
        ? 403
        : key === "DAILY_LIMIT"
          ? 429
          : 409,
      key ? messages[key] : "No se pudo registrar el reporte.",
    );
  }
  return response(req, { place_id: data }, 201);
});
