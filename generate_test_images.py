#!/usr/bin/env python3

import base64
from PIL import Image, ImageDraw, ImageFont
import io

def create_large_png(text, width=2000, height=1500):
    """Create a large PNG image with text overlay."""
    # Create a new image with a gradient background
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)

    # Add some color variation to make it look more like a photo
    for x in range(width):
        for y in range(height):
            if (x + y) % 100 < 50:
                img.putpixel((x, y), (240, 240, 250))

    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 60)
    except:
        font = ImageFont.load_default()

    # Add text in the center
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) // 2
    y = (height - text_height) // 2

    draw.text((x, y), text, fill='black', font=font)

    # Add some noise to make it more photo-like
    import random
    for _ in range(10000):
        x = random.randint(0, width-1)
        y = random.randint(0, height-1)
        r, g, b = img.getpixel((x, y))
        noise = random.randint(-10, 10)
        r = max(0, min(255, r + noise))
        g = max(0, min(255, g + noise))
        b = max(0, min(255, b + noise))
        img.putpixel((x, y), (r, g, b))

    return img

def png_to_base64(img):
    """Convert PIL Image to base64 encoded PNG string."""
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_bytes = buffer.getvalue()
    return base64.b64encode(img_bytes).decode('utf-8')

def main():
    # Create three different images
    images = {
        'frontPhoto': create_large_png('PASSPORT FRONT\nSAMPLE DOCUMENT\nFOR KYC TESTING'),
        'backendPhoto': create_large_png('PASSPORT BACK\nSAMPLE DOCUMENT\nFOR KYC TESTING'),
        'facePhoto': create_large_png('FACE PHOTO\nSAMPLE IMAGE\nFOR KYC TESTING')
    }

    # Convert to base64 and print
    for name, img in images.items():
        b64 = png_to_base64(img)
        print(f"{name}: {b64}")
        print(f"Size: {len(b64)} characters")
        print()

if __name__ == '__main__':
    main()