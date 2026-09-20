import cv2
import os

wp = os.path.join(os.path.expanduser('~'), '.gemini', 'antigravity', 'wallpapers')
input_mp4 = os.path.join(wp, 'input_wallpaper.mp4')
input_poster_jpg = os.path.join(wp, 'input_poster.jpg')
input_wallpaper_jpg = os.path.join(wp, 'input_wallpaper.jpg')

cap = cv2.VideoCapture(input_mp4)
ret, frame = cap.read()
if not ret:
    print("Failed to read input_wallpaper.mp4")
    exit(1)

# Frame dimensions
h, w = frame.shape[:2]
print(f"Original frame size: {w}x{h}")

# Resize to 1280x720 with high quality
resized = cv2.resize(frame, (1280, 720), interpolation=cv2.INTER_AREA)

# Save as input_poster.jpg and input_wallpaper.jpg
cv2.imwrite(input_poster_jpg, resized, [cv2.IMWRITE_JPEG_QUALITY, 88])
cv2.imwrite(input_wallpaper_jpg, resized, [cv2.IMWRITE_JPEG_QUALITY, 88])

cap.release()

print(f"Successfully saved true input poster: {input_poster_jpg} ({os.path.getsize(input_poster_jpg)/1024:.1f} KB)")
print(f"Successfully saved input wallpaper: {input_wallpaper_jpg} ({os.path.getsize(input_wallpaper_jpg)/1024:.1f} KB)")
