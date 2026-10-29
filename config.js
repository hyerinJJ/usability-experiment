// 실험 설정. 서버 주소만 바꾸면 된다.
window.CONFIG = {
  // Apps Script 웹 앱 배포 주소(https://script.google.com/macros/s/.../exec).
  // 비워 두면 서버 없이 브라우저에만 저장하고, 마지막 화면에서 파일로 내려받는다(시연용).
  ENDPOINT: "https://script.google.com/macros/s/AKfycbzCuTx7RAH30dzB7lmbzWQGItiRJ79scdF1VvPPtY06LU8ypWtVP3TRvdVFTIl6bm2x/exec",
  LIMIT_SEC: 90,          // 과업 제한시간
  MIN_WIDTH: 1280,        // 최소 창 가로 크기
  TAB_EXCLUDE_SEC: 10,    // 과업 중 탭 이탈이 이 시간 이상이면 분석에서 제외
  CONTACT: "인간공학실험 5조",   // 마지막 화면에 보이는 문의처
  // 참여 코드: 첫 화면에서 입력. "main"이면 본 실험, "pilot"이면 파일럿(대소문자 구분 없음)
  CODES: { "UX5": "main", "PILOT5": "pilot" }
};
