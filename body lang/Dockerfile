# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgthread-2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
# Use opencv-python-headless for server environments (no GUI needed)
RUN pip install --no-cache-dir opencv-python-headless==4.12.0.88 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY video_hand_analyzer.py .
COPY hand_landmarker.task .

# Expose port (Cloud Run uses PORT environment variable, defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Run the Flask application
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 120 app:app
