import { storage } from '../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export const StorageService = {
    /**
     * Upload an image to Firebase Storage and returns its public URL
     */
    async uploadRecipeImage(file: File, recipeId: string, onProgress?: (progress: number) => void): Promise<string> {
        // Construct the path: recipes/[recipeId]/[fileName]
        // This keeps images organized by recipe. For new recipes, we can use a timestamp folder or a generic 'new' folder 
        // until the recipe is saved, but it's simpler to use a UUID or the current time as a unique ID for the image.
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `recipes/${recipeId}/${uniqueFileName}`;
        
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    } catch (err) {
                        reject(err);
                    }
                }
            );
        });
    },

    /**
     * Extracts the storage path from a Firebase Storage download URL and deletes the object
     */
    async deleteRecipeImage(fileUrl: string): Promise<void> {
        if (!fileUrl || !fileUrl.includes('firebasestorage.googleapis.com')) {
            return; // Not a Firebase Storage file
        }
        
        try {
            // Create a reference from the URL
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef);
        } catch (error) {
            console.error("Error deleting image from storage:", error);
            throw error;
        }
    }
};
