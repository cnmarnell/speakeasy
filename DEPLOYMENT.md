# Deployment Guide

## Overview

This project consists of two main parts:
1. **Frontend (React + Vite)** - Deployed to Netlify
2. **Edge Functions (Supabase)** - Deployed to Supabase

## Supabase Edge Functions

### Required Environment Variables

Set these in your Supabase project dashboard (Settings → Edge Functions → Secrets):

#### For `bedrock-analysis` function:
```bash
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1  # or your preferred region
```

#### For `bedrock-agent` function (Nova Lite):
```bash
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
ELEVATOR_PITCH_SYSTEM_PROMPT=<your-system-prompt>
```

#### For `deepgram-proxy` function:
```bash
DEEPGRAM_API_KEY=<your-deepgram-api-key>
```

### Deploying Edge Functions

Using Supabase CLI:
```bash
# Deploy all functions
npx supabase functions deploy

# Deploy specific function
npx supabase functions deploy bedrock-analysis
```

## Netlify Frontend Deployment

### Netlify Configuration

The project includes `netlify.toml` with the following configuration:
- **Build command**: `./netlify-build.sh`
- **Publish directory**: `dist`
- **SPA routing**: Redirects all requests to `index.html`

### Environment Variables

Set these in Netlify dashboard (Site Settings → Environment Variables):

```bash
# Supabase
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Optional: If you need AWS credentials in the build process
# Use these alternative names to avoid Netlify's reserved variable restrictions
ENV_ACCESS_KEY_ID=<your-aws-access-key>
ENV_SECRET_ACCESS_KEY=<your-aws-secret-key>
ENV_DEFAULT_REGION=us-east-1
```

### About Netlify's AWS Variable Restrictions

Netlify **reserves** these environment variable names and won't let you set them:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION`
- `AWS_SESSION_TOKEN`

**Solution**: The `netlify-build.sh` script creates an AWS credentials file during build using alternative variable names (`ENV_ACCESS_KEY_ID`, etc.). This is only needed if your build process requires AWS credentials.

**Note**: Your Supabase Edge Functions don't need this workaround - they can use the standard AWS variable names directly in Supabase's environment settings.

## Deployment Steps

### 1. Deploy Edge Functions to Supabase

```bash
# Set environment variables in Supabase dashboard first
# Then deploy functions
npx supabase functions deploy
```

### 2. Deploy Frontend to Netlify

Option A - **Git-based deployment (Recommended)**:
1. Push your code to GitHub
2. Connect your repository in Netlify
3. Set environment variables in Netlify dashboard
4. Netlify will automatically build and deploy

Option B - **Manual deployment**:
```bash
# Build locally
npm run build

# Deploy using Netlify CLI
npx netlify deploy --prod
```

## Testing Your Deployment

### Test Edge Functions

```bash
# Test bedrock-analysis function
curl -X POST https://<your-project>.supabase.co/functions/v1/bedrock-analysis \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Test speech", "assignmentTitle": "Test"}'
```

### Test Frontend

Visit your Netlify URL and verify:
- App loads correctly
- Speech recording works
- Analysis returns results

## Troubleshooting

### Edge Function Errors

Check logs:
```bash
# View function logs
npx supabase functions logs bedrock-analysis
```

Common issues:
- **Missing credentials**: Verify AWS credentials are set in Supabase
- **Invalid credentials**: Check AWS IAM permissions for Bedrock
- **Region mismatch**: Ensure AWS_REGION matches where Bedrock is available

### Netlify Build Errors

- **AWS variable errors**: Use alternative names (ENV_ACCESS_KEY_ID)
- **Build script permissions**: Ensure `netlify-build.sh` is executable
- **Missing environment variables**: Check all VITE_ variables are set

## Security Notes

1. **Never commit secrets** to git
2. **Use Supabase RLS** to secure database access
3. **AWS credentials**: Use IAM user with minimal Bedrock-only permissions
4. **API keys**: Rotate regularly
