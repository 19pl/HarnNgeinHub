// ============================
// 🏠 Landing Page JS
// ============================

// รอให้โครงสร้างเอกสาร (DOM) โหลดเสร็จสมบูรณ์ก่อนทำงาน
document.addEventListener('DOMContentLoaded', async () => {
    // ส่งคำขอตรวจสอบสถานะการล็อกอินของผู้ใช้
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const data = await res.json();

        // หากตรวจพบว่าผู้ใช้เข้าสู่ระบบอยู่แล้ว ให้เรียกฟังก์ชันปรับแต่งแถบเมนูและปุ่ม
        if (data.loggedIn) {
            updateNavForLoggedInUser(data.user);
        }
    } catch (err) {
        // หากยังไม่ได้เข้าสู่ระบบ (หรือติดต่อ API ไม่สำเร็จ) ให้แสดงหน้า Landing แบบปกติ
        console.log('Not logged in');
    }
});

// ฟังก์ชันสำหรับปรับปรุงแถบเมนูด้านบนและปุ่ม CTA ให้สอดคล้องกับผู้ใช้ที่ล็อกอินแล้ว
function updateNavForLoggedInUser(user) {
    const navActions = document.getElementById('nav-actions');
    // กำหนดชื่อที่ใช้แสดงผล (ลำดับความสำคัญ: ชื่อที่ตั้งไว้ -> ส่วนหน้าของอีเมล)
    const displayName = user.name || user.email.split('@')[0];

    // ปรับปรุงเนื้อหาในแถบเมนูด้านบนขวาให้แสดงการทักทาย, ปุ่มเข้าแอป, และปุ่มออกจากระบบ
    navActions.innerHTML = `
        <span style="color: #81C784; font-weight: 600; font-size: 0.9rem;">
            👋 สวัสดี, ${escapeHtml(displayName)}
        </span>
        <a href="/app.html" class="nav-btn nav-btn-app">เข้าใช้งาน →</a>
        <button class="nav-btn nav-btn-ghost" id="nav-logout-btn">ออกจากระบบ</button>
    `;

    // เปลี่ยนลิงก์และข้อความของปุ่ม CTA หลัก (Hero Section) ให้ตรงไปที่หน้าแอป
    const heroCta = document.getElementById('hero-cta');
    if (heroCta) {
        heroCta.href = '/app.html';
        heroCta.textContent = 'เข้าใช้งาน →';
    }

    // เปลี่ยนลิงก์และข้อความของปุ่ม CTA บริเวณส่วนท้ายเพจ (Footer)
    const footerCta = document.getElementById('footer-cta');
    if (footerCta) {
        footerCta.href = '/app.html';
        footerCta.textContent = 'เข้าใช้งาน →';
    }

    // ดักจับเหตุการณ์การคลิกปุ่มออกจากระบบเพื่อส่งคำขอ POST ไปยัง API และโหลดหน้าเว็บใหม่
    document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        location.reload();
    });
}

// ฟังก์ชันสำหรับแปลงข้อความ HTML (Escape HTML) เพื่อความปลอดภัย ป้องกันช่องโหว่ Cross-Site Scripting (XSS)
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
