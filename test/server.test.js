const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const { createApp } = require("../server");

const PASSWORD = "test-password";
let server, base, dataDir, cookie;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "direkair-test-"));
  const app = createApp({ dataDir, adminPassword: PASSWORD, sessionSecret: "secret" });
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const login = (password) =>
  fetch(base + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });

async function photo({ withGps = false } = {}) {
  let img = sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#ff6a1a" } });
  if (withGps) img = img.withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "13/1 21/1 0/1" } });
  return img.jpeg().toBuffer();
}

async function upload(buf, caption = "", { type = "image/jpeg", auth = cookie } = {}) {
  const fd = new FormData();
  fd.append("caption", caption);
  fd.append("photo", new Blob([buf], { type }), "car.jpg");
  return fetch(base + "/api/gallery", { method: "POST", body: fd, headers: auth ? { cookie: auth } : {} });
}

test("serves the home page and admin page", async () => {
  assert.match(await (await fetch(base + "/")).text(), /ดิเรกแอร์/);
  assert.match(await (await fetch(base + "/admin")).text(), /เข้าสู่ระบบแอดมิน/);
});

test("does not expose server files", async () => {
  for (const p of ["/server.js", "/package.json", "/uploads/../gallery.json", "/uploads/%2e%2e/gallery.json"]) {
    assert.notStrictEqual((await fetch(base + p)).status, 200, p);
  }
});

test("rejects a wrong password", async () => {
  const res = await login("nope");
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.headers.get("set-cookie"), null);
});

test("logs in with the right password", async () => {
  const res = await login(PASSWORD);
  assert.strictEqual(res.status, 200);
  const setCookie = res.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(";")[0];
  const me = await (await fetch(base + "/api/me", { headers: { cookie } })).json();
  assert.strictEqual(me.admin, true);
});

test("rejects a tampered session cookie", async () => {
  const [name, value] = cookie.split("=");
  const [, sig] = value.split(".");
  const forged = `${name}=${Date.now() + 1e10}.${sig}`;
  const me = await (await fetch(base + "/api/me", { headers: { cookie: forged } })).json();
  assert.strictEqual(me.admin, false);
});

test("blocks changes without login", async () => {
  assert.strictEqual((await upload(await photo(), "", { auth: null })).status, 401);
  assert.strictEqual((await fetch(base + "/api/gallery/x", { method: "DELETE" })).status, 401);
});

test("blocks cross-site requests", async () => {
  const res = await fetch(base + "/api/gallery/x", { method: "DELETE", headers: { cookie, origin: "https://evil.example" } });
  assert.strictEqual(res.status, 403);
});

test("uploads, resizes and strips GPS data", async () => {
  const res = await upload(await photo({ withGps: true }), "  Fortuner · ฟิล์ม  ");
  assert.strictEqual(res.status, 201);
  const item = await res.json();
  assert.strictEqual(item.caption, "Fortuner · ฟิล์ม");
  assert.match(item.url, /^\/uploads\/[0-9a-f-]+\.webp$/);

  const img = Buffer.from(await (await fetch(base + item.url)).arrayBuffer());
  const meta = await sharp(img).metadata();
  assert.strictEqual(meta.format, "webp");
  assert.strictEqual(meta.width, 1600);
  assert.strictEqual(meta.exif, undefined);

  const list = await (await fetch(base + "/api/gallery")).json();
  assert.deepStrictEqual(list, [item]);
});

test("rejects files that are not images", async () => {
  assert.strictEqual((await upload(Buffer.from("not an image"))).status, 400);
  assert.strictEqual((await upload(Buffer.from("<svg/>"), "", { type: "image/svg+xml" })).status, 400);
});

test("edits captions, reorders and deletes", async () => {
  const second = await (await upload(await photo(), "B")).json();
  let list = await (await fetch(base + "/api/gallery")).json();
  assert.strictEqual(list[0].id, second.id, "newest photo goes first");
  const first = list[1];

  const patched = await fetch(base + "/api/gallery/" + first.id, {
    method: "PATCH", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ caption: "A2" }),
  });
  assert.strictEqual((await patched.json()).caption, "A2");

  const order = await fetch(base + "/api/gallery/order", {
    method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ ids: [first.id, second.id] }),
  });
  assert.strictEqual(order.status, 200);
  const badOrder = await fetch(base + "/api/gallery/order", {
    method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ ids: [first.id, first.id] }),
  });
  assert.strictEqual(badOrder.status, 400);
  list = await (await fetch(base + "/api/gallery")).json();
  assert.deepStrictEqual(list.map((i) => i.id), [first.id, second.id]);

  const del = await fetch(base + "/api/gallery/" + second.id, { method: "DELETE", headers: { cookie } });
  assert.strictEqual(del.status, 200);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual((await fetch(base + second.url)).status, 404);
  list = await (await fetch(base + "/api/gallery")).json();
  assert.deepStrictEqual(list.map((i) => i.id), [first.id]);
});

test("locks out after too many wrong passwords", async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await login("wrong");
  assert.strictEqual(last.status, 429);
  assert.strictEqual((await login(PASSWORD)).status, 429);
});
