# 🧠 HarnNgeinHub - AI Developer Skill & Workflow Guide

เอกสารฉบับนี้สร้างขึ้นเพื่อให้ AI Agent (หรือนักพัฒนาคนอื่นๆ) ใช้เป็น **Context และ Workflow พื้นฐาน** ในการทำความเข้าใจ ทำงานต่อ หรือซ่อมบำรุงโปรเจกต์นี้ได้อย่างรวดเร็วและแม่นยำ

---

## 🎯 1. ภาพรวมโปรเจกต์ (Project Overview)
**HarnNgeinHub (หารเงินฮับ)** เป็นแอปพลิเคชันแบบ Web-based สำหรับช่วยกลุ่มเพื่อน "หารค่าใช้จ่าย" (Split Bills) เมื่อไปเที่ยวหรือกินข้าวด้วยกัน 
- **Core Feature:** บันทึกว่าใครจ่ายอะไรไปเท่าไหร่ และสรุปผลด้วย **Greedy Algorithm** เพื่อหาว่า "ใครต้องโอนเงินให้ใคร จำนวนเท่าไหร่" ด้วยจำนวนครั้งการโอนที่น้อยที่สุด
- **Architecture:** Decoupled Architecture (แยก Frontend และ Backend ชัดเจน)

---

## 🛠️ 2. เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** Vanilla HTML5, CSS3 (รองรับ Dark Mode ด้วย CSS Variables), JavaScript (ES6+ พร้อม Fetch API)
- **Backend:** Node.js, Express.js
- **Database:** Local JSON File (`database.json`) ใช้โมดูล `fs` (File System) ในการอ่าน/เขียนข้อมูล

---

## 📂 3. โครงสร้างไฟล์ (File Structure & Roles)
โปรเจกต์ตั้งอยู่ที่: `d:\Project\HarnNgeinHub\`

| ไฟล์ / ไดเรกทอรี | หน้าที่การทำงาน |
| :--- | :--- |
| `frontend/index.html` | โครงสร้าง UI หน้าเว็บ แบ่งเป็น 3 Section (ซ่อน/แสดงด้วย JS): หน้าสร้างกลุ่ม, หน้าลงค่าใช้จ่าย, หน้าสรุปยอด |
| `frontend/style.css` | สไตล์ของเว็บ มีตัวแปร `:root` สำหรับควบคุมสีและระบบ Dark Mode |
| `frontend/app.js` | สมองฝั่ง Client จัดการ DOM, สลับหน้าจอ, และเรียกใช้ API (fetch) ควบคุมข้อมูลผ่าน `localStorage` |
| `backend/server.js` | สมองฝั่ง Server ทำหน้าเป็น REST API จัดการการอ่าน/เขียน JSON และประมวลผลอัลกอริทึมเคลียร์หนี้ |
| `backend/database.json`| แหล่งเก็บข้อมูลของแอป (กลุ่ม, สมาชิก, รายการค่าใช้จ่ายทั้งหมด) |

---

## 🔌 4. API Endpoints (เส้นทางเชื่อมต่อ Backend)
Base URL: `http://localhost:3000` (หรือตามค่า `PORT` ใน Environment)

1. **`POST /groups`** 
   - **หน้าที่:** สร้างกลุ่มใหม่
   - **Body:** `{ "name": "ชื่อกลุ่ม", "members": ["A", "B", "C"] }`
2. **`GET /groups`**
   - **หน้าที่:** ดึงข้อมูลกลุ่มทั้งหมดที่มีในระบบ
3. **`POST /expenses`**
   - **หน้าที่:** เพิ่มรายการค่าใช้จ่าย
   - **Body:** `{ "groupId": "id", "payer": "A", "amount": 100, "detail": "ค่าข้าว" }`
4. **`GET /summary/:groupId`** (🔥 Core Logic)
   - **หน้าที่:** คำนวณสรุปยอดรวม ค่าเฉลี่ย และจับคู่การโอนเงินคืน
   - **Response:** `{ totalExpense, perPerson, transactions: [{ from, to, amount }], expenses }`

---

## ⚙️ 5. ลอจิกการคำนวณหลัก (Core Logic - Greedy Algorithm)
ตรรกะการเคลียร์หนี้อยู่ใน `server.js` (API `GET /summary/:groupId`) ทำงานตามขั้นตอนดังนี้:
1. **หาค่าเฉลี่ย:** นำค่าใช้จ่ายทั้งหมดรวมกัน หารด้วยจำนวนสมาชิก
2. **คำนวณ Balance:** 
   - ให้ `Balance = เงินที่ออกไปก่อน - ค่าเฉลี่ย`
   - **ยอดเป็นบวก (+):** เป็น **เจ้าหนี้** (ต้องได้รับเงินคืน)
   - **ยอดติดลบ (-):** เป็น **ลูกหนี้** (ต้องจ่ายเงินเพิ่ม)
3. **แยกกลุ่ม:** แยกคนเป็นอาร์เรย์ `debtors` (ลูกหนี้) และ `creditors` (เจ้าหนี้)
4. **จับคู่ด้วย Greedy Algorithm:**
   - ใช้ Pointer วนลูปเช็คระหว่าง `debtors` และ `creditors`
   - จับคู่คนที่ยอดหนี้และยอดที่ต้องรับมาเจอกัน โดยโอนเงินเท่ากับค่าน้อยที่สุด (`Math.min(debtor.amount, creditor.amount)`)
   - หักลบยอดของทั้งคู่ ใครยอดเป็น 0 ก่อน ให้ขยับ Pointer ไปหาคนถัดไป ทำซ้ำจนหนี้เป็น 0 ทั้งระบบ

---

## 🤖 6. AI Workflow Guidelines (คำแนะนำสำหรับ AI)
หาก User สั่งให้คุณ (AI) ทำงานต่อ ให้ยึดถือแนวทางดังต่อไปนี้:
1. **การปรับแต่ง UI (Frontend):** 
   - ห้ามลบ CSS Variables เดิมใน `:root` เพราะจะกระทบ Dark Mode 
   - ใช้ Class แบบ Utility-friendly ที่มีอยู่แล้ว (เช่น `.btn-primary`, `.input-group`) 
   - การซ่อน/แสดงหน้าจอ ให้ใช้ฟังก์ชัน `switchSection('section-name')` ใน `app.js`
2. **การอัปเดต Backend / API:**
   - หากเพิ่ม API ใหม่ อย่าลืมอัปเดตฟังก์ชัน `readDB` และ `writeDB` ให้สอดคล้องกันเพื่อป้องกัน JSON พัง
   - อัลกอริทึมเคลียร์หนี้ถูกออกแบบให้ทำงานแบบ Greedy โปรดระวังปัญหา Floating Point Precision (การเทียบทศนิยม ให้ใช้ `< -0.01` หรือ `> 0.01` เสมอ)
3. **State Management:**
   - ข้อมูลชั่วคราวฝั่งผู้ใช้ (เช่น Group ID ปัจจุบัน) เก็บไว้ใน `localStorage` หากทำฟีเจอร์ "ออกจากระบบ/ล้างข้อมูล" อย่าลืมเคลียร์ค่าเหล่านี้
4. **Tool Selection:** 
   - ถ้า User ให้แก้โค้ดเฉพาะจุด ใช้ `multi_replace_file_content` หรือ `replace_file_content` เสมอ
   - ห้ามรันคำสั่ง bash เพื่อดู/เขียนโค้ด (ห้ามใช้ `cat`, `grep`, `sed`) ให้ใช้ Native Tools ของระบบ
