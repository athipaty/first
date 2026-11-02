// สคริปต์ร่วมของเว็บดิเรกแอร์ (หน้าไทย / และหน้าอังกฤษ /en/)
// ข้อความที่สคริปต์สร้างเองเลือกตามภาษาของหน้า (<html lang="th"> หรือ "en")
const LANG = document.documentElement.lang === "en" ? "en" : "th";
const T = {
  th: {
    workAlt: "ผลงานดิเรกแอร์",
    manage: "จัดการรูปผลงาน",
    loginFail: "เข้าสู่ระบบไม่สำเร็จ",
    wrongPw: "รหัสผ่านไม่ถูกต้อง",
    tooMany: "ใส่รหัสผิดหลายครั้งเกินไป กรุณารอ 15 นาที",
    netErr: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่",
    mobile: "มือถือ",
    cats: { all: "ทั้งหมด", aircon: "แอร์รถยนต์", carryboy: "หลังคา Carryboy", tint: "ฟิล์ม", audio: "เครื่องเสียง", other: "อื่น ๆ" },
    before: "ก่อนทำ", after: "หลังทำ", beforeAfter: "ก่อน / หลัง",
    heroAlt: "ผลงานของร้านดิเรกแอร์",
    closeAnnounce: "ปิดประกาศ",
    yearOffset: 543, // พ.ศ.
  },
  en: {
    workAlt: "Direk Air work",
    manage: "Manage photos",
    loginFail: "Login failed",
    wrongPw: "Wrong password",
    tooMany: "Too many wrong attempts. Please wait 15 minutes.",
    netErr: "Can't reach the server. Please try again.",
    mobile: "mobile",
    cats: { all: "All", aircon: "Car air-con", carryboy: "Carryboy", tint: "Tint", audio: "Audio", other: "Other" },
    before: "Before", after: "After", beforeAfter: "Before / after",
    heroAlt: "Work by Direk Air",
    closeAnnounce: "Close announcement",
    yearOffset: 0,
  },
}[LANG];

// ===== ตั้งค่าข้อมูลร้าน: แก้ตรงนี้ที่เดียว =====
const SHOP = {
  lineUrl: "https://line.me/ti/p/AmpMNXVQ-_", // ลิงก์เพิ่มเพื่อน LINE ของร้าน (จาก QR Code)
  phone: "038-285-061",    // เบอร์ร้าน (Yellow Pages / Autoinfo) ใช้กับปุ่ม "โทร" ทั้งหมด
};

const lineUrl = SHOP.lineUrl;
const telHref = n => "tel:" + n.replace(/[^0-9+]/g, "");

document.querySelectorAll(".js-line").forEach(a => { a.href = lineUrl; a.target = "_blank"; a.rel = "noopener"; });
document.querySelectorAll(".js-tel").forEach(a => { a.href = telHref(SHOP.phone); });
document.getElementById("year").textContent = new Date().getFullYear() + T.yearOffset;

// เมนูมือถือ
const nav = document.getElementById("nav");
document.getElementById("menuBtn").addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

// แกลเลอรีผลงาน: โหลดรูปจากเซิร์ฟเวอร์ (จัดการรูปที่ /admin)
// กรองตามประเภทงานได้ และรูปที่มี "ก่อนทำ" สลับดูก่อน/หลังในหน้าต่างรูปใหญ่
const GALLERY_INITIAL = 6;
const CAT_ORDER = ["aircon", "carryboy", "tint", "audio", "other"];
fetch(window.DIREKAIR_API + "/gallery").then(r => r.ok ? r.json() : []).then(photos => {
  if (!Array.isArray(photos) || !photos.length) return;
  const grid = document.getElementById("galleryGrid");
  const box = document.getElementById("lightbox");
  const boxImg = box.querySelector("img"), boxCap = box.querySelector("p");
  const ba = document.getElementById("lightboxBA");
  const more = document.getElementById("galleryMore");
  let filter = "all", expanded = false;

  function openPhoto(p, alt) {
    const show = which => {
      boxImg.src = which === "before" ? p.beforeUrl : p.url;
      ba.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ba === which)));
    };
    boxImg.alt = alt;
    boxCap.textContent = p.caption || "";
    ba.hidden = !p.beforeUrl;
    ba.querySelectorAll("button").forEach(b => { b.onclick = () => show(b.dataset.ba); });
    show("after");
    box.showModal();
  }
  function render() {
    const list = photos.filter(p => filter === "all" || (p.category || "other") === filter);
    grid.replaceChildren(...list.map((p, i) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "g-item";
      item.hidden = !expanded && i >= GALLERY_INITIAL;
      const img = document.createElement("img");
      img.src = p.url; img.alt = p.caption || T.workAlt; img.loading = "lazy";
      item.append(img);
      if (p.beforeUrl) {
        const tag = document.createElement("span");
        tag.className = "ba-tag"; tag.textContent = T.beforeAfter;
        item.append(tag);
      }
      if (p.caption) {
        const cap = document.createElement("div");
        cap.className = "cap"; cap.textContent = p.caption;
        item.append(cap);
      }
      item.addEventListener("click", () => openPhoto(p, img.alt));
      return item;
    }));
    more.hidden = expanded || list.length <= GALLERY_INITIAL;
  }
  // ปุ่มกรอง: แสดงเฉพาะเมื่อมีรูปมากกว่า 1 ประเภท
  const used = CAT_ORDER.filter(c => photos.some(p => (p.category || "other") === c));
  const bar = document.getElementById("galleryFilters");
  if (used.length > 1) {
    bar.replaceChildren(...["all", ...used].map(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = T.cats[c];
      b.setAttribute("aria-pressed", String(c === filter));
      b.addEventListener("click", () => {
        filter = c; expanded = false;
        bar.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        render();
      });
      return b;
    }));
    bar.hidden = false;
  }
  box.addEventListener("click", e => { if (e.target === box) box.close(); });
  more.querySelector("button").addEventListener("click", () => { expanded = true; render(); });
  render();
  document.getElementById("gallery").hidden = false;
  document.getElementById("galleryNav").hidden = false;
}).catch(() => {});

// ปุ่ม "เข้าสู่ระบบ" ในเมนู: เปิดการ์ดล็อกอิน แล้วไปหน้าจัดการรูป (/admin.html)
// ใช้ token key เดียวกับ admin.html จึงไม่ต้องล็อกอินซ้ำ
const TOKEN_KEY = "direkair_admin_token";
const loginNav = document.getElementById("loginNav");
const loginDialog = document.getElementById("loginDialog");
const loginError = document.getElementById("loginError");
let hasToken = false;
try { hasToken = !!localStorage.getItem(TOKEN_KEY); } catch {}
if (hasToken) loginNav.querySelector("span").textContent = T.manage;
loginNav.addEventListener("click", e => {
  if (hasToken || typeof loginDialog.showModal !== "function") return; // ไปหน้าแอดมินตามลิงก์ปกติ
  e.preventDefault();
  loginError.textContent = "";
  loginDialog.showModal();
  document.getElementById("loginPassword").focus();
});
document.getElementById("loginCancel").addEventListener("click", () => loginDialog.close());
loginDialog.addEventListener("click", e => { if (e.target === loginDialog) loginDialog.close(); });
document.getElementById("loginCardForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("loginSubmit");
  btn.disabled = true; loginError.textContent = "";
  try {
    const res = await fetch(window.DIREKAIR_API + "/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("loginPassword").value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) throw new Error(res.status === 401 ? T.wrongPw : res.status === 429 ? T.tooMany : (data.error || T.loginFail));
    try { localStorage.setItem(TOKEN_KEY, data.token); } catch {}
    location.href = "/admin.html";
  } catch (err) {
    loginError.textContent = err.message === "Failed to fetch" ? T.netErr : err.message;
    btn.disabled = false;
  }
});

// ===== ข้อมูลร้านที่แก้ได้จากหน้าแอดมิน (เบอร์ เวลาทำการ ประกาศ) =====
// ถ้ายังไม่ได้ตั้งค่า หน้าเว็บใช้ข้อความเดิมใน HTML
const thaiToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
function applyShopInfo(d) {
  if (!d) return;
  if (Array.isArray(d.phones) && d.phones.length) {
    SHOP.phone = d.phones[0].number;
    document.querySelectorAll(".js-tel").forEach(a => { a.href = telHref(SHOP.phone); });
    document.querySelectorAll('[data-shop="phone"]').forEach(el => { el.textContent = SHOP.phone; });
    const shops = d.phones.filter(p => p.type !== "mobile"), mobiles = d.phones.filter(p => p.type === "mobile");
    const link = p => { const a = document.createElement("a"); a.href = telHref(p.number); a.textContent = p.number; return a; };
    document.querySelectorAll('[data-shop="phones"]').forEach(box => {
      const parts = [];
      shops.forEach((p, i) => { if (i) parts.push(", "); parts.push(link(p)); });
      mobiles.forEach((p, i) => {
        if (parts.length || i) parts.push(document.createElement("br"));
        const lab = document.createElement("span"); lab.textContent = " (" + T.mobile + ")";
        parts.push(link(p), lab);
      });
      box.replaceChildren(...parts);
    });
  }
  if (d.hours && d.hours.th) {
    const h = LANG === "en" ? (d.hours.en || d.hours.th) : d.hours.th;
    document.querySelectorAll('[data-shop="hours"]').forEach(el => { el.textContent = h; });
  }
  // รูปหลักด้านบนของหน้า (เลือกจากรูปผลงานในหน้าแอดมิน) แทนภาพวาดรถ
  const hero = document.querySelector(".hero-visual");
  if (hero && d.heroPhoto && d.heroPhoto.url) {
    let img = hero.querySelector("img.hero-photo");
    if (!img) {
      img = document.createElement("img");
      img.className = "hero-photo"; img.alt = T.heroAlt; img.decoding = "async";
      hero.prepend(img);
    }
    img.src = d.heroPhoto.url;
    hero.classList.add("has-photo");
  }
  const bar = document.getElementById("announce");
  const a = d.announcement;
  if (bar && a && a.enabled) {
    const text = LANG === "en" ? (a.en || a.th) : a.th;
    const key = text + "|" + a.until;
    let closed = null;
    try { closed = localStorage.getItem("direkair_announce_closed"); } catch {}
    if (text && (!a.until || thaiToday() <= a.until) && closed !== key) {
      document.getElementById("announceText").textContent = text;
      const btn = document.getElementById("announceClose");
      btn.setAttribute("aria-label", T.closeAnnounce);
      btn.onclick = () => { bar.hidden = true; try { localStorage.setItem("direkair_announce_closed", key); } catch {} };
      bar.hidden = false;
    }
  }
}
if (window.DirekairSettings) applyShopInfo(window.DirekairSettings);
document.addEventListener("direkair:settings", e => applyShopInfo(e.detail));

// ===== สถิติ (นับจำนวนอย่างเดียว ไม่เก็บข้อมูลส่วนตัว) =====
// ไม่นับตอนแอดมินล็อกอินอยู่ และไม่นับในกรอบตัวอย่างของหน้าแอดมิน
function track(event) {
  if (hasToken || (window.DirekairThemes && window.DirekairThemes.preview)) return;
  const url = window.DIREKAIR_API + "/track";
  const body = JSON.stringify({ event, lang: LANG });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
  } catch {}
  fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body, keepalive: true }).catch(() => {});
}
(() => {
  // นับผู้เข้าชมครั้งเดียวต่อเบราว์เซอร์ต่อวัน
  let last = null;
  try { last = localStorage.getItem("direkair_visit_day"); } catch {}
  if (last !== thaiToday()) {
    try { localStorage.setItem("direkair_visit_day", thaiToday()); } catch {}
    track("visit");
  }
})();
document.addEventListener("click", e => {
  const el = e.target.closest("a");
  if (!el) return;
  if (el.matches('.js-tel, a[href^="tel:"]')) track("call");
  else if (el.matches(".js-line")) track("line");
  else if (el.matches(".map-link")) track("map");
});
