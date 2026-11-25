(() => {
  'use strict';
  const C = window.CONFIG || {};
  const MINE = window.MUSIC || {};
  const SPOT = window.SPOTIFY || {};
  const STEAM = window.STEAM || {};
  const LOCAL = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);

  const $ = (s, root = document) => root.querySelector(s);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function img(src, cls) {
    const i = el('img', cls);
    i.alt = ''; // decorative: the title and artist sit right next to it
    i.loading = 'lazy';
    i.decoding = 'async';
    if (src) i.src = src;
    return i;
  }
  function link(text, href, cls) {
    const a = el('a', cls, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  // Your own list wins; otherwise fall back to the Spotify export.
  const list = key => (MINE[key] && MINE[key].length ? MINE[key] : SPOT[key] || []);

  /* ---------- Header ---------- */
  const name = C.name || 'TBX3';
  document.title = C.aka ? `${name} · ${C.aka}` : name;
  $('#title').textContent = name;
  $('#aka').textContent = C.aka ? `aka ${C.aka}` : '';
  for (const l of C.links || []) {
    const a = el('a', null, l.label);
    a.href = l.url;
    a.rel = 'me noopener';
    $('#links').append(a);
  }

  /* ---------- Cover + 30s preview lookup (Deezer, no key needed) ---------- */
  // Deezer's API has no CORS headers, but it supports JSONP.
  let jsonpId = 0;
  function deezer(path, params = {}) {
    return new Promise((resolve, reject) => {
      const cb = `__dz${++jsonpId}`;
      const s = document.createElement('script');
      const done = () => { delete window[cb]; s.remove(); clearTimeout(timer); };
      const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, 10000);
      window[cb] = data => { done(); data && data.error ? reject(data.error) : resolve(data); };
      s.onerror = () => { done(); reject(new Error('network')); };
      s.src = `https://api.deezer.com${path}?${new URLSearchParams({ ...params, output: 'jsonp', callback: cb })}`;
      document.head.append(s);
    });
  }

  const norm = s => (s || '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s(-|–)\s.*$/, ' ')          // "Song - Remastered 2011"
    .replace(/\b(feat|ft)\..*$/, ' ')
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const mainArtist = s => (s || '').split(/,\s|\s&\s|\sx\s|\bfeat\.|\bft\./i)[0].trim();

  // Run a few at a time to stay well under Deezer's rate limit.
  let active = 0;
  const waiting = [];
  async function limited(fn) {
    if (active >= 4) await new Promise(r => waiting.push(r));
    active++;
    try { return await fn(); } finally { active--; waiting.shift()?.(); }
  }

  const q = s => (s || '').replace(/"/g, '').trim();
  async function lookup(kind, item) {
    const field = kind === 'song' ? 'track' : 'album';
    const full = q(item.artist), first = q(mainArtist(item.artist));
    const title = q(item.title.replace(/\s(-|–)\s.*$/, '').replace(/\s*[([].*?[)\]]/g, '')) || q(item.title);
    // Strict field search first ("Tyler, The Creator" must stay whole), then looser fallbacks.
    const queries = [...new Set([
      `artist:"${full}" ${field}:"${title}"`,
      `artist:"${first}" ${field}:"${title}"`,
      `${first} ${title}`,
    ])];
    const t = norm(item.title);
    const nameOf = r => norm(r.title);
    const artistOk = r => {
      const n = norm(r.artist?.name);
      return [norm(full), norm(first)].some(a => n.includes(a) || a.includes(n));
    };
    try {
      for (const query of queries) {
        const { data = [] } = await limited(() => deezer(`/search/${field}`, { q: query, limit: '10' }));
        const hit = data.find(r => artistOk(r) && nameOf(r) === t)
          || data.find(r => artistOk(r) && (nameOf(r).startsWith(t) || t.startsWith(nameOf(r))));
        if (!hit) continue;
        const cover = kind === 'song' ? hit.album : hit;
        return { id: hit.id, art: cover?.cover_xl || cover?.cover_big || null, preview: hit.preview || null, url: hit.link || null };
      }
    } catch {}
    return null;
  }
  // Deezer preview links expire after ~15 minutes; get a fresh one when needed.
  async function freshPreview(id) {
    try { return (await deezer(`/track/${id}`)).preview || null; } catch { return null; }
  }

  /* ---------- One shared audio player ---------- */
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.7;
  let current = null;
  function mark(btn, playing) {
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} preview: ${btn.dataset.name}`);
  }
  const STALE_MS = 12 * 60 * 1000;
  async function toggle(btn) {
    if (current === btn) {
      audio.paused ? audio.play().catch(() => {}) : audio.pause();
      return;
    }
    if (current) { mark(current, false); current.closest('li').style.removeProperty('--p'); }
    current = btn;
    if (btn.dataset.id && Date.now() - btn.dataset.at > STALE_MS) {
      const src = await freshPreview(btn.dataset.id);
      if (src) { btn.dataset.src = src; btn.dataset.at = Date.now(); }
      if (current !== btn) return; // clicked something else meanwhile
    }
    audio.src = btn.dataset.src;
    audio.play().catch(() => {});
  }
  audio.addEventListener('play', () => current && mark(current, true));
  audio.addEventListener('pause', () => current && mark(current, false));
  audio.addEventListener('timeupdate', () => {
    if (current && audio.duration) current.closest('li').style.setProperty('--p', audio.currentTime / audio.duration);
  });
  audio.addEventListener('ended', () => current && current.closest('li').style.removeProperty('--p'));

  /* ---------- Sections ---------- */
  function emptyOrHide(section, hint) {
    if (!LOCAL) { section.hidden = true; return; }
    const p = el('p', 'empty');
    p.innerHTML = hint; // static text only, shown just while you edit locally
    section.append(p);
  }

  function trackRow(item, i, numbered) {
    const li = el('li', 'track');
    const btn = el('button', 'play');
    btn.type = 'button';
    btn.disabled = true;
    btn.dataset.name = `${item.title} by ${item.artist}`;
    btn.setAttribute('aria-label', `No preview: ${btn.dataset.name}`);
    const cover = img(item.art);
    btn.append(cover);
    btn.addEventListener('click', () => toggle(btn));

    const meta = el('span', 'meta');
    let title = item.spotify ? link(item.title, item.spotify, 'title') : el('span', 'title', item.title);
    meta.append(title, el('span', 'artist', item.artist));
    if (numbered) li.append(el('span', 'num', String(i + 1).padStart(2, '0')));
    li.append(btn, meta);

    const enable = src => {
      btn.dataset.src = src;
      btn.disabled = false;
      mark(btn, false);
    };
    if (item.preview) enable(item.preview);
    if (!item.preview || !item.art) {
      lookup('song', item).then(found => {
        if (!found) return;
        if (!item.art && found.art) cover.src = found.art;
        if (!item.preview && found.preview) {
          btn.dataset.id = found.id;
          btn.dataset.at = Date.now();
          enable(found.preview);
        }
        if (!item.spotify && found.url) { // no Spotify link given: link the title to the Deezer match
          const a = link(item.title, found.url, 'title');
          title.replaceWith(a);
          title = a;
        }
      });
    }
    return li;
  }

  function songs(sectionId, items, numbered, heading) {
    const section = $(sectionId);
    if (heading) $('h2', section).textContent = heading;
    if (!items.length) {
      return emptyOrHide(section, 'Nothing here yet. Add songs in <code>music.js</code>, or run <code>tools/update.py spotify</code>.');
    }
    const ol = $('ol', section);
    items.forEach((item, i) => ol.append(trackRow(item, i, numbered)));
  }

  function albums(items) {
    const section = $('#top-albums');
    $('h2', section).textContent = `Top ${items.length || C.limits?.topAlbums || 10} albums`;
    if (!items.length) {
      return emptyOrHide(section, 'Nothing here yet. Add albums in <code>music.js</code>, or run <code>tools/update.py spotify</code>.');
    }
    const ol = $('ol', section);
    items.forEach((item, i) => {
      const li = el('li', 'album');
      const a = el(item.spotify ? 'a' : 'div');
      if (item.spotify) { a.href = item.spotify; a.target = '_blank'; a.rel = 'noopener'; }
      const cover = img(item.art, 'cover');
      const title = el('div', 'title');
      title.append(el('b', null, String(i + 1).padStart(2, '0')), item.title);
      a.append(cover, title, el('div', 'artist', item.artist));
      li.append(a);
      ol.append(li);
      if (!item.art) lookup('album', item).then(found => { if (found?.art) cover.src = found.art; });
    });
  }

  function steam() {
    const card = $('.steam');
    const url = STEAM.url || (C.links || []).find(l => /steamcommunity/.test(l.url))?.url;
    const info = el('div');
    info.append(
      el('div', 'big', STEAM.name || name),
      el('div', 'sub', STEAM.memberSince ? `Steam member since ${STEAM.memberSince}` : 'Steam'),
    );
    card.append(img(STEAM.avatar), info);
    if (url) card.append(link('Profile', url, 'ext'));
    const games = C.favouriteGames || [];
    if (games.length) {
      const g = el('div', 'games');
      for (const game of games) g.append(el('span', null, game));
      card.append(g);
    }
  }

  /* ---------- Live listening via Last.fm ---------- */
  function ago(seconds) {
    const s = Date.now() / 1000 - seconds;
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} days ago`;
  }
  const LASTFM_BLANK = '2a96cbd8b46e442fc41c2b86b821562f'; // Last.fm's grey star placeholder

  function listening() {
    const { user, apiKey } = C.lastfm || {};
    const section = $('#now');
    if (!user || !apiKey) {
      if (LOCAL) {
        section.hidden = false;
        $('.now', section).remove();
        emptyOrHide(section, 'Add your Last.fm user and API key in <code>config.js</code> to show what you’re playing.');
      }
      return;
    }
    const card = $('.now', section);
    let lastKey = '';
    async function tick() {
      try {
        const params = new URLSearchParams({ method: 'user.getrecenttracks', user, api_key: apiKey, format: 'json', limit: '1' });
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
        const data = await res.json();
        const t = [].concat(data.recenttracks?.track || [])[0];
        if (!t) return;
        const live = t['@attr']?.nowplaying === 'true';
        const item = { title: t.name, artist: t.artist?.['#text'] || '' };
        const key = `${live}|${item.artist}|${item.title}|${t.date?.uts}`;
        if (key === lastKey) return;
        lastKey = key;

        let art = (t.image || []).at(-1)?.['#text'];
        if (!art || art.includes(LASTFM_BLANK)) art = (await lookup('song', item))?.art;

        const status = el('div', 'status');
        status.append(el('span', 'dot'), live ? 'Now playing' : `Last played · ${t.date ? ago(+t.date.uts) : ''}`);
        const info = el('div');
        info.append(status, el('div', 'big', item.title), el('div', 'sub', item.artist));
        card.className = `card now${live ? ' live' : ''}`;
        card.replaceChildren(img(art, 'cover'), info, link('Last.fm', t.url, 'ext'));
        section.hidden = false;
      } catch {}
    }
    tick();
    setInterval(() => { if (!document.hidden) tick(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }

  const limits = C.limits || {};
  const top = list('topSongs').slice(0, limits.topSongs ?? 5);
  listening();
  steam();
  songs('#top-songs', top, true, `Top ${top.length || limits.topSongs || 5} songs`);
  albums(list('topAlbums').slice(0, limits.topAlbums ?? 10));
  songs('#favourites', list('favourites'), false);
})();
