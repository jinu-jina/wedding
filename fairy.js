/* 요정: 둥둥 + 반짝이 가루 + 요술봉 + 터치 반짝 + 하단 캘박(갤럭시/아이폰) */
/* 💡 갤럭시/아이폰 버튼은 script.js가 만든 window.weddingCalendar 를 씀
      (예전 '예식 일시' 섹션의 Google 캘린더 / Apple 캘린더 버튼과 같은 동작, 예식 정보는 config.js 값)
      갤럭시 = 구글 캘린더 일정 추가 링크 / 아이폰 = wedding.ics 파일을 그 자리에서 만들어 내려받기
      아래 FAIRY_EVENT 는 window.weddingCalendar 가 없을 때만 쓰는 예비값입니다. */
const FAIRY_EVENT = {
  title: '정진우 ♥ 배진아 결혼식',
  start: '20261205T110000', // config.js wedding.time(11:00)과 맞춤 (한국시간)
  end: '20261205T130000',
  location: '베뉴비안 웨딩홀 2층 에메랄드홀',
  details: '저희 두 사람의 결혼식에 초대합니다.',
  icsUrl: 'wedding.ics',
};
const FAIRY_FLIP = 1;
const SPARKLE_COLORS = ['#f5c542', '#8ec5ff', '#c3a6ff', '#ffb3c7', '#ffe08a'];

function initFairy(zoneSelector) {
  const zone = document.querySelector(zoneSelector);
  if (!zone) return;
  const fairy = zone.querySelector('.fairy');
  const body = fairy.querySelector('.fairy__body');
  const img = fairy.querySelector('.fairy__img');
  const wand = fairy.querySelector('.fairy__wand');
  const tip = fairy.querySelector('.fairy__tip');
  const calendar = fairy.querySelector('.fairy__calendar');
  const yesBtn = fairy.querySelector('.fairy__yes');
  const noBtn = fairy.querySelector('.fairy__no');
  const gcal = fairy.querySelector('.fairy__gcal');
  const ics = fairy.querySelector('.fairy__ics');
  const sentinel = zone.querySelector('.fairy-sentinel');
  // 💡 감지선 위치: data-anchor가 있으면 그 섹션의 윗변(섹션 경계)에, 없으면 원래대로 영역 맨 아래
  const anchor = sentinel.dataset.anchor ? zone.querySelector(sentinel.dataset.anchor) : null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function placeSentinel() {
    if (!anchor) return;
    sentinel.style.bottom = 'auto';
    sentinel.style.height = '2px';                    // 경계 위치의 얇은 선
    sentinel.style.top = `${anchor.offsetTop - 1}px`;
  }
  placeSentinel();

  const fallbackGcal = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: FAIRY_EVENT.title,
    dates: `${FAIRY_EVENT.start}/${FAIRY_EVENT.end}`, ctz: 'Asia/Seoul',
    location: FAIRY_EVENT.location, details: FAIRY_EVENT.details,
  });
  // 💡 갤럭시: 구글 캘린더 일정 추가 (script.js가 페이지 준비 후 만들므로 누를 때 읽음)
  gcal.href = fallbackGcal;
  gcal.addEventListener('click', () => {
    if (window.weddingCalendar) gcal.href = window.weddingCalendar.googleUrl;
  });
  // 💡 아이폰: ics 파일을 그 자리에서 만들어 내려받기
  ics.href = FAIRY_EVENT.icsUrl;
  ics.addEventListener('click', (e) => {
    if (!window.weddingCalendar) return;
    e.preventDefault();
    window.weddingCalendar.downloadIcs();
  });

  let x = 30, y = 40, tx = x, ty = y;
  let facing = 1, t = 0, running = false, mode = 'wander', waveTimer = null;

  const maxX = () => Math.max(zone.clientWidth - fairy.offsetWidth, 0);
  const maxY = () => Math.max(zone.clientHeight - fairy.offsetHeight, 0);

  const PAD = 24; // 가장자리 여백
  const bubble = fairy.querySelector('.fairy__bubble');

  function newTarget() {
    const minX = PAD, maxXX = Math.max(maxX() - PAD, minX);
    const minY = PAD, maxYY = Math.max(maxY() * 0.8, minY);
    tx = minX + Math.random() * (maxXX - minX);
    ty = minY + Math.random() * (maxYY - minY);
  }
  function landingSpot() {
    const W = zone.clientWidth;
    const fw = fairy.offsetWidth;
    // 요정 + 캘린더 + 말풍선이 모두 섹션 안에 들어오는 x 범위
    const calRight = calendar.offsetLeft + calendar.offsetWidth + 14;
    const bubRight = bubble.offsetLeft + bubble.offsetWidth + 6;
    const rightEdge = Math.max(fw, calRight, bubRight);
    const total = fw * 0.62 + calendar.offsetWidth;
    let nx = (W - total) / 2;
    nx = Math.min(nx, W - rightEdge - PAD);
    nx = Math.max(nx, PAD);
    tx = nx;
    if (anchor) {
      // 💡 섹션 경계에 내려앉음 (위의 말풍선이 영역 위로 잘리지 않게 최소 높이 확보)
      const minTop = bubble.offsetHeight + 24;
      ty = Math.min(Math.max(anchor.offsetTop - fairy.offsetHeight * 0.6, minTop), maxY());
    } else {
      ty = maxY() - 70;
    }
  }

  function tick() {
    if (!running) return;
    t += 1;
    const dx = tx - x, dy = ty - y;
    const dist = Math.hypot(dx, dy);
    if (mode === 'wander' && dist < 4) newTarget();
    // 💡 착지는 빠르게(0.05 → 0.14) + 거의 도착(6px)하면 바로 캘린더·말풍선
    //    → 경계가 화면 가운데에 온 뒤 약 0.5초 안에 말풍선이 뜸 (예전엔 1~1.5초 걸려 화면 위쪽에서 떴음)
    if (mode === 'landing' && dist < 6) hold();
    if (mode === 'landing-hold' && dist < 2) mode = 'holding';
    if (mode === 'wander' && !reduce && t % 10 === 0) trail();
    const speed = reduce ? 1 : mode === 'wander' ? 0.012 : 0.14;
    x += dx * speed; y += dy * speed;
    if (mode === 'wander' || mode === 'landing') if (Math.abs(dx) > 1) facing = dx > 0 ? 1 : -1;
    const bob = reduce ? 0 : Math.sin(t * 0.08) * (mode === 'holding' ? 3 : 6);
    const tilt = reduce || mode === 'holding' || mode === 'landing-hold' ? 0 : Math.sin(t * 0.05) * 6;
    fairy.style.transform = `translate(${x}px, ${y + bob}px) rotate(${tilt}deg)`;
    body.style.transform = `scaleX(${facing * FAIRY_FLIP})`;
    requestAnimationFrame(tick);
  }

  function burst(px, py, count = 8) {
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 40;
      s.className = 'fairy-sparkle';
      s.style.left = `${px}px`; s.style.top = `${py}px`;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      s.style.setProperty('--size', `${6 + Math.random() * 10}px`);
      s.style.setProperty('--c', SPARKLE_COLORS[i % SPARKLE_COLORS.length]);
      s.style.animationDuration = `${600 + Math.random() * 500}ms`;
      s.addEventListener('animationend', () => s.remove());
      zone.appendChild(s);
    }
  }
  /* 평소 둥둥 떠다닐 때 날개 쪽에서 떨어지는 미세한 반짝이 */
  function trail() {
    const fw = fairy.offsetWidth, fh = fairy.offsetHeight;
    const px = x + fw * (0.2 + Math.random() * 0.6);
    const py = y + fh * (0.35 + Math.random() * 0.45);
    const s = document.createElement('span');
    s.className = 'fairy-sparkle fairy-sparkle--dust';
    s.style.left = `${px}px`; s.style.top = `${py}px`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 16}px`);
    s.style.setProperty('--dy', `${10 + Math.random() * 18}px`);
    s.style.setProperty('--size', `${4 + Math.random() * 5}px`);
    s.style.setProperty('--c', SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]);
    s.style.animationDuration = `${900 + Math.random() * 700}ms`;
    s.addEventListener('animationend', () => s.remove());
    zone.appendChild(s);
  }

  function zonePoint(cx, cy) {
    const z = zone.getBoundingClientRect();
    return { x: cx - z.left, y: cy - z.top };
  }

  function wave() {
    if (mode !== 'wander') return;
    wand.classList.remove('is-waving');
    void wand.offsetWidth;
    wand.classList.add('is-waving');
    [150, 300, 450].forEach((d) => setTimeout(() => {
      const r = tip.getBoundingClientRect();
      const p = zonePoint(r.left, r.top);
      burst(p.x, p.y, 6);
    }, d));
  }
  function scheduleWave() {
    clearTimeout(waveTimer);
    waveTimer = setTimeout(() => {
      if (running && !reduce) wave();
      scheduleWave();
    }, 3000 + Math.random() * 4000);
  }

  function hold() {
    mode = 'holding'; facing = 1;
    fairy.classList.add('is-holding');
    const r = calendar.getBoundingClientRect();
    const p = zonePoint(r.left + r.width / 2, r.top + r.height / 2);
    burst(p.x, p.y, 12);
  }
  function release() {
    mode = 'wander';
    fairy.classList.remove('is-holding', 'is-menu');
    newTarget();
  }
  function land() {
    if (mode === 'wander') { mode = 'landing'; landingSpot(); }
  }
  const openMenu = () => {
    fairy.classList.add('is-menu');
    landingSpot(); // 선택지로 바뀌어 넓어진 말풍선도 안 잘리게 다시 자리 잡기
    if (mode === 'holding') mode = 'landing-hold';
  };
  // 💡 '예'를 눌러야만 갤럭시/아이폰 선택지로 넘어감 (달력·문구를 눌러도 바로 넘어가지 않음)
  yesBtn.addEventListener('click', openMenu);
  // 💡 '아니오': 반짝 터지면서 달력을 내려놓고 다시 날아다님
  noBtn.addEventListener('click', () => {
    const r = calendar.getBoundingClientRect();
    const p = zonePoint(r.left + r.width / 2, r.top + r.height / 2);
    burst(p.x, p.y, 10);
    release();
  });

  // 💡 요정 터치 효과음 (터치 순간 재생이라 따로 잠금 해제 필요 없음)
  const wandSound = new Audio('images/location/fairy/fairy_wand.mp3');
  wandSound.preload = 'auto';

  body.addEventListener('pointerdown', (e) => {
    wandSound.currentTime = 0;               // 연달아 터치해도 처음부터 다시
    wandSound.play().catch(() => {});
    const p = zonePoint(e.clientX, e.clientY);
    burst(p.x, p.y, 12);
    img.classList.remove('is-boing'); void img.offsetWidth; img.classList.add('is-boing');
    wave();
  });

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      // 💡 영역에 들어올 때 이미 하단(착지)까지 보이는 경우 착지 목표를 랜덤 위치로 덮어쓰지 않게
      if (mode === 'wander') newTarget(); else landingSpot();
      requestAnimationFrame(tick); scheduleWave();
    } else if (!entry.isIntersecting) {
      running = false; clearTimeout(waveTimer);
    }
  }).observe(zone);

  // 💡 경계선이 화면 가운데(세로 40~60% 띠)에 오면 착지 + 말풍선.
  //    다시 위로 스크롤해 경계가 화면 가운데보다 아래로 내려가면 캘린더를 놓고 돌아다님
  //    (경계를 지나 계속 아래로 내려갈 때는 캘린더를 든 채로 유지)
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) land();
    else if (mode !== 'wander' && (!anchor || entry.boundingClientRect.top > window.innerHeight / 2)) release();
  }, anchor ? { threshold: 0, rootMargin: '-40% 0px -40% 0px' } : { threshold: 0.6 }).observe(sentinel);

  const relayout = () => {
    placeSentinel();
    if (mode === 'wander') newTarget(); else landingSpot();
  };
  window.addEventListener('resize', relayout);
  // 아코디언을 펼치는 등 섹션 높이가 바뀌면 경계 위치도 다시 맞춤
  if (window.ResizeObserver && anchor) new ResizeObserver(() => { placeSentinel(); if (mode !== 'wander') landingSpot(); }).observe(zone);

  fairy.style.transform = `translate(${x}px, ${y}px)`;
  return { wave, land, release };
}

initFairy('#fairyZone'); // ← 요정이 다닐 영역 id ('오시는 길' ~ '마음 전하실 곳' 두 섹션을 감싼 영역)
