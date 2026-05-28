# Social Media App Frontend

A basic frontend for the Social Media App backend API.

## Features

- User authentication (login/register)
- Video upload with progress tracking
- Video playback using Video.js with HLS support
- User profile and channel management
- Responsive design

## Setup

1. Make sure the backend server is running on `http://localhost:8000`
2. Open `index.html` in a web browser
3. No build process required - it's pure HTML/CSS/JS

## Pages

### Login Page
- User login form
- Link to registration

### Register Page
- User registration with avatar and cover image upload
- Link to login

### Home Page
- Shows latest videos (placeholder for now)
- Requires authentication

### Profile Page
- Shows user information
- Links to upload and channel pages

### Upload Page
- Video file upload with metadata
- Progress tracking during S3 upload

### Channel Page
- User's channel information
- List of user's videos

### Video Player Page
- HLS video playback using Video.js
- Video information display

## API Integration

The frontend communicates with the backend API endpoints:

- `POST /users/login` - User login
- `POST /users/register` - User registration
- `POST /videos/upload-url` - Get S3 presigned URL
- `POST /videos/upload` - Save video metadata
- `GET /videos/:videoId` - Get video details
- `GET /channels/info` - Get channel information
- `POST /channels/create` - Create channel

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Video.js for video playback
- Fetch API for HTTP requests

## Browser Support

- Modern browsers with ES6 support
- HLS video support (Safari, Chrome, Firefox with appropriate plugins)

## Development

To modify the frontend:

1. Edit `index.html` for structure changes
2. Edit `css/styles.css` for styling
3. Edit `js/app.js` for functionality

The code is organized with:
- Utility functions at the top
- API functions in the middle
- Event listeners at the bottom
- Global functions exposed for onclick handlers