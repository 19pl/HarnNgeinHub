// กำหนด URL ของ API ฝั่ง Backend
const API_URL = '/api';
let currentGroupId = localStorage.getItem('currentGroupId') || null;
let tempMembers = [];
let isGuest = true;
let currentUser = null;

// Guest Mode Data Storage
let localExpenses = JSON.parse(localStorage.getItem('localExpenses')) || [];

// UI Elements
const sections = {
    home: document.getElementById('home-section'),
    expense: document.getElementById('expense-section'),
    summary: document.getElementById('summary-section')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
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

    // Check auth status first
    await checkAuthStatus();

    // If a group was active, load it. Otherwise, show home.
    if (currentGroupId) {
        loadGroupData();
    } else {
        switchSection('home');
    }
});

// --- Authentication & Modes ---
async function checkAuthStatus() {
    // Also check if user forced guest mode via URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'guest') {
        setupGuestMode();
        return;
    }

    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const data = await res.json();

        if (data.loggedIn) {
            isGuest = false;
            currentUser = data.user;
            setupMemberMode();
        } else {
            setupGuestMode();
        }
    } catch (err) {
        setupGuestMode();
    }
}

function setupGuestMode() {
    isGuest = true;
    const greeting = document.getElementById('user-greeting');
    greeting.innerHTML = `👤 ผู้มาเยือน (Guest) <a href="/login.html" style="font-size:0.8rem; margin-left:10px; color:var(--primary);">เข้าสู่ระบบ</a>`;
    
    document.getElementById('logout-btn').style.display = 'none';

    const banner = document.getElementById('status-banner');
    banner.className = 'status-banner guest';
    banner.innerHTML = '⚠️ คุณกำลังใช้แบบไม่ล็อกอิน ข้อมูลจะถูกบันทึกในเครื่องนี้เท่านั้น <a href="/register.html" style="margin-left:5px;">สมัครสมาชิกเลย!</a>';

    document.getElementById('group-history-section').classList.add('hidden');
    document.getElementById('btn-share-group').classList.add('hidden');
}

function setupMemberMode() {
    const greeting = document.getElementById('user-greeting');
    const displayName = currentUser.name || currentUser.email.split('@')[0];
    greeting.innerHTML = `👋 สวัสดี, ${escapeHtml(displayName)}`;
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        location.href = '/index.html';
    });

    const banner = document.getElementById('status-banner');
    banner.className = 'status-banner member';
    banner.innerHTML = '☁️ ข้อมูลของคุณถูกซิงค์และบันทึกอย่างปลอดภัยบนระบบ Cloud แล้ว';

    document.getElementById('group-history-section').classList.remove('hidden');
    document.getElementById('btn-share-group').classList.remove('hidden');
    fetchGroupHistory();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Group History (Member Mode Only) ---
async function fetchGroupHistory() {
    try {
        const res = await fetch('/api/user/groups', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        
        const list = document.getElementById('user-groups-list');
        if (!data.groups || data.groups.length === 0) {
            list.innerHTML = '<p style="color:var(--text-color); opacity:0.7;">ยังไม่มีประวัติกลุ่มที่บันทึกไว้บนคลาวด์</p>';
            return;
        }

        list.innerHTML = data.groups.map(g => `
            <div class="group-history-card">
                <div class="group-history-info">
                    <h4>${escapeHtml(g.name)}</h4>
                    <p>สมาชิก: ${g.members.length} คน | ${new Date(g.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="group-history-actions">
                    <button class="btn-secondary" onclick="loadHistoryGroup('${g._id}', '${escapeHtml(g.name)}', '${escapeHtml(JSON.stringify(g.members))}')">เปิดดู</button>
                    <button class="btn-delete" onclick="deleteGroup('${g._id}')">ลบ</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching history', err);
    }
}

function loadHistoryGroup(id, name, membersStr) {
    currentGroupId = id;
    localStorage.setItem('currentGroupId', currentGroupId);
    localStorage.setItem('groupName', name);
    localStorage.setItem('groupMembers', membersStr);
    
    // We don't have the group JWT token, but as the creator, 
    // we can rely on userToken (cookie) for authorization!
    loadGroupData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteGroup(id) {
    if (!confirm('คุณต้องการลบกลุ่มนี้และประวัติรายจ่ายทั้งหมดใช่หรือไม่?')) return;
    try {
        const res = await fetch(`/api/groups/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('✅ ลบกลุ่มสำเร็จ');
            if (currentGroupId === id) {
                clearGroupAndGoHome();
            } else {
                fetchGroupHistory();
            }
        } else {
            const data = await res.json();
            showToast(`❌ ${data.error || 'ลบไม่ได้'}`);
        }
    } catch (err) {
        showToast('❌ เกิดข้อผิดพลาดในการลบกลุ่ม');
    }
}

function shareGroup() {
    const url = new URL(window.location.origin + '/app.html');
    // For sharing, usually we'd pass the Group ID and Token.
    // In this simple version, we'll just show a message.
    showToast('แชร์ลิงก์: ฟีเจอร์นี้สงวนไว้สำหรับการแชร์ Group Token กรุณาคัดลอก URL ของเว็บให้เพื่อนสมัครสมาชิกเพื่อสร้างกลุ่มของตนเอง');
}

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

// --- API & Core Actions ---

async function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    if (!name || tempMembers.length === 0) return showToast('❌ กรุณากรอกชื่อกลุ่มและเพิ่มสมาชิกให้ครบถ้วน');

    if (isGuest) {
        // Guest Mode: Save locally
        currentGroupId = 'guest-' + Date.now();
        localStorage.setItem('currentGroupId', currentGroupId);
        localStorage.setItem('groupName', name);
        localStorage.setItem('groupMembers', JSON.stringify(tempMembers));
        
        localExpenses = [];
        localStorage.setItem('localExpenses', JSON.stringify(localExpenses));

        showToast('✅ สร้างกลุ่มสำเร็จ (บนอุปกรณ์นี้)!');
        loadGroupData();
    } else {
        // Member Mode: Save to Cloud
        try {
            const res = await fetch(`${API_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, members: tempMembers })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            currentGroupId = data.id;
            localStorage.setItem('currentGroupId', currentGroupId);
            localStorage.setItem('groupToken', data.token);
            localStorage.setItem('groupMembers', JSON.stringify(data.members));
            localStorage.setItem('groupName', data.name);

            showToast('✅ สร้างกลุ่มสำเร็จและบันทึกลงฐานข้อมูลแล้ว!');
            fetchGroupHistory(); // update history list
            loadGroupData();
        } catch (error) {
            showToast(`❌ ${error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Database'}`);
        }
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

    if (isGuest || currentGroupId.startsWith('guest-')) {
        // Guest Mode: Save locally
        localExpenses.push({ payer, amount, detail, createdAt: new Date().toISOString() });
        localStorage.setItem('localExpenses', JSON.stringify(localExpenses));
        
        showToast('✅ บันทึกรายการสำเร็จ (ในเครื่อง)!');
        document.getElementById('amount').value = '';
        document.getElementById('detail').value = '';
    } else {
        // Member Mode: Save to Cloud
        try {
            const res = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ groupId: currentGroupId, payer, amount, detail })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('✅ บันทึกรายการบนคลาวด์สำเร็จ!');
            document.getElementById('amount').value = '';
            document.getElementById('detail').value = '';
        } catch (error) {
            showToast(`❌ ${error.message || 'เกิดข้อผิดพลาดในการบันทึก'}`);
        }
    }
}

async function calculateSummary() {
    if (isGuest || currentGroupId.startsWith('guest-')) {
        // Guest Mode: Calculate locally
        const members = JSON.parse(localStorage.getItem('groupMembers')) || [];
        let totalExpense = 0;
        const paidByMember = {};
        members.forEach(m => paidByMember[m] = 0);

        localExpenses.forEach(e => {
            totalExpense += e.amount;
            if (paidByMember[e.payer] !== undefined) {
                paidByMember[e.payer] += e.amount;
            }
        });

        const perPerson = members.length > 0 ? totalExpense / members.length : 0;
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

            transactions.push({ from: debtor.name, to: creditor.name, amount });
            debtor.amount -= amount;
            creditor.amount -= amount;
            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        renderSummaryUI({ totalExpense, perPerson, transactions, expenses: localExpenses });
    } else {
        // Member Mode: Fetch from Cloud
        try {
            const res = await fetch(`${API_URL}/summary/${currentGroupId}`, {
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            renderSummaryUI(data);
        } catch (error) {
            showToast(`❌ ${error.message || 'ไม่สามารถดึงข้อมูลสรุปจาก Database ได้'}`);
        }
    }
}

function renderSummaryUI(data) {
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
}

function clearGroupAndGoHome() {
    localStorage.removeItem('currentGroupId');
    localStorage.removeItem('groupToken');
    localStorage.removeItem('groupMembers');
    localStorage.removeItem('groupName');
    localStorage.removeItem('localExpenses');

    currentGroupId = null;
    tempMembers = [];
    localExpenses = [];

    document.getElementById('group-name').value = '';
    const newMemberInput = document.getElementById('new-member-name');
    if (newMemberInput) newMemberInput.value = '';
    renderMemberList();

    switchSection('home');
}