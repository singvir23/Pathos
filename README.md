## Inspiration

Growing up with a sister with Down Syndrome, I know firsthand how recognizing social cues and interpreting others' emotion can be a challenge for people with neurodivergent conditions. It would often be difficult for her to understand when Mom was stressed about the house being messy or why Dad was annoyed when his favorite football team lost every Sunday. For her and others with neurodivergent conditions, struggling to understand emotion translates into difficulties properly expressing them, often leading to larger mental health issues and emotional suppression. 

Our emotions are what makes us human. Everyone deserves the right to express themselves and understand why they feel the way we feel. However, in a world where social interaction is becoming more and more virtual by the day, the ability for people to discern what the others around them are going through and to understand emotions on a deeper level becomes even harder.

That's why we created **Pathos**, a sleek, user-friendly Chrome extension that identifies and outputs emotions shown from people in virtual meetings, interviews, videos, and more.

## What it does

**Pathos** identifies faces on the screen using DeepFace's, a lightweight face recognition and facial attribute analysis (age, gender, emotion and race) framework for python. It is a hybrid face recognition framework wrapping state-of-the-art models: VGG-Face, FaceNet, OpenFace, DeepFace, DeepID, ArcFace, Dlib, SFace and GhostFaceNet. Using DeepFace, **Pathos** can segment the screen to identify faces, and classify their facial expressions into different emotional categories: _happy, sad, anger, fear, surprise, disgust,_ and _neutral_. 

Each frame in the screen is fed into our model at a rate of 30 frames per second, and when each new face is detected, the model outputs the average measured emotion over a span of two seconds to prevent the model being hypersensitive to facial movements.

## How we built it
 
**Frontend Technologies:**
- ReactJS
- JavaScript (Vanilla/Native)
- HTML5
- CSS3
- Chrome Extension APIs
- chrome.runtime for message passing
- chrome.tabs for tab management
- chrome.desktopCapture for screen capture
- MediaDevices API for stream handling

**Backend:**
- Flask
- DeepFace
- cv2
- NumPy

**Key Chrome Extension Components:**
- Manifest V3 (latest Chrome extension architecture)
- Background Service Worker
- Content Scripts
- Popup Interface
- Cross-script Communication

**Features/APIs:**
- Screen Capture API
- Canvas API for real-time drawing
- RequestAnimationFrame for smooth frame processing
- Async/Await for handling asynchronous operations

**Integration:**
- Real-time communication with Python backend
- Base64 image encoding/processing
- JSON for data exchange

## Challenges we ran into

The hardest part about creating **Pathos** was integrating the workflow components seamlessly to ensure that images were being processed and emotions were being outputted at a fast yet understandable pace. We needed to find a middle ground speed that ensured that that the output could create an accurate emotion description without taking too much time. While this took a lot of fine tuning and adjusting of our video processing functions, we settled on a normalized frame rate range of 30-60 fps and matching the frame input to the video frame rate to ensure the extension and the video ran synchronously. This allowed us to not only increase the accuracy and stability of our emotion prediction, but also kept the pace of the predictions logical and useful.

## Accomplishments/What we learned

We are proud of our ability to integrate our tech stack together. Prior to this experience, members of our team did not have experience integrating a JavaScript Frontend with a Python backend. While integrating both was tough, we learned a lot about different middleware techniques to connect our React frontend with our Flask backend. We also proud that we learned how to create a web-extension, taking in input from the users' screen and processing it. 

Finally, we are proud that we created a tool that we believe will have a real positive impact on people's  emotional intelligence, mental health, and overall wellbeing.

## What's next for Pathos

We hope to further specialize **Pathos** for virtual meeting/interview use cases. This includes creating emotion timestamps and transcripts of meetings to allow users to identify which parts of their presentations, speeches, or responses yielded different reactions to learn whats working, and what needs to be improved in their online meeting rooms.
