import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

function EmotionDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const faceMeshRef = useRef(null);

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: '#4CAF50',    // Green
      surprised: '#FFC107', // Amber
      mad: '#F44336',      // Red
      sad: '#2196F3',      // Blue
      neutral: '#9E9E9E'   // Grey
    };
    return colors[emotion] || colors.neutral;
  };

  const detectEmotion = (features) => {
    // Basic feature calculations with debuggable values
    const smileValue = (features.mouthWidth - 0.35) * 2; // Smile intensity
    const eyebrowRaiseValue = 2 - (features.leftEyebrowOuter + features.rightEyebrowOuter); // Eyebrow raise
    const eyeOpenValue = ((features.leftEyeOpen + features.rightEyeOpen) / 2) - 0.15; // Eye openness
    const mouthOpenValue = features.mouthHeight - 0.2; // Mouth opening
    const eyebrowAngerValue = (features.leftEyebrowInner + features.rightEyebrowInner) / 2; // Eyebrow furrow
    const mouthFrownValue = (features.mouthCornerLeft + features.mouthCornerRight) / 2; // Mouth corners

    // Log the values for debugging and tuning
    console.log({
      smile: smileValue.toFixed(2),
      eyebrowRaise: eyebrowRaiseValue.toFixed(2),
      eyeOpen: eyeOpenValue.toFixed(2),
      mouthOpen: mouthOpenValue.toFixed(2),
      eyebrowAnger: eyebrowAngerValue.toFixed(2),
      mouthFrown: mouthFrownValue.toFixed(2)
    });

    // Simple, reliable detection rules
    if (smileValue > 0.15) { // Clear smile
      return 'happy';
    } 
    else if (eyebrowRaiseValue > 0.15 && mouthOpenValue > 0.1) { // Raised eyebrows and open mouth
      return 'surprised';
    }
    else if (eyebrowAngerValue > 0.45 && mouthFrownValue < 0.4) { // Furrowed brows and tight/frowning mouth
      return 'mad';
    }
    else if (mouthFrownValue > 0.5 && eyebrowRaiseValue > 0.1) { // Drooping mouth corners and slightly raised eyebrows
      return 'sad';
    }
    
    return 'neutral';
  };

  const onResults = useCallback((results) => {
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.save();
    
    // Clear and draw video frame
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Draw points for face landmarks
      canvasCtx.fillStyle = '#00FF00';
      landmarks.forEach(landmark => {
        canvasCtx.beginPath();
        canvasCtx.arc(
          landmark.x * canvasRef.current.width,
          landmark.y * canvasRef.current.height,
          1,
          0,
          2 * Math.PI
        );
        canvasCtx.fill();
      });

      // Calculate features and detect emotion
      const features = {
        mouthWidth: Math.abs(landmarks[61].x - landmarks[291].x),
        mouthHeight: Math.abs(landmarks[13].y - landmarks[14].y),
        mouthCornerLeft: landmarks[61].y,
        mouthCornerRight: landmarks[291].y,
        leftEyeOpen: Math.abs(landmarks[159].y - landmarks[145].y),
        rightEyeOpen: Math.abs(landmarks[386].y - landmarks[374].y),
        leftEyebrowOuter: landmarks[282].y,
        rightEyebrowOuter: landmarks[52].y,
        leftEyebrowInner: landmarks[332].y,
        rightEyebrowInner: landmarks[103].y
      };

      const emotion = detectEmotion(features);
      setCurrentEmotion(emotion);

      // Draw emotion text overlay
      canvasCtx.font = '24px Arial';
      canvasCtx.fillStyle = '#FFFFFF';
      canvasCtx.strokeStyle = '#000000';
      canvasCtx.lineWidth = 4;
      canvasCtx.strokeText(`Emotion: ${emotion}`, 10, 30);
      canvasCtx.fillText(`Emotion: ${emotion}`, 10, 30);
    }
    
    canvasCtx.restore();
  }, []);

  useEffect(() => {
    let cleanup = false;
    let videoElement = videoRef.current;

    const loadFaceMesh = async () => {
      if (!cleanup) {
        try {
          // Load MediaPipe scripts
          const drawingUtils = document.createElement('script');
          drawingUtils.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';
          await new Promise((resolve) => {
            drawingUtils.onload = resolve;
            document.body.appendChild(drawingUtils);
          });

          const faceMeshScript = document.createElement('script');
          faceMeshScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
          await new Promise((resolve) => {
            faceMeshScript.onload = resolve;
            document.body.appendChild(faceMeshScript);
          });

          // Wait a bit for WASM to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (!cleanup) {
            // Initialize FaceMesh
            faceMeshRef.current = new window.FaceMesh({
              locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
              }
            });

            faceMeshRef.current.setOptions({
              maxNumFaces: 1,
              refineLandmarks: true,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5,
              selfieMode: true
            });

            faceMeshRef.current.onResults(onResults);

            // Initialize camera
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                  }
                });

                if (!cleanup && videoElement) {
                  videoElement.srcObject = stream;
                  videoElement.play();

                  const processFrame = async () => {
                    if (!cleanup && faceMeshRef.current) {
                      await faceMeshRef.current.send({image: videoElement});
                      requestAnimationFrame(processFrame);
                    }
                  };

                  requestAnimationFrame(processFrame);
                }
              } catch (err) {
                console.error('Error accessing camera:', err);
              }
            }
          }
        } catch (error) {
          console.error('Error loading FaceMesh:', error);
        }
      }
    };

    loadFaceMesh();

    return () => {
      cleanup = true;
      if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onResults]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-black">
      <div className="relative">
        <video
          ref={videoRef}
          className="hidden"
          width="640"
          height="480"
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          width="640"
          height="480"
        />
        <div 
          className="absolute top-0 left-0 p-4 text-white text-xl"
          style={{ backgroundColor: `${getEmotionColor(currentEmotion)}80` }}
        >
          {currentEmotion.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <EmotionDetector />
    </div>
  );
}

export default App;