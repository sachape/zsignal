# V3D Clip Generator Worker — FFmpeg + yt-dlp video clipping service
# Deploy on Cloud Run / Fly.io / Render / Railway / Modal (any container host with HTTPS).

FROM node:20-bookworm-slim

# Install FFmpeg + yt-dlp (Twitch VOD section extraction).
# yt-dlp is shipped as a single Python file; we install it via pip and pin python3.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ffmpeg ca-certificates python3 python3-pip curl \
  && rm -rf /var/lib/apt/lists/* \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.mjs ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.mjs"]
