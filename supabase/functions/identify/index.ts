import {
  serve,
  context,
  body,
  response,
  HttpError,
  quota,
} from "../_shared/http.ts";
import { dni, fingerprint } from "../_shared/validation.ts";
serve(async (req) => {
  const ctx = await context(req);
  const input = await body(req);
  if (input.action === "status") {
    const { data, error } = await ctx.admin.rpc("acces_identity_status", {
      p_user: ctx.user.id,
    });
    if (error) throw new HttpError(503, "No se pudo recuperar el acceso.");
    return response(req, { identified: !!data });
  }
  await quota(ctx, "identify", 10);
  const number = dni(input.dni);
  const secret = Deno.env.get("DNI_HMAC_SECRET");
  if (!secret || secret.length < 32)
    throw new HttpError(503, "El acceso con DNI aún no está configurado.");
  const hash = await fingerprint(number, secret);
  const { error } = await ctx.admin.rpc("acces_identify", {
    p_user: ctx.user.id,
    p_hash: hash,
  });
  if (error)
    throw new HttpError(
      409,
      "Este acceso ya tiene un DNI asociado o no pudo registrarse. Cierra el acceso antes de cambiar de DNI.",
    );
  return response(req, { identified: true, identityVerified: false });
});
