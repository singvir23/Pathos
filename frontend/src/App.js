import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

function ScreenEmotionDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectedEmotions, setDetectedEmotions] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const animationFrameRef = useRef(null);

  // Emotion color mapping
  const getEmotionColor = useCallback((emotion) => {
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
  }, []);

  // Continuous screen capture and emotion detection
  const startContinuousCapture = useCallback(async () => {
    try {
      // Request screen capture stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'window', 
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });

      const video = videoRef.current;
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      video.play();

      // Setup canvas
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Continuous frame processing
      const processFrame = async () => {
        // Ensure video and canvas are ready
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          // Set canvas to video dimensions
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw current video frame
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to base64
          const base64Frame = canvas.toDataURL('image/jpeg');

          try {
            // Send to backend for emotion detection
            const response = await fetch('http://localhost:3000/analyze_screen', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ frame: base64Frame })
            });

            if (!response.ok) {
              throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Update detected emotions
            setDetectedEmotions(data);

          } catch (error) {
            console.error('Emotion detection error:', error);
          }
        }

        // Continue processing frames
        animationFrameRef.current = requestAnimationFrame(processFrame);
      };

      // Start processing
      setIsCapturing(true);
      processFrame();

      // Handle stream ended
      stream.getVideoTracks()[0].onended = stopCapture;

    } catch (error) {
      console.error('Capture initialization error:', error);
      setIsCapturing(false);
    }
  }, []);

  // Stop capture and release resources
  const stopCapture = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop video and tracks
    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }

    // Reset states
    setIsCapturing(false);
    setDetectedEmotions([]);
  }, []);

  // Draw faces with emotion colors
  const drawFacesWithEmotions = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw video frame
    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Draw rectangles for each detected face
    detectedEmotions.forEach(emotion => {
      const { x, y, w, h } = emotion.region;
      
      // Scale coordinates to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledW = w * scaleX;
      const scaledH = h * scaleY;

      // Draw colored rectangle
      context.strokeStyle = getEmotionColor(emotion.dominant_emotion);
      context.lineWidth = 4;
      context.shadowBlur = 10;
      context.shadowColor = getEmotionColor(emotion.dominant_emotion);
      context.strokeRect(scaledX, scaledY, scaledW, scaledH);

      // Add emotion label
      context.font = '16px Arial';
      context.fillStyle = getEmotionColor(emotion.dominant_emotion);
      context.fillText(
        emotion.dominant_emotion.toUpperCase(), 
        scaledX, 
        scaledY - 10
      );
    });
  }, [detectedEmotions, getEmotionColor]);

  // Update drawing when emotions change
  useEffect(() => {
    drawFacesWithEmotions();
  }, [drawFacesWithEmotions]);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-black p-4">
      <div className="flex space-x-4 mb-4">
        <button 
          onClick={startContinuousCapture}
          className="px-4 py-2 bg-blue-500 text-white rounded"
          disabled={isCapturing}
        >
          Start Continuous Capture
        </button>
        <button 
          onClick={stopCapture}
          className="px-4 py-2 bg-red-500 text-white rounded"
          disabled={!isCapturing}
        >
          Stop Capture
        </button>
      </div>

      <video 
        ref={videoRef} 
        className="hidden" 
        autoPlay 
        playsInline 
      />

      <canvas
        ref={canvasRef}
        className="max-w-full max-h-[600px] w-full border-2 border-white"
        width="1280"
        height="720"
      />

      {detectedEmotions.length > 0 && (
        <div className="mt-4 w-full max-w-md">
          <h2 className="text-white text-xl mb-2">Detected Emotions:</h2>
          {detectedEmotions.map((emotion, index) => (
            <div 
              key={index} 
              className="mb-2 p-2 rounded"
              style={{ 
                backgroundColor: `${getEmotionColor(emotion.dominant_emotion)}80`,
                color: 'white'
              }}
            >
              <div>Dominant Emotion: {emotion.dominant_emotion.toUpperCase()}</div>
              <div className="text-sm">
                Emotion Scores:
                {Object.entries(emotion.emotion_scores).map(([emo, score]) => (
                  <div key={emo} className="flex justify-between">
                    <span>{emo.charAt(0).toUpperCase() + emo.slice(1)}</span>
                    <span>{(score * 100).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <ScreenEmotionDetector />
    </div>
  );
}

export default App;