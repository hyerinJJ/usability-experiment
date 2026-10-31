// 실험 진행: 동의 -> 사전 질문 -> 연습 -> 4개 조건(과업 4개, 이해도 퀴즈, SUS) -> AI 생성 지각도 -> 주관식 2문항 -> 연구 목적 안내
// 주소
//   참가자용        index.html                  (배정 칸은 서버가 접속 순서대로 자동 배정)
//   파일럿용        index.html?pilot=1          (데이터에 파일럿 표시, 배정 인원에 포함 안 됨, &cell=3 으로 칸 지정 가능)
//   화면 미리보기   index.html?preview=AG&service=schedule
//   이 브라우저 기록 초기화  index.html?reset=1
(function () {
  const C = window.CONFIG;
  const WILLIAMS = [["AG", "AS", "HS", "HG"], ["AS", "HG", "AG", "HS"], ["HG", "HS", "AS", "AG"], ["HS", "AG", "HG", "AS"]];
  const SERVICE_ORDER = ["schedule", "inventory", "accounting", "support"];
  const LIMIT_MS = C.LIMIT_SEC * 1000;
  const SKEY = "exp_session";

  const qs = new URLSearchParams(location.search);
  const root = document.getElementById("app");
  let pilot = qs.get("pilot") === "1";
  let codeDone = pilot || !(window.CONFIG.CODES && Object.keys(window.CONFIG.CODES).length);
  const backup = { tasks: [], surveys: [] };

  function assignment(cell) {
    const w = WILLIAMS[Math.floor((cell - 1) / 2)];
    const order = (cell % 2 === 1) ? SERVICE_ORDER : SERVICE_ORDER.slice().reverse();
    return w.map((cond, i) => ({ position: i + 1, condition: cond, service: order[i] }));
  }

  // ---------- 미리보기 모드 (부록 캡처, 점검용)
  if (qs.get("preview")) {
    const svc = window.SERVICES[qs.get("service")] ? qs.get("service") : "schedule";
    root.innerHTML = window.renderCondition(svc, qs.get("preview").toUpperCase());
    return;
  }
  if (qs.get("reset") === "1") {
    ["exp_session", "exp_queue"].forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
    history.replaceState(null, "", location.pathname + (pilot ? "?pilot=1" : ""));
  }

  // ---------- 공통 도우미
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function screen(html) {
    root.innerHTML = `<div class="screen">${html}</div>${pilot ? '<div class="pilot-badge">파일럿 모드</div>' : ""}`;
    window.scrollTo(0, 0);
  }
  function waitClick(sel) { return new Promise((res) => root.querySelector(sel).addEventListener("click", res, { once: true })); }
  function loadSession() { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } }
  function saveSession(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
  function uuid() { return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2); }
  function likert(name, labels) {
    return `<div class="likert">${labels.map((l, i) => `<label><input type="radio" name="${name}" value="${i + 1}"> ${i + 1}${l ? " " + l : ""}</label>`).join("")}</div>`;
  }
  function radioQ(name, legend, opts) { return `<fieldset data-q="${name}"><legend>${legend}</legend>${opts.map((l) => `<label><input type="radio" name="${name}" value="${l}"> ${l}</label>`).join(" &nbsp; ")}</fieldset>`; }
  function val(name) { const el = root.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ""; }
  // 모든 필수 문항에 답해야 다음으로 넘어간다
  function waitValid(names, extra) {
    return new Promise((res) => {
      root.querySelector("#go").addEventListener("click", function h() {
        let ok = true;
        names.forEach((n) => {
          const fs = root.querySelector(`[data-q="${n}"]`);
          const filled = !!val(n);
          if (fs) fs.classList.toggle("missing", !filled);
          if (!filled) ok = false;
        });
        if (extra && !extra()) ok = false;
        const err = root.querySelector(".err");
        if (!ok) { if (err) err.textContent = "답하지 않은 문항이 있습니다. 빨간 테두리 문항을 확인해 주세요."; return; }
        root.querySelector("#go").removeEventListener("click", h);
        res();
      });
    });
  }
  function isChrome() {
    const ua = navigator.userAgent;
    if (navigator.userAgentData && navigator.userAgentData.brands) {
      if (navigator.userAgentData.brands.some((b) => b.brand === "Google Chrome")) return true;
    }
    return /Chrome\//.test(ua) && !/Edg\/|OPR\/|Whale\/|SamsungBrowser|YaBrowser/.test(ua);
  }
  function browserName() {
    const m = navigator.userAgent.match(/(Edg|OPR|Whale|Chrome|Firefox|Version)\/([\d.]+)/);
    return m ? `${m[1] === "Version" ? "Safari" : m[1]} ${m[2].split(".")[0]}` : navigator.userAgent.slice(0, 40);
  }
  const send = (action, s, data) => window.API.enqueue({ action, pid: s.pid, token: s.token, data });
  const leaveGuard = (e) => { e.preventDefault(); e.returnValue = ""; };

  // ---------- 진행
  // 참여 코드: 같은 링크로 들어와도 코드에 따라 본 실험과 파일럿을 나눈다(config.js의 CODES)
  async function askCode() {
    screen(`<h1>웹페이지 정보 탐색 평가</h1><p>안내받은 참여 코드를 입력해 주세요.</p>
      <input id="code" type="text" autocomplete="off" style="font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;width:240px">
      <div class="err"></div><button class="primary" id="go">확인</button>`);
    const input = root.querySelector("#code"); input.focus();
    return new Promise((res) => {
      const check = () => {
        const v = input.value.trim().toUpperCase();
        const hit = Object.keys(C.CODES).find((k) => k.toUpperCase() === v);
        if (!hit) { root.querySelector(".err").textContent = "코드가 맞지 않습니다. 안내받은 코드를 다시 확인해 주세요."; return; }
        res(C.CODES[hit]);
      };
      root.querySelector("#go").addEventListener("click", check);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
    });
  }

  async function run() {
    // 이전 기록 확인(본 실험 참가자는 한 번만 참여)
    const prev = loadSession();
    if (prev && prev.status === "running") {
      send("abort", prev, { reason: "진행 중 새로고침 또는 재접속" });
      prev.status = "aborted"; saveSession(prev);
      if (!prev.pilot && !pilot) {
        screen(`<h1>실험이 중단되었습니다</h1><p>진행 중에 페이지를 새로 고치거나 닫으면 기록이 이어지지 않아 다시 참여할 수 없습니다. 연구진(${esc(C.CONTACT)})에게 알려 주세요.</p>`);
        return;
      }
    }
    if (prev && !prev.pilot && !pilot && prev.status === "done") {
      screen(`<h1>이미 참여를 마치셨습니다</h1><p>참여해 주셔서 감사합니다. 한 사람은 한 번만 참여할 수 있습니다.</p>`);
      return;
    }
    if (prev && !prev.pilot && !pilot && prev.status === "aborted") {
      screen(`<h1>실험이 중단되었습니다</h1><p>이 브라우저에서는 다시 참여할 수 없습니다. 연구진(${esc(C.CONTACT)})에게 알려 주세요.</p>`);
      return;
    }
    if (!codeDone) { pilot = (await askCode()) === "pilot"; codeDone = true; }

    // 접속 환경 확인
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const skipCheck = pilot && qs.get("nocheck") === "1";
    if (!skipCheck && (mobile || !isChrome())) {
      screen(`<h1>PC의 Chrome 브라우저로 접속해 주세요</h1><p class="warn">이 실험은 PC의 Chrome 브라우저에서만 진행할 수 있습니다. Chrome으로 이 주소를 다시 열어 주세요.</p>`);
      return;
    }
    if (!skipCheck && window.innerWidth < C.MIN_WIDTH) {
      screen(`<h1>브라우저 창을 넓혀 주세요</h1><p class="warn">창의 가로 크기가 ${C.MIN_WIDTH}픽셀 이상이어야 합니다(지금 ${window.innerWidth}픽셀). 창을 최대화한 뒤 아래 버튼을 눌러 주세요.</p>
        <button class="primary" id="go">다시 확인</button>`);
      await waitClick("#go");
      return run();
    }

    // 파일럿은 웹사이트 체험만(동의, 사전 질문, 연습, 페이지별 설문, 마지막 설문 생략). 전체 흐름이 필요하면 주소에 &full=1
    const lite = pilot && qs.get("full") !== "1";
    if (lite) {
      screen(`<h1>웹사이트 체험(파일럿)</h1><p>서비스 소개 웹페이지 4개를 차례로 봅니다. 페이지마다 먼저 ${C.EXPLORE_SEC}초 동안 둘러본 뒤, 오른쪽 질문에 맞는 답을 왼쪽 페이지에서 찾아 고르면 됩니다. 과업마다 제한시간은 ${C.LIMIT_SEC}초입니다.</p><button class="primary" id="go">시작하기</button>`);
      await waitClick("#go");
    } else {
      // 동의
      screen(`<h1>웹페이지 정보 탐색 평가</h1>
        <p>서비스 소개 웹페이지 4개를 보며 필요한 정보를 찾는 과업을 수행합니다. 약 25분이 걸립니다.</p>
        <div class="consent">
          <p><strong>참여 안내</strong></p>
          <p>응답과 화면 조작 기록(클릭, 시간 등)은 익명 코드로 저장되며 인간공학실험 수업의 연구 목적으로만 사용됩니다. 이름, 연락처 등 개인을 알아볼 수 있는 정보는 수집하지 않습니다.</p>
          <p>참여는 자발적이며 언제든 창을 닫아 그만둘 수 있습니다. 그만두어도 불이익은 없습니다.</p>
        </div>
        <p><strong>주의사항</strong></p>
        <ul><li>조용한 곳에서 마우스를 사용해 참여해 주세요.</li>
        <li>실험 중에는 다른 탭이나 창으로 이동하지 말아 주세요.</li>
        <li>진행 중에 페이지를 새로 고치거나 뒤로 나가면 처음부터 다시 할 수 없습니다.</li>
        <li>답을 확인한 뒤에 보기를 선택해 주세요. 한 번 고른 답은 바꿀 수 없습니다.</li></ul>
        <label><input type="checkbox" id="agree"> 위 내용을 확인했으며 참여에 동의합니다.</label>
        <div class="err"></div>
        <button class="primary" id="go" disabled>시작하기</button>`);
      root.querySelector("#agree").addEventListener("change", (e) => { root.querySelector("#go").disabled = !e.target.checked; });
      await waitClick("#go");

    }

    // 서버에서 참가자 코드와 배정 칸 받기
    const token = uuid();
    let pid, cell;
    if (window.API.enabled) {
      screen(`<h1>준비 중입니다</h1><p>잠시만 기다려 주세요.</p>`);
      for (;;) {
        try {
          const r = await window.API.call({ action: "start", token, pilot, cell: +qs.get("cell") || 0,
            browser: browserName(), window_w: window.innerWidth, window_h: window.innerHeight });
          pid = r.pid; cell = r.cell; break;
        } catch (e) {
          screen(`<h1>연결에 실패했습니다</h1><p class="warn">인터넷 연결을 확인한 뒤 다시 시도해 주세요. (${esc(e.message)})</p><button class="primary" id="go">다시 시도</button>`);
          await waitClick("#go");
        }
      }
    } else {
      pid = qs.get("p") || (pilot ? "X-LOCAL" : "LOCAL");
      cell = Math.min(8, Math.max(1, parseInt(qs.get("cell") || "1", 10)));
    }
    const s = { token, pid, cell, pilot, status: "running", t0: Date.now() };
    saveSession(s);
    window.addEventListener("beforeunload", leaveGuard);

    if (!lite) {
      // 사전 질문
      screen(`<h1>사전 질문</h1>
        <fieldset data-q="age"><legend>연령대</legend>${["만 19세 이하", "20~24세", "25~29세", "30세 이상"].map((l, i) => `<label><input type="radio" name="age" value="${l}"> ${l}</label>`).join(" &nbsp; ")}</fieldset>
        <fieldset data-q="gender"><legend>성별</legend>${["여성", "남성", "응답하지 않음"].map((l) => `<label><input type="radio" name="gender" value="${l}"> ${l}</label>`).join(" &nbsp; ")}</fieldset>
        ${radioQ("major", "전공 계열", ["공학", "자연과학", "인문, 사회과학", "경영, 경제", "예술, 디자인", "기타"])}
        ${radioQ("design_exp", "웹이나 앱 화면 디자인(UI, UX) 관련 수업을 듣거나 작업해 본 적이 있나요?", ["있음", "없음"])}
        ${radioQ("genai_web_exp", "생성형 AI(ChatGPT, Claude 등)로 웹페이지나 앱 화면을 만들어 본 적이 있나요?", ["있음", "없음"])}
        ${radioQ("plan_compare_exp", "최근 1년 안에 구독 서비스나 소프트웨어의 요금제를 직접 비교해 본 적이 있나요?", ["있음", "없음"])}
        <div class="err"></div><button class="primary" id="go">다음</button>`);
      await waitValid(["age", "gender", "major", "design_exp", "genai_web_exp", "plan_compare_exp"]);
      send("pre", s, { age: val("age"), gender: val("gender"), major: val("major"), design_exp: val("design_exp"), genai_web_exp: val("genai_web_exp"), plan_compare_exp: val("plan_compare_exp") });

      // 연습: 본 과업과 같은 순서(둘러보기 → 과업)를 그대로 해 본다
      screen(`<h1>연습</h1>
        <p>본 과업 전에 방법을 익히는 연습입니다. 연습 결과는 기록하지 않습니다.</p>
        <ul><li>페이지마다 먼저 ${C.EXPLORE_SEC}초 동안 페이지를 자유롭게 둘러봅니다. 이때는 버튼이 눌리지 않고 스크롤만 됩니다.</li>
        <li>둘러볼 때 요금제나 이용권 표, 자주 묻는 질문, 버튼이 어디 있는지 봐 두면 과업에서 찾기 쉽습니다.</li>
        <li>둘러보기가 끝나면 과업이 나옵니다. 화면 왼쪽에는 웹페이지가, 오른쪽에는 질문이 나옵니다.</li>
        <li>질문을 읽고 왼쪽 웹페이지에서 답을 찾은 뒤, 오른쪽 보기 중 하나를 누르면 다음으로 넘어갑니다.</li>
        <li>화면을 열라는 과업은 해당 버튼을 누르면 끝납니다.</li>
        <li>과업마다 제한시간은 ${C.LIMIT_SEC}초입니다.</li></ul>
        <button class="primary" id="go">연습 시작</button>`);
      await waitClick("#go");
      screen(`<p class="progress">연습</p><h1>먼저 페이지를 둘러보세요</h1><p>연습용 도서관 페이지가 나옵니다. ${C.EXPLORE_SEC}초 동안 위아래로 자유롭게 살펴보세요. 시간이 끝나면 자동으로 과업이 시작됩니다.</p><button class="primary" id="go">둘러보기 시작</button>`);
      await waitClick("#go");
      await explore(null);
      for (const task of window.PRACTICE.tasks) {
        screen(`<p class="progress">연습</p><h1>${esc(task.id)}</h1><p>${esc(task.prompt)}</p><button class="primary" id="go">과업 시작</button>`);
        await waitClick("#go");
        const pr = await runTask({ s, task, practice: true });
        const head = pr.ok ? "잘했어요" : pr.timeout ? "시간이 끝났습니다" : "다시 확인해 보세요";
        const ans = task.choices ? `정답은 "${esc(task.choices[task.correct])}"입니다. ` : "";
        screen(`<p class="progress">연습</p><h1>${head}</h1><p>${ans}${esc(task.tip)}</p><button class="primary" id="go">다음</button>`);
        await waitClick("#go");
      }
      screen(`<h1>연습이 끝났습니다</h1><p>이제 본 과업을 시작합니다. 서비스 소개 웹페이지 4개를 차례로 보며, 페이지마다 ${C.EXPLORE_SEC}초 둘러보기, 과업 4개, 짧은 질문 순서로 진행합니다.</p><button class="primary" id="go">본 과업 시작</button>`);
      await waitClick("#go");
    }

    // 본 과업
    const plan = assignment(cell);
    let k = 0;
    for (const step of plan) {
      const svc = window.SERVICES[step.service];
      screen(`<p class="progress">${step.position}번째 페이지 (총 4개)</p><h1>먼저 페이지를 둘러보세요</h1><p>새 서비스 소개 페이지가 나옵니다. ${C.EXPLORE_SEC}초 동안 위아래로 자유롭게 살펴보세요. 시간이 끝나면 자동으로 과업이 시작됩니다.</p><button class="primary" id="go">둘러보기 시작</button>`);
      await waitClick("#go");
      const ex = await explore(step);
      backup.surveys.push(ex); send("survey", s, ex);
      // 과업 순서는 페이지마다 무작위(순서와 학습 효과 상쇄). 실제 순서는 tasks 시트의 saved_at으로 확인
      const order = svc.tasks.slice();
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      for (const task of order) {
        k++;
        screen(`<p class="progress">${step.position}번째 페이지 (총 4개) &nbsp; 과업 ${k}/${plan.length * svc.tasks.length}</p><h1>${esc(task.id)}</h1><p>${esc(task.prompt)}</p><button class="primary" id="go">과업 시작</button>`);
        await waitClick("#go");
        const row = await runTask({ s, step, task });
        backup.tasks.push(row); keepBackup(s);
        send("task", s, row);
      }
      if (!lite) await quizAndSus(s, step, svc);
    }

    if (!lite) {
      // AI 생성 지각도와 주관식(모든 조건이 끝난 뒤)
      const thumb = (p) => `<div class="thumb" aria-hidden="true"><div class="thumb-in">${window.renderCondition(p.service, p.condition)}</div></div>`;
      screen(`<h1>마지막 질문</h1>
        <p>지금까지 본 네 페이지입니다. 페이지마다 <strong>AI가 만든 것 같다고 느낀 정도</strong>를 골라 주세요.</p>
        <div class="recall">${plan.map((p) => { const v = window.SERVICES[p.service]; return `<fieldset data-q="ai_${p.position}" class="recall-item">${thumb(p)}<div><p class="rlabel">${p.position}번째: ${esc(v.brand)} (${esc(v.category)})</p>${likert("ai_" + p.position, ["전혀 아니다", "", "", "", "", "", "매우 그렇다"])}</div></fieldset>`; }).join("")}</div>
        <fieldset data-q="hardest"><legend>네 페이지 중 원하는 정보를 찾기 가장 어려웠던 페이지는 어디였나요?</legend>
          ${plan.map((p) => { const v = window.SERVICES[p.service]; return `<label><input type="radio" name="hardest" value="${p.position}"> ${p.position}번째: ${esc(v.brand)}</label>`; }).join(" &nbsp; ")}
          &nbsp; <label><input type="radio" name="hardest" value="0"> 비슷했음</label></fieldset>
        <fieldset><legend>그렇게 고른 이유를 짧게 적어 주세요. (선택)</legend><textarea id="open2" placeholder="예: 요금이 어디 있는지 한눈에 안 보였어요"></textarea></fieldset>
        ${pilot ? `<fieldset><legend>[파일럿] 진행하면서 헷갈렸던 점, 너무 쉽거나 어려웠던 과업, 걸린 시간에 대한 느낌을 자유롭게 적어 주세요.</legend><textarea id="pilotfb"></textarea></fieldset>` : ""}
        <div class="err"></div><button class="primary" id="go">제출</button>`);
      await waitValid([...plan.map((p) => "ai_" + p.position), "hardest"]);
      plan.forEach((p) => {
        const r = { kind: "ai", position: p.position, condition: p.condition, service: p.service, ai_rating: +val("ai_" + p.position) };
        backup.surveys.push(r); send("survey", s, r);
      });
      const hp = +val("hardest"); const hs = plan.find((p) => p.position === hp);
      const open = { kind: "open", position: 0, condition: hs ? hs.condition : "", service: hs ? hs.service : "", open1: hs ? `${hp}번째 ${window.SERVICES[hs.service].brand}` : "비슷했음", open2: root.querySelector("#open2").value.trim() };
      backup.surveys.push(open); send("survey", s, open);
    }
    const total = Math.round((Date.now() - s.t0) / 1000);
    send("finish", s, { total_sec: total, pilot_feedback: pilot && !lite ? root.querySelector("#pilotfb").value.trim() : "" });
    s.status = "done"; saveSession(s); keepBackup(s);
    window.removeEventListener("beforeunload", leaveGuard);

    // 연구 목적 안내
    screen(`<h1>참여해 주셔서 감사합니다</h1>
      <p>이 실험은 AI가 생성한 서비스 소개 웹페이지의 전형적인 시각 구조와 문구가 정보를 찾는 데 어떤 영향을 미치는지 알아보기 위한 것입니다. 네 페이지는 같은 정보를 담고 있지만 배치 방식과 제목 문구가 서로 달랐습니다. 처음에 목적을 자세히 알려 드리지 않은 것은 응답이 목적에 영향을 받지 않도록 하기 위해서였습니다.</p>
      <p>궁금한 점은 ${esc(C.CONTACT)}에게 문의해 주세요.</p>
      <p id="sync" class="progress"></p>
      <div id="dlwrap"></div>`);
    watchSync(s);
  }

  function keepBackup(s) { try { localStorage.setItem("exp_backup_" + s.pid, JSON.stringify(backup)); } catch (e) {} }

  // 저장 완료를 확인하고, 서버가 없거나 오래 실패하면 내려받기 버튼을 보여 준다
  function watchSync(s) {
    const el = root.querySelector("#sync"), wrap = root.querySelector("#dlwrap");
    const showDl = () => {
      if (wrap.innerHTML) return;
      wrap.innerHTML = `<p class="warn">기록이 서버에 저장되지 않았습니다. 아래 버튼으로 파일을 내려받아 연구진에게 보내 주세요.</p><button class="primary" id="dl">기록 파일 내려받기</button>`;
      wrap.querySelector("#dl").addEventListener("click", () => download(s));
    };
    if (!window.API.enabled) { el.textContent = "서버 미연결(시연 모드)"; showDl(); return; }
    const t0 = Date.now();
    const upd = () => {
      const n = window.API.pending();
      if (n === 0) { el.textContent = "기록이 모두 저장되었습니다. 이제 창을 닫으셔도 됩니다."; wrap.innerHTML = ""; return; }
      el.textContent = `기록을 저장하는 중입니다(${n}건 남음). 창을 닫지 말아 주세요.`;
      if (Date.now() - t0 > 30000) showDl();
      setTimeout(upd, 1000);
    };
    upd();
  }

  // 과업 전 자유 탐색: 질문 없이 페이지 전체를 정해진 시간 동안 본다(버튼 이동은 막고 스크롤만 기록)
  function explore(step) {
    return new Promise((resolve) => {
      root.innerHTML = `<div class="shell"><div class="stage" id="stage"></div>
        <aside class="panel"><div class="task-type">둘러보기</div>
        <div class="task-prompt">이 서비스 소개 페이지를 자유롭게 살펴보세요.</div>
        <p class="note-sm">위아래로 스크롤하며 어떤 서비스인지 살펴보면 됩니다. 이 단계에서는 버튼이 눌리지 않습니다.</p>
        <div class="timer" id="timer">남은 시간 ${C.EXPLORE_SEC}초</div></aside></div>
        ${pilot ? '<div class="pilot-badge">파일럿 모드</div>' : ""}`;
      const stage = root.querySelector("#stage");
      stage.innerHTML = step ? window.renderCondition(step.service, step.condition) : window.renderPractice("main");
      stage.scrollTop = 0;
      let maxScroll = 0;
      const onScroll = () => {
        const d = stage.scrollHeight > stage.clientHeight ? (stage.scrollTop + stage.clientHeight) / stage.scrollHeight : 1;
        maxScroll = Math.max(maxScroll, Math.round(d * 100));
      };
      onScroll();
      stage.addEventListener("scroll", onScroll, { passive: true });
      stage.addEventListener("click", (e) => { if (e.target.closest("button, a")) e.preventDefault(); }, true);
      const t0 = performance.now();
      const tick = setInterval(() => {
        const left = Math.max(0, C.EXPLORE_SEC * 1000 - (performance.now() - t0));
        const el = root.querySelector("#timer"); if (el) el.textContent = `남은 시간 ${Math.ceil(left / 1000)}초`;
        if (left <= 0) {
          clearInterval(tick);
          if (!step) return resolve(null);
          resolve({ kind: "explore", position: step.position, condition: step.condition, service: step.service, explore_scroll_pct: maxScroll });
        }
      }, 250);
    });
  }

  function runTask({ s, step, task, practice }) {
    return new Promise((resolve) => {
      root.innerHTML = `<div class="shell"><div class="stage" id="stage"></div>
        <aside class="panel"><div data-panel-ignore>${practice ? '<div class="practice-tag">연습</div>' : ""}<div class="task-type">${esc(task.type)}</div>
        <div class="task-prompt">${esc(task.prompt)}</div><div class="timer" id="timer">남은 시간 ${C.LIMIT_SEC}초</div></div>
        ${task.choices ? task.choices.map((c, i) => `<button class="choice" data-choice="${i}">${esc(c)}</button>`).join("") : ""}</aside></div>
        ${pilot ? '<div class="pilot-badge">파일럿 모드</div>' : ""}`;
      const stage = root.querySelector("#stage");
      const svc = practice ? null : window.SERVICES[step.service];
      const show = (view) => {
        if (practice) stage.innerHTML = window.renderPracticeSub(view);
        else stage.innerHTML = view === "main" ? window.renderCondition(step.service, step.condition) : window.renderSub(view, svc.brand, step.service);
        stage.scrollTop = 0;
      };
      const tkey = (practice ? "practice-" : step.position + "-") + task.id;
      show("main");
      history.pushState({ view: "main", task: tkey }, "");
      const logger = window.TaskLogger(stage);
      logger.start(practice ? {} : { participant: s.pid, cell: s.cell, position: step.position, condition: step.condition, service: step.service, task: task.id });
      const t0 = performance.now();
      let done = false;

      const finish = (code, answer) => {
        if (done) return; done = true;
        clearInterval(tick); window.removeEventListener("popstate", onPop);
        const elapsed = performance.now() - t0;
        setTimeout(() => {
          const r = logger.finish({ code, answer, elapsed });
          logger.stop();
          if (practice) return resolve({ ok: r.result === 1, timeout: code === "T" });
          const ok = r.result === 1;
          r.tct_censored = ok ? r.tct_sec : C.LIMIT_SEC;   // 오답과 시간 초과는 제한시간에서 중도절단
          r.event = ok ? 1 : 0;
          r.min_ten = task.minTen || 1;
          r.event_eff = ok && r.ten > 0 ? +(r.min_ten / r.ten * 100).toFixed(1) : "";
          delete r.participant;
          resolve(r);
        }, 0);
      };
      // 브라우저 뒤로 가기: 이 과업의 화면 기록 안에서만 움직이고, 과업 밖으로 나가지 않게 막는다
      const onPop = (e) => {
        logger.back();
        if (e.state && e.state.task === tkey) show(e.state.view);
        else { show("main"); history.pushState({ view: "main", task: tkey }, ""); }
      };
      window.addEventListener("popstate", onPop);

      stage.addEventListener("click", (e) => {
        if (e.target.closest("[data-nolink]")) { e.preventDefault(); return; }
        const go = e.target.closest("[data-go]");
        if (go) {
          const view = go.dataset.go;
          history.pushState({ view, task: tkey }, ""); show(view);
          if (task.target && view === task.target) finish(1, view);
        }
        if (e.target.closest("[data-back]")) history.back();
      });
      root.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.choice; finish(i === task.correct ? 1 : 0, i);
      }));
      const tick = setInterval(() => {
        const left = Math.max(0, LIMIT_MS - (performance.now() - t0));
        const el = root.querySelector("#timer"); if (el) el.textContent = `남은 시간 ${Math.ceil(left / 1000)}초`;
        if (left <= 0) finish("T", "");
      }, 250);
    });
  }

  async function quizAndSus(s, step, svc) {
    const SUS = ["이 웹페이지를 자주 이용하고 싶다.", "이 웹페이지는 불필요하게 복잡하다.", "이 웹페이지는 이용하기 쉬웠다.",
      "이 웹페이지를 이용하려면 다른 사람의 도움이 필요할 것 같다.", "이 웹페이지의 여러 정보가 잘 통합되어 있다.",
      "이 웹페이지에는 일관되지 않은 부분이 너무 많다.", "대부분의 사람들이 이 웹페이지를 금방 이해할 것 같다.",
      "이 웹페이지는 이용하기 번거로웠다.", "이 웹페이지를 이용하는 데 자신감이 있었다.", "이 웹페이지를 이용하기 전에 많은 것을 알아야 했다."];
    screen(`<p class="progress">${step.position}번째 페이지 (총 4개)</p>
      <h1>방금 본 페이지에 대한 질문</h1><p>페이지를 다시 볼 수 없습니다. 기억나는 대로 답해 주세요.</p>
      ${svc.quiz.map((q, i) => `<fieldset data-q="q${i}"><legend>${i + 1}. ${esc(q.q)}</legend>${q.choices.map((c, j) => `<label><input type="radio" name="q${i}" value="${j}"> ${esc(c)}</label><br>`).join("")}</fieldset>`).join("")}
      <h1 style="margin-top:28px">사용 경험</h1>
      <p>방금 본 웹페이지에 대해 각 문장에 얼마나 동의하는지 골라 주세요.</p>
      ${SUS.map((t, i) => `<fieldset data-q="sus${i}"><legend>${i + 1}. ${esc(t)}</legend>${likert("sus" + i, ["전혀 아니다", "", "", "", "매우 그렇다"])}</fieldset>`).join("")}
      <div class="err"></div><button class="primary" id="go">다음</button>`);
    await waitValid([...svc.quiz.map((_, i) => "q" + i), ...SUS.map((_, i) => "sus" + i)]);
    const quiz = svc.quiz.map((q, i) => (+val("q" + i) === q.correct ? 1 : 0));
    const sus = SUS.map((_, i) => +val("sus" + i));
    const susScore = 2.5 * sus.reduce((a, x, i) => a + (i % 2 === 0 ? x - 1 : 5 - x), 0);
    const r = { kind: "condition", position: step.position, condition: step.condition, service: step.service,
      quiz1: quiz[0], quiz2: quiz[1], quiz3: quiz[2], quiz_total: quiz[0] + quiz[1] + quiz[2], sus_items: sus.join(" "), sus_score: susScore };
    backup.surveys.push(r); keepBackup(s);
    send("survey", s, r);
  }

  function toCSV(list) {
    const keys = [...new Set(list.flatMap((r) => Object.keys(r)))];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return "﻿" + [keys.join(","), ...list.map((r) => keys.map((k) => q(r[k])).join(","))].join("\n");
  }
  function download(s) {
    for (const [name, list] of [["tasks", backup.tasks], ["surveys", backup.surveys]]) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([toCSV(list.map((r) => Object.assign({ pid: s.pid, cell: s.cell }, r)))], { type: "text/csv" }));
      a.download = `${s.pid}_${name}.csv`; a.click();
    }
  }

  run();
})();
