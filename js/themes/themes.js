import { state, default_settings, themeVersion, themeMaxLimit } from '../core/state.js';
import { dbSet, dbDelete, dbGet, saveThemeList, saveSettings } from '../core/database.js';

export function sanitizeThemeName(name) {
    return name.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
}

export function validateThemeName(name) {
    const sanitized = sanitizeThemeName(name);
    if (!sanitized) return { valid: false, error: 'Theme name cannot be empty' };
    if (sanitized.length > 30) return { valid: false, error: 'Theme name too long (max 30 characters)' };
    const lowerName = sanitized.toLowerCase();
    if (lowerName === 'default' || lowerName === 'custom') {
        return { valid: false, error: 'Cannot use reserved names: default, custom' };
    }
    return { valid: true, name: sanitized };
}

function getUniqueThemeName(baseName) {
    let name = baseName;
    let counter = 2;
    while (state.themeList.includes(name)) {
        name = `${baseName} (${counter})`;
        counter++;
    }
    return name;
}

export async function addTheme() {
    if (state.themeList.length >= themeMaxLimit) {
        alert(`Maximum ${themeMaxLimit} themes allowed`);
        return;
    }
    document.getElementById('add-theme-modal').style.display = 'flex';
    document.getElementById('add-theme-name').value = '';
    setTimeout(() => document.getElementById('add-theme-name').focus(), 100);
}

export async function confirmAddTheme() {
    const input = document.getElementById('add-theme-name').value;
    const validation = validateThemeName(input);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    let themeName = validation.name;
    // duplicates
    if (state.themeList.includes(themeName)) {
        themeName = getUniqueThemeName(themeName);
    }
    const newThemeSettings = { ...state.settings, themeMode: themeName };
    await dbSet('settings', `theme_${themeName}`, newThemeSettings);
    state.themeList.push(themeName);
    await saveThemeList();
    state.activeTheme = themeName;
    state.settings = newThemeSettings;
    await dbSet('settings', 'activeTheme', themeName);
    document.getElementById('add-theme-modal').style.display = 'none';
    if (window.render) {
        window.render();
    }
    console.log(`Theme '${themeName}' added successfully`);
}

export async function removeTheme() {
    const currentTheme = state.activeTheme;
    if (currentTheme === 'default' || currentTheme === 'custom') {
        return;
    }
    if (!confirm(`Delete theme '${currentTheme}'?`)) {
        return;
    }
    const currentIndex = state.themeList.indexOf(currentTheme);
    await dbDelete('settings', `theme_${currentTheme}`);
    state.themeList = state.themeList.filter(t => t !== currentTheme);
    await saveThemeList();
    let fallbackTheme = 'custom';
    if (currentIndex > 0) {
        fallbackTheme = state.themeList[currentIndex - 1] || 'custom';
    }
    await switchTheme(fallbackTheme);
    console.log(`Theme '${currentTheme}' removed`);
}

export async function switchTheme(mode) {
    if (state.activeTheme === 'custom') {
        await dbSet('settings', `theme_${state.activeTheme}`, state.settings);
    }
    state.activeTheme = mode;
    await dbSet('settings', 'activeTheme', mode);
    const themeSettings = await dbGet('settings', `theme_${mode}`);
    if (themeSettings) {
        state.settings = { ...default_settings, ...themeSettings };
    } else {
        state.settings = { ...default_settings };
    }
    state.settings.themeMode = mode;
    if (window.render) {
        window.render();
    }
}

function generateThemeJSON(themeName, author, description) {
    return {
        name: themeName || state.activeTheme,
        version: themeVersion,
        author: author || '',
        description: description || '',
        settings: { ...state.settings }
    };
}

export async function exportTheme() {
    document.getElementById('export-theme-name').value = state.activeTheme;
    document.getElementById('export-theme-author').value = state.settings.userName || '';
    document.getElementById('export-theme-description').value = '';
    document.getElementById('export-theme-modal').style.display = 'flex';
}

export async function confirmExportFile() {
    const name = document.getElementById('export-theme-name').value.trim() || state.activeTheme;
    const author = document.getElementById('export-theme-author').value.trim();
    const description = document.getElementById('export-theme-description').value.trim();
    const themeData = generateThemeJSON(name, author, description);
    const jsonString = JSON.stringify(themeData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ntultra-${name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('export-theme-modal').style.display = 'none';
    console.log('Theme exported as file');
}

export async function confirmExportCopy() {
    const name = document.getElementById('export-theme-name').value.trim() || state.activeTheme;
    const author = document.getElementById('export-theme-author').value.trim();
    const description = document.getElementById('export-theme-description').value.trim();
    const themeData = generateThemeJSON(name, author, description);
    const jsonString = JSON.stringify(themeData, null, 2);
    try {
        await navigator.clipboard.writeText(jsonString);
        alert('Theme JSON copied to clipboard!');
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Theme JSON copied to clipboard!');
    }
    document.getElementById('export-theme-modal').style.display = 'none';
    console.log('Theme JSON copied');
}

export async function importTheme() {
    document.getElementById('import-theme-modal').style.display = 'flex';
    document.getElementById('import-text-area').style.display = 'none';
    document.getElementById('import-theme-json').value = '';
}

export async function importFromFile() {
    document.getElementById('import-theme-file-input').click();
}

export async function importFromText() {
    document.getElementById('import-text-area').style.display = 'block';
    setTimeout(() => document.getElementById('import-theme-json').focus(), 100);
}

export async function processThemeImport(jsonString) {
    try {
        const themeData = JSON.parse(jsonString);
        if (!themeData.name || !themeData.settings) {
            alert('Invalid theme file: missing name or settings');
            return;
        }
        const validation = validateThemeName(themeData.name);
        let themeName = validation.valid ? validation.name : 'Imported Theme';
        if (state.themeList.includes(themeName)) {
            themeName = getUniqueThemeName(themeName);
        }
        if (state.themeList.length >= themeMaxLimit) {
            alert(`Maximum ${themeMaxLimit} themes allowed`);
            return;
        }
        const newThemeSettings = { ...default_settings, ...themeData.settings, themeMode: themeName };
        await dbSet('settings', `theme_${themeName}`, newThemeSettings);
        state.themeList.push(themeName);
        await saveThemeList();
        state.activeTheme = themeName;
        state.settings = newThemeSettings;
        await dbSet('settings', 'activeTheme', themeName);
        document.getElementById('import-theme-modal').style.display = 'none';
        if (window.render) {
            window.render();
        }
        const authorInfo = themeData.author ? ` by ${themeData.author}` : '';
        alert(`Theme '${themeName}'${authorInfo} imported successfully!`);
        console.log(`Theme imported: ${themeName}`, themeData);
    } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import theme. Please check the JSON format.');
    }
}