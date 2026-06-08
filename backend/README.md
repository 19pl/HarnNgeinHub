# HarnNgeinHub - Backend (Node.js)

นี่คือโปรเจกต์ Backend สำหรับแอปพลิเคชัน Split Money (หารเงิน) ซึ่งพัฒนาด้วย Node.js, Express และ MongoDB

## 📦 โครงสร้างโปรเจกต์

```text
backend/
├── src/
│   ├── config/        # การเชื่อมต่อ Database
│   ├── controllers/   # ลอจิกหลักสำหรับ API แต่ละเส้น
│   ├── models/        # โครงสร้างฐานข้อมูล Mongoose (User, Group, Expense)
│   ├── routes/        # เส้นทาง API (Endpoints)
│   ├── middleware/    # ตัวกรองข้อมูล เช่น JWT Auth และ Error Handler
│   └── app.js         # ตั้งค่า Express Server
├── server.js          # จุดเริ่มต้นรันเซิร์ฟเวอร์
├── package.json
└── .env               # ตัวแปรสภาพแวดล้อม (ต้องสร้างเองตอนติดตั้ง)
```

## 🛠️ วิธีติดตั้ง (Installation)

1. เข้าไปที่โฟลเดอร์ `backend`
   ```bash
   cd backend
   ```
2. ติดตั้ง Dependencies
   ```bash
   npm install
   ```
3. สร้างไฟล์ `.env` (ดูหัวข้อถัดไป)
4. ติดตั้งและเริ่มรัน MongoDB ในเครื่อง หรือใช้ MongoDB Atlas

## ⚙️ การตั้งค่า Environment Variables (.env)

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/` และใส่ค่าต่อไปนี้:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/split-money
JWT_SECRET=super_secret_jwt_key_harnngeinhub
NODE_ENV=development
```

*หมายเหตุ: หากใช้ฐานข้อมูลบน Cloud เช่น MongoDB Atlas ให้นำ Connection String มาใส่ที่ `MONGO_URI`*

## 🚀 วิธีรัน (Running the Server)

**รันโหมด Development (มี Nodemon รีเฟรชโค้ดอัตโนมัติ):**
```bash
npm run dev
```

**รันโหมด Production:**
```bash
npm start
```

*เซิร์ฟเวอร์จะรันที่พอร์ต `http://localhost:5000`*

---

## 📖 API Documentation

**Base URL:** `http://localhost:5000/api`

### 1. Groups (จัดการกลุ่ม)
*   **สร้างกลุ่มใหม่**
    *   **Method:** `POST /groups`
    *   **Body (JSON):**
        ```json
        {
            "name": "ชื่อกลุ่ม",
            "members": ["นาย A", "นาย B"]
        }
        ```
    *   **Response:** `{ success: true, id: "...", data: {...} }`
*   **ดูข้อมูลกลุ่ม**
    *   **Method:** `GET /groups/:id`

### 2. Expenses (จัดการค่าใช้จ่าย)
*   **เพิ่มรายการจ่ายเงิน**
    *   **Method:** `POST /expenses`
    *   **Body (JSON):**
        ```json
        {
            "groupId": "id_ของกลุ่ม",
            "payer": "นาย A",
            "amount": 500,
            "detail": "ค่าชาบู"
        }
        ```
    *   **Response:** `{ success: true, data: {...} }`

### 3. Summary (สรุปยอดและคำนวณเงิน)
*   **ดูสรุปยอดและใครต้องจ่ายใคร**
    *   **Method:** `GET /summary/:groupId`
    *   **Response:**
        ```json
        {
            "totalExpense": 500,
            "perPerson": 250,
            "transactions": [
                { "from": "นาย B", "to": "นาย A", "amount": 250 }
            ],
            "expenses": [...]
        }
        ```

### 4. Authentication (ยังไม่เปิดใช้งานใน Frontend ปัจจุบัน)
*   `POST /auth/register` - สมัครสมาชิก
*   `POST /auth/login` - เข้าสู่ระบบ
*   `GET /auth/me` - ดูข้อมูลส่วนตัว (ต้องส่ง Token ใน Header `Authorization: Bearer <token>`)
