#!/usr/bin/env python3
"""
Live Webcam Eye Tracking Test
Opens webcam and runs the same calibration + gaze classification logic
as video_eye_analyzer.py, with a real-time overlay showing:
  - Calibration countdown / status
  - Current gaze direction
  - Running confidence score
  - Calibration baseline values

Press 'q' to quit.
"""

import cv2
import mediapipe as mp
import numpy as np
import time
import os
import sys

# Reuse constants from the analyzer
CALIBRATION_DURATION = 3.0
CENTER_THRESHOLD_STDS = 3.0

# Eye landmark indices
RIGHT_EYE = {"iris": 473, "inner": 362, "outer": 263}
LEFT_EYE = {"iris": 468, "inner": 33, "outer": 133}

# Model path (same directory as this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


def ensure_model():
    """Download model if missing."""
    if os.path.exists(MODEL_PATH):
        return True
    print(f"Downloading face landmarker model...")
    import urllib.request, ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            with open(MODEL_PATH, "wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        print("Model downloaded.")
        return True
    except Exception as e:
        print(f"Failed to download model: {e}")
        return False


def compute_gaze(landmarks):
    """Compute average (x_ratio, y_offset) from both eyes."""
    values = []
    for eye in [LEFT_EYE, RIGHT_EYE]:
        iris = landmarks[eye["iris"]]
        inner = landmarks[eye["inner"]]
        outer = landmarks[eye["outer"]]
        eye_width = abs(outer.x - inner.x)
        if eye_width < 1e-6:
            continue
        x_ratio = (iris.x - min(inner.x, outer.x)) / eye_width
        corners_avg_y = (inner.y + outer.y) / 2.0
        y_offset = (iris.y - corners_avg_y) / eye_width
        values.append((x_ratio, y_offset))
    if not values:
        return None
    return (np.mean([v[0] for v in values]), np.mean([v[1] for v in values]))


def classify_direction(x, y, cal_center, cal_std):
    """Classify gaze relative to calibration center."""
    dx = x - cal_center[0]
    dy = y - cal_center[1]
    sx = cal_std[0] if cal_std[0] > 1e-6 else 0.02
    sy = cal_std[1] if cal_std[1] > 1e-6 else 0.02

    if abs(dx) < CENTER_THRESHOLD_STDS * sx and abs(dy) < CENTER_THRESHOLD_STDS * sy:
        return "CENTER"

    parts = []
    if dy < -CENTER_THRESHOLD_STDS * sy:
        parts.append("UP")
    elif dy > CENTER_THRESHOLD_STDS * sy:
        parts.append("DOWN")
    if dx < -CENTER_THRESHOLD_STDS * sx:
        parts.append("LEFT")
    elif dx > CENTER_THRESHOLD_STDS * sx:
        parts.append("RIGHT")
    return "-".join(parts) if parts else "CENTER"


def draw_text(frame, text, pos, color=(0, 255, 0), scale=0.7, thickness=2):
    """Draw text with a dark background for readability."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    (w, h), _ = cv2.getTextSize(text, font, scale, thickness)
    x, y = pos
    cv2.rectangle(frame, (x - 2, y - h - 4), (x + w + 2, y + 4), (0, 0, 0), -1)
    cv2.putText(frame, text, (x, y), font, scale, color, thickness)


def main():
    if not ensure_model():
        sys.exit(1)

    # Use LIVE_STREAM mode requires callbacks; IMAGE mode is simpler for per-frame
    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Cannot open webcam")
        sys.exit(1)

    print("Webcam opened. Look at the CENTER of the screen for the first 3 seconds to calibrate.")
    print("Press 'q' to quit.")

    cal_samples = []
    cal_center = None
    cal_std = None
    center_count = 0
    total_count = 0
    direction = "CALIBRATING"
    start_time = time.time()
    last_sample_time = 0

    with FaceLandmarker.create_from_options(options) as landmarker:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Flip for mirror effect
            frame = cv2.flip(frame, 1)
            elapsed = time.time() - start_time
            now = time.time()

            # Sample every ~100ms
            if now - last_sample_time >= 0.1:
                last_sample_time = now
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = landmarker.detect(mp_image)

                if result.face_landmarks:
                    gaze = compute_gaze(result.face_landmarks[0])
                    if gaze:
                        if elapsed < CALIBRATION_DURATION:
                            cal_samples.append(gaze)
                            direction = "CALIBRATING"
                        else:
                            # Compute calibration if just finished
                            if cal_center is None:
                                if len(cal_samples) >= 3:
                                    xs = [s[0] for s in cal_samples]
                                    ys = [s[1] for s in cal_samples]
                                    cal_center = (float(np.mean(xs)), float(np.mean(ys)))
                                    cal_std = (float(max(np.std(xs), 1e-4)),
                                               float(max(np.std(ys), 1e-4)))
                                else:
                                    cal_center = (0.5, 0.0)
                                    cal_std = (0.03, 0.03)

                            direction = classify_direction(gaze[0], gaze[1], cal_center, cal_std)
                            total_count += 1
                            if direction == "CENTER":
                                center_count += 1
                else:
                    if elapsed >= CALIBRATION_DURATION:
                        direction = "NO FACE"

            # --- Draw overlay ---
            h, w = frame.shape[:2]

            if elapsed < CALIBRATION_DURATION:
                remaining = CALIBRATION_DURATION - elapsed
                draw_text(frame, f"CALIBRATING... {remaining:.1f}s", (10, 30), (0, 200, 255), 0.8)
                draw_text(frame, "Look at the CENTER of the screen", (10, 60), (0, 200, 255), 0.6)
                # Draw center crosshair
                cx, cy = w // 2, h // 2
                cv2.line(frame, (cx - 20, cy), (cx + 20, cy), (0, 200, 255), 2)
                cv2.line(frame, (cx, cy - 20), (cx, cy + 20), (0, 200, 255), 2)
            else:
                # Direction
                dir_color = (0, 255, 0) if direction == "CENTER" else (0, 0, 255)
                draw_text(frame, f"Direction: {direction}", (10, 30), dir_color, 0.9)

                # Confidence score
                score = int(100 * center_count / total_count) if total_count > 0 else 0
                score_color = (0, 255, 0) if score >= 70 else (0, 165, 255) if score >= 40 else (0, 0, 255)
                draw_text(frame, f"Confidence: {score}%", (10, 65), score_color, 0.8)
                draw_text(frame, f"Samples: {center_count}/{total_count}", (10, 95), (200, 200, 200), 0.5)

                # Calibration baseline
                if cal_center:
                    draw_text(frame, f"Baseline: x={cal_center[0]:.3f} y={cal_center[1]:.3f}",
                              (10, h - 40), (180, 180, 180), 0.5)
                    draw_text(frame, f"Std: x={cal_std[0]:.4f} y={cal_std[1]:.4f}",
                              (10, h - 15), (180, 180, 180), 0.5)

            cv2.imshow("Eye Tracking Test - Press Q to quit", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()

    # Print summary
    if total_count > 0:
        print(f"\n{'='*40}")
        print(f"Final confidence: {int(100 * center_count / total_count)}%")
        print(f"Center samples: {center_count}/{total_count}")
        if cal_center:
            print(f"Calibration center: x={cal_center[0]:.4f}, y={cal_center[1]:.4f}")
            print(f"Calibration std:    x={cal_std[0]:.4f}, y={cal_std[1]:.4f}")
        print(f"{'='*40}")


if __name__ == "__main__":
    main()
