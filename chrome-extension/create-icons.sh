#!/bin/bash
# Create simple PNG icons using ImageMagick
# Icon with briefcase emoji effect

# Create 128x128 icon
convert -size 128x128 xc:none \
  -draw "roundrectangle 0,0,127,127,20,20" \
  -fill "gradient:rgb(102,126,234)-rgb(118,75,162)" \
  -draw "roundrectangle 0,0,127,127,20,20" \
  -gravity center \
  -pointsize 72 \
  -fill white \
  -font "DejaVu-Sans-Bold" \
  -annotate +0+0 "💼" \
  icon128.png 2>/dev/null || \
convert -size 128x128 xc:none \
  -fill "rgb(102,126,234)" \
  -draw "roundrectangle 0,0,127,127,20,20" \
  -gravity center \
  -fill white \
  -draw "roundrectangle 30,45,97,85,5,5" \
  -draw "rectangle 45,45,82,55" \
  icon128.png

# Resize to create other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png

echo "Icons created successfully!"
