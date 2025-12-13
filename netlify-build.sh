#!/bin/bash

# Exit on error
set -e

echo "🔧 Setting up AWS credentials for Netlify..."

# Create .aws directory if it doesn't exist
mkdir -p ~/.aws

# Generate AWS credentials file
cat > ~/.aws/credentials <<EOL
[default]
aws_access_key_id = $ENV_ACCESS_KEY_ID
aws_secret_access_key = $ENV_SECRET_ACCESS_KEY
EOL

# Generate AWS config file
cat > ~/.aws/config <<EOL
[default]
region = $ENV_DEFAULT_REGION
EOL

echo "✅ AWS credentials configured"

# Now run the normal build
echo "📦 Building application..."
npm run build

echo "✅ Build complete!"
