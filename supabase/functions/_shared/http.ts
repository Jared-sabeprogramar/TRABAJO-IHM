import { createClient } from "npm:@supabase/supabase-js@2";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const allowed = () =>
  (
    Deno.env.get("ALLOWED_ORIGINS") ||
    "http://localhost:4200,http://127.0.0.1:4200"
  )
    .split(",")
    .map((s) => s.trim());
export function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowed().includes(origin)
      ? origin
      : allowed()[0],
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
  };
}
export function response(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export async function body(
  req: Request,
  max = 8192,
): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Se requiere JSON.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Solicitud vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "La imagen o solicitud es demasiado grande.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const data = JSON.parse(new TextDecoder().decode(all));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new HttpError(400, "Solicitud no válida.");
  }
}
export async function context(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer "))
    throw new HttpError(401, "Accede nuevamente para continuar.");
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(header.slice(7));
  if (error || !data.user)
    throw new HttpError(401, "El acceso venció. Vuelve a acceder.");
  return { admin, user: data.user };
}
export async function quota(
  ctx: Awaited<ReturnType<typeof context>>,
  action: string,
  limit: number,
) {
  const { data, error } = await ctx.admin.rpc("acces_consume_quota", {
    p_user: ctx.user.id,
    p_action: action,
    p_limit: limit,
  });
  if (error) throw new HttpError(503, "No se pudo comprobar el límite de uso.");
  if (!data)
    throw new HttpError(429, "Alcanzaste el límite diario. Intenta mañana.");
}
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== "POST")
      return response(req, { error: "Método no permitido." }, 405);
    if (
      req.headers.has("origin") &&
      !allowed().includes(req.headers.get("origin")!)
    )
      return response(req, { error: "Origen no permitido." }, 403);
    try {
      return await handler(req);
    } catch (e) {
      return response(
        req,
        {
          error:
            e instanceof HttpError
              ? e.message
              : "No se pudo completar la operación. Intenta nuevamente.",
        },
        e instanceof HttpError ? e.status : 500,
      );
    }
  });
}
