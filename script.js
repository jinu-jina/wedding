/**
 * Jin woo Jin a Wedding Invitation
 * 지누지나 모바일 청첩장 - Script
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════
     Utility Helpers
     ═══════════════════════════════════════════ */

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // 💡 상단 네비게이션의 사운드 버튼과 탑비디오 파티클 캔버스 클릭이 같은 재생 상태를 공유하기 위한 훅
  // (initParticles가 실제 토글 로직을, initTopNav가 아이콘 갱신 로직을 채워 넣습니다)
  let mediaToggleHandler = null;
  let notifySoundState = null;

  function formatDate(dateStr, timeStr) {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = days[d.getDay()];
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours < 12 ? '오전' : '오후';
    const h12 = hours % 12 || 12;
    const minuteStr = minutes > 0 ? ` ${minutes}분` : '';
    return `${year}년 ${month}월 ${date}일 ${day}요일 ${period} ${h12}시${minuteStr}`;
  }

  function getWeddingDateTime() {
    return new Date(`${CONFIG.wedding.date}T${CONFIG.wedding.time}:00`);
  }

  /* ═══════════════════════════════════════════
     Image Auto-Detection
     ═══════════════════════════════════════════ */

  function loadImagesFromFolder(folder, maxAttempts = 50) {
    return new Promise(resolve => {
        const images = [];
        let current = 1;
        let consecutiveFails = 0;

        function tryNext() {
            if (current > maxAttempts || consecutiveFails >= 3) {
                resolve(images);
                return;
            }
            const img = new Image();
            const path = `images/${folder}/${current}.jpg`;
            img.onload = function() {
                images.push(path);
                consecutiveFails = 0;
                current++;
                tryNext();
            };
            img.onerror = function() {
                consecutiveFails++;
                current++;
                tryNext();
            };
            img.src = path;
        }

        tryNext();
    });
  }

  /* ═══════════════════════════════════════════
     Toast
     ═══════════════════════════════════════════ */

  let toastTimer = null;
  function showToast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2500);
  }

  /* ═══════════════════════════════════════════
     Clipboard
     ═══════════════════════════════════════════ */

  async function copyToClipboard(text, successMsg) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast(successMsg || '복사되었습니다');
    } catch {
      showToast('복사에 실패했습니다');
    }
  }

  /* ═══════════════════════════════════════════
     OG Meta Tags
     ═══════════════════════════════════════════ */

  function setMetaTags() {
    if (!CONFIG.meta) return;
    const m = CONFIG.meta;
    document.title = m.title;
    const setMeta = (attr, val, content) => {
      const el = document.querySelector(`meta[${attr}="${val}"]`);
      if (el) el.setAttribute('content', content);
    };
    setMeta('property', 'og:title', m.title);
    setMeta('property', 'og:description', m.description);
    setMeta('property', 'og:image', 'images/og/1.jpg');
    setMeta('name', 'description', m.description);
  }

  /* ═══════════════════════════════════════════
     Envelope Opening (Slide Up -> Zoom -> Pause 1s)
     ═══════════════════════════════════════════ */
  function initEnvelopeOpening() {
    const envelopeOpening = $('#envelopeOpening');
    const guide = $('#envelopeGuide');

    if (CONFIG.useCurtain === false) {
      envelopeOpening.style.display = 'none';
      return;
    }

    document.body.classList.add('no-scroll');

envelopeOpening.addEventListener('click', () => {
      if (envelopeOpening.classList.contains('state-1')) return;

      // 텍스트의 깜빡임 애니메이션을 끄고 투명하게 숨김 처리
      if (guide) {
        guide.style.animation = 'none';
        guide.style.opacity = '0';
        guide.style.transition = 'opacity 0.4s ease'; // 부드럽게 사라지도록 효과 추가
      }

      // [Step 1] 편지가 스윽 올라옴
      envelopeOpening.classList.add('state-1');

      // 0.8초 후 [Step 2] 클로즈업 실행
      setTimeout(() => {
        envelopeOpening.classList.add('state-2');

        // 클로즈업 애니메이션(0.8초) + 멈춰있는 시간(1초) = 총 1.8초 대기 후 전환
        setTimeout(() => {
          envelopeOpening.style.opacity = '0';

          // 💡 봉투가 잠겨있는 동안(overflow: hidden) 갤러리/스토리 이미지가 비동기로
          // 로드되며 레이아웃이 바뀌어도 항상 탑 비디오 섹션(맨 위)에서 시작하도록 고정
          window.scrollTo(0, 0);
          document.body.classList.remove('no-scroll');

          setTimeout(() => {
            envelopeOpening.style.display = 'none';
          }, 800);

        }, 1800);

      }, 800);
    });
  }

  /* ═══════════════════════════════════════════
     Top Nav (상단 고정 메뉴 바)
     ═══════════════════════════════════════════ */
  function initTopNav() {
    const topNav = $('#topNav');
    const menuBtns = $$('.top-nav__menu-btn');
    const soundBtns = $$('.top-nav__sound-btn');
    const sideMenu = $('#sideMenu');
    const overlay = $('#sideMenuOverlay');
    const closeBtn = $('#sideMenuClose');
    if (menuBtns.length === 0 || !sideMenu || !overlay) return;

    // 💡 탑비디오 섹션이 화면에 보이는 동안은 메뉴 바를 숨기고, 히어로 섹션부터는
    // 스크롤과 무관하게 화면 상단에 계속 고정되어 나타남
    const topVideoSection = $('.top-video-section');
    if (topNav && topVideoSection) {
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          topNav.classList.toggle('top-nav--hidden', entry.isIntersecting);
        });
      }, { threshold: 0 });
      visibilityObserver.observe(topVideoSection);
    }

    function openMenu() {
      sideMenu.classList.add('is-open');
      overlay.classList.add('is-open');
      menuBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'true'));
      sideMenu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    }

    function closeMenu() {
      sideMenu.classList.remove('is-open');
      overlay.classList.remove('is-open');
      menuBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
      sideMenu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }

    menuBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (sideMenu.classList.contains('is-open')) closeMenu();
        else openMenu();
      });
    });

    overlay.addEventListener('click', closeMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sideMenu.classList.contains('is-open')) closeMenu();
    });

    $$('.side-menu__link', sideMenu).forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        // 💡 아직 만들어지지 않은 메뉴(참석 의사 전달/방명록 등)는 href="#"만 있으므로 이동 없이 메뉴만 닫음
        const targetEl = href && href.length > 1 ? $(href) : null;
        closeMenu();
        // 💡 슬라이드 아웃 애니메이션(0.45s)이 끝난 뒤 스크롤 이동
        if (targetEl) {
          setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }
      });
    });

    if (soundBtns.length > 0) {
      soundBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (mediaToggleHandler) mediaToggleHandler();
        });
      });
      // 💡 캔버스 클릭 등 다른 경로로 재생 상태가 바뀌어도 모든 섹션의 아이콘이 함께 갱신되도록 등록
      notifySoundState = (isPlaying) => {
        soundBtns.forEach((btn) => {
          btn.classList.toggle('is-playing', isPlaying);
          btn.setAttribute('aria-label', isPlaying ? '배경음악 끄기' : '배경음악 재생');
        });
      };
    }
  }

  /* ═══════════════════════════════════════════
     Top Video (터치 시 멈춤/재생)
     ═══════════════════════════════════════════ */
  
 function initTopVideo() {
    const video = $('#topVideo');
    if (!video) return;

    // 비디오 데이터가 로드되면 3초 지점으로 이동시키는 함수
    const setStartTime = () => {
      // 터치하여 이미 재생 중인 상태가 아닐 때만 3초로 세팅 (멈춰 있을 때만)
      if (video.paused) {
        video.currentTime = 3.5; // 💡 3초로 설정 (예: 3.5초를 원하시면 3.5로 수정 가능)
      }
    };

    // 브라우저에 이미 비디오 정보가 로딩된 상태라면 바로 실행
    if (video.readyState >= 1) {
      setStartTime();
    } else {
      // 아직 로딩 전이라면, 로딩이 완료되는 순간(loadedmetadata) 바로 실행
      video.addEventListener('loadedmetadata', setStartTime);
    }
  }

  /* ═══════════════════════════════════════════
     Hero Section
     ═══════════════════════════════════════════ */
function initHero() {
    const heroPhoto = $('#heroPhoto');
    if (heroPhoto) heroPhoto.src = 'images/hero/1.jpg';
  }

  /* ═══════════════════════════════════════════
     Greeting Section (스크롤 양방향 감지 및 애니메이션)
     ═══════════════════════════════════════════ */
  function initGreeting() {
    const titleEl = $('#greetingTitle');
    if (titleEl) titleEl.textContent = CONFIG.greeting.title;

    const contentEl = $('#greetingContent');
    if (contentEl) {
      // 💡 전체 텍스트에 밑줄이 깔리도록 래퍼 처리
      contentEl.innerHTML = `<span class="greeting__text-line">${CONFIG.greeting.content}</span>`;
    }

    const g = CONFIG.groom;
    const b = CONFIG.bride;

    function parentLine(father, mother, fatherDeceased, motherDeceased) {
      const fd = fatherDeceased ? ' deceased' : '';
      const md = motherDeceased ? ' deceased' : '';
      return `<span class="${fd}">${father}</span> · <span class="${md}">${mother}</span>`;
    }

    const parentsHTML = `
      <div class="parent-row">
        ${parentLine(g.father, g.mother, g.fatherDeceased, g.motherDeceased)}
        <span class="parent-dot">&#9670;</span>
        의 아들 <span class="child-name">${g.name}</span>
      </div>
      <div class="parent-row">
        ${parentLine(b.father, b.mother, b.fatherDeceased, b.motherDeceased)}
        <span class="parent-dot">&#9670;</span>
        의 딸 <span class="child-name">${b.name}</span>
      </div>
    `;

    const parentsEl = $('#greetingParents');
    if (parentsEl) parentsEl.innerHTML = parentsHTML;

    // 💡 배경 텍스트(intro) → 본문(content) 순서로 등장시키는 노출 감지
    const greetingSection = $('#greeting');
    if (greetingSection) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            greetingSection.classList.add('is-intro-visible');
            setTimeout(() => {
              greetingSection.classList.add('is-content-visible');
            }, 500);
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

      revealObserver.observe(greetingSection);
    }

    // 💡 스크롤 진입 감지 (위/아래 스크롤 시 반복 실행)
    const target = $('#greetingContent');
    if (!target) return;

    let isAnimating = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isAnimating) {
          isAnimating = true;
          const hls = target.querySelectorAll('.hl');

          hls.forEach((hl, idx) => {
            setTimeout(() => {
              hl.classList.add('is-bounce');
              
              setTimeout(() => {
                hl.classList.remove('is-bounce');
              }, 1200);
            }, idx * 620);
          });

          setTimeout(() => {
            isAnimating = false;
          }, hls.length * 220 + 800);
        }
      });
    }, {
      threshold: 0.2
    });

    observer.observe(target);
  }

/* ═══════════════════════════════════════════
   Gallery Section (ALET 100% Flat & Bug Fix)
   ═══════════════════════════════════════════ */
function initGallery(galleryImages) {
  const grid = $('#galleryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (galleryImages.length === 0) {
    const gallerySection = $('#gallery');
    if (gallerySection) gallerySection.style.display = 'none';
    return;
  }

  // 갤러리의 시각 기준 폭을 일반 모바일 폭으로 제한합니다.
  // PC가 넓어져도 사진 자체는 모바일과 같은 크기로 유지됩니다.
  const GALLERY_CONFIG = {
    mobileReferenceWidth: 360,
    spacingPercent: 40,
    minWidthPercent: 20,
    maxWidthPercent: 65,
    scatterY_VH: 0
  };

  function getGalleryLayoutWidth() {
    return Math.min(window.innerWidth, GALLERY_CONFIG.mobileReferenceWidth);
  }

  const sticky = document.createElement('div');
  sticky.className = 'alet-gallery__sticky';
  grid.appendChild(sticky);

  const spacer = document.createElement('div');
  spacer.className = 'alet-gallery__spacer';
  spacer.style.width = '500000px'; 
  grid.appendChild(spacer);

  const wrapElements = [];

  galleryImages.forEach((src, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'alet-image-wrap';
    wrap.setAttribute('role', 'button');
    wrap.tabIndex = 0;
    wrap.setAttribute('aria-label', `갤러리 사진 ${i + 1} 크게 보기`);

    // 모바일 기준 폭에 대한 비율을 저장해 PC에서도 같은 크기로 렌더링합니다.
    const widthPercent = GALLERY_CONFIG.minWidthPercent + Math.random() * (GALLERY_CONFIG.maxWidthPercent - GALLERY_CONFIG.minWidthPercent);
    wrap.dataset.widthPercent = widthPercent;
    wrap.style.width = `${(getGalleryLayoutWidth() * widthPercent) / 100}px`;

    // 💡 겹침(중복) 완벽 방지: 좌우(X축) 랜덤 흔들림은 삭제하고, 상하(Y축) 지그재그 배치 적용
    const direction = i % 2 === 0 ? -1 : 1; // 짝수 번째는 위로, 홀수 번째는 아래로
    const randomY = (Math.random() * (GALLERY_CONFIG.scatterY_VH / 2)) * direction;
    wrap.dataset.offsetYPercent = randomY;
    
    // 서로 자연스럽게 포개지도록 z-index 난수 부여
    wrap.style.zIndex = Math.floor(Math.random() * 100);

    wrap.innerHTML = `<img src="${src}" class="alet-image" alt="갤러리 사진 ${i + 1}" loading="lazy">`;

    const openGalleryPhoto = () => openPhotoModal(galleryImages, i);
    wrap.addEventListener('click', (e) => {
      if (grid.classList.contains('is-dragging')) {
        e.preventDefault(); return;
      }
      openGalleryPhoto();
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openGalleryPhoto();
      }
    });

    sticky.appendChild(wrap);
    wrapElements.push(wrap);
  });

  function syncImageWidths() {
    const layoutWidth = getGalleryLayoutWidth();
    wrapElements.forEach((wrap) => {
      wrap.style.width = `${(layoutWidth * parseFloat(wrap.dataset.widthPercent)) / 100}px`;
    });
  }

  // X축 평면 무한 루프 렌더링 엔진
  function updateCarousel() {
    const layoutWidth = getGalleryLayoutWidth();
    const vH = window.innerHeight;
    
    const spacing = (layoutWidth * GALLERY_CONFIG.spacingPercent) / 100;
    const currentLoopWidth = galleryImages.length * spacing;
    const scrollX = grid.scrollLeft;

    wrapElements.forEach((wrap, i) => {
      const virtualX = i * spacing;
      
      let distFromCenter = ((virtualX - scrollX) % currentLoopWidth + currentLoopWidth) % currentLoopWidth;
      if (distFromCenter > currentLoopWidth / 2) {
        distFromCenter -= currentLoopWidth;
      }
      
      const offsetY = (vH * parseFloat(wrap.dataset.offsetYPercent)) / 100;
      
      // 💡 좌우 오프셋(offsetX)을 아예 없애서 사진들이 정해진 차선을 이탈해 겹치는 버그를 막음
      wrap.style.transform = `translate(-50%, -50%) translate(${distFromCenter}px, ${offsetY}px)`;
    });
  }

  grid.addEventListener('scroll', updateCarousel);
  window.addEventListener('resize', () => {
    syncImageWidths();
    updateCarousel();
  });

  // 기본 상태에서는 사진이 오른쪽에서 왼쪽으로 천천히 흐릅니다.
  const AUTO_SCROLL_SPEED = 28; // 초당 px
  let autoScrollEnabled = true;
  let autoScrollFrame = null;
  let lastAutoScrollTime = null;

  function stopAutoScroll() {
    if (!autoScrollEnabled) return;
    autoScrollEnabled = false;
    if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = null;
  }

  function runAutoScroll(timestamp) {
    if (!autoScrollEnabled) return;
    if (lastAutoScrollTime !== null) {
      const elapsedSeconds = Math.min((timestamp - lastAutoScrollTime) / 1000, 0.1);
      grid.scrollLeft += AUTO_SCROLL_SPEED * elapsedSeconds;
    }
    lastAutoScrollTime = timestamp;
    autoScrollFrame = requestAnimationFrame(runAutoScroll);
  }

  function startAutoScroll() {
    if (!autoScrollEnabled || autoScrollFrame) return;
    autoScrollFrame = requestAnimationFrame(runAutoScroll);
  }

  setTimeout(() => {
    const loopWidth = galleryImages.length * ((getGalleryLayoutWidth() * GALLERY_CONFIG.spacingPercent) / 100);
    const centerStart = Math.floor(250000 / loopWidth) * loopWidth;
    grid.scrollLeft = centerStart;
    updateCarousel();
    startAutoScroll();
  }, 50);

  // PC 마우스 드래그 스크롤 기능
  let isDown = false;
  let startX, scrollLeft;
  grid.addEventListener('mousedown', (e) => {
    isDown = true; grid.classList.add('active');
    startX = e.pageX - grid.offsetLeft; scrollLeft = grid.scrollLeft;
  });
  grid.addEventListener('mouseleave', () => { isDown = false; grid.classList.remove('active'); setTimeout(() => grid.classList.remove('is-dragging'), 100); });
  grid.addEventListener('mouseup', () => { isDown = false; grid.classList.remove('active'); setTimeout(() => grid.classList.remove('is-dragging'), 100); });
  grid.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const walk = (e.pageX - grid.offsetLeft - startX) * 1.5;
    if (Math.abs(walk) > 5) {
      grid.classList.add('is-dragging');
      stopAutoScroll();
    }
    grid.scrollLeft = scrollLeft - walk;
  });

  // 모바일 터치, 마우스 휠, 키보드·스크롤바 조작도 자동 이동을 해제합니다.
  let touchStartX = null;
  grid.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0]?.clientX ?? null;
  }, { passive: true });
  grid.addEventListener('touchmove', (e) => {
    const currentX = e.touches[0]?.clientX;
    if (touchStartX !== null && currentX !== undefined && Math.abs(currentX - touchStartX) > 5) stopAutoScroll();
  }, { passive: true });
  grid.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stopAutoScroll();
  }, { passive: true });
  grid.addEventListener('pointerdown', (e) => {
    if (e.target === grid) stopAutoScroll();
  });
  grid.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) stopAutoScroll();
  });
// --- 💡 [추가] 갤러리 섹션 진입 시 ALET 애니메이션 실행 옵저버 ---
  const gallerySection = $('#gallery');
  const introEl = $('#galleryIntro');
  const linesEl = $('#aletLines');
  
  if (gallerySection && introEl && linesEl) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // 화면에 갤러리 섹션이 30% 이상 보이고, 아직 로드되지 않았을 때
        if (entry.isIntersecting && !gallerySection.classList.contains('is-loaded')) {
          
          // 1. 중앙 텍스트 애니메이션 및 라인 회전 시작
          introEl.classList.add('play-anim');
          linesEl.classList.add('play-anim');
          
          // 💡 2. 기존 1800이었던 숫자를 2800으로 변경!
          // (텍스트가 75% 지점에서 작아지며 사라지기 시작하므로, 
          // 2.8초 쯤에 본 갤러리가 나타나면 타이밍이 예술적으로 맞아떨어집니다.)
          setTimeout(() => {
            gallerySection.classList.add('is-loaded');
          }, 3800);
          
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.75 }); 
    
    observer.observe(gallerySection);
  }
}

  /* ═══════════════════════════════════════════
     Calendar Section
     ═══════════════════════════════════════════ */

  function initCalendar() {
    const dt = getWeddingDateTime();
    const year = dt.getFullYear();
    const month = dt.getMonth();
    const weddingDay = dt.getDate();

    const grid = $('#calendarGrid');

    // Header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    grid.innerHTML = `<div class="calendar__header">${monthNames[month]} ${year}</div>`;

    // Weekdays
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const wdRow = document.createElement('div');
    wdRow.className = 'calendar__weekdays';
    weekdays.forEach(wd => {
      const el = document.createElement('span');
      el.className = 'calendar__weekday';
      el.textContent = wd;
      wdRow.appendChild(el);
    });
    grid.appendChild(wdRow);

    // Days
    const daysContainer = document.createElement('div');
    daysContainer.className = 'calendar__days';

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'calendar__day is-empty';
      daysContainer.appendChild(empty);
    }

    for (let d = 1; d <= lastDate; d++) {
      const dayEl = document.createElement('span');
      dayEl.className = 'calendar__day';
      if (d === weddingDay) dayEl.classList.add('is-today');
      dayEl.textContent = d;
      daysContainer.appendChild(dayEl);
    }

    grid.appendChild(daysContainer);

    // Google Calendar link
    const startDate = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDt = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
    const endDate = endDt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(CONFIG.groom.name + ' ♥ ' + CONFIG.bride.name + ' 결혼식')}&dates=${startDate}/${endDate}&location=${encodeURIComponent(CONFIG.wedding.venue + ' ' + CONFIG.wedding.address)}&details=${encodeURIComponent('결혼식에 초대합니다.')}`;
    $('#googleCalBtn').href = gcalUrl;

    // ICS download (Apple Calendar)
    $('#icsDownloadBtn').addEventListener('click', () => {
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Wedding//Invitation//KO',
        'BEGIN:VEVENT',
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${CONFIG.groom.name} ♥ ${CONFIG.bride.name} 결혼식`,
        `LOCATION:${CONFIG.wedding.venue} ${CONFIG.wedding.address}`,
        'DESCRIPTION:결혼식에 초대합니다.',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wedding.ics';
      a.click();
      URL.revokeObjectURL(url);
      showToast('캘린더 파일이 다운로드됩니다');
    });
  }

  /* ═══════════════════════════════════════════
     Story Section
     ═══════════════════════════════════════════ */

  function initStory(storyImages) {
    $('#storyTitle').textContent = CONFIG.story.title;
    $('#storyContent').textContent = CONFIG.story.content;

    const container = $('#storyPhotos');
    const placeholder = container.querySelector('.loading-placeholder');
    if (placeholder) placeholder.remove();

    if (storyImages.length === 0) return;

    storyImages.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'story__photo-item animate-item';
      div.setAttribute('data-animate', 'fade-up');
      div.setAttribute('role', 'button');
      div.tabIndex = 0;
      div.setAttribute('aria-label', `스토리 사진 ${i + 1} 크게 보기`);
      div.innerHTML = `<img src="${src}" alt="스토리 사진 ${i + 1}" loading="lazy">`;
      const openStoryPhoto = () => openPhotoModal(storyImages, i);
      div.addEventListener('click', openStoryPhoto);
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openStoryPhoto();
        }
      });
      container.appendChild(div);
    });
  }

  /* ═══════════════════════════════════════════
   Photo Modal (with swipe & bug fix)
   ═══════════════════════════════════════════ */

let modalImages = [];
let modalIndex = 0;
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
let lastFocusedElement = null;

/* 💡 화면 튕김 및 잔상을 유발하던 스크롤 강제 조작 로직 완전히 삭제 */
function openPhotoModal(images, index) {
  if (!images.length) return;

  // 닫은 뒤 사용자가 열었던 사진으로 키보드 포커스를 되돌립니다.
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.classList.add('no-scroll');
  modalImages = images;
  modalIndex = index;
  showModalImage();
  $('#photoModal').classList.add('is-open');

  // 모달이 열린 뒤 가장 먼저 닫기 버튼에 포커스를 둡니다.
  requestAnimationFrame(() => $('#modalClose').focus());
}

function closePhotoModal() {
  const modal = $('#photoModal');
  if (!modal.classList.contains('is-open')) return;

  modal.classList.remove('is-open');
  document.body.classList.remove('no-scroll');

  const returnFocusTarget = lastFocusedElement;
  lastFocusedElement = null;
  requestAnimationFrame(() => {
    if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
  });
}

function showModalImage() {
  const img = $('#modalImg');
  img.src = modalImages[modalIndex];
  $('#modalCounter').textContent = `${modalIndex + 1} / ${modalImages.length}`;

  $('#modalPrev').style.display = modalIndex > 0 ? '' : 'none';
  $('#modalNext').style.display = modalIndex < modalImages.length - 1 ? '' : 'none';
}

function modalNavigate(dir) {
  const newIndex = modalIndex + dir;
  if (newIndex >= 0 && newIndex < modalImages.length) {
    modalIndex = newIndex;
    showModalImage();
  }
}

function initPhotoModal() {
  $('#modalClose').addEventListener('click', closePhotoModal);
  $('#modalPrev').addEventListener('click', () => modalNavigate(-1));
  $('#modalNext').addEventListener('click', () => modalNavigate(1));

  const modal = $('#photoModal');

  function keepFocusInModal(event) {
    if (event.key !== 'Tab') return;

    const focusable = $$('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', modal)
      .filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.id === 'modalContainer') {
      closePhotoModal();
    }
  });

  // 💡 잔상/튕김 방지: iOS에서 모달창을 띄웠을 때 뒤에 갤러리가 스크롤되는 것을 물리적으로 차단
  modal.addEventListener('touchmove', (e) => {
    e.preventDefault(); 
  }, { passive: false });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Tab') {
      keepFocusInModal(e);
      return;
    }
    if (e.key === 'Escape') closePhotoModal();
    if (e.key === 'ArrowLeft') modalNavigate(-1);
    if (e.key === 'ArrowRight') modalNavigate(1);
  });

  // Swipe support
  const container = $('#modalContainer');
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });
}

function handleSwipe() {
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;
  const minSwipe = 50;

  if (Math.abs(diffX) < minSwipe || Math.abs(diffX) < Math.abs(diffY)) return;

  if (diffX > 0) {
    modalNavigate(1);
  } else {
    modalNavigate(-1);
  }
}

  /* ═══════════════════════════════════════════
     Location Section
     ═══════════════════════════════════════════ */

  function initLocation() {
    const w = CONFIG.wedding;
    $('#locationVenue').textContent = w.venue;
    $('#locationHall').textContent = w.hall;
    $('#locationAddress').textContent = w.address;
    $('#locationTel').textContent = w.tel ? `Tel. ${w.tel}` : '';
    $('#locationMapImg').src = 'images/location/1.jpg';
    $('#kakaoMapBtn').href = w.mapLinks.kakao || '#';
    $('#naverMapBtn').href = w.mapLinks.naver || '#';

    $('#copyAddressBtn').addEventListener('click', () => {
      copyToClipboard(w.address, '주소가 복사되었습니다');
    });
  }

  /* ═══════════════════════════════════════════
     Account Section (축의금)
     ═══════════════════════════════════════════ */

  function renderAccounts(accounts, containerId) {
    const container = $(`#${containerId}`);
    accounts.forEach((acc) => {
      const item = document.createElement('div');
      item.className = 'account-item';
      item.innerHTML = `
        <div class="account-item__info">
          <div class="account-item__role">${acc.role}</div>
          <div class="account-item__detail">
            <span class="account-item__name">${acc.name || ''}</span>
            ${acc.bank} ${acc.number}
          </div>
        </div>
        <button class="account-item__copy" data-account="${acc.bank} ${acc.number} ${acc.name || ''}">
          복사
        </button>
      `;
      container.appendChild(item);
    });
  }

  function initAccordion(triggerId, panelId) {
    const trigger = $(`#${triggerId}`);
    const panel = $(`#${panelId}`);

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', !expanded);

      if (!expanded) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      } else {
        panel.style.maxHeight = '0';
      }
    });
  }

  function initAccounts() {
    renderAccounts(CONFIG.accounts.groom, 'groomAccountList');
    renderAccounts(CONFIG.accounts.bride, 'brideAccountList');

    initAccordion('groomAccordion', 'groomAccordionPanel');
    initAccordion('brideAccordion', 'brideAccordionPanel');

    // Copy account delegates
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.account-item__copy');
      if (!btn) return;
      const text = btn.dataset.account;
      copyToClipboard(text, '계좌번호가 복사되었습니다');
    });
  }

  /* ═══════════════════════════════════════════
     Footer
     ═══════════════════════════════════════════ */

  function initFooter() {
    const dt = getWeddingDateTime();
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    $('#footerText').textContent = `${CONFIG.groom.name} & ${CONFIG.bride.name} — ${year}.${month}.${day}`;
  }

  /* ═══════════════════════════════════════════
     Loading Placeholders
     ═══════════════════════════════════════════ */

  function showLoadingPlaceholders() {
    const storyPhotos = $('#storyPhotos');
    const galleryGrid = $('#galleryGrid');

    const placeholderHTML = '<div class="loading-placeholder"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>';

    if (storyPhotos) storyPhotos.innerHTML = placeholderHTML;
    if (galleryGrid) galleryGrid.innerHTML = placeholderHTML;
  }

  /* ═══════════════════════════════════════════
     Scroll Animations (IntersectionObserver)
     ═══════════════════════════════════════════ */

  function initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    $$('.animate-item').forEach((el) => observer.observe(el));

    const mutObs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('animate-item')) {
            observer.observe(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('.animate-item').forEach((el) => observer.observe(el));
          }
        });
      });
    });

    mutObs.observe(document.body, { childList: true, subtree: true });
  }

/* ═══════════════════════════════════════════
     Particle Interaction (Layout Adjusted to Match Image)
     ═══════════════════════════════════════════ */
function initParticles() {
    const canvas = $('#particleCanvas');
    const video = $('#topVideo');
    const textImg = $('#videoGuideText');
    const stage = $('.top-video-section');
    if (!canvas || !video || !stage) return;

    const ctx = canvas.getContext('2d');
    const sCanvas = document.createElement('canvas');
    const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
    
    const tCanvas = document.createElement('canvas');
    const tCtx = tCanvas.getContext('2d', { willReadFrequently: true });

    let width, height;
    // 고밀도 화면에서 불필요하게 과도한 캔버스 해상도가 생성되지 않도록 상한을 둡니다.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 🛠️ 파티클 커스텀 설정
    const numPlayParticles = 400;     
    const scatterAmount = 2.5;    
    const jitter = 2.2;           
    const particleSize = 0.9;
    const explosionPower = 37;    
    const opacitySpeed = 0.08;    
    const moveSpeed = 0.04;       
    const friction = 0.82;        

    // 💡 원본 영상(main.mp4) 실제 해상도가 1080x750 (정사각형이 아님)이므로,
    // 샘플링 그리드도 같은 비율로 맞춰서 카세트테이프 형상이 눌리거나 늘어나지 않도록 합니다.
    const vCols = 150;
    const vRows = Math.round(vCols * 750 / 1080); // 104
    sCanvas.width = vCols;
    sCanvas.height = vRows;

    let playParticles = [];
    let videoParticles = [];
    let textParticles = []; 
    let currentPlayTarget = [];

    function initTextParticles() {
        if (!textImg || !textImg.complete || textImg.naturalWidth === 0) {
            setTimeout(initTextParticles, 100);
            return;
        }
        
        const tCols = 250; // 💡 1. 파티클 개수(밀도) 조절: 숫자를 키울수록 글자가 촘촘해집니다. (150 -> 300)
        const tRows = Math.floor(tCols * (textImg.naturalHeight / textImg.naturalWidth));
        tCanvas.width = tCols;
        tCanvas.height = tRows;
        tCtx.drawImage(textImg, 0, 0, tCols, tRows);
        const data = tCtx.getImageData(0, 0, tCols, tRows).data;

        for (let y = 0; y < tRows; y++) {
            for (let x = 0; x < tCols; x++) {
                const i = (y * tCols + x) * 4;
                const alpha = data[i+3];
                if (alpha > 30) { 
                    textParticles.push({
                        x: 0, y: 0, tx: 0, ty: 0,
                        gridX: x, gridY: y,
                        gridW: tCols, gridH: tRows,
                        // 💡 2. 모여짐 정도 조절: scatterAmount 대신 0.2 등 작은 숫자를 직접 입력하여 흩어짐을 방지합니다.
                        scatterX: (Math.random() - 0.2) * scatterAmount,
                        scatterY: (Math.random() - 0.2) * scatterAmount,
                        vx: 0, vy: 0,
                        alpha: 0, targetAlpha: 0.2 + (alpha/255) * 0.8,
                        initialized: false 
                    });
                }
            }
        }
        resize(); 
    }
    if (textImg) initTextParticles();

    function resize() {
      // 전체 브라우저가 아니라 청첩장 본문 안의 영상 영역을 기준으로 파티클을 그립니다.
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      currentPlayTarget = video.paused ? getPlayShape() : getPauseShape();
      playParticles.forEach((p, i) => {
          p.tx = currentPlayTarget[i].x;
          p.ty = currentPlayTarget[i].y;
      });

      // 💡 vCols x vRows 그리드(원본 영상 비율)를 컨테이너 안에 여백을 두고 비율 그대로 맞춰 넣습니다.
      const maxW = Math.min(750, width);
      const scaleByWidth = maxW / vCols;
      const scaleByHeight = (height * 0.9) / vRows;
      // 💡 카세트테이프 형상 전체 크기 배율 (기존 1.2 → 1.5로 확대)
      let finalScale = Math.min(scaleByWidth, scaleByHeight) * 1.7;
      
      const offsetX = (width - vCols * finalScale) / 2;
      // 💡 그리드 박스 자체는 정중앙이 맞지만, 원본 영상 프레임 안에서 카세트 그림이
      // 위쪽에 치우쳐 있어 보여서(밝은 픽셀=보이는 점들이 위쪽에 몰림) 박스를 살짝 아래로 내립니다.
      const offsetY = (height - vRows * finalScale) / 2 + (height * 0.08);

      videoParticles.forEach(p => {
         p.tx = offsetX + p.gridX * finalScale + p.scatterX;
         p.ty = offsetY + p.gridY * finalScale + p.scatterY;
      });

      if (textImg && textImg.naturalWidth > 0 && textParticles.length > 0) {
          let textW = Math.min(width * 0.85, 320); 
          let textH = textW * (textImg.naturalHeight / textImg.naturalWidth);
          let textOffsetX = (width - textW) / 2; 
          let textOffsetY = height * 0.04; 

          textParticles.forEach(p => {
              p.tx = textOffsetX + (p.gridX / p.gridW) * textW + p.scatterX;
              p.ty = textOffsetY + (p.gridY / p.gridH) * textH + p.scatterY;
              if (!p.initialized) {
                  p.x = p.tx; p.y = p.ty;
                  p.alpha = p.targetAlpha;
                  p.initialized = true;
              }
          });
      }
    }
    window.addEventListener('resize', resize, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(stage);
    }

    function getPlayShape() {
      const pts = [];
      const offsetX = width / 2 - 50;
      const offsetY = height * 0.86 - 50;
      for(let i=0; i<numPlayParticles; i++) {
        let r1 = Math.random(); let r2 = Math.random();
        if(r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
        pts.push({
          x: offsetX + 20 + r1 * 0 + r2 * 65 + (Math.random() - 0.5) * scatterAmount,
          y: offsetY + 15 + r1 * 70 + r2 * 35 + (Math.random() - 0.5) * scatterAmount
        });
      }
      return pts;
    }

    function getPauseShape() {
      const pts = [];
      const offsetX = width / 2 - 50;
      const offsetY = height * 0.86 - 50;
      for(let i=0; i<numPlayParticles; i++) {
        const isLeft = Math.random() < 0.5;
        pts.push({
          x: offsetX + (isLeft ? 22 : 60) + Math.random() * 18 + (Math.random() - 0.5) * scatterAmount,
          y: offsetY + 15 + Math.random() * 70 + (Math.random() - 0.5) * scatterAmount
        });
      }
      return pts;
    }

    for(let i=0; i<numPlayParticles; i++) {
      playParticles.push({
        x: 0, y: 0, tx: 0, ty: 0,
        vx: (Math.random() - 0.5) * explosionPower, vy: (Math.random() - 0.5) * explosionPower,
        alpha: 0.2 + Math.random() * 0.8 
      });
    }

    for (let y = 0; y < vRows; y++) {
        for (let x = 0; x < vCols; x++) {
            videoParticles.push({
                x: 0, y: 0, tx: 0, ty: 0, gridX: x, gridY: y,
                scatterX: (Math.random() - 0.5) * scatterAmount, scatterY: (Math.random() - 0.5) * scatterAmount,
                vx: 0, vy: 0, alpha: 0, targetAlpha: 0, initialized: false 
            });
        }
    }
    
    resize(); 
    playParticles.forEach(p => { p.x = width / 2; p.y = height * 0.86; });

    function explodeAllParticles() {
      playParticles.forEach(p => {
        const angle = Math.random() * Math.PI * 2; const power = 5 + Math.random() * explosionPower;
        p.vx = Math.cos(angle) * power; p.vy = Math.sin(angle) * power;
      });

      videoParticles.forEach(p => {
        if (p.targetAlpha > 0.05) {
          const angle = Math.random() * Math.PI * 2; const power = 5 + Math.random() * explosionPower;
          p.vx = Math.cos(angle) * power; p.vy = Math.sin(angle) * power;
        }
      });

      // 💡 버튼 파티클과 동일하게, 터치 시 팍 튀었다가 (스프링 복원력으로) 제자리로 돌아옴
      textParticles.forEach(p => {
        if (p.targetAlpha > 0.05) {
          const angle = Math.random() * Math.PI * 2; const power = 5 + Math.random() * explosionPower;
          p.vx = Math.cos(angle) * power; p.vy = Math.sin(angle) * power;
        }
      });
    }

    function updateVideoTargets() {
        if (video.readyState < 2) return; 
        sCtx.drawImage(video, 0, 0, vCols, vRows);
        const imgData = sCtx.getImageData(0, 0, vCols, vRows).data;
        
        videoParticles.forEach(p => {
            const i = (p.gridY * vCols + p.gridX) * 4;
            const brightness = (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
            p.targetAlpha = brightness > 45 ? 0.2 + (brightness/255) * 0.8 : 0;
            
            if (!p.initialized) {
                p.x = p.tx; p.y = p.ty;
                p.alpha = p.targetAlpha; p.initialized = true;
            }
        });
    }

    // 💡 상단 네비게이션의 사운드 버튼에서도 동일하게 호출할 수 있도록 함수로 분리
    function toggleMedia() {
      const bgm = document.getElementById('bgm');

      if (video.paused) {
        video.muted = false; video.play();
        if (bgm) bgm.play().catch(e => console.log(e));
        currentPlayTarget = getPauseShape();
      } else {
        video.pause();
        if (bgm) bgm.pause();
        currentPlayTarget = getPlayShape();
      }
      playParticles.forEach((p, i) => { p.tx = currentPlayTarget[i].x; p.ty = currentPlayTarget[i].y; });

      if (notifySoundState) notifySoundState(!video.paused);
    }
    mediaToggleHandler = toggleMedia;

    canvas.addEventListener('click', () => {
      explodeAllParticles();
      toggleMedia();
    });

    // 💡 isExploded 파라미터로 마찰력 및 복원력 차단
    function drawParticle(p, isExploded = false) {
        if (!isExploded) {
            // 평소에는 원래 자리(tx, ty)로 돌아가려 하고 멈춤(마찰력)
            p.vx += (p.tx - p.x) * moveSpeed; 
            p.vy += (p.ty - p.y) * moveSpeed;
            p.vx *= friction; 
            p.vy *= friction;
        }
        // 폭발한 상태면 마찰력 없이 우주처럼 계속 날아감
        p.x += p.vx; 
        p.y += p.vy;

        const drawX = p.x + (Math.random() - 0.5) * jitter;
        const drawY = p.y + (Math.random() - 0.5) * jitter;

        ctx.fillStyle = `rgba(39, 42, 41, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, particleSize, 0, Math.PI * 2);
        ctx.fill();
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      playParticles.forEach(p => {
          p.alpha += (Math.random() - 0.5) * opacitySpeed;
          if(p.alpha > 1) p.alpha = 1; if(p.alpha < 0.2) p.alpha = 0.2;
          drawParticle(p);
      });

      updateVideoTargets(); 
      videoParticles.forEach(p => {
          p.alpha += (p.targetAlpha - p.alpha) * 0.15; 
          if (p.alpha > 0.05) {
              let displayAlpha = p.alpha + (Math.random() - 0.5) * opacitySpeed;
              if(displayAlpha > 1) displayAlpha = 1;
              if(displayAlpha < 0.2 && p.targetAlpha > 0) displayAlpha = 0.2;
              const temp = p.alpha; p.alpha = displayAlpha;
              drawParticle(p); p.alpha = temp;
          }
      });

      textParticles.forEach(p => {
          // 💡 폭발/소멸 없이 항상 제자리에서 은은하게 반짝이며 화면에 남아있음
          p.alpha += (p.targetAlpha - p.alpha) * 0.15;

          if (p.alpha > 0.05) {
              let displayAlpha = p.alpha + (Math.random() - 0.5) * opacitySpeed;
              if (displayAlpha > 1) displayAlpha = 1;
              if (displayAlpha < 0.2 && p.targetAlpha > 0) displayAlpha = 0.2;
              const temp = p.alpha;
              p.alpha = displayAlpha;
              drawParticle(p);
              p.alpha = temp;
          }
      });

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
  
  /* ═══════════════════════════════════════════
     Init
     ═══════════════════════════════════════════ */

 async function init() {
    // 💡 새로고침/뒤로가기 시 브라우저가 이전 스크롤 위치를 임의로 복원하는 것을 막고,
    // 항상 최상단(탑 비디오 섹션)에서 시작하도록 고정
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    setMetaTags();
    initEnvelopeOpening();
    initTopNav();
    initTopVideo(); 
    initParticles();
    initHero();
    initGreeting();
    initCalendar();

    showLoadingPlaceholders();

    initPhotoModal();
    initLocation();
    initAccounts();
    initFooter();
    initScrollAnimations();

    $('#storyTitle').textContent = CONFIG.story.title;
    $('#storyContent').textContent = CONFIG.story.content;

    const [storyImages, galleryImages] = await Promise.all([
      loadImagesFromFolder('story'),
      loadImagesFromFolder('gallery')
    ]);

    initStory(storyImages);
    initGallery(galleryImages);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

