# 🚌 BPGT Terminal System v4.5

**Brooke's Point Grand Terminal — Passenger & Revenue Management System**

A complete web-based terminal management system for tracking passengers, collecting terminal fees, managing vehicle registry, and generating real-time analytics.

---

## 📊 System Overview

**BPGT Terminal System** is a zero-budget, government-grade Progressive Web App (PWA) built for the Municipality of Brooke's Point, Palawan, Philippines. The system digitizes terminal operations including:

- Real-time passenger data collection
- Terminal fee collection with ticket serial tracking
- Vehicle registry with QR codes
- Revenue accountability and reporting
- Power BI dashboard integration
- User management with admin approval system

---

## ✨ Key Features

### 📱 **Data Collection**
- Mobile-first PWA (works on phones/tablets)
- Vehicle plate scanning via QR codes
- Automatic vehicle type detection
- Passenger demographic tracking (adults, children, seniors, PWD, pregnant)
- GPS-tagged photo capture for cash receipts
- Offline-capable with service worker

### 💰 **Revenue Management**
- Automated terminal fee calculation (Municipal Ordinance 2026-01)
- Multiple payment methods (Cash, GCash, Maya, Bank Transfer)
- Arkabala ticket serial tracking (₱10 and ₱5 denominations)
- OCR serial number reading from photos
- Tricycle day pass system
- Complete cash accountability

### 🔐 **Security**
- User authentication (staff and admin roles)
- Admin approval required for new accounts
- Secure QR codes with checksum validation
- Protected admin accounts
- Session management

### 📈 **Analytics**
- Power BI dashboard integration
- Real-time revenue tracking
- Passenger trend analysis
- Route performance metrics
- Transport group reporting

---

## 🛠️ Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Progressive Web App (PWA)
- html5-qrcode library
- Tesseract.js (OCR)
- Camera API, Geolocation API

**Backend:**
- Google Apps Script (GAS)
- Google Sheets (database)

**Deployment:**
- GitHub Pages (hosting)
- Service Worker (offline support)

**Analytics:**
- Microsoft Power BI

---

## 📦 Installation

### Prerequisites
- GitHub account
- Google account (for Google Sheets)
- Power BI Desktop (optional, for dashboards)

### Setup Steps

1. **Fork or Clone Repository**
   ```bash
   git clone https://github.com/BPGTerminal/bpgt-terminal-system.git
   ```

2. **Create Google Sheets**
   - Create 3 sheets: Data, Users, Vehicle Registry
   - Set up Google Apps Script for each

3. **Configure API URLs**
   - Edit `config.js`
   - Add your Google Apps Script deployment URLs

4. **Deploy to GitHub Pages**
   - Settings → Pages → Deploy from main branch
   - Your app will be live at: `https://yourusername.github.io/repo-name`

5. **Install PWA on Devices**
   - Open site in Chrome/Safari
   - Tap "Add to Home Screen"
   - Grant camera and location permissions

---

## 📋 File Structure

```
/BPGT-Terminal-System/
├── index.html              # Login page
├── app.html                # Data entry interface
├── admin.html              # User management dashboard
├── config.js               # API configuration
├── auth.js                 # Authentication logic
├── app-logic.js            # Main application code
├── manifest.json           # PWA configuration
├── service-worker.js       # Offline support
├── icon-*.png              # PWA icons (8 sizes)
├── bpgt-logo.png           # Official logo
├── pagong-logo.png         # Developer signature
└── COPYRIGHT.txt           # IP protection
```

---

## 👥 User Roles

### Staff Accounts
- Data entry access
- Passenger and revenue recording
- Vehicle registry updates
- Photo and GPS capture

### Admin Accounts
- All staff capabilities
- User account management
- Approve/reject new registrations
- System configuration
- Protected from deletion

---

## 🎫 Ticket Serial System

**Cash Accountability Features:**
- Track ₱10 and ₱5 arkabala ticket serials
- Auto-calculate ending serials
- OCR reading from photos
- Mixed denomination support
- GPS-tagged proof of collection

**Example:**
- Fee: ₱60
- Tickets: 6×₱10 OR 12×₱5 OR mixed
- Record: `10-000047:000052` (6 tickets)

---

## 🚗 Vehicle Types & Fees

**Inter-Municipal (Terminal Fees):**
- Bus: ₱60.00 (flat rate per Ordinance 2026-01)
- Shuttle Van: ₱30.00
- Jeep: ₱15.00
- Multicab/Filcab: ₱10.00

**Intra-Municipal:**
- Tricycle: ₱10.00 (day pass system)

---

## 📊 Power BI Integration

**Dashboard Pages:**
1. **General Info** — Passenger trends, demographics, routes
2. **Revenue Analytics** — Collections, accountability, payment methods
3. **Transport Analytics** — Route performance, transport groups

**Data Refresh:**
- Connect Power BI to Google Sheets
- Set up auto-refresh schedule
- Use abbreviated route names for clean visuals

---

## 🔐 Security Features

### QR Code Validation
- Obfuscated format: `NOISE-PLATE-CHECKSUM-NOISE`
- Fake QR detection with SHA256 checksum
- Secret key: "BP Grand Terminal -=pagong=-SECRET-KEY"
- Backwards compatible with old QR codes

### User Management
- Pending approval for new accounts
- Admin-only access to user management
- Protected admin accounts (admin, cvicera, jdbelen)
- Session-based authentication

---

## 📖 Documentation

**Complete documentation available in 4 books:**
1. **User Manual** (28 pages) — Staff training guide
2. **Dashboard Guide** (22 pages) — Power BI usage
3. **The Full Story** (18 pages) — Development narrative
4. **Project Journal** (25 pages) — Technical decisions

---

## 🚀 Launch History

- **Feb 7, 2026:** Project started
- **Feb 15, 2026:** V4.0 Revenue Edition deployed
- **Feb 18, 2026:** V4.5 Ticket Edition completed
- **Feb 20, 2026:** Official launch & Mayor presentation

---

## 💡 Development

**Built by:** Joey S. Heredero  
**Location:** Brooke's Point Grand Terminal, Palawan  
**Development Time:** 13 days (Feb 7-19, 2026)  
**Budget:** ₱0 (zero cost)  
**AI Partner:** Claude (Anthropic) — -=pagong=- 🐢

---

## 📜 License & Copyright

**© 2026 Joey S. Heredero · All Rights Reserved**

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is prohibited. 

**Authorized Use:**
- Brooke's Point Grand Terminal
- Municipal Government of Brooke's Point
- Authorized personnel only

**For licensing inquiries:**
Contact the developer for commercial use or deployment in other municipalities.

---

## 🤝 Contributing

This is a production system for a government terminal. Contributions are not currently accepted. For bug reports or feature requests, contact the system administrator.

---

## 📞 Support

**System Administrator:** Joey S. Heredero  
**Location:** Brooke's Point Grand Terminal  
**Municipality:** Brooke's Point, Palawan, Philippines

---

## 🎯 Future Roadmap

- [ ] Port terminal fee collection module
- [ ] Vendor stall rental tracking
- [ ] LTFRB compliance reporting
- [ ] Multi-terminal deployment
- [ ] Mobile app (React Native)
- [ ] SMS notifications for payments
- [ ] Integration with municipal treasury system

---

## 🏆 Achievements

- **663+ passengers tracked** (test phase)
- **₱350+ revenue collected** (test phase)
- **10 staff accounts** active
- **3 Power BI dashboards** operational
- **93 pages documentation** complete
- **Zero budget** development
- **13 days** from concept to production

---

## 🌟 Recognition

This system serves as a model for:
- Zero-budget government digital transformation
- AI-assisted software development
- Local government innovation
- Open collaboration between human and AI

---

**Built with ❤️ for Brooke's Point**

-=pagong=- 🐢

*"Slow and steady... but we moved at ROCKET SPEED!"*

---

**BPGT Terminal System v4.5 — Making terminals smarter, one passenger at a time.** 🚌
