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

  const header = document.querySelector('#page-header');
  const title = layout.querySelector('.post-title');
  const date = layout.querySelector('.post-meta-date-created');
  if (header && title) {
    const coverImage = document.querySelector('meta[property="og:image"]')?.content;
    if (coverImage && new URL(coverImage, location.href).pathname === '/img/homebrew-cover.png') header.classList.add('homebrew-cover');
    const hero = document.createElement('div');
    hero.className = 'article-hero';
    const heading = document.createElement('div');
    heading.className = 'article-hero-title';
    heading.textContent = title.textContent.trim();
    hero.append(heading);
    if (date) {
      const heroDate = document.createElement('div');
      heroDate.className = 'article-hero-date';
      heroDate.textContent = date.textContent;
      hero.append(heroDate);
    }
    header.append(hero);
  }

  const post = layout.querySelector('#post');
  const nav = document.createElement('nav');
  nav.className = 'article-category-nav';
  nav.setAttribute('aria-label', '文章分类');
  nav.innerHTML = '<a href="/" aria-label="首页">⌂</a><a href="/archives/">归档</a>';
  post.before(nav);
  fetch('/category-navigation.json').then(response => response.ok ? response.json() : []).then(categories => {
    categories.forEach(category => {
      const link = document.createElement('a');
      link.href = '/' + category.path;
      link.textContent = `${category.name}  ${category.count}`;
      nav.append(link);
    });
  }).catch(() => {});

  const side = document.createElement('aside');
  side.className = 'article-right';
  side.setAttribute('aria-label', '文章辅助信息');
  const calendar = document.createElement('section');
  calendar.className = 'card-widget article-calendar';
  calendar.innerHTML = '<div class="calendar-title">日历</div><div class="calendar-nav"><button type="button" aria-label="上个月">‹</button><strong></strong><button type="button" aria-label="下个月">›</button></div><div class="calendar-grid"></div>';
  side.append(calendar);
  const toc = layout.querySelector('#card-toc');
  if (toc) side.append(toc);
  layout.append(side);

  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  function renderCalendar() {
    calendar.querySelector('strong').textContent = `${year}年${month + 1}月`;
    const grid = calendar.querySelector('.calendar-grid');
    grid.replaceChildren();
    ['一', '二', '三', '四', '五', '六', '日'].forEach(day => {
      const label = document.createElement('span');
      label.className = 'calendar-weekday';
      label.textContent = day;
      grid.append(label);
    });
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.append(document.createElement('span'));
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const cell = document.createElement('span');
      cell.textContent = day;
      if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) cell.className = 'calendar-today';
      grid.append(cell);
    }
  }
  const buttons = calendar.querySelectorAll('button');
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    const next = new Date(year, month + (index === 0 ? -1 : 1), 1);
    year = next.getFullYear();
    month = next.getMonth();
    renderCalendar();
  }));
  renderCalendar();
});
