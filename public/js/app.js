// LocalStorage keys:
// - currentGroupId
// - groupName
// - groupMembers
// - expenses (array of objects)

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

// --- Local Actions ---

function createGroup() {
    const name = document.getElementById('group-name').value;
    
    if (!name || tempMembers.length === 0) return showToast('❌ กรุณากรอกชื่อกลุ่มและเพิ่มสมาชิกให้ครบถ้วน');

    currentGroupId = Date.now().toString();
    localStorage.setItem('currentGroupId', currentGroupId);
    localStorage.setItem('groupMembers', JSON.stringify(tempMembers));
    localStorage.setItem('groupName', name);
    localStorage.setItem('expenses', JSON.stringify([]));
    
    showToast('✅ สร้างกลุ่มสำเร็จ!');
    loadGroupData();
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

function addExpense() {
    const payer = document.getElementById('payer-select').value;
    const amount = Number(document.getElementById('amount').value);
    const detail = document.getElementById('detail').value;

    if (!amount || amount <= 0) return showToast('❌ กรุณากรอกจำนวนเงินให้ถูกต้อง');

    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    expenses.push({ payer, amount, detail, date: new Date().toISOString() });
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    showToast('✅ บันทึกรายการสำเร็จ!');
    document.getElementById('amount').value = '';
    document.getElementById('detail').value = '';
}

function calculateSummary() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const members = JSON.parse(localStorage.getItem('groupMembers')) || [];

    let totalExpense = 0;
    const paidByMember = {};
    members.forEach(m => paidByMember[m] = 0);

    expenses.forEach(e => {
        totalExpense += e.amount;
        if (paidByMember[e.payer] !== undefined) {
            paidByMember[e.payer] += e.amount;
        }
    });

    const perPerson = members.length > 0 ? totalExpense / members.length : 0;
    
    document.getElementById('sum-total').textContent = totalExpense.toLocaleString();
    document.getElementById('sum-per-person').textContent = perPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // Calculate who owes who
    const balances = {};
    members.forEach(m => {
        balances[m] = paidByMember[m] - perPerson;
    });

    const debtors = [];
    const creditors = [];

    for (const m in balances) {
        if (balances[m] < -0.01) debtors.push({ name: m, amount: -balances[m] });
        else if (balances[m] > 0.01) creditors.push({ name: m, amount: balances[m] });
    }

    const transactions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amount = Math.min(debtor.amount, creditor.amount);

        transactions.push({
            from: debtor.name,
            to: creditor.name,
            amount: amount
        });

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    const list = document.getElementById('transactions-list');
    if (transactions.length === 0) {
        list.innerHTML = '<li>🎉 ไม่มีใครติดหนี้ใคร! ทุกคนจ่ายเท่ากันแล้ว</li>';
    } else {
        list.innerHTML = transactions.map(t => 
            `<li><span><b>${t.from}</b> โอนให้ <b>${t.to}</b></span> <span class="highlight">${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿</span></li>`
        ).join('');
    }

    const historyList = document.getElementById('expense-history');
    historyList.innerHTML = expenses.map(e => 
        `<li>${e.payer} จ่าย ${e.amount.toLocaleString()} ฿ (${e.detail || 'ไม่ระบุ'})</li>`
    ).join('');

    switchSection('summary');
}

function clearGroupAndGoHome() {
    localStorage.removeItem('currentGroupId');
    localStorage.removeItem('groupMembers');
    localStorage.removeItem('groupName');
    localStorage.removeItem('expenses');
    
    currentGroupId = null;
    tempMembers = [];
    
    document.getElementById('group-name').value = '';
    const newMemberInput = document.getElementById('new-member-name');
    if (newMemberInput) newMemberInput.value = '';
    renderMemberList();
    
    switchSection('home');
}