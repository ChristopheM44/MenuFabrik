import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        }
        return { top: 0 }
    },
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
            component: () => import('../views/MealsView.vue'),
            meta: { title: 'Agenda', requiresAuth: true }
        },
        {
            path: '/shopping-list',
            name: 'shopping-list',
            component: () => import('../views/ShoppingListView.vue'),
            meta: { title: 'Liste de Courses', requiresAuth: true }
        },
        {
            path: '/meals/:id',
            name: 'meal-detail',
            component: () => import('../views/MealDetailView.vue'),
            meta: { title: 'Détail Repas', requiresAuth: true }
        },
        {
            path: '/cooking/:recipeId',
            name: 'cooking',
            component: () => import('../views/CookingModeView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/recipes',
            name: 'recipes',
            component: () => import('../views/RecipesView.vue'),
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
            component: () => import('../views/SettingsView.vue'),
            meta: { title: 'Paramètres', requiresAuth: true }
        },
        {
            path: '/import',
            name: 'import',
            component: () => import('../views/ImportRecipeView.vue'),
            meta: { title: 'Importer une Recette', requiresAuth: true }
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../views/AdminView.vue'),
            meta: { title: 'Administration Globale', requiresAuth: true, requiresAdmin: true }
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
    const requiresAdmin = to.meta.requiresAdmin === true
    const isAuthenticated = !!authStore.user

    if (requiresAuth && !isAuthenticated) {
        next({ name: 'login' })
    } else if (to.name === 'login' && isAuthenticated) {
        next({ name: 'meals' })
    } else if (requiresAdmin && authStore.user?.email !== import.meta.env.VITE_ADMIN_EMAIL) {
        next({ name: 'meals' }) // Redirect non-admins trying to access /admin
    } else {
        next()
    }
})

export default router
