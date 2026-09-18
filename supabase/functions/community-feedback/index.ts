import { body, context, HttpError, quota, response, serve } from "../_shared/http.ts";

serve(async (req) => {
  const ctx = await context(req);
  await quota(ctx, "community-feedback", 40);
  const input = await body(req);
  const placeId = typeof input.placeId === "string" ? input.placeId : "";
  const state = input.state === "present" || input.state === "resolved" ? input.state : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(placeId) || !state)
    throw new HttpError(400, "La confirmación no es válida.");
  const { error } = await ctx.admin.rpc("acces_submit_place_feedback", {
    p_user: ctx.user.id, p_place: placeId, p_state: state,
  });
  if (error) {
    if (error.message.includes("IDENTIFICATION_REQUIRED"))
      throw new HttpError(403, "Accede con tu DNI antes de confirmar una barrera.");
    throw new HttpError(503, "No se pudo guardar la confirmación.");
  }
  return response(req, { saved: true });
});
