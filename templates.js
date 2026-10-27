// 시각 구조 템플릿 2종. 같은 내용 데이터를 받아 레이아웃만 다르게 그린다.
// 색상, 글꼴, 이미지, 버튼 모양, 섹션 순서는 두 템플릿이 같다.
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 두 조건이 공유하는 요소
  const nav = (brand) => `
    <nav class="nav"><span class="logo">${esc(brand)}</span>
      <span class="nav-links"><a href="#" data-nolink>기능</a><a href="#" data-nolink>요금제</a><a href="#" data-nolink>자주 묻는 질문</a></span></nav>`;
  const ctaButtons = () => `
    <div class="btns">
      <button class="btn" data-go="trial">무료 체험</button>
      <button class="btn" data-go="contact">상담 문의</button>
      <button class="btn" data-go="demo">데모 신청</button>
    </div>`;
  const illo = (cls = "") => `<div class="illo ${cls}" aria-hidden="true"><span></span><span></span><span></span></div>`;
  const icon = () => `<div class="icon" aria-hidden="true"></div>`;

  // AI 전형형: E1 중앙 정렬 히어로, E2 균일한 3열 카드, E3 섹션 간 동일 여백, E4 반복되는 섹션 구성
  function renderAI(svc, c) {
    const section = (id, h, lead, cards) => `
      <section class="ai-sec" id="${id}">
        <h2>${esc(h)}</h2><p class="lead">${esc(lead)}</p>
        <div class="grid3">${cards}</div>
      </section>`;
    const card = (title, body, extra = "") => `<div class="card">${icon()}<h3>${esc(title)}</h3>${extra}<p>${esc(body)}</p></div>`;
    return `
      <div class="page ai">
        ${nav(svc.brand)}
        <header class="ai-hero ai-sec">
          <p class="eyebrow">${esc(svc.category)}</p>
          <h1>${esc(c.hero.title)}</h1>
          <p class="lead">${esc(c.hero.body)}</p>
          ${ctaButtons()}
          ${illo("wide")}
        </header>
        ${section("features", c.features.heading, c.features.lead, c.features.items.map((i) => card(i.title, i.body)).join(""))}
        ${section("steps", c.steps.heading, c.steps.lead, c.steps.items.map((i) => card(i.title, i.body)).join(""))}
        ${section("pricing", c.pricing.heading, c.pricing.lead, c.pricing.plans.map((p) => card(p.name, p.body, `<p class="plan-label">${esc(p.label)}</p>`)).join(""))}
        ${section("faq", c.faq.heading, c.faq.lead, c.faq.items.map((i) => card(i.q, i.a)).join(""))}
        <section class="ai-sec ai-cta"><h2>${esc(c.cta.heading)}</h2><p class="lead">${esc(c.cta.body)}</p>${ctaButtons()}</section>
      </div>`;
  }

  // 위계 설계형: 각 AI 전형 요소에 대응하는 위계 원칙
  //  E1 -> 왼쪽 정렬로 읽기 시작점 고정, E2 -> 중요도에 따라 카드 크기 차등,
  //  E3 -> 묶음 안 간격 < 묶음 사이 간격, E4 -> 내용에 맞는 형식(비교표, 목록)
  function renderH(svc, c) {
    const f = c.features.items;
    return `
      <div class="page hi">
        ${nav(svc.brand)}
        <header class="hi-hero">
          <div class="hi-hero-text">
            <p class="eyebrow">${esc(svc.category)}</p>
            <h1>${esc(c.hero.title)}</h1>
            <p class="lead">${esc(c.hero.body)}</p>
            ${ctaButtons()}
          </div>
          ${illo("tall")}
        </header>

        <section class="hi-sec" id="features">
          <div class="hi-head"><h2>${esc(c.features.heading)}</h2><p class="lead">${esc(c.features.lead)}</p></div>
          <div class="hi-feat">
            <div class="feat-main">${illo("mini")}<h3>${esc(f[0].title)}</h3><p>${esc(f[0].body)}</p></div>
            <div class="feat-side">
              <div class="feat-small"><h3>${esc(f[1].title)}</h3><p>${esc(f[1].body)}</p></div>
              <div class="feat-small"><h3>${esc(f[2].title)}</h3><p>${esc(f[2].body)}</p></div>
            </div>
          </div>
        </section>

        <section class="hi-sec tight" id="steps">
          <div class="hi-head"><h2>${esc(c.steps.heading)}</h2><p class="lead">${esc(c.steps.lead)}</p></div>
          <ol class="hi-steps">${c.steps.items.map((s) => `<li><strong>${esc(s.title)}</strong><span>${esc(s.body)}</span></li>`).join("")}</ol>
        </section>

        <section class="hi-sec" id="pricing">
          <div class="hi-head"><h2>${esc(c.pricing.heading)}</h2><p class="lead">${esc(c.pricing.lead)}</p></div>
          <table class="hi-table">
            <thead><tr><th></th>${c.pricing.plans.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr></thead>
            <tbody>
              <tr class="key"><th>요금 안내</th>${c.pricing.plans.map((p) => `<td>${esc(p.label)}</td>`).join("")}</tr>
              <tr><th>내용</th>${c.pricing.plans.map((p) => `<td>${esc(p.body)}</td>`).join("")}</tr>
            </tbody>
          </table>
        </section>

        <section class="hi-sec" id="faq">
          <div class="hi-head"><h2>${esc(c.faq.heading)}</h2><p class="lead">${esc(c.faq.lead)}</p></div>
          <dl class="hi-faq">${c.faq.items.map((i) => `<dt>${esc(i.q)}</dt><dd>${esc(i.a)}</dd>`).join("")}</dl>
        </section>

        <section class="hi-sec hi-cta"><div><h2>${esc(c.cta.heading)}</h2><p class="lead">${esc(c.cta.body)}</p></div>${ctaButtons()}</section>
      </div>`;
  }

  // 버튼을 누르면 열리는 하위 화면(데모 신청은 T3의 목표)
  const SUBPAGES = {
    trial: { title: "무료 체험 시작", body: "이메일로 가입하면 체험이 시작됩니다." },
    contact: { title: "상담 문의", body: "담당자가 영업일 기준 1일 안에 연락드립니다." },
    demo: { title: "데모 신청", body: "원하는 날짜를 고르면 화면 공유로 데모를 진행합니다." }
  };
  function renderSub(key, brand) {
    const p = SUBPAGES[key];
    return `<div class="page sub">${nav(brand)}<div class="sub-body">
      <button class="btn back" data-back>이전 화면으로</button>
      <h1>${esc(p.title)}</h1><p class="lead">${esc(p.body)}</p>
      <div class="fake-form"><label>이름<input disabled></label><label>이메일<input disabled></label></div></div></div>`;
  }

  // 연습 페이지: 두 템플릿과 다른 단순한 문서형 화면
  window.renderPractice = function (view) {
    const brand = window.PRACTICE.brand;
    if (view === "reserve") return `<div class="page sub">${nav(brand)}<div class="sub-body">
      <button class="btn back" data-back>이전 화면으로</button>
      <h1>좌석 예약</h1><p class="lead">원하는 열람실과 시간을 고르면 좌석이 예약됩니다.</p></div></div>`;
    return `<div class="page practice">${nav(brand)}
      <div class="pr-body">
        <h1>한빛 도서관 열람실 안내</h1>
        <p>한빛 도서관 열람실은 재학생이면 누구나 이용할 수 있습니다. 좌석은 하루 최대 4시간까지 예약할 수 있으며, 예약 후 15분 안에 입실하지 않으면 자동으로 취소됩니다.</p>
        <h2>운영 시간</h2>
        <p>평일에는 08:00부터 22:00까지 운영합니다. 주말과 공휴일에는 10:00부터 17:00까지 운영하며, 시험 기간에는 별도로 공지합니다.</p>
        <h2>이용 규칙</h2>
        <p>열람실 안에서는 음식물을 먹을 수 없고, 통화는 복도에서 해 주세요. 노트북은 지정된 좌석에서만 사용할 수 있습니다.</p>
        <h2>예약</h2>
        <p>좌석 예약은 아래 버튼에서 할 수 있습니다.</p>
        <div class="btns"><button class="btn" data-go="notice">공지사항</button><button class="btn" data-go="reserve">좌석 예약</button><button class="btn" data-go="lost">분실물 안내</button></div>
      </div></div>`;
  };
  window.renderPracticeSub = function (view) {
    if (view === "reserve" || view === "main") return window.renderPractice(view);
    const t = { notice: "공지사항", lost: "분실물 안내" }[view];
    return `<div class="page sub">${nav(window.PRACTICE.brand)}<div class="sub-body">
      <button class="btn back" data-back>이전 화면으로</button><h1>${t}</h1><p class="lead">등록된 글이 없습니다.</p></div></div>`;
  };

  // 조건 코드: 첫 글자 A/H = 시각 구조, 둘째 글자 G/S = 문구
  window.renderCondition = function (serviceKey, cond) {
    const svc = window.SERVICES[serviceKey];
    const copy = svc.copy[cond[1] === "S" ? "specific" : "generic"];
    return cond[0] === "A" ? renderAI(svc, copy) : renderH(svc, copy);
  };
  window.renderSub = renderSub;
})();
