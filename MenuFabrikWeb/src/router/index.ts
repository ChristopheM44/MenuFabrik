import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import MealsView from '../views/MealsView.vue'
import RecipesView from '../views/RecipesView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/LoginView.vue'),
            meta: { title: 'Connexion', requiresAuth: false }
        },
        {
            path: '/',
            redirect: '/meals'
        },
        {
            path: '/meals',
            name: 'meals',
            component: MealsView,
            meta: { title: 'Agenda', requiresAuth: true }
        },
        {
            path: '/meals/:id',
            name: 'meal-detail',
            component: () => import('../views/MealDetailView.vue'),
            meta: { title: 'Détail Repas', requiresAuth: true }
        },
        {
            path: '/recipes',
            name: 'recipes',
            component: RecipesView,
            meta: { title: 'Recettes', requiresAuth: true }
        },
        {
            path: '/recipes/new',
            name: 'recipe-new',
            component: () => import('../views/RecipeFormView.vue'),
            meta: { title: 'Nouvelle Recette', requiresAuth: true }
        },
        {
            path: '/recipes/:id',
            name: 'recipe-form',
            component: () => import('../views/RecipeFormView.vue'),
            meta: { title: 'Recette', requiresAuth: true }
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
            meta: { title: 'Paramètres', requiresAuth: true }
        }
    ]
})

router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()

    // Wait for the auth listener to resolve the initial user state
    if (!authStore.isInitializedInApp) {
        await new Promise<void>((resolve) => {
            const unwatch = watch(() => authStore.isInitializedInApp, (isInit) => {
                if (isInit) {
                    unwatch()
                    resolve()
                }
            })
        })
    }

    const requiresAuth = to.meta.requiresAuth !== false
    const isAuthenticated = !!authStore.user

    if (requiresAuth && !isAuthenticated) {
        next({ name: 'login' })
    } else if (to.name === 'login' && isAuthenticated) {
        next({ name: 'meals' })
    } else {
        next()
    }
})

export default router
