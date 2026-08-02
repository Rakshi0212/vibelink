# Vibelink 📸

A full-stack Instagram-inspired social media application built with **Node.js**, **Express**, **SQLite**, and **Vanilla JavaScript**.

## Features

- 🔐 **Authentication** – Register & Login with JWT
- 🏠 **Feed (Posts)** – Upload images, videos, or text posts
- 🎬 **Reels** – Full-screen vertical video feed with auto-play (like TikTok/Instagram Reels)
- 📖 **Stories** – 24-hour temporary photo/video stories with colorful ring UI
- ❤️ **Likes & Comments** – Interact with posts
- 👤 **Profiles** – User profiles with follower/following counts and 3-column photo grid
- ➕ **Create Modal** – Instagram-style modal to create Posts, Stories, or Reels

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT, bcryptjs |
| File Uploads | Multer |
| Frontend | Vanilla HTML, CSS, JavaScript |

## Project Structure

```
task2_social_media/
├── backend/
│   ├── server.js       # Express server & API routes
│   ├── db.js           # SQLite database setup
│   └── uploads/        # User uploaded media (gitignored)
├── frontend/
│   ├── index.html      # Main feed + Reels
│   ├── login.html      # Login / Register
│   ├── profile.html    # User profile page
│   ├── css/
│   │   └── style.css   # Instagram-style UI
│   └── js/
│       ├── app.js      # Frontend logic
│       └── auth.js     # Auth logic
├── package.json
└── README.md
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node backend/server.js
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Login and get JWT token |
| GET | `/api/posts` | Get all posts (feed) |
| POST | `/api/posts` | Create a post or reel |
| GET | `/api/reels` | Get all reels |
| GET | `/api/stories` | Get active stories |
| POST | `/api/stories` | Create a story |
| POST | `/api/posts/:id/like` | Like/unlike a post |
| POST | `/api/posts/:id/comments` | Add comment |
| GET | `/api/users/:id` | Get user profile |
| POST | `/api/users/:id/follow` | Follow/unfollow user |
