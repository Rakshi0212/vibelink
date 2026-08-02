const API_URL = 'http://localhost:3000/api';

// --- UTILS ---

function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

function timeAgo(dateString) {
    const date = new Date(dateString + 'Z');
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

// Current create tab state
let currentCreateTab = 'post';

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    const navUsername = document.getElementById('navUsername');
    if (navUsername) {
        const user = getCurrentUser();
        if (user) navUsername.textContent = `@${user.username}`;
    }
    
    // The submitPostBtn is now inside the Create modal
    const submitPostBtn = document.getElementById('submitPostBtn');
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', handleCreateSubmit);
    }

    const mediaInput = document.getElementById('mediaInput');
    if (mediaInput) {
        mediaInput.addEventListener('change', (e) => {
            const fileNameEl = document.getElementById('mediaFileName');
            if (e.target.files.length > 0) {
                fileNameEl.textContent = e.target.files[0].name;
            } else {
                fileNameEl.textContent = 'No file selected';
            }
        });
    }
});

// --- TAB SWITCHING ---

function switchTab(tab) {
    const homeFeed = document.getElementById('home-feed');
    const reelsFeed = document.getElementById('reels-feed');
    const storiesContainer = document.getElementById('stories-container');
    if (!homeFeed) return;

    if (tab === 'home') {
        homeFeed.classList.remove('hidden');
        reelsFeed.classList.add('hidden');
        loadFeed();
    } else if (tab === 'reels') {
        homeFeed.classList.add('hidden');
        reelsFeed.classList.remove('hidden');
        loadReels();
    }
}

// --- CREATE MODAL ---

function openCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.classList.remove('hidden');
        switchCreateTab('post');
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) modal.classList.add('hidden');
    // Reset
    const content = document.getElementById('postContent');
    const input = document.getElementById('mediaInput');
    const fileName = document.getElementById('mediaFileName');
    if (content) content.value = '';
    if (input) input.value = '';
    if (fileName) fileName.textContent = 'No file selected';
}

function switchCreateTab(tab) {
    currentCreateTab = tab;
    document.querySelectorAll('.create-tab').forEach(t => t.classList.remove('active'));
    const active = document.querySelector(`.create-tab[onclick="switchCreateTab('${tab}')"]`);
    if (active) active.classList.add('active');

    const mediaInput = document.getElementById('mediaInput');
    const contentInput = document.getElementById('postContent');
    const submitBtn = document.getElementById('submitPostBtn');

    if (tab === 'reel') {
        if (mediaInput) mediaInput.accept = 'video/*';
        if (contentInput) contentInput.placeholder = 'Add a caption for your Reel...';
        if (submitBtn) submitBtn.textContent = 'Share Reel';
    } else if (tab === 'story') {
        if (mediaInput) mediaInput.accept = 'image/*,video/*';
        if (contentInput) contentInput.placeholder = 'Add a caption for your Story...';
        if (submitBtn) submitBtn.textContent = 'Share Story';
    } else {
        if (mediaInput) mediaInput.accept = 'image/*,video/*';
        if (contentInput) contentInput.placeholder = 'Write a caption...';
        if (submitBtn) submitBtn.textContent = 'Share';
    }
}

async function handleCreateSubmit() {
    const contentEl = document.getElementById('postContent');
    const mediaInput = document.getElementById('mediaInput');
    const content = contentEl ? contentEl.value.trim() : '';
    const file = mediaInput ? mediaInput.files[0] : null;

    if (!content && !file) { alert('Please add a photo, video, or caption.'); return; }
    if (currentCreateTab === 'reel' && !file) { alert('Reels require a video.'); return; }
    if (currentCreateTab === 'story' && !file) { alert('Stories require a photo or video.'); return; }

    const btn = document.getElementById('submitPostBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sharing...';

    try {
        const formData = new FormData();
        if (content) formData.append('content', content);
        if (file) formData.append('media', file);

        const token = getToken();
        let endpoint = '/posts';
        let bodyType = 'post';

        if (currentCreateTab === 'reel') {
            formData.append('post_type', 'reel');
        } else if (currentCreateTab === 'story') {
            endpoint = '/stories';
        } else {
            formData.append('post_type', 'post');
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        closeCreateModal();
        // Refresh the appropriate feed
        if (currentCreateTab === 'reel') {
            switchTab('reels');
        } else {
            switchTab('home');
        }
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// --- API CALLS ---

async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401 || response.status === 403) {
        logout();
        return;
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API Error');
    return data;
}

// --- FEED & POSTS ---

async function loadFeed() {
    const feed = document.getElementById('feed');
    try {
        loadStories();
        const posts = await fetchAPI('/posts');
        renderPosts(posts, feed);
    } catch (err) {
        if (feed) feed.innerHTML = `<div class="alert">${err.message}</div>`;
    }
}

async function loadReels() {
    const reelsContainer = document.getElementById('reels');
    if (!reelsContainer) return;
    reelsContainer.innerHTML = '<div style="color:#fff; text-align:center; padding:40px;">Loading Reels...</div>';
    
    try {
        const reels = await fetchAPI('/reels');
        if (reels.length === 0) {
            reelsContainer.innerHTML = `<div class="reel-card"><div style="color:#fff; text-align:center;">No Reels yet.<br><small>Click [+] to upload a video Reel!</small></div></div>`;
            return;
        }
        reelsContainer.innerHTML = reels.map(reel => {
            const mediaTag = reel.media_url
                ? `<video src="${reel.media_url}" loop muted playsinline></video>`
                : `<div style="color:#fff; padding:30px; font-size:1.2rem;">${escapeHTML(reel.content)}</div>`;
            return `
                <div class="reel-card" onclick="toggleReelPlay(this)">
                    ${mediaTag}
                    <div class="reel-overlay">
                        <div class="reel-username">@${escapeHTML(reel.username)}</div>
                        <div class="reel-caption">${escapeHTML(reel.content)}</div>
                    </div>
                    <div class="reel-actions">
                        <div class="reel-action-btn" onclick="event.stopPropagation(); likePost(${reel.id}, this)">
                            <svg fill="${reel.isLiked ? '#ed4956' : 'white'}" height="28" viewBox="0 0 24 24" width="28"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path></svg>
                            <span>${reel.likeCount}</span>
                        </div>
                        <div class="reel-action-btn">
                            <svg fill="white" height="28" viewBox="0 0 24 24" width="28"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="white" stroke-linejoin="round" stroke-width="2"></path></svg>
                            <span>${reel.commentCount}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

        // Intersection Observer for auto-play
        const videos = reelsContainer.querySelectorAll('video');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.play();
                } else {
                    entry.target.pause();
                }
            });
        }, { threshold: 0.6 });
        videos.forEach(v => observer.observe(v));

    } catch (err) {
        reelsContainer.innerHTML = `<div class="reel-card"><div style="color:#fff;">${err.message}</div></div>`;
    }
}

function toggleReelPlay(card) {
    const video = card.querySelector('video');
    if (!video) return;
    if (video.paused) video.play(); else video.pause();
}

async function loadStories() {
    const container = document.getElementById('stories-container');
    if (!container) return;
    
    try {
        const stories = await fetchAPI('/stories');
        if (stories.length > 0) {
            container.classList.remove('hidden');
            container.innerHTML = stories.map(user => `
                <div class="story-item" onclick="viewStory(${user.user_id}, '${escapeHTML(user.username)}', '${user.items[0].media_url}')">
                    <div class="story-ring">
                        <div class="story-inner">${user.username.charAt(0).toUpperCase()}</div>
                    </div>
                    <span class="story-username">${escapeHTML(user.username)}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to load stories', err);
    }
}

function viewStory(userId, username, mediaUrl) {
    const isVideo = mediaUrl.match(/\.(mp4|webm|ogg)$/i);
    const mediaTag = isVideo 
        ? `<video src="${mediaUrl}" class="story-modal-content" autoplay controls></video>`
        : `<img src="${mediaUrl}" class="story-modal-content">`;
        
    const modal = document.createElement('div');
    modal.className = 'story-modal';
    modal.innerHTML = `
        <div class="story-modal-close" onclick="this.parentElement.remove()">&times;</div>
        ${mediaTag}
    `;
    document.body.appendChild(modal);
}

async function loadUserPosts(userId) {
    const feed = document.getElementById('feed');
    try {
        const posts = await fetchAPI(`/users/${userId}/posts`);
        renderProfilePosts(posts, feed);
    } catch (err) {
        feed.innerHTML = `<div class="alert">${err.message}</div>`;
    }
}

function renderPosts(posts, container) {
    if (posts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">No posts yet.</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <article class="post" id="post-${post.id}">
            <!-- Header -->
            <div class="post-header">
                <a href="profile.html?id=${post.user_id}" class="post-user-info">
                    <div class="post-avatar"><div class="post-avatar-inner">${post.username.charAt(0).toUpperCase()}</div></div>
                    <span class="post-username">${escapeHTML(post.username)}</span>
                </a>
                <svg aria-label="More options" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" r="1.5"></circle><circle cx="6" cy="12" r="1.5"></circle><circle cx="18" cy="12" r="1.5"></circle></svg>
            </div>
            
            <!-- Visual Content -->
            <div class="post-visual ${!post.media_url ? 'text-only' : ''}">
                ${post.media_url 
                    ? (post.media_url.match(/\.(mp4|webm|ogg)$/i) 
                        ? `<video src="${post.media_url}" controls></video>` 
                        : `<img src="${post.media_url}">`)
                    : escapeHTML(post.content)}
            </div>

            <!-- Actions -->
            <div class="post-actions">
                <div class="action-icon ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <svg aria-label="${post.isLiked ? 'Unlike' : 'Like'}" fill="${post.isLiked ? 'currentColor' : 'none'}" height="24" viewBox="0 0 24 24" width="24" stroke="currentColor" stroke-width="2">
                        <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.174 2.08 2.987 2.116 3.062a.6.6 0 0 0 1.052 0c.036-.075 1.276-1.888 2.116-3.062a4.21 4.21 0 0 1 3.625-1.941z" stroke-linejoin="round"></path>
                    </svg>
                </div>
                <div class="action-icon" onclick="toggleComments(${post.id})">
                    <svg aria-label="Comment" fill="none" height="24" viewBox="0 0 24 24" width="24" stroke="currentColor" stroke-width="2">
                        <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" stroke-linejoin="round"></path>
                    </svg>
                </div>
            </div>

            <!-- Meta -->
            <div class="post-likes">
                <span id="like-count-${post.id}">${post.likeCount}</span> likes
            </div>
            <div class="post-caption">
                <a href="profile.html?id=${post.user_id}" class="post-caption-user">${escapeHTML(post.username)}</a>
                Just shared a new thought!
            </div>
            
            <!-- Comments Section -->
            <div class="post-comments">
                <div class="view-comments" onclick="toggleComments(${post.id})" id="view-comments-btn-${post.id}">
                    View all ${post.commentCount} comments
                </div>
                
                <div class="comments-section hidden" id="comments-${post.id}">
                    <div id="comments-list-${post.id}"></div>
                </div>
            </div>

            <div class="post-date" style="padding: 0 14px; margin-bottom: 10px; margin-top: 5px;">
                ${timeAgo(post.created_at)}
            </div>

            <div class="add-comment-wrapper">
                <input type="text" id="comment-input-${post.id}" placeholder="Add a comment...">
                <button onclick="addComment(${post.id})">Post</button>
            </div>
        </article>
    `).join('');
}

function renderProfilePosts(posts, container) {
    if (posts.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 40px;">No posts yet.</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => {
        let contentHTML = `<span style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHTML(post.content)}</span>`;
        let classNames = 'grid-item text-only';
        
        if (post.media_url) {
            classNames = 'grid-item';
            if (post.media_url.match(/\.(mp4|webm|ogg)$/i)) {
                contentHTML = `<video src="${post.media_url}" muted></video>`;
            } else {
                contentHTML = `<img src="${post.media_url}">`;
            }
        }
        
        return `<div class="${classNames}">${contentHTML}</div>`;
    }).join('');
}

async function createPost(isStory = false) {
    const contentEl = document.getElementById('postContent');
    const mediaInput = document.getElementById('mediaInput');
    const content = contentEl ? contentEl.value.trim() : '';
    const file = mediaInput ? mediaInput.files[0] : null;
    
    if (!content && !file) return;
    if (isStory && !file) {
        alert("Stories must have an image or video.");
        return;
    }
    
    try {
        const btnId = isStory ? 'submitStoryBtn' : 'submitPostBtn';
        const btn = document.getElementById(btnId);
        btn.disabled = true;
        btn.textContent = 'Posting...';
        
        const formData = new FormData();
        if (content) formData.append('content', content);
        if (file) formData.append('media', file);
        
        const token = getToken();
        const response = await fetch(`${API_URL}${isStory ? '/stories' : '/posts'}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        if (contentEl) contentEl.value = '';
        if (mediaInput) {
            mediaInput.value = '';
            document.getElementById('mediaFileName').textContent = 'Photo/Video';
        }
        loadFeed(); 
    } catch (err) {
        alert(err.message);
    } finally {
        const btnId = isStory ? 'submitStoryBtn' : 'submitPostBtn';
        const btn = document.getElementById(btnId);
        btn.disabled = false;
        btn.textContent = isStory ? 'Add to Story' : 'Post';
    }
}

async function toggleLike(postId) {
    try {
        const data = await fetchAPI(`/posts/${postId}/like`, { method: 'POST' });
        
        const postCard = document.getElementById(`post-${postId}`);
        const likeBtn = postCard.querySelector('.action-icon'); // First action-icon is like
        const countSpan = document.getElementById(`like-count-${postId}`);
        
        let count = parseInt(countSpan.textContent);
        if (data.liked) {
            likeBtn.classList.add('liked');
            likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
            countSpan.textContent = count + 1;
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('svg').setAttribute('fill', 'none');
            countSpan.textContent = count - 1;
        }
    } catch (err) {
        console.error('Error toggling like:', err);
    }
}

// --- COMMENTS ---

async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    const isVisible = !section.classList.contains('hidden');
    const viewBtn = document.getElementById(`view-comments-btn-${postId}`);
    
    if (isVisible) {
        section.classList.add('hidden');
        if (viewBtn) viewBtn.style.display = 'block';
    } else {
        section.classList.remove('hidden');
        if (viewBtn) viewBtn.style.display = 'none';
        await loadComments(postId);
    }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    list.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; padding: 4px 0;">Loading...</div>';
    
    try {
        const comments = await fetchAPI(`/posts/${postId}/comments`);
        if (comments.length === 0) {
            list.innerHTML = '';
            return;
        }
        
        list.innerHTML = comments.map(c => `
            <div class="comment">
                <a href="profile.html?id=${c.user_id}" class="comment-username">${escapeHTML(c.username)}</a>
                ${escapeHTML(c.content)}
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<div class="alert">${err.message}</div>`;
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;
    
    try {
        await fetchAPI(`/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        input.value = '';
        await loadComments(postId);
        
        // Update comment count
        const countSpan = document.getElementById(`comment-count-${postId}`);
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
    } catch (err) {
        alert(err.message);
    }
}

// --- PROFILE ---

async function loadProfile(userId) {
    try {
        const user = await fetchAPI(`/users/${userId}`);
        const currentUser = getCurrentUser();
        
        document.getElementById('profileName').textContent = user.username;
        document.getElementById('profileAvatar').textContent = user.username.charAt(0).toUpperCase();
        document.getElementById('statPosts').textContent = user.stats.posts;
        document.getElementById('statFollowers').textContent = user.stats.followers;
        document.getElementById('statFollowing').textContent = user.stats.following;
        
        const followBtn = document.getElementById('followBtn');
        if (userId != currentUser.id) {
            followBtn.classList.remove('hidden');
            followBtn.textContent = user.isFollowing ? 'Unfollow' : 'Follow';
            if (user.isFollowing) {
                followBtn.classList.add('secondary');
            } else {
                followBtn.classList.remove('secondary');
            }
            
            followBtn.onclick = () => toggleFollow(userId);
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

async function toggleFollow(userId) {
    try {
        const btn = document.getElementById('followBtn');
        btn.disabled = true;
        
        const data = await fetchAPI(`/users/${userId}/follow`, { method: 'POST' });
        
        btn.textContent = data.following ? 'Unfollow' : 'Follow';
        if (data.following) {
            btn.classList.add('secondary');
        } else {
            btn.classList.remove('secondary');
        }
        
        // Update stats
        const followerCount = document.getElementById('statFollowers');
        let count = parseInt(followerCount.textContent);
        followerCount.textContent = data.following ? count + 1 : count - 1;
        
    } catch (err) {
        alert(err.message);
    } finally {
        document.getElementById('followBtn').disabled = false;
    }
}
