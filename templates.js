// 시각 구조 템플릿 2종.
// AI 전형형은 생성형 AI가 만든 페이지(코딩에 쓴 10개 중 ChatGPT 생성 gpt05)의 구조와 스타일을 그대로 쓰고,
// 위계 설계형은 같은 스타일(색, 글꼴, 첫 화면, 목업, 버튼, 신청 영역)을 유지한 채 본문 배치만 위계 원칙으로 바꾼다.
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 서비스별 브랜드 색(조건과 관계없이 서비스마다 고정)
  const ACCENT = { schedule: "#4169f5", inventory: "#1f8a62", accounting: "#e0661b", support: "#7b4cf0" };

  // ---------- 두 조건 공통 요소(원본 페이지 그대로)
  const nav = (brand) => `
    <header class="nav">
      <span class="brand"><span class="brand-mark">↗</span>${esc(brand)}</span>
      <nav class="nav-links"><a href="#" data-nolink>기능</a><a href="#" data-nolink>사용 방법</a><a href="#" data-nolink>요금제</a><a href="#" data-nolink>FAQ</a><a class="nav-cta" href="#" data-nolink>로그인</a></nav>
    </header>`;
  const kicker = (t) => `<span class="kicker">${t}</span>`;
  const ICONS = ["▦", "◷", "◎", "◇", "✎", "⌁"];
  const heroTitle = (t) => {
    const w = String(t).split(" ");
    const k = Math.max(1, Math.min(2, w.length - 2));
    return `${esc(w.slice(0, -k).join(" "))}<br><em>${esc(w.slice(-k).join(" "))}</em>`;
  };

  // 서비스별 제품 화면 목업(과업 정답과 관계없는 장식용 내용)
  const MOCK = {
    schedule: { side: ["내 일정", "팀 캘린더", "회의실", "설정"], title: "이번 주 팀 캘린더", float: ["회의 3건 예약 완료", "●●●●○ 80%"], body: () => `
      <div class="cols">${[["월", [["주간 회의", "10:00", ""], ["디자인 리뷰", "14:00", "green"]]], ["수", [["스프린트 계획", "09:30", "orange"], ["1:1 면담", "16:00", ""]]], ["금", [["회고", "15:00", "green"], ["주간 정리", "17:00", ""]]]]
        .map(([d, evs]) => `<div class="col"><p class="col-name">${d}요일 <span class="count">0${evs.length}</span></p>${evs.map((e) => `<div class="task"><div class="task-title">${e[0]}</div><span class="tag ${e[2]}">${e[1]}</span></div>`).join("")}</div>`).join("")}</div>` },
    inventory: { side: ["재고 현황", "입고", "매장", "보고서"], title: "강남점 재고 현황", float: ["부족 상품 2개 알림", "담당자에게 보냈어요"], body: () => `
      <table class="m-tb"><tr><th>상품</th><th>수량</th><th>상태</th></tr>${[["무선 이어폰", "128", "green", "정상"], ["충전 케이블", "9", "orange", "부족"], ["보조배터리", "54", "green", "정상"], ["휴대폰 케이스", "6", "orange", "부족"], ["스마트 워치 줄", "31", "green", "정상"]]
        .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tag ${r[2]}">${r[3]}</span></td></tr>`).join("")}</table>` },
    accounting: { side: ["장부", "카드 내역", "영수증", "신고 자료"], title: "10월 카드 내역", float: ["영수증 12장 정리", "분류 완료 96%"], body: () => `
      <table class="m-tb"><tr><th>거래처</th><th>분류</th><th>금액</th></tr>${[["카페 모모", "식비", "6,500원"], ["택시", "교통비", "12,300원"], ["사무용품몰", "비품", "48,000원"], ["클라우드 서버", "운영비", "220,000원"], ["문구점", "비품", "8,900원"]]
        .map((r) => `<tr><td>${r[0]}</td><td><span class="tag">${r[1]}</span></td><td>${r[2]}</td></tr>`).join("")}</table>` },
    support: { side: ["받은 문의", "내 담당", "답변 템플릿", "통계"], title: "받은 문의 24건", float: ["평균 첫 응답 4분", "오늘 31건 처리"], body: () => `
      ${[["채팅", "배송이 아직 안 왔어요", "2분 전", "민"], ["메일", "교환 절차가 궁금합니다", "15분 전", "서"], ["전화", "주문 내역을 확인하고 싶어요", "32분 전", "준"], ["채팅", "쿠폰이 적용되지 않아요", "1시간 전", "민"]]
        .map((r) => `<div class="task row"><span class="tag">${r[0]}</span><div class="task-title">${r[1]}</div><span class="task-foot">${r[2]}</span><span class="avatar">${r[3]}</span></div>`).join("")}` }
  };
  const mockup = (svcKey, brand) => {
    const m = MOCK[svcKey] || MOCK.schedule;
    return `
      <div class="app-frame" aria-hidden="true">
        <div class="app-top"><i class="dot"></i><i class="dot"></i><i class="dot"></i><span class="app-title">${esc(brand)} 워크스페이스</span></div>
        <div class="app-layout">
          <aside class="side"><div class="side-label">워크스페이스</div>${m.side.map((s, i) => `<div class="side-item ${i === 0 ? "active" : ""}">${s}</div>`).join("")}</aside>
          <div class="board"><div class="board-head"><strong>${m.title}</strong><div class="avatars"><span class="avatar">민</span><span class="avatar">준</span><span class="avatar">서</span></div></div>${m.body()}</div>
        </div>
        <div class="float-note">${m.float[0]} <b>${m.float[1]}</b></div>
      </div>`;
  };

  const hero = (svc, c) => `
    <section class="hero"><div class="hero-grid">
      <div>
        <span class="eyebrow"><i></i> ${esc(svc.category)}</span>
        <h1>${heroTitle(c.hero.title)}</h1>
        <p class="hero-copy">${esc(c.hero.body)}</p>
        <div class="hero-actions"><button class="btn" data-go="contact">상담 문의 <span>→</span></button><a class="text-link" href="#" data-nolink>기능 살펴보기 ↓</a></div>
        <p class="microcopy">가입은 1분이면 충분합니다.</p>
      </div>
      ${mockup(svc.key, svc.brand)}
    </div></section>`;

  // 마지막 신청 영역(T3 목표인 데모 신청은 여기에만 있다)
  // 행동 선택지: 이름과 설명 문장은 두 조건이 같고, 배치와 위계만 다르다(T3 목표는 주 행동인 무료 체험)
  const ACTIONS = [
    { go: "trial", name: "무료 체험", desc: "가입하고 바로 직접 써 봅니다." },
    { go: "contact", name: "상담 문의", desc: "요금과 도입 조건을 담당자와 이야기합니다." },
    { go: "demo", name: "데모 신청", desc: "담당자가 화면을 보여 주며 사용법을 30분 동안 설명합니다." }
  ];
  // AI 전형형: 맨 아래에만, 같은 모양 카드 3개를 가운데 정렬로 나란히(E2, E4)
  const ctaAI = (c) => `
    <section class="section cta-ai" id="start">
      <div class="section-head">${kicker("시작하기")}<h2>${esc(c.cta.heading)}</h2><p>${esc(c.cta.body)}</p></div>
      <div class="actions">${ACTIONS.map((a, i) => `<article class="feature"><div class="feature-icon">${["→", "☏", "▶"][i]}</div><h3>${a.name}</h3><p>${a.desc}</p><button class="plan-btn" data-go="${a.go}">${a.name}</button></article>`).join("")}</div>
    </section>`;
  // 위계 설계형: 주 행동(무료 체험)은 크게, 보조 행동은 설명과 함께 작은 목록으로(E2)
  const ctaH = (c) => `
    <section class="cta"><div class="cta-box">
      <div class="cta-copy">${kicker("시작하기")}<h2>${esc(c.cta.heading)}</h2><p>${esc(c.cta.body)}</p></div>
      <div class="cta-actions">
        <div class="cta-primary"><b>${ACTIONS[0].name}</b><p>${ACTIONS[0].desc}</p><button class="btn cta-main" data-go="trial">${ACTIONS[0].name} →</button></div>
        <div class="cta-secondary">${ACTIONS.slice(1).map((a) => `<button class="choice-btn" data-go="${a.go}"><b>${a.name}</b><span>${a.desc}</span></button>`).join("")}</div>
      </div>
    </div></section>`;
  const footer = (brand) => `<footer class="footer"><span class="brand"><span class="brand-mark">↗</span>${esc(brand)}</span><span>© 2026 ${esc(brand)}. 가상의 서비스입니다.</span></footer>`;

  // ---------- AI 전형형: 원본 구조(E2 균일한 카드 그리드, E3 섹션 간 동일 여백, E4 가운데 제목 + 같은 카드 그리드를 모든 섹션에 반복)
  function renderAI(svc, c) {
    const head = (k, h, p) => `<div class="section-head">${kicker(k)}<h2>${esc(h)}</h2><p>${esc(p)}</p></div>`;
    const P = c.pricing;
    return `
      <div class="page ai" style="--blue:${ACCENT[svc.key]}">
        ${nav(svc.brand)}
        ${hero(svc, c)}
        <section class="section" id="features">${head("핵심 기능", c.features.heading, c.features.lead)}
          <div class="features">${c.features.items.map((f, i) => `<article class="feature"><div class="feature-icon">${ICONS[i % 6]}</div><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></article>`).join("")}</div></section>
        <section class="section how" id="how">${head("작동 방식", c.steps.heading, c.steps.lead)}
          <div class="steps">${c.steps.items.map((s, i) => `<article class="feature"><div class="feature-icon step-no">0${i + 1}</div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></article>`).join("")}</div></section>
        <section class="section" id="pricing">${head("요금제", P.heading, P.lead)}
          <div class="pricing">${P.plans.map((p) => `<article class="price-card"><h3>${esc(p.name)}</h3><p class="plan-copy">${esc(p.label)}</p><p class="plan-body">${esc(p.body)}</p>
            <ul class="plan-list">${p.limits.map((l) => `<li>${esc(l)}</li>`).join("")}${P.featNames.map((n, i) => (p.flags[i] ? `<li>${esc(n)}</li>` : "")).join("")}</ul>
            <button class="plan-btn" data-go="plan">시작하기</button></article>`).join("")}</div></section>
        <section class="section faq" id="faq">${head("FAQ", c.faq.heading, c.faq.lead)}
          <div class="faqs">${c.faq.items.map((i) => `<article class="feature"><div class="feature-icon">?</div><h3>${esc(i.q)}</h3><p>${esc(i.a)}</p></article>`).join("")}</div></section>
        ${ctaAI(c)}
        ${footer(svc.brand)}
      </div>`;
  }

  // ---------- 위계 설계형: 같은 스타일, 배치는 위계 원칙과 가독성 기준으로
  //  E2 -> 중요도에 따라 크기 차등(주요 기능 2개는 크게, 나머지는 목록), E3 -> 묶음 안 간격 < 묶음 사이 간격(FAQ는 주제별로 묶음),
  //  E4 -> 내용에 맞는 형식(요금은 항목별 비교표, 절차는 번호 목록), 왼쪽 정렬로 읽기 시작점 고정
  function renderH(svc, c) {
    const row = (id, k, h, p, body, cls = "") => `
        <section class="hi-row ${cls}" id="${id}">
          <div class="hi-label">${kicker(k)}<h2>${esc(h)}</h2><p>${esc(p)}</p></div>
          <div class="hi-body">${body}</div>
        </section>`;
    const f = c.features.items, P = c.pricing, Q = c.faq;
    const yes = '<span class="yes" aria-label="포함">✓</span>', no = '<span class="no" aria-label="미포함">없음</span>';
    return `
      <div class="page hi" style="--blue:${ACCENT[svc.key]}">
        ${nav(svc.brand)}
        ${hero(svc, c)}
        ${row("features", "핵심 기능", c.features.heading, c.features.lead, `
          <div class="hi-lead-feats">${f.slice(0, 2).map((x, i) => `<div><span class="hi-n">0${i + 1}</span><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div>`).join("")}</div>
          <div class="hi-sub-feats">${f.slice(2).map((x, i) => `<div><span class="hi-n">0${i + 3}</span><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div>`).join("")}</div>`)}
        ${row("how", "작동 방식", c.steps.heading, c.steps.lead, `
          <ol class="hi-steps">${c.steps.items.map((s, i) => `<li><span class="hi-n">${i + 1}</span><b>${esc(s.title)}</b><span>${esc(s.body)}</span></li>`).join("")}</ol>`, "tight")}
        ${row("pricing", "요금제", P.heading, P.lead, `
          <table class="hi-table">
            <thead><tr><th></th>${P.plans.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr></thead>
            <tbody>
              <tr class="key"><th>월 요금</th>${P.plans.map((p) => `<td>${esc(p.label)}</td>`).join("")}</tr>
              <tr class="desc"><th></th>${P.plans.map((p) => `<td>${esc(p.body)}</td>`).join("")}</tr>
              <tr class="grp"><th colspan="${P.plans.length + 1}">사용 한도</th></tr>
              ${P.limitNames.map((n, i) => `<tr><th>${esc(n)}</th>${P.plans.map((p) => `<td class="lim">${esc(p.limits[i])}</td>`).join("")}</tr>`).join("")}
              <tr class="grp"><th colspan="${P.plans.length + 1}">포함 기능</th></tr>
              ${P.featNames.map((n, i) => `<tr><th>${esc(n)}</th>${P.plans.map((p) => `<td>${p.flags[i] ? yes : no}</td>`).join("")}</tr>`).join("")}
              <tr class="act"><th></th>${P.plans.map(() => `<td><button class="hi-link" data-go="plan">시작하기 →</button></td>`).join("")}</tr>
            </tbody>
          </table>`)}
        ${row("faq", "FAQ", Q.heading, Q.lead, Q.groups.map((g, gi) => `
          <div class="hi-faq-group"><p class="hi-group">${esc(Q.groupNames[gi])}</p>
          <dl class="hi-faq">${g.map((i) => `<div><dt>${esc(Q.items[i].q)}</dt><dd>${esc(Q.items[i].a)}</dd></div>`).join("")}</dl></div>`).join(""))}
        ${ctaH(c)}
        ${footer(svc.brand)}
      </div>`;
  }

  // 버튼을 누르면 열리는 하위 화면(무료 체험이 T3의 목표)
  const SUBPAGES = {
    trial: { title: "무료 체험 시작", body: "이메일로 가입하면 체험이 시작됩니다." },
    contact: { title: "상담 문의", body: "담당자가 영업일 기준 1일 안에 연락드립니다." },
    demo: { title: "데모 신청", body: "원하는 날짜를 고르면 화면 공유로 데모를 진행합니다." },
    plan: { title: "요금제 선택", body: "요금제를 고르면 결제 정보를 입력하는 화면으로 넘어갑니다." }
  };
  function renderSub(key, brand, svcKey) {
    const p = SUBPAGES[key];
    return `<div class="page sub" style="--blue:${ACCENT[svcKey] || "#4169f5"}">${nav(brand)}<div class="sub-body">
      <button class="btn-ghost back" data-back>← 이전 화면으로</button>
      <h1>${esc(p.title)}</h1><p>${esc(p.body)}</p>
      <div class="fake-form"><label>이름<input disabled></label><label>이메일<input disabled></label></div></div></div>`;
  }

  // 연습 페이지: 두 템플릿과 다른 단순한 문서형 화면
  const pnav = (brand) => `<header class="nav"><span class="brand"><span class="brand-mark">한</span>${esc(brand)}</span><nav class="nav-links"><a href="#" data-nolink>이용 안내</a><a href="#" data-nolink>공지사항</a></nav></header>`;
  window.renderPractice = function (view) {
    const brand = window.PRACTICE.brand;
    if (view === "reserve") return `<div class="page sub" style="--blue:#5b6b7f">${pnav(brand)}<div class="sub-body">
      <button class="btn-ghost back" data-back>← 이전 화면으로</button>
      <h1>좌석 예약</h1><p>원하는 열람실과 시간을 고르면 좌석이 예약됩니다.</p></div></div>`;
    return `<div class="page practice" style="--blue:#5b6b7f">${pnav(brand)}
      <section class="pr-hero"><span class="eyebrow"><i></i> 학생 서비스</span><h1>한빛 도서관 열람실</h1>
        <p class="hero-copy">재학생이면 누구나 이용할 수 있는 열람실입니다. 좌석은 하루 최대 4시간까지 예약할 수 있고, 예약 후 15분 안에 입실하지 않으면 자동으로 취소됩니다.</p></section>
      <section class="pr-grid">
        <div class="pr-box"><h3>운영 시간</h3><p>평일 08:00부터 22:00까지</p><p>주말과 공휴일 10:00부터 17:00까지</p><p class="pr-note">시험 기간에는 별도로 공지합니다.</p></div>
        <div class="pr-box"><h3>이용 규칙</h3><p>열람실 안에서는 음식물을 먹을 수 없습니다.</p><p>통화는 복도에서 해 주세요.</p><p>노트북은 지정 좌석에서만 쓸 수 있습니다.</p></div>
        <div class="pr-box"><h3>바로 가기</h3><div class="pr-btns"><button class="btn-ghost" data-go="notice">공지사항</button><button class="btn-ghost" data-go="reserve">좌석 예약</button><button class="btn-ghost" data-go="lost">분실물 안내</button></div></div>
      </section>
      <footer class="footer"><span class="brand">${esc(brand)}</span><span>연습용 가상 페이지입니다.</span></footer>
    </div>`;
  };
  window.renderPracticeSub = function (view) {
    if (view === "reserve" || view === "main") return window.renderPractice(view);
    const t = { notice: "공지사항", lost: "분실물 안내" }[view];
    return `<div class="page sub" style="--blue:#5b6b7f">${pnav(window.PRACTICE.brand)}<div class="sub-body">
      <button class="btn-ghost back" data-back>← 이전 화면으로</button><h1>${t}</h1><p>등록된 글이 없습니다.</p></div></div>`;
  };

  // 조건 코드: 첫 글자 A/H = 시각 구조, 둘째 글자 G/S = 문구
  window.renderCondition = function (serviceKey, cond) {
    const svc = Object.assign({ key: serviceKey }, window.SERVICES[serviceKey]);
    const copy = svc.copy[cond[1] === "S" ? "specific" : "generic"];
    return cond[0] === "A" ? renderAI(svc, copy) : renderH(svc, copy);
  };
  window.renderSub = renderSub;
})();
