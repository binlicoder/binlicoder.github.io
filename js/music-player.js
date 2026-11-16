function initMusicPlayer() {
  const sidebar = document.querySelector('#aside-content');
  if (!sidebar || sidebar.querySelector('.music-card')) return;

  const tracks = [
    { title: 'Merry Christmas Mr. Lawrence', artist: '坂本龙一', file: 'merry.mp3', cover: 'merry.jpeg' },
    { title: 'For River', artist: 'Kan R. Gao', file: 'for-river.mp3', cover: 'for-river.jpeg' }
  ];
  let current = 0;
  let selection = 0;
  const card = document.createElement('section');
  card.className = 'card-widget music-card';
  card.setAttribute('aria-label', '音乐播放器');
  card.innerHTML = '<div class="music-heading">音乐播放器</div><div class="music-track"><img class="music-cover" alt=""><div class="music-details"><strong></strong><span></span></div></div><audio controls preload="metadata" aria-label="音乐播放控制"></audio><div class="music-status-row"><span class="music-status" role="status" aria-live="polite">正在加载音乐…</span><span class="music-count"></span></div><div class="music-actions"><button type="button" class="music-previous" aria-label="上一曲" title="上一曲">⏮</button><button type="button" class="music-toggle" aria-label="播放" title="播放">▶</button><button type="button" class="music-next" aria-label="下一曲" title="下一曲">⏭</button></div><div class="music-error" role="alert" hidden><span></span><button type="button" class="music-retry">重试播放</button></div>';
  const audio = card.querySelector('audio');
  const error = card.querySelector('.music-error');
  const status = card.querySelector('.music-status');
  const toggle = card.querySelector('.music-toggle');

  function updateToggle() {
    const label = audio.paused ? '播放' : '暂停';
    toggle.textContent = audio.paused ? '▶' : '❚❚';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  function showError() {
    error.querySelector('span').textContent = '音乐加载失败，请检查网络后重试。';
    error.hidden = false;
    status.textContent = '暂时无法播放';
    updateToggle();
  }

  function playTrack() {
    const requestedSelection = selection;
    error.hidden = true;
    status.textContent = '正在加载音乐…';
    audio.play().catch(reason => {
      // 快速切歌会中断旧的播放请求，不应把它当成当前歌曲加载失败。
      if (requestedSelection !== selection || reason.name === 'AbortError') return;
      if (reason.name === 'NotAllowedError') {
        status.textContent = '请点击播放开始音乐';
        updateToggle();
      } else {
        showError();
      }
    });
  }

  function selectTrack(index, play) {
    selection += 1;
    audio.pause();
    current = (index + tracks.length) % tracks.length;
    const track = tracks[current];
    card.querySelector('strong').textContent = track.title;
    card.querySelector('.music-details span').textContent = track.artist;
    card.querySelector('.music-cover').src = '/music/' + track.cover;
    card.querySelector('.music-cover').alt = track.title + ' 封面';
    card.querySelector('.music-count').textContent = `${current + 1} / ${tracks.length}`;
    audio.src = '/music/' + track.file;
    error.hidden = true;
    status.textContent = '正在加载音乐…';
    updateToggle();
    audio.load();
    if (play) playTrack();
  }

  toggle.addEventListener('click', () => {
    if (audio.paused) {
      if (audio.error) audio.load();
      playTrack();
    } else {
      audio.pause();
    }
  });
  card.querySelector('.music-retry').addEventListener('click', () => {
    selection += 1;
    audio.load();
    playTrack();
  });
  card.querySelector('.music-previous').addEventListener('click', () => selectTrack(current - 1, true));
  card.querySelector('.music-next').addEventListener('click', () => selectTrack(current + 1, true));
  audio.addEventListener('loadedmetadata', () => {
    status.textContent = audio.paused ? '点击播放，听一首音乐' : '正在播放';
    error.hidden = true;
  });
  audio.addEventListener('playing', () => {
    status.textContent = '正在播放';
    error.hidden = true;
    updateToggle();
  });
  audio.addEventListener('play', updateToggle);
  audio.addEventListener('pause', () => {
    if (!audio.error) status.textContent = '已暂停';
    updateToggle();
  });
  audio.addEventListener('waiting', () => {
    if (!audio.paused) status.textContent = '正在缓冲…';
  });
  audio.addEventListener('ended', () => selectTrack(current + 1, true));
  audio.addEventListener('error', showError);
  selectTrack(0, false);
  const author = sidebar.querySelector('.card-info');
  if (author) author.after(card); else sidebar.prepend(card);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMusicPlayer, { once: true });
} else {
  initMusicPlayer();
}
document.addEventListener('pjax:complete', initMusicPlayer);
