// ============================
// 🏠 Landing Page JS
// ============================

document.addEventListener('DOMContentLoaded', async () => {
    // ตรวจสอบว่าผู้ใช้ล็อกอินอยู่หรือไม่
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const data = await res.json();

        if (data.loggedIn) {
            updateNavForLoggedInUser(data.user);
        }
    } catch (err) {
        // ไม่ได้ล็อกอิน — แสดง nav ปกติ
        console.log('Not logged in');
    }
});

function updateNavForLoggedInUser(user) {
    const navActions = document.getElementById('nav-actions');
    const displayName = user.name || user.email.split('@')[0];

    navActions.innerHTML = `
        <span style="color: #81C784; font-weight: 600; font-size: 0.9rem;">
            👋 สวัสดี, ${escapeHtml(displayName)}
        </span>
        <a href="/app.html" class="nav-btn nav-btn-app">เข้าใช้งาน →</a>
        <button class="nav-btn nav-btn-ghost" id="nav-logout-btn">ออกจากระบบ</button>
    `;

    // เปลี่ยนปุ่ม CTA ด้วย
    const heroCta = document.getElementById('hero-cta');
    if (heroCta) {
        heroCta.href = '/app.html';
        heroCta.textContent = 'เข้าใช้งาน →';
    }

    const footerCta = document.getElementById('footer-cta');
    if (footerCta) {
        footerCta.href = '/app.html';
        footerCta.textContent = 'เข้าใช้งาน →';
    }

    // Logout handler
    document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        location.reload();
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
