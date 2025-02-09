import requests
import base64

def test_server():
    # Read a test image file (replace with path to any test image)
    with open('Subject.png', 'rb') as image_file:
        # Convert the image to base64
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Add the data URL prefix
        image_data = f'data:image/jpeg;base64,{encoded_string}'
        
        # Make the request
        response = requests.post(
            'http://localhost:3002/analyze',
            json={'frame': image_data}
        )
        
        # Print results
        print('Status Code:', response.status_code)
        print('Response:', response.json())

if __name__ == '__main__':
    test_server()