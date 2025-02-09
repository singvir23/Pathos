import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

function ScreenEmotionDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectedEmotions, setDetectedEmotions] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const animationFrameRef = useRef(null);

  const getEmotionColor = useCallback((emotion) => {
    const colors = {
      happy: '#4CAF50',    
      sad: '#2196F3',     
      angry: '#F44336',    
      fear: '#9C27B0',    
      surprise: '#FFC107', 
      disgust: '#795548',  
      neutral: '#9E9E9E'   
    };
    return colors[emotion?.toLowerCase()] || colors.neutral;
  }, []);


  const startContinuousCapture = useCallback(async () => {
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

      const video = videoRef.current;
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      video.play();

     
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      const processFrame = async () => {
        
        if (video.videoWidth > 0 && video.videoHeight > 0) {
         
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

        
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

    
          const base64Frame = canvas.toDataURL('image/jpeg');

          try {
 
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
            
 
            setDetectedEmotions(data);
            drawFacesWithEmotions();

          } catch (error) {
            console.error('Emotion detection error:', error);
          }
        }


        animationFrameRef.current = requestAnimationFrame(processFrame);
      };


      setIsCapturing(true);
      processFrame();


      stream.getVideoTracks()[0].onended = stopCapture;

    } catch (error) {
      console.error('Capture initialization error:', error);
      setIsCapturing(false);
    }
  }, []);

 
  const stopCapture = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }

    setIsCapturing(false);
    setDetectedEmotions([]);
  }, []);

  const drawFacesWithEmotions = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);

    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    detectedEmotions.forEach(emotion => {
      const { x, y, w, h } = emotion.region;
      
      // Scale coordinates to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
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

      <div className="relative w-full max-w-full max-h-[600px]">
        <video 
          ref={videoRef} 
          className="absolute top-0 left-0 w-full h-full object-contain" 
          autoPlay 
          playsInline 
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
          width="1280"
          height="720"
        />
      </div>

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