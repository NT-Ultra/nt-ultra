import { state } from '../core/state.js';
import { saveTrackers } from '../core/database.js';
import { fetchTrackerUpdate } from './trackers-fetchers.js';

let refreshInterval = null;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function renderTrackers() {
    const grid = document.getElementById('trackers-grid');
    const count = document.getElementById('trackers-count');
    if (!grid) return;
    // count.textContent = state.trackers.length;
    count.textContent = `${state.trackers.length}/${state.settings.trackerMaxLimit}`;
    grid.innerHTML = '';
    if (state.trackers.length === 0) {
        grid.innerHTML = `
            <div class="trackers-empty">
                <h3>Nothing to track</h3>
                <p>Add your first tracker to stay updated on things like RSS feeds,<br>github activity, youtube channels, reddit posts, subreddits, and more.</p>
            </div>
        `;
        return;
    }
    state.trackers.forEach(tracker => {
        const item = createTrackerItem(tracker);
        grid.appendChild(item);
    });
}

function createTrackerItem(tracker) {
    const div = document.createElement('div');
    div.className = 'tracker-item';
    div.dataset.trackerId = tracker.id;
    div.dataset.source = getTrackerSource(tracker);
    const oneHour = 60 * 60 * 1000;
    if (tracker.lastUpdate && (Date.now() - tracker.lastUpdate < oneHour)) {
        div.classList.add('new');
    }
    const typeIcon = document.createElement('img');
    typeIcon.className = 'tracker-type-icon';
    typeIcon.src = getFaviconUrl(tracker);
    typeIcon.onerror = function() {
        const fallback = document.createElement('div');
        fallback.className = 'tracker-type-icon tracker-type-icon-fallback';
        fallback.textContent = getTrackerIcon();
        this.replaceWith(fallback);
    };
    div.appendChild(typeIcon);

    if (div.classList.contains('new')) {
        const badge = document.createElement('span');
        badge.className = 'tracker-badge';
        badge.textContent = 'NEW';
        div.appendChild(badge);
    }
    
    const info = document.createElement('div');
    info.className = 'tracker-info';
    const title = document.createElement('div');
    title.className = 'tracker-title';
    title.textContent = tracker.title || 'Untitled Tracker';
    const description = document.createElement('div');
    description.className = 'tracker-description';
    description.textContent = tracker.lastItemTitle || 'Checking for updates...';
    const meta = document.createElement('div');
    meta.className = 'tracker-meta';
    const displayTime = tracker.lastItemPubDate || tracker.lastChecked || Date.now();
    const typeLabel = getTrackerTypeLabel(tracker.type, tracker.url);
    meta.textContent = `${typeLabel} • ${formatDate(displayTime)}`;
    
    info.appendChild(title);
    info.appendChild(description);
    info.appendChild(meta);
    div.appendChild(info);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tracker-delete';
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTracker(tracker.id);
    });
    div.appendChild(deleteBtn);
    
    div.addEventListener('click', () => {
        openTracker(tracker);
    });
    return div;
}

function getTrackerSource(tracker) {
    try {
        if (tracker.type === 'crypto') return 'crypto';
        if (tracker.type === 'weather') return 'weather';
        if (tracker.type === 'stock') return 'stock';
        if (tracker.type === 'twitch') return 'twitch';
        
        const url = new URL(tracker.url);
        const hostname = url.hostname.replace('www.', '');
        if (hostname.includes('youtube.com')) return 'youtube';
        if (hostname.includes('reddit.com')) return 'reddit';
        if (hostname.includes('github.com')) return 'github';
        if (hostname.includes('twitch.tv')) return 'twitch';
        if (hostname.includes('medium.com')) return 'medium';
        if (hostname.includes('dev.to')) return 'devto';
        if (hostname.includes('substack.com')) return 'substack';
        if (hostname.includes('mastodon')) return 'mastodon';
        return hostname.split('.')[0];
    } catch (error) {
        return 'unknown';
    }
}

function getFaviconUrl(tracker) {
    try {
        if (tracker.type === 'crypto') {
            return `https://www.google.com/s2/favicons?domain=coingecko.com&sz=64`;
        }
        if (tracker.type === 'weather') {
            return `https://www.google.com/s2/favicons?domain=weather.com&sz=64`;
        }
        if (tracker.type === 'stock') {
            return `https://www.google.com/s2/favicons?domain=finance.yahoo.com&sz=64`;
        }
        if (tracker.type === 'twitch') {
            return `https://www.google.com/s2/favicons?domain=twitch.tv&sz=64`;
        }
        
        const url = new URL(tracker.url);
        if (url.hostname.includes('youtube.com')) {
            return `https://www.google.com/s2/favicons?domain=youtube.com&sz=64`;
        }
        if (url.hostname.includes('reddit.com')) {
            return `https://www.google.com/s2/favicons?domain=reddit.com&sz=64`;
        }
        if (url.hostname.includes('github.com')) {
            return `https://www.google.com/s2/favicons?domain=github.com&sz=64`;
        }
        if (url.hostname.includes('medium.com')) {
            return `https://www.google.com/s2/favicons?domain=medium.com&sz=64`;
        }
        if (url.hostname.includes('dev.to')) {
            return `https://www.google.com/s2/favicons?domain=dev.to&sz=64`;
        }
        if (url.hostname.includes('substack.com')) {
            return `https://www.google.com/s2/favicons?domain=substack.com&sz=64`;
        }
        if (url.hostname.includes('mastodon')) {
            return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
        }
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch (error) {
        return '';
    }
}

function getTrackerIcon() {
    return '💬';
}

function getTrackerTypeLabel(type, url) {
    if (type === 'rss' && url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.replace('www.', '');
            if (hostname.includes('reddit.com')) {
                if (urlObj.pathname.includes('/comments/')) {
                    return 'Reddit Post';
                }
                if (urlObj.pathname.match(/^\/r\/[^/]+(\/.rss)?$/)) {
                    return 'Subreddit';
                }
                return 'Reddit';
            }
        } catch (e) {
            console.error('getTrackerTypeLabel:', e);
        }
    }
    const labels = {
        'rss': 'RSS Feed',
        'youtube': 'YouTube Channel',
        'github-commits': 'GitHub Commits',
        'github-releases': 'GitHub Releases',
        'github-issues': 'GitHub Issues',
        'github-discussions': 'GitHub Discussions',
        'twitch': 'Twitch Stream',
        'crypto': 'Cryptocurrency',
        'weather': 'Weather',
        'stock': 'Stock Price',
        'medium': 'Medium Author',
        'devto': 'Dev.to Author',
        'substack': 'Substack Newsletter',
        'mastodon': 'Mastodon User'
    };
    return labels[type] || 'RSS Feed';
}

function formatDate(timestamp) {
    if (!timestamp) return 'Never checked';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function openTracker(tracker) {
    if (tracker.lastItemLink) {
        window.open(tracker.lastItemLink, '_blank');
    } else if (tracker.url) {
        window.open(tracker.url, '_blank');
    }
}

export function deleteTracker(id) {
    state.trackers = state.trackers.filter(t => t.id !== id);
    saveTrackers();
    renderTrackers();
}

export async function addTracker(trackerData) {
    if (state.trackers.length >= state.settings.trackerMaxLimit) {
        alert(`You've reached your limit (${state.settings.trackerMaxLimit} trackers). Delete one to add more.`);
        return;
    }
    const newTracker = {
        id: Date.now(),
        type: trackerData.type,
        url: trackerData.url,
        title: trackerData.title || 'New Tracker',
        lastChecked: null,
        lastUpdate: null,
        lastItemTitle: null,
        lastItemLink: null,
        lastItemPubDate: null,
        updateInterval: 300000
    };
    state.trackers.push(newTracker);
    await saveTrackers();
    renderTrackers();
    await updateTracker(newTracker.id);
}

export async function updateTracker(trackerId) {
    const tracker = state.trackers.find(t => t.id === trackerId);
    if (!tracker) return;
    try {
        const data = await fetchTrackerUpdate(tracker);
        if (!data) {
            console.warn(`updateTracker: failed for ${trackerId}`); //atention
            tracker.lastChecked = Date.now();
            await saveTrackers();
            return;
        }
        const isNewItem = !tracker.lastItemPubDate || data.pubDate > tracker.lastItemPubDate;
        tracker.title = data.feedTitle || tracker.title;
        tracker.lastItemTitle = data.title;
        tracker.lastItemLink = data.link;
        tracker.lastItemPubDate = data.pubDate;
        tracker.lastChecked = Date.now();
        if (isNewItem) {
            // tracker.lastUpdate = Date.now();
            tracker.lastUpdate = data.pubDate;
            // console.log(`updateTracker: ${tracker.title}`);
        }
        await saveTrackers();
        renderTrackers();
    } catch (error) {
        console.error(`updateTracker: failed for ${trackerId}:`, error);
        tracker.lastChecked = Date.now();
        await saveTrackers();
    }
}

export async function updateAllTrackers() {
    for (const tracker of state.trackers) {
        await updateTracker(tracker.id);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

export function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    setTimeout(() => updateAllTrackers(), 2000);
    refreshInterval = setInterval(() => {
        updateAllTrackers();
    }, REFRESH_INTERVAL_MS);
}

export function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

export function applyTrackerButton() {
    const btn = document.getElementById('trackers-btn');
    if (!btn) return;
    if (state.settings.displayTrackers) {
        btn.style.display = 'flex';
        startAutoRefresh();
    } else {
        btn.style.display = 'none';
        stopAutoRefresh();
    }
}