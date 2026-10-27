// 과업 단위 기록 스크립트. 모든 조건 화면에 같은 규칙을 적용한다.
//  - TEN: 상호작용 요소(링크, 버튼, 입력 요소) 클릭 + 뒤로 가기. 응답 선택 클릭 포함.
//  - 같은 요소를 0.5초 안에 다시 누르면 한 번으로 센다.
//  - 반응이 없는 영역 클릭은 TEN에서 빼고 따로 센다.
//  - 스크롤은 TEN에서 빼고 최대 스크롤 깊이(%)만 기록한다.
//  - 탭 이탈(다른 탭, 창 전환)은 횟수와 누적 시간을 기록한다.
window.TaskLogger = function (stageEl) {
  const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button]";
  const DEDUP_MS = 500;
  let rec = null;

  function now() { return performance.now(); }

  function onClick(e) {
    if (!rec) return;
    const el = e.target.closest(INTERACTIVE);
    const t = now();
    if (!el) { rec.nonInteractiveClicks++; rec.events.push({ t: t - rec.t0, type: "click-other" }); return; }
    if (el.closest("[data-panel-ignore]")) return; // 패널의 안내 영역
    if (el.hasAttribute("data-back")) return;      // 화면 안 뒤로 가기 버튼은 popstate에서 한 번만 센다
    if (rec.lastEl === el && t - rec.lastT < DEDUP_MS) { rec.lastT = t; return; }
    rec.lastEl = el; rec.lastT = t;
    rec.ten++;
    rec.events.push({ t: t - rec.t0, type: "click", target: el.dataset.go || el.dataset.choice || el.textContent.trim().slice(0, 20) });
  }
  function onScroll() {
    if (!rec) return;
    const max = stageEl.scrollHeight - stageEl.clientHeight;
    const depth = max > 0 ? (stageEl.scrollTop + stageEl.clientHeight) / stageEl.scrollHeight : 1;
    rec.maxScroll = Math.max(rec.maxScroll, Math.round(depth * 100));
  }
  function onVisibility() {
    if (!rec) return;
    if (document.hidden) { rec.hiddenSince = now(); rec.tabLeaves++; }
    else if (rec.hiddenSince) { rec.hiddenMs += now() - rec.hiddenSince; rec.hiddenSince = null; }
  }
  document.addEventListener("click", onClick, true);
  stageEl.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  return {
    stop() {
      document.removeEventListener("click", onClick, true);
      stageEl.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    },
    start(meta) {
      rec = Object.assign({}, meta, {
        t0: now(), ten: 0, backs: 0, nonInteractiveClicks: 0, maxScroll: 0, tabLeaves: 0, hiddenMs: 0,
        hiddenSince: null, lastEl: null, lastT: 0, events: [],
        windowW: window.innerWidth, windowH: window.innerHeight, ua: navigator.userAgent
      });
      onScroll();
    },
    back() { if (rec) { rec.backs++; rec.ten++; rec.events.push({ t: now() - rec.t0, type: "back" }); } },
    finish(result) {
      if (!rec) return null;
      if (rec.hiddenSince) { rec.hiddenMs += now() - rec.hiddenSince; rec.hiddenSince = null; }
      const r = rec; rec = null;
      return {
        participant: r.participant, cell: r.cell, position: r.position, condition: r.condition, service: r.service,
        task: r.task, result: result.code, answer: result.answer ?? "",
        tct_sec: +(result.elapsed / 1000).toFixed(2), ten: r.ten, back: r.backs,
        non_interactive_clicks: r.nonInteractiveClicks, max_scroll_pct: r.maxScroll,
        tab_leaves: r.tabLeaves, tab_hidden_sec: +(r.hiddenMs / 1000).toFixed(1),
        exclude_tab: r.hiddenMs >= ((window.CONFIG && window.CONFIG.TAB_EXCLUDE_SEC) || 10) * 1000 ? 1 : 0,
        window_w: r.windowW, window_h: r.windowH, events: JSON.stringify(r.events)
      };
    }
  };
};
