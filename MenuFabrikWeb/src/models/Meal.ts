import type { Participant } from './Participant';
import type { Recipe } from './Recipe';
import type { SideDish } from './SideDish';

export const MealTime = {
    BREAKFAST: "Petit-déjeuner",
    LUNCH: "Midi",
    SNACK: "Collation",
    DINNER: "Soir",
    OTHER: "Autre"
} as const;
export type MealTime = typeof MealTime[keyof typeof MealTime];

export const MealStatus = {
    PLANNED: "Prévu",
    RESTAURANT: "Restaurant",
    ABSENT: "Absent",
    WORK: "Travail",
    LEFTOVERS: "Restes",
    SHOPPING: "Courses",
    SKIPPED: "Sauté"
} as const;
export type MealStatus = typeof MealStatus[keyof typeof MealStatus];

export interface Meal {
    id?: string;
    date: Date | string; // Firebase utilise des Timestamp, mais souvent on manipule des string ISO "2024-03-01T12:00:00Z"
    type: MealTime;
    status: MealStatus;

    // Pour différencier un repas contenant potentiellement une recette d'une simple note libre
    format?: 'standard' | 'note';
    noteText?: string;

    // Pour des questions de facilité avec Firestore en NoSQL, il est souvent préférable
    // d'embarquer (embed) une vue simplifiée de la recette ou juste son ID. 
    // Ici on garde l'objet pour l'algo, mais on met un ID en ref
    recipeId?: string;
    recipe?: Recipe;

    selectedSideDishIds: string[];
    selectedSideDishes?: SideDish[]; // Résolu via l'ID

    attendeeIds: string[];
    attendees?: Participant[]; // Résolu via l'ID

    // Ordre d'affichage dans la journée (pour permettre le déplacement manuel)
    order?: number;
}
