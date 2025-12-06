import { addTracker, renderTrackers } from './trackers.js';
import { ModalManager } from '../core/modal-manager.js';

export function initTrackersUI() {
    const trackersBtn = document.getElementById('trackers-btn');
    const trackersSidebar = document.getElementById('trackers-sidebar');
    const closeTrackers = document.getElementById('close-trackers');
    const addTrackerBtn = document.getElementById('add-tracker-btn');
    if (trackersBtn) {
        trackersBtn.addEventListener('click', () => {
            trackersSidebar?.classList.toggle('open');
        });
    }
    if (closeTrackers) {
        closeTrackers.addEventListener('click', () => {
            trackersSidebar?.classList.remove('open');
        });
    }
    if (trackersSidebar) {
        trackersSidebar.addEventListener('click', (e) => {
            if (e.target.id === 'trackers-sidebar') {
                trackersSidebar.classList.remove('open');
            }
        });
    }
    if (addTrackerBtn) {
        addTrackerBtn.addEventListener('click', () => {
            openAddTrackerModal();
        });
    }
    setupModalHandlers();
    console.log('trackers-ui: modules loaded...');
}

function openAddTrackerModal() {
    const urlInput = document.getElementById('tracker-url');
    const titleInput = document.getElementById('tracker-title');
    const typeDisplay = document.getElementById('tracker-type-display');
    if (urlInput) urlInput.value = '';
    if (titleInput) titleInput.value = '';
    if (typeDisplay) typeDisplay.textContent = 'Enter a URL to auto-detect';
    ModalManager.show('add-tracker-modal');
    setTimeout(() => {
        if (urlInput) urlInput.focus();
    }, 100);
}

function setupModalHandlers() {
    const saveBtn = document.getElementById('save-tracker');
    const cancelBtn = document.getElementById('cancel-tracker');
    const urlInput = document.getElementById('tracker-url');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            handleAddTracker();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            ModalManager.hide('add-tracker-modal');
        });
    }
    ModalManager.onClickOutside('add-tracker-modal', () => {
        ModalManager.hide('add-tracker-modal');
    });
    let debounceTimer;
    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateTypeDisplay(e.target.value);
            }, 300);
        });
    }
}

async function updateTypeDisplay(url) {
    const typeDisplay = document.getElementById('tracker-type-display');
    if (!typeDisplay) return;
    if (!url || url.trim() === '') {
        typeDisplay.textContent = 'Enter a URL to auto-detect';
        return;
    }
    try {
        const detected = await detectTrackerType(url);
        const urlObj = detected.url.startsWith('http') ? new URL(detected.url) : null;
        if (detected.type === 'rss') {
            if (urlObj && urlObj.hostname.includes('reddit.com')) {
                if (urlObj.pathname.includes('/comments/')) {
                    typeDisplay.textContent = 'Reddit Post';
                } else {
                    typeDisplay.textContent = 'Subreddit';
                }
            } else {
                typeDisplay.textContent = 'RSS Feed';
            }
        } else {
            const typeLabels = {
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
            typeDisplay.textContent = typeLabels[detected.type] || 'RSS Feed';
        }
    } catch (e) {
        typeDisplay.textContent = 'Invalid URL';
    }
}

function normalizeUrl(url) {
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    return url;
}

async function getYouTubeChannelId(username) {
    try {
        const pageUrl = `https://www.youtube.com/@${username}`;
        const response = await fetch(pageUrl);
        const html = await response.text();
        const patterns = [
            /"channelId":"(UC[^"]+)"/,
            /"browseId":"(UC[^"]+)"/,
            /channel\/(UC[A-Za-z0-9_-]+)/
        ];
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) return match[1];
        }
        throw new Error('getYouTubeChannelId: could not scrape channel ID');
    } catch (error) {
        throw new Error(`getYouTubeChannelId: Could not find channel ID for @${username}. Try entering the channel as: youtube.com/channel/UC...`);
    }
}
async function detectTrackerType(url) {
    try {
        const originalUrl = url.trim();
        const cryptoMap = {
            'bitcoin': 'bitcoin',
            'btc': 'bitcoin',
            'ethereum': 'ethereum',
            'eth': 'ethereum',
            'cardano': 'cardano',
            'ada': 'cardano',
            'ripple': 'ripple',
            'xrp': 'ripple',
            'dogecoin': 'dogecoin',
            'doge': 'dogecoin',
            'solana': 'solana',
            'sol': 'solana',
            'polkadot': 'polkadot',
            'dot': 'polkadot',
            'litecoin': 'litecoin',
            'ltc': 'litecoin'
        }; // 0.6
        if (cryptoMap[originalUrl.toLowerCase()]) {
            return { 
                type: 'crypto', 
                url: cryptoMap[originalUrl.toLowerCase()]
            };
        }
        const weatherPatterns = [
            /^weather\s+(?:in|for)\s+(.+)$/i,
            /^(.+)\s+weather$/i,
            /^weather\s+(.+)$/i
        ];
        for (const pattern of weatherPatterns) {
            const match = originalUrl.match(pattern);
            if (match) {
                const location = match[1].trim();
                return { type: 'weather', url: location };
            }
        }
        if (/^[A-Z]{1,5}$/.test(originalUrl)) {
            return { type: 'stock', url: originalUrl };
        }
        url = normalizeUrl(url);
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const pathname = urlObj.pathname;
        if (hostname.includes('twitch.tv')) {
            const username = pathname.split('/').filter(Boolean)[0];
            if (username) {
                return { type: 'twitch', url: username };
            }
        }
        if (hostname.includes('medium.com') && pathname.includes('/@')) {
            return { 
                type: 'medium', 
                url: `https://medium.com/feed${pathname.split('?')[0]}` 
            };
        }
        if (hostname.includes('dev.to')) {
            const username = pathname.split('/').filter(Boolean)[0];
            if (username) {
                return { 
                    type: 'devto', 
                    url: `https://dev.to/feed/${username}` 
                };
            }
        }
        if (hostname.includes('substack.com')) {
            let baseUrl = url.split('?')[0].replace(/\/$/, '');
            return { 
                type: 'substack', 
                url: `${baseUrl}/feed` 
            };
        }
        if (hostname.includes('mastodon') && pathname.includes('/@')) {
            let cleanUrl = url.split('?')[0].replace(/\/$/, '');
            return { 
                type: 'mastodon', 
                url: `${cleanUrl}.rss` 
            };
        }
        if (hostname.includes('youtube.com')) {
            if (pathname.includes('/@')) {
                const username = pathname.split('/@')[1].split('/')[0];
                const channelId = await getYouTubeChannelId(username);
                return { 
                    type: 'youtube', 
                    url: `https://www.youtube.com/channel/${channelId}` 
                };
            }
            if (pathname.includes('/channel/')) {
                const channelId = pathname.split('/channel/')[1].split('/')[0].split('?')[0];
                return { 
                    type: 'youtube', 
                    url: `https://www.youtube.com/channel/${channelId}` 
                };
            }
        }
        if (hostname.includes('github.com')) {
            if (pathname.includes('/commits') || pathname.match(/^\/[^/]+\/[^/]+\/?$/)) {
                return { type: 'github-commits', url: url.split('/commits')[0].split('?')[0] };
            }
            if (pathname.includes('/releases')) {
                return { type: 'github-releases', url: url.split('/releases')[0].split('?')[0] };
            }
            if (pathname.includes('/issues')) {
                return { type: 'github-issues', url: url.split('/issues')[0].split('?')[0] };
            }
            if (pathname.includes('/discussions')) {
                return { type: 'github-discussions', url: url.split('/discussions')[0].split('?')[0] };
            }
            return { type: 'github-commits', url: url.split('?')[0] };
        }
        if (hostname.includes('reddit.com')) {
            let cleanUrl = url.split('?')[0];
            cleanUrl = cleanUrl.replace('.json', '');
            if (!cleanUrl.endsWith('.rss')) {
                cleanUrl = cleanUrl.replace(/\/$/, '') + '/.rss';
            }
            return { type: 'rss', url: cleanUrl };
        }
        return { type: 'rss', url: url };
    } catch (error) {
        return { type: 'rss', url: normalizeUrl(url) };
    }
}

async function handleAddTracker() {
    let url = document.getElementById('tracker-url')?.value.trim();
    const title = document.getElementById('tracker-title')?.value.trim();
    const saveBtn = document.getElementById('save-tracker');
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Fetching Info...';
    saveBtn.disabled = true;
    try {
        const detected = await detectTrackerType(url);
        const type = detected.type;
        url = detected.url;
        saveBtn.textContent = 'Adding...';
        await addTracker({
            type: type,
            url: url,
            title: title || extractTitleFromUrl(url, type)
        });
        ModalManager.hide('add-tracker-modal');
    } catch (error) {
        alert(`tracker-ui: failed on ${error.message}`);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

function extractTitleFromUrl(url, type) {
    try {
        if (type === 'crypto') {
            return url.charAt(0).toUpperCase() + url.slice(1);
        }
        if (type === 'weather') {
            return `${url} Weather`;
        }
        if (type === 'stock') {
            return url;
        }
        if (type === 'twitch') {
            return `Twitch: ${url}`;
        }
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            const channelId = urlObj.pathname.split('/').pop();
            return `YouTube: ${channelId}`;
        }
        if (urlObj.hostname.includes('reddit.com')) {
            return `Reddit: ${urlObj.pathname}`;
        }
        if (urlObj.hostname.includes('github.com')) {
            const parts = urlObj.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                return `${parts[0]}/${parts[1]}`;
            }
        }
        return urlObj.hostname;
    } catch (e) {
        return 'New Tracker';
    }
}