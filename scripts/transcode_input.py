import cv2
import os
import sys

wallpapers_dir = os.path.join(os.path.expanduser('~'), '.gemini', 'antigravity', 'wallpapers')
input_mp4 = os.path.join(wallpapers_dir, 'input_wallpaper.mp4')
output_mp4 = os.path.join(wallpapers_dir, 'input_wallpaper_720p.mp4')

print(f"Reading: {input_mp4}")
cap = cv2.VideoCapture(input_mp4)
if not cap.isOpened():
    print("Failed to open input video")
    sys.exit(1)

width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"Original: {width}x{height} @ {fps:.1f} fps, {total_frames} frames")

target_w = 1280
target_h = int(height * (1280 / width))
# Ensure even dimensions
if target_h % 2 != 0:
    target_h += 1

target_fps = 30.0
step = int(round(fps / target_fps))
if step < 1:
    step = 1

print(f"Target: {target_w}x{target_h} @ {target_fps:.1f} fps (step={step})")

# Try codecs: mp4v, avc1, H264
codecs = ['mp4v', 'avc1', 'H264']
writer = None
chosen_codec = None

for c in codecs:
    fourcc = cv2.VideoWriter_fourcc(*c)
    w = cv2.VideoWriter(output_mp4, fourcc, target_fps, (target_w, target_h))
    if w.isOpened():
        writer = w
        chosen_codec = c
        print(f"Using codec: {c}")
        break
    else:
        w.release()

if not writer:
    print("Could not initialize VideoWriter with any codec")
    sys.exit(1)

frame_idx = 0
written_count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break
    if frame_idx % step == 0:
        resized = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        writer.write(resized)
        written_count += 1
    frame_idx += 1

cap.release()
writer.release()
print(f"Transcoded {written_count} frames to {output_mp4}")
print(f"Output file size: {os.path.getsize(output_mp4) / 1024 / 1024:.2f} MB")
