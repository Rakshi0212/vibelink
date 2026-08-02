const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_super_secret_key'; // In production, use environment variables!

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });



app.use(cors());
app.use(express.json());

// Serve static frontend files and uploads
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashedPassword);
    res.status(201).json({ message: 'User created successfully', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, userId: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- USER ROUTES ---

// Get User Profile
app.get('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get stats
    const followers = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(user.id).count;
    const following = db.prepare('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?').get(user.id).count;
    const posts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;
    
    // Check if current user follows this user
    const isFollowing = db.prepare('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id) ? true : false;
    
    res.json({ ...user, stats: { followers, following, posts }, isFollowing });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Follow/Unfollow User
app.post('/api/users/:id/follow', authenticateToken, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUserId = req.user.id;
  
  if (targetUserId === currentUserId) return res.status(400).json({ error: 'Cannot follow yourself' });

  try {
    const isFollowing = db.prepare('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?').get(currentUserId, targetUserId);
    
    if (isFollowing) {
      db.prepare('DELETE FROM followers WHERE follower_id = ? AND following_id = ?').run(currentUserId, targetUserId);
      res.json({ message: 'Unfollowed successfully', following: false });
    } else {
      db.prepare('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)').run(currentUserId, targetUserId);
      res.json({ message: 'Followed successfully', following: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get User Posts
app.get('/api/users/:id/posts', authenticateToken, (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id, req.params.id);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});


// --- POST ROUTES ---

// Get Posts (Feed)
app.get('/api/posts', authenticateToken, (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.post_type = 'post'
      ORDER BY p.created_at DESC
    `).all(req.user.id);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Create Post / Reel
app.post('/api/posts', authenticateToken, upload.single('media'), (req, res) => {
  const { content, post_type } = req.body;
  const type = post_type === 'reel' ? 'reel' : 'post';
  if (!content && !req.file) return res.status(400).json({ error: 'Content or media is required' });

  const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const info = db.prepare('INSERT INTO posts (user_id, content, media_url, post_type) VALUES (?, ?, ?, ?)').run(req.user.id, content || '', mediaUrl, type);
    res.status(201).json({ message: 'Created successfully', postId: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- STORY AND REEL ROUTES ---

// Get Reels
app.get('/api/reels', authenticateToken, (req, res) => {
  try {
    const reels = db.prepare(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.post_type = 'reel'
      ORDER BY p.created_at DESC
    `).all(req.user.id);
    res.json(reels);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Stories (Recent 24 hours)
app.get('/api/stories', authenticateToken, (req, res) => {
  try {
    const stories = db.prepare(`
      SELECT s.id, s.media_url, s.created_at, u.id as user_id, u.username 
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.created_at >= datetime('now', '-1 day')
      ORDER BY s.created_at DESC
    `).all();
    
    // Group by user
    const groupedStories = [];
    const userMap = {};
    
    stories.forEach(story => {
      if (!userMap[story.user_id]) {
        userMap[story.user_id] = {
          user_id: story.user_id,
          username: story.username,
          items: []
        };
        groupedStories.push(userMap[story.user_id]);
      }
      userMap[story.user_id].items.push({
        id: story.id,
        media_url: story.media_url,
        created_at: story.created_at
      });
    });
    
    res.json(groupedStories);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Create Story
app.post('/api/stories', authenticateToken, upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Media is required for a story' });

  const mediaUrl = `/uploads/${req.file.filename}`;

  try {
    const info = db.prepare('INSERT INTO stories (user_id, media_url) VALUES (?, ?)').run(req.user.id, mediaUrl);
    res.status(201).json({ message: 'Story created', storyId: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Like/Unlike Post
app.post('/api/posts/:id/like', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const isLiked = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId);
    
    if (isLiked) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(userId, postId);
      res.json({ message: 'Post unliked', liked: false });
    } else {
      db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
      res.json({ message: 'Post liked', liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- COMMENT ROUTES ---

// Get Comments for Post
app.get('/api/posts/:id/comments', authenticateToken, (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT c.*, u.username 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add Comment
app.post('/api/posts/:id/comments', authenticateToken, (req, res) => {
  const { content } = req.body;
  const postId = parseInt(req.params.id);

  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const info = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
                   .run(postId, req.user.id, content);
    res.status(201).json({ message: 'Comment added', commentId: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
