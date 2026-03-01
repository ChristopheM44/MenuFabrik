import type { Allergen } from './Allergen';

export interface Participant {
    id?: string; // Optional for new records before Firestore creation
    name: string;
    isActive: boolean;

    // Pour Firestore NoSQL relationnel (on stocke juste les UUIDs)
    allergyIds: string[];

    // Pour la manipulation en front (hydraté manuellement par le Store)
    allergies?: Allergen[];

    photoUrl?: string; // Replaced Data with a URL to Firebase Storage image
}
