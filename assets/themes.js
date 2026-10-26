// ธีมสีของเว็บดิเรกแอร์ (เลือกได้ที่หน้าแอดมิน)
// แต่ละธีม = สีหลัก (accent) + โทนพื้นหลังเข้มตาม hue เดียวกัน
// ค่าที่เลือกเก็บใน backend (/settings) และจำไว้ในเบราว์เซอร์เพื่อไม่ให้สีกระพริบตอนเปิดหน้า
(function () {
  const THEMES = [
    { id: "ice",     th: "ฟ้าน้ำแข็ง",   en: "Ice Blue",    accent: "#38bdf8", hue: 215 },
    { id: "royal",   th: "น้ำเงิน",      en: "Royal Blue",  accent: "#3b82f6", hue: 222 },
    { id: "indigo",  th: "คราม",        en: "Indigo",      accent: "#818cf8", hue: 235 },
    { id: "violet",  th: "ม่วงอ่อน",     en: "Violet",      accent: "#a78bfa", hue: 255 },
    { id: "purple",  th: "ม่วง",        en: "Purple",      accent: "#c084fc", hue: 275 },
    { id: "fuchsia", th: "บานเย็น",     en: "Fuchsia",     accent: "#e879f9", hue: 295 },
    { id: "pink",    th: "ชมพู",        en: "Pink",        accent: "#f472b6", hue: 330 },
    { id: "rose",    th: "กุหลาบ",      en: "Rose",        accent: "#fb7185", hue: 350 },
    { id: "red",     th: "แดง",         en: "Red",         accent: "#ef4444", hue: 0 },
    { id: "coral",   th: "ปะการัง",     en: "Coral",       accent: "#ff7f50", hue: 12 },
    { id: "orange",  th: "ส้ม",          en: "Orange",      accent: "#ff6a1a", hue: 22 },
    { id: "amber",   th: "เหลืองอำพัน", en: "Amber",       accent: "#fbbf24", hue: 38 },
    { id: "yellow",  th: "เหลือง",      en: "Yellow",      accent: "#facc15", hue: 50 },
    { id: "lime",    th: "เขียวมะนาว",  en: "Lime",        accent: "#a3e635", hue: 85 },
    { id: "green",   th: "เขียว",       en: "Green",       accent: "#4ade80", hue: 140 },
    { id: "emerald", th: "มรกต",        en: "Emerald",     accent: "#10b981", hue: 155 },
    { id: "mint",    th: "มิ้นต์",        en: "Mint",        accent: "#6ee7b7", hue: 160 },
    { id: "teal",    th: "เขียวน้ำทะเล", en: "Teal",        accent: "#2dd4bf", hue: 175 },
    { id: "cyan",    th: "ฟ้าอมเขียว",  en: "Cyan",        accent: "#22d3ee", hue: 190 },
    { id: "silver",  th: "เงิน",        en: "Silver",      accent: "#cbd5e1", hue: 220, sat: 10 },
  ];
  const DEFAULT = "ice";
  const STORE_KEY = "direkair_theme";

  const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (rgb, to, t) => rgb.map((c, i) => Math.round(c + (to[i] - c) * t));
  const toHex = rgb => "#" + rgb.map(c => c.toString(16).padStart(2, "0")).join("");
  const luminance = rgb => {
    const [r, g, b] = rgb.map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  function vars(t) {
    const h = t.hue, s = t.sat ?? 30;
    const rgb = hexToRgb(t.accent);
    const hsl = (sat, light, a) => a == null ? `hsl(${h} ${sat}% ${light}%)` : `hsl(${h} ${sat}% ${light}% / ${a})`;
    // ตัวหนังสือบนปุ่มสีหลัก: เลือกสีเข้มหรือสีขาว แล้วแต่อันไหนอ่านชัดกว่า
    const L = luminance(rgb);
    const onAccent = (L + 0.05) / 0.053 >= 1.05 / (L + 0.05) ? hsl(Math.min(s + 10, 45), 8) : "#ffffff";
    return {
      "--bg": hsl(s, 5),
      "--bg-alt": hsl(s - 2, 8),
      "--card": hsl(s - 4, 11),
      "--line": hsl(s - 10, 19),
      "--text": hsl(s, 95),
      "--muted": hsl(Math.max(s - 16, 6), 70),
      "--accent": t.accent,
      "--accent-hover": toHex(mix(rgb, [255, 255, 255], 0.3)),
      "--accent-rgb": rgb.join(", "),
      "--on-accent": onAccent,
      "--header-bg": hsl(s, 5, 0.88),
      "--hero-end": hsl(s + 10, 8),
      "--cta-from": toHex(mix(rgb, [0, 0, 0], 0.45)),
      "--cta-to": toHex(mix(rgb, [0, 0, 0], 0.75)),
    };
  }

  const byId = id => THEMES.find(t => t.id === id);
  let current = DEFAULT;

  function apply(id) {
    const t = byId(id) || byId(DEFAULT);
    current = t.id;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars(t))) root.style.setProperty(k, v);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = vars(t)["--bg"];
    return t.id;
  }
  function remember(id) { try { localStorage.setItem(STORE_KEY, id); } catch {} }

  // 1) ใช้ธีมที่จำไว้ทันที (กันสีกระพริบ) 2) ถามธีมล่าสุดจาก backend
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch {}
  apply(saved && byId(saved) ? saved : DEFAULT);
  if (window.DIREKAIR_API) {
    fetch(window.DIREKAIR_API + "/settings")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || !byId(d.theme)) return;
        if (d.theme !== current) apply(d.theme);
        remember(d.theme);
        document.dispatchEvent(new CustomEvent("direkair:theme", { detail: d.theme }));
      })
      .catch(() => {});
  }

  window.DirekairThemes = { list: THEMES, apply, remember, get current() { return current; }, DEFAULT };
})();
