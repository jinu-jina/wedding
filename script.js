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
  // 💡 고양이 터치 시 initCatVideo에서 이 함수를 호출해 3cat_dance.mp4 팝업을 엽니다
  // (initCatDanceModal이 실제 팝업 열기 로직을 채워 넣습니다)
  let openCatDanceModal = null;

  // 💡 탑비디오 섹션 하단 안내 문구 (Text Type 효과로 한 글자씩 타이핑되어 나타남)
  const TOP_GREETING_TEXT =
`안녕하세요,
진우·진아의 모바일 청첩장에
방문해 주셔서 감사합니다.
여기서는 배경음악을 켜고 끌 수 있습니다. (물론 이곳이 아니여도 다음 섹션부터는 좌측 상단에 음악 버튼이 나타납니다.)
저희 사이트를 재미있게 봐 주셨으면
좋겠습니다. 감사합니다. *^^*`;

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
    // 💡 og:image는 index.html에 전체 주소로 적어 두었으므로 여기서 바꾸지 않음 (상대 주소로 덮어쓰면 미리보기 사진이 깨짐)
    setMeta('name', 'description', m.description);
  }

  /* ═══════════════════════════════════════════
     사이드 메뉴 하단 공유 버튼: 카카오톡 공유하기 / 사이트 링크 복사 (설정: config.js share)
     ═══════════════════════════════════════════ */

  // 공유할 주소: config의 siteUrl, 없으면 지금 페이지 주소(#… 같은 꼬리 제외)
  function getShareUrl() {
    const set = (CONFIG.share && CONFIG.share.siteUrl || '').trim();
    return set || (location.origin + location.pathname);
  }

  // 카카오 SDK는 처음 공유 버튼을 누를 때만 불러옴 (평소 페이지 무게에 영향 없음)
  let kakaoSdkPromise = null;
  function loadKakaoSdk(jsKey) {
    if (!kakaoSdkPromise) {
      kakaoSdkPromise = new Promise((resolve, reject) => {
        if (window.Kakao) { resolve(window.Kakao); return; }
        const s = document.createElement('script');
        s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
        s.crossOrigin = 'anonymous';
        s.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error('kakao')));
        s.onerror = reject;
        document.head.appendChild(s);
      }).then((Kakao) => {
        if (!Kakao.isInitialized()) Kakao.init(jsKey);
        return Kakao;
      }).catch((err) => { kakaoSdkPromise = null; throw err; });
    }
    return kakaoSdkPromise;
  }

  async function shareKakao() {
    const url = getShareUrl();
    const m = CONFIG.meta || {};
    const jsKey = (CONFIG.share && CONFIG.share.kakaoJsKey || '').trim();

    // 1) 카카오 JavaScript 키가 있으면: 제목·설명·사진이 들어간 카카오톡 공유 카드
    if (jsKey) {
      try {
        const Kakao = await loadKakaoSdk(jsKey);
        const link = { mobileWebUrl: url, webUrl: url };
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: m.title || document.title,
            description: m.description || '',
            imageUrl: new URL('images/og/1.jpg?v=20261008', url).href,   // 카카오 서버가 가져갈 수 있도록 전체 주소
            imageWidth: 800,                                              // images/og/1.jpg = 800 × 800 정사각형
            imageHeight: 800,
            link
          },
          buttons: [{ title: '청첩장 보기', link }]
        });
        return;
      } catch (e) {
        console.warn('[share] 카카오톡 공유 실패 → 기본 공유로 대신합니다', e);
      }
    }

    // 2) 휴대폰 기본 공유 창 (목록에서 카카오톡 선택 가능)
    if (navigator.share) {
      try {
        await navigator.share({ title: m.title || document.title, text: m.description || '', url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;   // 사용자가 공유 창을 그냥 닫은 경우
      }
    }

    // 3) 둘 다 안 되면(PC 등): 링크 복사
    copyToClipboard(url, '링크를 복사했어요. 카카오톡에 붙여넣어 공유해 주세요');
  }

  function initShareButtons() {
    const kakaoBtn = $('#kakaoShareBtn');
    const copyBtn = $('#copyLinkBtn');
    if (kakaoBtn) kakaoBtn.addEventListener('click', shareKakao);
    if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard(getShareUrl(), '링크가 복사되었습니다'));
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

    // 💡 상단 nav 중앙 숫자([00] 등)를 side-menu 항목의 인덱스와 항상 같은 값으로 유지합니다.
    // side-menu의 href(#섹션ID)와 표시된 인덱스를 그대로 읽어서 쓰므로, 숫자를 두 군데에
    // 따로 적어둘 필요 없이 side-menu만 고치면 여기도 같이 맞춰집니다.
    const sectionIndexEl = $('.top-nav__section-index');
    if (sectionIndexEl) {
      const spyTargets = $$('.side-menu__link')
        .map((a) => {
          const href = a.getAttribute('href') || '';
          if (!href.startsWith('#') || href.length < 2) return null;
          const el = document.getElementById(href.slice(1));
          const indexEl = a.querySelector('.side-menu__index');
          return el && indexEl ? { el, index: indexEl.textContent } : null;
        })
        .filter(Boolean);

      if (spyTargets.length) {
        // 💡 화면 상단부(위에서 40%지점)를 지나간 마지막 섹션을 "현재 보고 있는 섹션"으로 판단합니다.
        // 단, 인사말(#greeting) 바로 다음 섹션은 인사말의 고정 제목 줄(A)까지 완전히 위로 올라간 뒤에
        // (= 그 섹션의 윗변이 A의 아래쪽 경계에 닿았을 때) 바뀝니다.
        const greetingIdx = spyTargets.findIndex((t) => t.el.id === 'greeting');
        const introTrack = document.getElementById('circleIntroTrack');
        let spyTicking = false;

        const updateSectionIndex = () => {
          spyTicking = false;
          const defaultLine = window.innerHeight * 0.4;
          let aLine = defaultLine;
          if (greetingIdx >= 0 && introTrack) {
            const pin = document.getElementById('circleIntroPin');
            const aH = parseFloat(getComputedStyle(introTrack).getPropertyValue('--circle-intro-a-height')) || 0;
            const stuckTop = pin ? (parseFloat(getComputedStyle(pin).top) || 0) : 0;
            aLine = stuckTop + aH;
          }
          let current = null;
          spyTargets.forEach((t, i) => {
            const line = (i === greetingIdx + 1 && greetingIdx >= 0) ? aLine : defaultLine;
            if (t.el.getBoundingClientRect().top <= line) current = t;
          });
          if (current && sectionIndexEl.textContent !== current.index) {
            sectionIndexEl.textContent = current.index;
          }
          // 💡 상단 바에 현재 섹션 번호를 표시(data-section="02" 등) → styles.css에서 섹션별 글자색을 바꿈
          if (current && topNav) {
            const num = current.index.replace(/\D/g, '');
            if (topNav.dataset.section !== num) topNav.dataset.section = num;
          }
        };

        window.addEventListener('scroll', () => {
          if (!spyTicking) { spyTicking = true; requestAnimationFrame(updateSectionIndex); }
        }, { passive: true });
        window.addEventListener('resize', updateSectionIndex, { passive: true });
        updateSectionIndex();
      }
    }

    // 💡 CSS 클래스 선택자(.is-open)나 transition-delay에 의존하지 않고 요소마다
    // 인라인 style.transition/transform을 직접 걸어서, 다수 요소가 동시에 트랜지션될 때
    // 일부가 누락되거나 특이도 문제로 애니메이션이 씹히는 경우를 원천 차단합니다.
    function setToggleVisual(btn, open) {
      const icon = btn.querySelector('.top-nav__menu-icon');
      const textInner = btn.querySelector('.top-nav__menu-text-inner');
      if (icon) {
        icon.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
        icon.style.transform = open ? 'rotate(225deg)' : 'rotate(0deg)';
      }
      if (textInner) {
        textInner.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        textInner.style.transform = open ? 'translateY(-1.4em)' : 'translateY(0)';
      }
    }

    // 💡 패널 안의 X 닫기 버튼(#sideMenuClose)도 메뉴 항목과 같은 방식(살짝 아래에서
    // 떠오르며 등장)으로 통일. 다만 X 아이콘은 작은 각도(35deg)로만 회전시켜
    // 회전감은 살리면서도 1.1px 얇은 선이 큰 각도에서 버벅여 보이는 건 피함.
    function setCloseButtonVisual(open) {
      if (!closeBtn) return;
      const icon = $('.side-menu__close-icon', closeBtn);
      const text = $('.side-menu__close-text', closeBtn);
      if (icon) {
        icon.style.transition = open
          ? 'transform 1.0s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, opacity 0.4s ease 0.15s'
          : 'transform 0.2s ease-in, opacity 0.2s ease-in';
        icon.style.transform = open ? 'translateY(0) rotate(0deg)' : 'translateY(6px) rotate(-35deg)';
        icon.style.opacity = open ? '1' : '0';
      }
      if (text) {
        text.style.transition = open
          ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s'
          : 'transform 0.2s ease-in';
        text.style.transform = open ? 'translateY(0) rotate(0deg)' : 'translateY(140%) rotate(10deg)';
      }
    }

    const sideMenuItems = $$('.side-menu__item', sideMenu);

    function animateSideMenuItems(open) {
      sideMenuItems.forEach((item, i) => {
        const label = $('.side-menu__label', item);
        const index = $('.side-menu__index', item);
        const labelDelay = open ? i * 0.05 : 0;
        const indexDelay = open ? labelDelay + 0.08 : 0;
        if (label) {
          label.style.transition = `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${labelDelay}s`;
          label.style.transform = open ? 'translateY(0) rotate(0deg)' : 'translateY(140%) rotate(10deg)';
        }
        if (index) {
          index.style.transition = `opacity 0.4s ease ${indexDelay}s`;
          index.style.opacity = open ? '1' : '0';
        }
      });
    }

    function openMenu() {
      sideMenu.classList.add('is-open');
      overlay.classList.add('is-open');
      menuBtns.forEach((btn) => {
        btn.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', '메뉴 닫기');
        setToggleVisual(btn, true);
      });
      animateSideMenuItems(true);
      setCloseButtonVisual(true);
      sideMenu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    }

    function closeMenu() {
      // 💡 닫기 버튼 등 sideMenu 내부 요소가 포커스를 가진 채로 aria-hidden을 걸면
      // "Blocked aria-hidden on an element because its descendant retained focus" 경고가 발생하므로,
      // aria-hidden을 걸기 전에 포커스를 메뉴 트리거 버튼으로 미리 옮겨둡니다.
      if (sideMenu.contains(document.activeElement)) {
        (menuBtns[0] || document.body).focus();
      }
      sideMenu.classList.remove('is-open');
      overlay.classList.remove('is-open');
      menuBtns.forEach((btn) => {
        btn.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', '메뉴 열기');
        setToggleVisual(btn, false);
      });
      animateSideMenuItems(false);
      setCloseButtonVisual(false);
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

    // 💡 배경 영상(소리 없음)은 loop 속성으로 계속 반복. 자동재생이 막혔을 때를 대비해 재생을 한 번 더 시도합니다.
    const bgVideo = $('#greetingBgVideo');
    if (bgVideo) {
      bgVideo.muted = true;
      const p = bgVideo.play();
      if (p && p.catch) p.catch(() => {});

      // 💡 화면 밖에서는 일시정지, 다시 화면에 들어오면 이어서 재생 (디코딩/배터리 부담 감소)
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            const pp = bgVideo.play();
            if (pp && pp.catch) pp.catch(() => {});
          } else {
            bgVideo.pause();
          }
        }, { rootMargin: '100px 0px' }).observe(bgVideo);
      }
    }

    // 💡 강조 글자(.hl)가 위로 올라오는 애니메이션 — 스크롤과 무관하게 항상 반복합니다.
    // 첫 글자부터 순서대로 올라오고, 마지막 글자까지 다 올라오면 3초 쉬었다가 다시 처음부터 시작합니다.
    const BOUNCE_STAGGER = 620;   // 글자와 글자 사이 시작 간격(ms)
    const BOUNCE_HOLD = 1200;     // 한 글자가 올라가 있는 시간(ms)
    const BOUNCE_REST = 3000;     // 마지막 글자까지 끝난 뒤 쉬는 시간(ms)
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let bounceStarted = false;

    function runBounceCycle() {
      const hls = contentEl ? contentEl.querySelectorAll('.hl') : [];
      if (!hls.length) return;
      hls.forEach((hl, idx) => {
        setTimeout(() => {
          hl.classList.add('is-bounce');
          setTimeout(() => hl.classList.remove('is-bounce'), BOUNCE_HOLD);
        }, idx * BOUNCE_STAGGER);
      });
      // 마지막 글자가 올라갔다 내려온 뒤 → 3초 쉬고 → 다시 처음부터
      const cycleEnd = (hls.length - 1) * BOUNCE_STAGGER + BOUNCE_HOLD;
      setTimeout(runBounceCycle, cycleEnd + BOUNCE_REST);
    }

    function startBounceLoop() {
      if (bounceStarted || reduceMotion) return;
      bounceStarted = true;
      runBounceCycle();
    }

    // 💡 배경 텍스트(intro) → 본문(content) 순서로 등장시키는 노출 감지
    const greetingSection = $('#greeting');
    if (greetingSection) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            greetingSection.classList.add('is-intro-visible');
            setTimeout(() => {
              greetingSection.classList.add('is-content-visible');
              startBounceLoop();   // 본문이 나타난 뒤부터는 스크롤과 관계없이 계속 반복
            }, 500);
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

      revealObserver.observe(greetingSection);
    } else {
      startBounceLoop();
    }
  }
  /* ═══════════════════════════════════════════
     캘린더 추가 링크 (예식 일시 섹션은 삭제됨)
     요정의 "캘박 하실래요?" 갤럭시/아이폰 버튼(fairy.js)이 window.weddingCalendar 를 사용
     ═══════════════════════════════════════════ */

  function initCalendarLinks() {
    const dt = getWeddingDateTime();

    // Google Calendar link
    const startDate = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDt = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
    const endDate = endDt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(CONFIG.groom.name + ' ♥ ' + CONFIG.bride.name + ' 결혼식')}&dates=${startDate}/${endDate}&location=${encodeURIComponent(CONFIG.wedding.venue + ' ' + CONFIG.wedding.address)}&details=${encodeURIComponent('결혼식에 초대합니다.')}`;

    // ICS download (Apple Calendar)
    const downloadIcs = () => {
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
    };

    window.weddingCalendar = { googleUrl: gcalUrl, downloadIcs };
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
  // 💡 모달을 연 쪽(예: 갤러리 회전 이미지)이 닫힘을 알아채고 하던 동작을 다시 시작할 수 있게 알립니다.
  document.dispatchEvent(new CustomEvent('photomodalclose'));

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

  // 💡 갤러리 사진 저장 방지: 길게 누르기(안드로이드) / 오른쪽 클릭(PC) 때 뜨는 "이미지 저장" 메뉴를 막음
  //    (아이폰은 styles.css의 -webkit-touch-callout: none 으로 막힘)
  //    갤러리 섹션(사진 띠)과 사진 전체화면 창 안에서만 적용
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('#gallery, #photoModal')) e.preventDefault();
  });
  // 사진을 끌어서 바탕화면 등에 놓아 저장하는 것도 막음 (PC)
  document.addEventListener('dragstart', (e) => {
    if (e.target.closest && e.target.closest('#gallery, #photoModal')) e.preventDefault();
  });

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
    $('#locationAddress').textContent = w.addressShort || w.address;
    $('#kakaoMapBtn').href = w.mapLinks.kakao || '#';
    $('#naverMapBtn').href = w.mapLinks.naver || '#';

    $('#copyAddressBtn').addEventListener('click', () => {
      copyToClipboard(w.address, '주소가 복사되었습니다');
    });

    // 예식장 이름 옆 전화 아이콘 → 전화번호 복사
    const telBtn = $('#copyTelBtn');
    if (w.tel) {
      telBtn.addEventListener('click', () => {
        copyToClipboard(w.tel, '전화번호가 복사되었습니다');
      });
    } else {
      telBtn.style.display = 'none';
    }

    initLocationAccordion(w.directions || []);
  }

  // 교통편 아코디언: 항목마다 눌러서 열고 닫음 (여러 개 동시에 열림 가능)
  function initLocationAccordion(directions) {
    const acc = $('#locationAcc');
    if (!acc) return;
    if (!directions.length) { acc.hidden = true; return; }

    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };

    const items = directions.map((d, i) => {
      const item = el('div', 'loc-acc__item');
      const head = el('button', 'loc-acc__head');
      head.type = 'button';
      head.id = `locAccHead${i}`;
      head.setAttribute('aria-controls', `locAccBody${i}`);
      head.append(
        el('span', `loc-icon loc-icon--${d.icon}`),
        el('span', 'loc-acc__title', d.title),
        el('span', 'loc-acc__mark')
      );
      head.firstChild.setAttribute('aria-hidden', 'true');
      head.lastChild.setAttribute('aria-hidden', 'true');

      const body = el('div', 'loc-acc__body');
      body.id = `locAccBody${i}`;
      body.setAttribute('role', 'region');
      body.setAttribute('aria-labelledby', head.id);
      const content = el('div', 'loc-acc__content');
      (d.items || []).forEach((it) => {
        // 소제목(19px)과 내용(17px)을 따로 감싸서 시안처럼 크기를 다르게 표시
        const block = el('p', 'loc-acc__block');
        if (it.label) block.appendChild(el('span', 'loc-acc__label', it.label));
        if (it.text) block.appendChild(el('span', 'loc-acc__text', it.text));
        content.appendChild(block);
      });
      body.appendChild(content);

      item.append(head, body);
      acc.appendChild(item);
      return { item, head, body };
    });

    const setOpen = (it, open) => {
      it.item.classList.toggle('is-open', open);
      it.head.setAttribute('aria-expanded', open);
      it.body.inert = !open;             // 닫힌 내용은 탭 이동·스크린리더에서 제외
    };

    // 항목마다 따로 열고 닫음 (여러 개 동시에 열어둘 수 있음)
    items.forEach((it, i) => {
      setOpen(it, !!directions[i].open);
      it.head.addEventListener('click', () => {
        setOpen(it, !it.item.classList.contains('is-open'));
      });
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
            <span class="account-item__name">${acc.name || ''}</span><span class="account-item__bank">${acc.bank}</span>${acc.number}
          </div>
        </div>
        <button class="account-item__copy" data-account="${String(acc.number).replace(/\D/g, '')}">
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
     RSVP (참석 의사 전달)
     "응답하기" → 팝업 → "체크 완료하기" → 구글 Apps Script(CONFIG.rsvp.scriptUrl)로 전송
     → 스프레드시트에 한 줄 추가 (google-apps-script/rsvp.gs)
     ═══════════════════════════════════════════ */

  function initRsvp() {
    const modal = $('#rsvpModal');
    if (!modal) return;
    const pop = $('.rsvp-pop', modal);
    const form = $('#rsvpForm');
    const nameEl = $('#rsvpName');
    const etcEl = $('#rsvpGroupEtc');
    const countEl = $('#rsvpCount');
    const submitBtn = $('#rsvpSubmit');
    const state = { side: '', group: '', attend: '', meal: '' };
    let lastFocus = null;
    let sending = false;

    const clampCount = (v) => Math.min(20, Math.max(1, v || 1));

    // 선택 버튼: 같은 줄에서 하나만 눌린 상태(aria-pressed=true → 채워진 모양)
    const setChoice = (field, value) => {
      state[field] = value;
      $$(`.rsvp-choices[data-field="${field}"] .rsvp-choice`, form).forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.value === value));
      });
      if (field === 'attend') form.classList.toggle('is-absent', value === '미참석');
    };

    form.addEventListener('click', (e) => {
      const choice = e.target.closest('.rsvp-choice');
      if (choice) {
        const field = choice.closest('.rsvp-choices').dataset.field;
        setChoice(field, choice.dataset.value);
        if (field === 'group') etcEl.value = '';   // 버튼을 고르면 직접입력은 비움
        return;
      }
      const step = e.target.closest('.rsvp-count__step');
      if (step) countEl.value = clampCount((parseInt(countEl.value, 10) || 1) + Number(step.dataset.step));
    });
    // 직접입력에 글자를 쓰면 가족/친구/직장/동기 선택은 해제
    etcEl.addEventListener('input', () => {
      if (etcEl.value.trim()) setChoice('group', '');
    });
    countEl.addEventListener('change', () => {
      countEl.value = clampCount(parseInt(countEl.value, 10));
    });

    const resetForm = () => {
      form.reset();
      Object.keys(state).forEach((k) => setChoice(k, ''));
      countEl.value = 1;
    };

    const open = () => {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      modal.hidden = false;
      modal.scrollTop = 0;
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => modal.classList.add('is-open'));
      pop.focus({ preventScroll: true });          // 입력칸에 바로 포커스하면 휴대폰 키보드가 튀어나와서 팝업 자체에 포커스
    };
    const close = () => {
      if (modal.hidden) return;
      modal.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      setTimeout(() => { modal.hidden = true; }, 250);
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    };

    // 누른 버튼은 #dfdedd로 바뀌었다가 2.5초 뒤 원래 색으로 (CSS .rsvp__btn.is-pressed)
    $$('.rsvp__btn').forEach((btn) => {
      let timer = null;
      btn.addEventListener('click', () => {
        btn.classList.add('is-pressed');
        clearTimeout(timer);                     // 다시 누르면 2.5초를 새로 셈
        timer = setTimeout(() => btn.classList.remove('is-pressed'), 2500);
      });
    });

    $('#rsvpOpenBtn').addEventListener('click', open);
    $('#rsvpCloseBtn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });   // 바깥 어두운 곳 터치
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    // 응답 완료 화면: 회색 판이 닫히며 틈만 남기고 → 잠깐 멈춤 → 완전히 닫히며 감사 문구 등장
    // (CSS: .rsvp__card.is-closing/.is-slit/.is-shut/.is-thanked) 새로고침 전까지 이 화면 유지
    const card = $('#rsvpCard');
    let thanked = false;
    // 감사 문구는 나중에 처음 보이는데, 구글 폰트는 글자 묶음을 필요할 때 받아서 그 순간 다른 글꼴이
    // 잠깐 보일 수 있음 → 미리 받아 둠
    if (document.fonts && document.fonts.load) {
      document.fonts.load('32px "Diphylleia"', '응답해 주셔서 감사합니다! 참석 의사 체크하기').catch(() => {});
    }
    const playRsvpThanks = () => {
      if (thanked || !card) return;
      thanked = true;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      card.style.height = card.offsetHeight + 'px';   // auto → px로 고정해야 높이가 부드럽게 줄어듦
      card.classList.add('is-closing');
      void card.offsetHeight;                          // 위 상태를 먼저 그리게 함
      // 한 번에 스르륵 닫힘(1.1초, CSS --rsvp-close) → 최종 높이 = 감사 문구 + 위아래 5px
      card.classList.add('is-shut');
      card.style.height = 'calc(var(--rsvp-thanks-size) + 30px)';
      if (reduce) { card.classList.add('is-thanked'); return; }
      setTimeout(() => card.classList.add('is-thanked'), 900);   // 거의 닫혔을 때 감사 문구가 튀어나옴
    };

    // "응답하였음": 이미 응답한 사람이 누르면 바로 완료 화면으로
    $('#rsvpDoneBtn').addEventListener('click', playRsvpThanks);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;

      const name = nameEl.value.trim();
      const group = state.group || etcEl.value.trim();
      const attending = state.attend === '참석';
      const missing =
        !name ? '성함을 입력해 주세요' :
        !state.side ? '신랑측 / 신부측을 선택해 주세요' :
        !group ? '구분을 선택하거나 직접 입력해 주세요' :
        !state.attend ? '참석 여부를 선택해 주세요' :
        (attending && !state.meal) ? '식사 여부를 선택해 주세요' : '';
      if (missing) { showToast(missing); return; }

      const url = (CONFIG.rsvp && CONFIG.rsvp.scriptUrl || '').trim();
      if (!url) { showToast('전송 주소가 아직 설정되지 않았어요 (config.js)'); return; }

      const payload = {
        name,
        side: state.side,
        group,
        attend: state.attend,
        count: attending ? clampCount(parseInt(countEl.value, 10)) : 0,
        meal: attending ? state.meal : '',
        website: form.website.value            // 스팸 방지 칸(사람은 비워 둠)
      };

      sending = true;
      submitBtn.disabled = true;
      submitBtn.textContent = '전송 중...';
      try {
        // text/plain으로 보내야 Apps Script가 사전 요청(CORS preflight) 없이 받음
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || res.status);

        close();
        resetForm();
        setTimeout(playRsvpThanks, 300);                // 팝업이 사라진 뒤 섹션 애니메이션 시작
      } catch (err) {
        console.error('[RSVP] 전송 실패:', err);
        showToast('전송에 실패했어요. 잠시 후 다시 시도해 주세요');
      } finally {
        sending = false;
        submitBtn.disabled = false;
        submitBtn.textContent = '체크 완료하기';
      }
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
    // 💡 푸터 글자는 배경 이미지(images/footer/footer_bg.jpg)에 들어 있으므로
    //    화면에는 쓰지 않고, 화면 읽기 프로그램용 이름(aria-label)만 붙임
    const footer = $('.footer');
    if (footer) footer.setAttribute('aria-label', `${CONFIG.groom.name} & ${CONFIG.bride.name} — ${year}.${month}.${day}`);
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
    const stage = $('.top-video-section__stage');
    if (!canvas || !video || !stage) return;

    // 💡 재생/정지 버튼 파티클 전용 캔버스. 섹션(.top-video-section) 전체를 덮는
    // 최상위 레이어라서, 스테이지의 overflow:hidden에 잘리지 않습니다.
    const sectionEl = $('.top-video-section');
    const buttonCanvas = $('#buttonParticleCanvas');
    const buttonCtx = buttonCanvas ? buttonCanvas.getContext('2d') : null;

    const ctx = canvas.getContext('2d');
    const sCanvas = document.createElement('canvas');
    const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });

    let width, height;
    let sectionWidth = 0, sectionHeight = 0;
    // 💡 스테이지 상단 끝이 섹션 상단 끝으로부터 얼마나 떨어져 있는지(px). 버튼 파티클을
    // 섹션 전체 캔버스 좌표계로 그리기 위해, 스테이지 기준 위치를 이 값만큼 보정합니다.
    let stageTopInSection = 0;
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
    const buttonScale = 0.75; // 💡 재생/정지 버튼 파티클 형상 크기 (1 = 원래 크기, 0.75 = 약 1/4 축소)

    // 💡 원본 영상(main.mp4) 실제 해상도가 1080x750 (정사각형이 아님)이므로,
    // 샘플링 그리드도 같은 비율로 맞춰서 카세트테이프 형상이 눌리거나 늘어나지 않도록 합니다.
    const vCols = 250;
    const vRows = Math.round(vCols * 750 / 1080); // 104
    sCanvas.width = vCols;
    sCanvas.height = vRows;

    let playParticles = [];
    let videoParticles = [];
    let currentPlayTarget = [];

    function resize() {
      // 전체 브라우저가 아니라 청첩장 본문 안의 영상 영역을 기준으로 파티클을 그립니다.
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 💡 버튼 파티클은 섹션 전체를 덮는 별도 캔버스에 그려지므로, 스테이지 기준 좌표를
      // 섹션 기준 좌표로 변환하기 위해 스테이지의 섹션 내 상대 위치를 미리 구해 둡니다.
      if (sectionEl) {
        stageTopInSection = rect.top - sectionEl.getBoundingClientRect().top;
      }

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
      let finalScale = Math.min(scaleByWidth, scaleByHeight) * 2.1;

      const offsetX = (width - vCols * finalScale) / 2;
      // 💡 그리드 박스 자체는 정중앙이 맞지만, 원본 영상 프레임 안에서 카세트 그림이
      // 위쪽에 치우쳐 있어 보여서(밝은 픽셀=보이는 점들이 위쪽에 몰림) 박스를 살짝 아래로 내립니다.
      const offsetY = (height - vRows * finalScale) / 2 + (height * 0.18);

      videoParticles.forEach(p => {
         p.tx = offsetX + p.gridX * finalScale + p.scatterX;
         p.ty = offsetY + p.gridY * finalScale + p.scatterY;
      });
    }

    // 💡 버튼 파티클 전용 캔버스 크기 계산 (섹션 전체 크기에 맞춤)
    function resizeButtonCanvas() {
      if (!buttonCanvas || !buttonCtx || !sectionEl) return;
      const rect = sectionEl.getBoundingClientRect();
      sectionWidth = Math.max(1, Math.round(rect.width));
      sectionHeight = Math.max(1, Math.round(rect.height));
      buttonCanvas.width = Math.round(sectionWidth * dpr);
      buttonCanvas.height = Math.round(sectionHeight * dpr);
      buttonCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function handleStageResize() { resize(); resizeButtonCanvas(); }
    window.addEventListener('resize', handleStageResize, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(handleStageResize).observe(stage);
    }

    function getPlayShape() {
      const pts = [];
      const offsetX = width / 2 - 50;
      // 💡 버튼 파티클은 섹션 전체 캔버스에 그려지므로, 스테이지 기준 위치(height * 0.94)를
      // 섹션 기준 좌표로 옮기기 위해 stageTopInSection을 더합니다.
      const offsetY = stageTopInSection + height * 1.0 - 50;
      for(let i=0; i<numPlayParticles; i++) {
        let r1 = Math.random(); let r2 = Math.random();
        if(r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
        // 💡 (50,50)을 중심으로 buttonScale만큼 축소/확대 (중심 위치는 그대로 유지)
        const lx = 20 + r1 * 0 + r2 * 65;
        const ly = 15 + r1 * 70 + r2 * 35;
        pts.push({
          x: offsetX + 50 + (lx - 50) * buttonScale + (Math.random() - 0.5) * scatterAmount,
          y: offsetY + 50 + (ly - 50) * buttonScale + (Math.random() - 0.5) * scatterAmount
        });
      }
      return pts;
    }

    function getPauseShape() {
      const pts = [];
      const offsetX = width / 2 - 50;
      // 💡 버튼 파티클은 섹션 전체 캔버스에 그려지므로, 스테이지 기준 위치(height * 0.94)를
      // 섹션 기준 좌표로 옮기기 위해 stageTopInSection을 더합니다.
      const offsetY = stageTopInSection + height * 1.0 - 50;
      for(let i=0; i<numPlayParticles; i++) {
        const isLeft = Math.random() < 0.5;
        // 💡 (50,50)을 중심으로 buttonScale만큼 축소/확대 (중심 위치는 그대로 유지)
        const lx = (isLeft ? 22 : 60) + Math.random() * 18;
        const ly = 15 + Math.random() * 70;
        pts.push({
          x: offsetX + 50 + (lx - 50) * buttonScale + (Math.random() - 0.5) * scatterAmount,
          y: offsetY + 50 + (ly - 50) * buttonScale + (Math.random() - 0.5) * scatterAmount
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
    resizeButtonCanvas();
    playParticles.forEach(p => { p.x = width / 2; p.y = stageTopInSection + height * 0.97; });

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

    // 💡 스테이지/안내 캔버스뿐 아니라 top-video-section 화면 어디를 터치해도(하단 안내
    // 텍스트 영역 포함) 재생/일시정지 + 파티클 튕김 효과가 일어나도록 섹션 전체에
    // 클릭 핸들러를 하나만 겁니다 (개별 캔버스에 따로 걸면 중복 토글될 수 있습니다).
    (sectionEl || canvas).addEventListener('click', () => {
      explodeAllParticles();
      toggleMedia();
    });

    // 💡 isExploded 파라미터로 마찰력 및 복원력 차단
    function drawParticle(p, targetCtx, isExploded = false) {
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

        targetCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        targetCtx.beginPath();
        targetCtx.arc(drawX, drawY, particleSize, 0, Math.PI * 2);
        targetCtx.fill();
    }

    // 💡 섹션이 화면 밖에 있으면 파티클 루프(그리기 + 영상 픽셀 샘플링)를 통째로 멈추고,
    // 다시 화면에 들어오면 이어서 재생합니다. 파티클 상태는 그대로 유지됩니다.
    let particleVisible = true;
    let particleRunning = false;

    function animate() {
      if (!particleVisible) { particleRunning = false; return; }
      ctx.clearRect(0, 0, width, height);
      if (buttonCtx) buttonCtx.clearRect(0, 0, sectionWidth, sectionHeight);

      const btnCtx = buttonCtx || ctx;
      playParticles.forEach(p => {
          p.alpha += (Math.random() - 0.5) * opacitySpeed;
          if(p.alpha > 1) p.alpha = 1; if(p.alpha < 0.2) p.alpha = 0.2;
          drawParticle(p, btnCtx);
      });

      updateVideoTargets();
      videoParticles.forEach(p => {
          p.alpha += (p.targetAlpha - p.alpha) * 0.15;
          if (p.alpha > 0.05) {
              let displayAlpha = p.alpha + (Math.random() - 0.5) * opacitySpeed;
              if(displayAlpha > 1) displayAlpha = 1;
              if(displayAlpha < 0.2 && p.targetAlpha > 0) displayAlpha = 0.2;
              const temp = p.alpha; p.alpha = displayAlpha;
              drawParticle(p, ctx); p.alpha = temp;
          }
      });

      requestAnimationFrame(animate);
    }

    function startParticleLoop() {
      if (particleRunning) return;
      particleRunning = true;
      requestAnimationFrame(animate);
    }

    if ('IntersectionObserver' in window && (sectionEl || stage)) {
      new IntersectionObserver((entries) => {
        particleVisible = entries[0].isIntersecting;
        if (particleVisible) startParticleLoop();
      }, { rootMargin: '100px 0px' }).observe(sectionEl || stage);
    }
    startParticleLoop();
}

  /* ═══════════════════════════════════════════
     Top Video - Cat (크로마키 제거 + 흑백)
     ═══════════════════════════════════════════ */
  function initCatVideo() {
    const video = $('#catVideo');
    const canvas = $('#catCanvas');
    if (!video || !canvas) return;

    // 💡 고양이 영역을 터치하면: 1) top-video-section의 음악 재생/정지(파티클 튕김)
    // 토글이 실행되지 않도록 클릭 전파를 막고, 2) 말풍선(meow.png)을 잠깐 보여주면서
    // 3) 야옹 소리를 재생합니다.
    const catArea = $('.top-video-section__cat');
    const meowBubble = $('#meowBubble');
    const meowSound = $('#meowSound');
    let meowHideTimer = null;

    if (catArea) {
      catArea.addEventListener('click', (e) => {
        e.stopPropagation();

        // 💡 배경음악(song.mp3)이 재생 중이면 먼저 멈추고, 그 다음 야옹 소리를 재생합니다.
        // mediaToggleHandler(initParticles의 toggleMedia)를 그대로 호출해서, 상단
        // 사운드 버튼을 눌렀을 때와 동일하게 카세트 영상/파티클도 같이 멈추고
        // 재생버튼 파티클 모양도 "재생" 상태로 되돌아가도록 합니다.
        const bgm = $('#bgm');
        if (bgm && !bgm.paused && mediaToggleHandler) {
          mediaToggleHandler();
        }

        if (meowSound) {
          meowSound.currentTime = 0;
          meowSound.play().catch(() => {});
        }

        if (meowBubble) {
          meowBubble.classList.add('is-visible');
          clearTimeout(meowHideTimer);
          meowHideTimer = setTimeout(() => {
            meowBubble.classList.remove('is-visible');
          }, 1500);
        }

        // 💡 야옹 소리가 재생되고 1.5초 뒤에 3cat_dance.mp4 팝업이 뜨도록 지연시킵니다.
        setTimeout(() => {
          if (openCatDanceModal) openCatDanceModal();
        }, 1500);
      });
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // 💡 영상 원본 해상도를 그대로 쓰지 않고 적당히 낮춰서(최대 360px 폭)
    // 매 프레임 getImageData/putImageData 비용을 줄입니다.
    const maxW = 360;

    // 💡 초록 배경만 골라 투명하게 지우는 간단한 크로마키. 영상의 초록색 톤에 따라
    // greenBias(초록이 R/B보다 얼마나 밝아야 배경으로 볼지)를 조절하면 됩니다.
    const minGreen = 70;
    const greenBias = 1.15;

    function resizeCatCanvas() {
      if (!video.videoWidth || !video.videoHeight) return;
      const scale = Math.min(1, maxW / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
    }

    // 💡 화면 밖에서는 매 프레임 getImageData/putImageData 크로마키 처리를 멈춥니다.
    let catVisible = true;
    let catRunning = false;

    function drawFrame() {
      if (!catVisible) { catRunning = false; return; }
      if (canvas.width && canvas.height && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (g > minGreen && g > r * greenBias && g > b * greenBias) {
            data[i + 3] = 0; // 초록 배경 → 완전 투명
          }
        }
        ctx.putImageData(frame, 0, 0);
      }
      requestAnimationFrame(drawFrame);
    }

    video.addEventListener('loadedmetadata', resizeCatCanvas);
    if (video.readyState >= 1) resizeCatCanvas(); // 이미 메타데이터가 로드돼 있는 경우 대비
    video.muted = true;
    video.play().catch(() => {});

    function startCatLoop() {
      if (catRunning) return;
      catRunning = true;
      requestAnimationFrame(drawFrame);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        catVisible = entries[0].isIntersecting;
        if (catVisible) {
          video.play().catch(() => {});   // 💡 다시 보이면 영상도 이어서 재생
          startCatLoop();
        } else {
          video.pause();                  // 💡 화면 밖에서는 영상 디코딩도 멈춤
        }
      }, { rootMargin: '100px 0px' }).observe(canvas);
    }
    startCatLoop();
  }

  /* ═══════════════════════════════════════════
     Cat Dance Modal (고양이 터치 시 뜨는 레트로 창 팝업)
     ═══════════════════════════════════════════ */
  function initCatDanceModal() {
    const modal = $('#catDanceModal');
    const video = $('#catDanceVideo');
    const replayBtn = $('#catDanceReplay');
    const playPauseBtn = $('#catDancePlayPause');
    const closeBtn = $('#catDanceClose');
    if (!modal || !video) return;

    function updatePlayPauseIcon() {
      if (!playPauseBtn) return;
      const paused = video.paused;
      playPauseBtn.textContent = paused ? '▶' : '⏸';
      playPauseBtn.setAttribute('aria-label', paused ? '재생' : '일시정지');
      playPauseBtn.title = paused ? '재생' : '일시정지';
    }

    function openModal() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      video.currentTime = 0;
      video.play().catch(() => {});
      updatePlayPauseIcon();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      video.pause();
      video.currentTime = 0;
    }

    // 💡 1: 다시보기 - 처음부터 다시 재생
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        video.currentTime = 0;
        video.play().catch(() => {});
        updatePlayPauseIcon();
      });
    }

    // 💡 2: 일시정지/재생 토글, 아이콘도 ⏸ ↔ ▶ 로 전환
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        updatePlayPauseIcon();
      });
    }
    video.addEventListener('play', updatePlayPauseIcon);
    video.addEventListener('pause', updatePlayPauseIcon);

    // 💡 3: 닫기 - 팝업을 없애고 영상도 정지
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(); // 배경(어두운 영역) 터치 시에도 닫힘
    });

    openCatDanceModal = openModal;
  }

  /* ═══════════════════════════════════════════
     Top Video Greeting - Text Type Effect
     (참고 컴포넌트: TextType.jsx 를 바닐라 JS로 정리하여 적용)
     ═══════════════════════════════════════════ */
  function initTopGreetingText() {
    const el = $('#topGreetingText');
    if (!el) return;

    const typingSpeed = 14;   // ms, 한 글자당 타이핑 속도
    const initialDelay = 400; // ms, 타이핑 시작 전 대기시간

    el.innerHTML = '<span class="text-type__content"></span><span class="text-type__cursor" aria-hidden="true">|</span>';
    const contentEl = $('.text-type__content', el);

    const text = TOP_GREETING_TEXT;
    let charIndex = 0;

    function typeNextChar() {
      if (charIndex >= text.length) {
        return; // 타이핑 완료 - 커서만 계속 깜빡임
      }
      contentEl.textContent += text[charIndex];
      charIndex++;
      setTimeout(typeNextChar, typingSpeed);
    }

    setTimeout(typeNextChar, initialDelay);
  }

  /* ═══════════════════════════════════════════
     Gallery Strip (앨범 위를 좌 → 우로 계속 흘러가는 사진 띠)
     · images/gallery/1~N.jpg 가 1, 2, 3 … N, 다시 1 … 순서로 왼쪽에서 들어와 오른쪽으로 흐릅니다.
       처음에는 1이 맨 앞(오른쪽에 아무것도 없음)이고, N 바로 뒤(왼쪽)에 다시 1이 이어집니다.
     · 사진을 터치하면 회전이 멈추고 photo modal이 열립니다. 모달을 닫으면 다시 이어서 회전합니다.
     · 앨범 영상이 끝난 뒤(책이 펼쳐진 뒤) 나타나고, 섹션을 벗어나면 초기화됩니다.
     · 이동은 JS로 transform만 갱신(rAF)하며, 화면 밖이거나 멈춘 동안에는 루프를 돌리지 않습니다.
     ═══════════════════════════════════════════ */
  function createGalleryStrip(section) {
    const SPEED = 70;   // 흐르는 속도(px/초)
    const STRIP_SCALE_MIN = 0.5;   // 사진 크기 랜덤 범위(기본 크기 대비 배율): 가장 작은 사진
    const STRIP_SCALE_MAX = 1.1;   // 가장 큰 사진 (번호 크기도 같은 배율로 따라감)

    const wrap = document.createElement('div');
    wrap.className = 'gallery-strip';
    wrap.style.setProperty('--gallery-strip-smax', STRIP_SCALE_MAX);   // 띠 높이 계산용(가장 큰 배율)
    const track = document.createElement('div');
    track.className = 'gallery-strip__track';
    wrap.appendChild(track);
    section.appendChild(wrap);

    let images = [];
    let W = 0;               // 사진 한 세트(1~N)의 가로 길이(px)
    let x = 0;               // 진행 거리(px). 0 → W(첫 등장) 이후에는 W ~ 2W 구간을 무한 반복
    let raf = null;
    let last = null;
    let shown = false;       // 앨범이 펼쳐져 띠가 나타나야 하는 상태
    let paused = false;      // 사진을 터치해서 멈춘 상태
    let inView = true;       // 섹션이 화면에 보이는 중
    let openedByStrip = false;

    function render() {
      // 💡 DOM은 [N…1][N…1][N…1]로 왼쪽이 "나중에 등장할 것", 오른쪽 끝이 1입니다.
      // 트랙 오른쪽 끝(=1의 오른쪽 변)이 x 위치에 오도록 놓고 오른쪽으로 밉니다.
      // W~2W 구간은 앞뒤 세트가 똑같아서 W만큼 되돌려도 화면이 끊기지 않습니다.
      const xp = x < W ? x : W + ((x - W) % W);
      track.style.transform = `translate3d(${xp - 3 * W}px, 0, 0)`;
    }

    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (last !== null) x += SPEED * Math.min((t - last) / 1000, 0.05);
      last = t;
      render();
    }

    function sync() {
      const shouldRun = shown && !paused && inView && W > 0;
      if (shouldRun && !raf) {
        last = null;
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && raf) {
        cancelAnimationFrame(raf);
        raf = null;
        last = null;
      }
    }

    function measure() {
      const oldW = W;
      // 💡 한 세트의 길이 = "둘째 세트 첫 사진의 위치 - 첫째 세트 첫 사진의 위치" (사진 간격 포함).
      // track.offsetWidth는 사진 원본 폭을 기준으로 잡혀 실제보다 커질 수 있어서 쓰지 않습니다.
      // 이렇게 재야 마지막 사진 뒤에 다시 첫 사진이 "사진 사이 간격"만큼만 띄우고 이어집니다.
      const n = images.length;
      const kids = track.children;
      W = (n > 0 && kids.length >= n * 2) ? (kids[n].offsetLeft - kids[0].offsetLeft) : 0;
      if (oldW > 0 && W > 0) x = x * (W / oldW);   // 크기가 바뀌어도 흐르던 위치 유지
      render();
      sync();
    }

    function build(srcs) {
      images = srcs;
      track.innerHTML = '';
      if (!srcs.length) return;
      // 💡 사진마다 랜덤 크기 배율을 한 번만 정해서 세 세트에 똑같이 씁니다(세트가 같아야 반복이 끊기지 않음).
      const scales = srcs.map(() => STRIP_SCALE_MIN + Math.random() * (STRIP_SCALE_MAX - STRIP_SCALE_MIN));
      const order = srcs.map((src, i) => ({ src, i })).reverse();   // N … 1 (오른쪽으로 흐르면 1이 먼저 등장)
      let pending = 0;
      const done = () => { if (--pending === 0) measure(); };
      for (let copy = 0; copy < 3; copy++) {
        order.forEach(({ src, i }) => {
          // 한 장 = [번호 + 사진]. 번호는 사진 상단 왼쪽에 "[01]" 형식(두 자리)으로 붙습니다.
          const item = document.createElement('div');
          item.className = 'gallery-strip__item';
          item.style.setProperty('--s', scales[i].toFixed(3));   // 사진·번호 크기 배율
          if (copy !== 1) item.setAttribute('aria-hidden', 'true');

          const num = document.createElement('span');
          num.className = 'gallery-strip__num';
          num.textContent = `[${String(i + 1).padStart(2, '0')}]`;
          num.setAttribute('aria-hidden', 'true');

          const img = new Image();
          img.className = 'gallery-strip__img';
          img.alt = copy === 1 ? `웨딩 사진 ${i + 1}` : '';
          img.draggable = false;
          img.decoding = 'async';
          img.dataset.index = i;
          pending++;
          img.addEventListener('load', done, { once: true });
          // 💡 띠에는 작은 썸네일(images/gallery/thumb/N.jpg, 가로 300px)을 씁니다. 없으면 원본으로 대신합니다.
          // (띠는 같은 사진을 3세트 = 63장 디코딩해서, 큰 사진이면 흐를 때 버벅입니다.
          //  사진을 터치했을 때 뜨는 전체화면(모달)은 images/gallery/N.jpg(가로 1000px)를 씁니다.)
          img.addEventListener('error', () => {
            if (img.dataset.fallback) { done(); return; }   // 원본도 실패하면 그냥 넘어감
            img.dataset.fallback = '1';
            img.src = src;                                   // (위의 load 리스너가 그대로 이어받음)
          });
          img.src = src.replace('images/gallery/', 'images/gallery/thumb/');

          item.appendChild(num);
          item.appendChild(img);
          track.appendChild(item);
        });
      }
    }

    // 사진 터치 → 회전 멈춤 + photo modal
    wrap.addEventListener('click', (e) => {
      const img = e.target.closest('.gallery-strip__img');
      if (!img || !images.length) return;
      paused = true;
      openedByStrip = true;
      sync();
      openPhotoModal(images, Number(img.dataset.index));
    });

    // 모달을 닫으면 다시 회전
    document.addEventListener('photomodalclose', () => {
      if (!openedByStrip) return;
      openedByStrip = false;
      paused = false;
      sync();
    });

    window.addEventListener('resize', () => { if (W > 0) measure(); }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(section);
    }

    return {
      setImages: build,
      show() {                 // 앨범이 펼쳐진 뒤: 처음(1이 맨 앞)부터 흐르기 시작
        x = 0;
        paused = false;
        shown = true;
        render();
        wrap.classList.add('is-visible');
        sync();
      },
      hide() {                 // 섹션을 벗어나면 초기화
        shown = false;
        wrap.classList.remove('is-visible');
        sync();
      }
    };
  }

  /* ═══════════════════════════════════════════
     Gallery Book (앨범 영상: 초록 배경 제거 + 효과음 + 마지막 프레임에서 정지)
     · 갤러리 섹션에 진입하면 영상(소리 없음)과 page_flip.mp3가 함께 재생됩니다.
     · 영상이 끝나면 마지막 프레임 그대로 캔버스에 남습니다.
     · 섹션을 벗어났다가 다시 진입하면 처음부터 다시 재생됩니다.
     ═══════════════════════════════════════════ */
  function initGalleryBook() {
    const section = $('#gallery');
    const video = $('#galleryBookVideo');
    const canvas = $('#galleryBookCanvas');
    const flip = $('#pageFlipSound');
    if (!section || !video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const maxW = 640;          // 캔버스 최대 가로(px) — 크로마키를 재생 중에만 처리하므로 여유 있게
    const BOOK_STRETCH = 1.3; // 앨범 영상의 세로 늘리기 배율 (1 = 원래 비율, 1.15 = 세로 15% 늘림)
    const ENTER_RATIO = 0.35;  // 섹션이 이만큼(35%) 보이면 재생 시작
    // 💡 초록 배경 제거: 초록이 R/B 중 큰 값보다 얼마나 더 높은지(k)로 판단.
    // k가 keyLow 이하면 그대로, keyHigh 이상이면 완전 투명, 그 사이는 부드럽게(가장자리 계단 방지).
    const keyLow = 18;
    const keyHigh = 60;

    // 💡 앨범 위를 흐르는 사진 띠 — 책이 펼쳐진 뒤(영상 종료) 나타납니다.
    const strip = createGalleryStrip(section);
    const bookLabels = section.querySelector('.gallery-book__labels');   // 펼쳐진 페이지 위 글자: 책이 펼쳐진 뒤 나타남
    loadImagesFromFolder('gallery').then((imgs) => strip.setImages(imgs));

    const FIRST_FRAME_HOLD = 2000;   // 첫 프레임에서 멈춰 있는 시간(ms)
    const STRIP_EARLY = 1.2;         // 영상이 끝나기 이만큼(초) 전에 사진 띠를 먼저 등장시킴 (클수록 더 빨리)
    let stripShown = false;
    let state = 'idle';        // idle → playing → done
    let raf = null;
    let holdTimer = null;

    function resizeCanvas() {
      if (!video.videoWidth || !video.videoHeight) return;
      const scale = Math.min(1, maxW / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      // 💡 화면에 보이는 세로 길이만 BOOK_STRETCH배로 늘림(비율이 깨지는 것을 감수). 그림자는 늘어난 박스 기준으로 그려집니다.
      canvas.style.aspectRatio = `${canvas.width} / ${canvas.height * BOOK_STRETCH}`;
    }

    function drawFrame() {
      if (!canvas.width || !canvas.height || video.readyState < 2) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const k = g - (r > b ? r : b);
        if (k >= keyHigh) {
          d[i + 3] = 0;
        } else if (k > keyLow) {
          d[i + 3] = 255 * (keyHigh - k) / (keyHigh - keyLow);
          d[i + 1] = (r > b ? r : b);   // 남은 초록빛(스필) 제거
        }
      }
      ctx.putImageData(frame, 0, 0);
    }

    function loop() {
      if (state !== 'playing') return;
      drawFrame();
      raf = requestAnimationFrame(loop);
    }

    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    // 첫 프레임을 먼저 보여주고, FIRST_FRAME_HOLD 만큼 멈춰 있다가 영상 + 효과음을 재생합니다.
    function showFirstFrame() {
      const needSeek = video.currentTime > 0.01;
      video.currentTime = 0;
      if (needSeek) {
        video.addEventListener('seeked', () => { if (state === 'playing') drawFrame(); }, { once: true });
      } else if (video.readyState >= 2) {
        drawFrame();
      } else {
        video.addEventListener('loadeddata', () => { if (state === 'playing') drawFrame(); }, { once: true });
      }
    }

    function beginPlayback() {
      holdTimer = null;
      if (state !== 'playing') return;
      const vp = video.play();
      if (vp && vp.catch) vp.catch(() => {});
      if (flip) {
        flip.currentTime = 0;
        const ap = flip.play();
        if (ap && ap.catch) ap.catch(() => {});
      }
      stopLoop();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (state !== 'idle') return;
      state = 'playing';
      resizeCanvas();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      showFirstFrame();
      clearTimeout(holdTimer);
      holdTimer = setTimeout(beginPlayback, FIRST_FRAME_HOLD);
    }

    // 영상이 끝나면 마지막 프레임을 한 번 더 그려서 그대로 남기고, 처리 루프는 멈춥니다.
    video.addEventListener('ended', () => {
      if (state !== 'playing') return;
      drawFrame();
      state = 'done';
      stopLoop();
      showStripOnce();
    });
    // 영상을 못 불러오는 경우에도 사진 띠는 보이도록
    video.addEventListener('error', () => {
      if (state === 'playing') { state = 'done'; stopLoop(); }
      showStripOnce();
    });

    // 💡 영상이 끝나기 STRIP_EARLY초 전부터 사진 띠를 미리 등장시켜 타이밍을 조금 앞당깁니다.
    video.addEventListener('timeupdate', () => {
      if (state !== 'playing' || stripShown || !video.duration) return;
      if (video.duration - video.currentTime <= STRIP_EARLY) showStripOnce();
    });

    function showStripOnce() {
      if (stripShown) return;
      stripShown = true;
      strip.show();
      if (bookLabels) bookLabels.classList.add('is-visible');
      section.classList.add('is-book-open');   // 💡 카메라 일러스트·"웨딩 갤러리" 제목·안내 문구도 이때 나타남 (styles.css)
    }

    // 섹션을 완전히 벗어나면 초기화 → 다시 진입하면 처음부터 재생
    function reset() {
      if (state === 'idle') return;
      state = 'idle';
      stripShown = false;
      strip.hide();
      if (bookLabels) bookLabels.classList.remove('is-visible');
      section.classList.remove('is-book-open');
      clearTimeout(holdTimer);
      holdTimer = null;
      stopLoop();
      video.pause();
      if (flip) { flip.pause(); flip.currentTime = 0; }
    }

    video.addEventListener('loadedmetadata', resizeCanvas);
    if (video.readyState >= 1) resizeCanvas();
    video.muted = true;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        const e = entries[0];
        if (e.isIntersecting && e.intersectionRatio >= ENTER_RATIO) start();
        else if (!e.isIntersecting) reset();
      }, { threshold: [0, ENTER_RATIO] }).observe(section);
    }

    // 💡 iOS 등에서는 사용자 터치 없이 소리를 재생할 수 없어서, 첫 터치 때 효과음을 미리 "잠금 해제"해 둡니다
    // (소리 없이 재생했다 바로 멈춤). 이후에는 섹션 진입 때 자동으로 재생됩니다.
    if (flip) {
      const unlock = () => {
        document.removeEventListener('pointerdown', unlock, true);
        flip.muted = true;
        const p = flip.play();
        if (p && p.then) {
          p.then(() => { flip.pause(); flip.currentTime = 0; flip.muted = false; })
           .catch(() => { flip.muted = false; });
        } else {
          flip.muted = false;
        }
      };
      document.addEventListener('pointerdown', unlock, true);
    }
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
    initShareButtons();
    initEnvelopeOpening();
    initTopNav();
    initTopVideo();
    initParticles();
    initCatVideo();
    initCatDanceModal();
    initTopGreetingText();
    initHero();
    initGreeting();
    initGalleryBook();
    initCalendarLinks();

    initPhotoModal();
    initLocation();
    initAccounts();
    initRsvp();
    initFooter();
    initScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
   인트로 — 두 개의 그라데이션 원 (Greeting 섹션 맨 위)
   · 화면을 길게 누르면 두 원이 하나로 겹쳐지고, 그 상태로 유지됩니다
   · 설정값은 config.js 의 window.CIRCLE_INTRO 에서 가져옵니다
   · 다른 코드와 이름이 겹치지 않도록 별도의 (function () { ... })() 안에 넣었습니다
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.CIRCLE_INTRO;
  if (!CFG) { console.warn('[circle-intro] config.js 에 window.CIRCLE_INTRO 가 없습니다.'); return; }
  var T = CFG.text;        // 원 안 문구 / 폰트
  var P = CFG.palette;     // 색상

  class CircleIntro {
    constructor(track, pin, section) {
      this.track = track;
      this.pin = pin;
      this.section = section;
      this.part1 = track.querySelector('.greeting__part1');           // C: bg_01 영역
      this.canvas = section.querySelector('.circle-intro__canvas');
      this._visible = true;
      this.L = null;
      this._p = 0;   // 0→1: 아래 원이 올라와 두 원이 하나로 합쳐지는 진행도(스크롤로 결정, 왕복 가능)
      this._merged = false;   // 두 원이 겹친 상태(효과음 중복 재생 방지, 왕복 시 다시 재생되도록 리셋)
    }

    /* ---------- 시작 / 정리 ---------- */
    init() {
      if (!this.canvas || !this.track || !this.pin) return;
      // 💡 원 두 개가 겹치는 순간 나는 효과음. iOS 등은 사용자 터치 없이 소리를 낼 수 없어서,
      // 첫 터치 때 미리 "잠금 해제"해 둡니다(소리 없이 재생했다 바로 멈춤).
      this.mergeSound = document.getElementById('circleMergeSound');
      if (this.mergeSound) {
        const snd = this.mergeSound;
        snd.volume = 0.6;   // 효과음이 커서 60%로 줄임
        const unlock = () => {
          document.removeEventListener('pointerdown', unlock, true);
          snd.muted = true;
          const p = snd.play();
          if (p && p.then) {
            p.then(() => { snd.pause(); snd.currentTime = 0; snd.muted = false; }).catch(() => { snd.muted = false; });
          } else {
            snd.muted = false;
          }
        };
        document.addEventListener('pointerdown', unlock, true);
      }
      // 캔버스에 그려지는 글자용 폰트를 미리 불러둠
      if (document.fonts && document.fonts.load) {
        var txt = T.top + T.bottom + T.center;
        [T.serifWeight + ' 28px "ZenSerifKR"', T.serifWeight + ' 28px "Noto Serif KR"']
          .forEach(function (f) { document.fonts.load(f, txt).catch(function () {}); });
      }
      this._fade = 18;   // A 아래 경계 그라디언트 띠 높이(px): 위 A → 아래 C로 부드럽게 이어짐
      this._layout();
      this._buildCover();
      this._lastWidth = window.innerWidth;
      this._onResize = () => {
        if (window.innerWidth === this._lastWidth) return;
        this._lastWidth = window.innerWidth;
        this._layout();
      };
      window.addEventListener('resize', this._onResize, { passive: true });

      if ('IntersectionObserver' in window) {
        // 💡 화면 밖이면 반복(requestAnimationFrame) 자체를 멈추고, 다시 들어오면 이어서 돌림
        this._io = new IntersectionObserver((entries) => {
          this._visible = entries[0].isIntersecting;
          if (this._visible && !this._raf && this._loop) {
            this._last = performance.now();
            this._raf = requestAnimationFrame(this._loop);
          }
        }, { rootMargin: '200px 0px' });
        this._io.observe(this.track);
      }
      this._startLoop();
    }

    destroy() {
      if (this._io) this._io.disconnect();
      window.removeEventListener('resize', this._onResize);
      cancelAnimationFrame(this._raf);
    }

    /* ---------- 크기/배치: config.js 의 CIRCLE_INTRO.layout 값을 그대로 px로 적용
       (화면 폭/높이를 계산에 쓰지 않으므로 기기·브라우저와 무관하게 항상 동일) ---------- */
    _layout() {
      var lay = CFG.layout;
      var R = lay.circleRadius;
      var top = lay.top;
      var bottom = lay.bottom;
      var G = lay.height - top - bottom;             // 두 원이 차지하는 세로 길이
      this.L = { w: lay.width, R: R, G: G, top: top, bottom: bottom, height: lay.height, cy: top + G / 2 };

      var s = this.section.style;
      s.setProperty('--circle-intro-width', lay.width + 'px');
      s.setProperty('--circle-intro-height', lay.height + 'px');
      s.setProperty('--circle-intro-top', top + 'px');                          // 상단 문구 영역 높이
      s.setProperty('--circle-intro-heading-size', lay.headingFontSize + 'px');
      s.setProperty('--circle-intro-heading-padding-x', lay.headingPaddingX + 'px');
      s.setProperty('--circle-intro-heading-offset-y', (lay.headingOffsetY || 0) + 'px');
      s.setProperty('--circle-intro-visible-height', lay.height + 'px');       // 박스 높이는 항상 고정

      // 💡 A(제목 줄)의 높이 = 제목 문구 맨 아래 + 10px. (문구는 line-height가 고정 배수라 폰트 로딩과 무관)
      // pin/C의 CSS가 쓰도록 track에 넣습니다. 박스는 여전히 하나(490×840)라 모습은 그대로입니다.
      var headP = this.section.querySelector('.circle-intro__heading p');
      var aH = headP ? Math.ceil(headP.offsetTop + headP.offsetHeight + 10) : 0;
      aH = Math.max(0, Math.min(aH, lay.height));
      var t = this.track.style;
      t.setProperty('--circle-intro-width', lay.width + 'px');
      t.setProperty('--circle-intro-height', lay.height + 'px');
      t.setProperty('--circle-intro-a-height', aH + 'px');
      t.setProperty('--circle-intro-fade', this._fade + 'px');   // A 아래 경계 그라디언트 띠 높이
      this._aH = aH;
      if (this.coverSection) this.coverSection.style.cssText = this.section.style.cssText;   // 복제본에도 같은 변수 적용

      // 💡 병합 진행 거리: C는 스크롤과 같은 속도로 올라오므로, C의 윗변이 (원이 다 합쳐졌을 때
      // 보이던 박스 높이 = 기존 h1) 까지 올라오는 만큼 스크롤하는 동안 두 원이 합쳐집니다.
      // → 병합이 끝나는 순간의 모습이 기존(박스가 h1로 줄고 bg_01이 바로 붙은 상태)과 같습니다.
      var cyAnchor = top + G / 2 - R * 1.03;
      var h1 = Math.round(cyAnchor + R * 1.22 + bottom);
      this._scrollDist = Math.max(1, lay.height - h1);
    }

    /* ---------- 스크롤 위치 → 목표 진행도(_pTarget) ----------
       고정은 CSS position:sticky(.circle-intro-pin)가 처리합니다. 여기서는
       .circle-intro-track 윗변이 화면 위로 지나간 만큼으로 병합 진행도(0~1)만 계산합니다.
       C도 같은 스크롤로 함께 올라오므로 기존처럼 C가 원 영역을 덮으며 올라옵니다. */
    _updateScrollTarget() {
      var track = this.track;
      if (!track) return;
      var trackRect = track.getBoundingClientRect();
      var scrolled = -trackRect.top;                  // track 윗변이 화면 위로 넘어간 만큼(px)
      this._pTarget = Math.max(0, Math.min(1, scrolled / this._scrollDist));
    }

    /* ---------- 커버(복제본) 만들기 ----------
       원 박스(A+B)가 한 요소라 C를 A 밑으로 넣을 수 없어서, 원본 pin을 복제해 원본 바로 앞에
       둡니다. 복제본(.circle-intro-pin--cover)은 z-index 3으로 C 위에 놓이고 A 높이만큼만 보이며
       (원본과 같은 sticky 슬롯 높이라 고정 해제 시점이 같음), 클릭은 통과시킵니다.
       C는 z 2라 A 밑으로 들어가는 것처럼 보이며, 스크롤 이벤트로 계산하는 값은 없습니다.
       캔버스는 cloneNode로 그림이 복사되지 않으므로 _drawIntro가 매 프레임 윗부분만 복사해 그립니다. */
    _buildCover() {
      var cover = this.pin.cloneNode(true);
      cover.removeAttribute('id');
      cover.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
      cover.classList.add('circle-intro-pin--cover');
      cover.setAttribute('aria-hidden', 'true');
      cover.setAttribute('inert', '');
      cover.inert = true;
      this.pin.parentNode.insertBefore(cover, this.pin);
      this.cover = cover;
      this.coverSection = cover.querySelector('.circle-intro');
      this.coverCanvas = cover.querySelector('.circle-intro__canvas');
      this.coverSection.style.cssText = this.section.style.cssText;
    }
    /* ---------- 애니메이션 루프 ----------
       스크롤 진행도 계산과 캔버스 다시 그리기를 같은 프레임 안에서 순서대로 처리합니다. */
    _startLoop() {
      this._rot = 0; this._spd = 0.09; this._last = performance.now();
      this._pTarget = 0;
      const loop = (tm) => {
        if (!this._visible) { this._raf = null; return; }   // 💡 화면 밖 → 멈춤 (IntersectionObserver가 다시 시작)
        const dtRaw = Math.max(0, (tm - this._last) / 1000);
        const dt = Math.min(dtRaw, 0.05);

        this._updateScrollTarget();
        // 💡 목표값을 매 프레임 조금씩(smoothing) 따라감 — 숫자가 작을수록(더 느리게
        // 따라갈수록) 더 부드럽지만 체감 반응은 느려집니다. 0.18 전후가 적당합니다.
        this._p += (this._pTarget - this._p) * Math.min(1, dt * 60 * 0.18);

        if (this._visible) {
          // 회전 속도: 합쳐지는 동안 빨라지고, 다시 벌어지면 차분해짐
          const targetSpd = 0.09 + this._p * 0.4;
          this._spd += (targetSpd - this._spd) * Math.min(1, dt * 2.5);
          this._rot += dt * this._spd;
          this._drawIntro(tm);
        }
        this._last = tm;
        this._raf = requestAnimationFrame(loop);
      };
      this._loop = loop;
      this._raf = requestAnimationFrame(loop);
    }

    /* ---------- 캔버스 그리기 ---------- */
    _noisePattern(x) {
      if (this._np) return this._np;
      const n = document.createElement('canvas'); n.width = n.height = 160;
      const nx = n.getContext('2d');
      const img = nx.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 22 + Math.random() * 30;
      }
      nx.putImageData(img, 0, 0);
      this._np = x.createPattern(n, 'repeat');
      return this._np;
    }
    _ringGlow(host, cx, cy, R, a, ty, gapY, dpr, W, H) {
      if (a <= 0.001) return;
      ty = ty || 1;
      const ph = this._rot || 0;
      if (!this._buf) this._buf = document.createElement('canvas');
      const bc = this._buf;
      if (bc.width !== Math.round(W * dpr) || bc.height !== Math.round(H * dpr)) {
        bc.width = Math.round(W * dpr); bc.height = Math.round(H * dpr);
      }
      const x = bc.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, W, H);
      x.save();
      x.translate(cx, cy); x.scale(1, ty);
      x.globalCompositeOperation = 'lighter';
      const g = x.createRadialGradient(0, 0, R * 0.45, 0, 0, R * 1.22);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.75, 'rgba(255,255,255,' + a * 0.16 + ')');
      g.addColorStop(0.88, 'rgba(255,255,255,' + a * 0.34 + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(0, 0, R * 1.22, 0, 7); x.fill();

      // dotted orbits at different tilts — reads as a sphere, not a flat stroke
      const lite = ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0 || (window.innerWidth || 1200) < 900) ? 0.34 : 1;                 // phones draw fewer dots so the merge stays smooth
      const orbits = [
        { rx: 1.00, ry: 1.00, rot: 0, n: Math.round(120 * lite), sp: 0.22, w: 1.0 },
        { rx: 1.00, ry: 0.24, rot: 0, n: Math.round(70 * lite), sp: 0.34, w: 0.8 },
        { rx: 0.88, ry: 0.50, rot: -0.42, n: Math.round(62 * lite), sp: -0.28, w: 0.7 },
        { rx: 1.15, ry: 0.86, rot: 0.55, n: Math.round(56 * lite), sp: 0.16, w: 0.55 }
      ];
      if (!this._dotSprite) {
        const S = 64, sp = document.createElement('canvas');
        sp.width = S; sp.height = S;
        const sx = sp.getContext('2d');
        const sg = sx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        sg.addColorStop(0, 'rgba(255,255,255,1)');
        sg.addColorStop(0.5, 'rgba(255,255,255,.3)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        sx.fillStyle = sg; sx.fillRect(0, 0, S, S);
        this._dotSprite = sp;
      }
      const sprite = this._dotSprite;
      for (const o of orbits) {
        const ca = Math.cos(o.rot), sa = Math.sin(o.rot);
        for (let i = 0; i < o.n; i++) {
          const ang = (i / o.n) * Math.PI * 2 + ph * o.sp;
          const ux = Math.cos(ang) * o.rx * R, uy = Math.sin(ang) * o.ry * R;
          const px = ux * ca - uy * sa, py = ux * sa + uy * ca;
          const depth = 0.5 + 0.5 * Math.sin(ang);          // front half brighter and larger
          const tw = 0.55 + 0.45 * Math.sin(ph * 2.2 + i * 1.3);
          const rad = (0.55 + depth * 1.1) * o.w * (0.7 + tw * 0.45);
          const al = a * o.w * (0.2 + 0.75 * depth) * (0.55 + 0.45 * tw);
          const d2 = rad * 4.2;
          x.globalAlpha = Math.min(1, al);
          x.drawImage(sprite, px - d2 / 2, py - d2 / 2, d2, d2);
          x.globalAlpha = 1;
          if (lite === 1 && depth > 0.93 && tw > 0.85) {    // rare 4-point twinkle on the near edge
            const L = rad * 5.2;
            x.strokeStyle = 'rgba(255,255,255,' + Math.min(1, al * 0.75) + ')';
            x.lineWidth = 0.7;
            x.beginPath();
            x.moveTo(px - L, py); x.lineTo(px + L, py);
            x.moveTo(px, py - L); x.lineTo(px, py + L);
            x.stroke();
          }
        }
      }
      x.restore();
      if (gapY !== undefined) {                       // carve the label band out of this ring's glow
        x.save();
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        x.globalCompositeOperation = 'destination-out';
        const hy = cy + gapY * ty;
        const hole = x.createRadialGradient(cx, hy, 0, cx, hy, R * 0.5);
        hole.addColorStop(0, 'rgba(0,0,0,.72)');       // dims the band instead of erasing it
        hole.addColorStop(0.55, 'rgba(0,0,0,.55)');
        hole.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = hole;
        x.beginPath(); x.arc(cx, hy, R * 0.5, 0, 7); x.fill();
        x.restore();
      }
      host.save();
      host.globalCompositeOperation = 'lighter';
      host.setTransform(1, 0, 0, 1, 0, 0);
      host.drawImage(bc, 0, 0);
      host.restore();
      host.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    _drawIntro(t) {
      const c = this.canvas;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const w = c.clientWidth, h = c.clientHeight;
      const hostScale = w > 0 ? rect.width / w : 1;      // host preview zoom / transform scale
      const cap = ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0 || (window.innerWidth || 1200) < 900) ? 1.5 : 4;
      const dpr = Math.max(1, Math.min((window.devicePixelRatio || 1) * (hostScale || 1), cap));
      if (!w || !h) return;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      }
      const x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const p = this._p;
      const ease = v => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
      const ep = ease(Math.min(1, p));
      const L = this.L;
      const cx = w / 2, cy = L.cy;               // 두 원의 가운데 (위 여백 + 원 영역의 절반)
      const TY = 1;                                  // perspective tilt: circles read as floor ellipses
      const R = L.R;
      // 💡 위쪽 원은 제자리에 고정, 아래쪽 원만 위로 올라와 합쳐집니다(다른 요소는
      // 전혀 움직이지 않음). idle 때(ep=0)/완전히 합쳐졌을 때(ep=1)의 위치·간격은
      // 기존과 동일해서 원 크기·레이아웃은 그대로 유지됩니다.
      const cyAnchor = cy - R * 1.03;              // 고정된 위쪽 원 중심
      const cyBottomIdle = cy + R * 1.03;          // 아래쪽 원의 시작(분리) 위치
      const cx1 = cx, cy1 = cyAnchor;
      const cx2 = cx, cy2 = cyBottomIdle + (cyAnchor - cyBottomIdle) * ep;
      const dsep = Math.hypot(cx2 - cx1, (cy2 - cy1) / TY);
      const textCy = (cy1 + cy2) / 2;              // 가운데(합쳐진 뒤) 문구가 실제로 위치할 지점
      const g = Math.min(1, p / 0.9);
      x.fillStyle = P.base; x.fillRect(0, 0, w, h);
      const blob = (bx, by, br, col, al) => {
        const bgg = x.createRadialGradient(bx, by, 0, bx, by, br);
        bgg.addColorStop(0, col + Math.round(al * 255).toString(16).padStart(2, '0'));
        bgg.addColorStop(1, col + '00');
        x.fillStyle = bgg; x.fillRect(0, 0, w, h);
      };
      const dia = Math.hypot(w, h);
      blob(w * 0.5, cy - h * 0.04, dia * 0.44, P.haloBig, P.alpha.haloBig);
      blob(w * 0.5, cy - h * 0.06, dia * 0.24, P.haloCore, P.alpha.haloCore);
      blob(w * 0.30, h * 0.18, dia * 0.34, P.topLeft, P.alpha.topLeft);
      blob(w * 0.76, h * 0.22, dia * 0.30, P.topRight, P.alpha.topRight);
      blob(w * 0.28, h * 0.80, dia * 0.34, P.bottomLeft, P.alpha.bottomLeft);
      blob(w * 0.72, h * 0.82, dia * 0.34, P.bottomRight, P.alpha.bottomRight);
      blob(w * 0.5, cy, dia * 0.72, P.base, P.alpha.wash);
      const ra = 0.22 + 0.78 * g;
      this._ringGlow(x, cx1, cy1, R, ra, TY, (textCy - cy1) / TY, dpr, w, h);
      this._ringGlow(x, cx2, cy2, R, ra, TY, (textCy - cy2) / TY, dpr, w, h);
      const ov = Math.max(0, 1 - dsep / (2 * R));
      // 💡 두 원이 완전히 겹쳐 하나가 된 순간(ov가 거의 1) 효과음 재생. _p가 스크롤을 따라 서서히
      // 1에 다가가기만 해서(정확히 1이 되지 않음) 0.99 이상을 "하나가 됨"으로 봅니다.
      // 다시 벌어지면(0.9 밑으로) 리셋되어, 스크롤을 왕복해 다시 하나가 될 때도 재생됩니다.
      if (ov > 0.99 && !this._merged) {
        this._merged = true;
        if (this.mergeSound) {
          this.mergeSound.currentTime = 0;
          this.mergeSound.play().catch(() => {});
        }
      } else if (ov < 0.9 && this._merged) {
        this._merged = false;
      }
      if (ov > 0.001) {
        x.save();
        x.beginPath(); x.ellipse(cx1, cy1, R * 1.02, R * 1.02 * TY, 0, 0, 7); x.clip();
        x.beginPath(); x.ellipse(cx2, cy2, R * 1.02, R * 1.02 * TY, 0, 0, 7); x.clip();
        const lg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.42, 'rgba(255,255,255,0)');
        lg.addColorStop(0.78, 'rgba(255,255,255,0)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = lg; x.fillRect(0, 0, w, h);
        x.restore();
      }
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = this._noisePattern(x);
      x.globalAlpha = 0.38; x.fillRect(0, 0, w, h);
      x.restore();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      /* ---- 텍스트 ---- */
      const clamp01 = v => Math.max(0, Math.min(1, v));
      x.save();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      // 1) 위·아래 원 중앙: 부모님 문구 (원이 겹쳐지기 시작하면 서서히 사라짐)
      const parentFade = 1 - clamp01((ov - 0.03) / 0.3);
      if (parentFade > 0.01) {
        const pfs = Math.max(12, Math.min(20, R * 0.30));
        x.shadowColor = 'transparent'; x.shadowBlur = 0;
        x.font = T.serifWeight + ' ' + pfs.toFixed(1) + 'px ' + T.serifFont;      // ZEN SERIF
        x.letterSpacing = '1.6px';
        x.fillStyle = 'rgba(' + P.parentTextRGB + ',' + (P.parentTextAlpha * parentFade).toFixed(3) + ')';   // 원본 "FoRm LoGic" 색
        x.fillText(T.top, cx1, cy1);
        x.fillText(T.bottom, cx2, cy2);
      }
      // 2) 원이 겹쳐진 순간: 가운데 문구
      const centerA = clamp01((ov - 0.2) / 0.5);
      if (centerA > 0.01) {
        x.shadowColor = 'rgba(' + P.textRGB + ',.5)';      // 흰 글씨가 잘 읽히도록 아주 약한 그림자
        // 💡 이미 위에서 setTransform(dpr,...)으로 좌표계 전체가 dpr배 되어 있어서
        // shadowBlur도 자동으로 dpr배 커집니다. 여기서 dpr을 또 곱하면 고화질 화면에서
        // 블러가 과하게 커져 세리프 폰트 디테일이 뭉개져 보입니다(= 폰트가 안 먹은 것처럼 보임).
        x.shadowBlur = 8;
        const cfs = R * (0.112 + 0.034 * ov);
        const mainFont = T.serifWeight + ' ' + cfs.toFixed(1) + 'px ' + T.serifFont;
        x.font = mainFont;
        x.letterSpacing = (1 + ov * 2).toFixed(1) + 'px';
        x.fillStyle = 'rgba(255,255,255,' + (0.98 * centerA).toFixed(3) + ')';

        // 💡 '♥'만 본문 글자 크기의 1/3로 줄여서 그리기 위해, 가운데 정렬 대신
        // 전체 폭을 직접 재서 좌측부터 순서대로 그린 뒤 중앙에 오도록 위치를 맞춥니다.
        const heartParts = T.center.split('♥');
        if (heartParts.length === 2) {
          const heartFont = T.serifWeight + ' ' + (cfs / 3).toFixed(1) + 'px ' + T.serifFont;
          x.textAlign = 'left';
          x.font = mainFont;
          const w1 = x.measureText(heartParts[0]).width;
          x.font = heartFont;
          const wHeart = x.measureText('♥').width;
          x.font = mainFont;
          const w2 = x.measureText(heartParts[1]).width;
          let curX = cx - (w1 + wHeart + w2) / 2;
          x.font = mainFont;
          x.fillText(heartParts[0], curX, textCy);
          curX += w1;
          x.font = heartFont;
          x.fillText('♥', curX, textCy);
          curX += wHeart;
          x.font = mainFont;
          x.fillText(heartParts[1], curX, textCy);
          x.textAlign = 'center';
        } else {
          x.fillText(T.center, cx, textCy);
        }
      }
      x.letterSpacing = '0px';
      x.restore();

      // 커버(복제본)의 A 영역 + 경계 띠에 같은 프레임의 윗부분(0 ~ A 높이 + 띠)을 그대로 복사
      const cc = this.coverCanvas;
      if (cc && this._aH) {
        const sh = Math.min(c.height, Math.round((this._aH + this._fade) * dpr));
        if (cc.width !== c.width || cc.height !== sh) { cc.width = c.width; cc.height = sh; }
        cc.getContext('2d').drawImage(c, 0, 0, c.width, sh, 0, 0, c.width, sh);
      }
    }
  }

  function boot() {
    var track = document.getElementById('circleIntroTrack');
    var pin = document.getElementById('circleIntroPin');
    var el = document.getElementById('circle-intro');
    if (track && pin && el) new CircleIntro(track, pin, el).init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ============================================================
   오시는 길 — 포스터 병풍 펼침 (fold-test.html 이식)
   - 포스터를 가로 띠 N장으로 잘라 아코디언처럼 접어 두고,
     스크롤로 스테이지가 화면 중앙에 올수록 펼쳐집니다.
   - 스크롤 기준: window (이 프로젝트는 내부 스크롤 컨테이너 없음)
   ============================================================ */
(function () {
  /* ===================== 설정값 (여기만 조절) ===================== */
  const CFG = {
    strips: 4,            // 띠 개수
    foldStart: 84,        // 시작 접힘 각도 (90 = 완전히 포개짐). 84면 층이 살짝 보임
    foldEnd: 12,          // 끝 접힘 각도 (0 = 완전 평면). 12면 접힌 자국이 계단처럼 남음
    tiltStart: 4,         // 종이 전체의 뒤로 기울기 (시작)
    tiltEnd: 10,          // 종이 전체의 뒤로 기울기 (끝)
    maxWidth: 360,        // 포스터 최대 너비(px)
    widthVW: 0.85,        // 화면 너비 대비 비율
    shade: 0.5,           // 아래를 향한 면 최대 어둡기
    // 스크롤 구간: 스테이지 중심이 화면 enter 지점 → end 지점으로 이동하는 동안 0→1
    scrollEnter: 0.9,     // 화면 높이 배수 (1 = 화면 맨 아래)
    scrollEnd: 0.5,       // 0.5 = 화면 중앙

    image: "images/location/1.jpg",
  };
  /* ============================================================== */

  const paper = document.getElementById("foldPaper");
  const stage = document.getElementById("foldStage");
  const shadow = document.getElementById("foldShadow");
  if (!paper || !stage) return;

  let strips = [];      // [{el, shade}]
  let aspect = 3 / 4;
  let current = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  const rad = d => d * Math.PI / 180;

  /* ---------- DOM: .fold-paper > strip1 > strip2 > strip3 > strip4 ---------- */
  function buildFold() {
    paper.innerHTML = "";
    strips = [];
    const n = CFG.strips;
    paper.style.setProperty("--n", n);
    let parent = paper;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("div");
      s.className = "fold-strip" + (i === 0 ? " is-first" : "");
      const face = document.createElement("div");
      face.className = "fold-face";
      face.style.backgroundPosition = `0 ${n === 1 ? 0 : (i / (n - 1)) * 100}%`;
      const back = document.createElement("div");
      back.className = "fold-back";
      const shade = document.createElement("div");
      shade.className = "fold-shade";
      s.append(face, back, shade);
      // 그림자용 꼭짓점 측정점 (좌상·우상·우하·좌하) — 크기 0이라 화면엔 안 보임
      const probes = [["0", "0"], ["100%", "0"], ["100%", "100%"], ["0", "100%"]].map(([x, y]) => {
        const pr = document.createElement("div");
        pr.className = "fold-probe";
        pr.style.left = x; pr.style.top = y;
        s.appendChild(pr);
        return pr;
      });
      parent.appendChild(s);
      let poly = null;
      if (shadow) {
        poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        shadow.appendChild(poly);
      }
      strips.push({ el: s, shade, probes, poly });
      parent = s;
    }
  }

  /* ---------- 긴 배경(bg_long.jpg) 시작 위치 = 위쪽 벽 배경(bg_top.jpg)이 끝나는 곳 ----------
     오시는 길·계좌번호 두 섹션이 함께 쓰는 배경을 요정 영역(.fairy-zone)에 깔고,
     포스터 크기(화면 높이에 따라 달라짐)가 바뀔 때마다 시작 위치를 다시 맞춥니다.
     💡 styles.css .fold-stage::before 높이 계산과 같은 식 → 두 배경 사이에 빈틈이 없음 */
  const bgZone = document.getElementById("fairyZone");
  function placeLongBg() {
    if (!bgZone) return;
    const cs = getComputedStyle(stage);
    const padTop = parseFloat(cs.getPropertyValue("--fold-pad-top")) || 0;
    const padBottom = parseFloat(cs.getPropertyValue("--fold-pad-bottom")) || 0;
    const bgEnd = parseFloat(cs.getPropertyValue("--fold-bg-end")) || 1;
    const rect = stage.getBoundingClientRect();
    const posterH = rect.height - padTop - padBottom;
    const top = rect.top + padTop + posterH * bgEnd - bgZone.getBoundingClientRect().top;
    bgZone.style.setProperty("--loc-bg-top", Math.floor(top) + "px");   // 내림 → 소수점 차이로 1px 틈이 생기지 않게 bg_top 밑으로 살짝 겹침
  }
  if (bgZone && window.ResizeObserver) new ResizeObserver(placeLongBg).observe(stage);

  /* ---------- 크기 ---------- */
  function layout() {
    const vh = window.innerHeight;
    let W = Math.min(CFG.maxWidth, window.innerWidth * CFG.widthVW);
    if (W / aspect > vh * 0.7) W = vh * 0.7 * aspect;
    const H = W / aspect, n = CFG.strips, sh = H / n;
    paper.style.setProperty("--w", W + "px");
    paper.style.setProperty("--h", H + "px");
    paper.style.setProperty("--sh", sh + "px");
    render(current);
    placeLongBg();
  }

  /* ---------- 핵심: progress(0~1) → transform ---------- */
  function render(p) {
    current = p;
    const n = CFG.strips;
    const H = paper.offsetHeight;
    const t = easeInOut(clamp(p, 0, 1));

    const a = lerp(CFG.foldStart, CFG.foldEnd, t);   // 접힘 각도
    const T = lerp(CFG.tiltStart, CFG.tiltEnd, t);   // 전체 기울기

    // 띠 각도: 첫 띠 +a, 이후 상대각 -2a, +2a, -2a … → 실제 각도는 T+a, T-a, T+a, T-a
    for (let i = 0; i < n; i++) {
      const rel = i === 0 ? a : (i % 2 ? -2 * a : 2 * a);
      strips[i].el.style.transform = `rotateX(${rel}deg)`;
      const world = T + (i % 2 ? -a : a);              // +면 위를 향함(밝음), -면 아래를 향함(어두움)
      const down = Math.max(0, -Math.sin(rad(world)));
      strips[i].shade.style.opacity = (0.04 + down * CFG.shade).toFixed(3);
    }

    // 접힐수록 세로로 차지하는 높이가 줄어드므로 중심 유지
    const projected = H * Math.cos(rad(a));
    const offsetY = (H - projected) / 2;
    paper.style.transform = `translateY(${offsetY}px) rotateX(${T}deg)`;

    // 그림자: 띠마다 화면에 투영된 네 꼭짓점으로 다각형을 그려 병풍 모양 그대로 따라감
    if (shadow) {
      const sr = stage.getBoundingClientRect();
      for (const s of strips) {
        const pts = s.probes.map(pr => {
          const r = pr.getBoundingClientRect();
          return `${(r.left - sr.left).toFixed(1)},${(r.top - sr.top).toFixed(1)}`;
        });
        s.poly.setAttribute("points", pts.join(" "));
      }
    }
  }

  /* ---------- 스크롤 → progress ---------- */
  function progressFromScroll() {
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    const center = r.top + r.height / 2;
    const from = vh * CFG.scrollEnter, to = vh * CFG.scrollEnd;
    return clamp((from - center) / (from - to), 0, 1);
  }
  /* ---------- 효과음: 펼쳐지기 시작할 때 / 접히기 시작할 때 (images/location/paper_effect.mp3) ---------- */
  const paperSound = new Audio('images/location/paper_effect.mp3');
  paperSound.preload = 'auto';
  // 아이폰 등은 사용자 터치 없이 소리를 못 내서, 첫 터치 때 소리 없이 재생했다 멈춰 "잠금 해제"
  const unlockPaperSound = () => {
    document.removeEventListener('pointerdown', unlockPaperSound, true);
    paperSound.muted = true;
    const p = paperSound.play();
    if (p && p.then) p.then(() => { paperSound.pause(); paperSound.currentTime = 0; paperSound.muted = false; })
                      .catch(() => { paperSound.muted = false; });
    else paperSound.muted = false;
  };
  document.addEventListener('pointerdown', unlockPaperSound, true);

  let foldState = null;      // 'folded'(거의 접힘) | 'open'(거의 펼침) | 'mid'
  let lastSoundAt = 0;
  function updateFoldSound(p) {
    const next = p <= 0.05 ? 'folded' : p >= 0.95 ? 'open' : 'mid';
    if (foldState === null) { foldState = next; return; }   // 처음 위치 잡을 때는 소리 없음
    // 끝 상태(접힘/펼침)에서 벗어나는 순간 한 번만 재생 → 이후 끝 상태에 다시 닿을 때까지는 조용
    const leaving = (foldState === 'folded' && next !== 'folded') || (foldState === 'open' && next !== 'open');
    if (leaving && performance.now() - lastSoundAt > 400) {
      lastSoundAt = performance.now();
      paperSound.currentTime = 0;
      paperSound.play().catch(() => {});
    }
    foldState = next;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const p = progressFromScroll();
      render(p);
      updateFoldSound(p);
    });
  }

  /* ---------- 이미지 로드 ---------- */
  function setImage(src) {
    const img = new Image();
    img.onload = () => {
      aspect = img.naturalWidth / img.naturalHeight;
      paper.style.setProperty("--img", `url("${src}")`);
      layout();
    };
    img.src = src;
  }

  function boot() {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", layout);

    buildFold();
    layout();
    setImage(CFG.image);
    render(progressFromScroll());
    updateFoldSound(progressFromScroll());   // 시작 상태만 기억 (소리 X)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();