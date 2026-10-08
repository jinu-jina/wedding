/* ═══════════════════════════════════════════
   방명록 [06] — 디지털 축하 화환 전시장 (guestbook.css 와 짝)
   - 화환 저장: CONFIG.guestbook.scriptUrl(구글 Apps Script, google-apps-script/guestbook.gs)
     비어 있으면 이 기기 브라우저(localStorage)에만 저장 → 테스트용
   - 화환 = 꽃(flower) + 글씨 리본(belt) + 상단 리본(ribbon) 이미지 3장 + 좌/우 리본 글씨
     원본 SVG(guestbook_edit.svg) 좌표 그대로, 화환 한 개를 360×410 상자로 보고 배치
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  const section = document.getElementById('guestbook');
  if (!section || !section.querySelector('.gb-main')) return;
  const $ = (sel, root) => (root || section).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || section).querySelectorAll(sel));

  /* ─── 화환 부품 (파일명, 원본 가로, 세로[, 크기 배율]) — images/guestbook/<종류>/<파일명>.png ───
     💡 크기 배율: 그 이미지만 크게/작게 (r5는 글씨 리본 윗모서리가 보여서 1.25배)
     💡 여기 가로·세로는 "배치 기준 크기"라 실제 파일 픽셀과 달라도 됨
        (꽃 f1~f7 파일은 용량을 줄이려고 0.9배로 줄여 둠 — PNG 저장 시 그려지는 크기와 같음. 원본 백업: Downloads\wedding_backup) */
  const PARTS = {
    ribbon: [['r1', 231, 231], ['r2', 286, 202], ['r3', 270, 258], ['r4', 250, 226], ['r5', 266, 218, 1.25], ['r6', 295, 201],
      ['r7', 295, 201], ['r8', 295, 201], ['r9', 295, 201], ['r10', 295, 201], ['r11', 295, 201]],
    belt: [['b_green', 688, 974], ['b_orange', 688, 974], ['b_pink', 688, 974], ['b_red', 688, 974],
      ['b_violet', 688, 974], ['b_blue', 688, 974], ['b_yellow', 688, 974]],
    flower: [['f1', 996, 997], ['f2', 975, 976], ['f3', 996, 1006], ['f4', 991, 990], ['f5', 996, 1074],
      ['f6', 668, 999], ['f7', 660, 1035]]
  };
  // 💡 ?v= : 이미지를 바꿨을 때 브라우저가 예전 파일을 쓰지 않도록 (꽃 이미지 교체 2026-10-08)
  const src = (part, name) => 'images/guestbook/' + part + '/' + name + '.png?v=20261008';
  const partInfo = (part, name) => PARTS[part].find((p) => p[0] === name) || PARTS[part][0];

  /* ─── 화환 배치 (360×410 상자 기준, 원본 이미지 × 0.36) ─── */
  const BOX_W = 360, BOX_H = 410, IMG_SCALE = 0.36;
  const FLOWER_C = [180, 215];               // 꽃 이미지 중심
  const BELT_POS = [180 - 688 * IMG_SCALE / 2, 54.93];
  const RIBBON_C = [180, 46.4];              // 상단 리본 이미지 중심
  // 리본 글씨: 글씨 리본(belt) 이미지의 왼쪽/오른쪽 띠 안쪽 밝은 부분 한가운데, 띠 기울기(13.1°)대로 세로쓰기
  const TEXT = {
    size: 58 * IMG_SCALE,                    // 띠 원본 기준 58px (밝은 부분 폭 약 67px 안에 들어가는 크기)
    maxLen: 792 * IMG_SCALE,                 // 상단 리본 아래 ~ 띠 끝 갈라진 곳 위까지 (약 13자)
    left: [BELT_POS[0] + 150.3 * IMG_SCALE, BELT_POS[1] + 505 * IMG_SCALE],
    right: [BELT_POS[0] + (688 - 150.3) * IMG_SCALE, BELT_POS[1] + 505 * IMG_SCALE],
    angle: 13.1
  };
  const FONT_STACK = "'GbGungsuh', 'Gungsuh', '궁서', 'GungSeo', serif";

  function layerRect(part, name) {
    const [, w0, h0, zoom = 1] = partInfo(part, name);
    const w = w0 * IMG_SCALE * zoom, h = h0 * IMG_SCALE * zoom;
    if (part === 'flower') return [FLOWER_C[0] - w / 2, FLOWER_C[1] - h / 2, w, h];
    if (part === 'belt') return [BELT_POS[0], BELT_POS[1], w, h];
    return [RIBBON_C[0] - w / 2, RIBBON_C[1] - h / 2, w, h];
  }

  function makeLayer(part, name) {
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    setLayer(img, part, name);
    return img;
  }
  function setLayer(img, part, name) {
    const [x, y, w, h] = layerRect(part, name);
    img.src = src(part, name);
    img.style.left = (x / BOX_W * 100) + '%';
    img.style.top = (y / BOX_H * 100) + '%';
    img.style.width = (w / BOX_W * 100) + '%';
    img.style.height = (h / BOX_H * 100) + '%';
  }
  function makeText(side) {
    const span = document.createElement('span');
    span.className = 'gb-wreath__text';
    const [x, y] = TEXT[side];
    span.style.left = (x / BOX_W * 100) + '%';
    span.style.top = (y / BOX_H * 100) + '%';
    span.style.setProperty('--rot', (side === 'left' ? TEXT.angle : -TEXT.angle) + 'deg');
    return span;
  }

  // 화환 한 개 (k = 크기 배율). 위에 덮는 흰 실루엣(glow)은 선택했을 때만 보임
  function createWreath(item, k) {
    const el = document.createElement('div');
    el.className = 'gb-wreath';
    el.style.setProperty('--k', k);
    const layers = {
      flower: makeLayer('flower', item.flower),
      belt: makeLayer('belt', item.belt),
      left: makeText('left'),
      right: makeText('right'),
      ribbon: makeLayer('ribbon', item.ribbon)
    };
    layers.left.textContent = item.left || '';
    layers.right.textContent = item.right || '';
    el.append(layers.flower, layers.belt, layers.left, layers.right, layers.ribbon);
    const glow = document.createElement('div');
    glow.className = 'gb-wreath__glow';
    glow.append(makeLayer('flower', item.flower), makeLayer('belt', item.belt), makeLayer('ribbon', item.ribbon));
    el.appendChild(glow);
    el._layers = layers;
    return el;
  }

  /* ─── 알림 (사이트 공용 #toast 재사용) ─── */
  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2500);
  }

  /* ═══════════════════════════════════════════
     저장소: 구글 Apps Script(모든 하객 공유) / localStorage(이 기기만)
     ═══════════════════════════════════════════ */
  const LOCAL_KEY = 'gbWreaths';
  const LOCAL_MASTER = '333cc17d5e16d15f23f5341ec1d700f9660ee8ff8e90fb2e17710ef6c7a27331';   // 관리자 비밀번호의 SHA-256
  // 💡 config.js의 const CONFIG는 window에 붙지 않으므로 window.CONFIG가 아니라 typeof로 확인
  const scriptUrl = () => ((typeof CONFIG !== 'undefined' && CONFIG.guestbook && CONFIG.guestbook.scriptUrl) || '').trim();

  async function sha256(text) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return 'plain:' + text;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const readLocal = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; }
  };
  const writeLocal = (list) => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) {}
  };
  const pick = (d) => ({ ribbon: d.ribbon, belt: d.belt, flower: d.flower, left: d.left, right: d.right });

  async function post(payload) {
    // text/plain으로 보내야 Apps Script가 사전 요청(CORS preflight) 없이 받음
    const res = await fetch(scriptUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const err = new Error(data.error || String(res.status));
      err.code = data.error;
      throw err;
    }
    return data;
  }

  async function localAuth(id, auth) {
    const list = readLocal();
    const i = list.findIndex((w) => w.id === id);
    if (i < 0) { const e = new Error('notfound'); e.code = 'notfound'; throw e; }
    const h = await sha256(auth);
    if (h !== LOCAL_MASTER && (await sha256(id + ':' + auth)) !== list[i].pw) {
      const e = new Error('password'); e.code = 'password'; throw e;
    }
    return { list, i, master: h === LOCAL_MASTER };
  }

  const store = {
    async list() {
      if (!scriptUrl()) return readLocal().map((w) => Object.assign({ id: w.id, createdAt: w.createdAt }, pick(w)))
        .sort((a, b) => b.createdAt - a.createdAt);
      const res = await fetch(scriptUrl());
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'list');
      return data.items || [];
    },
    async create(d) {
      if (scriptUrl()) return post(Object.assign({ action: 'create', password: d.password }, pick(d)));
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const list = readLocal();
      list.push(Object.assign({ id, createdAt: Date.now(), pw: await sha256(id + ':' + d.password) }, pick(d)));
      writeLocal(list);
      return { ok: true };
    },
    async verify(id, auth) {
      if (scriptUrl()) return post({ action: 'verify', id, auth });
      await localAuth(id, auth);
      return { ok: true };
    },
    async update(id, auth, d) {
      if (scriptUrl()) return post(Object.assign({ action: 'update', id, auth, password: d.password }, pick(d)));
      const { list, i } = await localAuth(id, auth);
      Object.assign(list[i], pick(d));
      if (d.password && (await sha256(d.password)) !== LOCAL_MASTER) list[i].pw = await sha256(id + ':' + d.password);
      writeLocal(list);
      return { ok: true };
    },
    async remove(id, auth) {
      if (scriptUrl()) return post({ action: 'delete', id, auth });
      const { list, i } = await localAuth(id, auth);
      list.splice(i, 1);
      writeLocal(list);
      return { ok: true };
    }
  };

  /* ═══════════════════════════════════════════
     화면 크기 맞춤: 원본 px 레이아웃을 통째로 축소
     ═══════════════════════════════════════════ */
  let scale = 1;
  function fit() {
    const vw = document.documentElement.clientWidth || window.innerWidth;
    scale = Math.min(1, section.clientWidth / 490) || 1;
    section.style.setProperty('--gb-s', scale);
    section.style.setProperty('--gb-es', Math.min(1, (vw - 24) / 470));
    section.style.setProperty('--gb-ps', Math.min(1, (vw - 24) / 424));
  }
  fit();
  window.addEventListener('resize', fit);

  /* ═══════════════════════════════════════════
     팝업 공통 (열린 순서대로 쌓임, Esc·바깥 터치로 닫기)
     ═══════════════════════════════════════════ */
  const openStack = [];
  function openModal(modal, onClose) {
    modal._onClose = onClose || null;
    modal._lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.hidden = false;
    modal.scrollTop = 0;
    openStack.push(modal);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    const dialog = modal.querySelector('[role="dialog"], [role="alertdialog"]');
    if (dialog) dialog.focus({ preventScroll: true });   // 입력칸에 바로 포커스하면 휴대폰 키보드가 튀어나와서 팝업 자체에 포커스
  }
  function closeModal(modal) {
    if (modal.hidden) return;
    const i = openStack.indexOf(modal);
    if (i >= 0) openStack.splice(i, 1);
    modal.classList.remove('is-open');
    setTimeout(() => { if (!modal.classList.contains('is-open')) modal.hidden = true; }, 250);
    if (!openStack.length && !document.querySelector('.rsvp-modal:not([hidden])')) document.body.classList.remove('no-scroll');
    if (modal._lastFocus && modal._lastFocus.isConnected) modal._lastFocus.focus({ preventScroll: true });
    const cb = modal._onClose;
    modal._onClose = null;
    if (cb) cb();
  }
  // 닫기 요청 (만들기 팝업은 수정 사항이 있으면 확인 팝업을 먼저 띄움)
  function requestClose(modal) {
    if (modal === editModal) return requestEditClose();
    closeModal(modal);
  }
  $$('.gb-modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) requestClose(modal);          // 바깥 어두운 곳 터치
      if (e.target.closest('[data-gb-close]')) requestClose(modal);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openStack.length) requestClose(openStack[openStack.length - 1]);
  });

  const infoModal = $('#gbInfoModal');
  const optionModal = $('#gbOptionModal');
  const editModal = $('#gbEditModal');
  const exitModal = $('#gbExitModal');

  $('.gb-main__info').addEventListener('click', () => openModal(infoModal));

  /* ═══════════════════════════════════════════
     전시장: 화환 목록 + 자동 흐름 + 스크롤바 + 페이지 번호
     ═══════════════════════════════════════════ */
  const PAGE_W = 1596;                        // 배경 한 장(bg.jpg 1900 × 0.84) = 화환 7개
  const PER_PAGE = 7;
  const SLOT_W = PAGE_W / PER_PAGE;
  const WREATH_K = 0.68;                      // 전시장 화환 크기 (만들기 화면의 68%)
  const VIEW_W = 490;
  const AUTO_SPEED = 26;                      // 자동 흐름 속도 (px/초)
  const RESUME_DELAY = 3000;                  // 손을 뗀 뒤 자동 흐름 다시 시작까지
  const END_PAUSE = 2500;                     // 끝에 닿으면 잠깐 멈췄다가 처음으로

  const stage = $('.gb-stage');
  const track = $('.gb-stage__track');
  const listEl = $('.gb-stage__list');
  const scrollEl = $('.gb-scroll');
  const thumb = $('.gb-scroll__thumb');
  const pagesEl = $('.gb-pages');
  const RANGE_LEFT = 4, RANGE_W = 410;       // 손잡이가 움직이는 구간 (레일 안쪽: 418 - 양쪽 4px)

  let items = [];
  let pos = 0, maxPos = 0, thumbW = 52;
  let resumeAt = 0, endAt = 0, inView = false, lastT = 0, rafId = 0, animTo = null;
  let selectedLi = null;

  function renderList() {
    listEl.innerHTML = '';
    const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    listEl.style.width = (pages * PAGE_W) + 'px';
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'gb-stage__item';
      li.style.left = (i * SLOT_W + (SLOT_W - BOX_W * WREATH_K) / 2) + 'px';
      li.dataset.index = i;
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.setAttribute('aria-label', '축하 화환: ' + item.left + ' / ' + item.right + ' (눌러서 수정·삭제)');
      li.appendChild(createWreath(item, WREATH_K));
      listEl.appendChild(li);
    });
    // 움직이는 범위는 마지막 화환까지만 (화환이 화면 안에 다 들어오면 안 움직이고 스크롤바도 꽉 참)
    const contentW = Math.max(VIEW_W, items.length * SLOT_W);
    maxPos = contentW - VIEW_W;
    thumbW = Math.max(40, RANGE_W * VIEW_W / contentW);
    thumb.style.width = thumbW + 'px';
    pagesEl.innerHTML = '';
    for (let p = 0; p < pages; p++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p + 1;
      b.setAttribute('aria-label', (p + 1) + '페이지');
      b.addEventListener('click', () => { pauseAuto(); animateTo(Math.min(p * PAGE_W, maxPos)); });
      pagesEl.appendChild(b);
    }
    setPos(Math.min(pos, maxPos));
  }

  function setPos(x) {
    pos = Math.max(0, Math.min(maxPos, x));
    track.style.transform = 'translate3d(' + (-pos) + 'px,0,0)';
    const ratio = maxPos ? pos / maxPos : 0;
    thumb.style.left = (RANGE_LEFT + (RANGE_W - thumbW) * ratio) + 'px';
    thumb.setAttribute('aria-valuenow', Math.round(ratio * 100));
    const pages = pagesEl.children.length;
    const active = (maxPos && pos >= maxPos - 1) ? pages - 1      // 끝까지 오면 마지막 페이지
      : Math.min(pages - 1, Math.floor((pos + VIEW_W / 2) / PAGE_W));
    Array.from(pagesEl.children).forEach((b, i) => {
      b.classList.toggle('is-active', i === active);
      if (i === active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pauseAuto() { resumeAt = performance.now() + RESUME_DELAY; endAt = 0; animTo = null; }

  // 페이지 번호를 눌렀을 때 부드럽게 이동
  function animateTo(x) {
    if (reduceMotion) { setPos(x); return; }
    animTo = { from: pos, to: Math.max(0, Math.min(maxPos, x)), t0: performance.now() };
    resumeAt = performance.now() + 600 + RESUME_DELAY;
    startLoop();
  }

  function frame(t) {
    rafId = 0;
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
    lastT = t;
    if (animTo) {
      const p = Math.min(1, (t - animTo.t0) / 600);
      const e = 1 - Math.pow(1 - p, 3);
      setPos(animTo.from + (animTo.to - animTo.from) * e);
      if (p >= 1) animTo = null;
    } else if (!dragging && !reduceMotion && maxPos > 0 && t >= resumeAt && !openStack.length) {
      if (pos < maxPos) {
        setPos(pos + AUTO_SPEED * dt);         // 오른쪽 → 왼쪽으로 흘러감
      } else if (!endAt) {
        endAt = t + END_PAUSE;
      } else if (t >= endAt) {
        endAt = 0;                             // 끝 → 살짝 사라졌다가 처음부터
        track.classList.add('is-fading');
        resumeAt = t + 1200;
        setTimeout(() => { setPos(0); track.classList.remove('is-fading'); }, 400);
      }
    }
    if (inView) rafId = requestAnimationFrame(frame);
  }
  function startLoop() {
    if (!rafId && inView) { lastT = 0; rafId = requestAnimationFrame(frame); }
  }

  // 화면에 보일 때만 움직임 (배터리 절약)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) startLoop();
    }).observe(stage);
  } else {
    inView = true;
    startLoop();
  }

  /* ─── 끌기: 전시장을 직접 밀거나, 스크롤바 손잡이를 끌거나 ─── */
  let dragging = false;
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: pos, moved: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.moved = true;
      dragging = true;
      animTo = null;
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    }
    setPos(drag.start - dx / scale);
  });
  const endStageDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasTap = !drag.moved && e.type === 'pointerup';
    drag = null;
    dragging = false;
    stage.classList.remove('is-dragging');
    pauseAuto();
    if (wasTap) {
      const li = e.target.closest && e.target.closest('.gb-stage__item');
      if (li) openOption(li);
    }
  };
  stage.addEventListener('pointerup', endStageDrag);
  stage.addEventListener('pointercancel', endStageDrag);
  stage.addEventListener('keydown', (e) => {
    const li = e.target.closest('.gb-stage__item');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openOption(li); }
  });
  stage.addEventListener('focusin', (e) => {    // 키보드로 화환을 옮겨 다닐 때 보이게
    const li = e.target.closest('.gb-stage__item');
    if (!li) return;
    pauseAuto();
    const left = parseFloat(li.style.left);
    if (left < pos || left + BOX_W * WREATH_K > pos + VIEW_W) animateTo(left - (VIEW_W - BOX_W * WREATH_K) / 2);
  });

  let thumbDrag = null;
  thumb.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    thumbDrag = { id: e.pointerId, x: e.clientX, start: parseFloat(thumb.style.left) || RANGE_LEFT };
    dragging = true;
    animTo = null;
    try { thumb.setPointerCapture(e.pointerId); } catch (err) {}
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!thumbDrag || e.pointerId !== thumbDrag.id) return;
    const free = RANGE_W - thumbW;
    if (free <= 0) return;
    const left = Math.max(RANGE_LEFT, Math.min(RANGE_LEFT + free, thumbDrag.start + (e.clientX - thumbDrag.x) / scale));
    setPos((left - RANGE_LEFT) / free * maxPos);
  });
  const endThumbDrag = (e) => {
    if (!thumbDrag || e.pointerId !== thumbDrag.id) return;
    thumbDrag = null;
    dragging = false;
    pauseAuto();
  };
  thumb.addEventListener('pointerup', endThumbDrag);
  thumb.addEventListener('pointercancel', endThumbDrag);
  thumb.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -SLOT_W, ArrowRight: SLOT_W, Home: -Infinity, End: Infinity }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    pauseAuto();
    animateTo(pos + step);
  });
  // 스크롤바 빈 곳을 누르면 그 위치로
  scrollEl.addEventListener('click', (e) => {
    if (e.target.closest('.gb-scroll__thumb')) return;
    const r = scrollEl.getBoundingClientRect();
    const free = RANGE_W - thumbW;
    if (free <= 0) return;
    const x = (e.clientX - r.left) / scale - thumbW / 2 - RANGE_LEFT;
    pauseAuto();
    animateTo(Math.max(0, Math.min(1, x / free)) * maxPos);
  });

  async function loadItems() {
    try {
      items = await store.list();
    } catch (err) {
      console.warn('[guestbook] 화환 목록을 불러오지 못했습니다', err);
      items = [];
    }
    renderList();
    startLoop();
  }

  /* ═══════════════════════════════════════════
     화환 수정 및 삭제 팝업
     ═══════════════════════════════════════════ */
  const optionForm = $('.gb-pop--option');
  const optionPw = $('.gb-pop__password');
  const optionErr = $('.gb-pop__error', optionForm);
  let optionItem = null, optionBusy = false;

  function openOption(li) {
    const item = items[+li.dataset.index];
    if (!item) return;
    if (selectedLi) selectedLi.classList.remove('is-selected');
    selectedLi = li;
    li.classList.add('is-selected');            // 화환 실루엣을 흰색 60%로
    optionItem = item;
    optionPw.value = '';
    optionErr.textContent = '';
    openModal(optionModal, () => {
      if (selectedLi) selectedLi.classList.remove('is-selected');
      selectedLi = null;
      pauseAuto();
    });
  }

  const errorText = (err) =>
    err.code === 'password' ? '비밀번호가 일치하지 않습니다' :
    err.code === 'notfound' ? '이미 삭제된 화환입니다' : '잠시 후 다시 시도해 주세요';

  async function optionAction(action) {
    if (optionBusy || !optionItem) return;
    const pw = optionPw.value;
    if (!pw) { optionErr.textContent = '비밀번호를 입력해 주세요'; optionPw.focus(); return; }
    optionBusy = true;
    const btns = $$('.gb-pop__btn', optionForm);
    btns.forEach((b) => { b.disabled = true; });
    optionErr.textContent = '';
    try {
      if (action === 'delete') {
        await store.remove(optionItem.id, pw);
        closeModal(optionModal);
        await loadItems();
        toast('화환이 삭제되었습니다');
      } else {
        await store.verify(optionItem.id, pw);
        const item = optionItem;
        closeModal(optionModal);
        openEdit(item, pw);
      }
    } catch (err) {
      optionErr.textContent = errorText(err);
      if (err.code === 'notfound') loadItems();
    } finally {
      optionBusy = false;
      btns.forEach((b) => { b.disabled = false; });
    }
  }
  optionForm.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gb-action]');
    if (btn) optionAction(btn.dataset.gbAction);
  });
  optionForm.addEventListener('submit', (e) => { e.preventDefault(); optionAction('edit'); });   // 키보드 엔터 = 수정하기

  /* ═══════════════════════════════════════════
     축하 화환 만들기 / 수정 팝업
     ═══════════════════════════════════════════ */
  const editForm = $('.gb-edit');
  const editTitle = $('.gb-edit__title');
  const preview = $('.gb-edit__preview');
  const msgEl = $('.gb-edit__msg');
  const submitBtn = $('.gb-edit__submit');
  const inputs = { left: editForm.elements.left, right: editForm.elements.right, password: editForm.elements.password };
  let state = null, snapshot = '', editTarget = null, activePart = 'belt', previewEl = null, sending = false, msgTimer = null;

  const snap = () => JSON.stringify(state);
  const isDirty = () => !!state && snap() !== snapshot;

  function showMsg(text, ms) {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => { msgEl.textContent = ''; }, ms);
  }

  function setTab(part) {
    activePart = part;
    $$('.gb-edit__tab', editForm).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.part === part)));
  }

  function drawPreview() {
    previewEl = createWreath(state, 1);
    preview.innerHTML = '';
    preview.appendChild(previewEl);
  }
  function setPart(part, name) {
    state[part] = name;
    const L = previewEl._layers;
    setLayer(L[part], part, name);
    const glow = previewEl.querySelector('.gb-wreath__glow');
    const i = ['flower', 'belt', 'ribbon'].indexOf(part);
    if (glow && i >= 0) setLayer(glow.children[i], part, name);
  }

  function openEdit(item, auth) {
    editTarget = item ? { id: item.id, auth } : null;
    state = item
      ? { ribbon: item.ribbon, belt: item.belt, flower: item.flower, left: item.left, right: item.right, password: auth }
      : { ribbon: PARTS.ribbon[0][0], belt: PARTS.belt[0][0], flower: PARTS.flower[0][0], left: '', right: '', password: '' };
    snapshot = snap();
    editTitle.innerHTML = item ? '축하 화환<br>수정하기' : '축하 화환<br>만들기';
    submitBtn.textContent = item ? '수정 완료하기' : '화환 보내기';
    inputs.left.value = state.left;
    inputs.right.value = state.right;
    inputs.password.value = state.password;
    $$('.gb-edit__row', editForm).forEach((r) => r.classList.remove('is-missing'));
    showMsg('');
    setTab('belt');
    drawPreview();
    openModal(editModal);
  }
  $('.gb-main__make').addEventListener('click', () => openEdit(null));

  // 탭 / 좌우 화살표 / 랜덤
  editForm.addEventListener('click', (e) => {
    const tab = e.target.closest('.gb-edit__tab');
    if (tab) { setTab(tab.dataset.part); return; }
    const arrow = e.target.closest('.gb-edit__arrow');
    if (arrow) {
      const list = PARTS[activePart];
      const i = list.findIndex((p) => p[0] === state[activePart]);
      setPart(activePart, list[(i + (+arrow.dataset.step) + list.length) % list.length][0]);
    }
  });
  $('.gb-edit__tool--random').addEventListener('click', () => {
    const before = [state.ribbon, state.belt, state.flower].join();
    let tries = 0;
    do {
      ['ribbon', 'belt', 'flower'].forEach((part) => {
        const list = PARTS[part];
        state[part] = list[Math.floor(Math.random() * list.length)][0];
      });
    } while ([state.ribbon, state.belt, state.flower].join() === before && ++tries < 10);
    ['ribbon', 'belt', 'flower'].forEach((part) => setPart(part, state[part]));
  });

  // 리본 글씨: 실시간으로 띠 위에 표시, 띠를 넘치면 더 이상 입력되지 않음
  ['left', 'right'].forEach((side) => {
    const input = inputs[side];
    input.addEventListener('input', () => {
      const span = previewEl._layers[side];
      const value = input.value.replace(/[\r\n\t]/g, ' ');
      span.textContent = value;
      if (span.offsetHeight > TEXT.maxLen + 0.5) {
        span.textContent = state[side];
        input.value = state[side];
        showMsg('리본에 더 이상 글자를 넣을 수 없어요', 2000);
        return;
      }
      state[side] = value;
      if (value.trim()) input.closest('.gb-edit__row').classList.remove('is-missing');
    });
  });
  inputs.password.addEventListener('input', () => {
    state.password = inputs.password.value;
    if (state.password) inputs.password.closest('.gb-edit__row').classList.remove('is-missing');
  });

  // 닫기 (X): 바뀐 게 있으면 "작업 내용을 삭제하시겠어요?" 확인
  function requestEditClose() {
    if (sending) return;
    if (isDirty()) openModal(exitModal);
    else closeModal(editModal);
  }
  $('.gb-edit__close').addEventListener('click', requestEditClose);
  $('#gbExitModal .gb-pop__actions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gb-action]');
    if (!btn) return;
    closeModal(exitModal);
    if (btn.dataset.gbAction === 'leave') { state = null; closeModal(editModal); }
  });

  // 화환 보내기 / 수정 완료하기
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const missing = ['left', 'right', 'password'].filter((k) => !String(state[k] || '').trim());
    $$('.gb-edit__row', editForm).forEach((r) => r.classList.remove('is-missing'));
    if (missing.length) {
      missing.forEach((k) => inputs[k].closest('.gb-edit__row').classList.add('is-missing'));
      showMsg('모든 항목을 입력해 주세요');
      return;
    }
    showMsg('');
    const data = Object.assign({}, state, { left: state.left.trim(), right: state.right.trim() });
    sending = true;
    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = '전송 중...';
    try {
      if (editTarget) await store.update(editTarget.id, editTarget.auth, data);
      else await store.create(data);
      state = null;
      closeModal(editModal);
      await loadItems();
      if (!editTarget) { setPos(0); pauseAuto(); }          // 새 화환은 맨 왼쪽에 걸림
      toast(editTarget ? '화환이 수정되었어요' : '화환이 전시되었어요!');
    } catch (err) {
      showMsg(err.code === 'password' || err.code === 'notfound' ? errorText(err) : '전송에 실패했어요. 잠시 후 다시 시도해 주세요');
    } finally {
      sending = false;
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  /* ─── PNG 저장: 화면의 화환을 그대로 그림 파일로 ─── */
  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  async function exportPng() {
    const S = 2.5;                              // 360×410 → 900×1025
    const canvas = document.createElement('canvas');
    canvas.width = BOX_W * S;
    canvas.height = BOX_H * S;
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    const parts = ['flower', 'belt', 'ribbon'];
    const imgs = await Promise.all(parts.map((p) => loadImage(src(p, state[p]))));
    const draw = (i) => { const [x, y, w, h] = layerRect(parts[i], state[parts[i]]); ctx.drawImage(imgs[i], x, y, w, h); };
    draw(0);
    draw(1);
    const font = TEXT.size + 'px ' + FONT_STACK;
    if (document.fonts && document.fonts.load) await document.fonts.load(font, state.left + state.right).catch(() => {});
    ctx.font = font;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ['left', 'right'].forEach((side) => {
      const chars = Array.from(state[side] || '');
      if (!chars.length) return;
      ctx.save();
      ctx.translate(TEXT[side][0], TEXT[side][1]);
      ctx.rotate((side === 'left' ? TEXT.angle : -TEXT.angle) * Math.PI / 180);
      let y = -chars.length * TEXT.size / 2 + TEXT.size / 2;     // 세로쓰기: 한 글자당 1em
      chars.forEach((ch) => { ctx.fillText(ch, 0, y); y += TEXT.size; });
      ctx.restore();
    });
    draw(2);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('blob');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // 파일명: 저장한 날짜(YYMMDD)_축하화환.png (예: 261006_축하화환.png)
    const now = new Date();
    const yymmdd = String(now.getFullYear()).slice(2) +
      String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    a.download = yymmdd + '_축하화환.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  $('.gb-edit__tool--png').addEventListener('click', () => {
    exportPng().catch((err) => {
      console.warn('[guestbook] PNG 저장 실패', err);
      toast(location.protocol === 'file:' ? 'PNG 저장은 웹 주소(https)로 열었을 때 가능해요' : 'PNG 저장에 실패했어요');
    });
  });

  // 리본 글꼴은 미리 받아 둠 (처음 입력할 때 다른 글꼴이 잠깐 보이지 않게)
  if (document.fonts && document.fonts.load) {
    document.fonts.load(TEXT.size + 'px ' + FONT_STACK, '결혼을 축하드립니다 대학교 총학생회').catch(() => {});
    document.fonts.load('53.79px EF_cucumbersalad', '디지털 축하 화환 전시장 만들기 수정하기').catch(() => {});
  }

  loadItems();
})();
