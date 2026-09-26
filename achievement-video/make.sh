#!/usr/bin/env bash
# Build the final video: render frames, synthesise audio, mux.
set -euo pipefail
cd "$(dirname "$0")"
OUT=${1:-you_made_dinner.mp4}
TMP=$(mktemp -d)
python3 audio.py "$TMP/audio.wav"
python3 render.py "$TMP/video.mp4"
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -y -loglevel error -i "$TMP/video.mp4" -i "$TMP/audio.wav" -c:v copy -c:a aac -b:a 256k \
      -movflags +faststart -shortest "$OUT"
rm -rf "$TMP"
echo "wrote $OUT"
