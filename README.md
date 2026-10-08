# เว็บไซต์ดิเรกแอร์ (Direk Air)

เว็บร้านแบบไฟล์ HTML ล้วน (โฮสต์ฟรีได้ เช่น GitHub Pages, Vercel, Cloudflare Pages)

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บร้าน |
| `admin.html` | หน้าแอดมิน: ล็อกอินแล้วอัปโหลด / แก้คำอธิบาย / จัดลำดับ / ลบรูปผลงานลูกค้า |
| `config.js` | ที่อยู่ API |
| `images/` | รูปประกอบเว็บ (QR LINE) |

## Backend

ส่วนล็อกอินและรูปผลงานใช้ backend ร่วมกับโปรเจกต์อื่นที่
[center-kitchen-backend](https://github.com/athipaty/center-kitchen-backend) (`/api/direkair`)
รูปเก็บใน Backblaze B2 ข้อมูลรูปเก็บใน MongoDB

ตั้งค่าบน Render (service `center-kitchen-backend`):

- `DIREKAIR_ADMIN_PASSWORD`: รหัสผ่านแอดมินของร้าน
- `DIREKAIR_JWT_SECRET`: ข้อความสุ่มยาว ๆ สำหรับเซ็นโทเคนล็อกอิน
- `DIREKAIR_FRONTEND_URL`: URL ของเว็บนี้ (ถ้ายังไม่ได้ใช้ direkair.com) เพื่อให้ผ่าน CORS

ส่วน "ผลงานของเรา" บนหน้าเว็บจะซ่อนไว้จนกว่าจะมีรูป
