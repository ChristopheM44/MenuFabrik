import { writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Firestore limite les `writeBatch` à 500 opérations par lot.
 * Ce helper découpe un tableau en tranches de `chunkSize` éléments
 * et exécute chaque tranche dans un batch séparé.
 *
 * Usage :
 *   await commitInChunks(items, (batch, item) => {
 *       const ref = doc(collectionRef, item.id);
 *       batch.set(ref, item);
 *   });
 *
 * @audit 2.8 — Correction du batch non limité en taille
 */
export const commitInChunks = async <T>(
    items: T[],
    operationFn: (batch: ReturnType<typeof writeBatch>, item: T, index: number) => void,
    chunkSize = 499
): Promise<void> => {
    if (items.length === 0) return;

    // Découpage en tranches
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((item, localIndex) => {
            operationFn(batch, item, i + localIndex);
        });

        await batch.commit();
    }
};
