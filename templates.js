// 시각 구조 템플릿 2종. 같은 내용 데이터를 받아 레이아웃만 다르게 그린다.
// 색상, 글꼴, 이미지(제품 화면 목업, 아이콘, 로고 띠), 버튼 모양, 섹션 순서는 두 템플릿이 같다.
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 서비스별 브랜드 색(조건과 관계없이 서비스마다 고정)
  const ACCENT = { schedule: "#3b5bdb", inventory: "#1f7a5a", accounting: "#e8590c", support: "#7048e8" };

  // ---------- 두 조건 공통 요소
  const nav = (brand) => `
    <nav class="nav"><span class="logo"><span class="logo-mark">${esc(brand[0])}</span>${esc(brand)}</span>
      <span class="nav-links"><a href="#" data-nolink>기능</a><a href="#" data-nolink>작동 방식</a><a href="#" data-nolink>요금제</a><a href="#" data-nolink>자주 묻는 질문</a></span></nav>`;
  // 히어로에는 데모 신청을 두지 않는다(T3 목표는 마지막 신청 영역에만 있음)
  const heroButtons = () => `
    <div class="btns">
      <button class="btn primary-btn" data-go="trial">무료 체험</button>
      <button class="btn" data-go="contact">상담 문의</button>
    </div>`;
  const ctaButtons = () => `
    <div class="btns">
      <button class="btn" data-go="trial">무료 체험</button>
      <button class="btn" data-go="contact">상담 문의</button>
      <button class="btn" data-go="demo">데모 신청</button>
    </div>`;
  const ICONS = [
    '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/>'
  ];
  const TINTS = ["t-a", "t-mint", "t-peach"];
  const icon = (i = 0) => `<div class="icon ${TINTS[i % 3]}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[i % 3]}</svg></div>`;
  const num = (i) => `<div class="num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</div>`;
  const kicker = (t) => `<p class="kicker">${t}</p>`;
  // 제목의 마지막 두 어절을 브랜드 색으로 강조(문구 조건과 관계없이 같은 규칙)
  const heroTitle = (t) => {
    const w = String(t).split(" ");
    const k = Math.max(1, Math.min(2, w.length - 2));
    return `${esc(w.slice(0, -k).join(" "))}<br><em>${esc(w.slice(-k).join(" "))}</em>`;
  };

  // 서비스별 제품 화면 목업(과업 정답과 관계없는 장식용 내용)
  const MOCK = {
    schedule: { side: ["내 일정", "팀 캘린더", "회의실", "설정"], title: "이번 주 팀 캘린더", body: () => `
      <div class="m-cal">${["월", "화", "수", "목", "금"].map((d, i) => `<div class="m-day"><b>${d}</b>${[
        [["c1", "주간 회의", "10:00"], ["c2", "디자인 리뷰", "14:00"]],
        [["c3", "고객 미팅", "11:00"]],
        [["c1", "스프린트 계획", "09:30"], ["c2", "1:1 면담", "16:00"]],
        [["c2", "채용 인터뷰", "13:00"]],
        [["c3", "회고", "15:00"], ["c1", "주간 정리", "17:00"]]][i].map((e) => `<div class="m-ev ${e[0]}"><strong>${e[1]}</strong><span>${e[2]}</span></div>`).join("")}</div>`).join("")}</div>`, float: ["회의 3건을 잡았어요", "참석자 6명 일정 확인"] },
    inventory: { side: ["재고 현황", "입고", "매장", "보고서"], title: "강남점 재고 현황", body: () => `
      <table class="m-tb"><tr><th>상품</th><th>수량</th><th>상태</th></tr>${[
        ["무선 이어폰", "128", "ok", "정상"], ["충전 케이블", "9", "low", "부족"], ["보조배터리", "54", "ok", "정상"], ["휴대폰 케이스", "6", "low", "부족"], ["스마트 워치 줄", "31", "ok", "정상"]]
        .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="m-badge ${r[2]}">${r[3]}</span></td></tr>`).join("")}</table>`, float: ["부족 상품 2개 알림", "담당자에게 보냈어요"] },
    accounting: { side: ["장부", "카드 내역", "영수증", "신고 자료"], title: "10월 카드 내역", body: () => `
      <div class="m-kpis"><div><span>이번 달 지출</span><b>1,284,500원</b></div><div><span>분류 완료</span><b>96%</b></div></div>
      <table class="m-tb"><tr><th>거래처</th><th>분류</th><th>금액</th></tr>${[
        ["카페 모모", "식비", "6,500원"], ["택시", "교통비", "12,300원"], ["사무용품몰", "비품", "48,000원"], ["클라우드 서버", "운영비", "220,000원"]]
        .map((r) => `<tr><td>${r[0]}</td><td><span class="m-badge cat">${r[1]}</span></td><td>${r[2]}</td></tr>`).join("")}</table>`, float: ["영수증 12장 정리 완료", "부가세 자료 준비 중"] },
    support: { side: ["받은 문의", "내 담당", "답변 템플릿", "통계"], title: "받은 문의 24건", body: () => `
      <div class="m-inbox">${[
        ["채팅", "배송이 아직 안 왔어요", "2분 전", "민"], ["메일", "교환 절차가 궁금합니다", "15분 전", "서"], ["전화", "주문 내역을 확인하고 싶어요", "32분 전", "준"], ["채팅", "쿠폰이 적용되지 않아요", "1시간 전", "민"]]
        .map((r) => `<div class="m-msg"><span class="m-badge cat">${r[0]}</span><strong>${r[1]}</strong><span class="m-time">${r[2]}</span><i>${r[3]}</i></div>`).join("")}</div>`, float: ["평균 첫 응답 4분", "오늘 31건 처리"] }
  };
  const mockup = (svcKey, brand) => {
    const m = MOCK[svcKey] || MOCK.schedule;
    return `
    <div class="mock" aria-hidden="true">
      <div class="mock-top"><i></i><i></i><i></i><span>${esc(brand)} 워크스페이스</span></div>
      <div class="mock-body">
        <div class="mock-side">${m.side.map((s, i) => `<div class="${i === 0 ? "on" : ""}">${s}</div>`).join("")}</div>
        <div class="mock-main"><div class="mock-h">${m.title}<span class="m-av"><i>민</i><i>서</i><i>준</i></span></div>${m.body()}</div>
      </div>
      <div class="mock-float"><span class="dot">✓</span><div><b>${m.float[0]}</b><span>${m.float[1]}</span></div></div>
    </div>`;
  };
  const logos = () => `
    <div class="logos" aria-hidden="true"><span class="logos-label">여러 팀이 함께 쓰고 있어요</span>
      <span>NORTHWIND</span><span class="serif">한결상사</span><span>orbit.</span><span>바른물류</span><span class="wide">STUDIO M</span></div>`;
  const footer = (brand) => `<footer class="foot"><span class="logo"><span class="logo-mark">${esc(brand[0])}</span>${esc(brand)}</span><span>© 2026 ${esc(brand)}. 가상의 서비스입니다.</span></footer>`;

  // 히어로: 코딩 결과 E1(중앙 정렬 히어로)이 채택되지 않아 두 조건이 같은 좌우 분할 히어로를 쓴다
  const hero = (svc, c) => `
        <header class="split-hero">
          <div class="split-hero-text">
            <p class="pill"><i></i>${esc(svc.category)}</p>
            <h1>${heroTitle(c.hero.title)}</h1>
            <p class="lead">${esc(c.hero.body)}</p>
            ${heroButtons()}
          </div>
          ${mockup(svc.key, svc.brand)}
        </header>
        ${logos()}`;

  // ---------- AI 전형형(코딩 결과 채택 요소): E2 균일한 3열 카드, E3 섹션 간 동일 여백, E4 반복되는 섹션 구성
  function renderAI(svc, c) {
    const section = (id, k, h, lead, cards) => `
      <section class="ai-sec" id="${id}">
        ${kicker(k)}<h2>${esc(h)}</h2><p class="lead">${esc(lead)}</p>
        <div class="grid3">${cards}</div>
      </section>`;
    const card = (title, body, extra = "", deco = "") => `<div class="card">${deco}<h3>${esc(title)}</h3>${extra}<p>${esc(body)}</p></div>`;
    return `
      <div class="page ai" style="--accent:${ACCENT[svc.key]}">
        ${nav(svc.brand)}
        ${hero(svc, c)}
        ${section("features", "핵심 기능", c.features.heading, c.features.lead, c.features.items.map((i, k) => card(i.title, i.body, "", icon(k))).join(""))}
        ${section("steps", "작동 방식", c.steps.heading, c.steps.lead, c.steps.items.map((i, k) => card(i.title, i.body, "", num(k))).join(""))}
        ${section("pricing", "요금제", c.pricing.heading, c.pricing.lead, c.pricing.plans.map((p) => card(p.name, p.body, `<p class="plan-label">${esc(p.label)}</p>`)).join(""))}
        ${section("faq", "자주 묻는 질문", c.faq.heading, c.faq.lead, c.faq.items.map((i) => card(i.q, i.a, "", '<div class="q" aria-hidden="true">Q</div>')).join(""))}
        <section class="ai-sec ai-cta">${kicker("시작하기")}<h2>${esc(c.cta.heading)}</h2><p class="lead">${esc(c.cta.body)}</p>${ctaButtons()}</section>
        ${footer(svc.brand)}
      </div>`;
  }

  // ---------- 위계 설계형: 각 AI 전형 요소에 대응하는 위계 원칙
  //  E2 -> 중요도에 따라 카드 크기 차등, E3 -> 묶음 안 간격 < 묶음 사이 간격, E4 -> 내용에 맞는 형식(비교표, 목록)
  function renderH(svc, c) {
    const f = c.features.items;
    return `
      <div class="page hi" style="--accent:${ACCENT[svc.key]}">
        ${nav(svc.brand)}
        ${hero(svc, c)}

        <section class="hi-sec" id="features">
          <div class="hi-head">${kicker("핵심 기능")}<h2>${esc(c.features.heading)}</h2><p class="lead">${esc(c.features.lead)}</p></div>
          <div class="hi-feat">
            <div class="feat-main"><div class="feat-chart" aria-hidden="true">${[40, 62, 48, 75, 58, 90, 70].map((h) => `<i style="height:${h}%"></i>`).join("")}</div>${icon(0)}<h3>${esc(f[0].title)}</h3><p>${esc(f[0].body)}</p></div>
            <div class="feat-side">
              <div class="feat-small">${icon(1)}<div><h3>${esc(f[1].title)}</h3><p>${esc(f[1].body)}</p></div></div>
              <div class="feat-small">${icon(2)}<div><h3>${esc(f[2].title)}</h3><p>${esc(f[2].body)}</p></div></div>
            </div>
          </div>
        </section>

        <section class="hi-sec tight" id="steps">
          <div class="hi-head">${kicker("작동 방식")}<h2>${esc(c.steps.heading)}</h2><p class="lead">${esc(c.steps.lead)}</p></div>
          <ol class="hi-steps">${c.steps.items.map((s, k) => `<li>${num(k)}<strong>${esc(s.title)}</strong><span>${esc(s.body)}</span></li>`).join("")}</ol>
        </section>

        <section class="hi-sec" id="pricing">
          <div class="hi-head">${kicker("요금제")}<h2>${esc(c.pricing.heading)}</h2><p class="lead">${esc(c.pricing.lead)}</p></div>
          <table class="hi-table">
            <thead><tr><th></th>${c.pricing.plans.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr></thead>
            <tbody>
              <tr class="key"><th>요금 안내</th>${c.pricing.plans.map((p) => `<td>${esc(p.label)}</td>`).join("")}</tr>
              <tr><th>내용</th>${c.pricing.plans.map((p) => `<td>${esc(p.body)}</td>`).join("")}</tr>
            </tbody>
          </table>
        </section>

        <section class="hi-sec" id="faq">
          <div class="hi-head">${kicker("자주 묻는 질문")}<h2>${esc(c.faq.heading)}</h2><p class="lead">${esc(c.faq.lead)}</p></div>
          <dl class="hi-faq">${c.faq.items.map((i) => `<dt><span class="q" aria-hidden="true">Q</span>${esc(i.q)}</dt><dd>${esc(i.a)}</dd>`).join("")}</dl>
        </section>

        <section class="hi-sec hi-cta"><div>${kicker("시작하기")}<h2>${esc(c.cta.heading)}</h2><p class="lead">${esc(c.cta.body)}</p></div>${ctaButtons()}</section>
        ${footer(svc.brand)}
      </div>`;
  }

  // 버튼을 누르면 열리는 하위 화면(데모 신청은 T3의 목표)
  const SUBPAGES = {
    trial: { title: "무료 체험 시작", body: "이메일로 가입하면 체험이 시작됩니다." },
    contact: { title: "상담 문의", body: "담당자가 영업일 기준 1일 안에 연락드립니다." },
    demo: { title: "데모 신청", body: "원하는 날짜를 고르면 화면 공유로 데모를 진행합니다." }
  };
  function renderSub(key, brand, svcKey) {
    const p = SUBPAGES[key];
    return `<div class="page sub" style="--accent:${ACCENT[svcKey] || "#3b5bdb"}">${nav(brand)}<div class="sub-body">
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
    const svc = Object.assign({ key: serviceKey }, window.SERVICES[serviceKey]);
    const copy = svc.copy[cond[1] === "S" ? "specific" : "generic"];
    return cond[0] === "A" ? renderAI(svc, copy) : renderH(svc, copy);
  };
  window.renderSub = renderSub;
})();
