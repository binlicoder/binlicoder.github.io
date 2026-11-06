document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('#aside-content');
  if (!sidebar) return;

  const tracks = [
    { title: 'Merry Christmas Mr. Lawrence', artist: '坂本龙一', file: 'merry.mp3', cover: 'merry.jpeg' },
    { title: 'For River', artist: 'Kan R. Gao', file: 'for-river.mp3', cover: 'for-river.jpeg' },
    { title: '天龙八部之宿敌', artist: '许嵩 · 哔哩哔哩', embed: 'https://player.bilibili.com/player.html?bvid=BV1D54y1R71q&autoplay=0', coverUrl: '/img/cover.svg' }
  ];
  let current = 0;
  const card = document.createElement('section');
  card.className = 'card-widget music-card';
  card.setAttribute('aria-label', '音乐播放器');
  card.innerHTML = '<div class="music-heading">音乐播放器</div><div class="music-track"><img class="music-cover" alt=""><div class="music-details"><strong></strong><span></span></div></div><audio controls preload="none" aria-label="音乐播放控制"></audio><div class="music-actions"><button type="button" class="music-previous" aria-label="上一曲">⏮</button><span class="music-count"></span><button type="button" class="music-next" aria-label="下一曲">⏭</button></div><p class="music-error" hidden>音频暂时无法播放，请稍后重试。</p>';
  const audio = card.querySelector('audio');
  const error = card.querySelector('.music-error');
  const video = document.createElement('iframe');
  video.title = '哔哩哔哩播放器：天龙八部之宿敌';
  video.className = 'music-video';
  video.allow = 'fullscreen';
  video.hidden = true;
  audio.after(video);
  const videoLink = document.createElement('a');
  videoLink.href = 'https://www.bilibili.com/video/BV1D54y1R71q/';
  videoLink.target = '_blank';
  videoLink.rel = 'noopener noreferrer';
  videoLink.textContent = '无法播放？前往哔哩哔哩观看';
  videoLink.className = 'music-video-link';
  videoLink.hidden = true;
  video.after(videoLink);
  function selectTrack(index, play) {
    current = (index + tracks.length) % tracks.length;
    const track = tracks[current];
    card.querySelector('strong').textContent = track.title;
    card.querySelector('.music-details span').textContent = track.artist;
    card.querySelector('.music-cover').src = track.coverUrl || 'https://blog.gochi.cn/assets/music/cover/' + track.cover;
    card.querySelector('.music-count').textContent = `${current + 1} / ${tracks.length}`;
    audio.pause();
    audio.hidden = Boolean(track.embed);
    video.hidden = !track.embed;
    videoLink.hidden = !track.embed;
    if (track.embed) {
      audio.removeAttribute('src');
      audio.load();
      video.src = track.embed;
    } else {
      video.removeAttribute('src');
      audio.src = 'https://blog.gochi.cn/assets/music/url/' + track.file;
    }
    error.hidden = true;
    if (play && !track.embed) audio.play().catch(() => { error.hidden = false; });
  }
  card.querySelector('.music-previous').addEventListener('click', () => selectTrack(current - 1, true));
  card.querySelector('.music-next').addEventListener('click', () => selectTrack(current + 1, true));
  audio.addEventListener('ended', () => selectTrack(current + 1, true));
  audio.addEventListener('error', () => { error.hidden = false; });
  selectTrack(0, false);
  const author = sidebar.querySelector('.card-info');
  if (author) author.after(card); else sidebar.prepend(card);
});
