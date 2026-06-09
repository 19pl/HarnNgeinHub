# 🔄 เส้นทางการไหลของข้อมูล (Data Flow) โปรเจกต์ HarnNgeinHub

การทำงานของแอปพลิเคชันนี้จะเป็นรูปแบบ **Client-Server Architecture** โดยมี `app.js` เป็นตัวกลางฝั่งผู้ใช้ (Client) และ `server.js` เป็นคนคิดคำนวณและเก็บข้อมูล (Server)

ด้านล่างนี้คือแผนภาพ **Sequence Diagram** สรุปการเดินของข้อมูลตั้งแต่ผู้ใช้กดปุ่ม จนถึงการประมวลผลและการจัดเก็บ

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 ผู้ใช้งาน
    participant HTML as 🖥️ หน้าเว็บ (index.html)
    participant JS as ⚙️ Frontend (app.js)
    participant API as 🚀 Backend (server.js)
    participant DB as 🗄️ Database (database.json)

    %% Flow 1: การสร้างกลุ่ม
    rect rgb(240, 248, 255)
        note over User,DB: Flow 1: การสร้างกลุ่มใหม่
        User->>HTML: กรอกชื่อกลุ่ม และ รายชื่อเพื่อน
        User->>HTML: กดปุ่ม "สร้างกลุ่มเลย!"
        HTML->>JS: เรียกใช้ createGroup()
        JS->>API: ส่ง HTTP POST /groups (JSON: {name, members})
        API->>DB: บันทึกข้อมูลกลุ่มใหม่
        DB-->>API: (เขียนไฟล์สำเร็จ)
        API-->>JS: ตอบกลับ HTTP 201 (ข้อมูลกลุ่ม + Group ID)
        JS->>JS: เซฟ Group ID ลง LocalStorage
        JS->>HTML: สลับหน้าจอไปหน้า "เพิ่มรายการจ่ายเงิน"
    end

    %% Flow 2: การเพิ่มรายการจ่ายเงิน
    rect rgb(245, 255, 250)
        note over User,DB: Flow 2: การเพิ่มรายการจ่ายเงิน
        User->>HTML: เลือกชื่อคนจ่าย, กรอกจำนวนเงิน, รายละเอียด
        User->>HTML: กดปุ่ม "บันทึกรายการ"
        HTML->>JS: เรียกใช้ addExpense()
        JS->>API: ส่ง HTTP POST /expenses (JSON: {groupId, payer, amount...})
        API->>DB: ดึงกลุ่มเดิมมา อัปเดตเพิ่มรายการใหม่
        DB-->>API: (เขียนไฟล์สำเร็จ)
        API-->>JS: ตอบกลับ HTTP 201 (รายการสำเร็จ)
        JS->>HTML: ล้างช่องกรอกเงิน และแสดงข้อความ ✅ สำเร็จ
    end

    %% Flow 3: การคำนวณสรุปยอด
    rect rgb(255, 250, 240)
        note over User,DB: Flow 3: การคำนวณสรุปยอด (Core Logic)
        User->>HTML: กดปุ่ม "สรุปยอดและคำนวณเงิน"
        HTML->>JS: เรียกใช้ calculateSummary()
        JS->>API: ส่ง HTTP GET /summary/{groupId}
        API->>DB: อ่านข้อมูลกลุ่มและรายการจ่ายทั้งหมด
        DB-->>API: ส่งข้อมูลกลับมาให้ Server
        API->>API: 1. หาผลรวมและค่าเฉลี่ยต่อคน
        API->>API: 2. แยกเจ้าหนี้ (ยอดบวก) และลูกหนี้ (ยอดลบ)
        API->>API: 3. จับคู่หนี้ (ใครต้องโอนให้ใคร) แบบ Greedy
        API-->>JS: ตอบกลับเป็น JSON (ยอดรวม, รายการที่ต้องโอน, ประวัติ)
        JS->>HTML: วาดข้อมูล (Render) ลงบนหน้าสรุปผล
        HTML-->>User: มองเห็นยอดรวม และว่าต้องโอนเงินให้ใครบ้าง
    end
```

## อธิบายจังหวะสำคัญของการไหลของข้อมูล:

1. **ฝั่งผู้ใช้ (Frontend) -> รับและแพ็กข้อมูล:** 
   เมื่อผู้ใช้พิมพ์ข้อมูลและกดปุ่ม หน้า `index.html` จะสะกิด `app.js` ให้รวบรวมข้อมูลเหล่านั้น แพ็กใส่กล่องในรูปแบบ `JSON` แล้วยิงส่งไปหาหลังบ้าน (Backend) ผ่านคำสั่ง `fetch()`
2. **ฝั่งหลังบ้าน (Backend) -> คิดและเก็บข้อมูล:**
   เมื่อ `server.js` ได้รับแพ็กเกจข้อมูลมา จะเอามาแกะดู ถ้าเป็นคำสั่งให้เก็บ ก็จะแปลงข้อมูลเขียนลงไฟล์ `database.json` ทันที แต่ถ้าเป็นคำสั่งให้คำนวณสรุปยอด มันจะไปกวาดข้อมูลจาก `database.json` มานั่งบวกลบคูณหาร จับคู่คนที่ต้องโอนเงินให้กันจนเสร็จ
3. **ส่งกลับและแสดงผล (Render):**
   `server.js` ส่งผลลัพธ์การคำนวณที่เสร็จเรียบร้อย (ในรูป JSON) กลับไปหา `app.js` จากนั้น `app.js` จะทำหน้าที่เอาข้อมูลดิบนี้ ไปแทรกลงในโครง `index.html` เพื่อให้หน้าจอแสดงผลออกมาสวยงามให้ผู้ใช้อ่านได้ครับ
