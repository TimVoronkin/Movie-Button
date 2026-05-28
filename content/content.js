// Global variables
let currentRezkaDomain = 'rezka.ag';
let currentMovieSearchLink = 'https://www.justwatch.com/uk/search?q=';
let currentTorrentLink = 'toloka.to/tracker.php?nm=';

let rezkaList = [];
let movieSearchList = [];
let torrentList = [];

let isRezkaEnabled = true;
let isMovieSearchEnabled = true;
let isTorrentEnabled = true;

let isSettingsLoaded = false;

// Function to update settings from storage
function initialize() {
    chrome.storage.local.get([
        'rezkaDomain', 'torrentLink', 'movieSearchLink',
        'rezkaDomainList', 'torrentLinkList', 'movieSearchLinkList',
        'rezkaEnabled', 'torrentEnabled', 'movieSearchEnabled'
    ], (result) => {
        const defaultRezkaList = ['rezka.ag', 'hdrezka.ag', 'rezka-ua.tv', 'hdrezka.tv', 'rezka.so', 'hdrezka.co', 'hdrezka.sh', 'hdrezka.rest'];
        const defaultMovieSearchList = [
            'https://www.justwatch.com/uk/search?q=',
            'https://www.justwatch.com/us/search?q=',
            'https://www.justwatch.com/cz/vyhled%C3%A1n%C3%AD?q=',
            'https://megogo.net/en/search-extended?q=',
            'https://www.rottentomatoes.com/search?search=',
            'https://ua.kinorium.com/search/?q='
        ];
        const defaultTorrentList = [
            'toloka.to/tracker.php?nm=',
            'tracker.0day.community/browse.php?search=',
            'bluebird-hd.org/browse.php?search',
            'thepiratebay.org/search.php?q',
            'rutracker.org/forum/tracker.php?nm=',
            'rutor.is/search/',
            'nnmclub.to/forum/tracker.php?nm='
        ];

        rezkaList = result.rezkaDomainList || defaultRezkaList;
        movieSearchList = result.movieSearchLinkList || defaultMovieSearchList;
        torrentList = result.torrentLinkList || defaultTorrentList;

        currentRezkaDomain = result.rezkaDomain || rezkaList[0];
        currentMovieSearchLink = result.movieSearchLink || movieSearchList[0];
        currentTorrentLink = result.torrentLink || torrentList[0];

        if (result.rezkaEnabled !== undefined) isRezkaEnabled = result.rezkaEnabled;
        if (result.movieSearchEnabled !== undefined) isMovieSearchEnabled = result.movieSearchEnabled;
        if (result.torrentEnabled !== undefined) isTorrentEnabled = result.torrentEnabled;

        isSettingsLoaded = true;
        refreshButtons();
    });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        let needsRefresh = false;
        if (changes.rezkaDomain) { currentRezkaDomain = changes.rezkaDomain.newValue; needsRefresh = true; }
        if (changes.movieSearchLink) { currentMovieSearchLink = changes.movieSearchLink.newValue; needsRefresh = true; }
        if (changes.torrentLink) { currentTorrentLink = changes.torrentLink.newValue; needsRefresh = true; }

        if (changes.rezkaDomainList) { rezkaList = changes.rezkaDomainList.newValue; needsRefresh = true; }
        if (changes.movieSearchLinkList) { movieSearchList = changes.movieSearchLinkList.newValue; needsRefresh = true; }
        if (changes.torrentLinkList) { torrentList = changes.torrentLinkList.newValue; needsRefresh = true; }

        if (changes.rezkaEnabled) { isRezkaEnabled = changes.rezkaEnabled.newValue; needsRefresh = true; }
        if (changes.movieSearchEnabled) { isMovieSearchEnabled = changes.movieSearchEnabled.newValue; needsRefresh = true; }
        if (changes.torrentEnabled) { isTorrentEnabled = changes.torrentEnabled.newValue; needsRefresh = true; }

        if (needsRefresh) {
            // If we are disabling, we specifically want to remove them.
            // refreshButtons logic handles addition, but we should clear strictly if toggle happened.
            const containers = document.querySelectorAll('.rezka-split-container');
            containers.forEach(c => c.remove());
            refreshButtons();
        }
    }
});

function getMovieInfo() {
    // 1. Try to extract from structured JSON-LD data (most stable, immune to UI/CSS class changes)
    try {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent);
                const objects = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
                for (const obj of objects) {
                    if (obj && (obj['@type'] === 'Movie' || obj['@type'] === 'TVSeries' || obj['@type'] === 'TVEpisode' || obj.name)) {
                        let title = obj.name;
                        let year = '';
                        if (obj.datePublished) {
                            const match = obj.datePublished.match(/^\d{4}/);
                            if (match) year = match[0];
                        }
                        if (title) {
                            return { title: title.trim(), year };
                        }
                    }
                }
            } catch (e) {
                // Ignore individual script parse errors
            }
        }
    } catch (e) {
        console.error("Failed to query JSON-LD scripts:", e);
    }

    // 2. Fallback to DOM parsing
    const titleElement = document.querySelector('.hero__primary-text');
    const title = titleElement ? titleElement.textContent.trim() : '';

    let year = '';
    const potentialLists = document.querySelectorAll('ul.ipc-inline-list.ipc-inline-list--show-dividers');
    for (const list of potentialLists) {
        const firstLi = list.querySelector('li.ipc-inline-list__item');
        if (firstLi) {
            const link = firstLi.querySelector('a');
            if (link && link.textContent) {
                const text = link.textContent.trim();
                if (/^\d{4}$/.test(text)) {
                    year = text;
                    break;
                }
            } else if (firstLi.textContent && /^\d{4}$/.test(firstLi.textContent.trim())) {
                year = firstLi.textContent.trim();
                break;
            }
        }
    }
    return { title, year };
}

function getDisplayDomain(link, isRezka = false) {
    if (!link) return '';
    if (isRezka) return link;

    let tempLink = link;
    if (!tempLink.startsWith('http://') && !tempLink.startsWith('https://')) {
        tempLink = 'https://' + tempLink;
    }
    try {
        const url = new URL(tempLink);
        let hostname = url.hostname;
        if (hostname.startsWith('www.')) {
            hostname = hostname.slice(4);
        }
        
        let parts = hostname.split('.');
        let sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        let displayName = sld.charAt(0).toUpperCase() + sld.slice(1);
        
        let pathSegments = url.pathname.split('/').filter(p => p);
        let countryCode = '';
        if (pathSegments.length > 0 && pathSegments[0].length === 2) {
            countryCode = pathSegments[0].toUpperCase();
        }
        
        if (parts.length > 2) {
            let firstSub = parts[0];
            if (firstSub.length === 2) {
                countryCode = firstSub.toUpperCase();
            }
        }
        
        if (countryCode) {
            return `${displayName} (${countryCode})`;
        }
        return displayName;
    } catch (e) {
        let domain = link.split('/')[0];
        return domain;
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.rezka-split-container')) {
        document.querySelectorAll('.rezka-dropdown-menu').forEach(menu => menu.classList.remove('show'));
    }
});

function createSplitButton(container, id, text, iconPath, order, listItems, currentItemValue, saveKey, onMainClick, onItemSelect) {
    let splitContainer = container.querySelector(`[data-testid="${id}-container"]`);

    if (!splitContainer) {
        splitContainer = document.createElement('div');
        // USE NATIVE IMDB SPLIT BUTTON CLASSES
        splitContainer.className = 'ipc-split-button ipc-btn--theme-baseAlt ipc-split-button--ellide-false ipc-split-button--button-radius ipc-btn--core-accent1 ipc-split-button--width-full rezka-split-container';
        splitContainer.setAttribute('data-testid', `${id}-container`);
        splitContainer.style.order = order;

        // 1. MAIN BUTTON (Left)
        const mainBtn = document.createElement('button');
        // Use ipc-split-button__btn class for correct shape
        mainBtn.className = 'ipc-split-button__btn ipc-split-button__btn--button-radius rezka-btn-custom rezka-split-main';
        mainBtn.setAttribute('data-testid', id);

        // Styles that might not be in the class
        mainBtn.style.justifyContent = 'flex-start';
        mainBtn.style.textAlign = 'left';
        mainBtn.style.display = 'flex';
        mainBtn.style.alignItems = 'center';

        mainBtn.onclick = onMainClick;

        const img = document.createElement('img');
        img.src = chrome.runtime.getURL(iconPath);
        img.style.width = '24px';
        img.style.height = '24px';
        img.style.marginRight = '8px';
        img.style.verticalAlign = 'middle';
        img.style.display = 'inline-block';
        img.style.minWidth = '24px';

        const span = document.createElement('span');
        span.className = 'ipc-btn__text';
        span.textContent = text;

        mainBtn.appendChild(img);
        mainBtn.appendChild(span);

        // 2. ARROW BUTTON (Right)
        const arrowBtn = document.createElement('button');
        // Use ipc-split-button__iconBtn class for correct shape
        arrowBtn.className = 'ipc-split-button__iconBtn ipc-split-button__iconBtn--button-radius rezka-btn-custom rezka-split-arrow';

        arrowBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="ipc-icon ipc-icon--arrow-drop-down" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';

        // 3. DROPDOWN
        const dropdown = document.createElement('div');
        dropdown.className = 'rezka-dropdown-menu';

        listItems.forEach(itemValue => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'rezka-dropdown-item';
            itemDiv.textContent = getDisplayDomain(itemValue, id === 'rezka-button');

            itemDiv.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.storage.local.set({ [saveKey]: itemValue });
                document.querySelectorAll('.rezka-dropdown-menu').forEach(m => m.classList.remove('show'));
                if (onItemSelect) {
                    onItemSelect(itemValue);
                }
            };
            dropdown.appendChild(itemDiv);
        });

        const settingsDiv = document.createElement('div');
        settingsDiv.className = 'rezka-dropdown-item';
        settingsDiv.textContent = '⚙️ Settings';
        // settingsDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        // settingsDiv.style.marginTop = '4px';
        // settingsDiv.style.paddingTop = '8px';
        // settingsDiv.style.color = 'rgba(255,255,255,0.5)';
        settingsDiv.style.fontSize = '8px';
        settingsDiv.style.fontWeight = 'normal';
        settingsDiv.style.backgroundColor = '#222222';
            
        settingsDiv.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.rezka-dropdown-menu').forEach(m => m.classList.remove('show'));
            chrome.runtime.sendMessage({action: 'openSettings'});
        };
        dropdown.appendChild(settingsDiv);

        arrowBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.rezka-dropdown-menu').forEach(m => {
                if (m !== dropdown) m.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        };

        splitContainer.appendChild(mainBtn);
        splitContainer.appendChild(arrowBtn);
        splitContainer.appendChild(dropdown);

        container.appendChild(splitContainer);
        return { container: splitContainer, mainBtn, dropdown };
    } else {
        const mainBtn = splitContainer.querySelector(`[data-testid="${id}"]`);
        const span = mainBtn.querySelector('.ipc-btn__text');
        if (span && span.textContent !== text) {
            span.textContent = text;
        }
        return { container: splitContainer, mainBtn: mainBtn };
    }
}

function runSearch(domainOrLink, title, year, isTorrent) {
    const query = encodeURIComponent(`${title} ${year}`);
    if (isTorrent) {
        let baseUrl = domainOrLink;
        if (!baseUrl.startsWith('http')) {
            baseUrl = 'https://' + baseUrl;
        }
        window.open(baseUrl + query, '_blank');
    } else {
        const url = `https://${domainOrLink}/search/?do=search&subaction=search&q=${query}`;
        window.open(url, '_blank');
    }
}

function refreshButtons() {
    if (!isSettingsLoaded) return;

    const { title, year } = getMovieInfo();
    if (!title) return;

    const watchedButton = document.querySelector('[data-testid^="watched-button-"]');
    if (!watchedButton) return;
    const container = watchedButton.parentElement;
    if (!container) return;

    // 1. REZKA
    if (isRezkaEnabled) {
        createSplitButton(
            container,
            'rezka-button',
            'Find on Rezka',
            'icon/icon_rezka_48.png',
            '10',
            rezkaList,
            currentRezkaDomain,
            'rezkaDomain',
            (e) => {
                e.preventDefault(); e.stopPropagation();
                runSearch(currentRezkaDomain, title, year, false);
            },
            (itemValue) => {
                runSearch(itemValue, title, year, false);
            }
        );
    } else {
        const old = container.querySelector('[data-testid="rezka-button-container"]');
        if (old) old.remove();
    }

    // 2. MOVIE SEARCH (Streaming & Database)
    if (isMovieSearchEnabled) {
        let displayName = getDisplayDomain(currentMovieSearchLink, false);

        createSplitButton(
            container,
            'moviesearch-button',
            `Find on ${displayName}`,
            'icon/icon_movie-search_48.svg',
            '11',
            movieSearchList,
            currentMovieSearchLink,
            'movieSearchLink',
            (e) => {
                e.preventDefault(); e.stopPropagation();
                runSearch(currentMovieSearchLink, title, year, true);
            },
            (itemValue) => {
                runSearch(itemValue, title, year, true);
            }
        );
    } else {
        const old = container.querySelector('[data-testid="moviesearch-button-container"]');
        if (old) old.remove();
    }

    // 3. TORRENT
    if (isTorrentEnabled) {
        let displayName = getDisplayDomain(currentTorrentLink, false);

        createSplitButton(
            container,
            'torrent-button',
            `Find on ${displayName}`,
            'icon/icon_utorrent_50.svg',
            '12',
            torrentList,
            currentTorrentLink,
            'torrentLink',
            (e) => {
                e.preventDefault(); e.stopPropagation();
                runSearch(currentTorrentLink, title, year, true);
            },
            (itemValue) => {
                runSearch(itemValue, title, year, true);
            }
        );
    } else {
        const old = container.querySelector('[data-testid="torrent-button-container"]');
        if (old) old.remove();
    }

    // STRICT ORDER
    const rContainer = container.querySelector('[data-testid="rezka-button-container"]');
    const mContainer = container.querySelector('[data-testid="moviesearch-button-container"]');
    const tContainer = container.querySelector('[data-testid="torrent-button-container"]');

    if (tContainer && container.lastElementChild !== tContainer) {
        container.appendChild(tContainer);
    }
    if (mContainer && tContainer && tContainer.previousElementSibling !== mContainer) {
        container.insertBefore(mContainer, tContainer);
    }
    if (rContainer && mContainer && mContainer.previousElementSibling !== rContainer) {
        container.insertBefore(rContainer, mContainer);
    } else if (rContainer && tContainer && !mContainer && tContainer.previousElementSibling !== rContainer) {
        container.insertBefore(rContainer, tContainer);
    }
}

const observer = new MutationObserver((mutations) => {
    if (!isSettingsLoaded) return;
    refreshButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

initialize();
