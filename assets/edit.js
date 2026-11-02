// โหมดแก้ไขข้อความบนหน้าเว็บ (เฉพาะแอดมินที่ล็อกอินอยู่ · site.js โหลดไฟล์นี้ตอนกด "แก้ไขข้อความ")
// กดที่ข้อความที่มีกรอบประ แล้วพิมพ์แก้ได้เลย กด "บันทึก" ลูกค้าจะเห็นข้อความใหม่ทันที
// ข้อความเก็บแยกภาษาไทย / อังกฤษ และเหลือได้แค่ตัวหนา ตัวเอียง ขึ้นบรรทัดใหม่ (ใส่ลิงก์หรือโค้ดไม่ได้)
(function () {
  const X = window.DirekairText;
  if (!X || window.DirekairEdit) return;
  const API = window.DIREKAIR_API;
  const LANG_NAME = X.LANG === "en" ? "หน้าภาษาอังกฤษ" : "หน้าภาษาไทย";
  const MULTILINE = new Set(["H1", "H2", "P", "BLOCKQUOTE", "DIV"]);
  const els = () => [...document.querySelectorAll("[data-edit]")];

  let bar, statusEl, resetBtn, saveBtn, current = null;
  let startHtml = new Map();   // ข้อความตอนเริ่มแก้ (ไว้เทียบว่าแก้อะไรไปบ้าง และกดยกเลิก)
  let openedDetails = [];

  const clean = el => {
    const box = document.createElement("div");
    box.append(X.safeNodes(el.innerHTML.replace(/&nbsp;/g, " ")));
    while (box.lastChild && box.lastChild.nodeName === "BR") box.lastChild.remove(); // เบราว์เซอร์มักเติม <br> ท้ายข้อความ
    return box.innerHTML.trim();
  };
  const saved = () => ((X.texts && X.texts[X.LANG]) || {});
  const isCustom = k => Object.prototype.hasOwnProperty.call(saved(), k);
  const changed = () => els().filter(el => clean(el) !== startHtml.get(el.dataset.edit));

  function toast(msg) {
    let t = document.querySelector(".edit-toast");
    if (!t) { t = document.createElement("div"); t.className = "edit-toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 3000);
  }

  function refresh() {
    const n = changed().length;
    els().forEach(el => el.classList.toggle("edit-dirty", clean(el) !== startHtml.get(el.dataset.edit)));
    statusEl.textContent = n ? `แก้แล้ว ${n} จุด ยังไม่ได้บันทึก` : "กดที่ข้อความที่มีกรอบเพื่อแก้";
    saveBtn.disabled = !n;
    resetBtn.disabled = !current || (clean(current) === X.orig.get(current.dataset.edit));
  }

  // คลิกในโหมดแก้ไข: ไม่เปิดลิงก์ / ไม่พับคำถาม FAQ
  function blockClicks(e) {
    if (e.target.closest(".edit-bar, .edit-toast")) return;
    if (e.target.closest("a, summary")) e.preventDefault();
  }
  function onKey(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.shiftKey || MULTILINE.has(e.currentTarget.tagName)) document.execCommand("insertLineBreak");
  }
  function onPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain").replace(/\s+/g, " ");
    document.execCommand("insertText", false, text);
  }
  function onFocus(e) { current = e.currentTarget; refresh(); }
  function warnLeave(e) { if (changed().length) { e.preventDefault(); e.returnValue = ""; } }

  function buildBar() {
    bar = document.createElement("div");
    bar.className = "edit-bar";
    bar.innerHTML = `
      <div class="edit-info"><b>โหมดแก้ไขข้อความ · ${LANG_NAME}</b><span class="edit-status"></span></div>
      <div class="edit-actions">
        <button type="button" class="btn btn-ghost" data-act="reset" title="ใช้ข้อความเดิมของเว็บสำหรับจุดที่เลือกอยู่">คืนค่าเดิม</button>
        <button type="button" class="btn btn-ghost" data-act="cancel">ยกเลิก</button>
        <button type="button" class="btn btn-primary" data-act="save">บันทึก</button>
      </div>`;
    statusEl = bar.querySelector(".edit-status");
    resetBtn = bar.querySelector('[data-act="reset"]');
    saveBtn = bar.querySelector('[data-act="save"]');
    resetBtn.addEventListener("mousedown", e => e.preventDefault()); // ไม่ให้ข้อความที่เลือกอยู่หลุดโฟกัส
    resetBtn.addEventListener("click", () => {
      if (!current) return;
      X.setText(current, X.orig.get(current.dataset.edit));
      refresh();
    });
    bar.querySelector('[data-act="cancel"]').addEventListener("click", () => {
      if (changed().length && !confirm("ยกเลิกข้อความที่แก้ไว้ทั้งหมด?")) return;
      stop();
    });
    saveBtn.addEventListener("click", save);
    document.body.append(bar);
  }

  async function save() {
    const list = changed();
    if (!list.length) return;
    const texts = {};
    list.forEach(el => {
      const k = el.dataset.edit, html = clean(el);
      // ว่างเปล่า หรือเหมือนข้อความเดิมของเว็บ = ใช้ข้อความเดิม
      texts[k] = !el.textContent.trim() || html === X.orig.get(k) ? null : html;
    });
    saveBtn.disabled = true; saveBtn.textContent = "กำลังบันทึก…";
    let token = null;
    try { token = localStorage.getItem(X.TOKEN_KEY); } catch {}
    try {
      const res = await fetch(API + "/texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ lang: X.LANG, texts }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่ที่หน้าแอดมิน แล้วกลับมาแก้อีกครั้ง");
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ กรุณาลองใหม่");
      if (window.DirekairSettings) window.DirekairSettings.texts = data.texts;
      X.remember(data.texts);
      stop(data.texts);
      toast(`บันทึกแล้ว ${list.length} จุด ✅ ลูกค้าเห็นข้อความใหม่แล้ว`);
    } catch (err) {
      toast(err.message === "Failed to fetch" ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่" : err.message);
      saveBtn.disabled = false;
    } finally { saveBtn.textContent = "บันทึก"; }
  }

  function start() {
    if (document.body.classList.contains("editing")) return;
    document.body.classList.add("editing");
    startHtml = new Map(els().map(el => [el.dataset.edit, clean(el)]));
    // เปิดคำตอบ FAQ ทุกข้อ ให้แก้ได้
    openedDetails = [...document.querySelectorAll("details:not([open])")];
    openedDetails.forEach(d => { d.open = true; });
    els().forEach(el => {
      el.contentEditable = "true"; el.spellcheck = false;
      el.classList.toggle("edit-custom", isCustom(el.dataset.edit));
      el.addEventListener("keydown", onKey);
      el.addEventListener("paste", onPaste);
      el.addEventListener("focus", onFocus);
      el.addEventListener("input", refresh);
    });
    document.addEventListener("click", blockClicks, true);
    window.addEventListener("beforeunload", warnLeave);
    if (!bar) buildBar();
    bar.hidden = false;
    current = null;
    refresh();
    toast("กดที่ข้อความที่มีกรอบประ แล้วพิมพ์แก้ได้เลย");
  }

  function stop(texts) {
    els().forEach(el => {
      el.removeAttribute("contenteditable");
      el.classList.remove("edit-dirty", "edit-custom");
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("paste", onPaste);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("input", refresh);
    });
    document.removeEventListener("click", blockClicks, true);
    window.removeEventListener("beforeunload", warnLeave);
    openedDetails.forEach(d => { d.open = false; });
    document.body.classList.remove("editing");
    if (bar) bar.hidden = true;
    current = null;
    // แสดงข้อความตามที่บันทึกไว้ (ยกเลิก = กลับไปเป็นข้อความก่อนแก้)
    X.apply(texts === undefined ? X.texts : texts);
    if (new URLSearchParams(location.search).has("edit")) history.replaceState(null, "", location.pathname + location.hash);
  }

  window.DirekairEdit = { start, stop };
})();
