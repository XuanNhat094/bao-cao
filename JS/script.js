const G_URL = "https://script.google.com/macros/s/AKfycbzA-6kt1B7zZ2-qAS50vqJaeKb8n1Pgq3pdpRx9rozvQtFO0XHwdcAFYEI9KaUMeeeT/exec";
const DEVICE_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

const LOGIN_VERSION = "2026.06.03"; 

let allData = [];      
let db_accounts = {};  
let ALL_DEVICES = [];  

window.onload = function() {
    const today = new Date().toISOString().split('T')[0]; 
    ['ngay', 'filterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    const cachedAcc = localStorage.getItem("cached_accounts");
    if (cachedAcc) {
        try {
            db_accounts = JSON.parse(cachedAcc);
        } catch(e) {
            db_accounts = {};
        }
    }

    loadData();       
    loadDeviceList(); 
};

async function loadData() {
    const reportArea = document.getElementById('reportText');
    const listArea = document.getElementById('reportList');
    
    if (reportArea) reportArea.value = "⏳ Đang đồng bộ và làm mới dữ liệu...";
    if (listArea) listArea.innerHTML = "<div class='text-muted p-2'>⏳ Đang đồng bộ...</div>";

    try {
        const res = await fetch(`${G_URL}?_cc=${new Date().getTime()}`);
        const json = await res.json();
        
        allData = json.reports || [];
        db_accounts = json.accounts || {};

        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
        filterData();
    } catch (e) {
        if (reportArea) reportArea.value = "⚠️ Lỗi kết nối Google Sheets.";
        if (listArea) listArea.innerHTML = "<div class='text-danger p-2'>⚠️ Lỗi kết nối.</div>";
        console.error("Lỗi loadData:", e);
    }
}

async function loadDeviceList() {
    try {
        const res = await fetch(DEVICE_URL);
        const json = await res.json();
        ALL_DEVICES = json.devices || json.data || json || [];
    } catch (e) {
        console.error("Lỗi nạp danh mục máy:", e.message);
    }
}

function autoFillDeviceName(maSo) {
    const txtTenMay = document.getElementById('noidung2');
    if (!txtTenMay) return;

    const maTimKiem = maSo.trim().toUpperCase();
    if (maTimKiem === "" || maTimKiem === "KLM-CK-") {
        txtTenMay.value = "";
        return;
    }

    const thietBiTimThay = ALL_DEVICES.find(item => {
        if (Array.isArray(item)) {
            return (item[1] || "").toString().trim().toUpperCase() === maTimKiem;
        } else if (item && typeof item === 'object') {
            const maTrongHeThong = (item.mamay || item.macode || item.code || item.maThietBi || "").toString().trim().toUpperCase();
            return maTrongHeThong === maTimKiem;
        }
        return false;
    });

    if (thietBiTimThay) {
        if (Array.isArray(thietBiTimThay)) {
            txtTenMay.value = thietBiTimThay[2] || "";
        } else {
            txtTenMay.value = thietBiTimThay.tenmay || thietBiTimThay.tenthietbi || thietBiTimThay.noidung || "";
        }
    } else {
        txtTenMay.value = ""; 
    }
}

async function sendWorkReport() {
    const btn = document.getElementById('btnSubmit') || document.querySelector('button[onclick="sendWorkReport()"]');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('loadingSpinner');
    
    const noidung1 = document.getElementById('noidung1')?.value || "";
    let noidung2 = document.getElementById('noidung2')?.value.trim() || "";
    const noidung3 = document.getElementById('noidung3')?.value.trim().toUpperCase() || ""; 
    const ngayReport = document.getElementById('ngay')?.value || "";
    const reporter = localStorage.getItem("reportUser") || "Ẩn danh";

    if (!noidung2) return alert("⚠️ Vui lòng nhập đầy đủ tên máy!");

    noidung2 = noidung2.charAt(0).toLowerCase() + noidung2.slice(1);
    const noidungHoanChinh = `${noidung1} ${noidung2} ${noidung3}`;

    const payload = {
        action: "create",
        jobContent: noidungHoanChinh,
        reporter: reporter,
        date: ngayReport
    };

    if (btn) btn.disabled = true;
    if (text) text.innerText = "ĐANG GỬI...";
    if (loader) loader.style.display = "inline-block";

    try {
        await fetch(G_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });
        
        alert("✅ Gửi thành công!");
        loadData(); 
        
        if (document.getElementById('noidung2')) document.getElementById('noidung2').value = "";
        if (document.getElementById('noidung3')) document.getElementById('noidung3').value = "KLM-CK-";
    } catch (err) {
        alert("❌ Lỗi gửi: " + err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (text) text.innerText = "GỬI BÁO CÁO";
        if (loader) loader.style.display = "none";
    }
}

function filterData() {
    const filterDateEl = document.getElementById('filterDate');
    const reportArea = document.getElementById('reportText');
    const listArea = document.getElementById('reportList');
    
    if (!filterDateEl) return;
    const filterVal = filterDateEl.value;
    if (!filterVal) return;

    const filtered = allData.filter(item => item.ngay && item.ngay.substring(0, 10) === filterVal);
    const d = filterVal.split('-');

    // HƯỚNG 1: Nếu HTML cũ dùng ô Textarea
    if (reportArea) {
        let content = `Báo cáo công việc ca 2 ngày: ${d[2]}/${d[1]}/${d[0]}\n`;
        if (filtered.length === 0) {
            content += "(Chưa có dữ liệu)";
        } else {
            filtered.forEach(item => {
                content += `- ${item.noidung}\n`;
            });
        }
        reportArea.value = content;
    }

    // HƯỚNG 2: Nếu HTML mới dùng danh sách List sửa/xóa
    if (listArea) {
        listArea.innerHTML = "";
        if (filtered.length === 0) {
            listArea.innerHTML = "<div class='text-muted p-2'>(Chưa có dữ liệu ngày này)</div>";
            return;
        }
        filtered.forEach(item => {
            const rowId = item.id || item.rowNum; 
            const div = document.createElement('div');
            div.className = "list-group-item d-flex justify-content-between align-items-center gap-2 p-2";
            div.innerHTML = `
                <span class="report-item-text" style="font-size:14px; word-break: break-word;">- ${item.noidung}</span>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="editReport('${rowId}', '${item.noidung}')">✏️</button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteReport('${rowId}')">❌</button>
                </div>
            `;
            listArea.appendChild(div);
        });
    }
}

async function editReport(id, oldContent) {
    if (!id || id === "undefined") return alert("❌ Không tìm thấy ID dòng để sửa. Hãy bấm làm mới!");
    const newContent = prompt("Chỉnh sửa nội dung báo cáo:", oldContent);
    if (!newContent || newContent.trim() === "" || newContent.trim() === oldContent) return;

    const payload = { action: "update", id: id, jobContent: newContent.trim() };
    
    try {
        await fetch(G_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        alert("✅ Đã gửi yêu cầu sửa!");
        loadData();
    } catch (e) {
        alert("❌ Lỗi sửa: " + e.message);
    }
}

async function deleteReport(id) {
    if (!id || id === "undefined") return alert("❌ Không tìm thấy ID dòng để xóa. Hãy bấm làm mới!");
    if (!confirm("⚠️ Bạn có chắc chắn muốn XÓA dòng báo cáo này không?")) return;

    const payload = { action: "delete", id: id };

    try {
        await fetch(G_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        alert("✅ Đã gửi yêu cầu xóa!");
        loadData();
    } catch (e) {
        alert("❌ Lỗi xóa: " + e.message);
    }
}

function copyAllReport() {
    // Tự động kiểm tra xem đang xài giao diện Textarea hay List
    const reportArea = document.getElementById('reportText');
    let content = "";

    if (reportArea) {
        content = reportArea.value;
    } else {
        const filterDateEl = document.getElementById('filterDate');
        if (!filterDateEl || !filterDateEl.value) return alert("Vui lòng chọn ngày!");
        const d = filterDateEl.value.split('-');
        content = `Báo cáo công việc ca 2 ngày: ${d[2]}/${d[1]}/${d[0]}\n`;
        
        const items = document.querySelectorAll('.report-item-text');
        items.forEach(el => { content += el.innerText + "\n"; });
    }

    if (!content || content.includes("(Chưa có dữ liệu)")) return alert("Không có dữ liệu để chép!");

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(content).then(() => { showCopySuccess(); }).catch(() => { fallbackCopyText(content); });
    } else {
        fallbackCopyText(content);
    }
}

function copyReport() { copyAllReport(); } // Hỗ trợ cả tên hàm cũ lẫn mới để tránh lỗi nút bấm

function showCopySuccess() {
    const btn = document.querySelector('button[onclick="copyAllReport()"]') || document.querySelector('button[onclick="copyReport()"]');
    if (btn) {
        const oldText = btn.innerHTML;
        btn.innerHTML = "✅ Đã chép ca 2";
        setTimeout(() => btn.innerHTML = oldText, 2000);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        alert("❌ Không thể sao chép tự động!");
    }
    document.body.removeChild(textArea);
}

function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    if (!menu) return;
    if (menu.style.width === "270px" || menu.classList.contains("active")) {
        menu.style.width = "0";
        menu.classList.remove("active");
    } else {
        menu.style.width = "270px";
        menu.classList.add("active");
    }
}