/* ═══════════════════════════════════════════
   섹션 스냅 — 스크롤을 멈췄을 때 섹션 경계 근처면 경계에 딱 맞춤
   💡 CSS scroll-snap은 긴 섹션 안에서도 강제로 끌려가서(예전에 제거한 이유, styles.css html 주석)
      대신 "멈춘 위치가 섹션 경계 근처일 때만" 부드럽게 맞춥니다. 섹션 중간을 읽는 중에는 안 움직임.
   맞춤 지점
     - 모든 섹션: 윗변 → 화면 맨 위
     - 화면보다 긴 섹션: 아랫변 → 화면 맨 아래 도 추가 (그 사이에서는 자유롭게 스크롤)
   방향
     - 스크롤하던 방향 쪽 지점으로만 맞춤 (내리다 멈췄는데 위로 끌려가지 않음)
     - 반대 방향으로 되돌리는 건, 되돌렸을 때 그 섹션이 화면에 통째로 다 들어오는 경우만
   대상: 사이드 메뉴에 연결된 섹션들(홈, 모시는 글, 갤러리, 오시는 길, 마음 전하실 곳, RSVP, 방명록)
         + 맨 위 영상 섹션
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  const AHEAD_RANGE = 0.3;     // 가던 방향으로 화면 높이의 30% 안에 맞춤 지점이 있으면 → 그쪽으로 맞춤
  const BACK_RANGE = 0.15;     // 반대 방향은 15% 안 + 섹션이 화면에 다 들어올 때만 되돌림
  const IDLE = 140;            // 스크롤이 이만큼(ms) 멈추면 "멈춤"으로 판단 (scrollend 미지원 브라우저용)
  const USER_WINDOW = 1500;    // 사용자가 직접 스크롤한 뒤 이 시간 안에 멈춘 경우에만 스냅

  const targets = () => {
    const list = [document.querySelector('.top-video-section')];
    document.querySelectorAll('.side-menu__link').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.length > 1 && href[0] === '#') list.push(document.getElementById(href.slice(1)));
    });
    return list.filter(Boolean);
  };

  let lastUserInput = 0;
  let touching = false;
  let snapping = false;
  let idleTimer = null;
  let lastY = window.scrollY;
  let dir = 1;                 // 마지막으로 움직인 방향 (1 = 아래, -1 = 위)

  const markUser = () => { lastUserInput = Date.now(); };
  window.addEventListener('wheel', markUser, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) markUser();
  });
  window.addEventListener('touchstart', () => { touching = true; snapping = false; markUser(); }, { passive: true });
  // 손을 뗀 뒤 관성 스크롤이 끝나면 scrollend(또는 scroll 멈춤)에서 판단. 손 뗄 때 이미 멈춰 있었으면 여기서 판단
  window.addEventListener('touchend', () => {
    touching = false;
    markUser();
    const y = window.scrollY;
    setTimeout(() => { if (Math.abs(window.scrollY - y) < 1) trySnap(); }, IDLE);
  }, { passive: true });
  window.addEventListener('touchcancel', () => { touching = false; }, { passive: true });

  // 팝업·메뉴가 열려 있거나(스크롤 잠금) 봉투 화면 중이면 스냅하지 않음
  const blocked = () =>
    document.body.classList.contains('no-scroll') ||
    !!document.querySelector('.gb-modal.is-open, .rsvp-modal:not([hidden]), .photo-modal.is-open');

  function trySnap() {
    if (touching || snapping || blocked()) return;
    if (Date.now() - lastUserInput > USER_WINDOW) return;
    const vh = window.innerHeight;
    const maxY = document.documentElement.scrollHeight - vh;
    let best = null;                                   // 지금 위치에서 움직일 거리 (+ 아래, - 위)
    const consider = (delta, fits) => {
      if (Math.abs(delta) < 2) { best = 0; return; }   // 이미 경계에 맞춰져 있음
      const ahead = Math.sign(delta) === dir;
      if (ahead ? Math.abs(delta) > vh * AHEAD_RANGE : (!fits || Math.abs(delta) > vh * BACK_RANGE)) return;
      if (best === null || (best !== 0 && Math.abs(delta) < Math.abs(best))) best = delta;
    };
    targets().forEach((el) => {
      const r = el.getBoundingClientRect();
      const fits = r.height <= vh + 1;
      consider(r.top, fits);                           // 윗변 → 화면 맨 위
      if (!fits) consider(r.bottom - vh, false);       // 긴 섹션: 아랫변 → 화면 맨 아래
    });
    if (!best) return;
    const y = Math.min(maxY, Math.max(0, window.scrollY + best));
    if (Math.abs(y - window.scrollY) < 2) return;     // 페이지 끝이라 더 못 움직이는 경우
    snapping = true;
    lastUserInput = 0;                                 // 스냅 이동 자체로 다시 스냅되지 않게
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => { snapping = false; }, 700);
  }

  function schedule() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(trySnap, IDLE);
  }

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!snapping && Math.abs(y - lastY) > 0.5) dir = y > lastY ? 1 : -1;
    lastY = y;
    if (!('onscrollend' in window)) schedule();      // 관성 스크롤이 끝날 때까지 계속 미뤄짐
  }, { passive: true });
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', () => { clearTimeout(idleTimer); idleTimer = setTimeout(trySnap, 30); });
  }
})();
