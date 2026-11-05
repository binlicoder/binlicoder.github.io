document.addEventListener('DOMContentLoaded', () => {
  const layout = document.querySelector('#body-wrap.post #content-inner');
  if (!layout) return;
  const article = layout.querySelector('#article-container');
  if (article) {
    const cover = document.createElement('img');
    cover.className = 'article-cover';
    cover.src = document.querySelector('meta[property="og:image"]')?.content || '/img/cover.svg';
    cover.alt = '';
    article.prepend(cover);
  }
  const toc = layout.querySelector('#card-toc');
  if (toc) {
    const side = document.createElement('aside');
    side.className = 'article-right';
    side.setAttribute('aria-label', '文章目录');
    side.append(toc);
    layout.append(side);
  }
});
