# Vibelink 📸 - Social Media Platform (CodeAlpha Task 2)

A full-stack Instagram-inspired social media application built with **Node.js**, **Express**, **SQLite**, **Vanilla JavaScript**, and **PWA support**.

---

## 🌐 Live Deployed Application

- 🔗 **Direct Live Link (Accessible on Any Device):** [https://c44658e28fd5fe.lhr.life](https://c44658e28fd5fe.lhr.life)
- 💻 **GitHub Repository:** [https://github.com/Rakshi0212/Code_Alpha_Social-Media-Platform](https://github.com/Rakshi0212/Code_Alpha_Social-Media-Platform)
- 📱 **Installable Mobile & Desktop App:** Open the live link on Chrome/Safari and click **"Install App"** / **"Add to Home Screen"**.

---

## ✨ Features

- 🔐 **Authentication** – Secure Register & Login with JWT and password hashing (bcrypt)
- 🏠 **Home Feed (Posts)** – Upload images, videos, or text posts with likes & comments
- 🎬 **Reels** – Full-screen vertical video feed with auto-play (like TikTok / Instagram Reels)
- 📖 **Stories** – 24-hour temporary photo/video stories with colorful ring UI
- ❤️ **Likes & Comments** – Real-time interaction with posts and reels
- 👤 **User Profiles** – Profile header with follower/following stats and a 3-column media grid
- ➕ **Create Modal** – Instagram-style tabbed popup modal to create Posts, Stories, or Reels
- 📱 **Progressive Web App (PWA)** – Installable as a native app on Android, iOS, and Windows Desktop with offline caching

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (better-sqlite3) |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **Media Handling** | Multer |
| **Frontend** | HTML5, CSS3 (Glassmorphism & Dark Mode), Vanilla JavaScript |
| **App Capabilities** | Web Manifest, Service Workers (PWA) |

---

## 📂 Project Structure

```
Code_Alpha_Social-Media-Platform/
├── backend/
│   ├── server.js       # Express server & API routes
│   ├── db.js           # SQLite database schema
│   └── uploads/        # User uploaded media files
├── frontend/
│   ├── index.html      # Main Feed, Reels & App layout
│   ├── login.html      # Authentication page
│   ├── profile.html    # User profile page
│   ├── manifest.json   # Progressive Web App manifest
│   ├── sw.js           # Service Worker for offline caching
│   ├── css/
│   │   └── style.css   # Instagram-style CSS design system
│   └── js/
│       ├── app.js      # Main application logic
│       └── auth.js     # Auth helper functions
├── render.yaml         # Render cloud deployment blueprint
├── package.json
└── README.md
```

---

## 🚀 Getting Started (Local Setup)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rakshi0212/Code_Alpha_Social-Media-Platform.git
   cd Code_Alpha_Social-Media-Platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the backend server:**
   ```bash
   node backend/server.js
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `GET` | `/api/posts` | Get all feed posts |
| `POST` | `/api/posts` | Upload new Post or Reel |
| `GET` | `/api/reels` | Fetch all Reels |
| `GET` | `/api/stories` | Get active 24h stories |
| `POST` | `/api/stories` | Upload a new story |
| `POST` | `/api/posts/:id/like` | Like or unlike a post |
| `POST` | `/api/posts/:id/comments` | Add a comment to a post |
| `GET` | `/api/users/:id` | Get user profile data & stats |
| `POST` | `/api/users/:id/follow` | Follow or unfollow a user |
