import "./style.css";
import { parse, stringify } from "yaml";
import { marked } from "marked";
import purify from "dompurify";
import { fromMarkdown } from "mdast-util-from-markdown";
import { get, set, keys } from "idb-keyval";
const el = (id) => document.getElementById(id) as any;
const fields = [
  "title",
  "slug",
  "categories",
  "tags",
  "cover",
  "description",
  "body",
];
const values = () => Object.fromEntries(fields.map((k) => [k, el(k).value]));
const notice = (s) => (el("notice").textContent = s);
const origin = import.meta.env.VITE_ADMIN_API_ORIGIN;
const digest = async (data) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
let token = "",
  key = "",
  meta = {},
  baseSha = null,
  files = [],
  coverFile = null,
  pending = null,
  taskTimer,
  previewRevision = 0;
async function request(path, data?) {
  if (!origin) throw Error("请配置 VITE_ADMIN_API_ORIGIN 后连接后台。");
  const response = await fetch(origin + path, {
    method: data ? "POST" : "GET",
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      token = "";
      el("login").textContent = "GitHub 登录";
    }
    throw Error(result.error);
  }
  return result;
}
function bind(id, event, fn) {
  el(id).addEventListener(event, async () => {
    try {
      await fn();
    } catch (err) {
      notice(err.message);
    }
  });
}
function button(parent, label, fn) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => Promise.resolve(fn()).catch((err) => notice(err.message));
  el(parent).append(b);
}
function listValue(v) {
  return Array.isArray(v) ? v.flat(Infinity).join("，") : v || "";
}
function front(v, body = v.body, cover = v.cover) {
  const m = {
    ...meta,
    title: v.title,
    date:
      meta.date ||
      new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }),
  };
  for (const k of ["categories", "tags"])
    if (v[k] !== listValue(meta[k]))
      m[k] = v[k]
        .split(/[,，]/)
        .map((x) => x.trim())
        .filter(Boolean);
  for (const [k, val] of Object.entries({ cover, description: v.description }))
    if (val || k in m) m[k] = val;
  return "---\n" + stringify(m) + "---\n" + body;
}
function load(markdown, slug, sha) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  const m = block ? parse(block[1]) || {} : {},
    body = markdown.slice(block?.[0].length || 0);
  meta = m;
  baseSha = sha;
  files = [];
  coverFile = null;
  el("coverPicker").value = "";
  pending = null;
  const data = {
    ...m,
    slug,
    body,
    title: m.title || /^# (.+)$/m.exec(body)?.[1] || "",
    categories: listValue(m.categories),
    tags: listValue(m.tags),
  };
  for (const k of fields) el(k).value = data[k] || "";
  el("slug").disabled = !!sha;
  key = sha ? "post:" + slug : "draft:" + crypto.randomUUID();
  sessionStorage.setItem("current", key);
  render();
}
async function save() {
  sessionStorage.setItem("current", key);
  await set(key, { values: values(), meta, baseSha, files, coverFile, pending });
}
async function restore(k) {
  const d = await get(k);
  if (!d) return;
  key = k;
  ({ meta, baseSha, files, coverFile = null, pending } = d);
  el("coverPicker").value = "";
  for (const f of fields) el(f).value = d.values[f];
  el("slug").disabled = !!baseSha;
  sessionStorage.setItem("current", key);
  render();
}
async function drafts() {
  el("drafts").replaceChildren();
  for (const k of await keys())
    if (typeof k === "string" && /^(draft|post):/.test(k)) {
      const d = await get(k);
      button("drafts", d.values.title || "未命名草稿", () => restore(k));
    }
}
const norm = (p) => {
  try {
    return decodeURIComponent(p)
      .replaceAll("\\", "/")
      .replace(/^(\.\/)+/, "");
  } catch {
    return p;
  }
};
function match(path) {
  if (!path || /^https?:\/\//i.test(path) || /^\/img\//.test(path)) return null;
  const name = norm(path),
    exact = files.filter(
      (f) => norm(f.path) === name || norm(f.path).endsWith("/" + name),
    );
  const matches = exact.length
    ? exact
    : files.filter((f) => f.path.split("/").pop() === name.split("/").pop());
  if (matches.length !== 1)
    throw Error(
      (matches.length ? "配图同名，请填写完整相对路径：" : "缺少配图：") + path,
    );
  return matches[0];
}
function mapImages(body, urlFor) {
  const nodes = [],
    defs = new Map();
  function walk(n) {
    if (n.type === "definition") defs.set(n.identifier, n);
    if (["image", "imageReference"].includes(n.type)) nodes.push(n);
    n.children?.forEach(walk);
  }
  walk(fromMarkdown(body));
  for (const n of nodes.reverse()) {
    const ref = n.type === "image" ? n : defs.get(n.identifier);
    if (!ref) throw Error("图片引用未定义：" + n.identifier);
    let f;
    try {
      f = match(ref.url);
    } catch (e) {
      throw Error("第 " + n.position.start.line + " 行：" + e.message);
    }
    if (f) {
      const alt = (n.alt || "").replace(/[\[\]\\]/g, "\\$&");
      body =
        body.slice(0, n.position.start.offset) +
        "![" +
        alt +
        "](" +
        urlFor(f) +
        (ref.title ? " " + JSON.stringify(ref.title) : "") +
        ")" +
        body.slice(n.position.end.offset);
    }
  }
  return body;
}
function renderCover() {
  const path = el("cover").value;
  let local = coverFile;
  if (!local && path) {
    try { local = match(path); } catch { /* An imported cover can be selected later. */ }
  }
  const src = local ? "data:" + local.type + ";base64," + local.contents
    : /^(https?:\/\/|\/img\/)/i.test(path) ? path : "";
  const img = el("coverPreview");
  if (src && img.getAttribute("src") !== src) img.src = src;
  if (!src) img.removeAttribute("src");
  img.hidden = !src;
  el("removeCover").hidden = !path;
}
async function render() {
  renderCover();
  const rev = ++previewRevision;
  let body = el("body").value;
  try {
    body = mapImages(body, (f) => "data:" + f.type + ";base64," + f.contents);
    notice("");
  } catch (e) {
    notice(e.message);
  }
  const html = purify.sanitize(await marked.parse(body));
  if (rev === previewRevision) el("preview").innerHTML = html;
}
async function addFiles(input) {
  const draftKey = key;
  const isCover = input === "coverPicker";
  for (const file of Array.from(el(input).files) as File[]) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      if (input === "folder") continue;
      throw Error("支持 PNG、JPEG、WebP");
    }
    if (file.size > 3145728) throw Error("单图上限 3 MiB");
    const path = file.webkitRelativePath || file.name;
    const buf = await file.arrayBuffer();
    const name = (await digest(buf)) + "." +
      { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type];
    if (key !== draftKey) return;
    const rest = isCover ? files : files.filter((f) => f.path !== path);
    const sizes = new Map(rest.map(f => [f.name, f.size]));
    if (!isCover && coverFile) sizes.set(coverFile.name, coverFile.size);
    sizes.set(name, file.size);
    if ([...sizes.values()].reduce((sum, size) => sum + size, 0) > 8388608)
      throw Error("配图总量上限 8 MiB");
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const image = { path, type: file.type, size: file.size, name, contents: btoa(binary) };
    if (isCover) {
      coverFile = image;
      el("cover").value = file.name;
    } else {
      files = [...rest, image];
    }
  }
  pending = null;
  await save();
  await render();
}
async function posts() {
  const q = encodeURIComponent(el("search").value);
  el("posts").replaceChildren();
  async function page(n) {
    const data = await request("/api/posts?q=" + q + "&page=" + n);
    for (const p of data.posts)
      button(
        "posts",
        [p.title, p.date, listValue(p.categories), listValue(p.tags)]
          .filter(Boolean)
          .join(" · "),
        async () => {
          const post = await request("/api/posts/" + p.id);
          load(post.markdown, p.id, post.sha);
        },
      );
    if (n * 50 < data.total) await page(n + 1);
  }
  await page(1);
}
async function showJob(id) {
  clearTimeout(taskTimer);
  const j = await request("/api/publishes/" + id);
  el("result").replaceChildren(
    document.createTextNode(j.slug + " · " + j.stage + " "),
  );
  for (const [label, url] of [
    ["查看文章", j.url],
    ["构建记录", j.build],
    [
      "源提交",
      j.sha
        ? "https://github.com/binlicoder/binlicoder.github.io/commit/" + j.sha
        : null,
    ],
  ]) {
    if (url) {
      const a = document.createElement("a");
      a.textContent = label + " ";
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      el("result").append(a);
    }
  }
  if (j.stage === "已上线" && pending?.id === id) {
    const latest = await request("/api/posts/" + j.slug);
    if (
      (await digest(new TextEncoder().encode(latest.markdown))) === j.version
    ) {
      baseSha = latest.sha;
      meta.date = parse(latest.markdown.split(/\r?\n---/)[0].slice(3)).date;
      el("slug").disabled = true;
      pending = null;
      await save();
    }
  }
  if (
    ["构建或部署中", "已提交", "等待公网确认", "等待确认"].includes(j.stage) &&
    Date.now() - j.created < 900000
  )
    taskTimer = setTimeout(
      () => showJob(id).catch((e) => notice(e.message)),
      5000,
    );
}
async function historyList() {
  el("jobs").replaceChildren();
  for (const j of await request("/api/publishes"))
    button(
      "jobs",
      j.slug + " · " + new Date(j.created).toLocaleDateString(),
      () => showJob(j.id),
    );
}
async function publish() {
  if (!token) throw Error("请先登录 GitHub");
  const v = values();
  if (!v.title.trim() || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(v.slug))
    throw Error("请填写标题和英文短名");
  if (!pending) {
    const used = new Map(),
      urlFor = (f) => {
        used.set(f.name, { name: f.name, contents: f.contents });
        return "/img/" + v.slug + "/" + f.name;
      };
    const body = mapImages(v.body, urlFor),
      cover = coverFile || match(v.cover);
    pending = {
      id: crypto.randomUUID(),
      slug: v.slug,
      baseSha,
      markdown: front(v, body, cover ? urlFor(cover) : v.cover),
      images: [...used.values()],
    };
    await save();
  }
  const j = await request("/api/publishes", pending);
  await historyList();
  await showJob(j.id);
}
for (const id of fields)
  bind(id, "input", async () => {
    pending = null;
    await save();
    await render();
  });
for (const id of ["folder", "images", "coverPicker"]) bind(id, "change", () => addFiles(id));
bind("removeCover", "click", async () => {
  coverFile = null;
  el("cover").value = "";
  el("coverPicker").value = "";
  pending = null;
  await save();
  await render();
});
bind("fresh", "click", async () => {
  await drafts();
  load("", "", null);
});
bind("importer", "change", async () => {
  const f = el("importer").files[0];
  if (f) {
    load(await f.text(), f.name.replace(/\.[^.]+$/, ""), null);
    await save();
    await drafts();
  }
});
bind("exporter", "click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([front(values())]));
  a.download = (el("slug").value || "draft") + ".md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
bind("publish", "click", async () => {
  el("publish").disabled = true;
  try {
    await publish();
  } finally {
    el("publish").disabled = false;
  }
});
bind("search", "change", posts);
bind("login", "click", async () => {
  if (token) {
    await request("/auth/logout", {});
    location.reload();
    return;
  }
  const proof = crypto.randomUUID() + crypto.randomUUID();
  sessionStorage.setItem("proof", proof);
  const data = await request("/auth/start", {
    proof: await digest(new TextEncoder().encode(proof)),
  });
  location.assign(data.url);
});
async function init() {
  const current = sessionStorage.getItem("current");
  if (current && (await get(current))) await restore(current);
  else load("", "", null);
  await drafts();
  const ticket = new URLSearchParams(location.hash.slice(1)).get("ticket");
  if (ticket) {
    history.replaceState(null, "", location.pathname);
    const proof = sessionStorage.getItem("proof");
    sessionStorage.removeItem("proof");
    token = (await request("/auth/exchange", { ticket, proof })).token;
    el("login").textContent = "退出登录";
    await posts();
    await historyList();
  }
}
init().catch((e) => notice(e.message));
