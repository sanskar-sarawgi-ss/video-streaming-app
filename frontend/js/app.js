// API Configuration
const API_BASE_URL = 'http://' + window.location.hostname + '/api';
// const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://your-production-api.com';

// Global state
let currentUser = null;
let currentVideoPlayer = null;
let userHasChannel = false;

// Utility functions
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // if(pageId == 'login') {
    //     const token = getAuthToken();
    //     if(token){
    //         loadHomeVideos();
    //         return
    //     }
    // }

    // Show selected page
    document.getElementById(pageId + 'Page').classList.add('active');

    // Update navigation
    updateNavigation();

    // Load page data
    switch(pageId) {
        case 'home':
            loadHomeVideos();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'channel':
            loadChannel();
            break;
    }
}

function updateNavigation() {
    const logoutBtn = document.getElementById('logoutBtn');
    const channelLink = document.getElementById('channelLink');

    if (currentUser) {
        logoutBtn.style.display = 'block';
        // Show channel link only if user has a channel
        if (userHasChannel) {
            channelLink.style.display = 'inline';
        } else {
            channelLink.style.display = 'none';
        }
    } else {
        logoutBtn.style.display = 'none';
        channelLink.style.display = 'none';
    }
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.error, .success');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error' : 'success';
    messageDiv.textContent = message;

    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

function clearAuthToken() {
    localStorage.removeItem('authToken');
    currentUser = null;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            ...options.headers
        },
        ...options
    };

    // Only set Content-Type to JSON if body is not FormData
    if (!(options.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }

    // Add auth token if available
    const token = getAuthToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Authentication functions
async function login(email, password) {
    try {
        // get cros origin cookie from backend and set it in frontend
        const response = await apiRequest('/users/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: {
                'Content-Type': 'application/json',
                'CROSS-ORIGIN': 'true'
            }
        });

        if (response.data && response.data.accessToken) {
            setAuthToken(response.data.accessToken);
            currentUser = response.data.user;

            // Check if user has a channel
            try {
                const channelResponse = await apiRequest('/channels/info');
                userHasChannel = !!channelResponse.data;
            } catch (error) {
                userHasChannel = false;
            }

            showMessage('Login successful!', 'success');
            showPage('home');
        }
    } catch (error) {
        showMessage('Login failed: ' + error.message, 'error');
    }
}

async function register(formData) {
    try {
        const response = await apiRequest('/users/register', {
            method: 'POST',
            body: formData
        });

        if (response.data) {
            showMessage('Registration successful! Please login.', 'success');
            showPage('login');
        }
    } catch (error) {
        showMessage('Registration failed: ' + error.message, 'error');
    }
}

function logout() {
    clearAuthToken();
    userHasChannel = false;
    showPage('login');
    showMessage('Logged out successfully');
}

// Video functions
async function loadHomeVideos() {
    try {
        // TODO: Replace with actual API call when backend has /videos endpoint
        // const response = await apiRequest('/videos?limit=20');
        // const videos = response.data;

        // For now, show placeholder
        const videosContainer = document.getElementById('videosContainer');
        videosContainer.innerHTML = `
            <div class="video-card" onclick="playVideo('sample-video-id')">
                <div class="video-thumbnail">
                    <span>▶️ Sample Video</span>
                </div>
                <div class="video-info">
                    <div class="video-title">Welcome to Social Media App</div>
                    <div class="video-description">
                        This is a sample video. Upload your own videos to see them here!
                        The video player supports HLS streaming for smooth playback.
                    </div>
                    <div class="video-meta">
                        <span>0 views</span>
                        <span>Sample Channel</span>
                    </div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-thumbnail">
                    <span>📹 Upload Video</span>
                </div>
                <div class="video-info">
                    <div class="video-title">How to Upload Videos</div>
                    <div class="video-description">
                        Click on Profile > Upload Video to start sharing your content.
                        Videos are processed automatically and converted to HLS format.
                    </div>
                    <div class="video-meta">
                        <span>Guide</span>
                        <span>Platform</span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        showMessage('Failed to load videos: ' + error.message, 'error');
    }
}

async function loadProfile() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    const profileInfo = document.getElementById('profileInfo');
    profileInfo.innerHTML = `
        <img src="${currentUser.avatar || '/placeholder-avatar.png'}" alt="Avatar" class="profile-avatar">
        <h3>${currentUser.username}</h3>
        <p>${currentUser.email}</p>
    `;

    // Update profile actions based on channel status
    const profileActions = document.querySelector('.profile-actions');
    if (userHasChannel) {
        profileActions.innerHTML = `
            <button onclick="showPage('upload')" class="btn btn-primary">Upload Video</button>
            <button onclick="showPage('channel')" class="btn btn-secondary">My Channel</button>
        `;
    } else {
        profileActions.innerHTML = `
            <button onclick="createChannel()" class="btn btn-primary">Create Channel</button>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">Create a channel to start uploading videos</p>
        `;
    }

    // Update navigation after checking profile
    updateNavigation();
}

async function loadChannel() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    try {
        // Load channel info
        const channelResponse = await apiRequest('/channels/info');
        const channelInfo = document.getElementById('channelInfo');

        let channel = null;
        if (channelResponse.data) {
            channel = channelResponse.data;
            userHasChannel = true;
            channelInfo.innerHTML = `
                <img src="${channel.banner || '/placeholder-banner.png'}" alt="Banner" class="channel-banner">
                <h3>${channel.name}</h3>
                <p>${channel.description}</p>
                <p>Subscribers: ${channel.subscribers || 0}</p>
            `;
        } else {
            userHasChannel = false;
            channelInfo.innerHTML = `
                <p>You don't have a channel yet.</p>
                <button onclick="createChannel()" class="btn btn-primary">Create Channel</button>
            `;
        }

        // Load channel videos
        const channelVideos = document.getElementById('channelVideos');
        console.log('Fetching videos for channel:', channel._id);

        try {
            // Fetch user's videos
            const videosResponse = await apiRequest(`/videos/list/${channel._id}`);
            const videos = videosResponse.data || [];

            if (videos.length > 0) {
                channelVideos.innerHTML = videos.map(video => `
                    <div class="video-card" onclick="playVideo('${video._id}', '${video.videoFile}')">
                        <div class="video-thumbnail">
                            <span>▶️ ${video.title}</span>
                        </div>
                        <div class="video-info">
                            <div class="video-title">${video.title}</div>
                            <div class="video-description">${video.description}</div>
                            <div class="video-meta">
                                <span>${video.views || 0} views</span>
                                <span>Status: ${video.status}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                channelVideos.innerHTML = '<p>No videos uploaded yet. <a href="#" onclick="showPage(\'upload\')">Upload your first video</a></p>';
            }
        } catch (error) {
            channelVideos.innerHTML = '<p>Failed to load videos. Please try again later.</p>';
            console.error('Failed to load channel videos:', error);
        }

        } catch (error) {
            showMessage('Failed to load channel: ' + error.message, 'error');
        }

        // Update navigation after checking channel status
        updateNavigation();
}

async function createChannel() {
    const channelName = prompt('Enter channel name:');
    const channelDescription = prompt('Enter channel description:');

    if (!channelName || !channelDescription) {
        return;
    }

    try {

        // why for this request body is comming empty in backend and for other request body is coming fine, both are post request and both are comming from frontend only, both are using same apiRequest function, both are using same content type json, both are using same url, then why this is happening
        // ok ake it work like othere
        await apiRequest('/channels/create', {
            method: 'POST',
            body: JSON.stringify({
                channelName,
                description: channelDescription
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        showMessage('Channel created successfully!', 'success');
        userHasChannel = true;
        updateNavigation();
        loadChannel();
    } catch (error) {
        showMessage('Failed to create channel: ' + error.message, 'error');
    }
}

async function uploadVideo(file, title, description) {
    try {
        // First, get presigned URL for S3 upload
        const uploadUrlResponse = await apiRequest('/videos/upload-url', {
            method: 'POST',
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
            })
        });

        const { presignedUrl, key } = uploadUrlResponse.data;

        // Upload file to S3
        const uploadProgress = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');

        uploadProgress.style.display = 'block';

        await uploadToS3(presignedUrl, file, (progress) => {
            progressText.textContent = Math.round(progress) + '%';
            progressFill.style.width = progress + '%';
        });

        // Save video metadata
        await apiRequest('/videos/upload', {
            method: 'POST',
            body: JSON.stringify({
                title,
                description,
                s3Key: key
            })
        });

        uploadProgress.style.display = 'none';
        showMessage('Video uploaded successfully!', 'success');
        showPage('channel');

    } catch (error) {
        document.getElementById('uploadProgress').style.display = 'none';
        showMessage('Upload failed: ' + error.message, 'error');
    }
}

async function uploadToS3(presignedUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                resolve();
            } else {
                reject(new Error('S3 upload failed'));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('S3 upload failed'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
}

function playVideo(videoId, src) {
    // Navigate to video player page
    showPage('videoPlayer');

    // Initialize Video.js player with HLS stream
    const videoContainer = document.getElementById('videoPlayer');

    // Clear existing player
    if (currentVideoPlayer) {
        currentVideoPlayer.dispose();
    }

    videoContainer.innerHTML = `
        <video id="videoPlayerElement" class="video-js vjs-default-skin" controls preload="auto">
            <source src="${src}" type="application/x-mpegURL">
        </video>
    `;

    // Initialize Video.js
    currentVideoPlayer = videojs('videoPlayerElement', {
        html5: {
            hls: {
                overrideNative: !videojs.browser.IS_SAFARI
            }
        }
    });

    // Load video info
    loadVideoInfo(videoId);
}

async function loadVideoInfo(videoId) {
    try {
        const response = await apiRequest(`/videos/${videoId}`);
        const video = response.data;

        const videoInfo = document.getElementById('videoInfo');
        videoInfo.innerHTML = `
            <h2>${video.title}</h2>
            <p>${video.description}</p>
            <div class="video-meta">
                <span>${video.views || 0} views</span>
            </div>
        `;

        // Update HLS source
        if (currentVideoPlayer && video.videoFile) {
            currentVideoPlayer.src({
                src: video.videoFile,
                type: 'application/x-mpegURL',
            });
        }

    } catch (error) {
        showMessage('Failed to load video: ' + error.message, 'error');
    }
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    const token = getAuthToken();
    if (token) {
        try {
            // Try to get current user info (assuming there's a /users/me endpoint)
            // If not available, we'll work with stored token
            showPage('home');
        } catch (error) {
            // Token might be invalid, clear it
            clearAuthToken();
            showPage('login');
        }
    } else {
        showPage('login');
    }

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('username', document.getElementById('username').value);
        formData.append('email', document.getElementById('registerEmail').value);
        formData.append('password', document.getElementById('registerPassword').value);
        formData.append('fullName', document.getElementById('registerFullName').value)

        const avatarFile = document.getElementById('avatar').files[0];
        const coverImageFile = document.getElementById('coverImage').files[0];

        if (avatarFile) formData.append('avatar', avatarFile);
        if (coverImageFile) formData.append('coverImage', coverImageFile);

        await register(formData);
    });

    // Upload form
    document.getElementById('uploadForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const file = document.getElementById('videoFile').files[0];
        const title = document.getElementById('videoTitle').value;
        const description = document.getElementById('videoDescription').value;

        if (file && title && description) {
            await uploadVideo(file, title, description);
        } else {
            showMessage('Please fill all fields', 'error');
        }
    });
});

// Global functions for onclick handlers
window.showPage = showPage;
window.logout = logout;
window.createChannel = createChannel;
window.playVideo = playVideo;

// Session restoration function
async function restoreSession() {
    const token = getAuthToken();
    if (token) {
        try {
            const response = await apiRequest('/users/current');
            if (response.data) {
                currentUser = response.data;

                // Check if user has a channel
                try {
                    const channelResponse = await apiRequest('/channels/info');
                    userHasChannel = !!channelResponse.data;
                } catch (error) {
                    userHasChannel = false;
                }

                showPage('home');
                return;
            }
        } catch (error) {
            // Token is invalid, clear it
            clearAuthToken();
        }
    }

    // No valid session, show login page
    showPage('login');
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    restoreSession();
});

// developement support 