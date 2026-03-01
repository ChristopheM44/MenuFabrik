import { createRouter, createWebHistory } from 'vue-router'
import MealsView from '../views/MealsView.vue'
import RecipesView from '../views/RecipesView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/meals'
        },
        {
            path: '/meals',
            name: 'meals',
            component: MealsView,
            meta: { title: 'Agenda' }
        },
        {
            path: '/meals/:id',
            name: 'meal-detail',
            component: () => import('../views/MealDetailView.vue'),
            meta: { title: 'Détail Repas' }
        },
        {
            path: '/recipes',
            name: 'recipes',
            component: RecipesView,
            meta: { title: 'Recettes' }
        },
        {
            path: '/recipes/new',
            name: 'recipe-new',
            component: () => import('../views/RecipeFormView.vue'),
            meta: { title: 'Nouvelle Recette' }
        },
        {
            path: '/recipes/:id',
            name: 'recipe-form',
            component: () => import('../views/RecipeFormView.vue'),
            meta: { title: 'Recette' }
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
            meta: { title: 'Paramètres' }
        }
    ]
})

export default router
