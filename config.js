/**
 * 지나가 만든 모청입니다💗💗💗
 * 
 *
 * 이 파일에서 청첩장의 모든 정보를 수정할 수 있습니다.
 * 이미지는 설정이 필요 없습니다. 아래 폴더에 순번 파일명으로 넣으면 자동 감지됩니다.
 *
 * 이미지 폴더 구조 (파일명 규칙):
 *   images/hero/1.jpg      - 메인 사진 (1장, 필수)
 *   images/gallery/1.jpg, 2.jpg, ... - 갤러리 사진들 (순번, 자동 감지)
 *   images/location/1.jpg  - 약도/지도 이미지 (1장)
 *   images/og/1.jpg        - 카카오톡 공유 썸네일 (1장)
 */

const CONFIG = {
  // ── 초대장 열기 ──
  useCurtain: true,

  // ── 메인 (히어로) ──
  groom: {
    name: "정진우",
    nameEn: "Groom",
    father: "정재우",
    mother: "박성아",
    fatherDeceased: false,
    motherDeceased: false
  },

  bride: {
    name: "배진아",
    nameEn: "Bride",
    father: "배은병",
    mother: "이은자",
    fatherDeceased: false,
    motherDeceased: false
  },

  wedding: {
    date: "2026-12-05",
    time: "11:00",
    venue: "베뉴비안",
    hall: "에메랄드홀 2층",
    address: "서울특별시 영등포구 신길로 89",       // 주소 복사 버튼으로 복사되는 주소
    addressShort: "서울 영등포구 신길로 89",       // 오시는 길 화면에 보이는 주소 (비우면 address 사용)
    tel: "02-842-7200",                           // 예식장 이름 옆 전화 아이콘을 누르면 복사됨
    mapLinks: {
      kakao: "https://kko.to/2v7pG6yzkw",
      naver: "https://naver.me/FhULR7Qm"
    },

    // ── 오시는 길 교통편 아코디언 ──
    // icon: car / bus / subway / train (images/location/svg/<icon>-solid.svg)
    // 처음엔 모두 닫혀 있음. 처음부터 펼쳐두고 싶은 항목에만 open: true 추가 (여러 개 가능)
    // items: 소제목(label)과 내용(text). 내용 줄바꿈은 \n
    directions: [
      {
        icon: "car", title: "자차",
        items: [
          { label: "네비게이션", text: "'베뉴비안' 검색" },
          { label: "주소", text: "서울 영등포구 신길로 89" },
          { label: "주차", text: "지상 주차장 및 지하주차장을 이용하시기 바랍니다.\n1시간 30분 이내로 무료 출차 가능합니다." }
        ]
      },
      {
        icon: "subway", title: "지하철",
        items: [
          { label: "7호선 신풍역", text: "4번 출구 이용 (도보 1분)" }
        ]
      },
      {
        icon: "bus", title: "버스",
        items: [
          { label: "신풍역4번출구.베뉴비안\n(19241 썬프라자 방면)", text: "5620, 6713, 5713, 6512, 5625, 5616, 6411, 영등포07" },
          { label: "신풍역3번출구\n(19219 래미안에스티움 방면)", text: "654, 영등포13, 6516, 영등포01, 6633, 5" }
        ]
      }
    ]
  },

  // ── 인사말 ──
  greeting: {
    title: "",
    content: "<span class='hl'>정</span>해진 운명처럼 서로를\n알아본 봄날, <span class='hl'>진</span>심을 다해\n사랑할 단 한 사람을\n만났습니다. <span class='hl'>우</span>연이 겹쳐\n필연이 된 우리의 인연이 <span class='hl'>배</span>려와\n믿음 속에서 단단하게 뿌리내렸습니다.\n<span class='hl'>진</span>실한 마음으로 서로의\n버팀목이 되어주며 <span class='hl'>아</span>름다운 동행을\n시작하려 합니다. 귀한 걸음 하시어\n저희의 새로운 시작을\n축복해 주시면 감사하겠습니다!"
  },

  // ── 오시는 길 ──
  // (mapLinks는 wedding 객체 내에 포함)

  // ── 마음 전하실 곳 ──
  accounts: {
    groom: [
      { role: "신랑", name: "정진우", bank: "기업은행", number: "572-079955-01-017" },
      { role: "아버지", name: "정재우", bank: "케이뱅크", number: "100-125-953855" },
      { role: "어머니", name: "박성아", bank: "하나은행", number: "621-910526-05807" }
    ],
    bride: [
      { role: "신부", name: "배진아", bank: "기업은행", number: "143-121844-01-011" },
      { role: "아버지", name: "배은병", bank: "기업은행", number: "000-000-000000" },
      { role: "어머니", name: "이은자", bank: "농협은행", number: "000-000-000000" }
    ]
  },

  // ── 참석 의사 전달 (RSVP) ──
  // 팝업에서 "체크 완료하기"를 누르면 구글 스프레드시트로 전송됩니다.
  // scriptUrl: 구글 Apps Script 웹 앱 배포 주소 (https://script.google.com/macros/s/.../exec)
  //            설정 방법은 google-apps-script/rsvp.gs 맨 위 안내 참고. 비어 있으면 전송되지 않음.
  rsvp: {
    scriptUrl: "https://script.google.com/macros/s/AKfycbwoy4lzMyQU8JqiJrtGJvc_7KNwUn40NGHd78as2iaaBXchSVpsxrPanNSfwg5k-84C7w/exec"
  },

  // ── 방명록 (디지털 축하 화환 전시장) ──
  // scriptUrl: 구글 Apps Script 웹 앱 배포 주소 (설정 방법은 google-apps-script/guestbook.gs 맨 위 안내 참고)
  //            비어 있으면 화환이 그 기기 브라우저에만 저장됨 (다른 하객에게는 안 보임 — 테스트용)
  guestbook: {
    scriptUrl: "https://script.google.com/macros/s/AKfycbzbxrR0ALROBhxkAW-z3mkmYIAwiYjBDH8mQbSthtP9Rk6H1fMGpr-s2LI9Ae7dyfEL/exec"
  },

  // ── 링크 공유 시 나타나는 문구 ──
  meta: {
    title: "진우 🤍 진아 결혼합니다.",
    description: "2026년 12월 5일, 소중한 분들을 초대합니다."
  },

  // ── 사이드 메뉴 하단 "카카오톡 공유하기" / "사이트 링크 복사" ──
  // siteUrl   : 공유·복사할 청첩장 주소 (깃허브에 올린 주소, 예: "https://아이디.github.io/wedding/")
  //             비어 있으면 지금 열려 있는 페이지 주소를 씀
  // kakaoJsKey: 카카오 개발자(developers.kakao.com) → 내 애플리케이션 → 앱 키 → "JavaScript 키"
  //             (플랫폼 → Web → 사이트 도메인에 청첩장 주소를 등록해야 동작)
  //             비어 있으면 휴대폰 기본 공유 창(카카오톡 선택 가능)을 띄우고, 그것도 없으면 링크를 복사함
  //             공유 카드에는 위 meta의 제목·설명과 images/og/1.jpg 사진이 들어감
  share: {
    siteUrl: "https://jinu-jina.github.io/wedding/",
    kakaoJsKey: "c3039678e942d31e6a53de9fb4971944"
  }
};

/* ============================================================
   인트로 — 두 개의 그라데이션 원 설정 (Greeting 섹션 맨 위)
   ============================================================ */
window.CIRCLE_INTRO = {

  /* ---------- 스크롤 인터랙션 ----------
     제목 줄(A)이 있는 원 박스가 화면 상단에 고정(position: sticky)된 채로, 스크롤에 따라
     아래 원만 위로 올라오며 위쪽 원과 합쳐지고, 그와 함께 bg_01(C)이 올라와 원 영역을 덮다가
     A 밑으로 사라집니다. 스크롤을 반대로 올리면 역순으로 되감깁니다.
     (병합 스크롤 거리는 layout 값으로 자동 계산되어 별도 설정이 없습니다) */

  /* ---------- 크기 / 배치 (전부 px 고정값 — 화면 크기와 무관하게 항상 동일) ---------- */
  layout: {
    width: 490,            // 전체 가로 길이(px)
    height: 840,           // 전체 세로 길이(px)
    top: 170,              // 상단 문구("소중한 분들을...") 영역 높이(px) — 이 아래부터 원이 시작됨
    bottom: 20,            // 맨 아래 여백(px)
    circleRadius: 130,     // 원 반지름(px) — 커질수록 top/bottom을 줄여야 원이 안 잘립니다
    headingFontSize: 30,   // 상단 문구 글자 크기(px)
    headingPaddingX: 40,   // 상단 문구 좌우 여백(px)
    headingOffsetY: 70      // 상단 문구를 위아래로 이동(px, +값=아래로) — 원 위치/크기에는 영향 없음
  },

  /* ---------- 원 안에 그려지는 문구 ----------
     (상단 "소중한 분들을 초대합니다." 문구는 index.html 에서 직접 수정) */
  text: {
    top:    '정재우 · 박성아의 아들',   // 위쪽 원 중앙
    bottom: '배은병 · 이은자의 딸',     // 아래쪽 원 중앙
    center: '정진우 ♥ 배진아',           // 원이 겹쳤을 때 중앙
    serifFont: '"ZenSerifKR", serif',   // ZEN SERIF Regular
    serifWeight: 400
  },

  /* ---------- 색상 (팬톤 3색 기준) ---------- */
  palette: {
    cream: '#f7e7c8',   // PANTONE P 7-9 U
    blue:  '#b9ccde',   // PANTONE P 109-10 U
    plum:  '#4e434c',   // PANTONE P 101-16 U

    /* 그라데이션 — [색] + 아래 alpha(진하기) */
    base:        '#b9ccde',   // 바탕 (블루)
    haloBig:     '#b9ccde',   // 가운데 큰 번짐
    haloCore:    '#90b2dd',   // 가운데 진한 코어 (플럼)
    topLeft:     '#f7e7c8',   // 좌상단 (크림)
    topRight:    '#4e434c',   // 우상단 (연한 블루)
    bottomLeft:  '#f7e7c8',   // 좌하단 (크림)
    bottomRight: '#4e434c',   // 우하단 (진한 블루)
    alpha: { haloBig: .85, haloCore: .90, topLeft: .90, topRight: .5, bottomLeft: .8, bottomRight: .55, wash: .08 },

    textRGB: '78,67,76',          // 합쳐졌을 때 가운데 문구(흰색) 뒤의 약한 그림자 색
    parentTextRGB: '88,84,86',    // 위·아래 원 문구 색 — 원본 "FoRm LoGic" 글자색 rgba(88,84,86,.66)
    parentTextAlpha: 0.66
  }
};
