/**
 * 참석 의사 체크(RSVP) → 구글 스프레드시트 저장용 Apps Script
 * 대상 시트: https://docs.google.com/spreadsheets/d/13QOyx9f3mnX3ajNHRUFBxkESB8MAZR5k85kRNLf8g1g
 *
 * ── 설치 방법 (한 번만) ──────────────────────────────────────────────
 * 1. 위 스프레드시트를 연다 → 메뉴 [확장 프로그램] → [Apps Script]
 * 2. 기본으로 있는 Code.gs 내용을 모두 지우고 이 파일 내용을 통째로 붙여넣고 저장(Ctrl+S)
 * 3. 위쪽 함수 선택 칸에서 setupSheet 를 고르고 [실행]
 *      → 처음엔 권한 승인 창이 뜸: 내 구글 계정 선택 → "고급" → "(안전하지 않음)으로 이동" → 허용
 *      → 시트에 없는 칸(식사 여부 등)이 추가되고 드롭다운·통계 수식이 정리됨 (아래 "정리 내용")
 * 4. 오른쪽 위 [배포] → [새 배포] → 톱니바퀴(유형 선택)에서 [웹 앱]
 *      - 다음 사용자 인증 정보로 실행: 나
 *      - 액세스 권한이 있는 사용자: 모든 사용자
 *    → [배포]
 * 5. 나오는 "웹 앱 URL"(https://script.google.com/macros/s/.../exec)을 복사해서
 *    청첩장 config.js 의 rsvp.scriptUrl 에 붙여넣기
 *
 * ※ 이 코드를 나중에 고쳤다면 [배포] → [배포 관리] → 연필(수정) → 버전 "새 버전" → [배포]
 *   해야 반영됩니다. (새 배포를 만들면 URL이 바뀌니 주의)
 *
 * ── 정리 내용 (setupSheet, 여러 번 실행해도 안전) ────────────────────
 * - "식사 여부" 열이 없으면 참석인원 바로 오른쪽(H열)에 새로 끼워 넣음
 *     → 예정 정보(성함~식사 여부)와 당일 기록(실 참석 여부·인원)이 나뉘어 보이도록
 *     → 오른쪽 열과 통계 표는 한 칸씩 오른쪽으로 밀림 (기존 수식은 시트가 자동으로 맞춰 줌)
 * - 드롭다운: 참석 여부(참석/미참석), 신랑측/신부측, 식사 여부(예정/안함)
 *     → 이미 드롭다운이 있고 위 값이 다 들어 있으면 손대지 않음 (칩 모양 유지)
 * - 오른쪽 통계 표: setupStats 와 같음 (아래 "통계 표" 참고. 통계 표만 정리하려면 setupStats 만 실행)
 *
 * ── 응답이 들어가는 위치 ─────────────────────────────────────────────
 *   3행부터, 성함 칸이 비어 있는 첫 줄
 *   번호 | 성함 | 참석 여부 | 신랑측/신부측 | 구분 | 참석인원(본인포함) | 식사 여부
 *   (미참석이면 참석인원 0, 식사 여부 빈칸 / 실 참석 여부·인원은 당일 직접 입력하는 칸이라 건드리지 않음)
 */

const SHEET_NAME = '';      // 비우면 첫 번째 시트. 탭 이름이 따로 있으면 적기 (예: '시트1')
const HEADER_ROW = 2;       // 제목 줄
const START_ROW = 3;        // 데이터 시작 줄

const H = {                 // 제목 줄 글자 (이 글자로 열 위치를 찾음)
  no: '번호',
  name: '성함',
  attend: '참석 여부',
  side: '신랑측/신부측',
  group: '구분',
  count: '참석인원(본인포함)',
  meal: '식사 여부',
  realAttend: '실 참석 여부',
  realCount: '실 참석 인원',
  stats: '통계'
};

const LISTS = {
  attend: ['참석', '미참석'],
  side: ['신랑측', '신부측'],
  meal: ['예정', '안함']
};

// 통계 표의 그룹 = 팝업의 구분 버튼 그대로. 그 외(직접입력)는 기타 = 총 인원 - (가족 + 친구 + 직장 + 동기)
const GROUP_ITEMS = ['가족', '친구', '직장', '동기'];

const T = {                 // 통계 표 제목 (R열에서 이 글자로 표 위치를 찾음)
  expected: '예상 하객 수',
  groom: '예상 그룹 별 하객 수 - 지누',
  bride: '예상 그룹 별 하객 수 - 지나',
  real: '실제 하객 수'
};

/* ═════════════════════ 응답 받기 ═════════════════════ */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);     // 동시에 여러 명이 보내도 같은 줄에 겹쳐 쓰지 않도록
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (d.website) return json_({ ok: true });              // 스팸 봇(숨김 칸을 채움)은 저장하지 않음

    const name = clean_(d.name, 30);
    const side = oneOf_(d.side, LISTS.side);
    const attend = oneOf_(d.attend, LISTS.attend);
    const group = clean_(d.group, 20);
    if (!name || !side || !attend || !group) return json_({ ok: false, error: 'invalid' });

    const attending = attend === '참석';
    const count = attending ? Math.min(20, Math.max(1, parseInt(d.count, 10) || 1)) : 0;
    const meal = attending ? oneOf_(d.meal, LISTS.meal) : '';

    const sheet = getSheet_();
    const cols = ensureColumns_(sheet);                    // 식사 여부 열이 없으면 이때 추가
    const row = nextEmptyRow_(sheet, cols.name);

    // 구분 칸은 직접입력 값도 들어오므로 드롭다운 규칙이 있으면 지움 (규칙 위반으로 저장이 실패하지 않게)
    sheet.getRange(row, cols.group).clearDataValidations();

    const values = { no: row - START_ROW + 1, name, attend, side, group, count, meal };
    Object.keys(values).forEach((k) => sheet.getRange(row, cols[k]).setValue(values[k]));

    return json_({ ok: true, row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// 배포 주소를 브라우저로 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, message: 'RSVP endpoint is running' });
}

/* ═════════════════════ 시트 정리 (편집기에서 실행) ═════════════════════ */

function setupSheet() {
  const sheet = getSheet_();
  const cols = ensureColumns_(sheet);
  ensureDropdowns_(sheet, cols);
  setupStats();
  SpreadsheetApp.flush();
  Logger.log('정리 완료: ' + JSON.stringify(cols));
}

// 제목 줄에서 각 열 위치 찾기. "식사 여부"가 없으면 참석인원 오른쪽에 새 열을 끼워 넣음
function ensureColumns_(sheet) {
  let cols = findColumns_(sheet);
  if (!cols.meal) {
    if (!cols.count) throw new Error('제목 줄(' + HEADER_ROW + '행)에서 "' + H.count + '" 칸을 찾을 수 없습니다');
    sheet.insertColumnAfter(cols.count);                   // 서식은 왼쪽 열(참석인원)을 따라감
    sheet.getRange(HEADER_ROW, cols.count + 1).setValue(H.meal);
    sheet.getRange(START_ROW, cols.count + 1, sheet.getMaxRows() - START_ROW + 1, 1).clearDataValidations();
    cols = findColumns_(sheet);
  }
  ['no', 'name', 'attend', 'side', 'group', 'count', 'meal'].forEach((k) => {
    if (!cols[k]) throw new Error('제목 줄(' + HEADER_ROW + '행)에서 "' + H[k] + '" 칸을 찾을 수 없습니다');
  });
  return cols;
}

function findColumns_(sheet) {
  const header = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map((v) => String(v).trim());
  const cols = {};
  Object.keys(H).forEach((k) => {
    const i = header.indexOf(H[k]);
    if (i >= 0) cols[k] = i + 1;
  });
  return cols;
}

// 드롭다운: 없거나, 있어도 필요한 값이 빠져 있을 때만 새로 설정 (기존 칩 모양 최대한 유지)
function ensureDropdowns_(sheet, cols) {
  const rows = sheet.getMaxRows() - START_ROW + 1;
  ['attend', 'side', 'meal'].forEach((k) => {
    const range = sheet.getRange(START_ROW, cols[k], rows, 1);
    const rule = sheet.getRange(START_ROW, cols[k]).getDataValidation();
    const ok = rule &&
      rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST &&
      LISTS[k].every((v) => rule.getCriteriaValues()[0].indexOf(v) >= 0);
    if (ok) return;
    range.setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(LISTS[k], true).setAllowInvalid(false).build()
    );
  });
}

/* ═════════════════════ 통계 표 (편집기에서 setupStats 실행) ═════════════════════
 * - 예상 하객 수: 지누 = 신랑측 참석인원 합, 지나 = 신부측 참석인원 합, 총 인원 = 지누 + 지나
 *   (참석 여부가 "참석"인 줄의 참석인원(본인포함)을 더함)
 * - 예상 그룹 별 하객 수(지누/지나): 가족 / 친구 / 직장 / 동기 / 기타(직접입력) / 총 인원
 *   → 예전 표(지인/친척/부모님 지인/기타)면 서식을 그대로 살려 한 줄 늘린 새 표로 바꿈 (처음 한 번만)
 * - 실제 하객 수 표는 건드리지 않음
 * 여러 번 실행해도 안전 (표 모양은 한 번만 바뀌고, 수식은 매번 다시 넣음)
 */
function setupStats() {
  const sheet = getSheet_();
  const cols = ensureColumns_(sheet);
  if (!cols.stats) throw new Error('제목 줄(' + HEADER_ROW + '행)에서 "' + H.stats + '" 칸을 찾을 수 없습니다');
  const labelCol = cols.stats;
  const valueCol = labelCol + 1;

  const findRow = (text) => {
    const labels = sheet.getRange(START_ROW, labelCol, sheet.getLastRow() - START_ROW + 1, 1).getValues();
    for (let i = 0; i < labels.length; i++) if (String(labels[i][0]).trim() === text) return START_ROW + i;
    return 0;
  };
  const exp = findRow(T.expected);
  const gHead = findRow(T.groom);
  const real = findRow(T.real);
  if (!exp || !gHead) throw new Error('"' + T.expected + '" 또는 "' + T.groom + '" 표 제목을 찾을 수 없습니다');

  const items = GROUP_ITEMS.concat(['기타', '총 인원']);
  const bHead = gHead + items.length + 2;                  // 지누 표 아래 빈 줄 1개 다음
  const end = bHead + items.length;
  if (real && end >= real) throw new Error('그룹 표가 "' + T.real + '" 표와 겹칩니다');

  if (String(sheet.getRange(gHead + 1, labelCol).getValue()).trim() !== items[0]) {
    relayoutGroupTables_(sheet, labelCol, gHead, bHead, end, items.length);
  }

  const L = (k) => colLetter_(cols[k]);
  const rng = (k) => '$' + L(k) + '$' + START_ROW + ':$' + L(k);
  const sum = (side, group) => '=SUMIFS(' + rng('count') + ',' + rng('side') + ',"' + side + '",' +
    rng('attend') + ',"참석"' + (group ? ',' + rng('group') + ',"' + group + '"' : '') + ')';
  const S = (row) => colLetter_(valueCol) + row;
  const setRow = (row, label, formula) => {
    sheet.getRange(row, labelCol).setValue(label);
    sheet.getRange(row, valueCol).setFormula(formula);
  };

  // 예상 하객 수
  setRow(exp + 1, '지누', sum('신랑측'));
  setRow(exp + 2, '지나', sum('신부측'));
  setRow(exp + 3, '총 인원', '=' + S(exp + 1) + '+' + S(exp + 2));

  // 예상 그룹 별 하객 수
  [[gHead, '신랑측', T.groom], [bHead, '신부측', T.bride]].forEach(([h, side, title]) => {
    sheet.getRange(h, labelCol).setValue(title);
    const first = h + 1;
    const total = h + items.length;
    items.forEach((label, i) => {
      const row = first + i;
      const formula =
        label === '총 인원' ? sum(side) :
        label === '기타' ? '=' + S(total) + '-SUM(' + S(first) + ':' + S(first + GROUP_ITEMS.length - 1) + ')' :
        sum(side, label);
      setRow(row, label, formula);
    });
  });
  SpreadsheetApp.flush();
  Logger.log('통계 표 정리 완료');
}

// 예전 그룹 표(제목 + 지인/친척/부모님 지인/기타/총 인원 = 6줄)의 서식을 본떠서
// 새 그룹 표 2개(제목 + 6항목 = 7줄씩, 사이 빈 줄 1개)를 다시 그림
function relayoutGroupTables_(sheet, labelCol, gHead, bHead, end, n) {
  const oldLast = gHead + 5;
  if (String(sheet.getRange(oldLast, labelCol).getValue()).trim() !== '총 인원') {
    throw new Error('예전 그룹 표 모양이 예상과 달라서 자동으로 바꾸지 않았습니다 (' + oldLast + '행이 "총 인원"이 아님)');
  }
  const paste = SpreadsheetApp.CopyPasteType.PASTE_FORMAT;

  // 서식 견본(제목 줄 / 가운데 항목 줄 / 맨 아래 줄)을 시트 오른쪽 끝 임시 열에 보관
  const maxC = sheet.getMaxColumns();
  sheet.insertColumnsAfter(maxC, 2);
  const sample = (r) => sheet.getRange(r, maxC + 1, 1, 2);
  sheet.getRange(gHead, labelCol, 1, 2).copyTo(sample(1), paste, false);
  sheet.getRange(gHead + 2, labelCol, 1, 2).copyTo(sample(2), paste, false);
  sheet.getRange(oldLast, labelCol, 1, 2).copyTo(sample(3), paste, false);
  const headMerged = sheet.getRange(gHead, labelCol).isPartOfMerge();

  const area = sheet.getRange(gHead, labelCol, end - gHead + 1, 2);
  area.breakApart();
  area.clear();

  [gHead, bHead].forEach((h) => {
    const head = sheet.getRange(h, labelCol, 1, 2);
    sample(1).copyTo(head, paste, false);
    if (headMerged) head.merge();
    for (let i = 1; i < n; i++) sample(2).copyTo(sheet.getRange(h + i, labelCol, 1, 2), paste, false);
    sample(3).copyTo(sheet.getRange(h + n, labelCol, 1, 2), paste, false);
  });

  sheet.deleteColumns(maxC + 1, 2);
}

/* ═════════════════════ 도우미 ═════════════════════ */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return (SHEET_NAME && ss.getSheetByName(SHEET_NAME)) || ss.getSheets()[0];
}

// 성함 칸이 비어 있는 첫 줄 (통계 표가 옆에 있어서 appendRow 대신 직접 찾음)
function nextEmptyRow_(sheet, nameCol) {
  const last = Math.max(sheet.getMaxRows(), START_ROW);
  const names = sheet.getRange(START_ROW, nameCol, last - START_ROW + 1, 1).getValues();
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim() === '') return START_ROW + i;
  }
  sheet.insertRowAfter(last);
  return last + 1;
}

// 글자 정리: 길이 제한 + 수식으로 해석되지 않게(=, +, -, @로 시작하면 앞에 ' 추가)
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function oneOf_(v, list) {
  return list.indexOf(v) >= 0 ? v : '';
}

function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
