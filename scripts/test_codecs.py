import cv2
import os

test_codecs = ['avc1', 'H264', 'h264', 'X264', 'x264', 'AVC1']
for c in test_codecs:
    out = f"test_{c}.mp4"
    fourcc = cv2.VideoWriter_fourcc(*c)
    w = cv2.VideoWriter(out, fourcc, 30.0, (640, 360))
    opened = w.isOpened()
    print(f"Codec {c}: isOpened = {opened}")
    if opened:
        # write 1 frame
        import numpy as np
        img = np.zeros((360, 640, 3), dtype=np.uint8)
        w.write(img)
    w.release()
    if os.path.exists(out):
        print(f"  file size: {os.path.getsize(out)} bytes")
        os.remove(out)
