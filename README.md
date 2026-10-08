# เว็บไซต์ดิเรกแอร์ (Direk Air)

หน้าเว็บร้าน (`public/index.html`) พร้อมหน้าแอดมิน (`/admin`) สำหรับอัปโหลดรูปผลงานลูกค้า
รูปที่อัปโหลดจะแสดงในส่วน "ผลงานของเรา" บนหน้าเว็บ (ส่วนนี้จะซ่อนไว้จนกว่าจะมีรูป)

## รันในเครื่อง

```bash
npm install
ADMIN_PASSWORD=รหัสผ่าน npm start   # เปิด http://localhost:3000 และ http://localhost:3000/admin
npm test
```

## ตั้งค่า (Environment variables)

| ตัวแปร | ความหมาย |
|---|---|
| `ADMIN_PASSWORD` | รหัสผ่านเข้าหน้าแอดมิน (ต้องตั้ง) |
| `SESSION_SECRET` | คีย์เซ็นคุกกี้ล็อกอิน ถ้าไม่ตั้ง แอดมินต้องล็อกอินใหม่ทุกครั้งที่เซิร์ฟเวอร์รีสตาร์ท |
| `DATA_DIR` | โฟลเดอร์เก็บรูปและ `gallery.json` (ค่าเริ่มต้น `./data`) |

## Deploy บน Render

ใช้ `render.yaml` (Dashboard > New > Blueprint) ซึ่งสร้าง web service แพ็กเกจ Starter
พร้อม persistent disk 1GB ที่ `/var/data` สำหรับเก็บรูป (แพ็กเกจฟรีไม่มี disk รูปจะหายทุกครั้งที่ deploy)
ระบบจะสุ่ม `SESSION_SECRET` ให้ ส่วน `ADMIN_PASSWORD` ต้องกรอกเองตอนสร้าง
