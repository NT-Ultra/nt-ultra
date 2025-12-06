import { 
    addTheme, 
    confirmAddTheme,
    removeTheme, 
    exportTheme,
    confirmExportFile,
    confirmExportCopy,
    importTheme,
    importFromFile,
    importFromText,
    processThemeImport,
    switchTheme 
} from './themes.js';

export function initThemesUI() {
    document.getElementById('theme-mode').addEventListener('change', (e) => {
        switchTheme(e.target.value);
    });
    document.getElementById('theme-controls-add-btn').addEventListener('click', (e) => {
        e.preventDefault();
        addTheme();
    });
    document.getElementById('theme-controls-remove-btn').addEventListener('click', (e) => {
        e.preventDefault();
        removeTheme();
    });
    document.getElementById('theme-controls-import-btn').addEventListener('click', (e) => {
        e.preventDefault();
        importTheme();
    });
    document.getElementById('theme-controls-export-btn').addEventListener('click', (e) => {
        e.preventDefault();
        exportTheme();
    });

    document.getElementById('confirm-add-theme').addEventListener('click', confirmAddTheme);
    document.getElementById('cancel-add-theme').addEventListener('click', () => {
        document.getElementById('add-theme-modal').style.display = 'none';
    });
    document.getElementById('add-theme-modal').addEventListener('click', (e) => {
        if (e.target.id === 'add-theme-modal') {
            document.getElementById('add-theme-modal').style.display = 'none';
        }
    });
    document.getElementById('add-theme-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmAddTheme();
        } else if (e.key === 'Escape') {
            document.getElementById('add-theme-modal').style.display = 'none';
        }
    });

    document.getElementById('confirm-export-file').addEventListener('click', confirmExportFile);
    document.getElementById('confirm-export-copy').addEventListener('click', confirmExportCopy);
    document.getElementById('cancel-export-theme').addEventListener('click', () => {
        document.getElementById('export-theme-modal').style.display = 'none';
    });
    document.getElementById('export-theme-modal').addEventListener('click', (e) => {
        if (e.target.id === 'export-theme-modal') {
            document.getElementById('export-theme-modal').style.display = 'none';
        }
    });

    document.getElementById('import-from-file-btn').addEventListener('click', importFromFile);
    document.getElementById('import-from-text-btn').addEventListener('click', importFromText);
    document.getElementById('confirm-import-text').addEventListener('click', () => {
        const json = document.getElementById('import-theme-json').value;
        processThemeImport(json);
    });
    document.getElementById('cancel-import-theme').addEventListener('click', () => {
        document.getElementById('import-theme-modal').style.display = 'none';
    });
    document.getElementById('import-theme-modal').addEventListener('click', (e) => {
        if (e.target.id === 'import-theme-modal') {
            document.getElementById('import-theme-modal').style.display = 'none';
        }
    });

    document.getElementById('import-theme-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                processThemeImport(event.target.result);
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    });
}