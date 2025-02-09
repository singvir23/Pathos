from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
from base64 import b64decode
import traceback
import logging
import json

# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configure CORS to be more explicit and secure
CORS(app, resources={
    r"/analyze": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]},
    r"/health": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}
})

# Override Flask's default JSON encoder
app.json_encoder = NumpyEncoder

@app.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint to verify backend availability
    """
    return jsonify({
        'status': 'healthy',
        'message': 'Backend service is running'
    }), 200

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze_emotion():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        # Log incoming request details
        logger.info(f"Received analyze request. Headers: {request.headers}")
        logger.info(f"Request JSON keys: {request.json.keys() if request.json else 'No JSON'}")

        # Verify request data
        if not request.json or 'frame' not in request.json:
            logger.warning('No frame data received')
            return jsonify({'error': 'No frame data received'}), 400

        # Decode base64 image from React
        frame_data = request.json['frame']
        
        # Remove data URL prefix if present
        if frame_data.startswith('data:image'):
            frame_data = frame_data.split(',')[1]
        
        # Decode base64 to image
        img_bytes = b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Log image processing details
        logger.info(f"Decoded image shape: {frame.shape}")
        
        # Detect emotion using DeepFace
        result = DeepFace.analyze(
            frame,
            actions=['emotion'],
            enforce_detection=False  # Important for handling images without strict face detection
        )
        
        # Log detection result
        logger.info(f"DeepFace analysis result: {result}")
        
        # Return the first detected face's emotions
        if result:
            # If multiple faces are detected, take the first one
            if isinstance(result, list):
                result = result[0]
            
            # Ensure emotion scores are converted to standard Python types
            emotion_scores = {k: float(v) for k, v in result['emotion'].items()}
            
            return jsonify({
                'dominant_emotion': result['dominant_emotion'],
                'emotion_scores': emotion_scores
            })
        else:
            logger.warning('No face detected in the frame')
            return jsonify({'error': 'No face detected'}), 404
    
    except Exception as e:
        # Log full error trace for debugging
        logger.error("Full error details:")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002, debug=True)
