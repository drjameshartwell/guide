import os
from PIL import Image
import glob

# Set your folders/files
IMAGE_FOLDER = 'homage/' # Change to your actual folder name
HTML_FILE = 'index.html'

def optimize_and_prompt():
    # 1. Grab all png and jpg files
    search_patterns = [os.path.join(IMAGE_FOLDER, '*.png'), os.path.join(IMAGE_FOLDER, '*.jpg'), os.path.join(IMAGE_FOLDER, '*.jpeg')]
    image_files = []
    for pattern in search_patterns:
        image_files.extend(glob.glob(pattern))
    
    if not image_files:
        print("No PNG or JPG images found to convert.")
        return

    # 2. Convert images to WebP
    print(f"Found {len(image_files)} images. Starting conversion...")
    for file_path in image_files:
        filename = os.path.basename(file_path)
        name, _ = os.path.splitext(filename)
        new_path = os.path.join(IMAGE_FOLDER, f"{name}.webp")
        
        # Open and save as WebP
        with Image.open(file_path) as img:
            # Convert to RGB if it's a PNG with transparency issues saving as JPEG/WebP
            if img.mode in ("RGBA", "P"): 
                img = img.convert("RGBA")
            img.save(new_path, 'webp', quality=85)
            
        print(f"Converted: {filename} -> {name}.webp")
        os.remove(file_path) # Deletes the old file

    # 3. Prompt before touching the HTML
    choice = input(f"\nImages converted! Do you want to automatically update {HTML_FILE} to use the new .webp extensions? (y/n): ").strip().lower()
    
    if choice == 'y':
        try:
            with open(HTML_FILE, 'r', encoding='utf-8') as file:
                html_content = file.read()
                
            updated_html = html_content.replace('.png"', '.webp"').replace('.jpg"', '.webp"').replace('.jpeg"', '.webp"')
            
            with open(HTML_FILE, 'w', encoding='utf-8') as file:
                file.write(updated_html)
                
            print("HTML file updated successfully!")
        except FileNotFoundError:
            print(f"Warning: Could not find {HTML_FILE}.")
    else:
        print("Skipped HTML update. Your code remains untouched.")

if __name__ == "__main__":
    optimize_and_prompt()