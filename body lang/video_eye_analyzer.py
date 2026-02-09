"""
Video Eye Tracking Analyzer
Processes video files to analyze eye gaze direction using MediaPipe FaceLandmarker.
Uses a calibration-based approach: first 3 seconds establish the user's personal
"center" gaze, then subsequent samples are classified relative to that baseline.
Returns a confidence score (% of time looking at center).
"""

import cv2
import mediapipe as mp
import numpy as np
import sys
import json
import urllib.request
import urllib.error
import ssl
import tempfile
import os

# --- CONFIGURATION ---
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_landmarker.task")
CALIBRATION_DURATION = 3.0   # seconds
SAMPLE_INTERVAL_MS = 100     # sample every 100ms
CENTER_THRESHOLD_STDS = 1.5  # within 1.5 std devs = CENTER

# Eye landmark indices
RIGHT_EYE = {"iris": 473, "inner": 362, "outer": 263}
LEFT_EYE = {"iris": 468, "inner": 33, "outer": 133}

# MediaPipe task API
BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


def ensure_model():
    """Download the face landmarker model if it doesn't exist."""
    if os.path.exists(MODEL_PATH):
        return True
    print(f"Downloading face landmarker model to {MODEL_PATH}...", file=sys.stderr)
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(MODEL_URL, headers={
            "User-Agent": "Mozilla/5.0"
        })
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            with open(MODEL_PATH, "wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        print("Model downloaded successfully.", file=sys.stderr)
        return True
    except Exception as e:
        print(f"Failed to download model: {e}", file=sys.stderr)
        return False


def compute_gaze(landmarks):
    """
    Compute average horizontal ratio and vertical offset from both eyes.
    Returns (avg_x, avg_y) or None if landmarks are missing.
    """
    values = []
    for eye in [LEFT_EYE, RIGHT_EYE]:
        iris = landmarks[eye["iris"]]
        inner = landmarks[eye["inner"]]
        outer = landmarks[eye["outer"]]

        eye_width = abs(outer.x - inner.x)
        if eye_width < 1e-6:
            continue

        # Horizontal: 0=left, 0.5=center, 1=right
        x_ratio = (iris.x - min(inner.x, outer.x)) / eye_width
        # Vertical: negative=up, positive=down
        corners_avg_y = (inner.y + outer.y) / 2.0
        y_offset = (iris.y - corners_avg_y) / eye_width

        values.append((x_ratio, y_offset))

    if not values:
        return None

    avg_x = np.mean([v[0] for v in values])
    avg_y = np.mean([v[1] for v in values])
    return (avg_x, avg_y)


def classify_direction(x, y, cal_center, cal_std):
    """Classify gaze direction relative to calibration baseline."""
    dx = x - cal_center[0]
    dy = y - cal_center[1]
    sx = cal_std[0] if cal_std[0] > 1e-6 else 0.02
    sy = cal_std[1] if cal_std[1] > 1e-6 else 0.02

    # If within threshold on both axes, it's center
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


def download_video(url, output_path):
    """Download video from URL to local file."""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            with open(output_path, "wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        return True
    except Exception as e:
        print(f"Error downloading video: {e}", file=sys.stderr)
        return False


def analyze_video_eyes(video_path):
    """
    Analyze eye gaze in a video file.

    Args:
        video_path: Path to video file.

    Returns:
        dict with confidence_score, total_samples, center_samples,
        calibration_center, and gaze_log.
    """
    if not ensure_model():
        return {"error": "Could not download face landmarker model"}

    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video file"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    # Frame interval for ~100ms sampling
    frame_interval = max(1, int(fps * SAMPLE_INTERVAL_MS / 1000.0))

    print(f"Video: {duration:.1f}s, {fps:.0f}fps, sampling every {frame_interval} frames", file=sys.stderr)

    # Create landmarker in VIDEO mode
    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )

    calibration_samples = []  # (x, y) tuples during calibration
    post_cal_samples = []     # (time, x, y) tuples after calibration
    gaze_log = []

    with FaceLandmarker.create_from_options(options) as landmarker:
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                timestamp_s = frame_idx / fps
                timestamp_ms = int(frame_idx * 1000 / fps)

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

                result = landmarker.detect_for_video(mp_image, timestamp_ms)

                if result.face_landmarks:
                    lm = result.face_landmarks[0]
                    gaze = compute_gaze(lm)
                    if gaze:
                        if timestamp_s < CALIBRATION_DURATION:
                            calibration_samples.append(gaze)
                        else:
                            post_cal_samples.append((timestamp_s, gaze[0], gaze[1]))

            frame_idx += 1

    cap.release()

    # Calculate calibration baseline
    if len(calibration_samples) < 3:
        # Not enough calibration data — use all samples as calibration fallback
        print("Warning: insufficient calibration samples, using defaults", file=sys.stderr)
        cal_center = (0.5, 0.0)
        cal_std = (0.03, 0.03)
    else:
        xs = [s[0] for s in calibration_samples]
        ys = [s[1] for s in calibration_samples]
        cal_center = (float(np.mean(xs)), float(np.mean(ys)))
        cal_std = (float(max(np.std(xs), 1e-4)), float(max(np.std(ys), 1e-4)))

    print(f"Calibration: center=({cal_center[0]:.4f}, {cal_center[1]:.4f}), "
          f"std=({cal_std[0]:.4f}, {cal_std[1]:.4f}), "
          f"samples={len(calibration_samples)}", file=sys.stderr)

    # Classify post-calibration samples
    center_count = 0
    for t, x, y in post_cal_samples:
        direction = classify_direction(x, y, cal_center, cal_std)
        gaze_log.append({"time": round(t, 2), "direction": direction})
        if direction == "CENTER":
            center_count += 1

    total = len(post_cal_samples)
    score = int(round(100.0 * center_count / total)) if total > 0 else 0

    return {
        "confidence_score": score,
        "total_samples": total,
        "center_samples": center_count,
        "calibration_center": {"x": round(cal_center[0], 4), "y": round(cal_center[1], 4)},
        "gaze_log": gaze_log,
    }


def main():
    """CLI entry point: python video_eye_analyzer.py <video_url_or_path>"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python video_eye_analyzer.py <video_url_or_path>"}))
        sys.exit(1)

    input_path = sys.argv[1]
    is_url = input_path.startswith(("http://", "https://"))

    if is_url:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            temp_path = tmp.name
        if not download_video(input_path, temp_path):
            print(json.dumps({"error": "Failed to download video"}))
            sys.exit(1)
        video_path = temp_path
    else:
        video_path = input_path
        temp_path = None

    try:
        result = analyze_video_eyes(video_path)
        print(json.dumps(result, indent=2))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    main()
