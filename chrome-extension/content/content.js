// Initialize face-api.js models
async function loadModels() {
  const modelPath = chrome.runtime.getURL('lib/models');
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
  await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
}

// Create overlay container
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'emotion-detector-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Create canvas for drawing
function createCanvas(overlay) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  `;
  overlay.appendChild(canvas);
  return canvas;
}

// Function to get emoji for emotion
function getEmojiPath(emotion) {
  const emotions = {
    happy: 'happy.png',
    sad: 'sad.png',
    angry: 'angry.png',
    fearful: 'fearful.png',
    disgusted: 'disgusted.png',
    surprised: 'surprised.png',
    neutral: 'neutral.png'
  };
  return chrome.runtime.getURL(`assets/emojis/${emotions[emotion]}`);
}

// Main detection function
async function detectEmotions() {
  const overlay = createOverlay();
  const canvas = createCanvas(overlay);
  const context = canvas.getContext('2d');
  
  // Load face detection models
  await loadModels();
  
  // Function to capture and analyze screen
  async function analyzeScreen() {
    // Capture the visible part of the page
    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'never' }
    });
    
    const video = document.createElement('video');
    video.srcObject = displayMedia;
    await video.play();
    
    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Detect faces and emotions
    const detections = await faceapi.detectAllFaces(video, 
      new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();
    
    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bounding boxes and emojis
    detections.forEach(async detection => {
      const { box, expressions } = detection;
      
      // Draw bounding box
      context.strokeStyle = '#00ff00';
      context.lineWidth = 2;
      context.strokeRect(box.x, box.y, box.width, box.height);
      
      // Get dominant emotion
      const dominantEmotion = Object.entries(expressions)
        .reduce((prev, current) => 
          prev[1] > current[1] ? prev : current)[0];
      
      // Load and draw emoji
      const emoji = new Image();
      emoji.src = getEmojiPath(dominantEmotion);
      emoji.onload = () => {
        context.drawImage(
          emoji,
          box.x + box.width - 30,
          box.y - 30,
          30,
          30
        );
      };
    });
    
    // Stop screen capture
    displayMedia.getTracks().forEach(track => track.stop());
  }
  
  // Analyze screen periodically
  setInterval(analyzeScreen, 1000);
}

// Listen for messages from background script
window.addEventListener('message', (event) => {
  if (event.data.type === 'START_EMOTION_DETECTION') {
    detectEmotions();
  }
});