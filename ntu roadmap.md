# 🗺️ ROADMAP.MD - New Tab Ultra Refactoring

**Goal**: Modularize codebase for scalability, maintainability, and performance  
**Timeline**: 3-4 weeks  
**Risk Level**: Low (incremental, testable changes)

---

## Phase 1: Extract Utilities & Core (Week 1)

### Day 1-2: Extract URL Helpers

**Create**: `/js/utils/url-helpers.js`

```javascript
// url-helpers.js
export function getCleanHostname(url) {
    // Move existing function
}

export function getFaviconUrl(url) {
    // Move existing function
}

export function normalizeUrl(url) {
    // Move existing function
}
```

**Update**: `index.js`
```javascript
import { getCleanHostname, getFaviconUrl, normalizeUrl } from './utils/url-helpers.js';
```

**Test Checklist**:
- [ ] Shortcut creation works
- [ ] Import shortcuts works
- [ ] Edit shortcut works

---

### Day 3-4: Extract State Management

**Create**: `/js/core/state.js`

```javascript
// state.js
export const DEFAULT_SETTINGS = {
    // Move entire DEFAULT_SETTINGS object
};

export let state = {
    shortcuts: [],
    wallpapers: [],
    currentWallpaper: null,
    settings: { ...DEFAULT_SETTINGS },
    activeTheme: 'default',
    themeList: ['default', 'custom'],
    editingShortcut: null,
    creatingShortcut: false
};

// Helper to update state (optional but recommended)
export function updateState(key, value) {
    state[key] = value;
}
```

**Update**: `index.js`
```javascript
import { state, DEFAULT_SETTINGS } from './js/core/state.js';
```

**Test Checklist**:
- [ ] All settings load correctly
- [ ] Theme switching works
- [ ] Shortcuts persist

---

### Day 5-7: Extract Database Layer

**Create**: `/js/core/database.js`

```javascript
// database.js
import { state, DEFAULT_SETTINGS } from './state.js';

let db;

export async function initDB() {
    // Move entire initDB function
}

export async function dbGet(storeName, key) {
    // Move function
}

export async function dbSet(storeName, key, value) {
    // Move function
}

export async function dbDelete(storeName, key) {
    // Move function
}

export async function loadData() {
    // Move loadData function
    // Keep render() call at end
}

export async function saveShortcuts() {
    // Move function
}

export async function saveWallpapers() {
    // Move function
}

export async function saveSettings() {
    // Move function
}

export async function saveCurrentWallpaper() {
    // Move function
}

export async function saveThemeList() {
    // Move function
}
```

**Update**: `index.js`
```javascript
import { initDB, loadData, saveShortcuts, saveSettings, /* etc */ } from './core/database.js';
```

**Test Checklist**:
- [ ] Data persists across page reloads
- [ ] Import/export works
- [ ] Settings save correctly
- [ ] Extension sync works (if applicable)

---

## Phase 2: Extract Feature Modules (Week 2-3)

### Week 2, Day 1-3: Extract Shortcuts Module

**Create**: `/js/modules/shortcuts/shortcuts.js`

```javascript
// shortcuts.js
import { state } from '../../core/state.js';
import { saveShortcuts } from '../../core/database.js';
import { normalizeUrl, getCleanHostname, getFaviconUrl } from '../../utils/url-helpers.js';

export function renderShortcuts() {
    // Move renderShortcuts function
}

export function addShortcut() {
    // Move function
}

export function deleteShortcut(id) {
    // Move function
}

export function togglePin(id) {
    // Move function
}

export function editShortcut(shortcut) {
    // Move function
}

export function saveEdit() {
    // Move function
}

export function closeEditModal() {
    // Move function
}

export function handleUrlInput(e) {
    // Move function
}

function createShortcutFromData(title, url, iconUrl) {
    // Move function (keep internal)
}
```

**Create**: `/js/modules/shortcuts/shortcuts-io.js`

```javascript
// shortcuts-io.js
import { state } from '../../core/state.js';
import { saveShortcuts } from '../../core/database.js';
import { normalizeUrl, getCleanHostname, getFaviconUrl } from '../../utils/url-helpers.js';

export function parseShortcutsText(text) {
    // Move function
}

export async function importShortcuts(shortcuts) {
    // Move function
}

export async function importFromFirefox(pinnedSites) {
    // Move function
}

export function exportShortcutsText() {
    // Move function
}

export async function exportShortcutsToFile() {
    // Move function
}

export async function exportShortcutsToClipboard() {
    // Move function
}
```

**Create**: `/js/modules/shortcuts/shortcuts-ui.js`

```javascript
// shortcuts-ui.js
import { renderShortcuts, addShortcut, editShortcut, deleteShortcut, togglePin, saveEdit, closeEditModal, handleUrlInput } from './shortcuts.js';
import { importShortcuts, importFromFirefox, exportShortcutsToFile, exportShortcutsToClipboard, parseShortcutsText } from './shortcuts-io.js';

export function initShortcutsUI() {
    // All event listeners for shortcuts
    // Context menu, edit modal, drag/drop container, etc.
    
    document.getElementById('edit-url').addEventListener('input', handleUrlInput);
    
    document.getElementById('save-edit').addEventListener('click', saveEdit);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    
    // ... all other shortcuts-related event listeners
}

export function initShortcutsImportExport() {
    // All import/export event listeners
    
    document.getElementById('import-shortcuts-btn').addEventListener('click', () => {
        // ... existing code
    });
    
    // ... all other import/export listeners
}
```

**Update**: `index.js`
```javascript
import { renderShortcuts } from './modules/shortcuts/shortcuts.js';
import { initShortcutsUI, initShortcutsImportExport } from './modules/shortcuts/shortcuts-ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadData();
    
    // Init UI
    initShortcutsUI();
    initShortcutsImportExport();
});
```

**Test Checklist**:
- [ ] Add/edit/delete shortcuts works
- [ ] Context menu works
- [ ] Import/export works
- [ ] Drag & drop still works
- [ ] Pinning works

---

### Week 2, Day 4-5: Extract Label Module

**Create**: `/js/modules/label/label.js`

```javascript
// label.js
import { state } from '../../core/state.js';

export function renderLabel() {
    // Move renderLabel function
}
```

**Create**: `/js/modules/label/label-ui.js`

```javascript
// label-ui.js
import { updateSetting } from '../../core/database.js';

export function initLabelUI() {
    // Label settings event listeners
    
    document.getElementById('label-position').addEventListener('change', (e) => {
        updateSetting('labelPosition', e.target.value);
    });
    
    document.getElementById('content-type').addEventListener('change', (e) => {
        updateSetting('labelContent', e.target.value);
    });
    
    document.getElementById('label-style').addEventListener('change', (e) => {
        updateSetting('labelStyle', e.target.value);
    });
    
    document.getElementById('user-name').addEventListener('input', (e) => {
        updateSetting('userName', e.target.value);
    });
    
    document.getElementById('label-font-size').addEventListener('input', (e) => {
        updateSetting('labelFontSize', parseInt(e.target.value));
    });
}
```

**Test Checklist**:
- [ ] Label displays correctly
- [ ] Time updates every minute
- [ ] All label settings work
- [ ] Greetings rotate properly

---

### Week 3, Day 1-5: Extract Wallpapers & Themes (Lazy Loaded)

**Create**: `/js/modules/wallpapers/wallpapers.js`

```javascript
// wallpapers.js
import { state } from '../../core/state.js';
import { saveWallpapers, saveCurrentWallpaper } from '../../core/database.js';

export function renderWallpapers() {
    // Move function
}

export function selectWallpaper(url) {
    // Move function
}

export function deleteWallpaper(id) {
    // Move function
}

export function removeCurrentWallpaper() {
    // Move function
}

// ... other wallpaper functions
```

**Create**: `/js/modules/wallpapers/wallpapers-ui.js`

```javascript
// wallpapers-ui.js (LAZY LOADED)
import { renderWallpapers, selectWallpaper, deleteWallpaper, openWallpaperModal /* etc */ } from './wallpapers.js';

export function initWallpapersUI() {
    // All wallpaper event listeners
    
    document.getElementById('add-wallpaper-btn').addEventListener('click', openWallpaperModal);
    document.getElementById('remove-wallpaper-btn').addEventListener('click', removeCurrentWallpaper);
    
    // ... all wallpaper modal listeners
}
```

**Create**: `/js/modules/themes/themes.js`

```javascript
// themes.js
import { state, DEFAULT_SETTINGS } from '../../core/state.js';
import { dbSet, dbDelete, dbGet, saveThemeList, saveSettings } from '../../core/database.js';

export function sanitizeThemeName(name) {
    // Move function
}

export function validateThemeName(name) {
    // Move function
}

export async function addTheme() {
    // Move function
}

export async function removeTheme() {
    // Move function
}

export async function switchTheme(mode) {
    // Move function
}

export async function exportTheme() {
    // Move function
}

export async function importTheme() {
    // Move function
}

// ... all theme functions
```

**Create**: `/js/modules/themes/themes-ui.js`

```javascript
// themes-ui.js (LAZY LOADED)
import { addTheme, removeTheme, exportTheme, importTheme, switchTheme } from './themes.js';

export function initThemesUI() {
    // All theme event listeners
    
    document.getElementById('theme-mode').addEventListener('change', (e) => {
        switchTheme(e.target.value);
    });
    
    document.getElementById('theme-controls-add-btn').addEventListener('click', addTheme);
    document.getElementById('theme-controls-remove-btn').addEventListener('click', removeTheme);
    
    // ... all theme-related listeners
}
```

**Test Checklist**:
- [ ] Wallpapers add/delete/select
- [ ] Theme switching works
- [ ] Theme import/export works
- [ ] Custom theme colors apply

---

## Phase 3: Modal Manager & Lazy Loading (Week 3-4)

### Day 1-2: Create Modal Manager

**Create**: `/js/core/modal-manager.js`

```javascript
// modal-manager.js
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
```

**Usage Example** (in any UI module):
```javascript
import { ModalManager } from '../../core/modal-manager.js';

export function openEditModal(shortcut) {
    // Set values
    document.getElementById('edit-title').value = shortcut.title;
    
    // Show modal
    ModalManager.show('edit-modal');
}

export function initEditModal() {
    ModalManager.bindConfirm('save-edit', saveEdit);
    ModalManager.bindCancel('cancel-edit', () => ModalManager.hide('edit-modal'));
    ModalManager.onClickOutside('edit-modal', () => ModalManager.hide('edit-modal'));
}
```

**Test Checklist**:
- [ ] All modals open/close correctly
- [ ] Click-outside works for all modals
- [ ] Escape key closes modals (if applicable)

---

### Day 3-5: Implement Lazy Loading

**Update**: `index.js` - Add lazy loading for settings

```javascript
// index.js
let settingsModulesLoaded = false;

document.getElementById('settings-btn').addEventListener('click', async () => {
    document.getElementById('settings-sidebar').classList.add('open');
    
    // Lazy load wallpapers data
    if (state.wallpapers.length === 0) {
        const wallpapers = await dbGet('wallpapers', 'data');
        if (wallpapers) {
            state.wallpapers = wallpapers;
        }
    }
    
    // Lazy load settings modules (ONE TIME ONLY)
    if (!settingsModulesLoaded) {
        console.log('Loading settings modules...');
        
        const [
            { initWallpapersUI },
            { initThemesUI },
            { renderWallpapers }
        ] = await Promise.all([
            import('./modules/wallpapers/wallpapers-ui.js'),
            import('./modules/themes/themes-ui.js'),
            import('./modules/wallpapers/wallpapers.js')
        ]);
        
        initWallpapersUI();
        initThemesUI();
        renderWallpapers();
        
        settingsModulesLoaded = true;
        console.log('Settings modules loaded!');
    }
});
```

**Test Checklist**:
- [ ] First settings open: modules load (~30ms delay)
- [ ] Second settings open: instant (already loaded)
- [ ] No broken functionality
- [ ] Console shows "Settings modules loaded!" only once

---

## Phase 4: Final Cleanup & Documentation (Week 4)

### Day 1-2: Code Review & Cleanup

**Tasks**:
- [ ] Remove all unused imports
- [ ] Verify no duplicate code exists
- [ ] Check console for warnings/errors
- [ ] Update all file paths in HTML

---

### Day 3-4: Performance Testing

**Metrics to Track**:
- [ ] Initial page load time
- [ ] Time to interactive
- [ ] Settings sidebar open time
- [ ] Memory usage

**Expected Results**:
- Initial load: -40% JS parse time
- Settings open: +30-50ms (acceptable)
- Memory: Similar or slightly lower

---

### Day 5: Update Documentation

**Create/Update**:
1. `README.md` - Update project structure
2. `ARCHITECTURE.md` - Document module system
3. `CONTRIBUTING.md` - Explain how to add new features

**Example `ARCHITECTURE.md`**:

```markdown
# Architecture

## Module Structure

- `core/` - Foundational systems (state, database, modals)
- `modules/` - Feature modules (shortcuts, wallpapers, themes, label)
- `utils/` - Reusable utilities
- `index.js` - Main orchestrator

## Adding a New Feature

1. Create module in `modules/your-feature/`
2. Export functions from `your-feature.js`
3. Create UI handlers in `your-feature-ui.js`
4. Import and init in `index.js`

## Lazy Loading

Features that are rarely used (settings-related) are lazy loaded:
- Only loaded when settings sidebar opens
- Modules: wallpapers-ui, themes-ui
```

---

## Migration Checklist (Complete Project)

### Core Files
- [ ] `/js/core/state.js` created
- [ ] `/js/core/database.js` created
- [ ] `/js/core/modal-manager.js` created

### Utils
- [ ] `/js/utils/url-helpers.js` created
- [ ] `/js/utils/dom-helpers.js` created (if needed)

### Shortcuts Module
- [ ] `/js/modules/shortcuts/shortcuts.js` created
- [ ] `/js/modules/shortcuts/shortcuts-io.js` created
- [ ] `/js/modules/shortcuts/shortcuts-ui.js` created

### Label Module
- [ ] `/js/modules/label/label.js` created
- [ ] `/js/modules/label/label-ui.js` created

### Wallpapers Module
- [ ] `/js/modules/wallpapers/wallpapers.js` created
- [ ] `/js/modules/wallpapers/wallpapers-ui.js` created

### Themes Module
- [ ] `/js/modules/themes/themes.js` created
- [ ] `/js/modules/themes/themes-ui.js` created

### Index.js Cleanup
- [ ] Reduced to 150-200 lines
- [ ] Only contains: init, render, lazy loading logic
- [ ] All features delegated to modules

### Testing
- [ ] All shortcuts features work
- [ ] All label features work
- [ ] All wallpaper features work
- [ ] All theme features work
- [ ] Import/export all work
- [ ] Extension sync works (if applicable)
- [ ] No console errors

---

## Rollback Plan (If Things Go Wrong)

**Git Strategy**:
```bash
# Before starting each phase:
git checkout -b phase-1-utilities
# ... make changes ...
git commit -m "Phase 1: Extract utilities"

# If issues arise:
git checkout main  # Rollback to last working state
```

**Backup Strategy**:
- Keep old `index.js` as `index.legacy.js` until all testing passes
- Test in Firefox + Chrome extensions before deploying
- Manual test every feature after each phase

---

## Success Metrics

**Before Refactor**:
- index.js: 1,800 lines
- Initial load: ~20ms parse time
- Settings open: instant (already loaded)
- Maintainability: 6/10

**After Refactor**:
- index.js: 150-200 lines
- Initial load: ~8ms parse time (-60%)
- Settings open: ~30ms first time, instant after
- Maintainability: 9/10
- New feature velocity: +50% faster

---

## Final Module Structure

```
/js/
├── core/
│   ├── state.js
│   ├── database.js
│   └── modal-manager.js
│
├── modules/
│   ├── shortcuts/
│   │   ├── shortcuts.js
│   │   ├── shortcuts-io.js
│   │   └── shortcuts-ui.js
│   │
│   ├── wallpapers/
│   │   ├── wallpapers.js
│   │   └── wallpapers-ui.js
│   │
│   ├── themes/
│   │   ├── themes.js
│   │   └── themes-ui.js
│   │
│   └── label/
│       ├── label.js
│       └── label-ui.js
│
├── utils/
│   ├── url-helpers.js
│   └── dom-helpers.js
│
├── shortcuts-dragdrop.js
├── tabs-sidebar.js
├── sync.js
└── index.js (150-200 lines)
```

---

**END OF ROADMAP**