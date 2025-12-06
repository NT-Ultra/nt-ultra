export const ModalManager = {
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    },
    
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    },
    
    onClickOutside(modalId, callback) {
        document.getElementById(modalId)?.addEventListener('click', (e) => {
            if (e.target.id === modalId) {
                callback();
            }
        });
    },
    
    bindConfirm(buttonId, handler) {
        document.getElementById(buttonId)?.addEventListener('click', handler);
    },
    
    bindCancel(buttonId, handler) {
        document.getElementById(buttonId)?.addEventListener('click', handler);
    }
};