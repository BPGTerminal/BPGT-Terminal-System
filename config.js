// BPGT TERMINAL APP - CONFIGURATION
// Replace these URLs with your actual Google Apps Script URLs

const CONFIG = {
    // Authentication API (handles login, registration, password reset)
    AUTH_API_URL: 'https://script.google.com/macros/s/AKfycbwYptsyGdy5gzfmCqFc6aJD4L3ajvzcseDImA8caeTFt02YwIdb-ox3FDPOP129MmWV/exec',
    
    // Data API (handles passenger data submission)
    DATA_API_URL: 'https://script.google.com/macros/s/AKfycbyG73qv7vAoOANfZ2ceSUpzDMOAUZbjj3yB8reJMnxDJDka2uvcwszR9yw5rqHMGnRI/exec',
    
    // Vehicle Registry API (reads vehicles from Google Sheet)
    VEHICLE_API_URL: 'https://script.google.com/macros/s/AKfycbygkZnFz-TtPcSdKKoISRUtYtiT0KGlVtHCy5quIercV2M8Cor-3MgrZzQrhM4NHVH8/exec',
    
    // App settings
    APP_NAME: 'BPGT Terminal',
    VERSION: '3.0'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}