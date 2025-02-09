let videoElement;
let canvasElement;
let animationFrame;
let isCapturing = false;

const emotionColors = {
  happy: '#4CAF50',
  sad: '#2196F3',
  angry: '#F44336',
  fear: '#9C27B0',
  surprise: '#FFC107',
  disgust: '#795548',
  neutral: '#9E9E9E'
};

document.addEventListener('DOMContentLoaded', () => {
  videoElement = document.getElementById('videoElement');
  canvasElement = document.getElementById('canvasElement');
  
  document.getElementById('startButton').addEventListener('click', startContinuousCapture);
  document.getElementById('stopButton').addEventListener('click', stopCapture);
});

async function startContinuousCapture() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'window',
        width: { ideal: 1920, max: 3840 },
        height: { ideal: 1080, max: 2160 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    });

    videoElement.srcObject = stream;
    await new Promise(resolve => {
      videoElement.onloadedmetadata = resolve;
    });
    videoElement.play();

    isCapturing = true;
    document.getElementById('startButton').disabled = true;
    document.getElementById('stopButton').disabled = false;

    processFrame();

    stream.getVideoTracks()[0].onended = stopCapture;
  } catch (error) {
    console.error('Capture initialization error:', error);
    stopCapture();
  }
}

async function processFrame() {
  if (!isCapturing) return;

  const context = canvasElement.getContext('2d');
  
  if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    const base64Frame = canvasElement.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:3000/analyze_screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ frame: base64Frame })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const detectedEmotions = await response.json();
      updateEmotionsDisplay(detectedEmotions);
      drawFacesWithEmotions(detectedEmotions);
    } catch (error) {
      console.error('Emotion detection error:', error);
    }
  }

  animationFrame = requestAnimationFrame(processFrame);
}

function stopCapture() {
  isCapturing = false;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  if (videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }

  document.getElementById('startButton').disabled = false;
  document.getElementById('stopButton').disabled = true;
  document.getElementById('emotionsContainer').innerHTML = '';
  
  const context = canvasElement.getContext('2d');
  context.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

function drawFacesWithEmotions(detectedEmotions) {
  const context = canvasElement.getContext('2d');
  context.clearRect(0, 0, canvasElement.width, canvasElement.height);
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  detectedEmotions.forEach(emotion => {
    const { x, y, w, h } = emotion.region;
    const scaleX = canvasElement.width / videoElement.videoWidth;
    const scaleY = canvasElement.height / videoElement.videoHeight;
    
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledW = w * scaleX;
    const scaledH = h * scaleY;

    const color = emotionColors[emotion.dominant_emotion.toLowerCase()];
    
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.shadowBlur = 10;
    context.shadowColor = color;
    context.strokeRect(scaledX, scaledY, scaledW, scaledH);

    context.font = '16px Arial';
    context.fillStyle = color;
    context.fillText(
      emotion.dominant_emotion.toUpperCase(),
      scaledX,
      scaledY - 10
    );
  });
}

function updateEmotionsDisplay(detectedEmotions) {
  const container = document.getElementById('emotionsContainer');
  container.innerHTML = detectedEmotions.length > 0 ? '<h2>Detected Emotions:</h2>' : '';

  detectedEmotions.forEach((emotion, index) => {
    const color = emotionColors[emotion.dominant_emotion.toLowerCase()];
    const card = document.createElement('div');
    card.className = 'emotion-card';
    card.style.backgroundColor = `${color}80`;
    
    let scoresHtml = '';
    Object.entries(emotion.emotion_scores).forEach(([emo, score]) => {
      scoresHtml += `
        <div style="display: flex; justify-content: space-between;">
          <span>${emo.charAt(0).toUpperCase() + emo.slice(1)}</span>
          <span>${(score * 100).toFixed(2)}%</span>
        </div>
      `;
    });

    card.innerHTML = `
      <div>Dominant Emotion: ${emotion.dominant_emotion.toUpperCase()}</div>
      <div style="font-size: 0.875rem;">
        Emotion Scores:
        ${scoresHtml}
      </div>
    `;
    
    container.appendChild(card);
  });
}