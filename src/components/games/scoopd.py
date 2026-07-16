import cv2
import mediapipe as mp
import numpy as np
import random
import time

# Initialize Mediapipe Hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# Open webcam
cap = cv2.VideoCapture(0)

# Load bucket image
bucket_img = cv2.imread("src/bucket.png", cv2.IMREAD_UNCHANGED)
if bucket_img is None:
    print("Error: Bucket image not found!")
    exit()

# Ensure the image has 4 channels (BGRA)
if bucket_img.shape[-1] == 3:
    bucket_img = cv2.cvtColor(bucket_img, cv2.COLOR_BGR2BGRA)

bucket_img = cv2.resize(bucket_img, (80, 100))  # Resize bucket

# Overlay function
def overlay_image(background, overlay, x, y):
    h, w, _ = overlay.shape
    bh, bw, _ = background.shape
    x = max(0, min(x, bw - w))
    y = max(0, min(y, bh - h))

    for i in range(h):
        for j in range(w):
            if overlay[i, j][3] != 0:  # Check alpha channel
                background[y + i, x + j] = overlay[i, j][:3]

# Game Variables
screen_width = 640
screen_height = 480
bucket_x = screen_width // 2
score = 0
lives = 3
falling_objects = []
speed = 3
last_time = time.time()
letters = [chr(i) for i in range(65, 91)]
current_letter = random.choice(letters)

BUCKET_Y_OFFSET = -70  # Move bucket up slightly

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    frame = cv2.resize(frame, (screen_width, screen_height))
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    
    # Process hand tracking
    results = hands.process(rgb_frame)
    if results.multi_hand_landmarks and results.multi_handedness:
        for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            hand_label = results.multi_handedness[idx].classification[0].label  # "Right" or "Left"
            
            # Prefer the right hand if available
            if hand_label == "Right":
                index_finger = hand_landmarks.landmark[8]  # Index finger tip
                bucket_x = int(index_finger.x * screen_width)
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                break  # Stop after finding the first right hand

            # If only left hand is found, use it (fallback)
            elif idx == 0:  
                index_finger = hand_landmarks.landmark[8]
                bucket_x = int(index_finger.x * screen_width)
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    # Generate falling objects
    if time.time() - last_time > 1:
        obj_x = random.randint(50, screen_width - 50)
        obj_letter = random.choice(letters)
        falling_objects.append({'x': obj_x, 'y': 0, 'letter': obj_letter})
        last_time = time.time()

    # Update falling objects
    for obj in falling_objects[:]:
        obj['y'] += speed
        if obj['y'] > screen_height:
            falling_objects.remove(obj)

        BUCKET_WIDTH = 80  # Width of the bucket
        BUCKET_HEIGHT = 100  # Height of the bucket
        BUCKET_MARGIN = 30  # Reduce sensitivity of side collisions

        for obj in falling_objects[:]:
            obj['y'] += speed

            if obj['y'] > screen_height:
                falling_objects.remove(obj)
                continue

            # Define tighter collision area
            bucket_left = bucket_x - BUCKET_WIDTH // 2 + BUCKET_MARGIN
            bucket_right = bucket_x + BUCKET_WIDTH // 2 - BUCKET_MARGIN
            bucket_top = screen_height - 80 + BUCKET_Y_OFFSET - 20  # Slightly above bucket
            bucket_bottom = screen_height - 80 + BUCKET_Y_OFFSET + 20  # Near the middle

            # Get falling letter position
            letter_x, letter_y = obj['x'], obj['y']

            # Check collision within refined box
            if bucket_left < letter_x < bucket_right and bucket_top < letter_y < bucket_bottom:
                if obj['letter'] == current_letter:
                    score += 1
                    current_letter = random.choice(letters)
                else:
                    lives -= 1
                falling_objects.remove(obj)

    # Draw falling letters using OpenCV's putText
    for obj in falling_objects:
        cv2.putText(frame, obj['letter'], (obj['x'], obj['y']), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)

    # Overlay bucket image
    overlay_image(frame, bucket_img, bucket_x - 30, screen_height - 80 + BUCKET_Y_OFFSET)

    # Display target letter on bucket
    cv2.putText(frame, current_letter, (bucket_x, screen_height - 90 + BUCKET_Y_OFFSET), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 0), 4)

    # Display Score and Lives
    cv2.putText(frame, f"Score: {score}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(frame, f"Lives: {lives}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(frame, f"Catch: {current_letter}", (screen_width//2 - 50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 3)

    # Game Over
    if lives <= 0:
        cv2.putText(frame, "GAME OVER", (screen_width//3, screen_height//2), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 3)
        cv2.imshow("SCOOP'D", frame)
        cv2.waitKey(3000)
        break

    cv2.imshow("SCOOP'D", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()