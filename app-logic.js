// ============================================================
// BPGT TERMINAL SYSTEM — app-logic.js — VERSION 4.5
// TICKET EDITION
// Fixes: camera direct open, ticket UI working, all buses ₱60
// New: ticket serial tracking (₱10 + ₱5 fields)
// Google Sheet: writes to TICKET_10 and TICKET_5 columns
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

// ============================================================
// DATE & TIME
// ============================================================
function setDateTime() {
    const now = new Date();
    const d = document.getElementById('trip-date');
    const t = document.getElementById('trip-time');
    if (d) d.value = now.toISOString().split('T')[0];
    if (t) t.value = now.toTimeString().slice(0, 5);
}

// ============================================================
// TRICYCLE DAY PASS
// ============================================================
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
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    localStorage.setItem('bpgt_tc_paid', JSON.stringify(paid));
}

function getTricyclePaid(plate) {
    return JSON.parse(localStorage.getItem('bpgt_tc_paid') || '{}')[plate.toUpperCase()] || null;
}

// ============================================================
// FEES — V4.5: ALL BUSES = ₱60 FLAT
// ============================================================
const FEES = {
    'BUS':        60,
    'SHUTTLE VAN': 30,
    'JEEP':        15,
    'MULTICAB':    10,
    'FILCAB':      10,
    'TRICYCLE':    10
};

const GROUPS = {
    'BUS':         ['RORO', 'CHERRY'],
    'SHUTTLE VAN': ['BARAKAH','CENTRO','PILANDOK','RAYANN','RECARO','RIO TUBA EXP.','RUNLEE','FREELANCE'],
    'TRICYCLE':    ['TODA'],
    'JEEP':        ['N/A'],
    'MULTICAB':    ['N/A'],
    'FILCAB':      ['N/A']
};

const INTER = ['BROOKE\'S POINT','PPC','ABORLAN','NARRA','S.ESPAÑOLA','QUEZON','BATARAZA','RIO-TUBA','BULILUYAN','SICUD','RIZAL'];
const INTRA = ['POBLACION','TUBTUB','PSU','MAINIT','IMULNOD','PANGOBILIAN'];

// ============================================================
// VEHICLE REGISTRY
// ============================================================
let registry = {};

async function loadVehicleRegistry() {
    try {
        const res  = await fetch(CONFIG.VEHICLE_API_URL);
        const data = await res.json();
        if (data.success) registry = { ...data.vehicles };
    } catch(e) { console.log('Registry load failed:', e); }
    // Merge custom vehicles from localStorage
    const custom = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    Object.assign(registry, custom);
}

function registerNewVehicle(plate, denomination, group) {
    const entry = {
        denomination, transportGroup: group,
        addedDate: new Date().toISOString(),
        addedBy: getCurrentUser().username
    };
    registry[plate] = entry;
    const custom = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    custom[plate] = entry;
    localStorage.setItem('bpgt_custom_vehicles', JSON.stringify(custom));
}

// ============================================================
// PLATE NUMBER — auto fill from registry
// ============================================================
document.getElementById('plate-number').addEventListener('input', function () {
    this.value = this.value.toUpperCase();
});

document.getElementById('plate-number').addEventListener('blur', function () {
    const plate = this.value.toUpperCase().trim();
    if (!plate) return;
    const info = registry[plate];
    if (info) {
        const denomSel = document.getElementById('denomination');
        denomSel.value = info.denomination;
        denomSel.dispatchEvent(new Event('change'));
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
    const styles = {
        green:  'background:#d1fae5;color:#065f46;border-left:4px solid #059669;',
        yellow: 'background:#fef3c7;color:#92400e;border-left:4px solid #f59e0b;',
        red:    'background:#fee2e2;color:#991b1b;border-left:4px solid #ef4444;'
    };
    el.innerHTML = `<div style="${styles[type]||styles.yellow}padding:8px 12px;border-radius:6px;font-size:13px;margin-top:6px;">${msg}</div>`;
    if (type !== 'red') setTimeout(() => el.innerHTML = '', 4000);
}

// ============================================================
// DENOMINATION → populate transport group
// ============================================================
document.getElementById('denomination').addEventListener('change', function () {
    const denom = this.value;
    const tg = document.getElementById('transport-group');
    tg.innerHTML = '<option value="">Select Transport Group</option>';
    if (denom && GROUPS[denom]) {
        GROUPS[denom].forEach(g => {
            const o = document.createElement('option');
            o.value = o.textContent = g;
            tg.appendChild(o);
        });
        tg.disabled = false;
    } else {
        tg.disabled = true;
    }
    recalcFee();
});

document.getElementById('transport-group').addEventListener('change', function () {
    const plate = document.getElementById('plate-number').value.toUpperCase().trim();
    const denom = document.getElementById('denomination').value;
    const group = this.value;
    if (plate && denom && group && !registry[plate]) {
        registerNewVehicle(plate, denom, group);
        setVehicleStatus('✅ New vehicle saved to registry!', 'green');
    }
    recalcFee();
});

// ============================================================
// TYPE → show origin / destination
// ============================================================
document.getElementById('type').addEventListener('change', function () {
    const type  = this.value;
    const denom = document.getElementById('denomination').value;
    const locs  = denom === 'TRICYCLE' ? INTRA : INTER;

    const ogGrp = document.getElementById('origin-group');
    const dgGrp = document.getElementById('destination-group');
    const oSel  = document.getElementById('origin');
    const dSel  = document.getElementById('destination');

    const fill = (sel, label) => {
        sel.innerHTML = `<option value="">Select ${label}</option>`;
        locs.forEach(l => { const o = document.createElement('option'); o.value = o.textContent = l; sel.appendChild(o); });
    };

    if (type === 'ARRIVAL') {
        ogGrp.classList.remove('hidden');
        dgGrp.classList.add('hidden');
        fill(oSel, 'Origin');
        oSel.required = true;
        dSel.required = false;
        dSel.value = '';
    } else if (type === 'DEPARTURE') {
        dgGrp.classList.remove('hidden');
        ogGrp.classList.add('hidden');
        fill(dSel, 'Destination');
        dSel.required = true;
        oSel.required = false;
        oSel.value = '';
    } else {
        ogGrp.classList.add('hidden');
        dgGrp.classList.add('hidden');
    }
    recalcFee();
});

// ============================================================
// FEE CALCULATION
// ============================================================
function recalcFee() {
    const type   = document.getElementById('type').value;
    const denom  = document.getElementById('denomination').value;
    const plate  = document.getElementById('plate-number').value.toUpperCase().trim();
    const feeEl  = document.getElementById('fee-section');
    const dispEl = document.getElementById('fee-amount-display');
    const hidEl  = document.getElementById('terminal-fee-amount');
    const warnEl = document.getElementById('fee-warning');
    const tickEl = document.getElementById('ticket-section');

    if (type !== 'DEPARTURE' || !denom) {
        feeEl.classList.remove('visible');
        if (tickEl) tickEl.classList.remove('visible');
        hidEl.value = 0;
        if (warnEl) warnEl.innerHTML = '';
        return;
    }

    let fee = FEES[denom] || 0;

    // Tricycle day pass check
    if (denom === 'TRICYCLE' && plate) {
        const paid = getTricyclePaid(plate);
        if (paid) {
            fee = 0;
            if (warnEl) warnEl.innerHTML = `<div class="info-box info-yellow">✅ Day pass already paid at ${paid.time} — Receipt: ${paid.receipt}</div>`;
            dispEl.textContent = '₱0.00';
            hidEl.value = 0;
            feeEl.classList.add('visible');
            if (tickEl) tickEl.classList.remove('visible');
            prefillPaidFields('Cash', 'Paid', paid.receipt, `Day pass paid at ${paid.time}`);
            return;
        }
    }

    // Bus note
    if (warnEl) {
        warnEl.innerHTML = denom === 'BUS'
            ? '<div class="info-box info-orange">🚌 All buses: ₱60.00 flat — Ordinance 2026-01</div>'
            : '';
    }

    dispEl.textContent = `₱${fee.toFixed(2)}`;
    hidEl.value = fee;
    feeEl.classList.add('visible');

    // Show ticket section for departures with fee > 0
    if (tickEl && fee > 0) {
        tickEl.classList.add('visible');
        updateTicketHint(fee);
        clearTicketFields();
    } else if (tickEl) {
        tickEl.classList.remove('visible');
    }

    // Re-enable payment fields
    ['payment-method','payment-status','receipt-number','fee-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
}

function prefillPaidFields(method, status, receipt, notes) {
    const m = document.getElementById('payment-method');
    const s = document.getElementById('payment-status');
    const r = document.getElementById('receipt-number');
    const n = document.getElementById('fee-notes');
    if (m) { m.value = method; m.disabled = true; }
    if (s) { s.value = status; s.disabled = true; }
    if (r) { r.value = receipt; r.disabled = true; }
    if (n) { n.value = notes; n.disabled = true; }
}

// ============================================================
// TICKET SYSTEM — V4.5
// Staff enters START serial → app calculates END + qty
// Two fields: ₱10 and ₱5
// Can use all ₱5 for any amount
// ============================================================
function updateTicketHint(fee) {
    const el = document.getElementById('ticket-denomination-hint');
    if (!el) return;
    const w10 = fee % 10 === 0
        ? `${fee/10} × ₱10 ticket${fee/10>1?'s':''}`
        : `${Math.floor(fee/10)} × ₱10  +  ${(fee%10)/5} × ₱5`;
    const w5 = `${fee/5} × ₱5 ticket${fee/5>1?'s':''}`;
    el.textContent = `For ₱${fee}:  Use ${w10}   OR all ₱5: ${w5}`;
}

function clearTicketFields() {
    ['serial-start-10','serial-start-5'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['result-10','result-5'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.className = 'ticket-result'; }
    });
    const summary = document.getElementById('ticket-summary');
    if (summary) { summary.innerHTML = ''; summary.classList.remove('visible'); }
    const r10 = document.getElementById('ticket-record-10');
    const r5  = document.getElementById('ticket-record-5');
    if (r10) r10.value = '';
    if (r5)  r5.value  = '';
}

function recalculateTickets() {
    const fee  = parseFloat(document.getElementById('terminal-fee-amount').value) || 0;
    if (fee <= 0) return;

    const s10  = parseInt(document.getElementById('serial-start-10').value) || 0;
    const s5   = parseInt(document.getElementById('serial-start-5').value)  || 0;

    const res10 = document.getElementById('result-10');
    const res5  = document.getElementById('result-5');
    const summary = document.getElementById('ticket-summary');
    const rec10 = document.getElementById('ticket-record-10');
    const rec5  = document.getElementById('ticket-record-5');

    // Clear
    if (res10) { res10.textContent = ''; res10.className = 'ticket-result'; }
    if (res5)  { res5.textContent  = ''; res5.className  = 'ticket-result'; }
    if (summary) { summary.innerHTML = ''; summary.classList.remove('visible'); }
    if (rec10) rec10.value = '';
    if (rec5)  rec5.value  = '';

    let record10 = '', record5 = '', totalCovered = 0, valid = false;

    // ── CASE 1: Only ₱5 tickets ──
    if (s5 > 0 && s10 === 0) {
        const qty5 = fee / 5;
        if (!Number.isInteger(qty5)) {
            if (res5) { res5.textContent = `⚠️ ₱${fee} cannot be covered by ₱5 tickets only.`; res5.className = 'ticket-result warn'; }
            return;
        }
        const end5 = s5 + qty5 - 1;
        const r5str = `5-${String(s5).padStart(6,'0')}:${String(end5).padStart(6,'0')}`;
        if (res5) {
            res5.textContent = `${qty5} ticket${qty5>1?'s':''} · ends at ${String(end5).padStart(6,'0')} · ₱${fee} total`;
            res5.className = 'ticket-result ok';
        }
        record5 = r5str;
        totalCovered = fee;
        valid = true;
    }

    // ── CASE 2: Only ₱10 tickets (fee must be divisible by 10) ──
    else if (s10 > 0 && s5 === 0) {
        if (fee % 10 !== 0) {
            // Fee has a ₱5 remainder
            const qty10 = Math.floor(fee / 10);
            const end10 = s10 + qty10 - 1;
            if (res10) {
                res10.textContent = `${qty10} ticket${qty10>1?'s':''} covers ₱${qty10*10} — also enter ₱5 serial below for the remaining ₱${fee%10}`;
                res10.className = 'ticket-result warn';
            }
            const r10str = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
            record10 = r10str;
            totalCovered = qty10 * 10;
            // Not fully valid until ₱5 added
        } else {
            const qty10 = fee / 10;
            const end10 = s10 + qty10 - 1;
            const r10str = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
            if (res10) {
                res10.textContent = `${qty10} ticket${qty10>1?'s':''} · ends at ${String(end10).padStart(6,'0')} · ₱${fee} total ✅`;
                res10.className = 'ticket-result ok';
            }
            record10 = r10str;
            totalCovered = fee;
            valid = true;
        }
    }

    // ── CASE 3: Mixed ₱10 + ₱5 ──
    else if (s10 > 0 && s5 > 0) {
        const qty10 = Math.floor(fee / 10);
        const rem   = fee % 10;
        const qty5  = rem > 0 ? rem / 5 : 0;

        if (rem > 0 && rem % 5 !== 0) {
            if (res10) { res10.textContent = '⚠️ This fee cannot be covered by ₱10 + ₱5 tickets.'; res10.className = 'ticket-result warn'; }
            return;
        }

        const end10 = s10 + qty10 - 1;
        const r10str = `10-${String(s10).padStart(6,'0')}:${String(end10).padStart(6,'0')}`;
        if (res10) {
            res10.textContent = `${qty10} ticket${qty10>1?'s':''} · ends at ${String(end10).padStart(6,'0')} · ₱${qty10*10}`;
            res10.className = 'ticket-result ok';
        }
        record10 = r10str;

        if (qty5 > 0) {
            const end5 = s5 + qty5 - 1;
            const r5str = `5-${String(s5).padStart(6,'0')}:${String(end5).padStart(6,'0')}`;
            if (res5) {
                res5.textContent = `${qty5} ticket · ends at ${String(end5).padStart(6,'0')} · ₱${qty5*5}`;
                res5.className = 'ticket-result ok';
            }
            record5 = r5str;
        }
        totalCovered = qty10*10 + qty5*5;
        valid = (totalCovered === fee);
    }

    // ── SHOW SUMMARY ──
    if (rec10) rec10.value = record10;
    if (rec5)  rec5.value  = record5;

    if (valid && summary) {
        const combined = [record10, record5].filter(Boolean).join(' + ');
        summary.innerHTML = `
            <div style="font-weight:700;margin-bottom:4px;">✅ Ticket Record:</div>
            <div style="font-family:monospace;font-size:14px;color:#1e3a8a;">${combined}</div>
            <div style="margin-top:6px;font-size:12px;color:#64748b;">This will be saved to the record automatically.</div>
        `;
        summary.classList.add('visible');
    }
}

// Attach listeners
['serial-start-10','serial-start-5'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateTickets);
});

// ============================================================
// QR SCANNER — plate number
// ============================================================
let qrScanner = null;

window.startQRScanner = function() {
    const qrDiv = document.getElementById('qr-reader');
    if (!qrDiv) return;
    qrDiv.style.display = 'block';

    if (qrScanner) {
        qrScanner.clear().catch(() => {});
        qrScanner = null;
    }

    qrScanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        facingMode: 'environment',
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    }, false);

    qrScanner.render(text => {
        document.getElementById('plate-number').value = text.toUpperCase();
        document.getElementById('plate-number').dispatchEvent(new Event('blur'));
        qrScanner.clear().catch(() => {});
        qrDiv.style.display = 'none';
        setVehicleStatus('✅ Plate scanned: ' + text, 'green');
    }, () => {});
};

// ============================================================
// DIRECT CAMERA — Arkabala photo
// ============================================================
let capturedPhoto = null;

window.captureArkabalaPhoto = function() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        openCamera();
    } else {
        fallbackInput();
    }
};

function openCamera() {
    const overlay = document.getElementById('camera-overlay');
    const video   = document.getElementById('camera-video');
    if (!overlay || !video) { fallbackInput(); return; }
    overlay.classList.add('visible');

    // Try back camera, fall back to any camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }))
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then(stream => {
        video.srcObject = stream;
        video.play();
        window._camStream = stream;
    })
    .catch(() => {
        closeCamera();
        fallbackInput();
    });
}

window.snapPhoto = function() {
    const video  = document.getElementById('camera-video');
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const img = canvas.toDataURL('image/jpeg', 0.85);
    closeCamera();
    attachPhoto(img);
};

window.closeLiveCamera = closeCamera;
function closeCamera() {
    if (window._camStream) {
        window._camStream.getTracks().forEach(t => t.stop());
        window._camStream = null;
    }
    const overlay = document.getElementById('camera-overlay');
    if (overlay) overlay.classList.remove('visible');
}

function fallbackInput() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => attachPhoto(ev.target.result);
        reader.readAsDataURL(file);
    };
    inp.click();
}

async function attachPhoto(imgData) {
    let geo = null;
    if (navigator.geolocation) {
        try {
            const pos = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000, enableHighAccuracy: true }));
            geo = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        } catch(e) {}
    }
    capturedPhoto = { image: imgData, geo, ts: new Date().toISOString() };
    renderPreview();
}

function renderPreview() {
    const el = document.getElementById('arkabala-preview');
    if (!el) return;
    const geo = capturedPhoto.geo;
    el.innerHTML = `
        <img src="${capturedPhoto.image}" style="width:100%;border-radius:10px;margin-top:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);">
        <div style="font-size:12px;padding:7px 10px;margin-top:6px;border-radius:6px;${geo
            ? 'background:#d1fae5;color:#065f46;'
            : 'background:#fef3c7;color:#92400e;'}">
            ${geo
                ? `📍 GPS: ${geo.lat.toFixed(6)}, ${geo.lon.toFixed(6)} (±${Math.round(geo.accuracy)}m)`
                : '⚠️ GPS unavailable — photo saved without location'}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <button type="button" onclick="runOCR('10')"
                style="padding:8px 14px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;">
                🔍 Read ₱10 Serial
            </button>
            <button type="button" onclick="runOCR('5')"
                style="padding:8px 14px;background:#7c3aed;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;">
                🔍 Read ₱5 Serial
            </button>
            <button type="button" onclick="removePhoto()"
                style="padding:8px 14px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;">
                ❌ Remove
            </button>
        </div>`;
}

window.removePhoto = function() {
    capturedPhoto = null;
    const el = document.getElementById('arkabala-preview');
    if (el) el.innerHTML = '';
};

// ============================================================
// OCR — READ SERIAL NUMBER FROM PHOTO
// ============================================================
function preloadOCR() {
    if (typeof Tesseract !== 'undefined') return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    document.head.appendChild(s);
}

window.readSerialWithOCR = window.runOCR = async function(denomination) {
    if (!capturedPhoto) {
        alert('📸 Take a photo first, then tap Read Serial!');
        return;
    }
    if (typeof Tesseract === 'undefined') {
        alert('⏳ OCR is still loading. Wait a moment and try again.');
        return;
    }

    const fieldId = denomination === '5' ? 'serial-start-5' : 'serial-start-10';
    const field   = document.getElementById(fieldId);
    if (!field) return;

    // Show loading
    const btn = event.target;
    const origText = btn.textContent;
    btn.textContent = '⏳ Reading...';
    btn.disabled = true;

    try {
        const result = await Tesseract.recognize(capturedPhoto.image, 'eng', {
            tessedit_char_whitelist: '0123456789',
            logger: () => {}
        });

        const numbers = (result.data.text.replace(/\D/g, '').match(/\d{4,8}/g) || []);
        if (numbers.length > 0) {
            const serial = numbers[0].padStart(6, '0');
            field.value = serial;
            recalculateTickets();
            alert(`✅ Serial detected: ${serial}\nFor ₱${denomination} ticket field.\nPlease verify it is correct!`);
        } else {
            alert('⚠️ Could not read a number clearly.\nPlease type the serial number manually.');
        }
    } catch(e) {
        alert('⚠️ OCR failed. Please type the serial number manually.');
    } finally {
        btn.textContent = origText;
        btn.disabled = false;
    }
};

// ============================================================
// PASSENGER TOTALS
// ============================================================
document.querySelectorAll('.passenger-count').forEach(inp => {
    inp.addEventListener('input', () => {
        const am = +document.getElementById('adult-male').value   || 0;
        const af = +document.getElementById('adult-female').value || 0;
        const cm = +document.getElementById('child-male').value   || 0;
        const cf = +document.getElementById('child-female').value || 0;
        const total = am + af + cm + cf;
        document.getElementById('adult-total').value = am + af;
        document.getElementById('child-total').value = cm + cf;
        const tEl = document.getElementById('total-passengers');
        if (tEl) tEl.textContent = `Total Passengers: ${total}`;
    });
});

// ============================================================
// FORM SUBMIT — includes TICKET_10 and TICKET_5 columns
// ============================================================
document.getElementById('passenger-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('submit-btn');
    const msg  = document.getElementById('status-message');
    const user = getCurrentUser();

    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';
    if (msg) { msg.style.display = 'none'; msg.className = 'status-message'; }

    const type   = document.getElementById('type').value;
    const denom  = document.getElementById('denomination').value;
    const plate  = document.getElementById('plate-number').value.toUpperCase().trim();
    const origin = type === 'ARRIVAL'   ? document.getElementById('origin').value      : 'BROOKE\'S POINT';
    const dest   = type === 'DEPARTURE' ? document.getElementById('destination').value  : 'BROOKE\'S POINT';

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
    let   receipt= document.getElementById('receipt-number').value.trim();
    let   notes  = document.getElementById('fee-notes').value.trim();

    // ✅ TICKET RECORDS — for TICKET_10 and TICKET_5 Google Sheet columns
    const ticket10 = (document.getElementById('ticket-record-10') || {}).value || '';
    const ticket5  = (document.getElementById('ticket-record-5')  || {}).value || '';

    // Auto-generate receipt
    if (type === 'DEPARTURE' && status === 'Paid' && !receipt) {
        receipt = `TF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        document.getElementById('receipt-number').value = receipt;
    }

    // Append GPS to notes
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
        adultMale: am, adultFemale: af, adultTotal: am + af,
        childMale: cm, childFemale: cf, childTotal: cm + cf,
        seniorMale: sm, seniorFemale: sf, seniorTotal: sm + sf,
        pwdMale: pm, pwdFemale: pf, pwdTotal: pm + pf,
        pregnant: pg, totalPassengers: am + af + cm + cf,
        username: user.username,
        terminalFee: fee, paymentMethod: method,
        paymentStatus: status, receiptNumber: receipt,
        feeNotes: notes,
        ticket10,   // ✅ NEW — goes to TICKET_10 column
        ticket5     // ✅ NEW — goes to TICKET_5 column
    });

    try {
        const res  = await fetch(CONFIG.DATA_API_URL + '?' + params.toString(), { method: 'GET', redirect: 'follow' });
        const data = await res.json();

        if (data.success) {
            // Mark tricycle day pass
            if (denom === 'TRICYCLE' && type === 'DEPARTURE' && status === 'Paid' && parseFloat(fee) > 0) {
                markTricyclePaid(plate, receipt);
            }

            let successMsg = '✅ Submitted successfully!';
            if (type === 'DEPARTURE' && parseFloat(fee) > 0) successMsg += ` · Fee: ₱${fee} · Receipt: ${receipt}`;
            if (ticket10) successMsg += ` · ₱10: ${ticket10}`;
            if (ticket5)  successMsg += ` · ₱5: ${ticket5}`;

            if (msg) {
                msg.textContent = successMsg;
                msg.className   = 'status-message status-success';
                msg.style.display = 'block';
            }

            // Reset after 3.5 seconds
            setTimeout(() => {
                document.getElementById('passenger-form').reset();
                setDateTime();
                const tEl = document.getElementById('total-passengers');
                if (tEl) tEl.textContent = 'Total Passengers: 0';
                if (msg) msg.style.display = 'none';
                ['origin-group','destination-group'].forEach(id => {
                    document.getElementById(id)?.classList.add('hidden');
                });
                document.getElementById('fee-section')?.classList.remove('visible');
                document.getElementById('ticket-section')?.classList.remove('visible');
                document.getElementById('transport-group').innerHTML = '<option value="">First select vehicle type</option>';
                document.getElementById('transport-group').disabled = true;
                capturedPhoto = null;
                const prev = document.getElementById('arkabala-preview');
                if (prev) prev.innerHTML = '';
                ['payment-method','payment-status','receipt-number','fee-notes'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.disabled = false;
                });
            }, 3500);

        } else {
            throw new Error(data.message || 'Submission failed');
        }

    } catch (err) {
        if (msg) {
            msg.textContent   = '❌ Submission failed. Check connection and try again.';
            msg.className     = 'status-message status-error';
            msg.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.textContent = '📤 SUBMIT DATA';
    }
});

console.log('✅ BPGT V4.5 TICKET EDITION loaded!');
