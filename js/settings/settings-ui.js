import { state } from '../core/state.js';
import { dbGet } from '../core/database.js';
import { renderWallpapers } from '../wallpapers/wallpapers.js';
import { updateSetting, toggleDisplayExpandedSettings, resetEverything, confirmReset } from './settings.js';

let settingsModulesLoaded = false;

export function initSettingsUI() {
    // on first open we load these

    document.getElementById('settings-btn').addEventListener('click', async () => {
        document.getElementById('settings-sidebar').classList.add('open');
        if (state.wallpapers.length === 0) {
            const wallpapers = await dbGet('wallpapers', 'data');
            if (wallpapers) {
                state.wallpapers = wallpapers;
                renderWallpapers();
            }
            console.log('settings-ui: wallpaper loaded...');
        }
        //lazy load these modules
        if (!settingsModulesLoaded) {
            const [
                { initWallpapersUI },
                { initThemesUI }
            ] = await Promise.all([
                import('../wallpapers/wallpapers-ui.js'),
                import('../themes/themes-ui.js')
            ]);
            initWallpapersUI();
            initThemesUI();
            settingsModulesLoaded = true;
            console.log('settings-ui: settings modules loaded...');
        }
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-sidebar').classList.remove('open');
    });
    
    document.getElementById('settings-sidebar').addEventListener('click', (e) => {
        if (e.target.id === 'settings-sidebar') {
            document.getElementById('settings-sidebar').classList.remove('open');
        }
    });

    // Display settings
    document.getElementById('font-family').addEventListener('change', (e) => {
        updateSetting('fontFamily', e.target.value);
    });
    document.getElementById('display-label').addEventListener('change', (e) => {
        updateSetting('displayLabel', e.target.value === 'on');
    });
    document.getElementById('display-shortcuts').addEventListener('change', (e) => {
        updateSetting('displayShortcuts', e.target.value === 'on');
    });
    document.getElementById('display-tab-browser').addEventListener('change', (e) => {
        const newMode = e.target.value;
        updateSetting('displayTabBrowser', newMode);
        window.tabsSidebarMode = newMode;
        if (window.updateTriggerVisibility) {
            window.updateTriggerVisibility(newMode);
        }
    });
    document.getElementById('display-trackers').addEventListener('change', (e) => {
        updateSetting('displayTrackers', e.target.value === 'on');
    });
    document.getElementById('theme-border-radius').addEventListener('input', (e) => {
        document.getElementById('theme-border-radius-value').textContent = e.target.value;
        updateSetting('themeBorderRadius', parseInt(e.target.value));
    });
    document.getElementById('theme-animation-speed').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('theme-animation-speed-value').textContent = value.toFixed(1);
        updateSetting('themeAnimationSpeed', value);
    });
    document.getElementById('theme-wallpaper-dimness').addEventListener('input', (e) => {
        document.getElementById('theme-wallpaper-dimness-value').textContent = e.target.value;
        updateSetting('themeWallpaperDimness', parseInt(e.target.value));
    });
    document.getElementById('theme-blur').addEventListener('change', (e) => {
        updateSetting('themeBlur', e.target.checked);
    });

    // Shortcuts settings
    document.getElementById('shortcut-max-limit').addEventListener('input', (e) => {
        updateSetting('shortcutMaxLimit', parseInt(e.target.value));
    });
    document.getElementById('shortcut-grid-columns').addEventListener('input', (e) => {
        updateSetting('shortcutGridColumns', parseInt(e.target.value));
    });
    document.getElementById('shortcut-scaling').addEventListener('input', (e) => {
        updateSetting('shortcutScaling', parseInt(e.target.value));
    });
    document.getElementById('shortcut-titles-hover').addEventListener('change', (e) => {
        updateSetting('shortcutTitlesHover', e.target.checked);
    });
    document.getElementById('shortcut-scale-hover').addEventListener('change', (e) => {
        updateSetting('shortcutScaleHover', e.target.checked);
    });
    document.getElementById('shortcut-menus-hidden').addEventListener('change', (e) => {
        updateSetting('shortcutMenusHidden', e.target.checked);
    });

    // Custom css settings
    let colorDebounceTimer = null;
    document.getElementById('theme-bg-color').addEventListener('input', (e) => {
        clearTimeout(colorDebounceTimer);
        colorDebounceTimer = setTimeout(() => {
            updateSetting('themeBgColor', e.target.value.trim());
        }, 500);
    });
    document.getElementById('theme-fg-color').addEventListener('input', (e) => {
        clearTimeout(colorDebounceTimer);
        colorDebounceTimer = setTimeout(() => {
            updateSetting('themeFgColor', e.target.value.trim());
        }, 500);
    });
    document.getElementById('theme-accent-color').addEventListener('input', (e) => {
        clearTimeout(colorDebounceTimer);
        colorDebounceTimer = setTimeout(() => {
            updateSetting('themeAccentColor', e.target.value.trim());
        }, 500);
    });

    // should remain these id's
    document.getElementById('theme-controls-toggle-btn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleDisplayExpandedSettings();
    });
    
    document.getElementById('theme-controls-reset-btn').addEventListener('click', (e) => {
        e.preventDefault();
        resetEverything();
    });

    // Reset modal
    document.getElementById('confirm-reset').addEventListener('click', confirmReset);
    document.getElementById('cancel-reset').addEventListener('click', () => {
        document.getElementById('reset-modal').style.display = 'none';
    });
    document.getElementById('reset-modal').addEventListener('click', (e) => {
        if (e.target.id === 'reset-modal') {
            document.getElementById('reset-modal').style.display = 'none';
        }
    });
}