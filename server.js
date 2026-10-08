// เว็บไซต์ดิเรกแอร์ + หน้าแอดมินสำหรับจัดการรูปผลงานลูกค้า
//
// Environment variables:
//   ADMIN_PASSWORD  รหัสผ่านเข้าหน้าแอดมิน (ต้องตั้ง ไม่งั้นล็อกอินไม่ได้)
//   SESSION_SECRET  คีย์สำหรับเซ็นคุกกี้ล็อกอิน (ถ้าไม่ตั้ง จะสุ่มใหม่ทุกครั้งที่รีสตาร์ท = ต้องล็อกอินใหม่)
//   DATA_DIR        โฟลเดอร์เก็บรูปและข้อมูลแกลเลอรี (บน Render ให้ชี้ไปที่ persistent disk)
//   PORT            พอร์ตของเซิร์ฟเวอร์ (Render ตั้งให้อัตโนมัติ)

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 60;
const MAX_CAPTION = 120;
const LOGIN_MAX_FAILS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function createApp({
  dataDir = process.env.DATA_DIR || path.join(__dirname, "data"),
  adminPassword = process.env.ADMIN_PASSWORD || "",
  sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
} = {}) {
  const uploadsDir = path.join(dataDir, "uploads");
  const galleryFile = path.join(dataDir, "gallery.json");
  fs.mkdirSync(uploadsDir, { recursive: true });

  // ---------- gallery storage ----------
  function readGallery() {
    try {
      return JSON.parse(fs.readFileSync(galleryFile, "utf8"));
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
  }

  // เขียนทีละครั้ง (ต่อคิว) และเขียนลงไฟล์ชั่วคราวก่อน rename เพื่อไม่ให้ไฟล์เสียกลางทาง
  let writeQueue = Promise.resolve();
  function updateGallery(fn) {
    const run = writeQueue.then(async () => {
      const items = readGallery();
      const result = await fn(items);
      const tmp = galleryFile + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
      fs.renameSync(tmp, galleryFile);
      return result;
    });
    writeQueue = run.catch(() => {});
    return run;
  }

  const toPublic = (item) => ({ id: item.id, url: "/uploads/" + item.file, caption: item.caption });

  // ---------- auth ----------
  const sign = (value) => crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");

  function makeToken() {
    const payload = String(Date.now() + SESSION_TTL_MS);
    return payload + "." + sign(payload);
  }

  function safeEqual(a, b) {
    const ha = crypto.createHash("sha256").update(a).digest();
    const hb = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  }

  function readCookie(req, name) {
    for (const part of (req.headers.cookie || "").split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k === name) return decodeURIComponent(v.join("="));
    }
    return null;
  }

  function isAdmin(req) {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return false;
    const [payload, sig] = token.split(".");
    if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
    return Number(payload) > Date.now();
  }

  function setSessionCookie(req, res, value, maxAgeMs) {
    const parts = [
      `${SESSION_COOKIE}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    ];
    if (req.secure) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }

  function requireAdmin(req, res, next) {
    if (!isAdmin(req)) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
    next();
  }

  // จำกัดจำนวนครั้งที่ใส่รหัสผิดต่อ IP
  const loginFails = new Map();
  function tooManyFails(ip) {
    const entry = loginFails.get(ip);
    if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) return false;
    return entry.count >= LOGIN_MAX_FAILS;
  }
  function recordFail(ip) {
    const entry = loginFails.get(ip);
    if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) loginFails.set(ip, { first: Date.now(), count: 1 });
    else entry.count++;
  }

  // ---------- app ----------
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // คำขอที่แก้ไขข้อมูลต้องมาจากเว็บเดียวกันเท่านั้น
  app.use("/api", (req, res, next) => {
    if (req.method === "GET") return next();
    const origin = req.headers.origin;
    if (origin) {
      let host = null;
      try { host = new URL(origin).host; } catch {}
      if (host !== req.headers.host) return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });

  app.use(express.json({ limit: "20kb" }));

  app.post("/api/login", (req, res) => {
    if (!adminPassword) return res.status(503).json({ error: "ยังไม่ได้ตั้งรหัสผ่านแอดมิน (ADMIN_PASSWORD)" });
    if (tooManyFails(req.ip)) return res.status(429).json({ error: "ใส่รหัสผิดหลายครั้งเกินไป กรุณารอ 15 นาที" });
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!safeEqual(password, adminPassword)) {
      recordFail(req.ip);
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }
    loginFails.delete(req.ip);
    setSessionCookie(req, res, makeToken(), SESSION_TTL_MS);
    res.json({ ok: true });
  });

  app.post("/api/logout", (req, res) => {
    setSessionCookie(req, res, "", 0);
    res.json({ ok: true });
  });

  app.get("/api/me", (req, res) => res.json({ admin: isAdmin(req) }));

  app.get("/api/gallery", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.json(readGallery().map(toPublic));
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
  });

  const cleanCaption = (v) => (typeof v === "string" ? v.trim().slice(0, MAX_CAPTION) : "");

  app.post("/api/gallery", requireAdmin, (req, res) => {
    upload.single("photo")(req, res, async (err) => {
      if (err) {
        const msg = err.code === "LIMIT_FILE_SIZE" ? "ไฟล์ใหญ่เกิน 10MB" : "อัปโหลดไม่สำเร็จ";
        return res.status(400).json({ error: msg });
      }
      if (!req.file) return res.status(400).json({ error: "กรุณาเลือกรูป JPG, PNG หรือ WebP" });

      // แปลงเป็น WebP ย่อขนาด และลบข้อมูล EXIF (เช่น พิกัด GPS) ออก
      let image;
      try {
        image = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        return res.status(400).json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" });
      }

      try {
        const item = await updateGallery((items) => {
          if (items.length >= MAX_PHOTOS) return null;
          const id = crypto.randomUUID();
          const entry = { id, file: id + ".webp", caption: cleanCaption(req.body.caption), createdAt: new Date().toISOString() };
          fs.writeFileSync(path.join(uploadsDir, entry.file), image);
          items.unshift(entry);
          return entry;
        });
        if (!item) return res.status(400).json({ error: `มีรูปครบ ${MAX_PHOTOS} รูปแล้ว กรุณาลบรูปเก่าก่อน` });
        res.status(201).json(toPublic(item));
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "บันทึกรูปไม่สำเร็จ" });
      }
    });
  });

  app.patch("/api/gallery/:id", requireAdmin, async (req, res) => {
    const item = await updateGallery((items) => {
      const found = items.find((i) => i.id === req.params.id);
      if (found) found.caption = cleanCaption(req.body?.caption);
      return found;
    });
    if (!item) return res.status(404).json({ error: "ไม่พบรูปนี้" });
    res.json(toPublic(item));
  });

  app.put("/api/gallery/order", requireAdmin, async (req, res) => {
    const ids = req.body?.ids;
    const ok = await updateGallery((items) => {
      if (!Array.isArray(ids) || ids.length !== items.length) return false;
      const byId = new Map(items.map((i) => [i.id, i]));
      if (new Set(ids).size !== ids.length || !ids.every((id) => byId.has(id))) return false;
      items.splice(0, items.length, ...ids.map((id) => byId.get(id)));
      return true;
    });
    if (!ok) return res.status(400).json({ error: "ลำดับรูปไม่ถูกต้อง กรุณารีเฟรชหน้า" });
    res.json({ ok: true });
  });

  app.delete("/api/gallery/:id", requireAdmin, async (req, res) => {
    const removed = await updateGallery((items) => {
      const idx = items.findIndex((i) => i.id === req.params.id);
      return idx === -1 ? null : items.splice(idx, 1)[0];
    });
    if (!removed) return res.status(404).json({ error: "ไม่พบรูปนี้" });
    fs.rm(path.join(uploadsDir, removed.file), { force: true }, () => {});
    res.json({ ok: true });
  });

  app.use("/uploads", express.static(uploadsDir, { immutable: true, maxAge: "365d", index: false }));
  app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
  app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  if (!process.env.ADMIN_PASSWORD) console.warn("⚠️  ADMIN_PASSWORD is not set: admin login is disabled.");
  if (!process.env.SESSION_SECRET) console.warn("⚠️  SESSION_SECRET is not set: admins will be logged out on every restart.");
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Direk Air site running on http://localhost:${port}`));
}
