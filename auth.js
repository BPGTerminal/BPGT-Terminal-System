// BPGT Authentication Library - FIXED VERSION

// Login function - WORKING!
async function login(username, password) {
    try {
        const url = CONFIG.AUTH_API_URL + '?action=login&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Connection error' };
    }
}

// Register function - WORKING!
async function register(username, password, fullName) {
    try {
        const url = CONFIG.AUTH_API_URL + '?action=register&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&fullName=' + encodeURIComponent(fullName);
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, message: 'Connection error' };
    }
}

// Reset password function
async function resetPassword(username, newPassword) {
    try {
        const url = CONFIG.AUTH_API_URL + '?action=resetPassword&username=' + encodeURIComponent(username) + '&newPassword=' + encodeURIComponent(newPassword);
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, message: 'Connection error' };
    }
}

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('bpgt_user') !== null;
}

// Get current user
function getCurrentUser() {
    const userStr = sessionStorage.getItem('bpgt_user');
    return userStr ? JSON.parse(userStr) : null;
}

// Logout
function logout() {
    sessionStorage.removeItem('bpgt_user');
    window.location.href = 'index.html';
}

// Require login (call this on protected pages)
function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// Require admin (call this on admin pages)
function requireAdmin() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'app.html';
    }
}
