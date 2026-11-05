document.addEventListener('DOMContentLoaded', () => {
  const layout = document.querySelector('#content-inner');
  const posts = layout && layout.querySelector('#recent-posts');
  if (!posts) return;
  layout.classList.add('home-three-column');

  const nav = document.createElement('nav');
  nav.className = 'home-category-nav';
  nav.setAttribute('aria-label', '文章分类');
  nav.innerHTML = '<a href="/" aria-label="首页">⌂</a><a href="/archives/">归档</a>';
  posts.prepend(nav);
  fetch('/category-navigation.json').then(response => response.ok ? response.json() : []).then(categories => {
    categories.forEach(category => {
      const link = document.createElement('a');
      link.href = '/' + category.path;
      link.textContent = `${category.name}  ${category.count}`;
      nav.append(link);
    });
  }).catch(() => {});

  const sidebar = document.createElement('aside');
  sidebar.className = 'home-right';
  sidebar.setAttribute('aria-label', '博客信息');
  sidebar.innerHTML = '<section class="home-widget home-stats"><h2>统计</h2><dl><div><dt>文章</dt><dd data-stat="posts">—</dd></div><div><dt>分类</dt><dd data-stat="categories">—</dd></div><div><dt>标签</dt><dd data-stat="tags">—</dd></div><div><dt>最近更新</dt><dd data-stat="updated">—</dd></div></dl></section><section class="home-widget home-calendar"><h2>日历</h2><div class="calendar-nav"><button type="button" aria-label="上个月">‹</button><strong></strong><button type="button" aria-label="下个月">›</button></div><div class="calendar-grid"></div></section>';
  layout.append(sidebar);
  fetch('/home-statistics.json').then(response => response.ok ? response.json() : null).then(stats => {
    if (!stats) return;
    sidebar.querySelectorAll('[data-stat]').forEach(element => {
      element.textContent = stats[element.dataset.stat] ?? '—';
    });
  }).catch(() => {});

  const calendar = sidebar.querySelector('.home-calendar');
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
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const cell = document.createElement('span');
      cell.textContent = day;
      if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) cell.className = 'calendar-today';
      grid.append(cell);
    }
  }
  calendar.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => {
    const next = new Date(year, month + (index === 0 ? -1 : 1), 1);
    year = next.getFullYear();
    month = next.getMonth();
    renderCalendar();
  }));
  renderCalendar();
});
