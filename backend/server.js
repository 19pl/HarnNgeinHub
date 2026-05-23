const express = require('express');
const cors = require('cors');       
const fs = require('fs');           
const app = express();              
const PORT = process.env.PORT || 3000; 
const DB_FILE = './database.json';  

// Middleware
app.use(cors());                    
app.use(express.json());            

// Helper: ฟังก์ชันสำหรับอ่านและเขียน Database (ไฟล์ .json)
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) return { groups: [] };
    return JSON.parse(fs.readFileSync(DB_FILE));
};
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API 1: สร้างกลุ่มใหม่
app.post('/groups', (req, res) => {
    const { name, members } = req.body; 
    const db = readDB(); 
    
    const newGroup = {
        id: Date.now().toString(), 
        name,
        members,
        expenses: [], 
        createdAt: new Date() 
    };
    db.groups.push(newGroup); 
    writeDB(db); 
    
    res.status(201).json(newGroup); 
});

// API 2: ดึงข้อมูลกลุ่มทั้งหมด
app.get('/groups', (req, res) => {
    const db = readDB(); 
    res.json(db.groups); 
});

// API 3: เพิ่มรายการจ่ายเงิน
app.post('/expenses', (req, res) => {
    const { groupId, payer, amount, detail } = req.body; 
    const db = readDB();
    const group = db.groups.find(g => g.id === groupId); 
    
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const newExpense = {
        id: Date.now().toString(), 
        payer, 
        amount: parseFloat(amount), 
        detail, 
        date: new Date() 
    };
    group.expenses.push(newExpense); 
    writeDB(db); 
    
    res.status(201).json(newExpense); 
});

// API 4: ดึงสรุปการคำนวณ (Core Logic เคลียร์หนี้)
app.get('/summary/:groupId', (req, res) => {
    const db = readDB();
    const group = db.groups.find(g => g.id === req.params.groupId); 
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const totalExpense = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const perPerson = totalExpense / group.members.length;

    // ขั้นตอนที่ 1: คำนวณ Balance (ยอดคงเหลือของแต่ละคน)
    // ใครจ่ายเกินค่าเฉลี่ย = เจ้าหนี้ (+), ใครจ่ายน้อยกว่า = ลูกหนี้ (-)
    let balances = {};
    group.members.forEach(m => balances[m] = 0); 
    group.expenses.forEach(exp => {
        balances[exp.payer] += exp.amount; 
    });
    for (let member in balances) {
        balances[member] -= perPerson; 
    }

    // ขั้นตอนที่ 2: แยกกลุ่มลูกหนี้และเจ้าหนี้
    let debtors = []; 
    let creditors = []; 
    
    for (let member in balances) {
        // ใช้ 0.01 เพื่อกันปัญหา Floating point precision
        if (balances[member] < -0.01) debtors.push({ name: member, amount: Math.abs(balances[member]) }); 
        else if (balances[member] > 0.01) creditors.push({ name: member, amount: balances[member] });
    }

    // ขั้นตอนที่ 3: จับคู่การโอนเงิน (Greedy Algorithm)
    let transactions = [];
    let i = 0; 
    let j = 0; 

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        
        let amount = Math.min(debtor.amount, creditor.amount);

        transactions.push({
            from: debtor.name, 
            to: creditor.name, 
            amount: parseFloat(amount.toFixed(2)) 
        });

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    res.json({
        totalExpense,   
        perPerson,      
        transactions,   
        expenses: group.expenses 
    });
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});