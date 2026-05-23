// นำเข้าไลบรารีที่จำเป็น
const express = require('express'); // เฟรมเวิร์กสำหรับสร้าง Web Server
const cors = require('cors');       // อนุญาตให้เรียกใช้ API ข้ามโดเมนได้ (Cross-Origin Resource Sharing)
const fs = require('fs');           // ไลบรารีสำหรับจัดการไฟล์ (อ่าน/เขียนไฟล์)
const app = express();              // สร้างอินสแตนซ์ของแอปพลิเคชัน Express
const PORT = process.env.PORT || 3000; // กำหนดพอร์ตที่ใช้รัน (ถ้ามี Environment Variable ให้ใช้ตามนั้น ถ้าไม่มีใช้ 3000)
const DB_FILE = './database.json';  // ชื่อไฟล์ฐานข้อมูลที่ใช้เก็บข้อมูลแบบ JSON

// Middleware
app.use(cors());                    // เปิดใช้งาน CORS เพื่อให้ Frontend (ที่อาจอยู่คนละพอร์ต) เรียกใช้ได้
app.use(express.json());            // ให้ Server สามารถรับส่งข้อมูลในรูปแบบ JSON ได้

// Helper: ฟังก์ชันสำหรับอ่านและเขียน Database (ไฟล์ .json)
const readDB = () => {
    // ถ้าไฟล์ฐานข้อมูลยังไม่มี ให้สร้างอ็อบเจกต์ว่างๆ ที่มีอาร์เรย์ groups คืนกลับไป
    if (!fs.existsSync(DB_FILE)) return { groups: [] };
    // ถ้ามีไฟล์แล้ว ให้อ่านไฟล์แล้วแปลงจาก JSON string กลับเป็น JavaScript Object
    return JSON.parse(fs.readFileSync(DB_FILE));
};
// ฟังก์ชันสำหรับเขียนข้อมูลลงไฟล์ฐานข้อมูล โดยจัดรูปแบบให้อ่านง่าย (เว้นวรรค 2 เคาะ)
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API 1: สร้างกลุ่มใหม่ (Method: POST, Path: /groups)
app.post('/groups', (req, res) => {
    const { name, members } = req.body; // รับชื่อกลุ่มและรายชื่อสมาชิกจาก Frontend
    const db = readDB(); // อ่านฐานข้อมูลปัจจุบัน
    
    // สร้างอ็อบเจกต์กลุ่มใหม่
    const newGroup = {
        id: Date.now().toString(), // ใช้ Timestamp เป็นไอดีชั่วคราวที่ไม่ซ้ำกัน
        name,
        members,
        expenses: [], // เตรียมอาร์เรย์ว่างไว้สำหรับเก็บรายการจ่ายเงินของกลุ่มนี้
        createdAt: new Date() // วันที่สร้างกลุ่ม
    };
    db.groups.push(newGroup); // เพิ่มกลุ่มใหม่เข้าไปในอาร์เรย์
    writeDB(db); // บันทึกลงไฟล์
    
    res.status(201).json(newGroup); // ตอบกลับด้วยสถานะ 201 (Created) และข้อมูลกลุ่มที่เพิ่งสร้าง
});

// API 2: ดึงข้อมูลกลุ่มทั้งหมด (Method: GET, Path: /groups) (มีไว้เผื่อต้องการเช็คข้อมูลทั้งหมด)
app.get('/groups', (req, res) => {
    const db = readDB(); // อ่านฐานข้อมูล
    res.json(db.groups); // ตอบกลับด้วยรายชื่อกลุ่มทั้งหมด
});

// API 3: เพิ่มรายการจ่ายเงิน (Method: POST, Path: /expenses)
app.post('/expenses', (req, res) => {
    const { groupId, payer, amount, detail } = req.body; // รับข้อมูลค่าใช้จ่าย
    const db = readDB();
    const group = db.groups.find(g => g.id === groupId); // หากลุ่มที่ตรงกับไอดี
    
    // ถ้าไม่พบกลุ่มให้ตอบกลับ Error 404
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // สร้างอ็อบเจกต์สำหรับรายการจ่ายเงินใหม่
    const newExpense = {
        id: Date.now().toString(), // สร้างไอดีรายการ
        payer, // ชื่อคนจ่าย
        amount: parseFloat(amount), // แปลงจำนวนเงินให้เป็นตัวเลขทศนิยม
        detail, // รายละเอียดค่าใช้จ่าย
        date: new Date() // วันที่บันทึก
    };
    group.expenses.push(newExpense); // เพิ่มรายการเข้าไปในกลุ่มนั้น
    writeDB(db); // บันทึกลงไฟล์
    
    res.status(201).json(newExpense); // ตอบกลับด้วยข้อมูลที่เพิ่งบันทึกสำเร็จ
});

// API 4: ดึงสรุปการคำนวณ (Method: GET, Path: /summary/:groupId) (Core Logic หลักของแอป)
app.get('/summary/:groupId', (req, res) => {
    const db = readDB();
    const group = db.groups.find(g => g.id === req.params.groupId); // หากลุ่มจากไอดีที่ส่งมาทาง URL
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // หาผลรวมค่าใช้จ่ายทั้งหมดของกลุ่ม
    const totalExpense = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    // หาค่าเฉลี่ยที่แต่ละคนต้องจ่าย (หารเท่า)
    const perPerson = totalExpense / group.members.length;

    // ขั้นตอนที่ 1: คำนวณ Balance (ยอดคงเหลือของแต่ละคน)
    // ใครจ่ายเกินค่าเฉลี่ย = ยอดเป็นบวก (เจ้าหนี้), ใครจ่ายน้อยกว่าค่าเฉลี่ย = ยอดติดลบ (ลูกหนี้)
    let balances = {};
    group.members.forEach(m => balances[m] = 0); // ตั้งต้นให้ทุกคนมียอดเป็น 0
    group.expenses.forEach(exp => {
        balances[exp.payer] += exp.amount; // บวกยอดให้คนที่เป็นคนออกเงินไปก่อน
    });
    for (let member in balances) {
        balances[member] -= perPerson; // หักลบด้วยค่าเฉลี่ยที่ทุกคนต้องจ่าย
    }

    // ขั้นตอนที่ 2: แยกกลุ่มคนที่ต้องรับเงิน (เจ้าหนี้) และคนที่ต้องจ่ายเงิน (ลูกหนี้)
    let debtors = []; // กลุ่มคนที่ต้องจ่ายเพิ่ม (ยอดติดลบ)
    let creditors = []; // กลุ่มคนที่ต้องได้เงินคืน (ยอดเป็นบวก)
    
    for (let member in balances) {
        // ใช้ 0.01 เพื่อกันปัญหาตัวเลขทศนิยมลอยตัว (Floating point precision)
        if (balances[member] < -0.01) debtors.push({ name: member, amount: Math.abs(balances[member]) }); // ใส่ค่าบวก (Math.abs) เพื่อให้คำนวณง่าย
        else if (balances[member] > 0.01) creditors.push({ name: member, amount: balances[member] });
    }

    // ขั้นตอนที่ 3: จับคู่การโอนเงิน (ใช้อัลกอริทึม Greedy จับคู่ไปเรื่อยๆ จนกว่าจะเคลียร์หนี้หมด)
    let transactions = [];
    let i = 0; // ตัวชี้ (Index) สำหรับกลุ่มคนต้องจ่าย
    let j = 0; // ตัวชี้ (Index) สำหรับกลุ่มคนต้องรับเงิน

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        
        // หาจำนวนเงินที่จะโอน โดยเลือกค่าน้อยที่สุดระหว่างยอดหนี้กับยอดที่ต้องรับ
        let amount = Math.min(debtor.amount, creditor.amount);

        // บันทึกรายการโอนเงิน
        transactions.push({
            from: debtor.name, // จากคนต้องจ่าย
            to: creditor.name, // ไปหาคนต้องรับ
            amount: parseFloat(amount.toFixed(2)) // ปัดทศนิยม 2 ตำแหน่ง
        });

        // หักลบยอดหนี้และยอดที่ต้องรับออก
        debtor.amount -= amount;
        creditor.amount -= amount;

        // ถ้าใครเคลียร์ยอดของตัวเองหมดแล้ว ให้ขยับไปคิวคนต่อไป
        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    // ตอบกลับข้อมูลสรุปทั้งหมด
    res.json({
        totalExpense,   // ยอดรวมทั้งหมด
        perPerson,      // ค่าเฉลี่ยต่อคน
        transactions,   // รายการโอนเงินที่คำนวณไว้
        expenses: group.expenses // ประวัติการจ่ายเงิน
    });
});

// เริ่มต้นเปิด Server ให้รอรับ Request ตามพอร์ตที่กำหนด
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});