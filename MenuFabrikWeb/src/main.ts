import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import './style.css'
import 'primeicons/primeicons.css';
import App from './App.vue'
import router from './router'

const app = createApp(App)

const LighterDarkPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            dark: {
                surface: {
                    950: '#111827',
                    900: '#1f2937',
                    800: '#374151',
                    700: '#4b5563',
                }
            }
        }
    }
});

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: LighterDarkPreset,
        options: {
            darkModeSelector: '.dark',
        }
    },
    locale: {
        firstDayOfWeek: 1,
        dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
        dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
        dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
        monthNames: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
        monthNamesShort: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"],
        today: "Aujourd'hui",
        clear: "Effacer"
    }
})
app.use(ConfirmationService)
app.use(ToastService)

app.mount('#app')
