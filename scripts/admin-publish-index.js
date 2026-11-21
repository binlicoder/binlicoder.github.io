const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const version = (post) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(post.full_source))
    .digest("hex");
hexo.extend.generator.register("admin-index", function (locals) {
  const posts = Object.fromEntries(
    locals.posts
      .toArray()
      .map((post) => [
        path.basename(post.source, ".md"),
        { path: "/" + post.path, contentSha256: version(post) },
      ]),
  );
  return {
    path: "admin-publish-index.json",
    data: JSON.stringify({
      sourceCommit: process.env.GITHUB_SHA || null,
      posts,
    }),
  };
});
hexo.extend.filter.register("after_render:html", function (html, data) {
  const post = data.page;
  return post?.layout === "post" && post.full_source
    ? html.replace(
        "</head>",
        '<meta name="admin-content-sha256" content="' +
          version(post) +
          '"></head>',
      )
    : html;
});
