"""
Flask server for hand tracking analysis
Provides HTTP endpoint for the Supabase Edge Function to call
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from video_hand_analyzer import analyze_video_hands, download_video
import tempfile
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "hand-tracking-analysis",
        "version": "1.0.0"
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze video for hand tracking

    Request body:
    {
        "video_url": "https://..."
    }

    Response:
    {
        "used_hands_effectively": true/false,
        "hands_detected": true/false,
        "movement_detected": true/false,
        "details": "...",
        "frames_processed": 123
    }
    """
    try:
        data = request.json

        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        video_url = data.get('video_url')

        if not video_url:
            return jsonify({"error": "video_url is required"}), 400

        print(f"Analyzing video: {video_url}")

        # Check if it's a URL or local file
        is_url = video_url.startswith(('http://', 'https://'))

        if is_url:
            # Download video to temp file
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
                temp_path = temp_file.name

            print(f"Downloading video to: {temp_path}")
            if not download_video(video_url, temp_path):
                return jsonify({"error": "Failed to download video"}), 500

            video_path = temp_path
        else:
            video_path = video_url

        # Analyze video
        result = analyze_video_hands(video_path)

        print(f"Analysis complete: {result}")

        # Clean up temp file
        if is_url and os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify(result), 200

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

        return jsonify({
            "error": str(e),
            "used_hands_effectively": False,
            "hands_detected": False,
            "movement_detected": False,
            "details": f"Error: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8081))  # Use port 8081 by default, or PORT env var

    print("=" * 60)
    print("Hand Tracking Analysis Server")
    print("=" * 60)
    print(f"Server running on http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/")
    print(f"Analyze endpoint: POST http://localhost:{port}/analyze")
    print("=" * 60)

    app.run(host='0.0.0.0', port=port, debug=True)
