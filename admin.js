// 실험 관리자 페이지: 서버(Apps Script)에서 데이터를 읽어 현황, 요약, 파일럿 점검, 내려받기를 보여 준다.
(function () {
  const C = window.CONFIG;
  const KKEY = "exp_admin_key";
  const STALE_MIN = 60;
  const CONDS = ["AG", "AS", "HG", "HS"];
  const TASKS = ["T1", "T2", "T3"];
  const SVC = { schedule: "일정 관리", inventory: "재고 관리", accounting: "회계 자동화", support: "고객 응대" };
  const WILLIAMS = ["AG-AS-HS-HG", "AS-HG-AG-HS", "HG-HS-AS-AG", "HS-AG-HG-AS"];
  let key = "", D = null;

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const truthy = (v) => v === 1 || v === true || v === "1" || v === "TRUE" || v === "true";
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
  const median = (a) => { if (!a.length) return NaN; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const max = (a) => (a.length ? Math.max(...a) : NaN);
  const pct = (x) => (isNaN(x) ? "-" : (x * 100).toFixed(0) + "%");
  const f1 = (x) => (isNaN(x) ? "-" : x.toFixed(1));
  const ok = (t) => String(t.result) === "1";
  const fmtTime = (v) => { if (!v) return ""; const d = new Date(v); return isNaN(d) ? String(v) : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  async function api(body) {
    if (!C.ENDPOINT) throw new Error("config.js에 서버 주소(ENDPOINT)가 없습니다.");
    const r = await fetch(C.ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ key }, body)) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    return j;
  }

  // ---------- 로그인
  async function login(k) {
    key = k; $("#lmsg").textContent = "불러오는 중...";
    try {
      await load();
      try { sessionStorage.setItem(KKEY, k); } catch (e) {}
      $("#login").style.display = "none"; $("#appwrap").style.display = "block";
    } catch (e) { $("#lmsg").textContent = e.message; }
  }
  $("#enter").addEventListener("click", () => login($("#key").value));
  $("#key").addEventListener("keydown", (e) => { if (e.key === "Enter") login($("#key").value); });
  try { const k = sessionStorage.getItem(KKEY); if (k) login(k); } catch (e) {}

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll("main section").forEach((s) => s.classList.toggle("on", s.id === "s-" + b.dataset.t));
  });
  $("#reload").addEventListener("click", () => load().catch((e) => alertMsg(e.message)));
  function alertMsg(m) { $("#updated").textContent = m; }

  async function load() {
    D = await api({ action: "admin_data" });
    D.participants.forEach((p) => { p.pilot = truthy(p.pilot); p.excluded = truthy(p.excluded); p.cell = +p.cell; });
    $("#updated").textContent = "갱신 " + fmtTime(new Date());
    render();
  }

  // ---------- 데이터 정리
  function stateOf(p) {
    if (p.status === "진행 중" && Date.now() - new Date(p.started_at).getTime() > STALE_MIN * 60000) return "old";
    return { "완료": "done", "진행 중": "run", "중단": "stop" }[p.status] || "stop";
  }
  const tagOf = (p) => ({ done: '<span class="tag t-done">완료</span>', run: '<span class="tag t-run">진행 중</span>', stop: '<span class="tag t-stop">중단</span>', old: '<span class="tag t-old">60분 넘게 미완료</span>' })[stateOf(p)];
  const pmap = () => Object.fromEntries(D.participants.map((p) => [p.pid, p]));
  // 분석 포함: 본 실험, 완료, 제외 안 됨, 탭 이탈 제외 아님
  function analysisTasks(pilot) {
    const P = pmap();
    return D.tasks.filter((t) => { const p = P[t.pid]; return p && p.pilot === pilot && (pilot || (p.status === "완료" && !p.excluded)) && String(t.exclude_tab) !== "1"; });
  }
  function analysisSurveys(pilot) {
    const P = pmap();
    return D.surveys.filter((s) => { const p = P[s.pid]; return p && p.pilot === pilot && (pilot || (p.status === "완료" && !p.excluded)); });
  }
  function counts() {
    const cnt = {}; for (let c = 1; c <= D.cells; c++) cnt[c] = { done: 0, run: 0 };
    D.participants.filter((p) => !p.pilot && !p.excluded).forEach((p) => { const s = stateOf(p); if (s === "done") cnt[p.cell].done++; if (s === "run") cnt[p.cell].run++; });
    return cnt;
  }

  function render() { renderStatus(); renderPeople(); renderSummary(); renderPilot(); renderDownload(); renderLinks(); }

  // ---------- 현황
  function renderStatus() {
    const main = D.participants.filter((p) => !p.pilot);
    const by = (s) => main.filter((p) => stateOf(p) === s && !p.excluded).length;
    const cnt = counts();
    let next = 1; for (let c = 2; c <= D.cells; c++) if (cnt[c].done + cnt[c].run < cnt[next].done + cnt[next].run) next = c;
    const target = D.target * D.cells;
    $("#s-status").innerHTML = `
      <h2>본 실험 현황</h2>
      <div class="cards">
        <div class="card"><div class="k">완료(제외 빼고)</div><div class="v">${by("done")} / ${target}</div></div>
        <div class="card"><div class="k">진행 중</div><div class="v">${by("run")}</div></div>
        <div class="card"><div class="k">중단, 미완료</div><div class="v">${by("stop") + by("old")}</div></div>
        <div class="card"><div class="k">제외 처리</div><div class="v">${main.filter((p) => p.excluded).length}</div></div>
        <div class="card"><div class="k">파일럿 참가자</div><div class="v">${D.participants.filter((p) => p.pilot).length}</div></div>
      </div>
      <h3>배정 칸별 인원(목표 ${D.target}명)</h3>
      <p class="note">다음 참가자는 완료와 진행 중 인원이 가장 적은 칸(파란 테두리)에 자동 배정됩니다. 중단되거나 제외 처리한 참가자의 자리는 비워져 같은 칸으로 다시 모집됩니다.</p>
      <table class="cellgrid"><tr><th>칸</th><th>조건 순서</th><th>서비스 순서</th><th>완료</th><th>진행 중</th><th>남은 자리</th></tr>
      ${Object.keys(cnt).map((c) => { const x = cnt[c]; const full = x.done >= D.target;
        return `<tr><td class="${full ? "full" : ""} ${+c === next && !full ? "next" : ""}">${c}</td><td>W${Math.ceil(c / 2)} (${WILLIAMS[Math.ceil(c / 2) - 1]})</td><td>${c % 2 ? "정방향" : "역방향"}</td><td>${x.done}</td><td>${x.run}</td><td>${Math.max(0, D.target - x.done - x.run)}</td></tr>`; }).join("")}
      </table>`;
  }

  // ---------- 참가자
  function renderPeople() {
    const rows = D.participants.slice().sort((a, b) => (a.pilot - b.pilot) || String(a.pid).localeCompare(String(b.pid)));
    const tcount = {}, tabx = {};
    D.tasks.forEach((t) => { tcount[t.pid] = (tcount[t.pid] || 0) + 1; if (String(t.exclude_tab) === "1") tabx[t.pid] = (tabx[t.pid] || 0) + 1; });
    $("#s-people").innerHTML = `
      <h2>참가자</h2>
      <p class="note">제외할 참가자는 체크하고 사유를 적은 뒤 저장하세요. 제외하면 결과 요약과 분석용 파일에서 빠지고, 그 칸에 한 명이 다시 배정됩니다. 탭 이탈 ${C.TAB_EXCLUDE_SEC}초 이상인 과업은 자동으로 분석에서 빠집니다.</p>
      <div class="scroll"><table>
        <tr><th>코드</th><th>구분</th><th>칸</th><th>상태</th><th>시작</th><th>소요(분)</th><th>과업 기록</th><th>탭 이탈 제외 과업</th><th>브라우저</th><th>창 크기</th><th>제외</th><th class="l">제외 사유(자동 기록)</th><th></th><th></th></tr>
        ${rows.map((p) => `<tr class="${p.excluded ? "ex" : ""}" data-pid="${esc(p.pid)}">
          <td><b>${esc(p.pid)}</b></td><td>${p.pilot ? "파일럿" : "본 실험"}</td><td>${p.cell}</td><td>${tagOf(p)}</td>
          <td>${fmtTime(p.started_at)}</td><td>${p.total_sec ? (p.total_sec / 60).toFixed(1) : ""}</td>
          <td>${tcount[p.pid] || 0}/12</td><td class="${tabx[p.pid] ? "flag" : ""}">${tabx[p.pid] || 0}</td>
          <td>${esc(p.browser)}</td><td>${esc(p.window_w)}×${esc(p.window_h)}</td>
          <td class="act"><input type="checkbox" class="exc" ${p.excluded ? "checked" : ""}></td>
          <td class="act l"><input type="text" class="rsn" value="${esc(p.exclude_reason || "")}" placeholder="제외 사유" style="width:200px">${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}</td>
          <td class="act"><button class="b sv">저장</button></td>
          <td class="act"><button class="b p dt">기록 보기</button></td></tr>`).join("")}
      </table></div>
      <div id="detail"></div>`;
    document.querySelectorAll("#s-people .dt").forEach((b) => b.addEventListener("click", () => showDetail(b.closest("tr").dataset.pid)));
    if (openPid) showDetail(openPid, true);
    document.querySelectorAll("#s-people .sv").forEach((b) => b.addEventListener("click", async () => {
      const tr = b.closest("tr"); b.textContent = "저장 중";
      try {
        await api({ action: "admin_update", pid: tr.dataset.pid, fields: { excluded: tr.querySelector(".exc").checked ? 1 : 0, exclude_reason: tr.querySelector(".rsn").value } });
        await load();
      } catch (e) { b.textContent = "실패"; alertMsg(e.message); }
    }));
  }

  // ---------- 참가자 한 명의 상세 기록
  let openPid = null;
  const SVCN = { schedule: "일정 관리", inventory: "재고 관리", accounting: "회계 자동화", support: "고객 응대" };
  const resTag = (r) => String(r) === "1" ? '<span class="tag t-done">정답</span>' : String(r) === "T" ? '<span class="tag t-old">시간 초과</span>' : '<span class="tag t-stop">오답</span>';
  function evText(t) {
    let ev = []; try { ev = JSON.parse(t.events || "[]"); } catch (e) {}
    if (!ev.length) return '<span class="note">조작 없음</span>';
    const name = { trial: "무료 체험", contact: "상담 문의", demo: "데모 신청" };
    return ev.map((e) => {
      const sec = (e.t / 1000).toFixed(1) + "초";
      if (e.type === "back") return `<span class="ev back">${sec} 뒤로 가기</span>`;
      if (e.type === "click-other") return `<span class="ev miss">${sec} 빈 곳 클릭</span>`;
      const tk = window.SERVICES[t.service] && window.SERVICES[t.service].tasks.find((x) => x.id === t.task);
      const tg = name[e.target] || (/^\d$/.test(String(e.target)) ? `보기 "${tk && tk.choices ? tk.choices[+e.target] : +e.target + 1}" 선택` : e.target);
      return `<span class="ev">${sec} ${esc(tg)}</span>`;
    }).join(" → ");
  }
  function showDetail(pid, keep) {
    openPid = pid;
    const p = D.participants.find((x) => x.pid === pid); if (!p) return;
    const T = D.tasks.filter((t) => t.pid === pid).sort((a, b) => a.position - b.position || String(a.task).localeCompare(String(b.task)));
    const S = D.surveys.filter((x) => x.pid === pid);
    const cond = (pos) => S.find((x) => x.kind === "condition" && +x.position === pos);
    const ai = (pos) => S.find((x) => x.kind === "ai" && +x.position === pos);
    const open = S.find((x) => x.kind === "open");
    const positions = [...new Set(T.map((t) => +t.position).concat(S.filter((x) => x.kind === "condition").map((x) => +x.position)))].sort();
    const ok = T.filter((t) => String(t.result) === "1").length;
    $("#detail").innerHTML = `
      <div class="detail">
        <div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(pid)} 상세 기록</h2><button class="b" id="dclose">닫기</button></div>
        <div class="cards">
          <div class="card"><div class="k">구분, 칸</div><div class="v" style="font-size:18px">${p.pilot ? "파일럿" : "본 실험"}, ${p.cell}칸</div></div>
          <div class="card"><div class="k">상태</div><div class="v" style="font-size:18px">${tagOf(p)}</div></div>
          <div class="card"><div class="k">소요 시간</div><div class="v" style="font-size:18px">${p.total_sec ? (p.total_sec / 60).toFixed(1) + "분" : "-"}</div></div>
          <div class="card"><div class="k">정답 과업</div><div class="v" style="font-size:18px">${ok} / ${T.length}</div></div>
          <div class="card"><div class="k">사전 질문</div><div class="v" style="font-size:13px;font-weight:600;line-height:1.6">${esc(p.age || "-")}, ${esc(p.gender || "-")}, ${esc(p.major || "-")}<br>UI 경험 ${esc(p.design_exp || "-")}, AI로 화면 제작 ${esc(p.genai_web_exp || "-")}, 요금제 비교 ${esc(p.plan_compare_exp || "-")}</div></div>
        </div>
        ${positions.map((pos) => {
          const tt = T.filter((t) => +t.position === pos); const c = cond(pos); const a = ai(pos);
          const condName = (tt[0] || c || {}).condition, svc = (tt[0] || c || {}).service;
          return `<h3>${pos}번째 페이지: ${esc(condName || "")} (${esc(SVCN[svc] || svc || "")})</h3>
            <table><tr><th>과업</th><th>결과</th><th>시간(초)</th><th>이벤트(TEN)</th><th>이벤트 효율</th><th>뒤로 가기</th><th>빈 곳 클릭</th><th>스크롤 깊이</th><th>탭 이탈</th><th class="l">조작 순서</th></tr>
            ${tt.map((t) => `<tr class="${String(t.exclude_tab) === "1" ? "ex" : ""}"><td><b>${esc(t.task)}</b></td><td>${resTag(t.result)}</td><td>${esc(t.tct_sec)}</td><td>${esc(t.ten)}</td><td>${t.event_eff === "" ? "-" : esc(t.event_eff) + "%"}</td><td>${esc(t.back)}</td><td>${esc(t.non_interactive_clicks)}</td><td>${esc(t.max_scroll_pct)}%</td>
              <td class="${+t.tab_leaves ? "flag" : ""}">${+t.tab_leaves ? `${t.tab_leaves}회 ${t.tab_hidden_sec}초${String(t.exclude_tab) === "1" ? " (제외)" : ""}` : "-"}</td><td class="l" style="white-space:normal">${evText(t)}</td></tr>`).join("") || '<tr><td colspan="10" class="note">과업 기록 없음</td></tr>'}
            </table>
            <p class="note">${c ? `퀴즈 ${c.quiz_total}/3 (문항별 ${c.quiz1}, ${c.quiz2}, ${c.quiz3}) &nbsp; SUS ${esc(c.sus_score)}점 (응답 ${esc(c.sus_items)})` : "퀴즈와 SUS 응답 없음"}${a ? ` &nbsp; AI 생성 지각도 ${esc(a.ai_rating)}/7` : ""}</p>`;
        }).join("")}
        <h3>주관식 응답</h3>
        ${open ? `<div class="fb">가장 어려웠던 정보: ${esc(open.open1)}\n이유: ${esc(open.open2)}</div>` : '<p class="note">응답 없음</p>'}
        ${p.pilot_feedback ? `<h3>파일럿 의견</h3><div class="fb">${esc(p.pilot_feedback)}</div>` : ""}
      </div>`;
    $("#dclose").addEventListener("click", () => { openPid = null; $("#detail").innerHTML = ""; });
    if (!keep) $("#detail").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- 결과 요약(기술 통계)
  function metrics(tasks, surveys) {
    const by = (id) => tasks.filter((t) => t.task === id);
    const succ = tasks.filter(ok);
    const cond = surveys.filter((s) => s.kind === "condition");
    const ai = surveys.filter((s) => s.kind === "ai");
    return {
      n: tasks.length,
      s1: mean(by("T1").map((t) => +ok(t))), s2: mean(by("T2").map((t) => +ok(t))), s3: mean(by("T3").map((t) => +ok(t))), s: mean(tasks.map((t) => +ok(t))),
      to: mean(tasks.map((t) => +(String(t.result) === "T"))),
      tct: median(succ.map((t) => +t.tct_sec)), tctc: mean(tasks.map((t) => +t.tct_censored)),
      eff: mean(succ.filter((t) => t.event_eff !== "").map((t) => +t.event_eff)),
      quiz: mean(cond.map((s) => +s.quiz_total / 3)), sus: mean(cond.map((s) => +s.sus_score)), ai: mean(ai.map((s) => +s.ai_rating))
    };
  }
  const MHEAD = `<tr><th class="l">구분</th><th>과업 수</th><th>T1 성공</th><th>T2 성공</th><th>T3 성공</th><th>전체 성공</th><th>시간 초과</th><th>TCT 중앙값(성공, 초)</th><th>TCT 평균(90초 중도절단)</th><th>이벤트 효율(%)</th><th>퀴즈 정답률</th><th>SUS</th><th>AI 생성 지각도</th></tr>`;
  const mrow = (label, m) => `<tr><td class="l"><b>${label}</b></td><td>${m.n}</td><td>${pct(m.s1)}</td><td>${pct(m.s2)}</td><td>${pct(m.s3)}</td><td>${pct(m.s)}</td><td>${pct(m.to)}</td><td>${f1(m.tct)}</td><td>${f1(m.tctc)}</td><td>${f1(m.eff)}</td><td>${pct(m.quiz)}</td><td>${f1(m.sus)}</td><td>${f1(m.ai)}</td></tr>`;
  function renderSummary() {
    const T = analysisTasks(false), S = analysisSurveys(false);
    const n = new Set(T.map((t) => t.pid)).size;
    const g = (fn) => metrics(T.filter(fn), S.filter(fn));
    $("#s-summary").innerHTML = `
      <h2>결과 요약(본 실험)</h2>
      <p class="note">완료하고 제외되지 않은 참가자 ${n}명의 기술 통계입니다. 탭 이탈 과업은 빠져 있습니다. 가설 검정(혼합효과모형, Cox 모형)은 내려받기 탭의 분석용 파일로 R이나 Python에서 진행하세요.</p>
      <h3>조건별</h3><div class="scroll"><table>${MHEAD}${CONDS.map((c) => mrow(c, g((x) => x.condition === c))).join("")}</table></div>
      <h3>요인별(주효과 방향 확인)</h3><div class="scroll"><table>${MHEAD}
        ${mrow("AI 전형형(A)", g((x) => String(x.condition)[0] === "A"))}${mrow("위계 설계형(H)", g((x) => String(x.condition)[0] === "H"))}
        ${mrow("일반적 문구(G)", g((x) => String(x.condition)[1] === "G"))}${mrow("구체적 문구(S)", g((x) => String(x.condition)[1] === "S"))}</table></div>
      <h3>서비스별</h3><div class="scroll"><table>${MHEAD}${Object.keys(SVC).map((k) => mrow(SVC[k], g((x) => x.service === k))).join("")}</table></div>`;
  }

  // ---------- 파일럿 점검
  function renderPilot() {
    const T = analysisTasks(true), S = analysisSurveys(true);
    const P = D.participants.filter((p) => p.pilot);
    const done = P.filter((p) => p.status === "완료" && p.total_sec);
    const rate = (arr) => (arr.length ? arr.filter(ok).length / arr.length : NaN);
    const taskRows = TASKS.map((id) => {
      const per = CONDS.map((c) => T.filter((t) => t.task === id && t.condition === c));
      const rs = per.map(rate);
      const easy = per.every((a) => a.length) && rs.every((r) => r >= 0.9);
      const tasksOf = T.filter((t) => t.task === id);
      return `<tr><td><b>${id}</b></td>${per.map((a, i) => `<td>${pct(rs[i])} <span class="note">(${a.length})</span></td>`).join("")}
        <td>${pct(rate(tasksOf))}</td><td>${pct(mean(tasksOf.map((t) => +(String(t.result) === "T"))))}</td>
        <td>${f1(mean(tasksOf.map((t) => +t.tct_sec)))}</td><td>${f1(max(tasksOf.map((t) => +t.tct_sec)))}</td>
        <td>${easy ? '<span class="flag">모든 조건 90% 이상, 난이도 조정 검토</span>' : (per.some((a) => !a.length) ? '<span class="note">조건 자료 부족</span>' : "유지")}</td></tr>`;
    }).join("");
    const svcRows = Object.keys(SVC).map((k) => `<tr><td class="l">${SVC[k]}</td>${TASKS.map((id) => { const a = T.filter((t) => t.service === k && t.task === id); return `<td>${pct(rate(a))} <span class="note">(${a.length})</span></td>`; }).join("")}</tr>`).join("");
    const mins = done.map((p) => +p.total_sec / 60);
    $("#s-pilot").innerHTML = `
      <h2>파일럿 점검</h2>
      <p class="note">예비 실험 기준: 제한시간 ${C.LIMIT_SEC}초와 총 소요 시간(목표 약 25분)이 적절한지, 모든 조건에서 성공률이 90% 이상인 과업이 있는지 확인합니다. 파일럿 자료는 결과 요약과 분석용 파일에 들어가지 않습니다.</p>
      <div class="cards">
        <div class="card"><div class="k">파일럿 참가자</div><div class="v">${P.length}</div></div>
        <div class="card"><div class="k">완료</div><div class="v">${done.length}</div></div>
        <div class="card"><div class="k">평균 소요(분)</div><div class="v">${f1(mean(mins))}</div></div>
        <div class="card"><div class="k">최대 소요(분)</div><div class="v">${f1(max(mins))}</div></div>
        <div class="card"><div class="k">시간 초과 과업</div><div class="v">${T.filter((t) => String(t.result) === "T").length}</div></div>
      </div>
      <h3>과업별 성공률(괄호는 과업 수)</h3>
      <div class="scroll"><table><tr><th>과업</th>${CONDS.map((c) => `<th>${c}</th>`).join("")}<th>전체</th><th>시간 초과</th><th>평균 시간(초)</th><th>최대 시간(초)</th><th class="l">판정</th></tr>${taskRows}</table></div>
      <h3>서비스별 과업 성공률</h3>
      <table><tr><th class="l">서비스</th>${TASKS.map((t) => `<th>${t}</th>`).join("")}</tr>${svcRows}</table>
      <h3>조건별 지표</h3><div class="scroll"><table>${MHEAD}${CONDS.map((c) => mrow(c, metrics(T.filter((x) => x.condition === c), S.filter((x) => x.condition === c)))).join("")}</table></div>
      <h3>파일럿 참가자 의견</h3>
      ${P.filter((p) => p.pilot_feedback).map((p) => `<div class="fb"><b>${esc(p.pid)}</b> (${p.total_sec ? (p.total_sec / 60).toFixed(1) + "분" : "미완료"})\n${esc(p.pilot_feedback)}</div>`).join("") || '<p class="note">아직 없습니다.</p>'}
      <h3>주관식 응답</h3>
      ${S.filter((s) => s.kind === "open").map((s) => `<div class="fb"><b>${esc(s.pid)}</b>\n가장 어려웠던 정보: ${esc(s.open1)}\n이유: ${esc(s.open2)}</div>`).join("") || '<p class="note">아직 없습니다.</p>'}
      <h3>파일럿 자료 정리</h3>
      <p class="note">파일럿을 마치고 본 실험을 시작하기 전에 지울 수 있습니다. 지우기 전에 내려받기 탭에서 파일럿 자료를 받아 두세요(최종 보고서의 예비 연구에 씁니다).</p>
      <button class="b danger" id="delpilot">파일럿 자료 모두 삭제</button>`;
    $("#delpilot").addEventListener("click", async () => {
      if (!confirm("파일럿 참가자의 모든 기록을 시트에서 지웁니다. 계속할까요?")) return;
      try { const r = await api({ action: "admin_delete_pilot" }); alertMsg(`${r.deleted}행 삭제`); await load(); } catch (e) { alertMsg(e.message); }
    });
  }

  // ---------- 내려받기
  function toCSV(list, keys) {
    keys = keys || [...new Set(list.flatMap((r) => Object.keys(r)))];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return "﻿" + [keys.join(","), ...list.map((r) => keys.map((k) => q(r[k])).join(","))].join("\n");
  }
  function save(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click();
  }
  function renderDownload() {
    $("#s-download").innerHTML = `
      <h2>내려받기</h2>
      <p class="note">모든 원자료는 구글 시트에도 그대로 있습니다. 여기서는 분석하기 좋은 형태로 정리해 내려받습니다(엑셀에서 한글이 깨지지 않는 CSV).</p>
      <h3>분석용(본 실험)</h3>
      <p class="note"><b>include</b> 열이 1인 행만 분석에 씁니다(완료, 제외 안 됨, 탭 이탈 아님). 시각 구조 visual(A/H), 문구 copy(G/S) 열이 붙어 있어 모형에 바로 넣을 수 있습니다. 생존 분석은 tct_censored와 event 열을 쓰면 됩니다.</p>
      <div class="row"><button class="b p" data-d="tasks">과업 자료(tasks)</button><button class="b p" data-d="cond">조건별 퀴즈, SUS(conditions)</button><button class="b p" data-d="ai">AI 생성 지각도(ai_ratings)</button><button class="b p" data-d="open">주관식(open)</button><button class="b p" data-d="people">참가자(participants)</button></div>
      <h3>파일럿</h3>
      <div class="row"><button class="b" data-d="ptasks">파일럿 과업 자료</button><button class="b" data-d="psurveys">파일럿 설문 자료</button><button class="b" data-d="ppeople">파일럿 참가자</button></div>
      <h3>원자료 전체</h3>
      <div class="row"><button class="b" data-d="raw_tasks">tasks 시트</button><button class="b" data-d="raw_surveys">surveys 시트</button><button class="b" data-d="raw_people">participants 시트</button></div>`;
    document.querySelectorAll("#s-download [data-d]").forEach((b) => b.addEventListener("click", () => dl(b.dataset.d)));
  }
  function dl(kind) {
    const P = pmap();
    const withFlags = (t) => { const p = P[t.pid] || {}; return Object.assign({}, t, {
      visual: String(t.condition)[0], copy: String(t.condition)[1],
      include: p.status === "완료" && !p.excluded && String(t.exclude_tab) !== "1" ? 1 : 0 }); };
    const sWith = (s) => { const p = P[s.pid] || {}; return Object.assign({}, s, { cell: p.cell, visual: String(s.condition || "")[0] || "", copy: String(s.condition || "")[1] || "", include: p.status === "완료" && !p.excluded ? 1 : 0 }); };
    const main = (r) => P[r.pid] && !P[r.pid].pilot, pil = (r) => P[r.pid] && P[r.pid].pilot;
    const TK = ["pid", "cell", "position", "condition", "visual", "copy", "service", "task", "result", "answer", "tct_sec", "tct_censored", "event", "ten", "min_ten", "event_eff", "back", "non_interactive_clicks", "max_scroll_pct", "tab_leaves", "tab_hidden_sec", "exclude_tab", "window_w", "window_h", "include", "saved_at", "events"];
    const strip = (p) => { const o = Object.assign({}, p); delete o.token; return o; };
    const day = new Date().toISOString().slice(0, 10);
    const M = {
      tasks: () => save(`tasks_${day}.csv`, toCSV(D.tasks.filter(main).map(withFlags), TK)),
      cond: () => save(`conditions_${day}.csv`, toCSV(D.surveys.filter((s) => main(s) && s.kind === "condition").map(sWith), ["pid", "cell", "position", "condition", "visual", "copy", "service", "quiz1", "quiz2", "quiz3", "quiz_total", "sus_items", "sus_score", "include"])),
      ai: () => save(`ai_ratings_${day}.csv`, toCSV(D.surveys.filter((s) => main(s) && s.kind === "ai").map(sWith), ["pid", "cell", "position", "condition", "visual", "copy", "service", "ai_rating", "include"])),
      open: () => save(`open_${day}.csv`, toCSV(D.surveys.filter((s) => main(s) && s.kind === "open").map(sWith), ["pid", "cell", "open1", "open2", "include"])),
      people: () => save(`participants_${day}.csv`, toCSV(D.participants.filter((p) => !p.pilot).map(strip))),
      ptasks: () => save(`pilot_tasks_${day}.csv`, toCSV(D.tasks.filter(pil).map(withFlags), TK)),
      psurveys: () => save(`pilot_surveys_${day}.csv`, toCSV(D.surveys.filter(pil))),
      ppeople: () => save(`pilot_participants_${day}.csv`, toCSV(D.participants.filter((p) => p.pilot).map(strip))),
      raw_tasks: () => save(`raw_tasks_${day}.csv`, toCSV(D.tasks)),
      raw_surveys: () => save(`raw_surveys_${day}.csv`, toCSV(D.surveys)),
      raw_people: () => save(`raw_participants_${day}.csv`, toCSV(D.participants.map(strip)))
    };
    M[kind]();
  }

  // ---------- 링크와 미리보기
  function renderLinks() {
    const base = location.href.replace(/admin\.html.*$/, "");
    const L = (q) => base + "index.html" + q;
    $("#s-links").innerHTML = `
      <h2>링크와 미리보기</h2>
      <table class="links">
        <tr><th class="l">용도</th><th class="l">주소</th></tr>
        <tr><td><b>참가자에게 보낼 링크</b></td><td><a href="${L("")}" target="_blank">${L("")}</a></td></tr>
        ${Object.entries(C.CODES || {}).map(([k, v]) => `<tr><td>참여 코드 <b>${esc(k)}</b></td><td>${v === "pilot" ? "파일럿으로 진행" : "본 실험으로 진행(칸 자동 배정)"}</td></tr>`).join("")}
        <tr><td><b>파일럿(자동 칸)</b></td><td><a href="${L("?pilot=1")}" target="_blank">${L("?pilot=1")}</a></td></tr>
        ${[1, 2, 3, 4, 5, 6, 7, 8].map((c) => `<tr><td>파일럿 칸 ${c}</td><td><a href="${L("?pilot=1&cell=" + c)}" target="_blank">${L("?pilot=1&cell=" + c)}</a></td></tr>`).join("")}
        <tr><td>이 브라우저 기록 초기화</td><td><a href="${L("?pilot=1&reset=1")}" target="_blank">${L("?pilot=1&reset=1")}</a> <span class="note">같은 컴퓨터로 여러 번 테스트할 때</span></td></tr>
      </table>
      <h3>16개 화면 미리보기</h3>
      <table class="links"><tr><th class="l">서비스</th>${CONDS.map((c) => `<th class="l">${c}</th>`).join("")}</tr>
        ${Object.keys(SVC).map((k) => `<tr><td>${SVC[k]} (${esc(window.SERVICES[k].brand)})</td>${CONDS.map((c) => `<td><a href="${L(`?preview=${c}&service=${k}`)}" target="_blank">열기</a></td>`).join("")}</tr>`).join("")}
      </table>
      <h3>정답표</h3>
      <table><tr><th class="l">서비스</th><th class="l">T1 정답</th><th class="l">T2 정답</th><th class="l">T3 목표</th></tr>
        ${Object.keys(SVC).map((k) => { const t = window.SERVICES[k].tasks; return `<tr><td class="l">${SVC[k]}</td><td class="l">${esc(t[0].choices[t[0].correct])}</td><td class="l">${esc(t[1].choices[t[1].correct])}</td><td class="l">데모 신청 화면</td></tr>`; }).join("")}
      </table>`;
  }
})();
