// Opening intro: a few full-screen wallpapers crossfade, then the overlay
// lifts away to reveal the site. Images and timing live in config.js (intro).
(() => {
  'use strict';
  const cfg = (window.CONFIG || {}).intro || {};
  // Each entry is a path, or { desktop, mobile } — portrait screens get mobile.
  const tall = matchMedia('(max-aspect-ratio: 1/1)').matches;
  const all = (cfg.images || [])
    .map((x) => (typeof x === 'string' ? x : (tall && x.mobile) || x.desktop || x.mobile))
    .filter(Boolean);
  if (!all.length) return;

  const root = document.documentElement;
  root.classList.add('intro-on'); // hides the page until the overlay is up

  const total = (cfg.seconds || 2.6) * 1000;
  const count = Math.min(cfg.show || 3, all.length);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Random pick each visit, so it isn't the same wallpapers every time.
  const pick = all.slice();
  for (let i = pick.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pick[i], pick[j]] = [pick[j], pick[i]];
  }
  const shown = pick.slice(0, reduced ? 1 : count);

  let done = false;
  let overlay;
  function finish() {
    if (done) return;
    done = true;
    root.classList.remove('intro-on');
    if (!overlay) return;
    overlay.classList.add('out');
    setTimeout(() => overlay.remove(), 700);
  }
  // Never hold the site hostage: bail if the first image is slow.
  const safety = setTimeout(finish, total + 1500);

  document.addEventListener('DOMContentLoaded', () => {
    overlay = document.createElement('div');
    overlay.id = 'intro';
    overlay.setAttribute('aria-hidden', 'true');
    const slides = shown.map((src) => {
      const s = document.createElement('div');
      s.className = 'slide';
      s.style.backgroundImage = `url("${src}")`;
      overlay.append(s);
      return s;
    });
    document.body.prepend(overlay);
    overlay.addEventListener('click', finish);
    addEventListener('keydown', finish, { once: true });

    const first = new Image();
    first.onload = first.onerror = () => {
      if (done) return;
      clearTimeout(safety);
      const step = total / slides.length;
      slides.forEach((s, i) => setTimeout(() => {
        if (done) return;
        slides.forEach((o) => o.classList.remove('on'));
        s.classList.add('on');
      }, i * step));
      setTimeout(finish, total);
    };
    first.src = shown[0];
    shown.slice(1).forEach((src) => { new Image().src = src; });
  });
})();
