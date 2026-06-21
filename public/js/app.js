// กำหนด URL ของ API ฝั่ง Backend
const API_URL = '/api';
let currentGroupId = localStorage.getItem('currentGroupId') || null;
let tempMembers = []; // รายชื่อสมาชิกที่กำลังเพิ่มก่อนสร้างกลุ่ม (ยังไม่ถูกบันทึก)
let isGuest = true; // สถานะผู้ใช้: true = โหมดผู้มาเยือน (ไม่ล็อกอิน), false = โหมดสมาชิก (ล็อกอินแล้ว)
let currentUser = null; // ข้อมูลผู้ใช้ที่ล็อกอินอยู่ (ถ้ามี)

// Guest Mode Data Storage
// เก็บรายการค่าใช้จ่ายของโหมด Guest ไว้ใน localStorage ของเครื่องนี้เท่านั้น
let localExpenses = JSON.parse(localStorage.getItem('localExpenses')) || [];

// UI Elements
// อ้างอิง Section หลักๆ ของหน้าเว็บ เพื่อใช้ในการสลับหน้าจอ (show/hide)
const sections = {
    home: document.getElementById('home-section'),
    expense: document.getElementById('expense-section'),
    summary: document.getElementById('summary-section')
};

// --- Initialization ---
// เมื่อโหลดหน้าเว็บเสร็จ ให้เริ่มต้นค่าตั้งต้นต่างๆ (ธีม, event listener, ตรวจสอบสถานะล็อกอิน)
document.addEventListener('DOMContentLoaded', async () => {
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Check Dark Mode
    // ตรวจสอบค่าธีมที่บันทึกไว้ใน localStorage แล้วตั้งค่าหน้าเว็บให้ตรงกัน
    if(localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '☀️ White Mode';
    } else {
        themeToggleBtn.innerHTML = '🌙 Dark Mode';
    }

    // Theme Toggle
    // สลับโหมดมืด/สว่าง และบันทึกค่าที่เลือกไว้ใน localStorage
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        themeToggleBtn.innerHTML = isDark ? '☀️ White Mode' : '🌙 Dark Mode';
    });

    // Enter key to add member
    // อนุญาตให้กดปุ่ม Enter ในช่องกรอกชื่อสมาชิกเพื่อเพิ่มสมาชิกได้ทันที (ไม่ต้องกดปุ่ม)
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
    // ตรวจสอบสถานะการล็อกอินก่อน เพื่อกำหนดว่าจะใช้โหมด Guest หรือ Member
    await checkAuthStatus();

    // If a group was active, load it. Otherwise, show home.
    // ถ้ามีกลุ่มที่เคยเปิดใช้งานอยู่ก่อนหน้า ให้โหลดกลุ่มนั้นกลับมาเลย ไม่ต้องเริ่มที่หน้า Home
    if (currentGroupId) {
        loadGroupData();
    } else {
        switchSection('home');
    }
});

// --- Authentication & Modes ---
// ตรวจสอบว่าผู้ใช้ล็อกอินอยู่หรือไม่ โดยเช็คทั้งพารามิเตอร์ใน URL และ session กับฝั่ง Backend
async function checkAuthStatus() {
    // Also check if user forced guest mode via URL
    // ถ้า URL มีพารามิเตอร์ ?mode=guest ให้บังคับเข้าโหมด Guest ทันที โดยไม่ต้องเช็ค session
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'guest') {
        setupGuestMode();
        return;
    }

    try {
        // เรียก API เพื่อตรวจสอบ session/cookie ของผู้ใช้ปัจจุบัน
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const data = await res.json();

        if (data.loggedIn) {
            // ผู้ใช้ล็อกอินอยู่ -> เข้าสู่โหมดสมาชิก (Member Mode)
            isGuest = false;
            currentUser = data.user;
            setupMemberMode();
        } else {
            // ไม่ได้ล็อกอิน -> เข้าสู่โหมดผู้มาเยือน (Guest Mode)
            setupGuestMode();
        }
    } catch (err) {
        // ถ้าเรียก API ไม่สำเร็จ (เช่น เน็ตมีปัญหา) ให้ fallback เป็นโหมด Guest แทน
        setupGuestMode();
    }
}

// ตั้งค่า UI สำหรับโหมดผู้มาเยือน (Guest): ซ่อนฟีเจอร์ที่ต้องใช้ฐานข้อมูล และแจ้งเตือนว่าข้อมูลจะถูกบันทึกในเครื่องนี้เท่านั้น
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

// ตั้งค่า UI สำหรับโหมดสมาชิก (Member): แสดงชื่อผู้ใช้, ปุ่ม Logout, ประวัติกลุ่มบนคลาวด์
function setupMemberMode() {
    const greeting = document.getElementById('user-greeting');
    const displayName = currentUser.name || currentUser.email.split('@')[0];
    greeting.innerHTML = `👋 สวัสดี, ${escapeHtml(displayName)}`;
    
    // ผูก event การออกจากระบบ (Logout) แล้วเด้งกลับไปหน้าแรกหลังออกจากระบบสำเร็จ
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        location.href = '/index.html';
    });

    const banner = document.getElementById('status-banner');
    banner.className = 'status-banner member';
    banner.innerHTML = '☁️ ข้อมูลของคุณถูกซิงค์และบันทึกอย่างปลอดภัยบนระบบ Cloud แล้ว';

    document.getElementById('group-history-section').classList.remove('hidden');
    document.getElementById('btn-share-group').classList.remove('hidden');
    fetchGroupHistory(); // ดึงประวัติกลุ่มทั้งหมดของผู้ใช้มาแสดง
}

// ฟังก์ชันป้องกัน XSS โดยแปลงข้อความให้เป็น HTML-safe ก่อนนำไปแสดงผล
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Group History (Member Mode Only) ---
// ดึงรายการกลุ่มทั้งหมดที่ผู้ใช้คนนี้เคยสร้างไว้บนคลาวด์ มาแสดงในหน้า Home
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

        // วนลูปสร้างการ์ดแสดงข้อมูลกลุ่มแต่ละกลุ่ม พร้อมปุ่มเปิดดู/ลบ
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

// เปิดกลุ่มเก่าจากประวัติ โดยบันทึก ID/ชื่อ/สมาชิกของกลุ่มนั้นลง localStorage แล้วโหลดข้อมูลกลุ่ม
function loadHistoryGroup(id, name, membersStr) {
    currentGroupId = id;
    localStorage.setItem('currentGroupId', currentGroupId);
    localStorage.setItem('groupName', name);
    localStorage.setItem('groupMembers', membersStr);
    
    // We don't have the group JWT token, but as the creator, 
    // we can rely on userToken (cookie) for authorization!
    // หมายเหตุ: ไม่มี Group Token เก็บไว้ แต่เนื่องจากเป็นผู้สร้างกลุ่ม จะใช้ cookie ของผู้ใช้ (userToken) ยืนยันสิทธิ์แทนได้
    loadGroupData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ลบกลุ่มและรายจ่ายทั้งหมดของกลุ่มนั้นออกจากฐานข้อมูล (ต้องยืนยันก่อนลบ)
async function deleteGroup(id) {
    if (!confirm('คุณต้องการลบกลุ่มนี้และประวัติรายจ่ายทั้งหมดใช่หรือไม่?')) return;
    try {
        const res = await fetch(`/api/groups/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('✅ ลบกลุ่มสำเร็จ');
            // ถ้ากลุ่มที่ลบคือกลุ่มที่กำลังเปิดอยู่ ให้เคลียร์ข้อมูลแล้วกลับหน้า Home
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

// ฟีเจอร์แชร์กลุ่ม (ปัจจุบันยังไม่ได้ implement เต็มรูปแบบ แสดงข้อความแจ้งผู้ใช้แทน)
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
// ถ้ามี Group Token จะแนบไปด้วยในรูปแบบ Bearer Token เพื่อยืนยันสิทธิ์การเข้าถึงกลุ่มนั้น
function getAuthHeaders() {
    const token = getGroupToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

// --- Member Management ---
// เพิ่มชื่อสมาชิกลงในรายการชั่วคราว (ก่อนกดสร้างกลุ่มจริง) พร้อมตรวจสอบชื่อซ้ำและชื่อว่าง
function addMemberToList() {
    const input = document.getElementById('new-member-name');
    const name = input.value.trim();
    if (!name) return showToast('❌ กรุณากรอกชื่อสมาชิก');
    if (tempMembers.includes(name)) return showToast('❌ ชื่อสมาชิกซ้ำ');

    tempMembers.push(name);
    input.value = '';
    renderMemberList();
}

// ลบสมาชิกออกจากรายการชั่วคราว
function removeMemberFromList(name) {
    tempMembers = tempMembers.filter(m => m !== name);
    renderMemberList();
}

// แสดงรายชื่อสมาชิกชั่วคราวทั้งหมดใน UI พร้อมปุ่มลบทีละคน
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

// สร้างกลุ่มใหม่ โดยแยกพฤติกรรมตามโหมดผู้ใช้:
// - Guest: บันทึกข้อมูลกลุ่ม/สมาชิกไว้ใน localStorage ของเครื่องนี้เท่านั้น (ไม่เชื่อมฐานข้อมูล)
// - Member: ส่งข้อมูลไปบันทึกที่ฐานข้อมูลผ่าน API และรับ Group Token กลับมาเก็บไว้ใช้ยืนยันสิทธิ์
async function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    if (!name || tempMembers.length === 0) return showToast('❌ กรุณากรอกชื่อกลุ่มและเพิ่มสมาชิกให้ครบถ้วน');

    if (isGuest) {
        // Guest Mode: Save locally
        // สร้าง ID ปลอมขึ้นต้นด้วย 'guest-' เพื่อใช้แยกแยะว่าเป็นกลุ่มแบบ Guest (ไม่ใช่กลุ่มจริงในฐานข้อมูล)
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
        // ส่งคำขอสร้างกลุ่มไปยัง Backend แล้วเก็บ Group Token ที่ได้รับกลับมาไว้ใช้ยืนยันสิทธิ์ในคำขอครั้งต่อไป
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
// อ่านชื่อกลุ่มและรายชื่อสมาชิกจาก localStorage มาเติมลงใน UI (เช่น dropdown เลือกผู้จ่าย)
function loadGroupData() {
    const name = localStorage.getItem('groupName');
    const members = JSON.parse(localStorage.getItem('groupMembers')) || [];

    document.getElementById('display-group-name').textContent = `กลุ่ม: ${name}`;

    const select = document.getElementById('payer-select');
    select.innerHTML = members.map(m => `<option value="${m}">${m}</option>`).join('');

    switchSection('expense');
}

// เพิ่มรายการค่าใช้จ่ายใหม่ โดยแยกพฤติกรรมตามโหมดผู้ใช้ เช่นเดียวกับ createGroup()
// - Guest หรือกลุ่มที่ขึ้นต้นด้วย 'guest-': บันทึกลง localStorage
// - Member: ส่งไปบันทึกที่ฐานข้อมูลผ่าน API
async function addExpense() {
    const payer = document.getElementById('payer-select').value;
    const amount = Number(document.getElementById('amount').value);
    const detail = document.getElementById('detail').value.trim();

    // ตรวจสอบความถูกต้องของจำนวนเงิน: ต้องเป็นตัวเลข, มากกว่า 0, และไม่ใช่ Infinity/NaN
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

// คำนวณสรุปยอดหนี้ของแต่ละคนในกลุ่ม แล้วหาว่าใครต้องโอนเงินให้ใครบ้าง (Debt Settlement)
// - Guest: คำนวณจากข้อมูลใน localStorage ทันทีที่ฝั่ง Client (ไม่ผ่าน Backend)
// - Member: เรียก API ให้ Backend คำนวณสรุปจากฐานข้อมูลแทน
async function calculateSummary() {
    if (isGuest || currentGroupId.startsWith('guest-')) {
        // Guest Mode: Calculate locally
        const members = JSON.parse(localStorage.getItem('groupMembers')) || [];
        let totalExpense = 0;
        const paidByMember = {};
        members.forEach(m => paidByMember[m] = 0);

        // รวมยอดที่แต่ละคนจ่ายไปทั้งหมด และยอดรวมค่าใช้จ่ายทั้งกลุ่ม
        localExpenses.forEach(e => {
            totalExpense += e.amount;
            if (paidByMember[e.payer] !== undefined) {
                paidByMember[e.payer] += e.amount;
            }
        });

        // คำนวณยอดที่แต่ละคนควรจ่ายเฉลี่ยเท่ากัน (หารเท่ากันทุกคน)
        const perPerson = members.length > 0 ? totalExpense / members.length : 0;
        // balance = ยอดที่จ่ายจริง - ยอดที่ควรจ่าย -> ถ้าติดลบ = เป็นหนี้ (ต้องจ่ายเพิ่ม), ถ้าเป็นบวก = ได้เปรียบ (ควรได้เงินคืน)
        const balances = {};
        members.forEach(m => {
            balances[m] = paidByMember[m] - perPerson;
        });

        // แยกกลุ่มคนที่เป็นหนี้ (debtors) และคนที่ควรได้เงินคืน (creditors)
        const debtors = [];
        const creditors = [];
        for (const m in balances) {
            if (balances[m] < -0.01) debtors.push({ name: m, amount: -balances[m] });
            else if (balances[m] > 0.01) creditors.push({ name: m, amount: balances[m] });
        }

        // อัลกอริทึมจับคู่โอนเงิน (Greedy Settlement): ให้คนเป็นหนี้มากที่สุดโอนให้คนที่ควรได้เงินมากที่สุดก่อน
        // วนจนกว่ายอดหนี้/ยอดเครดิตของทั้งสองฝั่งจะหมด เพื่อให้ใช้จำนวนรายการโอนน้อยที่สุด
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
        // ให้ Backend เป็นผู้คำนวณสรุปยอดหนี้ทั้งหมดแทน แล้วส่งผลลัพธ์กลับมาแสดง
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

// แสดงผลสรุปยอดค่าใช้จ่ายและรายการโอนเงินที่ต้องทำ ลงในหน้า Summary
function renderSummaryUI(data) {
    document.getElementById('sum-total').textContent = data.totalExpense.toLocaleString();
    document.getElementById('sum-per-person').textContent = data.perPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const list = document.getElementById('transactions-list');
    if (data.transactions.length === 0) {
        // กรณีไม่มีใครติดหนี้ใคร (ทุกคนจ่ายเท่ากันแล้วพอดี)
        list.innerHTML = '<li>🎉 ไม่มีใครติดหนี้ใคร! ทุกคนจ่ายเท่ากันแล้ว</li>';
    } else {
        // แสดงรายการที่ต้องโอนเงิน (ใครโอนให้ใคร เป็นจำนวนเท่าไหร่)
        list.innerHTML = data.transactions.map(t =>
            `<li><span><b>${t.from}</b> โอนให้ <b>${t.to}</b></span> <span class="highlight">${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿</span></li>`
        ).join('');
    }

    // แสดงประวัติรายการค่าใช้จ่ายทั้งหมดของกลุ่ม
    const historyList = document.getElementById('expense-history');
    historyList.innerHTML = data.expenses.map(e =>
        `<li>${e.payer} จ่าย ${e.amount.toLocaleString()} ฿ (${e.detail || 'ไม่ระบุ'})</li>`
    ).join('');

    switchSection('summary');
}

// ล้างข้อมูลกลุ่มปัจจุบันทั้งหมดออกจาก localStorage และพากลับไปหน้า Home
// ใช้ตอนลบกลุ่มที่กำลังเปิดอยู่ หรือต้องการเริ่มต้นใหม่
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