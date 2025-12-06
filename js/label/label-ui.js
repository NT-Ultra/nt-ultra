import { saveSettings } from '../core/database.js';
import { state, default_settings } from '../core/state.js';
import { dbSet } from '../core/database.js';

export function initLabelUI() {
    document.getElementById('label-position').addEventListener('change', async (e) => {
        await updateSetting('labelPosition', e.target.value);
    });
    document.getElementById('content-type').addEventListener('change', async (e) => {
        await updateSetting('labelContent', e.target.value);
    });
    document.getElementById('label-style').addEventListener('change', async (e) => {
        await updateSetting('labelStyle', e.target.value);
    });
    document.getElementById('user-name').addEventListener('input', async (e) => {
        await updateSetting('userName', e.target.value);
    });
    document.getElementById('label-font-size').addEventListener('input', async (e) => {
        await updateSetting('labelFontSize', parseInt(e.target.value));
    });
}

async function updateSetting(key, value) {
    if (state.activeTheme === 'default') {
        state.activeTheme = 'custom';
        state.settings.themeMode = 'custom';
        await dbSet('settings', 'activeTheme', 'custom');
    }
    state.settings[key] = value;
    await saveSettings();
    if (window.render) {
        window.render();
    }
}