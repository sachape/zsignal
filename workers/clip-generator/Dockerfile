# Streamnco — Clip Generator Worker (FFmpeg + yt-dlp + OpenCV)
# Auto facecam detection runs in Python via OpenCV (Haar cascades).
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ffmpeg ca-certificates python3 python3-pip python3-numpy curl \
       libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/* \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp \
  && pip3 install --no-cache-dir --break-system-packages opencv-python-headless==4.10.0.84

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.mjs detect_facecam.py ./
RUN chmod +x detect_facecam.py

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.mjs"]
