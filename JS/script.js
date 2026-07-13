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
            renderUserSelect();
        } catch(e) {
            db_accounts = {};
        }
    }

    loadData();       
    loadDeviceList(); 
};

function renderUserSelect() {
    const select = document.getElementById("userNameInput");
    if (!select) return; 
    select.innerHTML = '<option value="" disabled selected>-- Chọn tên của bạn --</option>';
    
    Object.keys(db_accounts).forEach(user => {
        if (user && user.trim() !== "") {
            let opt = document.createElement("option");
            opt.value = user;
            opt.textContent = user;
            select.appendChild(opt);
        }
    });
}

async function loadData() {
    const reportArea = document.getElementById('reportText');
    if (reportArea) reportArea.value = "⏳ Đang đồng bộ và làm mới dữ liệu...";

    try {
        const res = await fetch(`${G_URL}?_cc=${new Date().getTime()}`);
        const json = await res.json();
        
        allData = json.reports || [];
        db_accounts = json.accounts || {};

        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
        renderUserSelect();
        filterData();
    } catch (e) {
        if (reportArea) reportArea.value = "⚠️ Lỗi kết nối Google Sheets. Vui lòng bấm Làm mới.";
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
    const btn = document.getElementById('btnSubmit');
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
        jobContent: noidungHoanChinh,
        reporter: reporter
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
        
        allData.unshift({ 
            ngay: ngayReport, 
            noidung: noidungHoanChinh 
        });
        
        if (document.getElementById('noidung2')) document.getElementById('noidung2').value = "";
        if (document.getElementById('noidung3')) document.getElementById('noidung3').value = "KLM-CK-";
        
        filterData();
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
    if (!filterDateEl || !reportArea) return;

    const filterVal = filterDateEl.value;
    if (!filterVal) return;

    const filtered = allData.filter(item => item.ngay && item.ngay.substring(0, 10) === filterVal);
    const d = filterVal.split('-');
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

function copyReport() {
    const copyText = document.getElementById("reportText");
    if (!copyText || !copyText.value || copyText.value.includes("Đang đồng bộ")) return;

    copyText.select();
    navigator.clipboard.writeText(copyText.value).then(() => {
        const btn = document.querySelector('button[onclick="copyReport()"]');
        if (btn) {
            const oldText = btn.innerHTML;
            btn.innerHTML = "✅ Đã chép";
            setTimeout(() => btn.innerHTML = oldText, 2000);
        }
    });
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
