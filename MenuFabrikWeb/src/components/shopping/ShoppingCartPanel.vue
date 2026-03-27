<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useShoppingStore } from '../../stores/shoppingStore';
import type { ShoppingItem } from '../../models/ShoppingItem';
import { useNotify } from '../../composables/useNotify';
import { useAppConfirm } from '../../composables/useAppConfirm';

const emit = defineEmits(['importMeals', 'sendToDrive']);
const shoppingStore = useShoppingStore();
const { notifySuccess, notifyError } = useNotify();
const { confirm } = useAppConfirm();

const newShoppingItemName = ref('');
const copySuccess = ref(false);

const sortedItems = computed(() =>
    [...shoppingStore.shoppingItems].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
);

const uncheckedItems = computed(() => sortedItems.value.filter(i => !i.checked));
const checkedItems = computed(() => sortedItems.value.filter(i => i.checked));

const displayLimit = ref(50);
const visibleUnchecked = computed(() => uncheckedItems.value.slice(0, displayLimit.value));

const observerTarget = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
    observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && displayLimit.value < uncheckedItems.value.length) {
            displayLimit.value += 50;
        }
    }, { rootMargin: '200px' });
    if (observerTarget.value) observer.observe(observerTarget.value);
});

onUnmounted(() => {
    if (observer) observer.disconnect();
});

const addManualShoppingItem = async () => {
    const name = newShoppingItemName.value.trim();
    if (!name) return;
    try {
        await shoppingStore.addShoppingItem({
            name,
            checked: false,
            source: 'manual',
            addedAt: new Date().toISOString()
        });
        newShoppingItemName.value = '';
    } catch (e: any) {
        notifyError('Erreur', e.message);
    }
};

const deleteCheckedShoppingItems = async () => {
    confirm({
        title: 'Supprimer les articles cochés',
        message: "Voulez-vous vraiment supprimer tous les articles cochés de votre panier ?",
        acceptLabel: 'Oui, supprimer',
        rejectLabel: 'Non',
        onAccept: async () => {
            try {
                await shoppingStore.clearCheckedItems();
                notifySuccess('Nettoyage terminé', 'Les articles terminés ont été supprimés.');
            } catch (e: any) {
                notifyError('Erreur', e.message);
            }
        }
    });
};

const resetShoppingList = async () => {
    confirm({
        title: 'Réinitialiser la liste',
        message: "Voulez-vous vraiment réinitialiser toute votre liste de courses ?",
        acceptLabel: 'Oui, réinitialiser',
        rejectLabel: 'Non',
        onAccept: async () => {
            try {
                await shoppingStore.clearAllItems();
                notifySuccess('Liste réinitialisée', 'Votre panier a été complètement vidé.');
            } catch (e: any) {
                notifyError('Erreur', e.message);
            }
        }
    });
};

const toggleShoppingCheck = (item: ShoppingItem) => {
    if (item.id) {
        shoppingStore.updateShoppingItem(item.id, { checked: item.checked });
    }
};

const updateShoppingQuantity = (item: ShoppingItem, newQty: number) => {
    if (!item.id || newQty < 1 || newQty > 99) return;
    item.customQuantity = newQty;
    shoppingStore.updateShoppingItem(item.id, { customQuantity: newQty });
};

const copyToClipboard = async () => {
    const itemsToCopy = shoppingStore.shoppingItems.filter(i => !i.checked);

    let plainText = `🛒 Liste de courses\n\n`;
    let htmlText = `<h2>🛒 Liste de courses</h2><ul>`;

    if (itemsToCopy.length === 0) {
        const emptyMsg = "(Tous les articles ont été cochés !)";
        plainText += emptyMsg;
        htmlText += `<li><em>${emptyMsg}</em></li>`;
    } else {
        itemsToCopy.forEach(item => {
            const itemLine = `${item.name}${item.details ? ` : ${item.details}` : ''}`;
            plainText += `- ${itemLine}\n`;
            htmlText += `<li>${itemLine}</li>`;
        });
    }
    htmlText += '</ul>';

    try {
        const blobText = new Blob([plainText], { type: 'text/plain' });
        const blobHtml = new Blob([htmlText], { type: 'text/html' });
        await navigator.clipboard.write([
            new ClipboardItem({ 'text/plain': blobText, 'text/html': blobHtml })
        ]);
        copySuccess.value = true;
        setTimeout(() => { copySuccess.value = false; }, 3000);
    } catch {
        try {
            await navigator.clipboard.writeText(plainText);
            copySuccess.value = true;
            setTimeout(() => { copySuccess.value = false; }, 3000);
        } catch (err2) {
            console.error('Clipboard fallback failed:', err2);
        }
    }
};

const sourceIcon = (source: ShoppingItem['source']) => {
    if (source === 'recipe') return 'stars';
    if (source === 'pantry') return 'inventory_2';
    return 'edit_note';
};
</script>

<template>
    <div class="flex flex-col gap-8">

        <!-- Grille d'actions -->
        <div class="grid grid-cols-2 gap-3">
            <!-- Importer depuis les menus — pleine largeur -->
            <button
                @click="$emit('importMeals')"
                class="col-span-2 flex items-center justify-center gap-2 bg-primary text-on-primary py-4 rounded-full font-bold font-headline shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
                <span class="material-symbols-outlined text-sm">auto_awesome</span>
                D'après mes Menus
            </button>

            <!-- Copier -->
            <button
                @click="copyToClipboard"
                :disabled="shoppingStore.shoppingItems.length === 0"
                class="flex items-center justify-center gap-2 bg-surface-container-lowest border border-outline-variant/30 py-3 rounded-2xl font-semibold text-sm text-on-surface-variant disabled:opacity-40 transition-opacity">
                <span class="material-symbols-outlined text-sm">{{ copySuccess ? 'check' : 'content_copy' }}</span>
                {{ copySuccess ? 'Copié !' : 'Copier liste' }}
            </button>

            <!-- Réinitialiser -->
            <button
                @click="resetShoppingList"
                :disabled="shoppingStore.shoppingItems.length === 0"
                class="flex items-center justify-center gap-2 bg-surface-container-lowest border border-outline-variant/30 py-3 rounded-2xl font-semibold text-sm text-on-surface-variant disabled:opacity-40 transition-opacity">
                <span class="material-symbols-outlined text-sm">refresh</span>
                Réinitialiser
            </button>

            <!-- Drive — pleine largeur -->
            <button
                @click="$emit('sendToDrive')"
                :disabled="shoppingStore.shoppingItems.length === 0"
                class="col-span-2 flex items-center justify-center gap-2 bg-[#E1F1FF] text-[#004A77] py-3 rounded-2xl font-bold disabled:opacity-40 transition-opacity">
                <span class="material-symbols-outlined">shopping_cart</span>
                Passer au Drive
            </button>
        </div>

        <!-- Input d'ajout -->
        <div class="relative">
            <input
                v-model="newShoppingItemName"
                @keyup.enter="addManualShoppingItem"
                class="w-full bg-surface-container-high rounded-2xl py-4 pl-5 pr-14 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 transition-all border-none outline-none"
                placeholder="Ajouter un article, un extra..." />
            <button
                @click="addManualShoppingItem"
                :disabled="!newShoppingItemName.trim()"
                class="absolute right-2 top-2 w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-md disabled:opacity-40 transition-opacity">
                <span class="material-symbols-outlined">add</span>
            </button>
        </div>

        <!-- État vide -->
        <div v-if="shoppingStore.shoppingItems.length === 0"
            class="text-center py-16 flex flex-col items-center gap-3">
            <span class="material-symbols-outlined text-5xl text-on-surface-variant/30">shopping_cart</span>
            <h3 class="font-headline font-semibold text-lg text-on-surface">Votre panier est vide</h3>
            <p class="text-on-surface-variant text-sm">Importez vos ingrédients de la semaine ou ajoutez des articles manuellement.</p>
        </div>

        <!-- Liste -->
        <div v-else class="flex flex-col gap-4">

            <!-- Header -->
            <div class="flex items-center justify-between">
                <h3 class="font-headline font-bold text-on-surface flex items-center gap-2">
                    Articles restants
                    <span class="text-on-surface-variant font-medium">({{ uncheckedItems.length }})</span>
                </h3>
                <button v-if="checkedItems.length > 0"
                    @click="deleteCheckedShoppingItems"
                    class="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">delete_sweep</span>
                    Vider cochés
                </button>
            </div>

            <!-- Items non cochés -->
            <TransitionGroup name="list" tag="div" class="flex flex-col gap-4">
                <div v-for="item in visibleUnchecked" :key="item.id"
                    class="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-3xl shadow-sm border border-outline-variant/5 cursor-pointer"
                    @click="item.checked = !item.checked; toggleShoppingCheck(item)">

                    <!-- Checkbox custom vide -->
                    <div class="w-6 h-6 rounded-lg border-2 border-primary/30 shrink-0"></div>

                    <!-- Contenu -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span
                                class="material-symbols-outlined text-sm shrink-0"
                                :class="{
                                    'text-primary': item.source === 'recipe',
                                    'text-amber-600': item.source === 'pantry',
                                    'text-on-surface-variant': item.source === 'manual' || !item.source
                                }"
                                :style="item.source === 'recipe' ? 'font-variation-settings: \'FILL\' 1' : ''">
                                {{ sourceIcon(item.source) }}
                            </span>
                            <span class="font-bold text-on-surface truncate">{{ item.name }}</span>
                        </div>

                        <!-- Badges recettes -->
                        <div v-if="item.recipeNames?.length" class="flex flex-wrap gap-1">
                            <span v-for="recipe in item.recipeNames" :key="recipe"
                                class="px-2 py-0.5 bg-secondary-container/50 text-on-secondary-container text-[10px] font-bold rounded uppercase tracking-tighter">
                                {{ recipe.length > 18 ? recipe.substring(0, 18) + '…' : recipe }}
                            </span>
                        </div>

                        <!-- Label pantry -->
                        <span v-else-if="item.source === 'pantry'"
                            class="text-[10px] text-on-surface-variant font-medium">
                            Récurrent / Placard
                        </span>

                        <!-- Détails -->
                        <span v-else-if="item.details"
                            class="text-[10px] text-on-surface-variant font-medium">
                            {{ item.details }}
                        </span>
                    </div>

                    <!-- Quantité +/- pill -->
                    <div @click.stop
                        class="flex items-center bg-surface-container-low rounded-full px-2 py-1 gap-2 shrink-0">
                        <button
                            @click="updateShoppingQuantity(item, (item.customQuantity ?? 1) - 1)"
                            :disabled="(item.customQuantity ?? 1) <= 1"
                            class="w-6 h-6 flex items-center justify-center text-primary disabled:opacity-30 transition-opacity">
                            <span class="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span class="text-sm font-bold w-5 text-center">{{ item.customQuantity ?? 1 }}</span>
                        <button
                            @click="updateShoppingQuantity(item, (item.customQuantity ?? 1) + 1)"
                            class="w-6 h-6 flex items-center justify-center text-primary">
                            <span class="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                </div>
            </TransitionGroup>

            <div ref="observerTarget" class="h-4 w-full"></div>

            <!-- Séparateur + items cochés -->
            <template v-if="checkedItems.length > 0">
                <div class="py-2 border-t border-dashed border-outline-variant/30 flex justify-center">
                    <span class="px-4 py-1 bg-surface-container text-[10px] font-bold text-on-surface-variant/60 rounded-full uppercase tracking-widest">
                        Articles achetés
                    </span>
                </div>

                <TransitionGroup name="list" tag="div" class="flex flex-col gap-4">
                    <div v-for="item in checkedItems" :key="item.id"
                        class="flex items-center gap-4 bg-surface-container-low/50 p-4 rounded-3xl opacity-50 cursor-pointer"
                        @click="item.checked = !item.checked; toggleShoppingCheck(item)">

                        <!-- Checkbox cochée -->
                        <div class="w-6 h-6 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-on-primary text-xs">check</span>
                        </div>

                        <span class="font-bold text-on-surface line-through flex-1 truncate">{{ item.name }}</span>

                        <div class="flex items-center bg-surface-container-low rounded-full px-3 py-1 shrink-0">
                            <span class="text-xs font-bold">{{ item.customQuantity ?? 1 }}</span>
                        </div>
                    </div>
                </TransitionGroup>
            </template>
        </div>
    </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
    transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(20px);
}
</style>
