import { fromMarkdown } from "mdast-util-from-markdown";
import { parse } from "yaml";
import { github, hash, bytes, b64, decode, fail } from "./common";
function meta(md) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(md);
  try {
    return parse(block?.[1] || "{}") || {};
  } catch {
    fail(422, "文章 YAML 格式错误");
  }
}
const slugOK = (s) =>
  typeof s === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(s);
export async function api(r, e, sql, token) {
  const url = new URL(r.url),
    p = url.pathname,
    repo = e.GITHUB_REPOSITORY,
    branch = e.GITHUB_BRANCH,
    admin = e.GITHUB_ADMIN_ID;
  const gh = (path) => github(token, "/repos/" + repo + path);
  const contents = (path, ref = branch) =>
    gh("/contents/" + path + "?ref=" + encodeURIComponent(ref));
  const source = (s) => "source/_posts/" + s + ".md";
  const job = (id) =>
    sql("SELECT * FROM publish_jobs WHERE id=? AND admin=?", id, admin).first();
  async function reconcile(j) {
    // A commit made with expectedHeadOid must be a direct child of the recorded head.
    const comparison = await gh(
      "/compare/" + j.head + "..." + branch + "?per_page=1&page=1",
    );
    const c = comparison.commits.find(
      (c) =>
        c.parents[0]?.sha === j.head &&
        c.commit.message === "发布文章 " + j.slug + " [" + j.id + "]",
    );
    if (c) {
      await sql(
        "UPDATE publish_jobs SET sha=?, stage='已提交' WHERE admin=? AND id=?",
        c.sha,
        admin,
        j.id,
      ).run();
      return job(j.id);
    }
    return j;
  }
  async function status(j) {
    if (!j) fail(404, "没有这条任务");
    if (!j.sha && j.stage === "等待确认") j = await reconcile(j);
    if (!j.sha) return j;
    try {
      const read = (path) =>
        fetch(new URL(path, e.BLOG_ORIGIN), {
          redirect: "error",
          cache: "no-store",
        });
      const index = await (
        await read("/admin-publish-index.json?v=" + j.version)
      ).json();
      const entry = index.posts[j.slug];
      if (
        entry?.contentSha256 === j.version &&
        new URL(entry.path, e.BLOG_ORIGIN).origin === e.BLOG_ORIGIN
      ) {
        const page = await read(entry.path + "?v=" + j.version);
        if (
          page.status === 200 &&
          (await page.text()).includes(
            '<meta name="admin-content-sha256" content="' + j.version + '">',
          )
        ) {
          for (const path of JSON.parse(j.media)) {
            const img = await read(path);
            if (
              !img.ok ||
              !img.headers.get("content-type")?.startsWith("image/")
            )
              throw Error();
            await img.body?.cancel();
          }
          return {
            ...j,
            stage: "已上线",
            url: new URL(entry.path, e.BLOG_ORIGIN).href,
          };
        }
      }
      if (
        entry &&
        index.sourceCommit &&
        index.sourceCommit !== j.sha &&
        entry.contentSha256 !== j.version
      ) {
        const cmp = await gh(
          "/compare/" + j.sha + "..." + index.sourceCommit + "?per_page=1",
        );
        if (cmp.status === "ahead") return { ...j, stage: "已被后续发布覆盖" };
      }
      const runs = await gh(
        "/actions/workflows/publish-blog.yml/runs?head_sha=" + j.sha,
      );
      const run = runs.workflow_runs[0];
      return {
        ...j,
        stage:
          run?.conclusion && run.conclusion !== "success"
            ? "构建失败"
            : Date.now() - j.created > 900000
              ? "等待公网确认"
              : run
                ? "构建或部署中"
                : "已提交",
        build: run?.html_url,
      };
    } catch {
      return { ...j, stage: "等待公网确认" };
    }
  }
  if (p === "/api/terms") {
    if (r.method === "GET")
      return (
        await e.DB.prepare(
          "SELECT kind, name FROM editorial_terms ORDER BY kind, name",
        ).all()
      ).results;
    if (r.method === "POST") {
      const body = await r.json().catch(() => null);
      const name =
        typeof body?.name === "string" ? body.name.trim().normalize("NFC") : "";
      if (
        !["categories", "tags"].includes(body?.kind) ||
        !name ||
        name.length > 80 ||
        /[,，\p{Cc}]/u.test(name)
      )
        fail(422, "名称须为 1–80 个字符，不能包含逗号或控制字符");
      await sql(
        "INSERT OR IGNORE INTO editorial_terms(kind,name) VALUES(?,?)",
        body.kind,
        name,
      ).run();
      return { kind: body.kind, name };
    }
  }
  if (r.method === "GET") {
    if (p === "/api/publishes")
      return (
        await sql(
          "SELECT * FROM publish_jobs WHERE admin=? ORDER BY created DESC LIMIT 50",
          admin,
        ).all()
      ).results;
    if (p.startsWith("/api/publishes/"))
      return status(await job(p.split("/").pop()));
    if (p === "/api/posts") {
      const files = await contents("source/_posts");
      const posts = await Promise.all(
        files
          .filter((f) => f.name.endsWith(".md"))
          .map(async (f) => {
            const data = await contents(f.path),
              m = meta(new TextDecoder().decode(decode(data.content)));
            return {
              id: f.name.slice(0, -3),
              title: m.title,
              cover: m.cover,
              date: m.date,
              categories: m.categories,
              tags: m.tags,
            };
          }),
      );
      const matches = posts.filter((x) =>
        JSON.stringify(x)
          .toLowerCase()
          .includes((url.searchParams.get("q") || "").toLowerCase()),
      );
      const start = Math.max(
        0,
        (Number(url.searchParams.get("page") || 1) - 1) * 50,
      );
      return { posts: matches.slice(start, start + 50), total: matches.length };
    }
    const slug = p.split("/").pop();
    if (p === "/api/posts/" + slug && slugOK(slug)) {
      const f = await contents(source(slug)),
        markdown = new TextDecoder().decode(decode(f.content));
      return {
        id: slug,
        markdown,
        sha: f.sha,
        path: f.path,
        meta: meta(markdown),
      };
    }
  }
  if (p !== "/api/publishes" || r.method !== "POST") fail(404, "接口不存在");
  const raw = await r.text();
  if (raw.length > 12000000) fail(422, "上传总量超过限制");
  const { id, slug, markdown, baseSha, images } = JSON.parse(raw);
  if (
    !/^[a-f0-9-]{36}$/.test(id) ||
    !slugOK(slug) ||
    typeof markdown !== "string" ||
    bytes.encode(markdown).length > 500000 ||
    !Array.isArray(images) ||
    images.length > 32
  )
    fail(422, "文章或上传格式无效");
  const m = meta(markdown);
  if (typeof m.title !== "string" || !m.title.trim() || !m.date)
    fail(422, "请填写标题和日期");
  const taxonomy = (v) =>
    typeof v === "string" || (Array.isArray(v) && v.every(taxonomy));
  if ([m.categories, m.tags].some((x) => x != null && !taxonomy(x)))
    fail(422, "分类或标签格式无效");
  const digest = await hash(raw),
    existing = await job(id);
  if (existing) {
    if (existing.digest !== digest) fail(409, "任务编号对应其他内容");
    return status(existing);
  }
  const head = (await gh("/git/ref/heads/" + branch)).object.sha;
  let original = null;
  try {
    original = await contents(source(slug), head);
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  if ((original?.sha || null) !== baseSha)
    fail(409, "文章已存在或版本已变化，请重新打开并合并草稿");
  if (original) {
    const old = meta(new TextDecoder().decode(decode(original.content)));
    if (old.date !== m.date || old.permalink !== m.permalink)
      fail(422, "旧文章须保留日期和固定链接");
  }
  const additions = [
      { path: source(slug), contents: b64(bytes.encode(markdown)) },
    ],
    media = [];
  let total = 0;
  for (const img of images) {
    const data = decode(img.contents),
      signature = Array.from(data.slice(0, 8)).join(",");
    const ext =
      signature === "137,80,78,71,13,10,26,10"
        ? "png"
        : data[0] === 255 && data[1] === 216 && data[2] === 255
          ? "jpg"
          : String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
              String.fromCharCode(...data.slice(8, 12)) === "WEBP"
            ? "webp"
            : "";
    total += data.length;
    if (
      !ext ||
      data.length > 3 * 1024 * 1024 ||
      total > 8 * 1024 * 1024 ||
      img.name !== (await hash(data)) + "." + ext
    )
      fail(422, "图片类型、大小或摘要无效");
    const path = "/img/" + slug + "/" + img.name;
    media.push(path);
    additions.push({ path: "source" + path, contents: img.contents });
  }
  const refs = new Map(),
    nodes = [],
    required = new Set<string>();
  function walk(n) {
    if (n.type === "definition") refs.set(n.identifier, n.url);
    if (n.type === "image" || n.type === "imageReference") nodes.push(n);
    n.children?.forEach(walk);
  }
  walk(
    fromMarkdown(markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")),
  );
  for (const path of [
    m.cover,
    ...nodes.map((n) => n.url || refs.get(n.identifier)),
  ]) {
    if (!path || /^https?:\/\//i.test(path)) continue;
    if (
      typeof path !== "string" ||
      !path.startsWith("/img/") ||
      path.includes("\\") ||
      path.split("/").some((s) => s === ".." || s === ".") ||
      /[?#%]/.test(path)
    )
      fail(422, "缺少有效的站内配图：" + path);
    required.add(path);
  }
  for (const path of required) {
    if (!media.includes(path)) {
      try {
        await contents(
          "source" + path.split("/").map(encodeURIComponent).join("/"),
          head,
        );
      } catch (err) {
        if (err.status === 404) fail(422, "缺少配图：" + path);
        throw err;
      }
      media.push(path);
    }
  }
  const record = await sql(
    "INSERT OR IGNORE INTO publish_jobs VALUES(?,?,?,?,?,?,?,?,?,?)",
    id,
    admin,
    digest,
    slug,
    await hash(markdown),
    JSON.stringify(media),
    head,
    null,
    "等待确认",
    Date.now(),
  ).run();
  if (!record.meta.changes) {
    const prior = await job(id);
    if (prior.digest !== digest) fail(409, "发布内容冲突");
    return prior;
  }
  try {
    const result = await github(token, "/graphql", {
      query:
        "mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}",
      variables: {
        input: {
          branch: { repositoryNameWithOwner: repo, branchName: branch },
          expectedHeadOid: head,
          message: { headline: "发布文章 " + slug + " [" + id + "]" },
          fileChanges: { additions },
        },
      },
    });
    const sha = result.data?.createCommitOnBranch?.commit.oid;
    if (sha)
      await sql(
        "UPDATE publish_jobs SET sha=?,stage='已提交' WHERE admin=? AND id=?",
        sha,
        admin,
        id,
      ).run();
    else if (result.errors)
      await sql(
        "UPDATE publish_jobs SET stage='提交失败，请检查分支版本与权限' WHERE admin=? AND id=?",
        admin,
        id,
      ).run();
  } catch {
    /* The next status check reconciles a lost response against the branch. */
  }
  return job(id);
}
