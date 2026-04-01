# FinTrack

เว็บแอปจัดการการเงินส่วนตัวบน React + Vite ที่ซิงค์ข้อมูลข้ามมือถือและคอมผ่าน Supabase

## Stack

- React
- Vite
- Supabase Auth
- Supabase Postgres
- PWA manifest + service worker สำหรับติดตั้งบนมือถือ

## ฟีเจอร์หลัก

- Login / signup ด้วย Supabase Auth
- ซิงค์รายการรายรับรายจ่ายและงบประมาณข้ามอุปกรณ์
- เพิ่มรายการผ่าน bottom sheet สำหรับมือถือ
- ดูสรุปรายรับ รายจ่าย และยอดคงเหลือของเดือนปัจจุบัน
- ตั้งงบประมาณรายเดือนตามหมวดหมู่
- ดูภาพรวมรายจ่ายตามหมวดหมู่
- ลบรายการที่บันทึกผิดได้
- ติดตั้งเป็นแอปบนหน้าจอมือถือได้

## การตั้งค่า Supabase

1. ใช้ค่าใน `.env.local`
2. เปิด Supabase SQL Editor
3. รันไฟล์ [supabase/schema.sql](D:/work/OfficialWork/My%20Own/Finance%20App/supabase/schema.sql)
4. จากนั้นจึง signup/login ในแอป

ไฟล์ env ที่ใช้:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

มีตัวอย่างใน `.env.example`

## วิธีรัน

1. ติดตั้ง dependency ด้วย `npm install`
2. รัน dev server ด้วย `npm run dev`
3. เปิด URL ที่ Vite แสดงใน terminal

ถ้า PowerShell ของเครื่องบล็อก `npm.ps1` ให้ใช้ `npm.cmd install` และ `npm.cmd run dev`

## วิธีทดสอบ PWA

1. รัน `npm.cmd run build`
2. เปิดแอปผ่าน server ไม่ใช่เปิดไฟล์ตรง
3. บน Chrome หรือ Edge ให้เลือก Install app
4. บน iPhone ให้ใช้ Share > Add to Home Screen

## หมายเหตุ

- เวอร์ชันนี้เลิกใช้ local login เดิมแล้ว และใช้ Supabase Auth แทน
- ถ้ายังไม่รัน schema แอปจะ login ได้ แต่การโหลด/บันทึกข้อมูลจะ error เพราะตารางยังไม่พร้อม
- `.env.local` ถูกใส่ใน `.gitignore` แล้ว
