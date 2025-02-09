

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
    
    if request.method == 'OPTIONS':
        response = jsonify(success=True)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    try:
       
        frame_data = request.json.get('frame')
        if not frame_data:
            return jsonify({'error': 'No frame data provided'}), 400

        
        if frame_data.startswith('data:image'):
            frame_data = frame_data.split(',')[1]

       
        img_bytes = b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400

        
        results = DeepFace.analyze(
            frame,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='opencv'
        )

        
        if not isinstance(results, list):
            results = [results]

        processed_results = []
        for result in results:
            
            emotion_scores = {
                key: float(val) for key, val in result['emotion'].items()
            }

            
            raw_region = result.get('region')
           
            if not raw_region:
                
                raw_region = (0, 0, frame.shape[1], frame.shape[0])

           
            if isinstance(raw_region, (tuple, list)):
                if len(raw_region) == 4:
                    x_val, y_val, w_val, h_val = raw_region
                else:
                    
                    x_val, y_val, w_val, h_val = 0, 0, frame.shape[1], frame.shape[0]
                region_dict = {
                    'x': x_val,
                    'y': y_val,
                    'w': w_val,
                    'h': h_val
                }
            elif isinstance(raw_region, dict):
               
                x_val = raw_region.get('x') if raw_region.get('x') is not None else 0
                y_val = raw_region.get('y') if raw_region.get('y') is not None else 0
                w_val = raw_region.get('w') if raw_region.get('w') is not None else frame.shape[1]
                h_val = raw_region.get('h') if raw_region.get('h') is not None else frame.shape[0]
                region_dict = {
                    'x': x_val,
                    'y': y_val,
                    'w': w_val,
                    'h': h_val
                }
            else:
               
                region_dict = {
                    'x': 0,
                    'y': 0,
                    'w': frame.shape[1],
                    'h': frame.shape[0]
                }

            region_converted = {
                'x': int(region_dict['x']),
                'y': int(region_dict['y']),
                'w': int(region_dict['w']),
                'h': int(region_dict['h'])
            }

            processed_results.append({
                'dominant_emotion': result['dominant_emotion'],
                'emotion_scores': emotion_scores,
                'region': region_converted
            })

        return jsonify(processed_results)

    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)

