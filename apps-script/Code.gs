// 실험 데이터 저장 서버 (Google Apps Script 웹 앱)
// 구글 시트의 [확장 프로그램 > Apps Script]에 이 파일 내용을 그대로 붙여 넣고 웹 앱으로 배포한다.
// 시트 탭(participants, tasks, surveys)은 처음 요청이 들어올 때 자동으로 만들어진다.

// 관리자 페이지 비밀번호. 반드시 바꾼 뒤 배포할 것.
const ADMIN_KEY = "여기에_관리자_비밀번호";

const N_CELLS = 8;            // 배정 칸 수 (부록 표 3)
const TARGET_PER_CELL = 3;    // 칸별 목표 인원
const STALE_MIN = 60;         // 시작 후 이 시간(분)이 지나도 끝나지 않으면 배정 인원에서 뺀다

const HEAD = {
  participants: ["pid", "token", "pilot", "cell", "status", "started_at", "finished_at", "total_sec",
    "browser", "window_w", "window_h", "age", "gender", "web_freq", "ai_freq",
    "excluded", "exclude_reason", "note", "pilot_feedback"],
  tasks: ["key", "pid", "pilot", "cell", "position", "condition", "service", "task", "result", "answer",
    "tct_sec", "tct_censored", "event", "ten", "min_ten", "event_eff", "back", "non_interactive_clicks",
    "max_scroll_pct", "tab_leaves", "tab_hidden_sec", "exclude_tab", "window_w", "window_h", "saved_at", "events"],
  surveys: ["key", "pid", "pilot", "kind", "position", "condition", "service", "quiz1", "quiz2", "quiz3",
    "quiz_total", "sus_items", "sus_score", "ai_rating", "open1", "open2", "saved_at"]
};

function doGet() { return out({ ok: true, msg: "실험 서버가 동작 중입니다." }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: "잘못된 요청" }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return out(Object.assign({ ok: true }, handle(req))); }
  catch (err) { return out({ ok: false, error: String(err && err.message || err) }); }
  finally { lock.releaseLock(); }
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function handle(req) {
  const a = req.action;
  if (a === "ping") return {};
  if (a === "start") return start(req);
  if (a.indexOf("admin_") === 0) {
    if (String(req.key).trim() !== String(ADMIN_KEY).trim() || String(ADMIN_KEY) === "여기에_관리자_비밀번호") throw new Error("관리자 비밀번호가 맞지 않습니다.");
    if (a === "admin_data") return { participants: clean(readAll("participants")), tasks: clean(readAll("tasks")), surveys: clean(readAll("surveys")), target: TARGET_PER_CELL, cells: N_CELLS };
    if (a === "admin_update") return adminUpdate(req);
    if (a === "admin_delete_pilot") return deletePilot();
    throw new Error("알 수 없는 관리자 요청");
  }
  // 이하 참가자 요청: pid와 token이 맞아야 기록한다
  const p = findParticipant(req.pid);
  if (!p || String(p.token) !== String(req.token)) throw new Error("참가자 정보가 맞지 않습니다.");
  const now = new Date().toISOString();
  if (a === "pre") { updateRow("participants", p._row, pick(req.data, ["age", "gender", "web_freq", "ai_freq"])); return {}; }
  if (a === "task") { const r = req.data; r.key = [p.pid, r.position, r.task].join("|"); r.pid = p.pid; r.pilot = p.pilot; r.cell = p.cell; r.saved_at = now; upsert("tasks", r); return {}; }
  if (a === "survey") { const r = req.data; r.key = [p.pid, r.kind, r.position || 0].join("|"); r.pid = p.pid; r.pilot = p.pilot; r.saved_at = now; upsert("surveys", r); return {}; }
  if (a === "finish") {
    updateRow("participants", p._row, { status: "완료", finished_at: now, total_sec: req.data.total_sec, pilot_feedback: req.data.pilot_feedback || "" });
    return {};
  }
  if (a === "abort") {
    if (p.status !== "완료") updateRow("participants", p._row, { status: "중단", note: appendNote(p.note, req.data && req.data.reason) });
    return {};
  }
  throw new Error("알 수 없는 요청");
}

function start(req) {
  const parts = readAll("participants");
  const same = parts.find(function (p) { return String(p.token) === String(req.token); });
  if (same) return { pid: same.pid, cell: Number(same.cell) };
  const pilot = req.pilot ? 1 : 0;
  const group = parts.filter(function (p) { return truthy(p.pilot) === !!pilot; });
  const pid = (pilot ? "X" : "P") + ("0" + (group.length + 1)).slice(-2);
  let cell;
  if (pilot) cell = (req.cell >= 1 && req.cell <= N_CELLS) ? Number(req.cell) : (group.length % N_CELLS) + 1;
  else cell = assignCell(parts);
  const row = { pid: pid, token: req.token, pilot: pilot, cell: cell, status: "진행 중", started_at: new Date().toISOString(),
    browser: req.browser || "", window_w: req.window_w || "", window_h: req.window_h || "", excluded: 0 };
  sh("participants").appendRow(HEAD.participants.map(function (k) { return row[k] === undefined ? "" : row[k]; }));
  return { pid: pid, cell: cell };
}

// 제외되지 않은 본 실험 참가자 중 완료했거나 진행 중인 사람이 가장 적은 칸에 배정한다.
// 중단되거나 제외된 참가자의 자리는 비게 되어 같은 칸으로 다음 참가자가 들어간다.
function assignCell(parts) {
  const cnt = activeCounts(parts);
  let best = 1;
  for (let c = 2; c <= N_CELLS; c++) if (cnt[c] < cnt[best]) best = c;
  return best;
}
function activeCounts(parts) {
  const now = Date.now(); const cnt = [];
  for (let c = 0; c <= N_CELLS; c++) cnt.push(0);
  parts.forEach(function (p) {
    if (truthy(p.pilot) || truthy(p.excluded)) return;
    const fresh = p.status === "진행 중" && now - new Date(p.started_at).getTime() < STALE_MIN * 60000;
    if (p.status === "완료" || fresh) cnt[Number(p.cell)]++;
  });
  return cnt;
}

function adminUpdate(req) {
  const p = findParticipant(req.pid);
  if (!p) throw new Error("참가자를 찾을 수 없습니다.");
  updateRow("participants", p._row, pick(req.fields || {}, ["excluded", "exclude_reason", "note", "status"]));
  return {};
}

function deletePilot() {
  let n = 0;
  ["tasks", "surveys", "participants"].forEach(function (name) {
    const s = sh(name); const rows = readAll(name);
    for (let i = rows.length - 1; i >= 0; i--) if (truthy(rows[i].pilot)) { s.deleteRow(rows[i]._row); n++; }
  });
  return { deleted: n };
}

// ---------- 시트 도우미
function sh(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(HEAD[name]); s.setFrozenRows(1); }
  return s;
}
function readAll(name) {
  const v = sh(name).getDataRange().getValues();
  const h = v[0];
  return v.slice(1).map(function (r, i) { const o = { _row: i + 2 }; h.forEach(function (k, j) { o[k] = r[j]; }); return o; });
}
function clean(rows) { return rows.map(function (r) { const o = {}; Object.keys(r).forEach(function (k) { if (k !== "_row" && k !== "token") o[k] = r[k]; }); return o; }); }
function findParticipant(pid) { return readAll("participants").find(function (p) { return String(p.pid) === String(pid); }); }
function updateRow(name, rowNum, fields) {
  const s = sh(name); const h = HEAD[name];
  Object.keys(fields).forEach(function (k) { const j = h.indexOf(k); if (j >= 0) s.getRange(rowNum, j + 1).setValue(fields[k]); });
}
function upsert(name, obj) {
  const s = sh(name); const h = HEAD[name];
  const ex = readAll(name).find(function (r) { return String(r.key) === String(obj.key); });
  const line = h.map(function (k) { return obj[k] === undefined || obj[k] === null ? "" : obj[k]; });
  if (ex) s.getRange(ex._row, 1, 1, h.length).setValues([line]); else s.appendRow(line);
}
function pick(o, keys) { const r = {}; keys.forEach(function (k) { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; }
function truthy(v) { return v === 1 || v === true || v === "1" || v === "TRUE" || v === "true"; }
function appendNote(note, add) { return add ? (note ? note + " / " : "") + add : (note || ""); }
