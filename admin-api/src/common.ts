export const bytes = new TextEncoder();
export const b64 = (data: Uint8Array) => {
  let s = "";
  for (let i = 0; i < data.length; i += 8192)
    s += String.fromCharCode(...data.subarray(i, i + 8192));
  return btoa(s);
};
export const decode = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const random = () =>
  b64(crypto.getRandomValues(new Uint8Array(32)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
export const hash = async (v: string | Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        typeof v === "string" ? bytes.encode(v) : v,
      ),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
export function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}
export async function crypt(secret: string, value: string, encrypt: boolean) {
  const key = await crypto.subtle.importKey(
    "raw",
    decode(secret),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  if (encrypt) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return (
      b64(iv) +
      "." +
      b64(
        new Uint8Array(
          await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            bytes.encode(value),
          ),
        ),
      )
    );
  }
  const [iv, data] = value.split(".").map(decode);
  return new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data),
  );
}
export async function github(token: string, path: string, body?: unknown) {
  const response = await fetch("https://api.github.com" + path, {
    headers: {
      Authorization: "Bearer " + token,
      "User-Agent": "blog-admin",
      Accept: "application/vnd.github+json",
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  if (!response.ok)
    fail(response.status, "GitHub 请求失败 (" + response.status + ")");
  return response.json() as Promise<any>;
}
