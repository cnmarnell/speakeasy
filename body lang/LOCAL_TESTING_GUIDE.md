# Local Testing Guide

This guide will walk you through testing the hand tracking system locally before deploying to production.

## Prerequisites

✅ All dependencies are installed:
- Python 3.13.1
- opencv-python 4.12.0
- mediapipe 0.10.31
- flask 3.1.2
- flask-cors 6.0.2

## Step 1: Test Real-Time Hand Tracking (Optional)

Test the original webcam tracker to verify MediaPipe is working:

```bash
python3 tracker.py
```

**What to expect:**
- A window will open showing your webcam feed
- Move your hands in front of the camera
- You should see:
  - Green skeleton overlay on your hands
  - Left/Right hand status boxes
  - Movement detection ("MOVED!" in yellow when you move your hands)
- Press 'q' to quit

**If this works, MediaPipe is functioning correctly!**

## Step 2: Test Video Analyzer (Command Line)

You have two options for testing:

### Option A: Test with a Submitted Video from Supabase

If you have already submitted videos in your Speakeasy app:

1. Go to your Supabase dashboard
2. Navigate to Storage → speech-videos
3. Find a video and copy its public URL
4. Run:

```bash
python3 video_hand_analyzer.py "https://YOUR_SUPABASE_URL/storage/v1/object/public/speech-videos/..."
```

### Option B: Record a Quick Test Video

1. Record a short video (5-10 seconds) of yourself presenting with your hands visible
2. Save it as `test_video.webm` or `test_video.mp4` in this directory
3. Run:

```bash
python3 video_hand_analyzer.py test_video.webm
```

**Expected Output:**

```json
{
  "used_hands_effectively": true,
  "hands_detected": true,
  "movement_detected": true,
  "details": "Hands detected with movement",
  "frames_processed": 24
}
```

**Result Meanings:**
- `used_hands_effectively: true` = ✓ Used hands effectively
- `used_hands_effectively: false` = ✗ Did not use hands effectively

## Step 3: Start Local Flask Server

Start the HTTP server that the Edge Function will call:

```bash
python3 app.py
```

**Expected Output:**
```
============================================================
Hand Tracking Analysis Server
============================================================
Server running on http://localhost:8080
Health check: http://localhost:8080/
Analyze endpoint: POST http://localhost:8080/analyze
============================================================
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://0.0.0.0:8080
```

**Leave this terminal window open!** The server needs to stay running.

## Step 4: Test Flask Server (New Terminal)

Open a **NEW terminal window** and test the server:

### Test Health Check

```bash
curl http://localhost:8080/
```

**Expected Response:**
```json
{
  "service": "hand-tracking-analysis",
  "status": "ok",
  "version": "1.0.0"
}
```

### Test Video Analysis via HTTP

**With a Supabase video URL:**

```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://YOUR_VIDEO_URL.webm"}'
```

**With a local video file:**

```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_url": "test_video.webm"}'
```

**Expected Response:**
```json
{
  "used_hands_effectively": true,
  "hands_detected": true,
  "movement_detected": true,
  "details": "Hands detected with movement",
  "frames_processed": 24
}
```

## Step 5: Configure Edge Function to Use Local Server

Update your Supabase Edge Function to call your local Flask server:

### Option A: Set Environment Variable (Temporary)

In your terminal where you deploy Edge Functions:

```bash
# For local testing, use ngrok to expose localhost
# Install ngrok: brew install ngrok
ngrok http 8080
```

This will give you a public URL like: `https://abc123.ngrok.io`

Then set it in Supabase:

```bash
npx supabase secrets set HAND_TRACKING_SERVICE_URL=https://abc123.ngrok.io/analyze
```

### Option B: Direct Local Testing (Advanced)

Or, for quick local testing, temporarily hardcode the URL in the Edge Function:

**In `supabase/functions/hand-tracking-analysis/index.ts`**, change line ~27:

```typescript
// Original:
const serviceUrl = Deno.env.get('HAND_TRACKING_SERVICE_URL');

// For local testing:
const serviceUrl = 'http://localhost:8080/analyze'; // Or your ngrok URL
```

**⚠️ Remember to change this back before deploying!**

## Step 6: Deploy Edge Function

Deploy the hand-tracking-analysis function:

```bash
npx supabase functions deploy hand-tracking-analysis
```

## Step 7: Test Full Integration

Now test the complete flow:

1. **Make sure Flask server is running** (from Step 3)
2. **Submit a video** in your Speakeasy app as a student
3. **Wait for processing** (check queue processor logs)
4. **View feedback** - should see "✓ Used hands effectively" or "✗ Did not use hands effectively"

### Check Logs

Monitor the Flask server terminal - you should see:

```
Analyzing video: https://...
Downloading video to: /tmp/...
Processing video: 5.2s, 156 frames, 30.0 fps
Sampling every 15 frames (0.5s intervals)
Analysis complete: 10 frames processed
Hands detected: True, Movement: True
127.0.0.1 - - [DATE] "POST /analyze HTTP/1.1" 200 -
```

Monitor Supabase Edge Function logs:

```bash
npx supabase functions logs hand-tracking-analysis
```

Should see:
```
Analyzing video: https://...
Analysis result: { used_hands_effectively: true, ... }
Feedback: ✓ Used hands effectively
```

## Troubleshooting

### Error: "Could not open video file"

**Cause:** Video URL is not accessible or file doesn't exist

**Solution:**
- Verify the video URL is public
- Test the URL in your browser - it should download
- Check if local file exists: `ls -lh test_video.webm`

### Error: "No hands detected in video"

**Possible causes:**
- Hands are out of frame
- Video quality is poor
- Lighting is too dark
- Camera angle doesn't show hands

**Solution:**
- Test with tracker.py first to see if your camera setup works
- Record a test video with hands clearly visible and well-lit
- Try moving your hands more during recording

### Error: "Hands detected but no movement observed"

**Cause:** Hands are visible but too still (below 5% movement threshold)

**Solution:**
- Move your hands more during presentation
- Adjust `MOVEMENT_THRESHOLD` in `video_hand_analyzer.py`:
  ```python
  MOVEMENT_THRESHOLD = 0.03  # Lower = more sensitive (default: 0.05)
  ```

### Server won't start: "Address already in use"

**Cause:** Port 8080 is already in use

**Solution:**
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Or change port in app.py:
app.run(host='0.0.0.0', port=8081, debug=True)  # Use different port
```

### Edge Function times out

**Cause:** Video is too long or download is slow

**Solution:**
- Test with shorter videos (< 30 seconds)
- Check your internet connection
- Increase timeout in Edge Function (currently 60s)

## Next Steps

Once local testing works:

1. **Deploy to Cloud Run or Lambda** (see main README.md)
2. **Update HAND_TRACKING_SERVICE_URL** to production URL
3. **Remove any hardcoded localhost URLs** from code
4. **Test with real student submissions**
5. **Monitor logs for errors**

## Quick Reference

```bash
# Start Flask server
python3 app.py

# Test health check
curl http://localhost:8080/

# Test video analysis
python3 video_hand_analyzer.py VIDEO_URL_OR_PATH

# Check logs
npx supabase functions logs hand-tracking-analysis

# Deploy Edge Function
npx supabase functions deploy hand-tracking-analysis
```

## Success Checklist

- [ ] ✅ tracker.py shows hand detection with webcam
- [ ] ✅ video_hand_analyzer.py returns valid JSON
- [ ] ✅ Flask server starts without errors
- [ ] ✅ Health check returns {"status": "ok"}
- [ ] ✅ /analyze endpoint processes video and returns result
- [ ] ✅ Edge Function deployed successfully
- [ ] ✅ Student submission shows feedback in UI

Once all are checked, you're ready to deploy to production! 🚀
