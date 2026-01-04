"""
Video Hand Tracking Analyzer
Processes video files to detect hand visibility and movement for presentation analysis.
Returns simple boolean: whether hands were used effectively.
"""

import cv2
import mediapipe as mp
import sys
import json
import urllib.request
import urllib.error
import ssl
import tempfile
import os

# --- CONFIGURATION ---
MODEL_PATH = 'hand_landmarker.task'
MOVEMENT_THRESHOLD = 0.05  # 5% of screen movement
CHECK_INTERVAL = 0.5       # Check every 0.5 seconds

# --- SETUP MEDIAPIPE ---
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


def download_video(url, output_path):
    """Download video from URL to local file with proper SSL and headers."""
    try:
        # Create SSL context that doesn't verify certificates (for development)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        # Create request with user-agent header
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        request = urllib.request.Request(url, headers=headers)

        # Download video
        print(f"Downloading from: {url}", file=sys.stderr)
        with urllib.request.urlopen(request, context=ssl_context, timeout=30) as response:
            with open(output_path, 'wb') as out_file:
                # Download in chunks
                chunk_size = 8192
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)

        print(f"Download complete: {os.path.getsize(output_path)} bytes", file=sys.stderr)
        return True

    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(f"URL: {url}", file=sys.stderr)
        return False
    except urllib.error.URLError as e:
        print(f"URL Error: {e.reason}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error downloading video: {type(e).__name__}: {e}", file=sys.stderr)
        return False


def analyze_video_hands(video_path):
    """
    Analyze video for hand presence and movement.

    Returns:
        dict: {
            "used_hands_effectively": bool,
            "hands_detected": bool,
            "movement_detected": bool,
            "details": str
        }
    """
    # Initialize MediaPipe HandLandmarker in IMAGE mode
    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )

    # Open video file
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "used_hands_effectively": False,
            "hands_detected": False,
            "movement_detected": False,
            "details": "Error: Could not open video file"
        }

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # Calculate frame interval (sample every CHECK_INTERVAL seconds)
    frame_interval = int(fps * CHECK_INTERVAL) if fps > 0 else 1

    # Tracking variables
    hand_states = {
        "Left": {"last_pos": None, "moved": False},
        "Right": {"last_pos": None, "moved": False}
    }

    hands_detected_any_frame = False
    movement_detected_any_frame = False
    frames_processed = 0

    print(f"Processing video: {duration:.1f}s, {total_frames} frames, {fps:.1f} fps", file=sys.stderr)
    print(f"Sampling every {frame_interval} frames ({CHECK_INTERVAL}s intervals)", file=sys.stderr)

    with HandLandmarker.create_from_options(options) as landmarker:
        frame_count = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            # Only process frames at specified intervals
            if frame_count % frame_interval == 0:
                frames_processed += 1

                # Convert frame to MediaPipe Image format
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

                # Detect hands
                detection_result = landmarker.detect(mp_image)

                if detection_result.hand_landmarks:
                    hands_detected_any_frame = True

                    # Process each detected hand
                    for landmarks, handedness in zip(detection_result.hand_landmarks, detection_result.handedness):
                        label = handedness[0].category_name  # "Left" or "Right"

                        if label in hand_states:
                            # Get wrist position
                            current_wrist = landmarks[0]
                            current_x, current_y = current_wrist.x, current_wrist.y

                            # Check for movement
                            last_pos = hand_states[label]["last_pos"]
                            if last_pos:
                                delta_x = abs(current_x - last_pos[0])
                                delta_y = abs(current_y - last_pos[1])

                                if delta_x > MOVEMENT_THRESHOLD or delta_y > MOVEMENT_THRESHOLD:
                                    hand_states[label]["moved"] = True
                                    movement_detected_any_frame = True

                            # Update position for next check
                            hand_states[label]["last_pos"] = (current_x, current_y)

            frame_count += 1

    cap.release()

    # Determine result
    used_effectively = hands_detected_any_frame and movement_detected_any_frame

    # Generate details message
    if not hands_detected_any_frame:
        details = "No hands detected in video"
    elif not movement_detected_any_frame:
        details = "Hands detected but no movement observed"
    else:
        details = "Hands detected with movement"

    print(f"Analysis complete: {frames_processed} frames processed", file=sys.stderr)
    print(f"Hands detected: {hands_detected_any_frame}, Movement: {movement_detected_any_frame}", file=sys.stderr)

    return {
        "used_hands_effectively": used_effectively,
        "hands_detected": hands_detected_any_frame,
        "movement_detected": movement_detected_any_frame,
        "details": details,
        "frames_processed": frames_processed
    }


def main():
    """
    Main entry point for CLI usage.
    Usage: python video_hand_analyzer.py <video_url_or_path>
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python video_hand_analyzer.py <video_url_or_path>"
        }))
        sys.exit(1)

    input_path = sys.argv[1]

    # Check if input is a URL or local file
    is_url = input_path.startswith(('http://', 'https://'))

    if is_url:
        # Download video to temp file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_path = temp_file.name

        print(f"Downloading video from: {input_path}", file=sys.stderr)
        if not download_video(input_path, temp_path):
            print(json.dumps({"error": "Failed to download video"}))
            sys.exit(1)

        video_path = temp_path
    else:
        video_path = input_path

    try:
        # Analyze video
        result = analyze_video_hands(video_path)

        # Output JSON result
        print(json.dumps(result))

    finally:
        # Clean up temp file if downloaded
        if is_url and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == '__main__':
    main()
