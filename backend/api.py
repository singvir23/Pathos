
from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
from base64 import b64decode

app = Flask(__name__)
CORS(app)

@app.route('/analyze_screen', methods=['POST', 'OPTIONS'])
def analyze_screen_emotion():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify(success=True)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    try:
        # Get frame data from request
        frame_data = request.json.get('frame')
        if not frame_data:
            return jsonify({'error': 'No frame data provided'}), 400

        # Remove data URL prefix if present
        if frame_data.startswith('data:image'):
            frame_data = frame_data.split(',')[1]

        # Decode base64 to image
        img_bytes = b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Analyze emotions using DeepFace
        results = DeepFace.analyze(
            frame,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='opencv'
        )

        # Ensure results is a list
        if not isinstance(results, list):
            results = [results]

        # Process each detected face
        processed_results = []
        for result in results:
            processed_results.append({
                'dominant_emotion': result['dominant_emotion'],
                'emotion_scores': result['emotion'],
                'region': result.get('region', {
                    'x': 0,
                    'y': 0,
                    'w': frame.shape[1],
                    'h': frame.shape[0]
                })
            })

        return jsonify(processed_results)

    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True, threaded=True)
