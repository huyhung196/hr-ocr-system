FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and PaddleOCR
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch GPU first
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu118

COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI
RUN pip install --no-cache-dir nvidia-cudnn-cu11==8.9.2.26 --target=/opt/cudnn8
ENV LD_LIBRARY_PATH="/opt/cudnn8/nvidia/cudnn/lib:/usr/local/lib/python3.10/site-packages/nvidia/cublas/lib:$LD_LIBRARY_PATH"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
