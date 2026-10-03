import cv2
import os

wp = os.path.join(os.path.expanduser('~'), '.gemini', 'antigravity', 'wallpapers')
left_p = os.path.join(wp, 'left_poster.jpg')
input_p = os.path.join(wp, 'input_poster.jpg')

if os.path.exists(left_p):
    img = cv2.imread(left_p)
    if img is not None:
        h, w = img.shape[:2]
        # resize to 1920x1080
        resized = cv2.resize(img, (1920, 1080), interpolation=cv2.INTER_AREA)
        cv2.imwrite(left_p, resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
        print(f"Optimized left_poster.jpg: {os.path.getsize(left_p)/1024:.1f} KB")

if os.path.exists(input_p):
    img = cv2.imread(input_p)
    if img is not None:
        resized = cv2.resize(img, (800, 450), interpolation=cv2.INTER_AREA)
        cv2.imwrite(input_p, resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
        print(f"Optimized input_poster.jpg: {os.path.getsize(input_p)/1024:.1f} KB")
