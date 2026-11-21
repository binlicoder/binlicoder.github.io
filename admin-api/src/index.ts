import { random, hash, crypt, github, fail, b64, bytes } from "./common";
import { api } from "./posts";
const json = (v: unknown) => Response.json(v);
async function route(r, e) {
  const url = new URL(r.url),
    p = url.pathname,
    method = r.method;
  const sql = (s, ...args) => e.DB.prepare(s).bind(...args);
  const now = Date.now();
  if (p === "/healthz" && method === "GET") return json({ version: "1.0.0" });
  if (p === "/auth/github/callback" && method === "GET") {
    const flow = await sql(
      "UPDATE oauth_flows SET expires=0 WHERE state=? AND expires>? AND ticket IS NULL RETURNING *",
      url.searchParams.get("state"),
      now,
    ).first();
    if (!flow) fail(403, "登录请求已失效");
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          client_id: e.GITHUB_CLIENT_ID,
          client_secret: e.GITHUB_CLIENT_SECRET,
          code: url.searchParams.get("code") || "",
          code_verifier: flow.verifier,
          redirect_uri: e.GITHUB_CALLBACK_URL,
        }),
      },
    );
    const { access_token: token } = (await response.json()) as any;
    if (
      !token ||
      String((await github(token, "/user")).id) !== e.GITHUB_ADMIN_ID
    )
      fail(403, "账号无权访问");
    let installed = false;
    for (let page = 1; !installed; page++) {
      const { installations } = await github(
        token,
        "/user/installations?per_page=100&page=" + page,
      );
      for (const i of installations) {
        if (i.permissions.contents !== "write") continue;
        for (let n = 1; !installed; n++) {
          const { repositories } = await github(
            token,
            "/user/installations/" +
              i.id +
              "/repositories?per_page=100&page=" +
              n,
          );
          installed = repositories.some(
            (repo) => repo.full_name === e.GITHUB_REPOSITORY,
          );
          if (repositories.length < 100) break;
        }
        if (installed) break;
      }
      if (installations.length < 100) break;
    }
    if (!installed) fail(403, "请检查博客仓库安装范围和 Contents 写权限");
    await github(
      token,
      "/repos/" + e.GITHUB_REPOSITORY + "/branches/" + e.GITHUB_BRANCH,
    );
    const ticket = random();
    await sql(
      "UPDATE oauth_flows SET state=?,ticket=?,credential=?,expires=? WHERE state=?",
      random(),
      await hash(ticket),
      await crypt(e.SESSION_ENCRYPTION_KEY, token, true),
      now + 60000,
      flow.state,
    ).run();
    return Response.redirect(e.BLOG_ORIGIN + "/admin/#ticket=" + ticket, 303);
  }
  if (r.headers.get("Origin") !== e.BLOG_ORIGIN) fail(403, "来源无权访问");
  if (method === "OPTIONS") return new Response(null, { status: 204 });
  if (p === "/auth/start" && method === "POST") {
    const { proof } = await r.json();
    if (!/^[a-f0-9]{64}$/.test(proof)) fail(422, "无效的浏览器凭据");
    const state = random(),
      verifier = random();
    await sql("DELETE FROM oauth_flows WHERE expires<?", now - 60000).run();
    await sql("DELETE FROM sessions WHERE expires<?", now).run();
    await sql(
      "INSERT INTO oauth_flows(state,proof,verifier,expires) VALUES(?,?,?,?)",
      state,
      proof,
      verifier,
      now + 600000,
    ).run();
    const challenge = b64(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", bytes.encode(verifier)),
      ),
    )
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    return json({
      url:
        "https://github.com/login/oauth/authorize?" +
        new URLSearchParams({
          state,
          client_id: e.GITHUB_CLIENT_ID,
          redirect_uri: e.GITHUB_CALLBACK_URL,
          code_challenge: challenge,
          code_challenge_method: "S256",
        }),
    });
  }
  if (p === "/auth/exchange" && method === "POST") {
    const { ticket, proof } = await r.json();
    const flow = await sql(
      "DELETE FROM oauth_flows WHERE ticket=? AND proof=? AND expires>? RETURNING credential",
      await hash(ticket),
      await hash(proof),
      now,
    ).first();
    if (!flow) fail(403, "交接码已失效");
    const token = random(),
      expires = now + 3600000;
    await sql(
      "INSERT INTO sessions VALUES(?,?,?,?)",
      await hash(token),
      e.GITHUB_ADMIN_ID,
      flow.credential,
      expires,
    ).run();
    return json({ token, expires });
  }
  const key = await hash(
    (r.headers.get("Authorization") || "").replace(/^Bearer /, ""),
  );
  const session = await sql(
    "SELECT * FROM sessions WHERE hash=? AND admin=? AND expires>?",
    key,
    e.GITHUB_ADMIN_ID,
    now,
  ).first();
  if (!session) fail(401, "请重新登录，草稿保存在本机");
  if (p === "/auth/logout" && method === "POST") {
    await sql("DELETE FROM sessions WHERE hash=?", key).run();
    return json({ ok: true });
  }
  return json(
    await api(
      r,
      e,
      sql,
      await crypt(e.SESSION_ENCRYPTION_KEY, session.credential, false),
    ),
  );
}
export default {
  async fetch(r, e) {
    let result;
    try {
      result = await route(r, e);
    } catch (err) {
      result = Response.json(
        { error: err.status ? err.message : "服务请求失败，请稍后检查" },
        { status: err.status || 500 },
      );
    }
    const headers = new Headers(result.headers);
    headers.set("Cache-Control", "no-store");
    if (r.headers.get("Origin") === e.BLOG_ORIGIN) {
      headers.set("Access-Control-Allow-Origin", e.BLOG_ORIGIN);
      headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type");
    }
    return new Response(result.body, { status: result.status, headers });
  },
};
