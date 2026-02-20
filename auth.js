// BPGT AUTHENTICATION - WITH ADMIN APPROVAL SYSTEM
// Users must be approved by admin before they can log in

const AUTH_SHEET_ID = '13GnoMCTLy3iIYz--k2itiEzD5FqsJPudHnRkexgiySI';

// Admin login
async function login(username, password) {
    try {
        const url = `${CONFIG.AUTH_API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url, { redirect: 'follow' });
        const data = await response.json();
        
        if (data.success) {
            // Check if account is approved
            if (data.user.status === 'pending') {
                return {
                    success: false,
                    message: '⏳ Your account is pending admin approval. Please wait for approval before logging in.'
                };
            }
            
            if (data.user.status === 'rejected') {
                return {
                    success: false,
                    message: '❌ Your account has been rejected. Contact admin for details.'
                };
            }
            
            // Only approved users can proceed
            return data;
        }
        return data;
    } catch (error) {
        return { success: false, message: 'Connection error. Please check your internet.' };
    }
}

// Register - now creates PENDING account
async function register(username, password, fullName) {
    try {
        const url = `${CONFIG.AUTH_API_URL}?action=register&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&fullName=${encodeURIComponent(fullName)}`;
        const response = await fetch(url, { redirect: 'follow' });
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                message: '✅ Account created! Your account is pending admin approval. You will be notified when approved.'
            };
        }
        return data;
    } catch (error) {
        return { success: false, message: 'Registration failed. Please try again.' };
    }
}

// Reset password
async function resetPassword(username, newPassword) {
    try {
        const url = `${CONFIG.AUTH_API_URL}?action=resetPassword&username=${encodeURIComponent(username)}&newPassword=${encodeURIComponent(newPassword)}`;
        const response = await fetch(url, { redirect: 'follow' });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Reset failed. Please try again.' };
    }
}

// Check if logged in
function isLoggedIn() {
    const user = sessionStorage.getItem('bpgt_user');
    return user !== null;
}

// Get current user
function getCurrentUser() {
    const userData = sessionStorage.getItem('bpgt_user');
    return userData ? JSON.parse(userData) : null;
}

// Logout
function logout() {
    sessionStorage.removeItem('bpgt_user');
    window.location.href = 'index.html';
}

// Require login (for protected pages)
function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// Require admin (for admin page)
function requireAdmin() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
    }
}
