// BPGT Authentication Library

// Login function
async function login(username, password) {
    try {
        const response = await fetch(CONFIG.AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Connection error' };
    }
}

// Register function
async function register(username, password, fullName) {
    try {
        const response = await fetch(CONFIG.AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'register',
                username: username,
                password: password,
                fullName: fullName
            })
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
        const response = await fetch(CONFIG.AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'resetPassword',
                username: username,
                newPassword: newPassword
            })
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