### trackers fetch rss feeds through the following methods:
- rss2json     - for basic rss url types
- youtube/feed - for youtube channel activity tracking
- reddit.rss   - for subreddit activity tracking, and reddit post tracking
- etc

### user inputs a url, after normalizations, tracker type detected ^, tracker types set and determine info card
- github commit, github release, github discussions, github issues
- to youtube channel tracking
- to subbreddit or reddit post tracking
- to typical rss feed

### other notes
- of all of these trackers youtube is the most sensitive (if url input as youtube.com/@channel)
- rss2json is rate limited at 10,000+ request a day. seems impossible to reach such a limit, but perhaps a tracker limit is needed
- trackers.js `tracker.lastUpdate = Date.now();` vs `tracker.lastUpdate = data.pubDate;`, need to decide on most viable
- crypto identification can be better obviously
