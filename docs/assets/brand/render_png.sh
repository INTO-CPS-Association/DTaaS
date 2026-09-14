#!/bin/bash
# Rasterise each brand SVG at the sizes a consumer actually asks for.
#
# Chrome headless instead of a converter, because it is already on this
# machine, it resolves the same font stack a browser would, and a wordmark
# rendered any other way would not match what the site shows.
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BRAND="$1"
WORK="$2"
mkdir -p "$BRAND/png" "$WORK"

render() {
  local svg="$1" out="$2" w="$3" h="$4"
  # A page the exact size of the image, no margin, transparent behind it.
  cat > "$WORK/page.html" <<HTML
<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent}
  img{display:block;width:${w}px;height:${h}px}
</style>
<img src="file://$svg">
HTML
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 \
    --force-device-scale-factor=1 \
    --window-size="$w,$h" \
    --screenshot="$out" "$WORK/page.html" >/dev/null 2>&1
}

# The mark is square. These are the sizes a favicon, a README badge, a slide
# and a print asset ask for.
for variant in dtaas-mark dtaas-mark-white dtaas-mark-mono; do
  for size in 16 32 48 64 128 256 512; do
    render "$BRAND/$variant.svg" "$BRAND/png/$variant-${size}.png" "$size" "$size"
    echo "  $variant-${size}.png"
  done
done

# The lockups keep their aspect ratio: 96x24 for the short wordmark and
# 232x24 for the long one.
for variant in dtaas-logo dtaas-logo-white dtaas-logo-mono; do
  for h in 24 48 96 192; do
    render "$BRAND/$variant.svg" "$BRAND/png/$variant-${h}h.png" "$((h * 4))" "$h"
    echo "  $variant-${h}h.png"
  done
done

for variant in dtaas-logo-full dtaas-logo-full-white dtaas-logo-mono-full; do
  for h in 24 48 96 192; do
    render "$BRAND/$variant.svg" "$BRAND/png/$variant-${h}h.png" "$(( (h * 232) / 24 ))" "$h"
    echo "  $variant-${h}h.png"
  done
done
