// กำหนด URL ของ API ฝั่ง Backend
const API_URL = '/api';
let currentGroupId = localStorage.getItem('currentGroupId') || null;
let tempMembers = [];

// UI Elements
const sections = {
    home: document.getElementById('home-section'),
    expense: document.getElementById('expense-section'),
    summary: document.getElementById('summary-section')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Check Dark Mode
    if(localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '☀️ White Mode';
    } else {
        themeToggleBtn.innerHTML = '🌙 Dark Mode';
    }

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        themeToggleBtn.innerHTML = isDark ? '☀️ White Mode' : '🌙 Dark Mode';
    });

    // Enter key to add member
    const newMemberInput = document.getElementById('new-member-name');
    if (newMemberInput) {
        newMemberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addMemberToList();
            }
        });
    }

    if (currentGroupId) loadGroupData();
    else switchSection('home');
});

// สลับหน้าจอ Section
function switchSection(sectionName) {
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    sections[sectionName].classList.add('active');
}

// แสดงข้อความแจ้งเตือน (Toast)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ดึง Group JWT Token จาก localStorage
function getGroupToken() {
    return localStorage.getItem('groupToken') || null;
}

// สร้าง Headers สำหรับ API request พร้อม Authorization token
function getAuthHeaders() {
    const token = getGroupToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

// --- Member Management ---
function addMemberToList() {
    const input = document.getElementById('new-member-name');
    const name = input.value.trim();
    if (!name) return showToast('❌ กรุณากรอกชื่อสมาชิก');
    if (tempMembers.includes(name)) return showToast('❌ ชื่อสมาชิกซ้ำ');

    tempMembers.push(name);
    input.value = '';
    renderMemberList();
}

function removeMemberFromList(name) {
    tempMembers = tempMembers.filter(m => m !== name);
    renderMemberList();
}

function renderMemberList() {
    const list = document.getElementById('member-list-preview');
    list.innerHTML = tempMembers.map(m => `
        <li>
            <span>${m}</span>
            <button onclick="removeMemberFromList('${m}')" class="btn-delete">ลบ</button>
        </li>
    `).join('');
}

// --- API Actions ---

async function createGroup() {
    const name = document.getElementById('group-name').value.trim();

    if (!name || tempMembers.length === 0) return showToast('❌ กรุณากรอกชื่อกลุ่มและเพิ่มสมาชิกให้ครบถ้วน');

    try {
        const res = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, members: tempMembers })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        // บันทึก Group ID และ JWT Token ลงใน localStorage
        currentGroupId = data.id;
        localStorage.setItem('currentGroupId', currentGroupId);
        localStorage.setItem('groupToken', data.token);   // 🔐 เก็บ token
        localStorage.setItem('groupMembers', JSON.stringify(data.members));
        localStorage.setItem('groupName', data.name);

        showToast('✅ สร้างกลุ่มสำเร็จและบันทึกลงฐานข้อมูลแล้ว!');
        loadGroupData();
    } catch (error) {
        showToast(`❌ ${error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Database'}`);
    }
}

// โหลดและแสดงข้อมูลของกลุ่มบนหน้าจัดการค่าใช้จ่าย
function loadGroupData() {
    const name = localStorage.getItem('groupName');
    const members = JSON.parse(localStorage.getItem('groupMembers')) || [];

    document.getElementById('display-group-name').textContent = `กลุ่ม: ${name}`;

    const select = document.getElementById('payer-select');
    select.innerHTML = members.map(m => `<option value="${m}">${m}</option>`).join('');

    switchSection('expense');
}

async function addExpense() {
    const payer = document.getElementById('payer-select').value;
    const amount = Number(document.getElementById('amount').value);
    const detail = document.getElementById('detail').value.trim();

    if (!amount || amount <= 0 || !isFinite(amount)) return showToast('❌ กรุณากรอกจำนวนเงินให้ถูกต้อง (ต้องเป็นตัวเลขที่มากกว่า 0)');

    try {
        const res = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: getAuthHeaders(), // 🔐 ส่ง JWT token
            body: JSON.stringify({ groupId: currentGroupId, payer, amount, detail })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showToast('✅ บันทึกรายการสำเร็จ!');
        document.getElementById('amount').value = '';
        document.getElementById('detail').value = '';
    } catch (error) {
        showToast(`❌ ${error.message || 'เกิดข้อผิดพลาดในการบันทึก'}`);
    }
}

async function calculateSummary() {
    try {
        const res = await fetch(`${API_URL}/summary/${currentGroupId}`, {
            headers: getAuthHeaders(), // 🔐 ส่ง JWT token
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }
        const data = await res.json();

        document.getElementById('sum-total').textContent = data.totalExpense.toLocaleString();
        document.getElementById('sum-per-person').textContent = data.perPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

        const list = document.getElementById('transactions-list');
        if (data.transactions.length === 0) {
            list.innerHTML = '<li>🎉 ไม่มีใครติดหนี้ใคร! ทุกคนจ่ายเท่ากันแล้ว</li>';
        } else {
            list.innerHTML = data.transactions.map(t =>
                `<li><span><b>${t.from}</b> โอนให้ <b>${t.to}</b></span> <span class="highlight">${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿</span></li>`
            ).join('');
        }

        const historyList = document.getElementById('expense-history');
        historyList.innerHTML = data.expenses.map(e =>
            `<li>${e.payer} จ่าย ${e.amount.toLocaleString()} ฿ (${e.detail || 'ไม่ระบุ'})</li>`
        ).join('');

        switchSection('summary');
    } catch (error) {
        showToast(`❌ ${error.message || 'ไม่สามารถดึงข้อมูลสรุปจาก Database ได้'}`);
    }
}

function clearGroupAndGoHome() {
    localStorage.removeItem('currentGroupId');
    localStorage.removeItem('groupToken');    // 🔐 ลบ token ด้วย
    localStorage.removeItem('groupMembers');
    localStorage.removeItem('groupName');

    currentGroupId = null;
    tempMembers = [];

    document.getElementById('group-name').value = '';
    const newMemberInput = document.getElementById('new-member-name');
    if (newMemberInput) newMemberInput.value = '';
    renderMemberList();

    switchSection('home');
}