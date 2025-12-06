export async function fetchTrackerUpdate(tracker) {
    try {
        switch (tracker.type) {
            case 'rss': return await fetchRSS(tracker.url);
            case 'youtube': return await fetchYouTube(tracker.url);
            case 'github-commits': return await fetchGitHubCommits(tracker.url);
            case 'github-releases': return await fetchGitHubReleases(tracker.url);
            case 'github-issues': return await fetchGitHubIssues(tracker.url);
            case 'github-discussions': return await fetchGitHubDiscussions(tracker.url);
            case 'twitch': return await fetchTwitch(tracker.url);
            case 'crypto': return await fetchCrypto(tracker.url);
            case 'weather': return await fetchWeather(tracker.url);
            case 'stock': return await fetchStock(tracker.url);
            case 'medium': return await fetchRSS(tracker.url);
            case 'devto': return await fetchRSS(tracker.url);
            case 'substack': return await fetchRSS(tracker.url);
            case 'mastodon': return await fetchDirectRSS(tracker.url);
            default: throw new Error(`fetchTrackerUpdate: unknown type - ${tracker.type}`);
        }
    } catch (error) {
        console.error(`fetchTrackerUpdate: error on ${tracker.id}:`, error);
        return null;
    }
}

async function fetchRSS(feedUrl) {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`fetchRSS: failed ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 'ok' || !data.items || data.items.length === 0) {
        throw new Error('fetchRSS: no items in RSS Feed');
    }
    const latestItem = data.items[0];
    return {
        title: latestItem.title,
        link: latestItem.link,
        description: latestItem.description?.substring(0, 150) || '',
        pubDate: new Date(latestItem.pubDate).getTime(),
        feedTitle: data.feed?.title || 'RSS Feed'
    };
}

async function fetchYouTube(channelUrl) {
    let channelId;
    if (channelUrl.includes('/channel/')) {
        channelId = channelUrl.split('/channel/')[1].split('/')[0].split('?')[0];
    } else if (channelUrl.includes('/@')) { // redundant, wont happen, but.
        throw new Error('fetchYouTube: /@ detected, use youtube.com/channel/UC...');
    } else {
        throw new Error('fetchYouTube: use youtube.com/channel/UC...');
    }
    const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`YouTube RSS fetch failed: ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 'ok' || !data.items || data.items.length === 0) {
        throw new Error('No videos found');
    }
    const latestVideo = data.items[0];
    return {
        title: latestVideo.title,
        link: latestVideo.link,
        description: latestVideo.description?.substring(0, 150) || '',
        pubDate: new Date(latestVideo.pubDate).getTime(),
        feedTitle: data.feed?.title || 'YouTube Channel'
    };
}

async function fetchGitHubCommits(repoUrl) {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`fetchGitHubCommits: ${response.status}`);
    }
    const commits = await response.json();
    if (!commits || commits.length === 0) {
        throw new Error('fetchGitHubCommits: no commits found');
    }
    const latestCommit = commits[0];
    return {
        title: latestCommit.commit.message.split('\n')[0],
        link: latestCommit.html_url,
        description: `by ${latestCommit.commit.author.name}`,
        pubDate: new Date(latestCommit.commit.author.date).getTime(),
        feedTitle: `${owner}/${repo}`
    };
}

async function fetchGitHubReleases(repoUrl) {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`fetchGitHubReleases: ${response.status}`);
    }
    const releases = await response.json();
    if (!releases || releases.length === 0) {
        throw new Error('fetchGitHubReleases: no releases found');
    }
    const latestRelease = releases[0];
    return {
        title: latestRelease.name || latestRelease.tag_name,
        link: latestRelease.html_url,
        description: latestRelease.body?.substring(0, 150) || '',
        pubDate: new Date(latestRelease.published_at).getTime(),
        feedTitle: `${owner}/${repo}`
    };
}

async function fetchGitHubIssues(repoUrl) {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`fetchGitHubIssues: failed on ${response.status}`);
    }
    const issues = await response.json();
    if (!issues || issues.length === 0) {
        throw new Error('fetchGitHubIssues: no issues found');
    }
    const latestIssue = issues[0];
    return {
        title: latestIssue.title,
        link: latestIssue.html_url,
        description: latestIssue.body?.substring(0, 150) || '',
        pubDate: new Date(latestIssue.created_at).getTime(),
        feedTitle: `${owner}/${repo}`
    };
}

async function fetchGitHubDiscussions(repoUrl) {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const rssFeedUrl = `https://github.com/${owner}/${repo}/discussions.atom`;
    try {
        return await fetchRSS(rssFeedUrl);
    } catch (error) {
        throw new Error('fetchGitHubDiscussions: rss support error');
    }
}

async function fetchTwitch(username) {
    const response = await fetch(`https://decapi.me/twitch/uptime/${username}`);
    if (!response.ok) {
        throw new Error(`fetchTwitch: ${response.status}`);
    }
    const text = await response.text();
    const isLive = !text.toLowerCase().includes('offline');
    
    return {
        title: isLive ? `IS LIVE 🟣` : 'Is offline ⚫',
        link: `https://twitch.tv/${username}`,
        description: isLive ? text.trim() : 'Not streaming',
        pubDate: Date.now(),
        feedTitle: `Twitch: ${username}`
    };
}

async function fetchCrypto(coinId) {
    const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!response.ok) {
        throw new Error(`fetchCrypto: ${response.status}`);
    }
    const data = await response.json();
    const coin = data[coinId];
    
    if (!coin) {
        throw new Error('Coin not found');
    }
    
    const change = coin.usd_24h_change || 0;
    const emoji = change >= 0 ? '🟢' : '🔴';
    
    return {
        title: `$${coin.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        link: `https://www.coingecko.com/en/coins/${coinId}`,
        description: `${emoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        pubDate: Date.now(),
        feedTitle: coinId.charAt(0).toUpperCase() + coinId.slice(1)
    };
}

async function fetchWeather(city) {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    if (!response.ok) {
        throw new Error(`fetchWeather: ${response.status}`);
    }
    const data = await response.json();
    const current = data.current_condition[0];
    const weatherDesc = current.weatherDesc[0].value;
    
    return {
        title: `${weatherDesc}, ${current.temp_F}°F`,
        link: `https://wttr.in/${city}`,
        description: `Feels like ${current.FeelsLikeF}°F`,
        pubDate: Date.now(),
        feedTitle: `${city} Weather`
    };
}

async function fetchStock(ticker) {
    const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`
    );
    if (!response.ok) {
        throw new Error(`fetchStock: ${response.status}`);
    }
    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    
    const price = meta.regularMarketPrice;
    const change = meta.regularMarketChangePercent ?? meta.regularMarketChange ?? 0;
    const emoji = change >= 0 ? '🟢' : '🔴';
    
    return {
        title: `${price.toFixed(2)}`,
        link: `https://finance.yahoo.com/quote/${ticker}`,
        description: `${emoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        pubDate: Date.now(),
        feedTitle: ticker
    };
}

async function fetchDirectRSS(feedUrl) {
    const response = await fetch(feedUrl);
    if (!response.ok) {
        throw new Error(`fetchDirectRSS: failed ${response.status}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
        throw new Error('fetchDirectRSS: not a valid xml format');
    }
    const entries = xml.querySelectorAll('entry');
    if (entries.length > 0) {
        const latestEntry = entries[0];
        let title = latestEntry.querySelector('title')?.textContent || '';
        const linkEl = latestEntry.querySelector('link[rel="alternate"]') || latestEntry.querySelector('link');
        const link = linkEl?.getAttribute('href') || feedUrl;
        const published = latestEntry.querySelector('published')?.textContent || 
                         latestEntry.querySelector('updated')?.textContent || 
                         new Date().toISOString();
        const content = latestEntry.querySelector('content')?.textContent || 
                       latestEntry.querySelector('summary')?.textContent || '';
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        if (!title || title === 'Untitled') {
            title = cleanContent.substring(0, 100) || 'New post';
        }
        const feedTitle = xml.querySelector('feed > title')?.textContent || 'RSS Feed';
        return {
            title: title,
            link: link,
            description: cleanContent.substring(0, 150),
            pubDate: new Date(published).getTime(),
            feedTitle: feedTitle
        };
    }
    const items = xml.querySelectorAll('item');
    if (items.length > 0) {
        const latestItem = items[0];
        let title = latestItem.querySelector('title')?.textContent?.trim() || '';
        const link = latestItem.querySelector('link')?.textContent || feedUrl;
        const pubDate = latestItem.querySelector('pubDate')?.textContent || new Date().toISOString();
        const description = latestItem.querySelector('description')?.textContent || '';
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        if (!title) {
            title = cleanDescription.substring(0, 100) || 'New post';
        }
        const feedTitle = xml.querySelector('channel > title')?.textContent || 'RSS Feed';
        return {
            title: title,
            link: link,
            description: cleanDescription.substring(0, 150),
            pubDate: new Date(pubDate).getTime(),
            feedTitle: feedTitle
        };
    }
    throw new Error('fetchDirectRSS: nothing found in feed');
} // unsure if this is all valid, untitled -> content, is only a result of mastodon testing

function parseGitHubUrl(url) {
    try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) {
            throw new Error('parseGitHubUrl: URL not valid');
        }
        return {
            owner: parts[0],
            repo: parts[1]
        };
    } catch (error) {
        throw new Error('parseGitHubUrl: URL not valid');
    }
}

export async function validateTrackerUrl(type, url) {
    try {
        const testTracker = { type, url };
        await fetchTrackerUpdate(testTracker);
        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}