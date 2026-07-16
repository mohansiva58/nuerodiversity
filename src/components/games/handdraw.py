import cv2
import mediapipe as mp
import numpy as np
import json
from collections import deque
import time

# Initialize Mediapipe Hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(min_detection_confidence=0.8, min_tracking_confidence=0.8)

# Open webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

class LetterTracer:
    def __init__(self):
        self.letters = ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e']
        self.current_letter_idx = 0
        self.traced_path = deque(maxlen=1000)
        self.reference_points = self.load_reference_points()
        self.start_time = time.time()
        self.attempts = []
        self.last_position = None
        self.smooth_buffer = deque(maxlen=10)  # Buffer for smoothing
        
    def load_reference_points(self):
        return {
        # Capital Letters
        'A': [
            # Left leg
            (300, 600), (350, 600), (400, 400), (450, 200),  # Bottom left to top
            # Right leg
            (550, 200), (600, 400), (650, 600), (700, 600),  # Top to bottom right
            # Crossbar
            (400, 400), (600, 400)  # Horizontal bar connecting the two legs
        ],
        'B': [
            # Vertical stem
            (300, 600), (300, 200), 
            # Top curve
            (300, 200), (450, 200), (450, 300), (300, 300),
            # Bottom curve
            (300, 300), (450, 300), (450, 500), (300, 500),
            # Close the bottom
            (300, 500), (300, 600)
        ],
        'C': [
            # Open curve
            (600, 200), (450, 200), (350, 300), (350, 500), (450, 600), (600, 600)
        ],
        'D': [
            # Vertical stem
            (300, 600), (300, 200),
            # Curve
            (300, 200), (500, 200), (600, 300), (600, 500), (500, 600), (300, 600)
        ],
        'E': [
            # Vertical stem
            (300, 600), (300, 200),
            # Top bar
            (300, 200), (500, 200),
            # Middle bar
            (300, 400), (450, 400),
            # Bottom bar
            (300, 600), (500, 600)
        ],
        
        # Lowercase Letters
        'a': [
            # Oval shape
            (400, 500), (350, 450), (400, 400), (450, 450), (400, 500),
            # Tail
            (450, 450), (500, 400)
        ],
        'b': [
            # Vertical stem
            (350, 600), (350, 400),
            # Curve
            (350, 400), (400, 400), (450, 450), (400, 500), (350, 500)
        ],
        'c': [
            # Open curve
            (450, 400), (400, 400), (350, 450), (400, 500), (450, 500)
        ],
        'd': [
            # Vertical stem
            (450, 600), (450, 400),
            # Curve
            (450, 400), (400, 400), (350, 450), (400, 500), (450, 500)
        ],
        'e': [
            # Oval with crossbar
            (450, 500), (350, 500), (350, 450), (450, 450), (450, 500),
            # Crossbar
            (350, 475), (450, 475)
        ]
    }

    def smooth_position(self, x, y):
        """Apply exponential moving average for smoother tracking"""
        self.smooth_buffer.append((x, y))
        if len(self.smooth_buffer) < 3:  # Wait for some samples
            return x, y
            
        avg_x = np.mean([p[0] for p in self.smooth_buffer])
        avg_y = np.mean([p[1] for p in self.smooth_buffer])
        
        if self.last_position:
            alpha = 0.3  # Smoothing factor (0-1, lower = smoother but slower)
            x = int(self.last_position[0] * (1 - alpha) + avg_x * alpha)
            y = int(self.last_position[1] * (1 - alpha) + avg_y * alpha)
        
        return x, y

    def add_point(self, x, y):
        """Add point with minimum distance threshold"""
        if self.last_position:
            dist = np.sqrt((x - self.last_position[0])**2 + 
                          (y - self.last_position[1])**2)
            if dist < 5:  # Minimum distance threshold
                return False
        
        smoothed_x, smoothed_y = self.smooth_position(x, y)
        self.traced_path.append((smoothed_x, smoothed_y))
        self.last_position = (smoothed_x, smoothed_y)
        return True

    def next_letter(self):
        self.save_current_trace()
        self.traced_path.clear()
        self.smooth_buffer.clear()
        self.last_position = None
        self.current_letter_idx = (self.current_letter_idx + 1) % len(self.letters)
        self.start_time = time.time()

    def calculate_accuracy(self):
        if not self.traced_path or self.current_letter not in self.reference_points:
            return 0
        ref = np.array(self.reference_points[self.current_letter])
        trace = np.array(self.traced_path)
        min_dists = []
        for point in trace:
            dists = np.linalg.norm(ref - point, axis=1)
            min_dists.append(np.min(dists))
        accuracy = max(0, 100 - np.mean(min_dists) / 5)
        return round(accuracy, 1)

    def save_current_trace(self):
        if self.traced_path:
            accuracy = self.calculate_accuracy()
            self.attempts.append({
                "letter": self.current_letter,
                "trace": list(self.traced_path),
                "accuracy": accuracy,
                "timestamp": time.time()
            })

    @property
    def current_letter(self):
        return self.letters[self.current_letter_idx]

tracer = LetterTracer()

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb_frame)
    
    h, w = frame.shape[:2]
    
    # UI
    cv2.putText(frame, f"Trace: {tracer.current_letter}", (50, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 2)
    cv2.putText(frame, "Press 'n' for next, 'q' to quit", (50, 90),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
    
    # Draw reference path
    if tracer.current_letter in tracer.reference_points:
        ref_points = tracer.reference_points[tracer.current_letter]
        for i in range(1, len(ref_points)):
            cv2.line(frame, ref_points[i-1], ref_points[i], (255, 0, 0), 2)
    
    # Hand tracking
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            index_fingertip = hand_landmarks.landmark[8]
            x, y = int(index_fingertip.x * w), int(index_fingertip.y * h)
            
            # Add point with debouncing
            if tracer.add_point(x, y):
                cv2.circle(frame, (tracer.last_position[0], 
                                 tracer.last_position[1]), 8, (0, 255, 0), -1)
            
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
    
    # Draw traced path
    if len(tracer.traced_path) > 1:
        for i in range(1, len(tracer.traced_path)):
            cv2.line(frame, tracer.traced_path[i-1], tracer.traced_path[i], 
                    (0, 255, 0), 3)
    
    # Display accuracy
    accuracy = tracer.calculate_accuracy()
    cv2.putText(frame, f"Accuracy: {accuracy}%", (w-200, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    cv2.imshow('Hand Tracing - Stabilized', frame)
    
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('n'):
        tracer.next_letter()

# Save data
with open(f"traced_data_{int(time.time())}.json", "w") as f:
    json.dump({"attempts": tracer.attempts}, f)

cap.release()
cv2.destroyAllWindows()
hands.close()