/**
 * Taille maximale autorisée pour l'image Base64 stockée dans Firestore.
 * Firestore limite les documents à 1 Mo. Les recettes contiennent d'autres
 * champs (ingrédients, instructions...) donc on laisse ~250 Ko de marge.
 * 750 Ko en base64 ≈ ~560 Ko de données binaires.
 */
const MAX_IMAGE_BASE64_BYTES = 750_000;

export const ImageService = {
    /**
     * Compresses an image file in the browser using an HTML Canvas.
     * The image is resized to a maximum width/height of 500px,
     * converted to WebP with 0.7 quality to consume very little database space (usually 20-50KB).
     * Returns a Base64 valid DataURL string ready to be saved in Firestore.
     * @throws Error si l'image compressée dépasse la limite de sécurité Firestore.
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

                    // Calcul des nouvelles dimensions
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error("Impossible d'initialiser le contexte Canvas 2D."));
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // Conversion en WebP (compression qualité 0.7)
                    const base64String = canvas.toDataURL('image/webp', 0.7);

                    // ── Vérification de la taille (1.3) ─────────────────────────
                    // base64String.length ≈ nombre d'octets (chaque char = 1 octet en UTF-8 ascii)
                    if (base64String.length > MAX_IMAGE_BASE64_BYTES) {
                        return reject(
                            new Error(
                                `L'image compressée est trop volumineuse (${Math.round(base64String.length / 1024)} Ko). ` +
                                `Veuillez utiliser une photo plus petite ou moins complexe (limite : ${Math.round(MAX_IMAGE_BASE64_BYTES / 1024)} Ko).`
                            )
                        );
                    }

                    resolve(base64String);
                };

                img.onerror = (error) => reject(error);
            };

            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }
};
