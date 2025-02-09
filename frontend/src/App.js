import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

function EmotionDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameCountRef = useRef(0);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [emotionScores, setEmotionScores] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Emotion color mapping
  const getEmotionColor = (emotion) => {
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
  };

  // Function to send frame to DeepFace API
  const sendFrameToAPI = useCallback(async (canvas) => {
    if (isProcessing) {
      console.log('Already processing a frame. Skipping...');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Convert canvas to base64
      const base64Frame = canvas.toDataURL('image/jpeg');
      
      console.log('Sending frame to API. Frame length:', base64Frame.length);
      
      // Send to Flask backend using fetch
      const response = await fetch('http://localhost:3002/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ frame: base64Frame })
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('API Response:', data);

      // Update emotion state
      if (data.dominant_emotion) {
        console.log('Detected Emotion:', data.dominant_emotion);
        console.log('Emotion Scores:', data.emotion_scores);
        
        setCurrentEmotion(data.dominant_emotion);
        setEmotionScores(data.emotion_scores);
      } else {
        console.log('No emotion detected in the frame');
      }
    } catch (error) {
      console.error('Emotion detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  useEffect(() => {
    let videoElement = null;
    let animationFrameId = null;
    let isCleanedUp = false;

    const startVideoCapture = async () => {
      try {
        videoElement = videoRef.current;
        const canvas = canvasRef.current;

        // Ensure previous streams are stopped
        if (videoElement.srcObject) {
          const tracks = videoElement.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }

        // Get new media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user' 
          } 
        });

        // Check if component is still mounted
        if (isCleanedUp) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        // Set stream and play
        videoElement.srcObject = stream;
        
        // Use promises to handle play more gracefully
        const playPromise = videoElement.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Successful autoplay
            const processFrame = () => {
              // Process every 60 frames
              frameCountRef.current++;
              
              if (frameCountRef.current % 60 === 0 && !isProcessing) {
                console.log(`Processing frame ${frameCountRef.current}`);
                const context = canvas.getContext('2d');
                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                sendFrameToAPI(canvas);
              }

              // Continue animation
              animationFrameId = requestAnimationFrame(processFrame);
            };

            animationFrameId = requestAnimationFrame(processFrame);
          }).catch(error => {
            console.error('Error playing video:', error);
          });
        }
      } catch (error) {
        console.error('Camera access error:', error);
      }
    };

    startVideoCapture();

    // Cleanup function
    return () => {
      isCleanedUp = true;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [sendFrameToAPI, isProcessing]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-black">
      <div className="relative">
        <video
          ref={videoRef}
          className="hidden"
          width="640"
          height="480"
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          width="640"
          height="480"
        />
        <div 
          className="absolute top-0 left-0 p-4 text-white text-xl"
          style={{ 
            backgroundColor: `${getEmotionColor(currentEmotion)}80`,
            transition: 'background-color 0.5s ease'
          }}
        >
          {currentEmotion.toUpperCase()}
        </div>
        {emotionScores && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
            <div className="text-white text-sm">
              {Object.entries(emotionScores).map(([emotion, score]) => (
                <div key={emotion} className="flex justify-between">
                  <span>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                  <span>{(score * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
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