#!/usr/bin/env bash
# Build the final video: synthesise audio, render frames, mux.
set -euo pipefail
cd "$(dirname "$0")"
# register the bundled Jua font (OFL) with fontconfig so cairo can find it
mkdir -p ~/.fonts && cp -n fonts/Jua-Regular.ttf ~/.fonts/ && fc-cache -f >/dev/null
OUT=${1:-cookie_visit.mp4}
TMP=$(mktemp -d)
python3 audio.py "$TMP/audio.wav"
python3 render.py "$TMP/video.mp4"
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -y -loglevel error -i "$TMP/video.mp4" -i "$TMP/audio.wav" -c:v copy -c:a aac -b:a 256k \
      -movflags +faststart -shortest "$OUT"
rm -rf "$TMP"
echo "wrote $OUT"
