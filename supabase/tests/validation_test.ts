import { dni, report, fingerprint } from "../functions/_shared/validation.ts";
import { photoBytes } from "../functions/_shared/photo.ts";
 Deno.test('photo validation rejects unsafe payloads and accepts optional evidence', () => {
  assert(photoBytes(undefined) === undefined, 'optional photo');
  assert(photoBytes('data:image/jpeg;base64,/9j/2Q==')?.length === 4, 'JPEG envelope');
  for (const value of [123, '', 'data:image/svg+xml;base64,AAAA', 'data:image/jpeg;base64,AAAA',
    'data:image/jpeg;base64,' + 'A'.repeat(700001)]) {
    let rejected = false;
    try { photoBytes(value); } catch { rejected = true; }
    assert(rejected, 'must reject invalid or oversized photo');
  }
});
function assert(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}
Deno.test("DNI preserves leading zeros and rejects malformed input", () => {
  assert(dni("00123456") === "00123456", "leading zeros");
  for (const input of [
    12345678,
    "1234567",
    "123456789",
    "12a45678",
    "１２３４５６７８",
  ]) {
    let failed = false;
    try {
      dni(input);
    } catch {
      failed = true;
    }
    assert(failed, "must reject " + input);
  }
});
Deno.test(
  "reports reject invalid coordinates, unsupported categories and empty details",
  () => {
    const valid = {
      name: "Biblioteca",
      latitude: -12,
      longitude: -77,
      description: "Entrada con escaleras",
      category: "stairs",
    };
    report(valid);
    for (const patch of [
      { latitude: NaN },
      { longitude: 181 },
      { category: "unknown" },
      { description: " " },
      { name: "x" },
    ]) {
      let failed = false;
      try {
        report({ ...valid, ...patch });
      } catch {
        failed = true;
      }
      assert(failed, "invalid report accepted");
    }
  },
);
Deno.test("DNI fingerprint is deterministic, keyed and never raw", async () => {
  const a = await fingerprint("00123456", "a".repeat(32));
  assert(a.length === 64, "length");
  assert(
    a === (await fingerprint("00123456", "a".repeat(32))),
    "deterministic",
  );
  assert(a !== (await fingerprint("00123456", "b".repeat(32))), "keyed");
});
