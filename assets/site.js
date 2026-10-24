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
    copied: "✅ คัดลอกข้อความจองคิวแล้ว",
    copyHint: "กด \"คัดลอกข้อความ\" หรือกดค้างที่ข้อความด้านล่างเพื่อคัดลอก",
    copiedShort: "คัดลอกข้อความแล้ว ",
    sendThis: "กรุณาส่งข้อความนี้ในแชท LINE ของร้าน:\n\n",
    dateLocale: "th-TH",
    yearOffset: 543, // พ.ศ.
    msg: ["📅 จองคิวรับบริการ", "ชื่อ", "เบอร์", "รุ่นรถ", "บริการ", "วันที่สะดวก", "หมายเหตุ"],
  },
  en: {
    workAlt: "Direk Air work",
    manage: "Manage photos",
    loginFail: "Login failed",
    wrongPw: "Wrong password",
    tooMany: "Too many wrong attempts. Please wait 15 minutes.",
    netErr: "Can't reach the server. Please try again.",
    copied: "✅ Booking message copied",
    copyHint: "Tap \"Copy message\" or long-press the text below to copy it",
    copiedShort: "Message copied. ",
    sendThis: "Please send this message in the shop's LINE chat:\n\n",
    dateLocale: "en-GB",
    yearOffset: 0,
    // ร้านอ่านภาษาไทย จึงใส่หัวข้อทั้งสองภาษา
    msg: ["📅 Booking request / จองคิว", "Name / ชื่อ", "Phone / เบอร์", "Car / รุ่นรถ", "Service / บริการ", "Date / วันที่", "Notes / หมายเหตุ"],
  },
}[LANG];

// ===== ตั้งค่าข้อมูลร้าน: แก้ตรงนี้ที่เดียว =====
const SHOP = {
  lineUrl: "https://line.me/ti/p/AmpMNXVQ-_", // ลิงก์เพิ่มเพื่อน LINE ของร้าน (จาก QR Code)
  phone: "038-285-061",    // เบอร์ร้าน (Yellow Pages / Autoinfo) ใช้กับปุ่ม "โทร" ทั้งหมด
};

const lineUrl = SHOP.lineUrl;
const telUrl = "tel:" + SHOP.phone.replace(/[^0-9+]/g, "");

document.querySelectorAll(".js-line").forEach(a => { a.href = lineUrl; a.target = "_blank"; a.rel = "noopener"; });
document.querySelectorAll(".js-tel").forEach(a => { a.href = telUrl; });
document.getElementById("year").textContent = new Date().getFullYear() + T.yearOffset;

// เมนูมือถือ
const nav = document.getElementById("nav");
document.getElementById("menuBtn").addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

// แกลเลอรีผลงาน: โหลดรูปจากเซิร์ฟเวอร์ (จัดการรูปที่ /admin)
const GALLERY_INITIAL = 6;
fetch(window.DIREKAIR_API + "/gallery").then(r => r.ok ? r.json() : []).then(photos => {
  if (!Array.isArray(photos) || !photos.length) return;
  const grid = document.getElementById("galleryGrid");
  const box = document.getElementById("lightbox");
  photos.forEach((p, i) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "g-item";
    item.hidden = i >= GALLERY_INITIAL;
    const img = document.createElement("img");
    img.src = p.url; img.alt = p.caption || T.workAlt; img.loading = "lazy";
    item.append(img);
    if (p.caption) {
      const cap = document.createElement("div");
      cap.className = "cap"; cap.textContent = p.caption;
      item.append(cap);
    }
    item.addEventListener("click", () => {
      box.querySelector("img").src = p.url;
      box.querySelector("img").alt = img.alt;
      box.querySelector("p").textContent = p.caption || "";
      box.showModal();
    });
    grid.append(item);
  });
  box.addEventListener("click", e => { if (e.target === box) box.close(); });
  const more = document.getElementById("galleryMore");
  if (photos.length > GALLERY_INITIAL) {
    more.hidden = false;
    more.querySelector("button").addEventListener("click", () => {
      grid.querySelectorAll(".g-item[hidden]").forEach(el => el.hidden = false);
      more.hidden = true;
    });
  }
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

// ปุ่ม "จองคิว" ในบริการหลัก -> เลือกบริการในฟอร์มให้
document.querySelectorAll("[data-service]").forEach(btn => {
  btn.addEventListener("click", () => { document.getElementById("service").value = btn.dataset.service; });
});

// ห้ามเลือกวันย้อนหลัง
document.getElementById("date").min = new Date().toISOString().split("T")[0];

// ส่งฟอร์ม -> คัดลอกข้อความทันที (ตอนลูกค้ากดปุ่ม มือถือจึงยอมให้คัดลอก) แล้วแสดงขั้นตอน
// ลูกค้ากด "เปิด LINE" เอง (บัญชี LINE ส่วนตัวเติมข้อความในแชทให้อัตโนมัติไม่ได้)
function copyText(text) {
  // วิธีเก่า execCommand ทำงานทันทีภายในการกดปุ่ม ใช้ได้บน iOS/Android ส่วนใหญ่
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
  document.body.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  ta.remove();
  if (!ok && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  return ok;
}
const bookingDone = document.getElementById("bookingDone");
const bookingMsg = document.getElementById("bookingMsg");
const copyStatus = document.getElementById("bookingCopyStatus");
function showCopyStatus(ok) {
  copyStatus.className = "status" + (ok ? " ok" : "");
  copyStatus.textContent = ok ? T.copied : T.copyHint;
}
const fmtDate = d => d ? new Date(d + "T00:00").toLocaleDateString(T.dateLocale, { day: "numeric", month: "short", year: "numeric" }) : "-";
// หน้าอังกฤษ: ตัวเลือกบริการแสดงภาษาอังกฤษ แต่ value เป็นภาษาไทย ส่งทั้งสองแบบให้ร้าน
const serviceText = () => {
  const sel = document.getElementById("service");
  const opt = sel.selectedOptions[0];
  return opt && opt.text.trim() !== sel.value ? opt.text.trim() + " / " + sel.value : sel.value;
};
document.getElementById("bookingForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  const L = T.msg;
  const msg = [
    L[0],
    L[1] + ": " + v("name"),
    L[2] + ": " + v("phone"),
    L[3] + ": " + (v("car") || "-"),
    L[4] + ": " + serviceText(),
    L[5] + ": " + fmtDate(v("date")),
    L[6] + ": " + (v("note") || "-"),
  ].join("\n");
  const ok = copyText(msg);
  bookingMsg.value = msg;
  showCopyStatus(ok);
  if (typeof bookingDone.showModal === "function") { bookingDone.showModal(); bookingMsg.scrollTop = 0; }
  else alert((ok ? T.copiedShort : "") + T.sendThis + msg);
});
document.getElementById("bookingCopyAgain").addEventListener("click", () => {
  showCopyStatus(copyText(bookingMsg.value));
  bookingMsg.focus(); bookingMsg.select();
});
document.getElementById("bookingClose").addEventListener("click", () => bookingDone.close());
