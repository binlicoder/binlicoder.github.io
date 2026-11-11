document.addEventListener('DOMContentLoaded', () => {
  const content = document.querySelector('#body-wrap.type-404 .error-content');
  if (!content) return;

  const image = content.querySelector('.error-img img');
  if (image) {
    image.src = '/img/profile-transparent.png';
    image.alt = '';
    image.classList.add('error-avatar');
  }

  const info = content.querySelector('.error-info');
  const title = info && info.querySelector('.error_title');
  if (info && title) {
    title.textContent = '这一页走丢了';
    const code = document.createElement('span');
    code.className = 'error-code';
    code.textContent = '404';
    title.before(code);

    const actions = document.createElement('div');
    actions.className = 'error-actions';
    actions.innerHTML = '<a class="error-btn error-btn-primary" href="/">回到首页</a>'
      + '<a class="error-btn" href="/archives/">看看归档</a>';
    info.append(actions);
  }
});
