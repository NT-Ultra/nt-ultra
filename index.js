// default settings ////////////////////////////// 
const DEFAULT_SETTINGS = {
    fontFamily: 'system-ui',
    themeMode: 'default',
    displayLabel: true,
    displayShortcuts: true,
    tabBrowserMode: 'disabled',
    customBgColor: '',
    customFgColor: '',
    customAccentColor: '',
    customBorderRadius: 10,
    customAnimationSpeed: 0.3,
    uiMoreBlur: false,
    shortcutTitlesHover: false,
    shortcutScaleHover: false,
    styleExpanded: false,
    labelFontSize: 48,
    labelPosition: 'top',
    scaling: 100,
    greetingType: 'none',
    userName: '',
    maxShortcuts: 24,
    gridColumns: 8
};

const THEME_VERSION = '1.0';
const MAX_THEMES = 20;

// default states ////////////////////////////////
let state = {
    shortcuts: [],
    wallpapers: [],
    currentWallpaper: null,
    settings: { ...DEFAULT_SETTINGS },
    activeTheme: 'default',
    themeList: ['default', 'custom'],
    editingShortcut: null,
    creatingShortcut: false
};
let tempWallpaperData = null;
let urlInputDebounceTimer = null;
let db;

// database //////////////////////////////////////
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NewtabultraDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
            if (!db.objectStoreNames.contains('shortcuts')) {
                db.createObjectStore('shortcuts');
            }
            if (!db.objectStoreNames.contains('wallpapers')) {
                db.createObjectStore('wallpapers');
            }
        };
    });
}

async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbSet(storeName, key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadData() {
    try {
        let shortcuts = await dbGet('shortcuts', 'data');
        if (!shortcuts && window.syncModule) {
            shortcuts = await window.syncModule.restoreFromSync('shortcuts_data');
            if (shortcuts) await dbSet('shortcuts', 'data', shortcuts);
        }
        let currentWallpaper = await dbGet('settings', 'currentWallpaper');
        if (currentWallpaper === undefined && window.syncModule) {
            currentWallpaper = await window.syncModule.restoreFromSync('currentWallpaper');
            if (currentWallpaper) await dbSet('settings', 'currentWallpaper', currentWallpaper);
        }
        let themeList = await dbGet('settings', 'themeList');
        if (!themeList && window.syncModule) {
            themeList = await window.syncModule.restoreFromSync('themeList');
            if (themeList) await dbSet('settings', 'themeList', themeList);
        }
        if (themeList && Array.isArray(themeList)) {
            state.themeList = themeList;
        } else {
            state.themeList = ['default', 'custom'];
            await dbSet('settings', 'themeList', state.themeList);
        }     
        let activeTheme = await dbGet('settings', 'activeTheme');
        if (!activeTheme && window.syncModule) {
            activeTheme = await window.syncModule.restoreFromSync('activeTheme');
            if (activeTheme) await dbSet('settings', 'activeTheme', activeTheme);
        }
        if (activeTheme && state.themeList.includes(activeTheme)) {
            state.activeTheme = activeTheme;
        } else {
            state.activeTheme = 'default';
            await dbSet('settings', 'activeTheme', 'default');
        }
        
        let themeSettings = await dbGet('settings', `theme_${state.activeTheme}`);
        if (!themeSettings && window.syncModule) {
            themeSettings = await window.syncModule.restoreFromSync(`theme_${state.activeTheme}`);
            if (themeSettings) await dbSet('settings', `theme_${state.activeTheme}`, themeSettings);
        }
        if (themeSettings) {
            state.settings = { ...DEFAULT_SETTINGS, ...themeSettings };
        } else {
            state.settings = { ...DEFAULT_SETTINGS };
            state.settings.themeMode = state.activeTheme;
        }
        // Rest of the function stays the same...
        if (shortcuts) {
            state.shortcuts = shortcuts;
            if (window.initializeShortcutOrder) {
                initializeShortcutOrder();
            }
        }
        // Shouldnt load wallpapers here, 8 wallpapers of massive size = 1-2+ second page load...
        // state.wallpapers loaded on settings sidebar first event L1215-ish
        if (currentWallpaper !== undefined) {
            state.currentWallpaper = currentWallpaper;
        } else {
            state.currentWallpaper = '#1a1a2e';
            saveCurrentWallpaper();
        }
    } catch (error) {
        console.log('No saved data found, starting fresh', error);
        state.currentWallpaper = '#1a1a2e';
        state.activeTheme = 'default';
        state.themeList = ['default', 'custom'];
        saveCurrentWallpaper();
    }
    render();
}

// save data /////////////////////////////////////
async function saveShortcuts() {
    try {
        await dbSet('shortcuts', 'data', state.shortcuts);
        if (window.syncModule) {
            await window.syncModule.backupToSync('shortcuts_data', state.shortcuts);
        }
    } catch (error) {
        console.error('Error saving shortcuts:', error);
    }
}

async function saveWallpapers() {
    try {
        await dbSet('wallpapers', 'data', state.wallpapers);
    } catch (error) {
        console.error('Error saving wallpapers:', error);
    }
}

async function saveSettings() {
    try {
        await dbSet('settings', `theme_${state.activeTheme}`, state.settings);
        if (window.syncModule) {
            await window.syncModule.backupToSync(`theme_${state.activeTheme}`, state.settings);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

async function saveCurrentWallpaper() {
    try {
        await dbSet('settings', 'currentWallpaper', state.currentWallpaper);
        // only colors
        if (window.syncModule && state.currentWallpaper?.startsWith('#')) {
            await window.syncModule.backupToSync('currentWallpaper', state.currentWallpaper);
        }
    } catch (error) {
        console.error('Error saving current wallpaper:', error);
    }
}

async function saveThemeList() {
    try {
        await dbSet('settings', 'themeList', state.themeList);
        if (window.syncModule) {
            await window.syncModule.backupToSync('themeList', state.themeList);
        }
    } catch (error) {
        console.error('Error saving theme list:', error);
    }
}

// Theme management //////////////////////////////
function sanitizeThemeName(name) {
    return name.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
}

function validateThemeName(name) {
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

async function addTheme() {
    if (state.themeList.length >= MAX_THEMES) {
        alert(`Maximum ${MAX_THEMES} themes allowed`);
        return;
    }
    
    // Show modal
    document.getElementById('add-theme-modal').style.display = 'flex';
    document.getElementById('add-theme-name').value = '';
    setTimeout(() => document.getElementById('add-theme-name').focus(), 100);
}

async function confirmAddTheme() {
    const input = document.getElementById('add-theme-name').value;
    const validation = validateThemeName(input);
    
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    let themeName = validation.name;
    
    // duplicates, save, add, switch
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
    render();
    
    console.log(`Theme '${themeName}' added successfully`);
}

async function removeTheme() {
    const currentTheme = state.activeTheme;
    if (currentTheme === 'default' || currentTheme === 'custom') {
        return; // Do nothing silently
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

function generateThemeJSON(themeName, author, description) {
    return {
        name: themeName || state.activeTheme,
        version: THEME_VERSION,
        author: author || '',
        description: description || '',
        settings: { ...state.settings }
    };
}

async function exportTheme() {
    document.getElementById('export-theme-name').value = state.activeTheme;
    document.getElementById('export-theme-author').value = state.settings.userName || '';
    document.getElementById('export-theme-description').value = '';
    document.getElementById('export-theme-modal').style.display = 'flex';
}

async function confirmExportFile() {
    const name = document.getElementById('export-theme-name').value.trim() || state.activeTheme;
    const author = document.getElementById('export-theme-author').value.trim();
    const description = document.getElementById('export-theme-description').value.trim();
    const themeData = generateThemeJSON(name, author, description);
    const jsonString = JSON.stringify(themeData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('export-theme-modal').style.display = 'none';
    console.log('Theme exported as file');
}

async function confirmExportCopy() {
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

async function importTheme() {
    document.getElementById('import-theme-modal').style.display = 'flex';
    document.getElementById('import-text-area').style.display = 'none';
    document.getElementById('import-theme-json').value = '';
}

async function importFromFile() {
    document.getElementById('import-theme-file-input').click();
}

async function importFromText() {
    document.getElementById('import-text-area').style.display = 'block';
    setTimeout(() => document.getElementById('import-theme-json').focus(), 100);
}

async function processThemeImport(jsonString) {
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
        
        if (state.themeList.length >= MAX_THEMES) {
            alert(`Maximum ${MAX_THEMES} themes allowed`);
            return;
        }
        
        const newThemeSettings = { ...DEFAULT_SETTINGS, ...themeData.settings, themeMode: themeName };
        await dbSet('settings', `theme_${themeName}`, newThemeSettings);
        state.themeList.push(themeName);
        await saveThemeList();
        state.activeTheme = themeName;
        state.settings = newThemeSettings;
        await dbSet('settings', 'activeTheme', themeName);
        document.getElementById('import-theme-modal').style.display = 'none';
        render();
        
        const authorInfo = themeData.author ? ` by ${themeData.author}` : '';
        alert(`Theme '${themeName}'${authorInfo} imported successfully!`);
        console.log(`Theme imported: ${themeName}`, themeData);
        
    } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import theme. Please check the JSON format.');
    }
}

async function resetEverything() {
    // Show modal instead of confirm dialog
    document.getElementById('reset-modal').style.display = 'flex';
    
    // Reset checkboxes to defaults
    document.getElementById('reset-themes').checked = true;
    document.getElementById('reset-wallpapers').checked = false;
    document.getElementById('reset-shortcuts').checked = false;
}

async function confirmReset() {
    const resetThemes = document.getElementById('reset-themes').checked;
    const resetWallpapers = document.getElementById('reset-wallpapers').checked;
    const resetShortcuts = document.getElementById('reset-shortcuts').checked;
    if (!resetThemes && !resetWallpapers && !resetShortcuts) {
        alert('Huh? You dont have anything selected..');
        return;
    }
    try {
        if (resetThemes) {
            for (const theme of state.themeList) {
                if (theme !== 'default' && theme !== 'custom') {
                    await dbDelete('settings', `theme_${theme}`);
                }
            }
            await dbSet('settings', 'theme_custom', { ...DEFAULT_SETTINGS, themeMode: 'custom' });
            state.themeList = ['default', 'custom'];
            await saveThemeList();
            state.activeTheme = 'default';
            state.settings = { ...DEFAULT_SETTINGS };
            await dbSet('settings', 'activeTheme', 'default');
        }
        if (resetWallpapers) {
            state.wallpapers = [];
            await saveWallpapers();
            state.currentWallpaper = '#1a1a2e';
            await saveCurrentWallpaper();
        }
        if (resetShortcuts) {
            state.shortcuts = state.shortcuts.filter(s => s.pinned);
            state.shortcuts.forEach((s, i) => s.order = i);
            await saveShortcuts();
        }
        document.getElementById('reset-modal').style.display = 'none';
        console.log('Reset complete, reloading...');
        location.reload();
    } catch (error) {
        console.error('Reset error:', error);
        alert('Failed to reset. Please try again.');
    }
}

// shortcut helpers //////////////////////////////
function getCleanHostname(url) {
    try {
        let hostname = new URL(url).hostname;
        if (hostname.startsWith('www.')) {
            hostname = hostname.replace('www.', '');
        }
        const lastDotIndex = hostname.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            hostname = hostname.substring(0, lastDotIndex);
        }
        return hostname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return '';
    }
}

function getFaviconUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        if (!hostname.includes('.')) {
            // no fallback white globes here...
            return null;
        }

        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch (error) {
        console.error('Invalid URL for favicon:', error);
        return null;
    }
}

function normalizeUrl(url) {
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    try {
        new URL(url);
        return url;
    } catch (error) {
        return null;
    }
}

// render all ////////////////////////////////////
function render() {
    renderGreeting();
    renderShortcuts();
    renderWallpapers();
    renderSettings();
    renderThemeDropdown();
    applyStyles();
}

function renderGreeting() {
    const greeting = document.getElementById('greeting');
    const hour = new Date().getHours();
    const name = state.settings.userName || 'my Friend';
    let text = 'New Tab Ultra';
    switch (state.settings.greetingType) {
        case 'time':
            text = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            break;
        case 'date':
            text = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            break;
        case 'greetings':
            const helloOptions = [
                `Hello, ${name}`,
                `Hi, ${name}`,
                `Welcome back, ${name}`,
                `Look who it is, ${name}!`,
                `Hey there, ${name}`,
                `Nice to see you, ${name}`
            ];
            text = helloOptions[Math.floor(Math.random() * helloOptions.length)];
            break;
        case 'timeOfDay':
            if (hour >= 4 && hour < 12) {
                text = `Good morning, ${name}`;
            } else if (hour >= 12 && hour < 18) {
                text = `Good afternoon, ${name}`;
            } else if (hour >= 18 && hour < 20) {
                text = `Good evening, ${name}`;
            } else {
                text = `Good night, ${name}`;
            }
            break;
    }
    greeting.textContent = text;
    const header = document.querySelector('.header');
    header.style.display = state.settings.displayLabel ? 'block' : 'none';
}

function renderShortcuts() {
    const grid = document.getElementById('shortcuts-grid');
    const container = document.querySelector('.shortcuts-container');
    if (!state.settings.displayShortcuts) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    grid.innerHTML = '';
    const maxShortcuts = state.settings.maxShortcuts;
    const shortcuts = state.shortcuts.slice(0, maxShortcuts);

    shortcuts.forEach((shortcut, index) => {
        const div = document.createElement('div');
        div.className = 'shortcut';
        div.draggable = true;
        div.dataset.index = index;
        div.dataset.shortcutId = shortcut.id;
        const icon = document.createElement('div');
        icon.className = 'shortcut-icon';
        if (shortcut.icon) {
            const img = document.createElement('img');
            img.src = shortcut.icon;
            img.alt = shortcut.title;
            img.onerror = function() {
                this.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'shortcut-icon-placeholder';
                placeholder.textContent = shortcut.title[0].toUpperCase();
                icon.appendChild(placeholder);
            };
            icon.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'shortcut-icon-placeholder';
            placeholder.textContent = shortcut.title[0].toUpperCase();
            icon.appendChild(placeholder);
        }
        const menuBtn = document.createElement('button');
        menuBtn.className = 'shortcut-menu-btn';
        menuBtn.innerHTML = '⋮';
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showContextMenu(e, shortcut);
            console.log('shortcut menu clicked');
        });
        icon.appendChild(menuBtn);
        
        icon.addEventListener('click', (e) => {
            console.log('Clicked, is dragging should be false', window.dragState?.isDragging);
            if (window.dragState && window.dragState.isDragging) return;
            if (e.button === 1 || e.ctrlKey || e.metaKey) {
                window.open(shortcut.url, '_blank');
                console.log('shortcut clicked');
            } else {
                window.location.href = shortcut.url;
            }
        });
        icon.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                window.open(shortcut.url, '_blank');
            }
        });
        const title = document.createElement('span');
        title.className = 'shortcut-title';
        title.textContent = shortcut.title;
        div.appendChild(icon);
        div.appendChild(title);
        grid.appendChild(div);
    });
    if (shortcuts.length < maxShortcuts) {
        const addBtn = document.createElement('div');
        addBtn.className = 'add-shortcut';
        addBtn.innerHTML = `
            <div class="add-shortcut-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </div>
            <span class="shortcut-title">New</span>
        `;
        addBtn.addEventListener('click', addShortcut);
        grid.appendChild(addBtn);
    }
    if (window.initShortcutDragDrop) {
        console.log('About to init drag-drop');
        setTimeout(() => window.initShortcutDragDrop(), 0);
    }
}

function renderWallpapers() {
    const grid = document.getElementById('wallpapers-grid');
    const count = document.getElementById('wallpaper-count');
    const removeBtn = document.getElementById('remove-wallpaper-btn');

    count.textContent = state.wallpapers.length;
    grid.innerHTML = '';

    state.wallpapers.forEach(wp => {
        const div = document.createElement('div');
        div.className = 'wallpaper-item';
        if (state.currentWallpaper === wp.url) {
            div.classList.add('active');
        }

        if (wp.url.startsWith('#')) {
            div.style.backgroundColor = wp.url;
            div.style.height = '80px';
        } else {
            const img = document.createElement('img');
            img.src = wp.url;
            img.alt = 'Wallpaper';
            div.appendChild(img);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'wallpaper-delete';
        deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteWallpaper(wp.id);
        });

        div.addEventListener('click', () => selectWallpaper(wp.url));
        div.appendChild(deleteBtn);
        grid.appendChild(div);
    });

    removeBtn.style.display = state.currentWallpaper ? 'flex' : 'none';
}

function renderThemeDropdown() {
    const dropdown = document.getElementById('theme-mode');
    dropdown.innerHTML = '';
    
    state.themeList.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        if (theme === state.activeTheme) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

function renderSettings() {
    document.getElementById('greeting-type').value = state.settings.greetingType;
    document.getElementById('user-name').value = state.settings.userName;
    document.getElementById('font-family').value = state.settings.fontFamily;
    document.getElementById('tab-browser-mode').value = state.settings.tabBrowserMode;
    document.getElementById('display-label').value = state.settings.displayLabel ? 'on' : 'off';
    document.getElementById('display-shortcuts').value = state.settings.displayShortcuts ? 'on' : 'off';
    
    const themeControls = document.getElementById('theme-controls');
    themeControls.style.display = state.settings.styleExpanded ? 'block' : 'none';
    document.getElementById('theme-controls-toggle-btn').textContent = 
        state.settings.styleExpanded ? 'Collapse' : 'Expand';
    
    // Set theme values
    document.getElementById('bg-color').value = state.settings.customBgColor;
    document.getElementById('fg-color').value = state.settings.customFgColor;
    document.getElementById('accent-color').value = state.settings.customAccentColor;
    document.getElementById('border-radius').value = state.settings.customBorderRadius;
    document.getElementById('border-radius-value').textContent = state.settings.customBorderRadius;
    document.getElementById('animation-speed').value = state.settings.customAnimationSpeed;
    document.getElementById('animation-speed-value').textContent = state.settings.customAnimationSpeed;
    document.getElementById('ui-more-blur').checked = state.settings.uiMoreBlur;
    
    document.getElementById('shortcut-titles-hover').checked = state.settings.shortcutTitlesHover;
    document.getElementById('shortcut-scale-hover').checked = state.settings.shortcutScaleHover;
    
    document.getElementById('label-font-size').value = state.settings.labelFontSize;
    document.getElementById('label-font-size-value').textContent = state.settings.labelFontSize;
    document.getElementById('label-position').value = state.settings.labelPosition;
    document.getElementById('scaling').value = state.settings.scaling;
    document.getElementById('scaling-value').textContent = state.settings.scaling;
    document.getElementById('grid-columns').value = state.settings.gridColumns;
    document.getElementById('grid-columns-value').textContent = state.settings.gridColumns;
    document.getElementById('max-shortcuts').value = state.settings.maxShortcuts;
    document.getElementById('max-shortcuts-value').textContent = state.settings.maxShortcuts;

    // Show/hide sections
    document.getElementById('label-section').style.display = state.settings.displayLabel ? 'block' : 'none';
    document.getElementById('shortcuts-section').style.display = state.settings.displayShortcuts ? 'block' : 'none';
    document.getElementById('tab-browser-section').style.display = 
        state.settings.tabBrowserMode !== 'disabled' ? 'block' : 'none';
    const userNameInput = document.getElementById('user-name');
    userNameInput.style.display =
        (state.settings.greetingType === 'greetings' || state.settings.greetingType === 'timeOfDay')
        ? 'block' : 'none';
}

function applyStyles() {
    const body = document.body;
    const header = document.querySelector('.header');
    const headerText = document.querySelector('.header h1');
    const grid = document.getElementById('shortcuts-grid');
    const app = document.getElementById('app');
    const sidebarcontainer = document.querySelector('.shortcuts-container');
    const tabsSidebar = document.getElementById('tabs-sidebar');
    const tabsBtn = document.getElementById('tabs-btn');
    body.style.fontFamily = state.settings.fontFamily;
    const bgColor = state.settings.customBgColor || '#2b2a33';
    const fgColor = state.settings.customFgColor || '#ffffff';
    const accentColor = state.settings.customAccentColor || '#3b82f6';
    let styleTag = document.getElementById('custom-theme-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-theme-styles';
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
        * {
            --element-bg-color: ${bgColor} !important;
            --element-fg-color: ${fgColor} !important;
            --accent-color: ${accentColor} !important;
            --element-border-radius: ${state.settings.customBorderRadius}px !important;
        }
    `;
    const animSpeed = state.settings.customAnimationSpeed;
    if (tabsSidebar) tabsSidebar.style.transitionDuration = `${animSpeed}s`;
    const settingsSidebar = document.getElementById('settings-sidebar');
    if (settingsSidebar) settingsSidebar.style.transitionDuration = `${animSpeed}s`;
    if (state.settings.uiMoreBlur) {
        let blurStyleTag = document.getElementById('blur-styles');
        if (!blurStyleTag) {
            blurStyleTag = document.createElement('style');
            blurStyleTag.id = 'blur-styles';
            document.head.appendChild(blurStyleTag);
        }
        blurStyleTag.textContent = `
            .settings-sidebar {
                background: color-mix(in srgb, var(--element-bg-color) 90%, transparent) !important;
                
            }
            .settings-content {backdrop-filter: blur(10px) !important;}
            .tabs-sidebar {
                background: color-mix(in srgb, var(--element-bg-color) 20%, transparent) !important;
                backdrop-filter: blur(10px) !important;
            }
            .modal-content {
                background: color-mix(in srgb, var(--element-bg-color) 40%, transparent) !important;
                backdrop-filter: blur(10px) !important;
            }
            .shortcut-menu-btn {
                background: color-mix(in srgb, var(--element-bg-color) 10%, transparent) !important;
                backdrop-filter: blur(10px) !important;
            }
            .settings-sidebar *:not(select):not(option) {
                --element-layered-bg-color: var(--more-blur) !important;
            }
        `;
    } else {
        const blurStyleTag = document.getElementById('blur-styles');
        if (blurStyleTag) {
            blurStyleTag.remove();
        }
    }
    if (tabsSidebar && tabsBtn) {
        window.tabsSidebarMode = state.settings.tabBrowserMode;
        switch (state.settings.tabBrowserMode) {
            case 'disabled':
                tabsSidebar.style.display = 'none';
                tabsBtn.style.display = 'none';
                break;
            case 'button':
                tabsSidebar.style.display = 'block';
                tabsBtn.style.display = 'flex';
                break;
            case 'autohide':
                tabsSidebar.style.display = 'block';
                tabsBtn.style.display = 'none';
                break;
        }
    }
    let hoverStyleTag = document.getElementById('shortcut-hover-styles');
    if (!hoverStyleTag) {
        hoverStyleTag = document.createElement('style');
        hoverStyleTag.id = 'shortcut-hover-styles';
        document.head.appendChild(hoverStyleTag);
    }
    let hoverStyles = '';
    if (state.settings.shortcutTitlesHover) {
        hoverStyles += `
            .shortcut:not(:hover) .shortcut-title {
                opacity: 0;
                transition: opacity 0.8s ease;
            }
        `;
    }
    if (state.settings.shortcutScaleHover) {
        hoverStyles += `
            .shortcut:hover {
                transform: scale(1.4);
                transition: transform 0.2s ease;
            }
        `;
    }
    hoverStyleTag.textContent = hoverStyles;
    if (headerText) {
        headerText.style.fontSize = `${state.settings.labelFontSize}px`;
    }

if (window.updateTriggerVisibility) {
    window.updateTriggerVisibility(state.settings.tabBrowserMode);
}

 // Simply toggle a class
if (state.settings.labelPosition === 'bottom') {
    header.classList.add('bottom-position');
} else {
    header.classList.remove('bottom-position');
}   


    if (state.currentWallpaper) {
        if (state.currentWallpaper.startsWith('#')) {
            body.style.background = state.currentWallpaper;
            body.style.backgroundImage = 'none';
        } else {
            body.style.background = 'none';
            body.style.backgroundImage = `url(${state.currentWallpaper})`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
        }
    } else {
        body.style.background = 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)';
        body.style.backgroundImage = '';
    }
    const scale = state.settings.scaling / 100;
    grid.style.transform = `scale(${scale})`;
    grid.style.gridTemplateColumns = `repeat(${state.settings.gridColumns}, minmax(0, 1fr))`;
}

// Shortcut functions
function addShortcut() {
    if (state.shortcuts.length >= state.settings.maxShortcuts) {
        alert(`Maximum ${state.settings.maxShortcuts} shortcuts allowed`);
        return;
    }
    state.creatingShortcut = true;
    state.editingShortcut = {
        id: Date.now(),
        title: '',
        url: '',
        icon: null,
        pinned: false,
        order: state.shortcuts.length
    };
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-url').value = '';
    document.getElementById('edit-icon').value = '';
    document.getElementById('edit-modal').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('edit-url').focus();
    }, 100);
}

function deleteShortcut(id) {
    state.shortcuts = state.shortcuts.filter(s => s.id !== id);
    saveShortcuts();
    renderShortcuts();
}

function togglePin(id) {
    const shortcut = state.shortcuts.find(s => s.id === id);
    if (shortcut) {
        shortcut.pinned = !shortcut.pinned;
        saveShortcuts();
        renderShortcuts();
    }
}

function editShortcut(shortcut) {
    state.creatingShortcut = false;
    state.editingShortcut = shortcut;
    document.getElementById('edit-title').value = shortcut.title;
    document.getElementById('edit-url').value = shortcut.url;
    document.getElementById('edit-icon').value = shortcut.icon || '';
    document.getElementById('edit-modal').style.display = 'flex';
}

function saveEdit() {
    if (!state.editingShortcut) return;
    const title = document.getElementById('edit-title').value.trim();
    const urlInput = document.getElementById('edit-url').value.trim();
    const customIcon = document.getElementById('edit-icon').value.trim();
    const url = normalizeUrl(urlInput);
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }
    if (!title) {
        alert('Please enter a title');
        return;
    }
    const icon = customIcon || getFaviconUrl(url);
    if (state.creatingShortcut) {
        const newShortcut = {
            id: state.editingShortcut.id,
            title: title,
            url: url,
            icon: icon,
            pinned: false
        };
        state.shortcuts.push(newShortcut);
    } else {
        const shortcut = state.shortcuts.find(s => s.id === state.editingShortcut.id);
        if (shortcut) {
            shortcut.title = title;
            shortcut.url = url;
            shortcut.icon = customIcon || icon;
        }
    }
    saveShortcuts();
    renderShortcuts();
    closeEditModal();
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    state.editingShortcut = null;
    state.creatingShortcut = false;
}

function handleUrlInput(e) {
    const urlInput = e.target.value.trim();
    const titleInput = document.getElementById('edit-title');
    if (urlInputDebounceTimer) clearTimeout(urlInputDebounceTimer);
    urlInputDebounceTimer = setTimeout(() => {
        if (!urlInput) return;

        const normalizedUrl = normalizeUrl(urlInput);
        if (!normalizedUrl) return;

        const suggestedTitle = getCleanHostname(normalizedUrl);
        if (!suggestedTitle) return;

        const currentTitle = titleInput.value.trim();

        if (state.creatingShortcut) {
            if (!currentTitle) {
                titleInput.value = suggestedTitle;
            }
            return;
        }
        if (state.editingShortcut) {
            const originalSuggestedTitle = getCleanHostname(normalizeUrl(state.editingShortcut.url) || '');

            const titleWasAutoGenerated = !currentTitle ||
                currentTitle.toLowerCase() === originalSuggestedTitle.toLowerCase() ||
                currentTitle.toLowerCase() === state.editingShortcut.title.toLowerCase();

            if (titleWasAutoGenerated) {
                titleInput.value = suggestedTitle;
            }
        }
    }, 500);
}

// Wallpaper functions
function openWallpaperModal() {
    if (state.wallpapers.length >= 8) {
        alert('Maximum 8 wallpapers allowed');
        return;
    }
    document.getElementById('wallpaper-modal').style.display = 'flex';
    showWallpaperStep('wallpaper-step-1');
}

function showWallpaperStep(stepId) {
    document.querySelectorAll('.wallpaper-step').forEach(step => {
        step.style.display = 'none';
    });
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
        stepElement.style.display = 'block';
    }
}

function closeWallpaperModal() {
    document.getElementById('wallpaper-modal').style.display = 'none';
    tempWallpaperData = null;
}

function confirmWallpaper() {
    if (tempWallpaperData) {
        const newWallpaper = { id: Date.now(), url: tempWallpaperData };
        state.wallpapers.push(newWallpaper);
        saveWallpapers();
        state.currentWallpaper = tempWallpaperData;
        saveCurrentWallpaper();
        // this whole process of adding takes menu clicks.. so at least auto select it as well, maybe skip preview menu for file selection
        renderWallpapers();
        applyStyles();
        closeWallpaperModal();
    }
}

function deleteWallpaper(id) {
    const wallpaper = state.wallpapers.find(w => w.id === id);
    state.wallpapers = state.wallpapers.filter(w => w.id !== id);
    if (state.currentWallpaper === wallpaper.url) {
        state.currentWallpaper = null;
        saveCurrentWallpaper();
    }
    saveWallpapers();
    renderWallpapers();
    applyStyles();
}

function selectWallpaper(url) {
    state.currentWallpaper = url;
    saveCurrentWallpaper();
    renderWallpapers();
    applyStyles();
}

function removeCurrentWallpaper() {
    state.currentWallpaper = null;
    saveCurrentWallpaper();
    renderWallpapers();
    applyStyles();
}

// Context menu
function showContextMenu(e, shortcut) {
    const menu = document.getElementById('context-menu');
    const pinBtn = menu.querySelector('[data-action="pin"]');
    pinBtn.textContent = shortcut.pinned ? 'Unpin' : 'Pin';
    menu.style.display = 'block';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.dataset.shortcutId = shortcut.id;
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
}

// Settings functions
async function updateSetting(key, value) {
    if (state.activeTheme === 'default') {
        state.activeTheme = 'custom';
        state.settings.themeMode = 'custom';
        await dbSet('settings', 'activeTheme', 'custom');
    }
    
    state.settings[key] = value;
    await saveSettings();
    render();
}

function isValidCSSColor(color) {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
}

function toggleThemeControls() {
    state.settings.styleExpanded = !state.settings.styleExpanded;
    saveSettings();
    renderSettings();
}

async function saveThemeSettings() {
    const bgColor = document.getElementById('bg-color').value.trim();
    const fgColor = document.getElementById('fg-color').value.trim();
    const accentColor = document.getElementById('accent-color').value.trim();
    const borderRadius = parseInt(document.getElementById('border-radius').value);
    const animationSpeed = parseFloat(document.getElementById('animation-speed').value);
    const moreBlur = document.getElementById('ui-more-blur').checked;
    const shortcutTitlesHover = document.getElementById('shortcut-titles-hover').checked;
    const shortcutScaleHover = document.getElementById('shortcut-scale-hover').checked;
    
    console.log('Saving theme settings:', { bgColor, fgColor, accentColor, borderRadius, animationSpeed, moreBlur });
    
    if (state.activeTheme === 'default') {
        state.activeTheme = 'custom';
        await dbSet('settings', 'activeTheme', 'custom');
    }
    
    state.settings.customBgColor = bgColor;
    state.settings.customFgColor = fgColor;
    state.settings.customAccentColor = accentColor;
    
    if (!isNaN(borderRadius)) {
        state.settings.customBorderRadius = borderRadius;
    }
    if (!isNaN(animationSpeed)) {
        state.settings.customAnimationSpeed = animationSpeed;
    }
    
    state.settings.uiMoreBlur = moreBlur;
    state.settings.shortcutTitlesHover = shortcutTitlesHover;
    state.settings.shortcutScaleHover = shortcutScaleHover;
    state.settings.themeMode = state.activeTheme;
    
    await saveSettings();
    applyStyles();
    renderSettings();
    console.log('Theme settings applied!');
}

async function switchTheme(mode) {
    if (state.activeTheme === 'custom') {
        await dbSet('settings', `theme_${state.activeTheme}`, state.settings);
    }
    
    state.activeTheme = mode;
    await dbSet('settings', 'activeTheme', mode);
    
    const themeSettings = await dbGet('settings', `theme_${mode}`);
    
    if (themeSettings) {
        state.settings = { ...DEFAULT_SETTINGS, ...themeSettings };
    } else {
        state.settings = { ...DEFAULT_SETTINGS };
    }
    
    state.settings.themeMode = mode;
    render();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing IndexedDB...');
    await initDB();
    console.log('IndexedDB initialized');
    await loadData();

    document.getElementById('settings-btn').addEventListener('click', async () => {
        document.getElementById('settings-sidebar').classList.add('open');
        // lazy load wallpapers so they dont increase page load on launch
        if (state.wallpapers.length === 0) {
            console.log('lazy loading wallpapers..');
            const wallpapers = await dbGet('wallpapers', 'data');
            if (wallpapers) {
                state.wallpapers = wallpapers;
                renderWallpapers();
            }
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

    // Tabs button
    const tabsBtn = document.getElementById('tabs-btn');
    const closetabsBtn = document.getElementById('close-tabs-sidebar');
    if (tabsBtn) {
        tabsBtn.addEventListener('click', () => {
            document.getElementById('tabs-sidebar').classList.toggle('open');
        });
    }
    if (closetabsBtn) {
        closetabsBtn.addEventListener('click', () => {
            document.getElementById('tabs-sidebar').classList.toggle('open');
        });
    }

    // Wallpapers
    document.getElementById('add-wallpaper-btn').addEventListener('click', () => {
        openWallpaperModal();
    });
    
    document.getElementById('remove-wallpaper-btn').addEventListener('click', removeCurrentWallpaper);

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

    document.getElementById('tab-browser-mode').addEventListener('change', (e) => {
        const newMode = e.target.value;
        updateSetting('tabBrowserMode', newMode);
        window.tabsSidebarMode = newMode;
        if (window.updateTriggerVisibility) {
            window.updateTriggerVisibility(newMode);
        }
    });

    // Theme mode
    document.getElementById('theme-mode').addEventListener('change', (e) => {
        switchTheme(e.target.value);
    });

    // Theme controls toggle
    document.getElementById('theme-controls-toggle-btn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleThemeControls();
    });

    // Theme save button
    document.getElementById('theme-controls-save-btn').addEventListener('click', (e) => {
        e.preventDefault();
        saveThemeSettings();
        const savebtn = document.getElementById('theme-controls-save-btn');
        savebtn.textContent = "🗘";
        savebtn.style.textDecoration = "none";
        setTimeout(() => {
            savebtn.textContent = "Save";
            savebtn.style.textDecoration = "underline";
        }, 400);
    });

    // Theme management buttons
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

    document.getElementById('theme-controls-reset-btn').addEventListener('click', (e) => {
        e.preventDefault();
        resetEverything();
    });

    // Add theme modal
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

    // Export theme modal
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

    // Import theme modal
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

    // Import theme file input
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

    document.getElementById('confirm-reset').addEventListener('click', confirmReset);
    document.getElementById('cancel-reset').addEventListener('click', () => {
        document.getElementById('reset-modal').style.display = 'none';
    });
    document.getElementById('reset-modal').addEventListener('click', (e) => {
        if (e.target.id === 'reset-modal') {
            document.getElementById('reset-modal').style.display = 'none';
        }
    });

    // Import shortcuts mod
    document.getElementById('import-shortcuts-btn').addEventListener('click', () => {
        document.getElementById('import-shortcuts-modal').style.display = 'flex';
        document.getElementById('import-shortcuts-json').value = '';
        setTimeout(() => document.getElementById('import-shortcuts-json').focus(), 100);
    });
    document.getElementById('confirm-import-shortcuts').addEventListener('click', async () => {
        const jsonInput = document.getElementById('import-shortcuts-json').value.trim();
        if (!jsonInput) {
            alert('Please paste the shortcut data');
            return;
        }
        try {
            const pinnedSites = JSON.parse(jsonInput);
            if (!Array.isArray(pinnedSites) || pinnedSites.length === 0) {
                alert('Invalid data or no shortcut found');
                return;
            }
            const imported = [];
            for (const site of pinnedSites) {
                if (state.shortcuts.length >= state.settings.maxShortcuts) break;
                if (!site.url) continue;
                const exists = state.shortcuts.some(s => s.url === site.url);
                if (!exists) {
                    const newShortcut = {
                        id: Date.now() + imported.length,
                        title: site.label || getCleanHostname(site.url),
                        url: site.url,
                        icon: site.customScreenshotURL || getFaviconUrl(site.url),
                        pinned: false,
                        order: state.shortcuts.length
                    };
                    state.shortcuts.push(newShortcut);
                    imported.push(site.label || site.url);
                }
            }
            if (imported.length > 0) {
                await saveShortcuts();
                renderShortcuts();
                document.getElementById('import-shortcuts-modal').style.display = 'none';
                alert(`✓ Imported ${imported.length} shortcuts!`);
            } else {
                alert('Shortcuts already exist in the grid');
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to parse data');
        }
    });
    document.getElementById('cancel-import-shortcuts').addEventListener('click', () => {
        document.getElementById('import-shortcuts-modal').style.display = 'none';
    });
    document.getElementById('import-shortcuts-modal').addEventListener('click', (e) => {
        if (e.target.id === 'import-shortcuts-modal') {
            document.getElementById('import-shortcuts-modal').style.display = 'none';
        }
    });

    // Update value displays for sliders
    document.getElementById('border-radius').addEventListener('input', (e) => {
        document.getElementById('border-radius-value').textContent = e.target.value;
    });

    document.getElementById('animation-speed').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('animation-speed-value').textContent = value.toFixed(1);
    });

    // Label settings
    document.getElementById('greeting-type').addEventListener('change', (e) => {
        updateSetting('greetingType', e.target.value);
    });

    document.getElementById('user-name').addEventListener('input', (e) => {
        updateSetting('userName', e.target.value);
    });

    document.getElementById('label-font-size').addEventListener('input', (e) => {
        updateSetting('labelFontSize', parseInt(e.target.value));
    });

    document.getElementById('label-position').addEventListener('change', (e) => {
        updateSetting('labelPosition', e.target.value);
    });

    // Shortcuts settings
    document.getElementById('scaling').addEventListener('input', (e) => {
        updateSetting('scaling', parseInt(e.target.value));
    });

    document.getElementById('grid-columns').addEventListener('input', (e) => {
        updateSetting('gridColumns', parseInt(e.target.value));
    });

    document.getElementById('max-shortcuts').addEventListener('input', (e) => {
        updateSetting('maxShortcuts', parseInt(e.target.value));
    });

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

    const shortcutsContainer = document.querySelector('.shortcuts-container');
    if (shortcutsContainer) {
        shortcutsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        shortcutsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (state.shortcuts.length >= state.settings.maxShortcuts) {
                alert(`Maximum ${state.settings.maxShortcuts} shortcuts allowed`);
                return;
            }
            
            try {
                const tabData = JSON.parse(e.dataTransfer.getData('application/json'));
                if (tabData && tabData.url) {
                    createShortcutFromData(tabData.title, tabData.url, tabData.favIconUrl);
                    return;
                }
            } catch (error) {
            }
            
            let url = '';
            let title = '';
            
            // ff: text/x-moz-url format "URL\nTitle"
            const mozUrl = e.dataTransfer.getData('text/x-moz-url');
            if (mozUrl) {
                const lines = mozUrl.split('\n');
                url = lines[0]?.trim() || '';
                title = lines[1]?.trim() || '';
            }
            
            // chromium: try text/html
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
            
            // or: text/uri-list or text/plain
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

    function createShortcutFromData(title, url, iconUrl) {
        const cleanUrl = normalizeUrl(url);
        if (!cleanUrl) {
            console.error('Invalid URL dropped');
            return;
        }
        const newShortcut = {
            id: Date.now(),
            title: title || getCleanHostname(cleanUrl) || 'Untitled',
            url: cleanUrl,
            icon: iconUrl || getFaviconUrl(cleanUrl),
            pinned: false,
            order: state.shortcuts.length
        };
        state.shortcuts.push(newShortcut);
        saveShortcuts();
        renderShortcuts();
        console.log('✓ Shortcut created:', newShortcut.title);
    }

    document.getElementById('edit-url').addEventListener('input', handleUrlInput);

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
        } 
        else if (e.key === 'Escape') {
            e.preventDefault();
            closeEditModal();
        }
    });

    document.querySelectorAll('.wallpaper-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = e.currentTarget.dataset.type;
            
            if (type === 'file') {
                document.getElementById('wallpaper-file-input').click();
            } else if (type === 'url') {
                showWallpaperStep('wallpaper-step-url');
            } else if (type === 'color') {
                showWallpaperStep('wallpaper-step-color');
            }
        });
    });

    document.getElementById('wallpaper-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > 10) {
                alert(`This image's file size is ${fileSizeMB.toFixed(1)}MB, under 10MB is the recommended limit.`);
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                tempWallpaperData = event.target.result;
                const preview = document.getElementById('wallpaper-preview');
                preview.style.backgroundImage = `url(${tempWallpaperData})`;
                preview.style.backgroundColor = '';
                showWallpaperStep('wallpaper-step-preview');
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    });

    document.getElementById('wallpaper-url-next').addEventListener('click', (e) => {
        e.preventDefault();
        const url = document.getElementById('wallpaper-url-input').value.trim();
        if (url) {
            tempWallpaperData = url;
            const preview = document.getElementById('wallpaper-preview');
            preview.style.backgroundImage = `url(${url})`;
            preview.style.backgroundColor = '';
            showWallpaperStep('wallpaper-step-preview');
        }
    });

    document.getElementById('wallpaper-url-back').addEventListener('click', (e) => {
        e.preventDefault();
        showWallpaperStep('wallpaper-step-1');
    });

    document.getElementById('wallpaper-color-input').addEventListener('input', (e) => {
        tempWallpaperData = e.target.value;
    });

    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const color = e.target.dataset.color;
            document.getElementById('wallpaper-color-input').value = color;
            tempWallpaperData = color;
        });
    });

    document.getElementById('wallpaper-color-next').addEventListener('click', (e) => {
        e.preventDefault();
        if (!tempWallpaperData) {
            tempWallpaperData = document.getElementById('wallpaper-color-input').value;
        }
        const preview = document.getElementById('wallpaper-preview');
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = tempWallpaperData;
        showWallpaperStep('wallpaper-step-preview');
    });

    document.getElementById('wallpaper-color-back').addEventListener('click', (e) => {
        e.preventDefault();
        showWallpaperStep('wallpaper-step-1');
    });

    document.getElementById('wallpaper-confirm').addEventListener('click', (e) => {
        e.preventDefault();
        confirmWallpaper();
    });
    
    document.getElementById('wallpaper-preview-back').addEventListener('click', (e) => {
        e.preventDefault();
        closeWallpaperModal();
    });

    document.getElementById('cancel-wallpaper').addEventListener('click', (e) => {
        e.preventDefault();
        closeWallpaperModal();
    });

    document.getElementById('wallpaper-modal').addEventListener('click', (e) => {
        if (e.target.id === 'wallpaper-modal') {
            closeWallpaperModal();
        }
    });

    setInterval(renderGreeting, 60000);
    
    console.log('All event listeners attached');

    const isInitted = sessionStorage.getItem('isInitted') === 'true';
    if (!isInitted) {
        setTimeout(() => { // after 5 seconds we can consider the page init. this will be used for animate-launch, and in the future can be used for extension first run tutorial
            document.body.setAttribute('initted');
            sessionStorage.setItem('isInitted', 'true');
        }, 5000);
    }

});