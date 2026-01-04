# Hand Tracking Integration for Speakeasy

This directory contains the hand tracking analysis system for body language feedback in student presentations.

## Overview

The hand tracking system analyzes student presentation videos to determine if they used their hands effectively. It provides simple binary feedback:

- ✓ **Used hands effectively** - If hands were detected and movement was observed
- ✗ **Did not use hands effectively** - If no hands detected or no movement observed

## Files

### `tracker.py`
Original real-time hand tracking script for live webcam testing.
- Uses MediaPipe for hand detection
- Displays visual feedback with skeleton overlay
- Tracks left/right hand independently
- **Usage**: For development and testing only

### `video_hand_analyzer.py`
Production video analyzer that processes recorded videos.
- Accepts video URL or local file path
- Samples frames every 0.5 seconds
- Detects hand presence and movement
- Returns JSON result

### `hand_landmarker.task`
Pre-trained MediaPipe hand detection model (7.8 MB)
- Required for both scripts
- Google's ML model for 21-point hand landmark detection

## How It Works

### Analysis Logic

1. **Frame Sampling**: Extract frames every 0.5 seconds from video
2. **Hand Detection**: Use MediaPipe to detect left/right hands (up to 2 hands)
3. **Movement Tracking**:
   - Track wrist position (landmark 0) for each hand
   - Calculate movement delta between frames
   - Movement threshold: 0.05 (5% of frame dimensions)
4. **Result Determination**:
   - ✓ If ANY hand movement detected
   - ✗ If no hands OR no movement

### Integration Flow

```
Student submits video
    ↓
Video uploaded to Supabase Storage
    ↓
Queue Processor Edge Function
    ↓
Calls hand-tracking-analysis Edge Function
    ↓
(When Python service is deployed)
Edge Function → Python Service → video_hand_analyzer.py
    ↓
Returns: {"used_hands_effectively": true/false}
    ↓
Feedback stored: "✓ Used hands effectively" or "✗ Did not use hands effectively"
    ↓
Displayed to student/teacher in UI
```

## Deployment Options

### Option 1: Local Python Service (Development)

For testing locally:

```bash
# Install dependencies
pip install opencv-python mediapipe

# Test with local video file
python video_hand_analyzer.py /path/to/video.webm

# Test with URL
python video_hand_analyzer.py "https://yourproject.supabase.co/storage/v1/object/public/speech-videos/..."
```

### Option 2: Deploy Python as HTTP Service (Production)

#### Using Google Cloud Run

1. **Create Dockerfile**:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
RUN pip install opencv-python-headless mediapipe flask

# Copy files
COPY video_hand_analyzer.py .
COPY hand_landmarker.task .
COPY app.py .

# Expose port
EXPOSE 8080

# Run Flask app
CMD ["python", "app.py"]
```

2. **Create `app.py`** (Flask wrapper):

```python
from flask import Flask, request, jsonify
from video_hand_analyzer import analyze_video_hands, download_video
import tempfile
import os

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    video_url = data.get('video_url')

    if not video_url:
        return jsonify({"error": "video_url required"}), 400

    # Download and analyze
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
        temp_path = temp_file.name

    try:
        if not download_video(video_url, temp_path):
            return jsonify({"error": "Failed to download video"}), 500

        result = analyze_video_hands(temp_path)
        return jsonify(result)

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

3. **Deploy to Cloud Run**:

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT/hand-tracker
gcloud run deploy hand-tracker \
  --image gcr.io/YOUR_PROJECT/hand-tracker \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

4. **Configure Supabase Edge Function**:

```bash
# Set environment variable
npx supabase secrets set HAND_TRACKING_SERVICE_URL=https://your-cloud-run-url.run.app/analyze
```

#### Using AWS Lambda

1. **Create Lambda Layer with dependencies** (opencv-python, mediapipe)
2. **Package and deploy** `video_hand_analyzer.py` and `hand_landmarker.task`
3. **Create API Gateway** endpoint
4. **Set HAND_TRACKING_SERVICE_URL** in Supabase

### Option 3: Fallback Mode (Current)

Currently, the system uses a fallback that returns a default result when `HAND_TRACKING_SERVICE_URL` is not set:

- Returns: `{"used_hands_effectively": true}` (default positive for testing)
- This allows the app to function while you set up the Python service

## Deploy Edge Function

Deploy the hand-tracking-analysis Edge Function:

```bash
npx supabase functions deploy hand-tracking-analysis
```

The queue-processor already calls this function automatically during video processing.

## Testing

### Test Python Analyzer Locally

```bash
# With local file
python video_hand_analyzer.py test_video.webm

# Expected output:
{
  "used_hands_effectively": true,
  "hands_detected": true,
  "movement_detected": true,
  "details": "Hands detected with movement",
  "frames_processed": 24
}
```

### Test Edge Function

```bash
curl -X POST https://yourproject.supabase.co/functions/v1/hand-tracking-analysis \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://yourproject.supabase.co/storage/v1/object/public/speech-videos/..."}'

# Expected response:
{
  "feedback": "✓ Used hands effectively",
  "analysis": {
    "used_hands_effectively": true,
    "hands_detected": true,
    "movement_detected": true,
    "details": "Hands detected with movement"
  }
}
```

### Test Full Integration

1. Submit a video as a student
2. Wait for queue processor to complete
3. Check feedback in student view - should show checkbox with ✓ or ✗

## Configuration

### Adjustable Parameters

In `video_hand_analyzer.py`:

```python
MOVEMENT_THRESHOLD = 0.05  # 5% of screen - increase for more sensitivity
CHECK_INTERVAL = 0.5       # Sample every 0.5 seconds - adjust for performance
```

### Edge Function Timeout

The hand-tracking-analysis function has a 60-second timeout. For longer videos, you may need to:
- Optimize frame sampling rate
- Deploy Python service with longer timeout
- Process asynchronously with webhook callback

## UI Display

The feedback is displayed in 3 locations:

1. **StudentAssignmentPage.jsx** - Student's view of their submission
2. **AssignmentDetailPage.jsx** - Teacher's detailed view
3. **Results.jsx** - General results display

All show:
- Green checkmark (✓) for effective hand use
- Red X (✗) for ineffective/no hand use

## Troubleshooting

### "Hand tracking service not configured"

Set the `HAND_TRACKING_SERVICE_URL` environment variable in Supabase:

```bash
npx supabase secrets set HAND_TRACKING_SERVICE_URL=https://your-service-url.com/analyze
```

### Python Service Returns Error

Check logs:
- Video URL is publicly accessible
- Video format is supported (WebM, MP4)
- MediaPipe model file exists
- Dependencies are installed

### No Hands Detected

Possible causes:
- Student's hands out of frame
- Poor video quality/lighting
- Camera angle doesn't show hands
- Video too short (< 0.5 seconds)

## Future Enhancements

Possible improvements:
- Gesture quality analysis (not just movement)
- Hand usage percentage over time
- Specific gesture recognition (pointing, open palm, etc.)
- Posture analysis using MediaPipe Pose
- Eye contact tracking using MediaPipe Face Mesh

## Support

For issues or questions:
1. Check Edge Function logs: `npx supabase functions logs hand-tracking-analysis`
2. Check Python service logs (if deployed)
3. Test with `tracker.py` locally first to verify MediaPipe works
4. Ensure video URLs are publicly accessible
