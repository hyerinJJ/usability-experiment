// 서버 통신. 기록은 브라우저에 먼저 쌓아 두고 순서대로 보내며, 연결이 끊기면 다시 시도한다.
window.API = (function () {
  const url = (window.CONFIG && window.CONFIG.ENDPOINT) || "";
  const QKEY = "exp_queue";
  let queue = [];
  try { queue = JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch (e) { queue = []; }
  let sending = false;
  const listeners = [];

  function save() { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (e) {} listeners.forEach((f) => f(queue.length)); }

  async function call(body) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok) { const err = new Error(j.error || "서버 오류"); err.server = true; throw err; }
    return j;
  }

  async function flush() {
    if (sending || !url) return;
    sending = true;
    while (queue.length) {
      try { await call(queue[0]); queue.shift(); save(); }
      catch (e) {
        if (e.server) { console.warn("서버가 거절한 기록", queue[0], e.message); queue.shift(); save(); continue; }
        sending = false; setTimeout(flush, 4000); return;
      }
    }
    sending = false;
  }

  function enqueue(body) { if (!url) return; queue.push(body); save(); flush(); }

  if (url && queue.length) flush();
  return {
    enabled: !!url, call, enqueue, flush,
    pending: () => queue.length,
    onChange: (f) => listeners.push(f)
  };
})();
