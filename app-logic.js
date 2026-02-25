// ============================================================
// BPGT TERMINAL SYSTEM — app-logic.js — VERSION 4.5
// TICKET EDITION — COMPLETE WORKING VERSION
// ============================================================

requireLogin();

window.addEventListener('load', () => {
    const user = getCurrentUser();
    if (user) document.getElementById('user-name').textContent = user.fullName;
    setDateTime();
    resetTricycleIfNewDay();
    loadVehicleRegistry();
    preloadOCR();
});

// ── DATE & TIME ──
function setDateTime() {
    const now = new Date();
    const d = document.getElementById('trip-date');
    const t = document.getElementById('trip-time');
    if (d) d.value = now.toISOString().split('T')[0];
    if (t) t.value = now.toTimeString().slice(0,5);
}

// ── TRICYCLE DAY PASS ──
function todayKey() { return new Date().toISOString().split('T')[0]; }
function resetTricycleIfNewDay() {
    if (localStorage.getItem('bpgt_tc_date') !== todayKey()) {
        localStorage.removeItem('bpgt_tc_paid');
        localStorage.setItem('bpgt_tc_date', todayKey());
    }
}
function markTricyclePaid(plate, receipt) {
    const paid = JSON.parse(localStorage.getItem('bpgt_tc_paid') || '{}');
    paid[plate.toUpperCase()] = {
        receipt,
        time: new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})
    };
    localStorage.setItem('bpgt_tc_paid', JSON.stringify(paid));
}
function getTricyclePaid(plate) {
    return JSON.parse(localStorage.getItem('bpgt_tc_paid') || '{}')[plate.toUpperCase()] || null;
}

// ── FEES ──
const FEES = { 'BUS':60, 'SHUTTLE VAN':30, 'JEEP':15, 'MULTICAB':10, 'FILCAB':10, 'TRICYCLE':10 };
const GROUPS = {
    'BUS':         ['RORO','CHERRY'],
    'SHUTTLE VAN': ['BARAKAH','CENTRO','PILANDOK','RAYANN','RECARO','RIO TUBA EXP.','RUNLEE','FREELANCE'],
    'TRICYCLE':    ['TODA'],
    'JEEP':        ['N/A'], 'MULTICAB':['N/A'], 'FILCAB':['N/A']
};
const INTER = [
    "BP",        // Brooke's Point
    "PPC",       // Puerto Princesa
    "Ab",        // Aborlan
    "NR",        // Narra
    "SE",        // Sof. Española
    "Qz",        // Quezon
    "Bt",        // Bataraza
    "Brt",       // Rio-Tuba
    "Bby",       // Buliluyan
    "Rsc",       // Sicud
    "Rz"         // Rizal
];

const INTRA = [
    "Pb1",       // Poblacion1
    "Pb2",       // Poblacion2
    "Tub",       // Tubtub
    "PSU",       // PSU
    "Mnt",       // Mainit
    "Imd",       // Imulnod
    "Png",       // Pangobilian
    "Blc",       // Balacan
    "Prt",       // Paratungon
    "Unp",       // Unitop
    "Mkt",       // Market
    "PLCo"        // PALECO
];

// ── VEHICLE REGISTRY ──
let registry = {};
async function loadVehicleRegistry() {
    try {
        const res = await fetch(CONFIG.VEHICLE_API_URL);
        const data = await res.json();
        if (data.success) registry = {...data.vehicles};
    } catch(e) {}
    const custom = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    Object.assign(registry, custom);
}
function saveNewVehicle(plate, denomination, group) {
    const entry = { denomination, transportGroup: group, addedDate: new Date().toISOString(), addedBy: getCurrentUser().username };
    registry[plate] = entry;
    const custom = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    custom[plate] = entry;
    localStorage.setItem('bpgt_custom_vehicles', JSON.stringify(custom));
}

// ── PLATE NUMBER ──
document.getElementById('plate-number').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});
document.getElementById('plate-number').addEventListener('blur', function() {
    const plate = this.value.toUpperCase().trim();
    if (!plate) return;
    const info = registry[plate];
    if (info) {
        document.getElementById('denomination').value = info.denomination;
        document.getElementById('denomination').dispatchEvent(new Event('change'));
        setTimeout(() => {
            document.getElementById('transport-group').value = info.transportGroup;
            recalcFee();
        }, 150);
        setVehicleStatus('', '');
    } else {
        setVehicleStatus('ℹ️ New vehicle — select type below', 'yellow');
    }
});

function setVehicleStatus(msg, type) {
    const el = document.getElementById('vehicle-status');
    if (!el) return;
    if (!msg) { el.innerHTML = ''; return; }
    const s = { green:'background:#d1fae5;color:#065f46;border-left:4px solid #059669;',
                yellow:'background:#fef3c7;color:#92400e;border-left:4px solid #f59e0b;',
                red:'background:#fee2e2;color:#991b1b;border-left:4px solid #ef4444;' };
    el.innerHTML = `<div style="${s[type]||s.yellow}padding:8px 12px;border-radius:6px;font-size:13px;margin-top:6px;">${msg}</div>`;
    if (type !== 'red') setTimeout(() => el.innerHTML = '', 4000);
}

// ── DENOMINATION DROPDOWN ──
document.getElementById('denomination').addEventListener('change', function() {
    const denom = this.value;
    const tg = document.getElementById('transport-group');
    tg.innerHTML = '<option value="">Select Transport Group</option>';
    if (denom && GROUPS[denom]) {
        GROUPS[denom].forEach(g => { const o = document.createElement('option'); o.value = o.textContent = g; tg.appendChild(o); });
        tg.disabled = false;
    } else { tg.disabled = true; }
    recalcFee();
});

document.getElementById('transport-group').addEventListener('change', function() {
    const plate = document.getElementById('plate-number').value.toUpperCase().trim();
    const denom = document.getElementById('denomination').value;
    const group = this.value;
    if (plate && denom && group && !registry[plate]) {
        saveNewVehicle(plate, denom, group);
        setVehicleStatus('✅ New vehicle saved!', 'green');
    }
    recalcFee();
});

// ── TYPE / ORIGIN / DESTINATION ──
document.getElementById('type').addEventListener('change', function() {
    const type  = this.value;
    const denom = document.getElementById('denomination').value;
    const locs  = denom === 'TRICYCLE' ? INTRA : INTER;
    const og = document.getElementById('origin-group');
    const dg = document.getElementById('destination-group');
    const os = document.getElementById('origin');
    const ds = document.getElementById('destination');
    const fill = (sel, label) => {
        sel.innerHTML = `<option value="">Select ${label}</option>`;
        locs.forEach(l => { const o = document.createElement('option'); o.value = o.textContent = l; sel.appendChild(o); });
    };
    if (type === 'ARRIVAL') {
        og.classList.remove('hidden'); dg.classList.add('hidden');
        fill(os, 'Origin'); os.required = true; ds.required = false; ds.value = '';
    } else if (type === 'DEPARTURE') {
        dg.classList.remove('hidden'); og.classList.add('hidden');
        fill(ds, 'Destination'); ds.required = true; os.required = false; os.value = '';
    } else {
        og.classList.add('hidden'); dg.classList.add('hidden');
    }
    recalcFee();
});

// ── FEE CALCULATION ──
function recalcFee() {
    const type  = document.getElementById('type').value;
    const denom = document.getElementById('denomination').value;
    const plate = document.getElementById('plate-number').value.toUpperCase().trim();
    const feeEl = document.getElementById('fee-section');
    const dispEl= document.getElementById('fee-amount-display');
    const hidEl = document.getElementById('terminal-fee-amount');
    const warnEl= document.getElementById('fee-warning');
    const tickEl= document.getElementById('ticket-section');

    if (type !== 'DEPARTURE' || !denom) {
        feeEl.classList.remove('visible');
        if (tickEl) tickEl.classList.remove('visible');
        hidEl.value = 0;
        if (warnEl) warnEl.innerHTML = '';
        return;
    }
    let fee = FEES[denom] || 0;

    // Tricycle day pass
    if (denom === 'TRICYCLE' && plate) {
        const paid = getTricyclePaid(plate);
        if (paid) {
            fee = 0;
            if (warnEl) warnEl.innerHTML = `<div class="info-box info-yellow">✅ Day pass paid at ${paid.time} — Receipt: ${paid.receipt}</div>`;
            dispEl.textContent = '₱0.00';
            hidEl.value = 0;
            feeEl.classList.add('visible');
            if (tickEl) tickEl.classList.remove('visible');
            setPaymentFields('Cash','Paid',`Day pass paid at ${paid.time}`);
            return;
        }
    }

    if (warnEl) {
        warnEl.innerHTML = denom === 'BUS'
            ? '<div class="info-box info-orange">🚌 All buses: ₱60.00 flat — Ordinance 2026-01</div>'
            : '';
    }

    dispEl.textContent = `₱${fee.toFixed(2)}`;
    hidEl.value = fee;
    feeEl.classList.add('visible');

    if (tickEl && fee > 0) {
        tickEl.classList.add('visible');
        updateTicketHint(fee);
        clearTickets();
    } else if (tickEl) {
        tickEl.classList.remove('visible');
    }
}

function setPaymentFields(method, status, notes) {
    ['payment-method','payment-status','fee-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'payment-method') el.value = method;
        if (id === 'payment-status') el.value = status;
        if (id === 'fee-notes') el.value = notes;
        el.disabled = true;
    });
}

// ── PASSENGER COUNT ──
// Works with class "pax" in new app.html
document.querySelectorAll('.pax').forEach(inp => {
    inp.addEventListener('input', updatePassengerTotal);
});
function updatePassengerTotal() {
    const am = +document.getElementById('adult-male').value   || 0;
    const af = +document.getElementById('adult-female').value || 0;
    const cm = +document.getElementById('child-male').value   || 0;
    const cf = +document.getElementById('child-female').value || 0;
    document.getElementById('adult-total').value = am + af;
    document.getElementById('child-total').value = cm + cf;
    const total = am + af + cm + cf;
    const el = document.getElementById('total-passengers');
    if (el) el.textContent = `Total Passengers: ${total}`;
}

// ── TICKET SYSTEM ──
function updateTicketHint(fee) {
    const el = document.getElementById('ticket-hint');
    if (!el) return;
    const w10 = fee % 10 === 0 ? `${fee/10} × ₱10` : `${Math.floor(fee/10)} × ₱10 + ${(fee%10)/5} × ₱5`;
    el.textContent = `For ₱${fee}: Use ${w10}   OR all ₱5: ${fee/5} × ₱5 tickets`;
}

function clearTickets() {
    ['serial-start-10','serial-start-5'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['result-10','result-5'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = ''; el.className = 'ticket-result'; } });
    const sum = document.getElementById('ticket-summary');
    if (sum) { sum.innerHTML = ''; sum.classList.remove('visible'); }
    ['ticket-record-10','ticket-record-5'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function recalcTickets() {
    const fee = parseFloat(document.getElementById('terminal-fee-amount').value) || 0;
    if (fee <= 0) return;
    const s10 = parseInt(document.getElementById('serial-start-10').value) || 0;
    const s5  = parseInt(document.getElementById('serial-start-5').value)  || 0;
    const r10 = document.getElementById('result-10');
    const r5  = document.getElementById('result-5');
    const sum = document.getElementById('ticket-summary');
    const rec10 = document.getElementById('ticket-record-10');
    const rec5  = document.getElementById('ticket-record-5');

    // Clear previous
    if (r10) { r10.textContent = ''; r10.className = 'ticket-result'; }
    if (r5)  { r5.textContent  = ''; r5.className  = 'ticket-result'; }
    if (sum) { sum.innerHTML = ''; sum.classList.remove('visible'); }
    if (rec10) rec10.value = '';
    if (rec5)  rec5.value  = '';

    let record10 = '', record5 = '', valid = false;

    if (s5 > 0 && s10 === 0) {
        // ALL ₱5
        const qty5 = fee / 5;
        if (!Number.isInteger(qty5)) {
            if (r5) { r5.textContent = `⚠️ ₱${fee} cannot use ₱5 tickets only.`; r5.className = 'ticket-result result-warn'; }
            return;
        }
        const end5 = s5 + qty5 - 1;
        record5 = `5-${String(s5).padStart(6,'0')}:${String(end5).padStart(6,'0')}`;
        if (r5) { r5.textContent = `${qty5} ticket${qty5>1?'s':''} · end serial: ${String(end5).padStart(6,'0')} · ₱${fee} ✅`; r5.className = 'ticket-result result-ok'; }
        valid = true;

    } else if (s10 > 0 && s5 === 0) {
        if (fee % 10 !== 0) {
            // Needs ₱5 too
            const qty10 = Math.floor(fee / 10);
            const end10 = s10 + qty10 - 1;
            record10 = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
            if (r10) { r10.textContent = `${qty10} ticket${qty10>1?'s':''} · end: ${String(end10).padStart(6,'0')} · covers ₱${qty10*10} — also enter ₱5 serial below for ₱${fee%10}`; r10.className = 'ticket-result result-warn'; }
        } else {
            const qty10 = fee / 10;
            const end10 = s10 + qty10 - 1;
            record10 = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
            if (r10) { r10.textContent = `${qty10} ticket${qty10>1?'s':''} · end serial: ${String(end10).padStart(6,'0')} · ₱${fee} ✅`; r10.className = 'ticket-result result-ok'; }
            valid = true;
        }

    } else if (s10 > 0 && s5 > 0) {
        // MIXED
        const qty10 = Math.floor(fee / 10);
        const rem   = fee % 10;
        const qty5  = rem > 0 ? rem / 5 : 0;
        const end10 = s10 + qty10 - 1;
        record10 = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
        if (r10) { r10.textContent = `${qty10} ticket${qty10>1?'s':''} · end: ${String(end10).padStart(6,'0')} · ₱${qty10*10}`; r10.className = 'ticket-result result-ok'; }
        if (qty5 > 0) {
            const end5 = s5 + qty5 - 1;
            record5 = `5-${String(s5).padStart(6,'0')}:${String(end5).padStart(6,'0')}`;
            if (r5) { r5.textContent = `${qty5} ticket · end: ${String(end5).padStart(6,'0')} · ₱${qty5*5}`; r5.className = 'ticket-result result-ok'; }
        }
        valid = (qty10*10 + qty5*5 === fee);
    }

    if (rec10) rec10.value = record10;
    if (rec5)  rec5.value  = record5;

    if (valid && sum) {
        const combined = [record10, record5].filter(Boolean).join(' + ');
        sum.innerHTML = `<strong>✅ Ticket Record:</strong><br><span style="font-family:monospace;font-size:14px;">${combined}</span><br><small style="color:#64748b;">Saved automatically on submit</small>`;
        sum.classList.add('visible');
    }
}
// ── QR VALIDATION FUNCTIONS ──
async function calculateChecksum(plateNumber) {
    const data = plateNumber + SECRET_KEY;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 8).toUpperCase();
}

async function extractAndValidatePlate(scannedText) {
    const parts = scannedText.split('-');
    
    // Secure format: NOISE-PLATE-CHECKSUM-NOISE (4 parts)
    if (parts.length === 4) {
        const extractedPlate = parts[1].trim();
        const receivedChecksum = parts[2].trim();
        const expectedChecksum = await calculateChecksum(extractedPlate);
        
        if (receivedChecksum === expectedChecksum) {
            return { valid: true, plate: extractedPlate, message: '✅ Valid BPGT QR' };
        } else {
            return { valid: false, plate: null, message: '❌ FAKE QR' };
        }
    }
    
    // Old format: NOISE-PLATE-NOISE (3 parts)
    if (parts.length === 3) {
        return { valid: true, plate: parts[1].trim(), message: '⚠️ Old format' };
    }
    
    // Plain text (no dashes)
    return { valid: true, plate: scannedText.trim(), message: '✅ Plain QR' };
}
// ── QR SCANNER ──
let qrScanner = null;
window.startQRScanner = function() {
    const qrDiv = document.getElementById('qr-reader');
    if (!qrDiv) return;
    qrDiv.style.display = 'block';
    if (qrScanner) { qrScanner.clear().catch(()=>{}); qrScanner = null; }
    qrScanner = new Html5QrcodeScanner('qr-reader', { fps:10, qrbox:{width:250,height:250}, facingMode:'environment' }, false);
    qrScanner.render(async (text) => {
    // Validate and extract plate
    const result = await extractAndValidatePlate(text);
    
    if (result.valid && result.plate) {
        // Valid QR - fill plate
        document.getElementById('plate-number').value = result.plate.toUpperCase();
        document.getElementById('plate-number').dispatchEvent(new Event('blur'));
        qrScanner.clear().catch(()=>{});
        qrDiv.style.display = 'none';
        setVehicleStatus(result.message + ': ' + result.plate, 'green');
    } else {
        // FAKE QR detected!
        qrScanner.clear().catch(()=>{});
        qrDiv.style.display = 'none';
        setVehicleStatus('❌ FAKE QR CODE! Not a registered BPGT vehicle.', 'red');
        alert('⚠️ FAKE QR CODE DETECTED!\n\nThis QR code is not genuine. Contact admin.');
    }
    }, error => {
        console.error('QR Scanner error:', error);
        qrScanner.clear().catch(()=>{});
        qrDiv.style.display = 'none';
        setVehicleStatus('❌ Scanner error. Please check camera permissions.', 'red');
    });
};

// ── CAMERA / PHOTO ──
let capturedPhoto = null;
window.capturePhoto = function() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        openCam();
    } else { fallbackInput(); }
};
function openCam() {
    const overlay = document.getElementById('camera-overlay');
    const video   = document.getElementById('camera-video');
    if (!overlay || !video) { fallbackInput(); return; }
    overlay.classList.add('visible');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact:'environment' } } })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' } }))
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then(stream => { video.srcObject = stream; video.play(); window._camStream = stream; })
    .catch(() => { closeCam(); fallbackInput(); });
}
window.snapPhoto = function() {
    const video = document.getElementById('camera-video');
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    closeCam();
    attachPhotoWithGPS(canvas.toDataURL('image/jpeg', 0.85));
};
window.closeCam = function() {
    if (window._camStream) { window._camStream.getTracks().forEach(t => t.stop()); window._camStream = null; }
    const overlay = document.getElementById('camera-overlay');
    if (overlay) overlay.classList.remove('visible');
};
function fallbackInput() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
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
            const pos = await new Promise((res,rej) => navigator.geolocation.getCurrentPosition(res,rej,{timeout:6000,enableHighAccuracy:true}));
            geo = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        } catch(e) {}
    }
    capturedPhoto = { image: imgData, geo, ts: new Date().toISOString() };
    const el = document.getElementById('arkabala-preview');
    if (!el) return;
    const geo2 = capturedPhoto.geo;
    el.innerHTML = `
        <img src="${imgData}" style="width:100%;border-radius:10px;margin-top:8px;">
        <div style="font-size:12px;padding:7px 10px;margin-top:6px;border-radius:6px;${geo2?'background:#d1fae5;color:#065f46;':'background:#fef3c7;color:#92400e;'}">
            ${geo2 ? `📍 GPS: ${geo2.lat.toFixed(6)}, ${geo2.lon.toFixed(6)} (±${Math.round(geo2.accuracy)}m)` : '⚠️ GPS unavailable'}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <button type="button" onclick="ocrScan('10')" style="padding:8px 14px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;">🔍 Read ₱10 Serial</button>
            <button type="button" onclick="ocrScan('5')"  style="padding:8px 14px;background:#7c3aed;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;">🔍 Read ₱5 Serial</button>
            <button type="button" onclick="removePhoto()" style="padding:8px 14px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;">❌ Remove</button>
        </div>`;
}
window.removePhoto = function() {
    capturedPhoto = null;
    const el = document.getElementById('arkabala-preview');
    if (el) el.innerHTML = '';
};

// ── OCR ──
function preloadOCR() {
    if (typeof Tesseract !== 'undefined') return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    document.head.appendChild(s);
}
window.ocrScan = async function(denom) {
    if (!capturedPhoto) { alert('📸 Take a photo first, then tap Scan!'); return; }
    if (typeof Tesseract === 'undefined') { alert('⏳ OCR loading, wait a moment and try again.'); return; }
    const fieldId = denom === '5' ? 'serial-start-5' : 'serial-start-10';
    const field   = document.getElementById(fieldId);
    if (!field) return;
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '⏳...'; btn.disabled = true;
    try {
        const result = await Tesseract.recognize(capturedPhoto.image, 'eng', { tessedit_char_whitelist:'0123456789', logger:()=>{} });
        const numbers = (result.data.text.replace(/\D/g,'').match(/\d{4,8}/g) || []);
        if (numbers.length > 0) {
            field.value = numbers[0].padStart(6,'0');
            recalcTickets();
            alert(`✅ Detected: ${numbers[0].padStart(6,'0')}\nFor ₱${denom} field — verify it's correct!`);
        } else { alert('⚠️ Could not read number. Type manually.'); }
    } catch(e) { alert('⚠️ OCR failed. Type manually.'); }
    finally { btn.textContent = orig; btn.disabled = false; }
};

// ── FORM SUBMIT ──
document.getElementById('passenger-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('submit-btn');
    const msg  = document.getElementById('status-message');
    const user = getCurrentUser();

    btn.disabled = true; btn.textContent = '⏳ Submitting...';
    if (msg) { msg.style.display = 'none'; }

    const type   = document.getElementById('type').value;
    const denom  = document.getElementById('denomination').value;
    const plate  = document.getElementById('plate-number').value.toUpperCase().trim();
    const origin = type === 'ARRIVAL'    ? document.getElementById('origin').value      : "BROOKE'S POINT";
    const dest   = type === 'DEPARTURE'  ? document.getElementById('destination').value  : "BROOKE'S POINT";

    const am = +document.getElementById('adult-male').value    || 0;
    const af = +document.getElementById('adult-female').value  || 0;
    const cm = +document.getElementById('child-male').value    || 0;
    const cf = +document.getElementById('child-female').value  || 0;
    const sm = +document.getElementById('senior-male').value   || 0;
    const sf = +document.getElementById('senior-female').value || 0;
    const pm = +document.getElementById('pwd-male').value      || 0;
    const pf = +document.getElementById('pwd-female').value    || 0;
    const pg = +document.getElementById('pregnant').value      || 0;

    const fee    = document.getElementById('terminal-fee-amount').value || 0;
    const method = document.getElementById('payment-method').value || '';
    const status = document.getElementById('payment-status').value || '';
    let   notes  = document.getElementById('fee-notes').value.trim();

    // Ticket records
    const ticket10 = document.getElementById('ticket-record-10') ? document.getElementById('ticket-record-10').value : '';
    const ticket5  = document.getElementById('ticket-record-5')  ? document.getElementById('ticket-record-5').value  : '';

    // Auto receipt
    const receipt = `TF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    // GPS note
    if (capturedPhoto) {
        notes = (notes ? notes + ' | ' : '') + 'Arkabala photo';
        if (capturedPhoto.geo) notes += ` GPS:${capturedPhoto.geo.lat.toFixed(5)},${capturedPhoto.geo.lon.toFixed(5)}`;
    }

    const params = new URLSearchParams({
        tripDate:       document.getElementById('trip-date').value,
        tripTime:       document.getElementById('trip-time').value,
        type, denomination: denom,
        transportGroup: document.getElementById('transport-group').value,
        origin, destination: dest, plateNumber: plate,
        adultMale:am, adultFemale:af, adultTotal:am+af,
        childMale:cm, childFemale:cf, childTotal:cm+cf,
        seniorMale:sm, seniorFemale:sf, seniorTotal:sm+sf,
        totalMales:am+cm, totalFemales:af+cf,
        pwdMale:pm, pwdFemale:pf, pwdTotal:pm+pf,
        pregnant:pg, totalPassengers:am+af+cm+cf,
        username: user.username,
        terminalFee:fee, paymentMethod:method,
        paymentStatus:status, receiptNumber:receipt,
        feeNotes:notes, ticket10, ticket5
    });

    try {
        const res  = await fetch(CONFIG.DATA_API_URL + '?' + params.toString(), { method:'GET', redirect:'follow' });
        const data = await res.json();
        if (data.success) {
            if (denom === 'TRICYCLE' && type === 'DEPARTURE' && status === 'Paid' && parseFloat(fee) > 0) {
                markTricyclePaid(plate, receipt);
            }
            let ok = '✅ Submitted!';
            if (type === 'DEPARTURE' && parseFloat(fee) > 0) ok += ` Fee: ₱${fee}`;
            if (ticket10) ok += ` | ₱10: ${ticket10}`;
            if (ticket5)  ok += ` | ₱5: ${ticket5}`;
            if (msg) { msg.textContent = ok; msg.className = 'status-msg status-success'; msg.style.display = 'block'; }
            setTimeout(() => {
                document.getElementById('passenger-form').reset();
                setDateTime();
                const tp = document.getElementById('total-passengers');
                if (tp) tp.textContent = 'Total Passengers: 0';
                if (msg) msg.style.display = 'none';
                document.getElementById('fee-section').classList.remove('visible');
                document.getElementById('ticket-section')?.classList.remove('visible');
                ['origin-group','destination-group'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
                document.getElementById('transport-group').innerHTML = '<option value="">First select vehicle type</option>';
                document.getElementById('transport-group').disabled = true;
                ['payment-method','payment-status','fee-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
                capturedPhoto = null;
                const prev = document.getElementById('arkabala-preview');
                if (prev) prev.innerHTML = '';
            }, 3500);
        } else { throw new Error(data.message || 'Failed'); }
    } catch(err) {
        if (msg) { msg.textContent = '❌ Submission failed. Check connection and try again.'; msg.className = 'status-msg status-error'; msg.style.display = 'block'; }
    } finally {
        btn.disabled = false; btn.textContent = '📤 SUBMIT DATA';
    }
});

console.log('✅ BPGT V4.5 TICKET EDITION loaded!');
