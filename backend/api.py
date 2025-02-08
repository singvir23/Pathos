from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
from base64 import b64decode

app = Flask(__name__)
CORS(app)  # Enable CORS to allow cross-origin requests

@app.route('/analyze', methods=['POST'])
def analyze_emotion():
    try:
        # Decode base64 image from React
        frame_data = request.json['frame']
        
        # Remove data URL prefix if present
        if frame_data.startswith('data:image'):
            frame_data = frame_data.split(',')[1]
        
        # Decode base64 to image
        img_bytes = b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Detect emotion using DeepFace
        # Default model is VGG-Face, but you can specify others
        result = DeepFace.analyze(
            frame, 
            actions=['emotion'],
            enforce_detection=False  # Important for handling images without strict face detection
        )
        
        # Return the first detected face's emotions
        if result:
            # If multiple faces are detected, take the first one
            if isinstance(result, list):
                result = result[0]
            
            # Extract dominant emotion and emotion distribution
            return jsonify({
                'dominant_emotion': result['dominant_emotion'],
                'emotion_scores': result['emotion']
            })
        else:
            return jsonify({
                'error': 'No face detected'
            }), 404
    
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)