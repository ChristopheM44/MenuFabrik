export const ImageService = {
    /**
     * Compresses an image file in the browser using an HTML Canvas.
     * The image is resized to a maximum width/height of 500px, 
     * converted to WebP with 0.7 quality to consume very little database space (usually 20-50KB).
     * Returns a Base64 valid DataURL string ready to be saved in Firestore.
     */
    async compressImageToBase64(file: File, maxWidth = 500): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error("Cannot get Canvas 2D context"));
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to WebP format for great compression (0.7 quality)
                    const base64String = canvas.toDataURL('image/webp', 0.7);
                    resolve(base64String);
                };

                img.onerror = (error) => reject(error);
            };

            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }
};
