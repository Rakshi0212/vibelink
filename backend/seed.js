const bcrypt = require('bcryptjs');
const db = require('./db');

const users = [
  { username: 'john_doe', password: 'password123' },
  { username: 'jane_smith', password: 'password123' },
  { username: 'test_user', password: 'password123' }
];

console.log('Seeding database with default users...');

try {
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)');
  
  users.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.username, hashedPassword);
    console.log(`Created user: ${user.username} / Password: ${user.password}`);
  });
  
  // Add some dummy posts
  const user1 = db.prepare('SELECT id FROM users WHERE username = ?').get('john_doe');
  const user2 = db.prepare('SELECT id FROM users WHERE username = ?').get('jane_smith');
  
  if (user1 && user2) {
      const insertPost = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)');
      insertPost.run(user1.id, 'Hello everyone! This is my first post on the new Connect social media app. 🎉');
      insertPost.run(user2.id, 'Just setting up my profile. The app looks great! #newhere');
      console.log('Created dummy posts.');
  }

  console.log('Seeding complete! You can now log in with these accounts.');
} catch (err) {
  console.error('Error seeding database:', err);
}
