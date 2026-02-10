// BPGT TERMINAL SYSTEM - V4.3 COMPLETE
// All features: Tricycle day pass, Photo capture, Freelance vans, QR scanner
// Emergency fix: Date/Time initialization

// ==================== AUTHENTICATION ====================
requireLogin();

window.addEventListener('load', () => {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.fullName;
    }
    
    // Initialize date and time IMMEDIATELY
    initializeDateAndTime();
    
    // Check and reset tricycle payments
    checkAndResetTricyclePayments();
    
    // Load vehicles and custom vehicles
    loadVehicles();
    loadCustomVehicles();
});

// ==================== DATE/TIME INITIALIZATION ====================
function initializeDateAndTime() {
    // Set today's date
    const today = new Date();
    const dateInput = document.getElementById('trip-date');
    if (dateInput) {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
    
    // Set current time
    const timeInput = document.getElementById('trip-time');
    if (timeInput) {
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
    
    console.log('✅ Date and time initialized');
}

// ==================== TRICYCLE DAY PASS (localStorage) ====================
function getTodayDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function checkAndResetTricyclePayments() {
    const storedDate = localStorage.getItem('bpgt_tricycle_date');
    const todayDate = getTodayDateKey();
    
    if (storedDate !== todayDate) {
        localStorage.removeItem('bpgt_tricycle_paid');
        localStorage.setItem('bpgt_tricycle_date', todayDate);
        console.log('✅ Tricycle payments reset for new day:', todayDate);
    }
}

function markTricyclePaidToday(plateNumber, receiptNumber) {
    const paidList = JSON.parse(localStorage.getItem('bpgt_tricycle_paid') || '{}');
    paidList[plateNumber.toUpperCase()] = {
        receipt: receiptNumber,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('bpgt_tricycle_paid', JSON.stringify(paidList));
    console.log('✅ Tricycle marked as paid:', plateNumber);
}

function isTricyclePaidToday(plateNumber) {
    const paidList = JSON.parse(localStorage.getItem('bpgt_tricycle_paid') || '{}');
    return paidList[plateNumber.toUpperCase()] || null;
}

// ==================== TERMINAL FEES ====================
const TERMINAL_FEES = {
    'BUS': {
        'RORO': 60,
        'CHERRY': 50
    },
    'SHUTTLE VAN': {
        'BARAKAH': 30,
        'CENTRO': 30,
        'PILANDOK': 30,
        'RAYANN': 30,
        'RECARO': 30,
        'RIO TUBA EXP.': 30,
        'RUNLEE': 30,
        'FREELANCE': 30  // V4.2: Freelance shuttle vans
    },
    'JEEP': {
        'N/A': 15
    },
    'MULTICAB': {
        'N/A': 10
    },
    'FILCAB': {
        'N/A': 10
    },
    'TRICYCLE': {
        'TODA': 10
    }
};

const transportGroups = {
    'BUS': ['RORO', 'CHERRY'],
    'SHUTTLE VAN': ['BARAKAH', 'CENTRO', 'PILANDOK', 'RAYANN', 'RECARO', 'RIO TUBA EXP.', 'RUNLEE', 'FREELANCE'],
    'TRICYCLE': ['TODA'],
    'JEEP': ['N/A'],
    'MULTICAB': ['N/A'],
    'FILCAB': ['N/A']
};

const interMunicipalLocations = [
    'BROOKE\'S POINT', 'PPC', 'ABORLAN', 'NARRA', 'S.ESPAÑOLA',
    'QUEZON', 'BATARAZA', 'RIO-TUBA', 'BULILUYAN', 'SICUD', 'RIZAL'
];

const intraMunicipalLocations = [
    'POBLACION', 'TUBTUB', 'PSU', 'MAINIT', 'IMULNOD', 'PANGOBILIAN'
];

// ==================== VEHICLE REGISTRY ====================
let vehicleRegistry = {};

async function loadVehicles() {
    try {
        const response = await fetch(CONFIG.VEHICLE_API_URL);
        const data = await response.json();
        if (data.success) {
            vehicleRegistry = data.vehicles;
            console.log(`✅ Loaded ${Object.keys(vehicleRegistry).length} vehicles from API`);
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

// V4.2: Load custom vehicles (freelance, etc.)
function loadCustomVehicles() {
    const customVehicles = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    Object.assign(vehicleRegistry, customVehicles);
    console.log(`✅ Loaded ${Object.keys(customVehicles).length} custom vehicles from localStorage`);
}

// V4.2: Add vehicle to registry
function addVehicleToRegistry(plateNumber, denomination, transportGroup) {
    vehicleRegistry[plateNumber.toUpperCase()] = {
        denomination: denomination,
        transportGroup: transportGroup
    };
    
    const customVehicles = JSON.parse(localStorage.getItem('bpgt_custom_vehicles') || '{}');
    customVehicles[plateNumber.toUpperCase()] = {
        denomination: denomination,
        transportGroup: transportGroup,
        addedDate: new Date().toISOString(),
        addedBy: getCurrentUser().username
    };
    localStorage.setItem('bpgt_custom_vehicles', JSON.stringify(customVehicles));
    
    console.log('✅ Vehicle added to registry:', plateNumber);
}

// ==================== QR SCANNER (BACK CAMERA) ====================
let html5QrcodeScanner = null;

function startQRScanner() {
    const qrReaderDiv = document.getElementById('qr-reader');
    qrReaderDiv.style.display = 'block';
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
            fps: 10, 
            qrbox: {width: 250, height: 250},
            facingMode: "environment"  // Force back camera
        },
        false
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText, decodedResult) {
    document.getElementById('plate-number').value = decodedText.toUpperCase();
    document.getElementById('plate-number').dispatchEvent(new Event('blur'));
    
    html5QrcodeScanner.clear();
    document.getElementById('qr-reader').style.display = 'none';
    
    alert('✅ Plate scanned: ' + decodedText);
}

function onScanFailure(error) {
    // Silent handling
}

// ==================== ARKABALA PHOTO CAPTURE ====================
let arkabalaPhotoData = null;

function captureArkabalaPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                arkabalaPhotoData = event.target.result;
                
                const preview = document.getElementById('arkabala-preview');
                if (preview) {
                    preview.innerHTML = `
                        <img src="${arkabalaPhotoData}" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">
                        <button type="button" onclick="removeArkabalaPhoto()" style="
                            margin-top: 8px;
                            padding: 6px 12px;
                            background: #ef4444;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-size: 12px;
                            cursor: pointer;
                        ">❌ Remove Photo</button>
                    `;
                    
                    alert('✅ Arkabala photo captured!');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    input.click();
}

function removeArkabalaPhoto() {
    arkabalaPhotoData = null;
    const preview = document.getElementById('arkabala-preview');
    if (preview) {
        preview.innerHTML = '';
    }
}

// ==================== PLATE NUMBER AUTO-FILL ====================
const plateNumberInput = document.getElementById('plate-number');

plateNumberInput.addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});

plateNumberInput.addEventListener('blur', function() {
    const plate = this.value.toUpperCase().trim();
    const vehicleInfo = vehicleRegistry[plate];
    
    const statusDiv = document.getElementById('vehicle-status');
    
    if (vehicleInfo) {
        // Found in registry - auto-fill
        const denominationSelect = document.getElementById('denomination');
        denominationSelect.value = vehicleInfo.denomination;
        denominationSelect.classList.add('auto-filled');
        denominationSelect.dispatchEvent(new Event('change'));
        
        setTimeout(() => {
            const transportGroupSelect = document.getElementById('transport-group');
            transportGroupSelect.value = vehicleInfo.transportGroup;
            transportGroupSelect.classList.add('auto-filled');
            calculateTerminalFee();
        }, 100);
        
        if (statusDiv) {
            statusDiv.innerHTML = '';
        }
    } else {
        // Not found - show info
        if (plate && statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: #fef3c7; color: #92400e; padding: 8px; 
                            border-radius: 6px; font-size: 13px; margin-top: 8px;">
                    ℹ️ New vehicle - Please select type and group. Will be added to registry.
                </div>
            `;
        }
    }
});

// ==================== SMART DROPDOWNS ====================
const denominationSelect = document.getElementById('denomination');
const transportGroupSelect = document.getElementById('transport-group');

denominationSelect.addEventListener('change', function() {
    const selectedType = this.value;
    
    transportGroupSelect.innerHTML = '<option value="">Select Transport Group</option>';
    transportGroupSelect.disabled = !selectedType;
    
    if (selectedType && transportGroups[selectedType]) {
        const groups = transportGroups[selectedType];
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            transportGroupSelect.appendChild(option);
        });
        transportGroupSelect.disabled = false;
    }
    
    document.getElementById('type').dispatchEvent(new Event('change'));
});

transportGroupSelect.addEventListener('change', function() {
    const plateNumber = document.getElementById('plate-number').value.toUpperCase().trim();
    const denomination = document.getElementById('denomination').value;
    const transportGroup = this.value;
    
    // V4.2: Auto-add to registry if new vehicle
    if (plateNumber && denomination && transportGroup && !vehicleRegistry[plateNumber]) {
        addVehicleToRegistry(plateNumber, denomination, transportGroup);
        
        const statusDiv = document.getElementById('vehicle-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: #d1fae5; color: #065f46; padding: 8px; 
                            border-radius: 6px; font-size: 13px; margin-top: 8px;">
                    ✅ Vehicle added to registry! Next time it will auto-fill.
                </div>
            `;
            
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 5000);
        }
    }
    
    calculateTerminalFee();
});

// ==================== TERMINAL FEE CALCULATION ====================
function calculateTerminalFee() {
    const tripType = document.getElementById('type').value;
    const denomination = document.getElementById('denomination').value;
    const transportGroup = document.getElementById('transport-group').value;
    const plateNumber = document.getElementById('plate-number').value.toUpperCase().trim();
    const feeSection = document.getElementById('fee-section');
    const feeAmountDisplay = document.getElementById('fee-amount-display');
    const feeAmountHidden = document.getElementById('terminal-fee-amount');
    const feeWarning = document.getElementById('fee-warning');
    
    if (tripType === 'DEPARTURE' && denomination && transportGroup) {
        let fee = 0;
        if (TERMINAL_FEES[denomination] && TERMINAL_FEES[denomination][transportGroup] !== undefined) {
            fee = TERMINAL_FEES[denomination][transportGroup];
        }
        
        // TRICYCLE DAY PASS CHECK
        if (denomination === 'TRICYCLE' && plateNumber) {
            const paidInfo = isTricyclePaidToday(plateNumber);
            if (paidInfo) {
                // Already paid today!
                fee = 0;
                feeAmountDisplay.textContent = '₱0.00 (Day Pass Paid)';
                if (feeWarning) {
                    feeWarning.innerHTML = `
                        <div style="background: #fef3c7; color: #92400e; padding: 12px; border-radius: 8px; margin-top: 8px; font-size: 14px;">
                            ✅ Day pass already paid at ${paidInfo.time}<br>
                            Receipt: ${paidInfo.receipt}
                        </div>
                    `;
                }
                
                document.getElementById('payment-method').value = 'Cash';
                document.getElementById('payment-status').value = 'Paid';
                document.getElementById('receipt-number').value = paidInfo.receipt;
                document.getElementById('fee-notes').value = `Day pass paid at ${paidInfo.time}`;
                
                document.getElementById('payment-method').disabled = true;
                document.getElementById('payment-status').disabled = true;
                document.getElementById('receipt-number').disabled = true;
            } else {
                // First trip - charge ₱10
                feeAmountDisplay.textContent = `₱${fee.toFixed(2)}`;
                if (feeWarning) {
                    feeWarning.innerHTML = `
                        <div style="background: #dbeafe; color: #1e40af; padding: 12px; border-radius: 8px; margin-top: 8px; font-size: 14px;">
                            ℹ️ First trip today - Day pass fee applies
                        </div>
                    `;
                }
                
                document.getElementById('payment-method').disabled = false;
                document.getElementById('payment-status').disabled = false;
                document.getElementById('receipt-number').disabled = false;
            }
        } else {
            // Not a tricycle
            feeAmountDisplay.textContent = `₱${fee.toFixed(2)}`;
            if (feeWarning) {
                feeWarning.innerHTML = '';
            }
            
            document.getElementById('payment-method').disabled = false;
            document.getElementById('payment-status').disabled = false;
            document.getElementById('receipt-number').disabled = false;
        }
        
        feeAmountHidden.value = fee;
        feeSection.classList.remove('hidden');
        document.getElementById('payment-method').required = true;
        document.getElementById('payment-status').required = true;
    } else {
        feeSection.classList.add('hidden');
        feeAmountHidden.value = 0;
        if (feeWarning) {
            feeWarning.innerHTML = '';
        }
        document.getElementById('payment-method').required = false;
        document.getElementById('payment-status').required = false;
    }
}

// ==================== ORIGIN/DESTINATION LOGIC ====================
const typeSelect = document.getElementById('type');
const originGroup = document.getElementById('origin-group');
const destinationGroup = document.getElementById('destination-group');
const originSelect = document.getElementById('origin');
const destinationSelect = document.getElementById('destination');

typeSelect.addEventListener('change', function() {
    const type = this.value;
    const denomination = denominationSelect.value;
    const isTricycle = denomination === 'TRICYCLE';
    const locations = isTricycle ? intraMunicipalLocations : interMunicipalLocations;
    
    if (type === 'ARRIVAL') {
        originGroup.classList.remove('hidden');
        destinationGroup.classList.add('hidden');
        originSelect.required = true;
        destinationSelect.required = false;
        destinationSelect.value = '';
        
        originSelect.innerHTML = '<option value="">Select Origin</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            originSelect.appendChild(option);
        });
    } else if (type === 'DEPARTURE') {
        originGroup.classList.add('hidden');
        destinationGroup.classList.remove('hidden');
        originSelect.required = false;
        destinationSelect.required = true;
        originSelect.value = '';
        
        destinationSelect.innerHTML = '<option value="">Select Destination</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            destinationSelect.appendChild(option);
        });
    } else {
        originGroup.classList.add('hidden');
        destinationGroup.classList.add('hidden');
        originSelect.required = false;
        destinationSelect.required = false;
    }
    
    calculateTerminalFee();
});

// ==================== PASSENGER COUNTING ====================
const passengerInputs = document.querySelectorAll('.passenger-count');

function calculateTotals() {
    const adultMale = parseInt(document.getElementById('adult-male').value) || 0;
    const adultFemale = parseInt(document.getElementById('adult-female').value) || 0;
    const adultTotal = adultMale + adultFemale;
    document.getElementById('adult-total').value = adultTotal;
    
    const childMale = parseInt(document.getElementById('child-male').value) || 0;
    const childFemale = parseInt(document.getElementById('child-female').value) || 0;
    const childTotal = childMale + childFemale;
    document.getElementById('child-total').value = childTotal;
    
    const grandTotal = adultTotal + childTotal;
    document.getElementById('total-passengers').textContent = `Total Passengers: ${grandTotal}`;
}

passengerInputs.forEach(input => {
    input.addEventListener('input', calculateTotals);
});

// ==================== RECEIPT GENERATION ====================
function generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const timestamp = date.getTime().toString().slice(-4);
    return `TF-${year}-${timestamp}`;
}

// ==================== FORM SUBMISSION ====================
document.getElementById('passenger-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    const user = getCurrentUser();
    
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Submitting...';
    statusMessage.style.display = 'none';
    
    const type = document.getElementById('type').value;
    const denomination = document.getElementById('denomination').value;
    const plateNumber = document.getElementById('plate-number').value.toUpperCase().trim();
    
    let origin = '';
    let destination = '';
    
    if (type === 'ARRIVAL') {
        origin = document.getElementById('origin').value;
        destination = 'BROOKE\'S POINT';
    } else if (type === 'DEPARTURE') {
        origin = 'BROOKE\'S POINT';
        destination = document.getElementById('destination').value;
    }
    
    const adultMale = parseInt(document.getElementById('adult-male').value) || 0;
    const adultFemale = parseInt(document.getElementById('adult-female').value) || 0;
    const childMale = parseInt(document.getElementById('child-male').value) || 0;
    const childFemale = parseInt(document.getElementById('child-female').value) || 0;
    const seniorMale = parseInt(document.getElementById('senior-male').value) || 0;
    const seniorFemale = parseInt(document.getElementById('senior-female').value) || 0;
    const pwdMale = parseInt(document.getElementById('pwd-male').value) || 0;
    const pwdFemale = parseInt(document.getElementById('pwd-female').value) || 0;
    const pregnant = parseInt(document.getElementById('pregnant').value) || 0;
    
    const adultTotal = adultMale + adultFemale;
    const childTotal = childMale + childFemale;
    const seniorTotal = seniorMale + seniorFemale;
    const pwdTotal = pwdMale + pwdFemale;
    const totalMales = adultMale + childMale;
    const totalFemales = adultFemale + childFemale;
    const totalPassengers = adultTotal + childTotal;
    
    const terminalFee = document.getElementById('terminal-fee-amount').value || 0;
    const paymentMethod = document.getElementById('payment-method').value || '';
    const paymentStatus = document.getElementById('payment-status').value || '';
    let receiptNumber = document.getElementById('receipt-number').value.trim();
    let feeNotes = document.getElementById('fee-notes').value.trim();
    
    if (type === 'DEPARTURE' && paymentStatus === 'Paid' && !receiptNumber) {
        receiptNumber = generateReceiptNumber();
        document.getElementById('receipt-number').value = receiptNumber;
    }
    
    if (arkabalaPhotoData) {
        feeNotes += (feeNotes ? ' | ' : '') + 'Arkabala photo captured';
    }
    
    const params = new URLSearchParams({
        tripDate: document.getElementById('trip-date').value,
        tripTime: document.getElementById('trip-time').value,
        type: type,
        denomination: denomination,
        transportGroup: document.getElementById('transport-group').value,
        origin: origin,
        destination: destination,
        plateNumber: plateNumber,
        adultMale, adultFemale, adultTotal,
        childMale, childFemale, childTotal,
        seniorMale, seniorFemale, seniorTotal,
        totalMales, totalFemales,
        pwdMale, pwdFemale, pwdTotal,
        pregnant, totalPassengers,
        username: user.username,
        terminalFee, paymentMethod, paymentStatus,
        receiptNumber, feeNotes
    });
    
    try {
        const url = CONFIG.DATA_API_URL + '?' + params.toString();
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mark tricycle as paid if applicable
            if (denomination === 'TRICYCLE' && type === 'DEPARTURE' && 
                paymentStatus === 'Paid' && parseFloat(terminalFee) > 0) {
                markTricyclePaidToday(plateNumber, receiptNumber);
            }
            
            let successMsg = '✅ Data submitted successfully!';
            if (type === 'DEPARTURE' && terminalFee > 0) {
                successMsg += `\n💰 Fee: ₱${terminalFee}`;
                if (receiptNumber) {
                    successMsg += `\n📄 Receipt: ${receiptNumber}`;
                }
            }
            if (arkabalaPhotoData) {
                successMsg += '\n📸 Arkabala photo captured';
            }
            
            statusMessage.textContent = successMsg;
            statusMessage.className = 'status-message status-success';
            statusMessage.style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('passenger-form').reset();
                initializeDateAndTime(); // Reset date/time
                calculateTotals();
                statusMessage.style.display = 'none';
                
                originGroup.classList.add('hidden');
                destinationGroup.classList.add('hidden');
                document.getElementById('fee-section').classList.add('hidden');
                const feeWarning = document.getElementById('fee-warning');
                if (feeWarning) {
                    feeWarning.innerHTML = '';
                }
                
                document.querySelectorAll('.auto-filled').forEach(el => {
                    el.classList.remove('auto-filled');
                });
                
                transportGroupSelect.innerHTML = '<option value="">First select vehicle type</option>';
                transportGroupSelect.disabled = true;
                
                arkabalaPhotoData = null;
                const preview = document.getElementById('arkabala-preview');
                if (preview) {
                    preview.innerHTML = '';
                }
            }, 3000);
        } else {
            throw new Error(result.message || 'Submission failed');
        }
    } catch (error) {
        statusMessage.textContent = '❌ Error submitting data. Please try again.';
        statusMessage.className = 'status-message status-error';
        statusMessage.style.display = 'block';
        console.error('Submit error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 SUBMIT DATA';
    }
});

console.log('✅ BPGT Terminal System V4.3 loaded successfully!');
