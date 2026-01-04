# Google Cloud Run Deployment Guide

This guide will help you deploy your hand tracking service to Google Cloud Run so it runs 24/7 without needing your local server.

## Prerequisites

- Google Cloud account (free tier available)
- Google Cloud SDK installed
- Docker Desktop installed (optional, Cloud Build will build for you)

## Step 1: Install Google Cloud SDK

If you don't have it installed:

```bash
brew install google-cloud-sdk
```

Verify installation:
```bash
gcloud --version
```

## Step 2: Set Up Google Cloud Project

### 2.1 Authenticate with Google Cloud

```bash
gcloud auth login
```

This will open a browser window for you to sign in with your Google account.

### 2.2 Create a New Project (or use existing)

**Create new project:**
```bash
# Replace 'speakeasy-hand-tracking' with your preferred project ID
gcloud projects create speakeasy-hand-tracking --name="Speakeasy Hand Tracking"
```

**Or list existing projects:**
```bash
gcloud projects list
```

### 2.3 Set the Active Project

```bash
# Replace with your project ID
gcloud config set project speakeasy-hand-tracking
```

### 2.4 Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

This may take a minute or two.

## Step 3: Deploy to Cloud Run

Navigate to the "body lang" directory:

```bash
cd "/Users/colli/desktop/speakeasy/MVP 2/speakeasy/body lang"
```

### 3.1 Build and Deploy in One Command

```bash
gcloud run deploy hand-tracker \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --timeout 120 \
  --max-instances 10
```

**What this does:**
- `--source .` - Builds from current directory (uses Dockerfile)
- `--platform managed` - Uses fully managed Cloud Run
- `--region us-central1` - Deploys to us-central1 (change if needed)
- `--allow-unauthenticated` - Makes it publicly accessible
- `--memory 2Gi` - Allocates 2GB RAM (needed for MediaPipe)
- `--timeout 120` - Sets 120-second timeout for video processing
- `--max-instances 10` - Limits concurrent instances (free tier)

**Build time:** First deployment takes ~5-10 minutes (building Docker image with OpenCV and MediaPipe).

### 3.2 Note the Service URL

After deployment completes, you'll see output like:

```
Service [hand-tracker] revision [hand-tracker-00001-abc] has been deployed and is serving 100 percent of traffic.
Service URL: https://hand-tracker-xxxxx-uc.a.run.app
```

**Copy this URL!** You'll need it for the next step.

## Step 4: Update Supabase Environment Variable

### 4.1 Set the Hand Tracking Service URL

```bash
# Replace with your actual Cloud Run URL
npx supabase secrets set HAND_TRACKING_SERVICE_URL=https://hand-tracker-xxxxx-uc.a.run.app/analyze
```

**Important:** Add `/analyze` at the end of the URL!

### 4.2 Redeploy the Edge Function

```bash
npx supabase functions deploy hand-tracking-analysis
```

## Step 5: Test the Deployment

### 5.1 Test the Cloud Run Service Directly

```bash
# Health check
curl https://hand-tracker-xxxxx-uc.a.run.app/

# Should return: {"status":"ok","service":"hand-tracking-analysis","version":"1.0.0"}
```

### 5.2 Test with a Video

```bash
curl -X POST https://hand-tracker-xxxxx-uc.a.run.app/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_url": "YOUR_SUPABASE_VIDEO_URL"}'
```

Should return hand tracking analysis.

### 5.3 Test Full Integration

1. **Submit a new video** in your Speakeasy app (without using hands)
2. **Wait for processing** to complete
3. **Check feedback** - Should show "✗ Did not use hands effectively"

### 5.4 Check Logs

View Cloud Run logs:
```bash
gcloud run logs read hand-tracker --region us-central1 --limit 50
```

Or view in Cloud Console:
https://console.cloud.google.com/run/detail/us-central1/hand-tracker/logs

## Costs & Free Tier

### Free Tier Includes:
- **2 million requests/month**
- **360,000 GB-seconds of memory**
- **180,000 vCPU-seconds**

### Your Expected Usage:
- ~10-20 videos/day = ~300-600 videos/month
- Well within free tier limits
- **Cost: $0/month** ✅

### If You Exceed Free Tier:
- Requests: $0.40 per million
- Memory: $0.0000025 per GB-second
- vCPU: $0.00001 per vCPU-second

Even with 10x usage, cost would be < $5/month.

## Maintenance

### Update the Service

After making changes to the code:

```bash
cd "/Users/colli/desktop/speakeasy/MVP 2/speakeasy/body lang"
gcloud run deploy hand-tracker --source .
```

### View Logs

```bash
gcloud run logs read hand-tracker --region us-central1 --limit 50
```

### Check Service Status

```bash
gcloud run services describe hand-tracker --region us-central1
```

### Delete the Service

If you want to remove it:

```bash
gcloud run services delete hand-tracker --region us-central1
```

## Troubleshooting

### Build Fails

**Issue:** "Error building image"

**Solution:** Check Dockerfile syntax, ensure all files exist

### Deployment Timeout

**Issue:** Build takes too long

**Solution:** First build is slow (10 min). Subsequent builds are faster (~2 min)

### Service Returns 500 Error

**Issue:** Video processing fails

**Solution:**
- Check Cloud Run logs: `gcloud run logs read hand-tracker`
- Verify video URL is accessible
- Check memory allocation (needs 2Gi for MediaPipe)

### "Permission Denied" Errors

**Issue:** Can't deploy

**Solution:**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Next Steps

1. ✅ Deploy to Cloud Run (you just did this!)
2. ✅ Set Supabase environment variable
3. ✅ Test with real video submissions
4. 🎉 Your hand tracking now works 24/7 without local server!

## Monitoring

View your Cloud Run dashboard:
https://console.cloud.google.com/run

Here you can see:
- Request count
- Latency
- Errors
- Logs
- Resource usage

---

**Congratulations!** Your hand tracking service is now deployed and running 24/7 on Google Cloud Run! 🚀
