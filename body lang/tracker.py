import cv2
import mediapipe as mp
import time
import numpy as np

# --- CONFIGURATION ---
MODEL_PATH = 'hand_landmarker.task' 
MOVEMENT_THRESHOLD = 0.05  # 10% of screen movement
CHECK_INTERVAL = 0.5       # Check every 1 second

# Skeleton connections
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
]

# --- SETUP MEDIAPIPE ---
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
HandLandmarkerResult = mp.tasks.vision.HandLandmarkerResult
VisionRunningMode = mp.tasks.vision.RunningMode

# Global variables
latest_result = None

def result_callback(result: HandLandmarkerResult, output_image: mp.Image, timestamp_ms: int):
    global latest_result
    latest_result = result

def draw_landmarks_on_image(rgb_image, detection_result):
    hand_landmarks_list = detection_result.hand_landmarks
    annotated_image = np.copy(rgb_image)
    height, width, _ = annotated_image.shape

    for hand_landmarks in hand_landmarks_list:
        points = {} 
        for idx, landmark in enumerate(hand_landmarks):
            x = int(landmark.x * width)
            y = int(landmark.y * height)
            points[idx] = (x, y)

        for connection in HAND_CONNECTIONS:
            start_idx = connection[0]
            end_idx = connection[1]
            if start_idx in points and end_idx in points:
                cv2.line(annotated_image, points[start_idx], points[end_idx], (0, 255, 0), 2)

        for idx, point in points.items():
            cv2.circle(annotated_image, point, 4, (255, 0, 0), -1)
            
    return annotated_image

# --- MAIN EXECUTION ---
def main():
    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.LIVE_STREAM,
        num_hands=2, # Ensure we can detect both
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        result_callback=result_callback
    )

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # --- INDEPENDENT TRACKING VARIABLES ---
    # We store the last position for each hand separately
    hand_states = {
        "Left":  {"present": False, "last_pos": None, "status": "Waiting"},
        "Right": {"present": False, "last_pos": None, "status": "Waiting"}
    }
    
    last_check_time = time.time()

    print("Starting... Press 'q' to exit.")

    with HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            success, frame = cap.read()
            if not success: continue

            frame = cv2.flip(frame, 1)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
            frame_timestamp_ms = int(time.time() * 1000)
            landmarker.detect_async(mp_image, frame_timestamp_ms)
            
            # --- ALGORITHM LOGIC ---
            
            # Reset presence for this frame (assume hands are gone until proven otherwise)
            hand_states["Left"]["present"] = False
            hand_states["Right"]["present"] = False

            if latest_result and latest_result.hand_landmarks:
                frame = draw_landmarks_on_image(frame, latest_result)
                
                # Iterate through detected hands and their labels (Left/Right)
                for landmarks, handedness in zip(latest_result.hand_landmarks, latest_result.handedness):
                    # MediaPipe Label: "Left" or "Right"
                    # Note: In selfie mode, "Left" usually refers to the user's actual left hand
                    label = handedness[0].category_name 
                    
                    if label in hand_states:
                        hand_states[label]["present"] = True
                        
                        # Get Wrist Position
                        current_wrist = landmarks[0]
                        current_x, current_y = current_wrist.x, current_wrist.y

                        # Check Movement every 1 second
                        if time.time() - last_check_time > CHECK_INTERVAL:
                            last_pos = hand_states[label]["last_pos"]
                            
                            if last_pos:
                                delta_x = abs(current_x - last_pos[0])
                                delta_y = abs(current_y - last_pos[1])
                                
                                if delta_x > MOVEMENT_THRESHOLD or delta_y > MOVEMENT_THRESHOLD:
                                    hand_states[label]["status"] = "MOVED!"
                                else:
                                    hand_states[label]["status"] = "Still"
                            
                            # Update position for next check
                            hand_states[label]["last_pos"] = (current_x, current_y)

            # Reset timer after checking both hands
            if time.time() - last_check_time > CHECK_INTERVAL:
                last_check_time = time.time()
                # If a hand wasn't present during the check, reset its history
                for label in ["Left", "Right"]:
                    if not hand_states[label]["present"]:
                         hand_states[label]["last_pos"] = None
                         hand_states[label]["status"] = "Gone"

            # --- DASHBOARD UI ---
            # Draw Left Hand Box
            cv2.rectangle(frame, (10, 10), (300, 120), (50, 50, 50), -1)
            cv2.putText(frame, "LEFT HAND", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            l_color = (0, 255, 0) if hand_states["Left"]["present"] else (0, 0, 255)
            l_text = "Visible" if hand_states["Left"]["present"] else "Not Visible"
            cv2.putText(frame, f"Vis: {l_text}", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, l_color, 2)
            
            m_color = (0, 255, 255) if "MOVED" in hand_states["Left"]["status"] else (200, 200, 200)
            cv2.putText(frame, f"Mov: {hand_states['Left']['status']}", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, m_color, 2)

            # Draw Right Hand Box (Top Right Corner)
            h, w, _ = frame.shape
            cv2.rectangle(frame, (w - 310, 10), (w - 10, 120), (50, 50, 50), -1)
            cv2.putText(frame, "RIGHT HAND", (w - 300, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            r_color = (0, 255, 0) if hand_states["Right"]["present"] else (0, 0, 255)
            r_text = "Visible" if hand_states["Right"]["present"] else "Not Visible"
            cv2.putText(frame, f"Vis: {r_text}", (w - 300, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, r_color, 2)
            
            rm_color = (0, 255, 255) if "MOVED" in hand_states["Right"]["status"] else (200, 200, 200)
            cv2.putText(frame, f"Mov: {hand_states['Right']['status']}", (w - 300, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, rm_color, 2)

            cv2.imshow('MediaPipe Hand Tasks', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()