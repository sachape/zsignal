# V3D Clip Generator Worker — FFmpeg-based video clipping service
# Deploy on Cloud Run / Fly.io / Render / Railway / Modal (any container host with HTTPS).

FROM node:20-bookworm-slim

# Install FFmpeg (Debian package).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.mjs ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.mjs"]
