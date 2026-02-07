// BPGT App Logic - V3.0

// Protect this page - require login
requireLogin();

// Display user info
window.addEventListener('load', () => {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.fullName;
    }
});

// Transport group mappings
const transportGroups = {
    'BUS': ['RORO', 'CHERRY'],
    'SHUTTLE VAN': ['BARAKAH', 'CENTRO', 'PILANDOK', 'RAYANN', 'RECARO', 'RIO TUBA EXP.', 'RUNLEE'],
    'TRICYCLE': ['TODA'],
    'JEEP': ['N/A'],
    'MULTICAB': ['N/A'],
    'FILCAB': ['N/A']
};

// Location lists
const interMunicipalLocations = [
    'BROOKE\'S POINT',
    'PPC',
    'ABORLAN',
    'NARRA',
    'S.ESPAÑOLA',
    'QUEZON',
    'BATARAZA',
    'RIO-TUBA',
    'BULILUYAN',
    'SICUD',
    'RIZAL'
];

const intraMunicipalLocations = [
    'POBLACION',
    'TUBTUB',
    'PSU',
    'MAINIT',
    'IMULNOD',
    'PANGOBILIAN'
];

// Vehicle registry (will be populated from API)
let vehicleRegistry = {};

// Load vehicles from API
async function loadVehicles() {
    try {
        const response = await fetch(CONFIG.VEHICLE_API_URL);
        const data = await response.json();
        if (data.success) {
            vehicleRegistry = data.vehicles;
            console.log(`✅ Loaded ${Object.keys(vehicleRegistry).length} vehicles`);
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

// Initialize
loadVehicles();

// Plate number input - auto-populate vehicle info
const plateNumberInput = document.getElementById('plate-number');
plateNumberInput.addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});

plateNumberInput.addEventListener('blur', function() {
    const plate = this.value.toUpperCase().trim();
    const vehicleInfo = vehicleRegistry[plate];
    
    if (vehicleInfo) {
        const denominationSelect = document.getElementById('denomination');
        denominationSelect.value = vehicleInfo.denomination;
        denominationSelect.classList.add('auto-filled');
        denominationSelect.dispatchEvent(new Event('change'));
        
        setTimeout(() => {
            const transportGroupSelect = document.getElementById('transport-group');
            transportGroupSelect.value = vehicleInfo.transportGroup;
            transportGroupSelect.classList.add('auto-filled');
        }, 100);
    }
});

// Smart Transport Group dropdown
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
    
    // Trigger type change to update location lists
    document.getElementById('type').dispatchEvent(new Event('change'));
});

// SMART ORIGIN/DESTINATION LOGIC
const typeSelect = document.getElementById('type');
const originGroup = document.getElementById('origin-group');
const destinationGroup = document.getElementById('destination-group');
const originSelect = document.getElementById('origin');
const destinationSelect = document.getElementById('destination');

typeSelect.addEventListener('change', function() {
    const type = this.value;
    const denomination = denominationSelect.value;
    
    // Determine which locations to use
    const isTricycle = denomination === 'TRICYCLE';
    const locations = isTricycle ? intraMunicipalLocations : interMunicipalLocations;
    
    if (type === 'ARRIVAL') {
        // Show ORIGIN only (where did it come from?)
        originGroup.classList.remove('hidden');
        destinationGroup.classList.add('hidden');
        originSelect.required = true;
        destinationSelect.required = false;
        destinationSelect.value = '';
        
        // Populate origin dropdown
        originSelect.innerHTML = '<option value="">Select Origin</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            originSelect.appendChild(option);
        });
        
    } else if (type === 'DEPARTURE') {
        // Show DESTINATION only (where is it going?)
        originGroup.classList.add('hidden');
        destinationGroup.classList.remove('hidden');
        originSelect.required = false;
        destinationSelect.required = true;
        originSelect.value = '';
        
        // Populate destination dropdown
        destinationSelect.innerHTML = '<option value="">Select Destination</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            destinationSelect.appendChild(option);
        });
        
    } else {
        // Hide both if no type selected
        originGroup.classList.add('hidden');
        destinationGroup.classList.add('hidden');
        originSelect.required = false;
        destinationSelect.required = false;
    }
});

// FIXED PASSENGER COUNTING
// Total = Adults + Children ONLY
// Seniors, PWD, Pregnant are subcategories

const passengerInputs = document.querySelectorAll('.passenger-count');

function calculateTotals() {
    // Adult totals
    const adultMale = parseInt(document.getElementById('adult-male').value) || 0;
    const adultFemale = parseInt(document.getElementById('adult-female').value) || 0;
    const adultTotal = adultMale + adultFemale;
    document.getElementById('adult-total').value = adultTotal;
    
    // Child totals
    const childMale = parseInt(document.getElementById('child-male').value) || 0;
    const childFemale = parseInt(document.getElementById('child-female').value) || 0;
    const childTotal = childMale + childFemale;
    document.getElementById('child-total').value = childTotal;
    
    // GRAND TOTAL = Adults + Children
    const grandTotal = adultTotal + childTotal;
    document.getElementById('total-passengers').textContent = `Total Passengers: ${grandTotal}`;
}

passengerInputs.forEach(input => {
    input.addEventListener('input', calculateTotals);
});

// Set default date and time
document.getElementById('trip-date').valueAsDate = new Date();
const now = new Date();
document.getElementById('trip-time').value = now.toTimeString().slice(0, 5);

// Form submission
document.getElementById('passenger-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    const user = getCurrentUser();
    
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Submitting...';
    statusMessage.style.display = 'none';
    
    // Determine origin/destination based on type
    const type = document.getElementById('type').value;
    let origin = '';
    let destination = '';
    
    if (type === 'ARRIVAL') {
        origin = document.getElementById('origin').value;
        destination = 'BROOKE\'S POINT';
    } else if (type === 'DEPARTURE') {
        origin = 'BROOKE\'S POINT';
        destination = document.getElementById('destination').value;
    }
    
    // Get all values
    const adultMale = parseInt(document.getElementById('adult-male').value) || 0;
    const adultFemale = parseInt(document.getElementById('adult-female').value) || 0;
    const childMale = parseInt(document.getElementById('child-male').value) || 0;
    const childFemale = parseInt(document.getElementById('child-female').value) || 0;
    const seniorMale = parseInt(document.getElementById('senior-male').value) || 0;
    const seniorFemale = parseInt(document.getElementById('senior-female').value) || 0;
    const pwdMale = parseInt(document.getElementById('pwd-male').value) || 0;
    const pwdFemale = parseInt(document.getElementById('pwd-female').value) || 0;
    const pregnant = parseInt(document.getElementById('pregnant').value) || 0;
    
    // Calculate totals
    const adultTotal = adultMale + adultFemale;
    const childTotal = childMale + childFemale;
    const seniorTotal = seniorMale + seniorFemale;
    const pwdTotal = pwdMale + pwdFemale;
    const totalMales = adultMale + childMale;
    const totalFemales = adultFemale + childFemale;
    const totalPassengers = adultTotal + childTotal; // FIXED: Only adults + children
    
    const formData = {
        tripDate: document.getElementById('trip-date').value,
        tripTime: document.getElementById('trip-time').value,
        type: type,
        denomination: document.getElementById('denomination').value,
        transportGroup: document.getElementById('transport-group').value,
        origin: origin,
        destination: destination,
        plateNumber: document.getElementById('plate-number').value,
        adultMale: adultMale,
        adultFemale: adultFemale,
        adultTotal: adultTotal,
        childMale: childMale,
        childFemale: childFemale,
        childTotal: childTotal,
        seniorMale: seniorMale,
        seniorFemale: seniorFemale,
        seniorTotal: seniorTotal,
        totalMales: totalMales,
        totalFemales: totalFemales,
        pwdMale: pwdMale,
        pwdFemale: pwdFemale,
        pwdTotal: pwdTotal,
        pregnant: pregnant,
        totalPassengers: totalPassengers,
        username: user.username
    };
    
    try {
        const response = await fetch(CONFIG.DATA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusMessage.textContent = '✅ Data submitted successfully!';
            statusMessage.className = 'status-message status-success';
            statusMessage.style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('passenger-form').reset();
                document.getElementById('trip-date').valueAsDate = new Date();
                const now = new Date();
                document.getElementById('trip-time').value = now.toTimeString().slice(0, 5);
                calculateTotals();
                statusMessage.style.display = 'none';
                
                // Hide origin/destination fields
                originGroup.classList.add('hidden');
                destinationGroup.classList.add('hidden');
                
                // Remove auto-filled classes
                document.querySelectorAll('.auto-filled').forEach(el => {
                    el.classList.remove('auto-filled');
                });
                
                // Reset transport group dropdown
                transportGroupSelect.innerHTML = '<option value="">First select vehicle type</option>';
                transportGroupSelect.disabled = true;
            }, 2000);
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