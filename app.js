// กำหนด URL ของ API ฝั่ง Backend (ถ้าเอาขึ้น Server จริง ให้เปลี่ยนเป็น URL ของ Server)
const API_URL = 'http://localhost:3000'; // เปลี่ยนเป็น URL ของ Render/Railway เมื่อ Deploy
// ดึงรหัสกลุ่มล่าสุดที่เคยใช้งานจาก LocalStorage (เพื่อจำสถานะเดิม)
let currentGroupId = localStorage.getItem('currentGroupId') || null;

// UI Elements: อ้างอิงถึงส่วนต่างๆ ของหน้าเว็บเพื่อให้จัดการได้ง่ายขึ้น
const sections = {
    home: document.getElementById('home-section'),       // ส่วนหน้าแรก (สร้างกลุ่ม)
    expense: document.getElementById('expense-section'), // ส่วนฟอร์มเพิ่มค่าใช้จ่าย
    summary: document.getElementById('summary-section')  // ส่วนหน้าสรุปผล
};

// --- Initialization (ส่วนเริ่มต้นการทำงานเมื่อหน้าเว็บโหลดเสร็จ) ---
document.addEventListener('DOMContentLoaded', () => {
    // Check Dark Mode: ตรวจสอบว่าเคยตั้งค่า Dark Mode ไว้หรือไม่ ถ้ามีก็เปิดใช้งาน
    if(localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    
    // Theme Toggle: กำหนดการทำงานเมื่อกดปุ่มเปลี่ยนธีม (ดวงจันทร์/ดวงอาทิตย์)
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode'); // สลับคลาส dark-mode ที่บอดี้
        // บันทึกสถานะธีมปัจจุบันลงใน LocalStorage
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // ตรวจสอบว่ามีกลุ่มค้างอยู่ไหม ถ้ามีให้โหลดข้อมูลกลุ่ม ถ้าไม่มีให้ไปหน้าโฮม
    if (currentGroupId) loadGroupData();
    else switchSection('home');
});

// ฟังก์ชันสำหรับสลับการแสดงผลระหว่างหน้าต่างๆ (ซ่อนหน้าที่ไม่ได้ใช้ แสดงหน้าที่ต้องการ)
function switchSection(sectionName) {
    Object.values(sections).forEach(sec => sec.classList.remove('active')); // ลบคลาส active ออกให้หมด
    sections[sectionName].classList.add('active'); // เพิ่มคลาส active ให้หน้าที่ระบุ
}

// ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือน (Toast) ชั่วคราว
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message; // ใส่ข้อความลงใน Toast
    toast.classList.remove('hidden'); // แสดง Toast
    // ตั้งเวลาให้ Toast หายไปเองใน 3 วินาที (3000 มิลลิวินาที)
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- API Calls (ส่วนติดต่อกับ Backend) ---

// ฟังก์ชันสำหรับสร้างกลุ่มใหม่
async function createGroup() {
    const name = document.getElementById('group-name').value;
    const membersRaw = document.getElementById('group-members').value;
    
    // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!name || !membersRaw) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน');
    
    // แยกรายชื่อสมาชิกด้วยลูกน้ำ ตัดช่องว่างหัวท้าย และกรองเอาเฉพาะชื่อที่ไม่ว่าง
    const members = membersRaw.split(',').map(m => m.trim()).filter(m => m);

    try {
        // ส่งคำขอสร้างกลุ่มไปยัง API
        const res = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, members }) // ส่งชื่อกลุ่มและรายชื่อสมาชิกเป็น JSON
        });
        const data = await res.json();
        
        // รับรหัสกลุ่มกลับมาและบันทึกลง LocalStorage
        currentGroupId = data.id;
        localStorage.setItem('currentGroupId', currentGroupId);
        localStorage.setItem('groupMembers', JSON.stringify(members));
        localStorage.setItem('groupName', name);
        
        showToast('✅ สร้างกลุ่มสำเร็จ!');
        loadGroupData(); // โหลดข้อมูลกลุ่มเพื่อแสดงหน้าจัดการค่าใช้จ่าย
    } catch (error) {
        showToast('❌ ไม่สามารถเชื่อมต่อ Backend ได้');
    }
}

// ฟังก์ชันสำหรับโหลดและแสดงข้อมูลของกลุ่มบนหน้าจัดการค่าใช้จ่าย
function loadGroupData() {
    const name = localStorage.getItem('groupName');
    const members = JSON.parse(localStorage.getItem('groupMembers'));
    
    // แสดงชื่อกลุ่ม
    document.getElementById('display-group-name').textContent = `กลุ่ม: ${name}`;
    
    // อัปเดตตัวเลือกผู้จ่ายเงิน (Dropdown) ด้วยรายชื่อสมาชิก
    const select = document.getElementById('payer-select');
    select.innerHTML = members.map(m => `<option value="${m}">${m}</option>`).join('');
    
    // เปลี่ยนหน้าไปที่ส่วนของ expense (จัดการค่าใช้จ่าย)
    switchSection('expense');
}

// ฟังก์ชันสำหรับเพิ่มรายการค่าใช้จ่ายใหม่
async function addExpense() {
    const payer = document.getElementById('payer-select').value;
    const amount = document.getElementById('amount').value;
    const detail = document.getElementById('detail').value;

    // ตรวจสอบความถูกต้องของจำนวนเงิน
    if (!amount || amount <= 0) return showToast('❌ กรุณากรอกจำนวนเงินให้ถูกต้อง');

    try {
        // ส่งข้อมูลรายการจ่ายเงินไปให้ API บันทึก
        await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: currentGroupId, payer, amount, detail })
        });
        
        showToast('✅ บันทึกรายการสำเร็จ!');
        // ล้างค่าในช่องกรอกจำนวนเงินและรายละเอียดหลังบันทึกเสร็จ
        document.getElementById('amount').value = '';
        document.getElementById('detail').value = '';
    } catch (error) {
        showToast('❌ เกิดข้อผิดพลาดในการบันทึก');
    }
}

// ฟังก์ชันสำหรับคำนวณและแสดงผลสรุปยอดทั้งหมด
async function calculateSummary() {
    try {
        // ขอข้อมูลสรุปจาก API โดยระบุรหัสกลุ่ม
        const res = await fetch(`${API_URL}/summary/${currentGroupId}`);
        const data = await res.json();

        // แสดงยอดรวมทั้งหมด และ ค่าเฉลี่ยต่อคน โดยจัดรูปแบบตัวเลข (ใส่คอมม่า)
        document.getElementById('sum-total').textContent = data.totalExpense.toLocaleString();
        document.getElementById('sum-per-person').textContent = data.perPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

        const list = document.getElementById('transactions-list');
        // ตรวจสอบว่ามีรายการที่ต้องโอนหรือไม่
        if (data.transactions.length === 0) {
            list.innerHTML = '<li>🎉 ไม่มีใครติดหนี้ใคร! ทุกคนจ่ายเท่ากันแล้ว</li>';
        } else {
            // สร้างรายการเพื่อบอกว่าใครต้องโอนให้ใคร
            list.innerHTML = data.transactions.map(t => 
                `<li><span><b>${t.from}</b> โอนให้ <b>${t.to}</b></span> <span class="highlight">${t.amount.toLocaleString()} ฿</span></li>`
            ).join('');
        }

        // แสดงประวัติรายการจ่ายเงินที่ถูกบันทึกมาแล้วทั้งหมด
        const historyList = document.getElementById('expense-history');
        historyList.innerHTML = data.expenses.map(e => 
            `<li>${e.payer} จ่าย ${e.amount} ฿ (${e.detail || 'ไม่ระบุ'})</li>`
        ).join('');

        // เปลี่ยนหน้าไปที่ส่วน summary (สรุปผล)
        switchSection('summary');
    } catch (error) {
        showToast('❌ ไม่สามารถดึงข้อมูลสรุปได้');
    }
}

// ฟังก์ชันสำหรับล้างข้อมูลกลุ่มปัจจุบันและกลับไปหน้าแรก
function clearGroupAndGoHome() {
    // ล้างข้อมูลใน LocalStorage
    localStorage.removeItem('currentGroupId');
    localStorage.removeItem('groupMembers');
    localStorage.removeItem('groupName');
    
    // รีเซ็ตตัวแปร
    currentGroupId = null;
    
    // ล้างค่าในช่องกรอกข้อมูลหน้าแรก (เผื่อไว้)
    document.getElementById('group-name').value = '';
    document.getElementById('group-members').value = '';
    
    // สลับกลับไปหน้า Home
    switchSection('home');
}