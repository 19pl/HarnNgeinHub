const API_URL = 'http://localhost:3000'; // เปลี่ยนเป็น URL ของ Render/Railway เมื่อ Deploy
let currentGroupId = localStorage.getItem('currentGroupId') || null;

// UI Elements
const sections = {
    home: document.getElementById('home-section'),
    expense: document.getElementById('expense-section'),
    summary: document.getElementById('summary-section')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check Dark Mode
    if(localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    if (currentGroupId) loadGroupData();
    else switchSection('home');
});

function switchSection(sectionName) {
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    sections[sectionName].classList.add('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- API Calls ---

async function createGroup() {
    const name = document.getElementById('group-name').value;
    const membersRaw = document.getElementById('group-members').value;
    
    if (!name || !membersRaw) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน');
    
    const members = membersRaw.split(',').map(m => m.trim()).filter(m => m);

    try {
        const res = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, members })
        });
        const data = await res.json();
        
        currentGroupId = data.id;
        localStorage.setItem('currentGroupId', currentGroupId);
        localStorage.setItem('groupMembers', JSON.stringify(members));
        localStorage.setItem('groupName', name);
        
        showToast('✅ สร้างกลุ่มสำเร็จ!');
        loadGroupData();
    } catch (error) {
        showToast('❌ ไม่สามารถเชื่อมต่อ Backend ได้');
    }
}

function loadGroupData() {
    const name = localStorage.getItem('groupName');
    const members = JSON.parse(localStorage.getItem('groupMembers'));
    
    document.getElementById('display-group-name').textContent = `กลุ่ม: ${name}`;
    
    const select = document.getElementById('payer-select');
    select.innerHTML = members.map(m => `<option value="${m}">${m}</option>`).join('');
    
    switchSection('expense');
}

async function addExpense() {
    const payer = document.getElementById('payer-select').value;
    const amount = document.getElementById('amount').value;
    const detail = document.getElementById('detail').value;

    if (!amount || amount <= 0) return showToast('❌ กรุณากรอกจำนวนเงินให้ถูกต้อง');

    try {
        await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: currentGroupId, payer, amount, detail })
        });
        
        showToast('✅ บันทึกรายการสำเร็จ!');
        document.getElementById('amount').value = '';
        document.getElementById('detail').value = '';
    } catch (error) {
        showToast('❌ เกิดข้อผิดพลาดในการบันทึก');
    }
}

async function calculateSummary() {
    try {
        const res = await fetch(`${API_URL}/summary/${currentGroupId}`);
        const data = await res.json();

        document.getElementById('sum-total').textContent = data.totalExpense.toLocaleString();
        document.getElementById('sum-per-person').textContent = data.perPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

        const list = document.getElementById('transactions-list');
        if (data.transactions.length === 0) {
            list.innerHTML = '<li>🎉 ไม่มีใครติดหนี้ใคร! ทุกคนจ่ายเท่ากันแล้ว</li>';
        } else {
            list.innerHTML = data.transactions.map(t => 
                `<li><span><b>${t.from}</b> โอนให้ <b>${t.to}</b></span> <span class="highlight">${t.amount.toLocaleString()} ฿</span></li>`
            ).join('');
        }

        const historyList = document.getElementById('expense-history');
        historyList.innerHTML = data.expenses.map(e => 
            `<li>${e.payer} จ่าย ${e.amount} ฿ (${e.detail || 'ไม่ระบุ'})</li>`
        ).join('');

        switchSection('summary');
    } catch (error) {
        showToast('❌ ไม่สามารถดึงข้อมูลสรุปได้');
    }
}