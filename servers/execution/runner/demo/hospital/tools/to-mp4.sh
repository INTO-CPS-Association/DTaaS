#!/usr/bin/env bash
# Converts the two casts of a platform into one video, side by side:
# asciinema checks each cast and writes its plain-text transcript, agg
# renders each as a GIF, and ffmpeg joins the two with hstack and
# encodes H.264. Needs asciinema 3, agg and ffmpeg with libx264 on the
# PATH or in ~/.local/bin, on Linux or in WSL; see README.md.
#
#   bash tools/to-mp4.sh [windows|linux]   writes demo-<platform>.mp4
set -euo pipefail

cd "$(dirname "$0")/.."
PATH="$HOME/.local/bin:$PATH"
platform=${1:-windows}
mkdir -p run

for pane in manager network; do
  name=demo-$platform-$pane
  asciinema convert --overwrite "$name.cast" "run/$name.txt"
  # record.mjs already capped the gaps of both casts at 2 s on their
  # shared clock; an idle limit above any gap keeps agg from changing them
  agg --font-size 16 --theme asciinema --idle-time-limit 60 \
    "$name.cast" "run/$name.gif"
done
# yuv420p and even dimensions, so that every player can show the video;
# CRF 32 keeps the text sharp at a few MB
ffmpeg -y -loglevel error \
  -i "run/demo-$platform-manager.gif" -i "run/demo-$platform-network.gif" \
  -filter_complex '[0:v][1:v]hstack=inputs=2,scale=trunc(iw/2)*2:trunc(ih/2)*2' \
  -c:v libx264 -preset slow -crf 32 -pix_fmt yuv420p -movflags +faststart \
  "demo-$platform.mp4"
ls -l "demo-$platform.mp4"
