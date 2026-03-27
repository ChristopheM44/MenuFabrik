import { useToast } from 'primevue/usetoast';

export function useNotify() {
    const toast = useToast();

    const notifySuccess = (summary: string, detail?: string, life = 3000) =>
        toast.add({ severity: 'success', summary, detail, life });

    const notifyError = (summary: string, detail?: string, life = 3000) =>
        toast.add({ severity: 'error', summary, detail, life });

    const notifyWarn = (summary: string, detail?: string, life = 3000) =>
        toast.add({ severity: 'warn', summary, detail, life });

    return { notifySuccess, notifyError, notifyWarn };
}
