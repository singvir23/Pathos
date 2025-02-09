let videoElement;
let canvasElement;
let isCapturing = false;
let animationFrameId = null;
let stream = null;

// Emotion color mapping
function getEmotionColor(emotion) {
  const colors = {
    happy: '#4CAF50',    // Green
    sad: '#2196F3',      // Blue
    angry: '#F44336',    // Red
    fear: '#9C27B0',     // Purple
    surprise: '#FFC107', // Amber
    disgust: '#795548',  // Brown
    neutral: '#9E9E9E'   // Grey
  };
  return colors[emotion?.toLowerCase()] || colors.neutral;
}

function updateEmotionsDisplay(emotions) {
  const container = document.getElementById('emotionsDisplay');
  container.innerHTML = '';

  emotions.forEach((emotion, index) => {
    const card = document.createElement('div');
    card.className = 'emotion-card';
    card.style.backgroundColor = `${getEmotionColor(emotion.dominant_emotion)}80`;

    let html = `
      <div>Dominant Emotion: ${emotion.dominant_emotion.toUpperCase()}</div>
      <div class="emotion-scores">
        ${Object.entries(emotion.emotion_scores)
          .map(([emo, score]) => `
            <div class="score-bar">
              <span>${emo.charAt(0).toUpperCase() + emo.slice(1)}</span>
              <span>${(score * 100).toFixed(2)}%</span>
            </div>
          `).join('')}
      </div>
    `;

    card.innerHTML = html;
    container.appendChild(card);
  });
}

function drawFacesWithEmotions(emotions) {
  const context = canvasElement.getContext('2d');
  context.clearRect(0, 0, canvasElement.width, canvasElement.height);

  emotions.forEach(emotion => {
    const { x, y, w, h } = emotion.region;
    
    const scaleX = canvasElement.width / videoElement.videoWidth;
    const scaleY = canvasElement.height / videoElement.videoHeight;
    
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledW = w * scaleX;
    const scaledH = h * scaleY;

    context.strokeStyle = getEmotionColor(emotion.dominant_emotion);
    context.lineWidth = 4;
    context.shadowBlur = 10;
    context.shadowColor = getEmotionColor(emotion.dominant_emotion);
    context.strokeRect(scaledX, scaledY, scaledW, scaledH);

    context.font = '16px Arial';
    context.fillStyle = getEmotionColor(emotion.dominant_emotion);
    context.fillText(
      emotion.dominant_emotion.toUpperCase(),
      scaledX,
      scaledY - 10
    );
  });
}

async function startCapture() {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { 
        displaySurface: 'window',
        frameRate: { ideal: 60, max: 120 }
      },
      audio: false
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    document.getElementById('startCapture').disabled = true;
    document.getElementById('stopCapture').disabled = false;
    isCapturing = true;

    processFrame();

    stream.getVideoTracks()[0].onended = stopCapture;
  } catch (error) {
    console.error('Error starting capture:', error);
  }
}

async function processFrame() {
  if (!isCapturing) return;

  const context = canvasElement.getContext('2d');
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  const base64Frame = canvasElement.toDataURL('image/jpeg');

  try {
    const response = await fetch('http://localhost:3000/analyze_screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: base64Frame })
    });

    if (response.ok) {
      const emotions = await response.json();
      drawFacesWithEmotions(emotions);
      updateEmotionsDisplay(emotions);
    }
  } catch (error) {
    console.error('Error processing frame:', error);
  }

  animationFrameId = requestAnimationFrame(processFrame);
}

function stopCapture() {
  isCapturing = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
  document.getElementById('startCapture').disabled = false;
  document.getElementById('stopCapture').disabled = true;
  document.getElementById('emotionsDisplay').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  videoElement = document.getElementById('video');
  canvasElement = document.getElementById('canvas');

  document.getElementById('startCapture').addEventListener('click', startCapture);
  document.getElementById('stopCapture').addEventListener('click', stopCapture);
}); 