import { reactive } from 'vue';

interface ConfirmOptions {
    title: string;
    message: string;
    acceptLabel?: string;
    rejectLabel?: string;
    variant?: 'danger' | 'warning';
    onAccept: () => void | Promise<void>;
}

const state = reactive({
    visible: false,
    title: '',
    message: '',
    acceptLabel: 'Confirmer',
    rejectLabel: 'Annuler',
    variant: 'danger' as 'danger' | 'warning',
    onAccept: null as (() => void | Promise<void>) | null
});

export function useAppConfirm() {
    const confirm = (options: ConfirmOptions) => {
        state.title = options.title;
        state.message = options.message;
        state.acceptLabel = options.acceptLabel ?? 'Confirmer';
        state.rejectLabel = options.rejectLabel ?? 'Annuler';
        state.variant = options.variant ?? 'danger';
        state.onAccept = options.onAccept;
        state.visible = true;
    };

    return { state, confirm };
}
