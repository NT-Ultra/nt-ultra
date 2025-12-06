import { state } from '../core/state.js';
import { 
    renderShortcuts, 
    addShortcut, 
    editShortcut, 
    deleteShortcut, 
    togglePin, 
    saveEdit, 
    closeEditModal, 
    handleUrlInput,
    showContextMenu,
    hideContextMenu,
    createShortcutFromData
} from './shortcuts.js';
import { 
    importShortcuts, 
    importFromFirefox, 
    exportShortcutsToFile, 
    exportShortcutsToClipboard, 
    parseShortcutsText 
} from './shortcuts-io.js';

export function initShortcutsUI() {
    document.getElementById('edit-url').addEventListener('input', handleUrlInput);
    document.getElementById('save-edit').addEventListener('click', saveEdit);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') {
            closeEditModal();
        }
    });
    document.getElementById('edit-modal').addEventListener('keydown', (e) => {
        if (document.getElementById('edit-modal').style.display !== 'flex') return;
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeEditModal();
        }
    });
    // Context menu
    const shortcutsGrid = document.getElementById('shortcuts-grid');
    if (shortcutsGrid) {
        shortcutsGrid.addEventListener('contextmenu', (e) => {
            const shortcutEl = e.target.closest('.shortcut');
            if (!shortcutEl) return;
            e.preventDefault();
            const shortcutId = parseInt(shortcutEl.dataset.shortcutId);
            const shortcut = state.shortcuts.find(s => s.id === shortcutId);
            if (!shortcut) return;
            showContextMenu(e, shortcut);
        });
    }
    document.getElementById('context-menu').addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const shortcutId = parseInt(document.getElementById('context-menu').dataset.shortcutId);
        const shortcut = state.shortcuts.find(s => s.id === shortcutId);
        if (!shortcut) return;
        switch (action) {
            case 'pin':
                togglePin(shortcutId);
                break;
            case 'edit':
                editShortcut(shortcut);
                break;
            case 'open':
                window.open(shortcut.url, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(shortcut.url);
                break;
            case 'delete':
                deleteShortcut(shortcutId);
                break;
        }
        hideContextMenu();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#context-menu') && !e.target.closest('.shortcut-menu-btn')) {
            hideContextMenu();
        }
    });

    // Drag & drop for shortcuts container
    const shortcutsContainer = document.querySelector('.shortcuts-container');
    if (shortcutsContainer) {
        shortcutsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        shortcutsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (state.shortcuts.length >= state.settings.shortcutMaxLimit) {
                alert(`Maximum ${state.settings.shortcutMaxLimit} shortcuts allowed`);
                return;
            }
            try {
                const tabData = JSON.parse(e.dataTransfer.getData('application/json'));
                if (tabData && tabData.url) {
                    createShortcutFromData(tabData.title, tabData.url, tabData.favIconUrl);
                    return;
                }
            } catch (error) {
                // ...
            }
            let url = '';
            let title = '';
            // Firefox: text/x-moz-url format "URL\nTitle"
            const mozUrl = e.dataTransfer.getData('text/x-moz-url');
            if (mozUrl) {
                const lines = mozUrl.split('\n');
                url = lines[0]?.trim() || '';
                title = lines[1]?.trim() || '';
            }
            // Chromium: try text/html
            if (!url) {
                const html = e.dataTransfer.getData('text/html');
                if (html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const anchor = doc.querySelector('a');
                    if (anchor) {
                        url = anchor.href || '';
                        title = anchor.textContent?.trim() || '';
                    }
                }
            }
            // Or: text/uri-list or text/plain
            if (!url) {
                url = e.dataTransfer.getData('text/uri-list') || 
                    e.dataTransfer.getData('text/plain') || '';
                url = url.split('\n')[0].trim();
            }
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                createShortcutFromData(title, url, null);
                return;
            }
            console.log('Dropped data not recognized as tab or bookmark');
        });
    }
}

export function initShortcutsImportExport() {
    // Import/Export shortcuts
    document.getElementById('import-shortcuts-btn').addEventListener('click', () => {
        document.getElementById('import-shortcuts-modal').style.display = 'flex';
        document.querySelector('#import-shortcuts-modal h3').textContent = 'Import Shortcuts';
        document.getElementById('import-shortcuts-text-area').style.display = 'none';
        document.getElementById('import-shortcuts-input').value = '';
        document.getElementById('import-shortcuts-file-btn').style.display = 'inline-flex';
        document.getElementById('import-shortcuts-clipboard-btn').style.display = 'inline-flex';
        document.getElementById('import-shortcuts-firefox-btn').style.display = 'inline-flex';
        document.getElementById('export-shortcuts-file-btn').style.display = 'none';
        document.getElementById('export-shortcuts-clipboard-btn').style.display = 'none';
    });
    document.getElementById('export-shortcuts-btn').addEventListener('click', () => {
        document.getElementById('import-shortcuts-modal').style.display = 'flex';
        document.querySelector('#import-shortcuts-modal h3').textContent = 'Export Shortcuts';
        document.getElementById('import-shortcuts-text-area').style.display = 'none';
        document.getElementById('import-shortcuts-file-btn').style.display = 'none';
        document.getElementById('import-shortcuts-clipboard-btn').style.display = 'none';
        document.getElementById('import-shortcuts-firefox-btn').style.display = 'none';
        document.getElementById('export-shortcuts-file-btn').style.display = 'inline-flex';
        document.getElementById('export-shortcuts-clipboard-btn').style.display = 'inline-flex';
    });

    document.getElementById('import-shortcuts-file-btn').addEventListener('click', () => {
        document.getElementById('import-shortcuts-file-input').click();
    });
    document.getElementById('export-shortcuts-file-btn').addEventListener('click', () => {
        exportShortcutsToFile();
        document.getElementById('import-shortcuts-modal').style.display = 'none';
    });
    document.getElementById('import-shortcuts-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target.result;
                const parsed = parseShortcutsText(text);
                await importShortcuts(parsed);
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    });
    
    document.getElementById('import-shortcuts-clipboard-btn').addEventListener('click', () => {
        document.getElementById('import-shortcuts-text-area').style.display = 'block';
        document.getElementById('import-shortcuts-label').textContent = 'Paste one shortcut per line. Title and custom icon are optional..';
        document.getElementById('import-shortcuts-input').placeholder = 'https://github.com github https://icon.com/github.png';
        setTimeout(() => document.getElementById('import-shortcuts-input').focus(), 100);
    });
    
    document.getElementById('export-shortcuts-clipboard-btn').addEventListener('click', () => {
        exportShortcutsToClipboard();
        document.getElementById('import-shortcuts-modal').style.display = 'none';
    });
    
    document.getElementById('import-shortcuts-firefox-btn').addEventListener('click', () => {
        document.getElementById('import-shortcuts-text-area').style.display = 'block';
        document.getElementById('import-shortcuts-label').innerHTML = `
            <p style="font-size: 12px; color: color-mix(in srgb, var(--element-fg-color) 60%, transparent); margin-bottom: 12px;">
                Unfortunately there is no way to do this automatically? Can't find an API for it..<br><br>
                1. In Firefox, go to: about:config<br>
                2. Search for: browser.newtabpage.pinned<br>
                3. Copy the entire value and paste below
            </p>
        `;
        document.getElementById('import-shortcuts-input').placeholder = '[{"url":"https://example.com","label":"Example"}...]';
        setTimeout(() => document.getElementById('import-shortcuts-input').focus(), 100);
    });
    
    document.getElementById('confirm-import-shortcuts-text').addEventListener('click', async () => {
        const text = document.getElementById('import-shortcuts-input').value.trim();
        if (!text) {
            alert('Please paste the shortcut data');
            return;
        }
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                await importFromFirefox(json);
                return;
            }
        } catch (e) {
            // Not json, treat as text
        }
        const parsed = parseShortcutsText(text);
        await importShortcuts(parsed);
    });
    
    document.getElementById('cancel-import-shortcuts').addEventListener('click', () => {
        document.getElementById('import-shortcuts-modal').style.display = 'none';
    });
    
    document.getElementById('import-shortcuts-modal').addEventListener('click', (e) => {
        if (e.target.id === 'import-shortcuts-modal') {
            document.getElementById('import-shortcuts-modal').style.display = 'none';
        }
    });
}