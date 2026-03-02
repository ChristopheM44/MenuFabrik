import { ref, onMounted } from 'vue';

export function useTheme() {
    const isDark = ref(false);

    const initTheme = () => {
        // Option 1: On check le localStorage
        const savedTheme = localStorage.getItem('menufabrik_theme');

        if (savedTheme === 'dark') {
            isDark.value = true;
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            isDark.value = false;
            document.documentElement.classList.remove('dark');
        } else {
            // Option 2: Si rien de sauvegardé, on check les préférences système (Optionnel, ici on met Light par défaut)
            // const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            isDark.value = false;
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        isDark.value = !isDark.value;
        if (isDark.value) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('menufabrik_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('menufabrik_theme', 'light');
        }
    };

    onMounted(() => {
        initTheme();
    });

    return {
        isDark,
        toggleTheme
    };
}
