# Rolls Express — Team 3 WEB-268 Project

## Contributors

- Bernadette Moreno
- Maria Crum
- Amanda Konzelmann

---

## Server

This project runs on a **Node.js + Express** server (`server.js`) with a **MongoDB** database via Mongoose.

| Component  | Technology              |
|------------|-------------------------|
| Runtime    | Node.js                 |
| Server     | Express.js              |
| Database   | MongoDB (Mongoose v8)   |
| Port       | `3000` (default)        |

---

## Project Structure

```
Team-3-WEB-268-Project/
├── index.html                  # Home page
├── server.js                   # Express server (Node.js)
├── package.json
├── favicon.ico                 # Browser tab icon
├── apple-touch-icon.png        # iOS home screen icon
│
├── pages/                      # All site pages
│   ├── about.html              # About Us
│   ├── careers.html            # Careers
│   ├── cart.html               # Shopping Cart
│   ├── catering.html           # Catering Request
│   ├── contact.html            # Contact Us
│   ├── locations.html          # Locations
│   ├── login.html              # Login / Sign Up
│   ├── loyalty.html            # Loyalty Program
│   ├── menu.html               # Menu
│   ├── order-online.html       # Order Online
│   ├── privacy.html            # Privacy Policy
│   └── terms.html              # Terms of Use
│
├── css/                        # Stylesheets (one per page)
├── assets/
│   ├── icons/                  # SVG icons and logo images
│   ├── images/                 # Food and hero images
│   ├── js/app.js               # Shared front-end JavaScript
│   └── video/                  # Homepage video
│
├── backend/
│   ├── config/db.js            # MongoDB connection
│   ├── models/                 # Mongoose models
│   └── scripts/seedMongo.js    # Database seed script
│
└── data/
    ├── menu.json               # Menu seed data
    └── db.json                 # General seed data
```

---

## Install and Run

1. **Clone the repo** (first time only):
   ```bash
   git clone https://github.com/ajk36925-cpu/Team-3-WEB-268-Project.git
   cd Team-3-WEB-268-Project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Seed the database** (first time or after resetting data):
   ```bash
   npm run seed:mongo
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

> **Note:** Always access the site via `http://localhost:3000`, not by opening HTML files directly. Browsers block favicons and some features on `file://` URLs.

---

## GitHub — Update and Commit Changes

### First time — configure git (one-time setup):
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### Everyday workflow:

**1. Check what files have changed:**
```bash
git status
```

**2. Stage all changes:**
```bash
git add .
```
Or stage a specific file:
```bash
git add pages/menu.html
```

**3. Commit with a message:**
```bash
git commit -m "Brief description of what you changed"
```

**4. Push to GitHub:**
```bash
git push origin main
```

### Pull latest changes from teammates:
```bash
git pull origin main
```

### Common full workflow:
```bash
git pull origin main
git add .
git commit -m "Your message here"
git push origin main
```
