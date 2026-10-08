/**
 * 방명록(디지털 축하 화환) → 구글 스프레드시트 저장용 Apps Script
 * 모든 하객이 같은 화환 목록을 보려면 이 스크립트가 필요합니다.
 * (config.js 의 guestbook.scriptUrl 이 비어 있으면 화환이 그 기기 브라우저에만 저장됨 — 테스트용)
 *
 * ── 설치 방법 (한 번만) ──────────────────────────────────────────────
 * 1. 구글 드라이브에서 새 스프레드시트를 만든다 (이름 예: "청첩장 방명록")
 *    → 메뉴 [확장 프로그램] → [Apps Script]
 * 2. 기본으로 있는 Code.gs 내용을 모두 지우고 이 파일 내용을 통째로 붙여넣고 저장(Ctrl+S)
 * 3. 위쪽 함수 선택 칸에서 setupSheet 를 고르고 [실행]
 *      → 처음엔 권한 승인 창이 뜸: 내 구글 계정 선택 → "고급" → "(안전하지 않음)으로 이동" → 허용
 *      → 첫 번째 시트에 제목 줄이 만들어짐
 * 4. 오른쪽 위 [배포] → [새 배포] → 톱니바퀴(유형 선택)에서 [웹 앱]
 *      - 다음 사용자 인증 정보로 실행: 나
 *      - 액세스 권한이 있는 사용자: 모든 사용자
 *    → [배포]
 * 5. 나오는 "웹 앱 URL"(https://script.google.com/macros/s/.../exec)을 복사해서
 *    청첩장 config.js 의 guestbook.scriptUrl 에 붙여넣기
 *
 * ※ 이 코드를 나중에 고쳤다면 [배포] → [배포 관리] → 연필(수정) → 버전 "새 버전" → [배포]
 *   해야 반영됩니다. (새 배포를 만들면 URL이 바뀌니 주의)
 *
 * ── 저장 형식 ────────────────────────────────────────────────────────
 *   2행부터 한 줄에 화환 하나
 *   ID | 작성 시각 | 상단 리본 | 글씨 리본 | 꽃 | 좌측 문구 | 우측 문구 | 비밀번호(암호화) | 수정 시각
 *   - 비밀번호는 그대로 저장하지 않고 암호화(해시)해서 저장 → 시트를 봐도 원래 비밀번호는 알 수 없음
 *   - 화환을 지우고 싶으면 시트에서 그 줄을 삭제해도 됨
 *   - 관리자 비밀번호(MASTER_PASSWORD)는 이 서버 코드에만 있고 청첩장 웹페이지에는 노출되지 않음
 */

const MASTER_PASSWORD = 'master_1205bae';   // 관리자: 모든 화환 수정·삭제 가능
const SHEET_NAME = '';                      // 비우면 첫 번째 시트
const HEADER = ['ID', '작성 시각', '상단 리본', '글씨 리본', '꽃', '좌측 문구', '우측 문구', '비밀번호(암호화)', '수정 시각'];
const COL = { id: 1, created: 2, ribbon: 3, belt: 4, flower: 5, left: 6, right: 7, hash: 8, updated: 9 };

// 웹페이지에서 고를 수 있는 이미지 이름 (images/guestbook/ 폴더의 파일명과 같아야 함)
const PARTS = {
  ribbon: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11'],
  belt: ['b_green', 'b_orange', 'b_pink', 'b_red', 'b_violet', 'b_blue', 'b_yellow'],
  flower: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7']
};
const TEXT_MAX = 30;
const PASSWORD_MAX = 50;

/* ═════════════════════ 요청 받기 ═════════════════════ */

// 목록 보기 (브라우저로 배포 주소를 열어도 확인 가능)
function doGet() {
  return json_({ ok: true, items: listItems_() });
}

// 작성 / 확인 / 수정 / 삭제
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (d.action === 'list') return json_({ ok: true, items: listItems_() });

    if (d.action === 'create') {
      const item = readItem_(d);
      const password = String(d.password || '').slice(0, PASSWORD_MAX);
      if (!item || !password) return json_({ ok: false, error: 'invalid' });
      const sheet = getSheet_();
      const id = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
      const now = new Date();
      sheet.appendRow([id, now, item.ribbon, item.belt, item.flower, item.left, item.right, hash_(id, password), '']);
      return json_({ ok: true, item: Object.assign({ id: id, createdAt: now.getTime() }, unescape_(item)) });
    }

    // 아래는 모두 비밀번호(작성자 또는 관리자)가 맞아야 함
    const found = findRow_(String(d.id || ''));
    if (!found) return json_({ ok: false, error: 'notfound' });
    const auth = String(d.auth || '');
    const isMaster = auth === MASTER_PASSWORD;
    if (!isMaster && hash_(found.id, auth) !== found.hash) return json_({ ok: false, error: 'password' });

    if (d.action === 'verify') return json_({ ok: true });

    if (d.action === 'update') {
      const item = readItem_(d);
      if (!item) return json_({ ok: false, error: 'invalid' });
      const sheet = getSheet_();
      sheet.getRange(found.row, COL.ribbon, 1, 5).setValues([[item.ribbon, item.belt, item.flower, item.left, item.right]]);
      // 새 비밀번호: 관리자 비밀번호로 들어와서 그대로 저장하면 작성자 비밀번호를 유지
      const password = String(d.password || '').slice(0, PASSWORD_MAX);
      if (password && password !== MASTER_PASSWORD) sheet.getRange(found.row, COL.hash).setValue(hash_(found.id, password));
      sheet.getRange(found.row, COL.updated).setValue(new Date());
      return json_({ ok: true });
    }

    if (d.action === 'delete') {
      getSheet_().deleteRow(found.row);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/* ═════════════════════ 시트 준비 (편집기에서 실행) ═════════════════════ */

function setupSheet() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange('F:G').setNumberFormat('@');               // 문구는 글자 그대로 (숫자·날짜로 바뀌지 않게)
  SpreadsheetApp.flush();
  Logger.log('정리 완료');
}

/* ═════════════════════ 도우미 ═════════════════════ */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return (SHEET_NAME && ss.getSheetByName(SHEET_NAME)) || ss.getSheets()[0];
}

function rows_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADER.length).getValues();
}

// 최신 화환이 앞(전시장 맨 왼쪽)에 오도록 작성 시각 역순
function listItems_() {
  return rows_()
    .filter((r) => r[COL.id - 1])
    .map((r) => unescape_({
      id: String(r[COL.id - 1]),
      createdAt: r[COL.created - 1] instanceof Date ? r[COL.created - 1].getTime() : 0,
      ribbon: String(r[COL.ribbon - 1]),
      belt: String(r[COL.belt - 1]),
      flower: String(r[COL.flower - 1]),
      left: String(r[COL.left - 1]),
      right: String(r[COL.right - 1])
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function findRow_(id) {
  if (!id) return null;
  const rows = rows_();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.id - 1]) === id) return { row: i + 2, id: id, hash: String(rows[i][COL.hash - 1]) };
  }
  return null;
}

function readItem_(d) {
  const ribbon = oneOf_(d.ribbon, PARTS.ribbon);
  const belt = oneOf_(d.belt, PARTS.belt);
  const flower = oneOf_(d.flower, PARTS.flower);
  const left = clean_(d.left, TEXT_MAX);
  const right = clean_(d.right, TEXT_MAX);
  if (!ribbon || !belt || !flower || !left || !right) return null;
  return { ribbon: ribbon, belt: belt, flower: flower, left: left, right: right };
}

// 글자 정리: 길이 제한 + 수식으로 해석되지 않게(=, +, -, @로 시작하면 앞에 ' 추가)
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// clean_에서 붙인 ' 를 웹페이지로 보낼 때 다시 뗌
function unescape_(item) {
  ['left', 'right'].forEach((k) => {
    if (/^'[=+\-@]/.test(item[k])) item[k] = item[k].slice(1);
  });
  return item;
}

function oneOf_(v, list) {
  return list.indexOf(v) >= 0 ? v : '';
}

// 비밀번호 암호화: 화환 ID를 섞어서 SHA-256
function hash_(id, password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, id + ':' + password, Utilities.Charset.UTF_8);
  return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
