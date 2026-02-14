// ============================================================
// BPGT TERMINAL SYSTEM — VERSION 4.5 "TICKET EDITION"
// New in V4.5:
//   • Ticket serial tracking (₱10 + ₱5 fields)
//   • Staff enters START serial only — app calculates END
//   • Staff can use ALL ₱5 for any amount
//   • OCR reads serial numbers from ticket photo
//   • Direct camera (not gallery!)
//   • ALL buses = ₱60 flat
//   • GPS geotagging preserved
// ============================================================

requireLogin();

window.addEventListener('load', () => {
    const user = getCurrentUser();
    if (user) document.getElementById('user-name').textContent = user.fullName;
    initializeDateAndTime();
    checkAndResetTricyclePayments();
    loadVehicles();
    loadCustomVehicles();
    loadTesseract();
});

// ============================================================
// OCR LIBRARY LOADER
// ============================================================
function loadTesseract() {
    if (typeof Tesseract !== 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    document.head.appendChild(script);
}

// ============================================================
// DATE / TIME
// ============================================================
function initializeDateAndTime() {
    const now = new Date();
    const dateEl = document.getElementById('trip-date');
    const timeEl = document.getElementById('trip-time');
    if (dateEl) dateEl.value = now.toISOString().split('T')[0];
    if (timeEl) timeEl.value = now.toTimeString().slice(0,5);
}

// ============================================================
// TRICYCLE DAY PASS
// ============================================================
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}
function checkAndResetTricyclePayments() {
    if (localStorage.getItem('bpgt_tricycle_date') !== getTodayKey()) {
        localStorage.removeItem('bpgt_tricycle_paid');
        localStorage.setItem('bpgt_tricycle_date', getTodayKey());
    }
}
function markTricyclePaidToday(plate, receipt) {
    const paid = JSON.parse(localStorage.getItem('bpgt_tricycle_paid') || '{}');
    paid[plate.toUpperCase()] = {
        receipt,
        time: new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'}),
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('bpgt_tricycle_paid', JSON.stringify(paid));
}
function isTricyclePaidToday(plate) {
    return JSON.parse(localStorage.getItem('bpgt_tricycle_paid') || '{}')[plate.toUpperCase()] || null;
}

// ============================================================
// TERMINAL FEES — V4.5: ALL BUSES = ₱60 FLAT
// ============================================================
const TERMINAL_FEES = {
    'BUS':        60,   // ALL buses, regardless of type
    'SHUTTLE VAN': 30,
    'JEEP':        15,
    'MULTICAB':    10,
    'FILCAB':      10,
    'TRICYCLE':    10
};

const TRANSPORT_GROUPS = {
    'BUS':        ['RORO','CHERRY'],
    'SHUTTLE VAN':['BARAKAH','CENTRO','PILANDOK','RAYANN','RECARO','RIO TUBA EXP.','RUNLEE','FREELANCE'],
    'TRICYCLE':   ['TODA'],
    'JEEP':       ['N/A'],
    'MULTICAB':   ['N/A'],
    'FILCAB':     ['N/A']
};

const INTERMUNICIPAL = ['BROOKE\'S POINT','PPC','ABORLAN','NARRA','S.ESPAÑOLA','QUEZON','BATARAZA','RIO-TUBA','BULILUYAN','SICUD','RIZAL'];
const INTRAMUNICIPAL = ['POBLACION','TUBTUB','PSU','MAINIT','IMULNOD','PANGOBILIAN'];

// ============================================================
// VEHICLE REGISTRY
// ============================================================
let vehicleRegistry = {};

async function loadVehicles() {
    try {
        const res = await fetch(CONFIG.VEHICLE_API_URL);
        const data = await res.json();
        if (data.success) vehicleRegistry = data.vehicles;
    } catch(e) { console.error('Vehicle load error:', e); }
}
function loadCustomVehicles() {
    Object.assign(vehicleRegistry, JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}'));
}
function addVehicleToRegistry(plate, denomination, group) {
    const entry = { denomination, transportGroup: group, addedDate: new Date().toISOString(), addedBy: getCurrentUser().username };
    vehicleRegistry[plate] = entry;
    const custom = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    custom[plate] = entry;
    localStorage.setItem('bpgt_custom_vehicles', JSON.stringify(custom));
}

// ============================================================
// QR SCANNER
// ============================================================
let qrScanner = null;
function startQRScanner() {
    document.getElementById('qr-reader').style.display = 'block';
    qrScanner = new Html5QrcodeScanner('qr-reader', { fps:10, qrbox:{width:250,height:250}, facingMode:'environment' }, false);
    qrScanner.render(text => {
        document.getElementById('plate-number').value = text.toUpperCase();
        document.getElementById('plate-number').dispatchEvent(new Event('blur'));
        qrScanner.clear();
        document.getElementById('qr-reader').style.display = 'none';
        showVehicleStatus('✅ Plate scanned: ' + text, 'success');
    }, () => {});
}

// ============================================================
// DIRECT CAMERA (not gallery!)
// ============================================================
let capturedPhoto = null;

function captureArkabalaPhoto() {
    // Always try direct camera first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        openLiveCamera();
    } else {
        fallbackFileInput();
    }
}

function openLiveCamera() {
    const overlay = document.getElementById('camera-overlay');
    const video   = document.getElementById('camera-video');
    overlay.style.display = 'flex';

    // Try exact back camera first, fall back to any environment-facing
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }))
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then(stream => {
        video.srcObject = stream;
        video.play();
        window._camStream = stream;
    })
    .catch(() => { closeLiveCamera(); fallbackFileInput(); });
}

function snapPhoto() {
    const video  = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    closeLiveCamera();
    attachPhotoWithGPS(imgData);
}

function closeLiveCamera() {
    if (window._camStream) { window._camStream.getTracks().forEach(t => t.stop()); window._camStream = null; }
    document.getElementById('camera-overlay').style.display = 'none';
}

function fallbackFileInput() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => attachPhotoWithGPS(ev.target.result);
        reader.readAsDataURL(file);
    };
    inp.click();
}

async function attachPhotoWithGPS(imgData) {
    let geo = null;
    if (navigator.geolocation) {
        try {
            const pos = await new Promise((res,rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout:5000, enableHighAccuracy:true }));
            geo = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        } catch(e) {}
    }
    capturedPhoto = { image: imgData, geo, timestamp: new Date().toISOString() };
    renderPhotoPreview();
}

function renderPhotoPreview() {
    const preview = document.getElementById('arkabala-preview');
    if (!preview) return;
    const geo = capturedPhoto.geo;
    preview.innerHTML = `
        <img src="${capturedPhoto.image}" style="max-width:100%;border-radius:8px;margin-top:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);">
        <div style="font-size:12px;padding:6px 10px;margin-top:6px;border-radius:6px;${geo
            ? 'background:#d1fae5;color:#065f46;'
            : 'background:#fef3c7;color:#92400e;'}">
            ${geo
                ? `📍 GPS: ${geo.lat.toFixed(6)}, ${geo.lon.toFixed(6)} (±${Math.round(geo.accuracy)}m)`
                : '⚠️ GPS not available — photo saved without location'}
        </div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" onclick="readSerialWithOCR()" style="padding:7px 14px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">🔍 Read Serial Number</button>
            <button type="button" onclick="removePhoto()" style="padding:7px 14px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">❌ Remove Photo</button>
        </div>`;
}

function removePhoto() {
    capturedPhoto = null;
    document.getElementById('arkabala-preview').innerHTML = '';
}

// ============================================================
// OCR — READ SERIAL FROM PHOTO
// ============================================================
async function readSerialWithOCR() {
    if (!capturedPhoto) { alert('No photo yet! Take a photo first.'); return; }
    if (typeof Tesseract === 'undefined') { alert('OCR is still loading. Please wait a moment and try again.'); return; }

    const btn = document.querySelector('[onclick="readSerialWithOCR()"]');
    if (btn) { btn.textContent = '⏳ Reading...'; btn.disabled = true; }

    try {
        const result = await Tesseract.recognize(capturedPhoto.image, 'eng', {
            tessedit_char_whitelist: '0123456789',
            logger: () => {}
        });

        // Find 4–8 digit sequences
        const numbers = (result.data.text.replace(/\D/g,'').match(/\d{4,8}/g) || []);

        if (numbers.length > 0) {
            const serial = numbers[0].padStart(6,'0');
            // Put in the ₱10 field by default — staff can move it
            document.getElementById('serial-start-10').value = serial;
            recalculateTickets();
            alert(`✅ Detected: ${serial}\nCheck if correct — edit if needed!`);
        } else {
            alert('⚠️ Could not read a clear number.\nPlease type the serial manually.');
        }
    } catch(e) {
        alert('⚠️ OCR could not read the ticket.\nPlease type the serial number manually.');
    } finally {
        if (btn) { btn.textContent = '🔍 Read Serial Number'; btn.disabled = false; }
    }
}

// ============================================================
// TICKET SERIAL SYSTEM — THE HEART OF V4.5
// ============================================================
// Layout:
//   [ ₱10 tickets ]  Start serial: [______]  → shows qty + end serial
//   [ ₱5  tickets ]  Start serial: [______]  → shows qty + end serial
//   Staff can fill ONE or BOTH fields
//   App validates that total = terminal fee

function recalculateTickets() {
    const fee = parseFloat(document.getElementById('terminal-fee-amount').value) || 0;
    if (fee <= 0) return;

    const s10 = parseInt(document.getElementById('serial-start-10').value) || 0;
    const s5  = parseInt(document.getElementById('serial-start-5').value)  || 0;

    // Determine how many ₱10 and ₱5 tickets are being used
    // If BOTH serials entered: ₱10 qty = floor(fee/10), ₱5 qty = (fee%10)/5
    // If ONLY ₱5 serial entered: qty = fee/5 (all ₱5)
    // If ONLY ₱10 serial entered: qty = fee/10 (all ₱10, only works if fee divisible by 10)

    let qty10 = 0, qty5 = 0, valid = false, record = '';

    if (s5 > 0 && s10 === 0) {
        // ALL ₱5 mode
        qty5 = fee / 5;
        valid = Number.isInteger(qty5);
        if (valid) {
            const end5 = s5 + qty5 - 1;
            record = `5-${String(s5).padStart(6,'0')}:${String(end5).padStart(6,'0')}`;
            showTicketResult('₱5', s5, end5, qty5, fee, record);
        }
    } else if (s10 > 0 && s5 === 0) {
        // ALL ₱10 mode (fee must be divisible by 10)
        if (fee % 10 === 0) {
            qty10 = fee / 10;
            const end10 = s10 + qty10 - 1;
            record = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
            showTicketResult('₱10', s10, end10, qty10, fee, record);
            valid = true;
        } else {
            // Fee has ₱5 remainder — prompt for ₱5 serial too
            showTicketHint(`Fee ₱${fee} needs a ₱5 ticket too. Enter the ₱5 serial below!`, 'warning');
            qty10 = Math.floor(fee / 10);
            const end10 = s10 + qty10 - 1;
            document.getElementById('ticket-qty-10').textContent = `${qty10} ticket${qty10>1?'s':''} (₱${qty10*10})  →  ends at ${String(end10).padStart(6,'0')}`;
        }
    } else if (s10 > 0 && s5 > 0) {
        // MIXED mode
        qty10 = Math.floor(fee / 10);
        const rem5 = (fee % 10) / 5;
        if ((fee % 10) % 5 !== 0) {
            showTicketHint('⚠️ Fee cannot be covered by these denominations. Check the amounts.', 'error');
            return;
        }
        const end10 = s10 + qty10 - 1;
        const end5  = s5  + rem5  - 1;
        const r10 = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
        const r5  = `5-${String(s5).padStart(6,'0')}:${String(end5).padStart(6,'0')}`;
        record = `${r10}+${r5}`;

        document.getElementById('ticket-qty-10').textContent = `${qty10} ticket${qty10>1?'s':''} (₱${qty10*10})  →  end serial: ${String(end10).padStart(6,'0')}`;
        document.getElementById('ticket-qty-5').textContent  = `${rem5} ticket (₱${rem5*5})  →  end serial: ${String(end5).padStart(6,'0')}`;
        showTicketHint(`✅ Total: ₱${qty10*10 + rem5*5}  |  Record: ${record}`, 'success');
        valid = true;
    }

    // Save record
    const recEl = document.getElementById('ticket-record');
    if (recEl) recEl.value = valid ? record : '';
}

function showTicketResult(label, start, end, qty, fee, record) {
    const isP10 = label === '₱10';
    const qtyEl = document.getElementById(isP10 ? 'ticket-qty-10' : 'ticket-qty-5');
    if (qtyEl) qtyEl.textContent = `${qty} ticket${qty>1?'s':''}  →  end serial: ${String(end).padStart(6,'0')}`;
    showTicketHint(`✅ ${qty} × ${label} = ₱${fee}  |  Record: ${record}`, 'success');
}

function showTicketHint(msg, type) {
    const el = document.getElementById('ticket-hint');
    if (!el) return;
    const styles = {
        success: 'background:#d1fae5;color:#065f46;border:1px solid #059669;',
        warning: 'background:#fef3c7;color:#92400e;border:1px solid #f59e0b;',
        error:   'background:#fee2e2;color:#991b1b;border:1px solid #ef4444;'
    };
    el.innerHTML = `<div style="${styles[type]}padding:10px;border-radius:8px;font-size:13px;margin-top:8px;">${msg}</div>`;
}

// ============================================================
// DENOMINATION CHANGE → populate transport group
// ============================================================
document.getElementById('denomination').addEventListener('change', function() {
    const denom = this.value;
    const tgSel = document.getElementById('transport-group');
    tgSel.innerHTML = '<option value="">Select Transport Group</option>';
    if (denom && TRANSPORT_GROUPS[denom]) {
        TRANSPORT_GROUPS[denom].forEach(g => {
            const o = document.createElement('option');
            o.value = o.textContent = g;
            tgSel.appendChild(o);
        });
        tgSel.disabled = false;
    } else { tgSel.disabled = true; }
    recalcFeeAndTickets();
});

document.getElementById('transport-group').addEventListener('change', function() {
    const plate = document.getElementById('plate-number').value.toUpperCase().trim();
    const denom = document.getElementById('denomination').value;
    const group = this.value;
    if (plate && denom && group && !vehicleRegistry[plate]) {
        addVehicleToRegistry(plate, denom, group);
        showVehicleStatus('✅ New vehicle added to registry!', 'success');
    }
    recalcFeeAndTickets();
});

// ============================================================
// PLATE NUMBER → auto-fill from registry
// ============================================================
document.getElementById('plate-number').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});
document.getElementById('plate-number').addEventListener('blur', function() {
    const plate = this.value.toUpperCase().trim();
    const info  = vehicleRegistry[plate];
    if (info) {
        document.getElementById('denomination').value = info.denomination;
        document.getElementById('denomination').dispatchEvent(new Event('change'));
        setTimeout(() => {
            document.getElementById('transport-group').value = info.transportGroup;
            recalcFeeAndTickets();
        }, 150);
        showVehicleStatus('', '');
    } else if (plate) {
        showVehicleStatus('ℹ️ New vehicle — please select type below', 'info');
    }
});

function showVehicleStatus(msg, type) {
    const el = document.getElementById('vehicle-status');
    if (!el || !msg) { if (el) el.innerHTML = ''; return; }
    const colors = { success:'#d1fae5|#065f46', info:'#fef3c7|#92400e', error:'#fee2e2|#991b1b' };
    const [bg, color] = (colors[type]||colors.info).split('|');
    el.innerHTML = `<div style="background:${bg};color:${color};padding:8px;border-radius:6px;font-size:13px;margin-top:6px;">${msg}</div>`;
    if (type !== 'error') setTimeout(() => el.innerHTML = '', 4000);
}

// ============================================================
// TYPE CHANGE → show origin / destination
// ============================================================
document.getElementById('type').addEventListener('change', function() {
    const type  = this.value;
    const denom = document.getElementById('denomination').value;
    const locs  = denom === 'TRICYCLE' ? INTRAMUNICIPAL : INTERMUNICIPAL;

    const ogGrp = document.getElementById('origin-group');
    const dgGrp = document.getElementById('destination-group');
    const oSel  = document.getElementById('origin');
    const dSel  = document.getElementById('destination');

    const fill = (sel, label) => {
        sel.innerHTML = `<option value="">Select ${label}</option>`;
        locs.forEach(l => { const o = document.createElement('option'); o.value = o.textContent = l; sel.appendChild(o); });
    };

    if (type === 'ARRIVAL') {
        ogGrp.classList.remove('hidden'); dgGrp.classList.add('hidden');
        oSel.required = true; dSel.required = false; dSel.value = '';
        fill(oSel, 'Origin');
    } else if (type === 'DEPARTURE') {
        dgGrp.classList.remove('hidden'); ogGrp.classList.add('hidden');
        dSel.required = true; oSel.required = false; oSel.value = '';
        fill(dSel, 'Destination');
    } else {
        ogGrp.classList.add('hidden'); dgGrp.classList.add('hidden');
    }
    recalcFeeAndTickets();
});

// ============================================================
// FEE CALCULATION (called any time type/denomination changes)
// ============================================================
function recalcFeeAndTickets() {
    const type   = document.getElementById('type').value;
    const denom  = document.getElementById('denomination').value;
    const plate  = document.getElementById('plate-number').value.toUpperCase().trim();
    const feeSec = document.getElementById('fee-section');
    const feeDisp= document.getElementById('fee-amount-display');
    const feeHid = document.getElementById('terminal-fee-amount');
    const feeWarn= document.getElementById('fee-warning');
    const tickSec= document.getElementById('ticket-section');

    if (type !== 'DEPARTURE' || !denom) {
        feeSec.classList.add('hidden');
        if (tickSec) tickSec.style.display = 'none';
        feeHid.value = 0;
        if (feeWarn) feeWarn.innerHTML = '';
        ['payment-method','payment-status'].forEach(id => document.getElementById(id).required = false);
        return;
    }

    let fee = TERMINAL_FEES[denom] || 0;

    // Tricycle day pass
    if (denom === 'TRICYCLE' && plate) {
        const paid = isTricyclePaidToday(plate);
        if (paid) {
            fee = 0;
            feeDisp.textContent = '₱0.00';
            if (feeWarn) feeWarn.innerHTML = `<div style="background:#fef3c7;color:#92400e;padding:10px;border-radius:8px;font-size:13px;margin-top:8px;">✅ Day pass already paid — Receipt: ${paid.receipt} (${paid.time})</div>`;
            document.getElementById('payment-method').value = 'Cash';
            document.getElementById('payment-status').value = 'Paid';
            document.getElementById('receipt-number').value = paid.receipt;
            document.getElementById('fee-notes').value = `Day pass paid at ${paid.time}`;
            if (tickSec) tickSec.style.display = 'none';
            feeHid.value = 0;
            feeSec.classList.remove('hidden');
            return;
        }
    }

    // Show fee
    feeDisp.textContent = `₱${fee.toFixed(2)}`;
    feeHid.value = fee;
    feeSec.classList.remove('hidden');
    ['payment-method','payment-status'].forEach(id => document.getElementById(id).required = true);

    if (feeWarn) {
        if (denom === 'BUS') {
            feeWarn.innerHTML = `<div style="background:#fff7ed;color:#92400e;padding:8px;border-radius:6px;font-size:13px;margin-top:6px;">🚌 All buses: ₱60.00 flat — Ordinance 2026-01</div>`;
        } else {
            feeWarn.innerHTML = '';
        }
    }

    // Show/hide ticket section
    if (tickSec && fee > 0) {
        tickSec.style.display = 'block';
        updateTicketHints(fee);
    }
}

function updateTicketHints(fee) {
    const hint = document.getElementById('ticket-denomination-hint');
    if (!hint) return;
    const w10 = fee % 10 === 0 ? `${fee/10} × ₱10` : `${Math.floor(fee/10)} × ₱10 + ${(fee%10)/5} × ₱5`;
    const w5  = `${fee/5} × ₱5`;
    hint.textContent = `For ₱${fee}: Use ${w10}  |  OR all ₱5: ${w5}`;
}

// ============================================================
// PASSENGER COUNT TOTALS
// ============================================================
document.querySelectorAll('.passenger-count').forEach(inp => {
    inp.addEventListener('input', () => {
        const am = +document.getElementById('adult-male').value   || 0;
        const af = +document.getElementById('adult-female').value || 0;
        const cm = +document.getElementById('child-male').value   || 0;
        const cf = +document.getElementById('child-female').value || 0;
        document.getElementById('adult-total').value = am + af;
        document.getElementById('child-total').value = cm + cf;
        const total = am + af + cm + cf;
        const el = document.getElementById('total-passengers');
        if (el) el.textContent = `Total Passengers: ${total}`;
    });
});

// ============================================================
// RECEIPT NUMBER GENERATOR
// ============================================================
function generateReceipt() {
    return `TF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
}

// ============================================================
// FORM SUBMISSION
// ============================================================
document.getElementById('passenger-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('status-message');
    const user = getCurrentUser();

    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';
    msg.style.display = 'none';

    const type   = document.getElementById('type').value;
    const denom  = document.getElementById('denomination').value;
    const plate  = document.getElementById('plate-number').value.toUpperCase().trim();
    const origin = type === 'ARRIVAL'    ? document.getElementById('origin').value      : 'BROOKE\'S POINT';
    const dest   = type === 'DEPARTURE'  ? document.getElementById('destination').value  : 'BROOKE\'S POINT';

    const am = +document.getElementById('adult-male').value    ||0;
    const af = +document.getElementById('adult-female').value  ||0;
    const cm = +document.getElementById('child-male').value    ||0;
    const cf = +document.getElementById('child-female').value  ||0;
    const sm = +document.getElementById('senior-male').value   ||0;
    const sf = +document.getElementById('senior-female').value ||0;
    const pm = +document.getElementById('pwd-male').value      ||0;
    const pf = +document.getElementById('pwd-female').value    ||0;
    const pg = +document.getElementById('pregnant').value      ||0;

    const fee    = document.getElementById('terminal-fee-amount').value || 0;
    const method = document.getElementById('payment-method').value || '';
    const status = document.getElementById('payment-status').value || '';
    let   receipt= document.getElementById('receipt-number').value.trim();
    let   notes  = document.getElementById('fee-notes').value.trim();
    const ticketRecord = document.getElementById('ticket-record')
                         ? document.getElementById('ticket-record').value : '';

    if (type === 'DEPARTURE' && status === 'Paid' && !receipt) {
        receipt = generateReceipt();
        document.getElementById('receipt-number').value = receipt;
    }

    // Append ticket record and GPS to notes
    if (ticketRecord) notes = (notes ? notes + ' | ' : '') + `Tickets: ${ticketRecord}`;
    if (capturedPhoto) {
        notes = (notes ? notes + ' | ' : '') + 'Arkabala photo captured';
        if (capturedPhoto.geo) notes += ` GPS:${capturedPhoto.geo.lat.toFixed(5)},${capturedPhoto.geo.lon.toFixed(5)}`;
    }

    const params = new URLSearchParams({
        tripDate: document.getElementById('trip-date').value,
        tripTime: document.getElementById('trip-time').value,
        type, denomination: denom,
        transportGroup: document.getElementById('transport-group').value,
        origin, destination: dest, plateNumber: plate,
        adultMale: am, adultFemale: af, adultTotal: am+af,
        childMale: cm, childFemale: cf, childTotal: cm+cf,
        seniorMale: sm, seniorFemale: sf, seniorTotal: sm+sf,
        pwdMale: pm, pwdFemale: pf, pwdTotal: pm+pf,
        pregnant: pg, totalPassengers: am+af+cm+cf,
        username: user.username,
        terminalFee: fee, paymentMethod: method,
        paymentStatus: status, receiptNumber: receipt, feeNotes: notes
    });

    try {
        const res  = await fetch(CONFIG.DATA_API_URL + '?' + params.toString(), { method:'GET', redirect:'follow' });
        const data = await res.json();

        if (data.success) {
            if (denom === 'TRICYCLE' && type === 'DEPARTURE' && status === 'Paid' && parseFloat(fee) > 0) {
                markTricyclePaidToday(plate, receipt);
            }
            let successMsg = '✅ Submitted!';
            if (type === 'DEPARTURE' && parseFloat(fee) > 0) successMsg += ` Fee: ₱${fee} | Receipt: ${receipt}`;
            if (ticketRecord) successMsg += ` | ${ticketRecord}`;

            msg.textContent = successMsg;
            msg.className = 'status-message status-success';
            msg.style.display = 'block';

            setTimeout(() => {
                document.getElementById('passenger-form').reset();
                initializeDateAndTime();
                const tpEl = document.getElementById('total-passengers');
                if (tpEl) tpEl.textContent = 'Total Passengers: 0';
                msg.style.display = 'none';
                ['origin-group','destination-group'].forEach(id => document.getElementById(id).classList.add('hidden'));
                document.getElementById('fee-section').classList.add('hidden');
                const ts = document.getElementById('ticket-section');
                if (ts) ts.style.display = 'none';
                const th = document.getElementById('ticket-hint');
                if (th) th.innerHTML = '';
                document.getElementById('transport-group').innerHTML = '<option value="">First select vehicle type</option>';
                document.getElementById('transport-group').disabled = true;
                capturedPhoto = null;
                const ap = document.getElementById('arkabala-preview');
                if (ap) ap.innerHTML = '';
            }, 3500);

        } else { throw new Error(data.message || 'Submission failed'); }

    } catch(err) {
        msg.textContent = '❌ Submission failed. Check connection and try again.';
        msg.className = 'status-message status-error';
        msg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = '📤 SUBMIT DATA';
    }
});

// ============================================================
// TICKET SERIAL INPUT LISTENERS
// ============================================================
['serial-start-10','serial-start-5'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateTickets);
});

// Expose functions needed by HTML buttons
window.startQRScanner        = startQRScanner;
window.captureArkabalaPhoto  = captureArkabalaPhoto;
window.snapPhoto             = snapPhoto;
window.closeLiveCamera       = closeLiveCamera;
window.removePhoto           = removePhoto;
window.readSerialWithOCR     = readSerialWithOCR;
window.recalculateTickets    = recalculateTickets;

console.log('✅ BPGT V4.5 TICKET EDITION — ready!');
