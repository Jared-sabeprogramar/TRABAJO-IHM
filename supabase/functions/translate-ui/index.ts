import { body, context, HttpError, quota, response, serve } from "../_shared/http.ts";

const languages: Record<string, string> = {
  "en-US": "English", "pt-BR": "Brazilian Portuguese", "fr-FR": "French",
  "it-IT": "Italian", "de-DE": "German", qu: "Quechua Collao (Southern Peruvian Quechua)",
  ay: "Southern Peruvian Aymara",
};
// Translations contain only fixed interface copy. Keeping a short-lived isolate
// cache makes repeated language changes immediate without storing user content.
const cache = new Map<string, { expires: number; data: unknown }>();

serve(async (req) => {
  const ctx = await context(req);
  await quota(ctx, "ui-translation", 80);
  const input = await body(req, 16000);
  const language = typeof input.language === "string" ? input.language : "";
  const phrases = Array.isArray(input.phrases) ? input.phrases : [];
  if (!languages[language]) throw new HttpError(400, "Idioma no permitido.");
  if (!phrases.length || phrases.length > 120 || !phrases.every(p => typeof p === "string" && p.length > 0 && p.length <= 500))
    throw new HttpError(400, "Frases de interfaz no válidas.");
  const cacheKey = `${language}:${JSON.stringify(phrases)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return response(req, cached.data);
  const key = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_VISION_MODEL") || "gemini-3.5-flash-lite";
  if (!key) throw new HttpError(503, "La traducción aún no está conectada.");
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Translate these static accessibility-app interface strings from Spanish to ${languages[language]}. Return only valid JSON with this exact shape: {"translations":[{"source":"original","text":"translation"}]}. Keep the array complete and in the same order. Preserve numbers, product name Acces, punctuation, HTML-free plain text and accessibility meaning. Do not add explanations. The source strings contain no personal data.\n\n${JSON.stringify(phrases)}` }]}],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 4000,
          temperature: 0,
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
    },
  );
  if (!upstream.ok) throw new HttpError(502, "No se pudo traducir la interfaz. Intenta nuevamente.");
  const data = await upstream.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
  try {
    const parsed = JSON.parse(text);
    const translations = parsed.translations;
    if (!Array.isArray(translations) || translations.length !== phrases.length ||
      !translations.every((item: unknown, index: number) => typeof (item as { source?: unknown }).source === "string" && (item as { source: string }).source === phrases[index] && typeof (item as { text?: unknown }).text === "string"))
      throw new Error();
    const result = { translations };
    cache.set(cacheKey, { expires: Date.now() + 6 * 60 * 60 * 1000, data: result });
    return response(req, result);
  } catch {
    throw new HttpError(502, "La traducción no tuvo un formato válido. Intenta nuevamente.");
  }
});
