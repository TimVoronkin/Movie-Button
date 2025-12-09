// Global variables
let currentRezkaDomain = 'rezka.ag';
let currentTorrentLink = 'toloka.to/tracker.php?nm=';
let rezkaList = [];
let torrentList = [];
let isRezkaEnabled = true;
let isTorrentEnabled = true;
let isSettingsLoaded = false;

// Function to update settings from storage
function initialize() {
    chrome.storage.local.get(['rezkaDomain', 'torrentLink', 'rezkaDomainList', 'torrentLinkList', 'rezkaEnabled', 'torrentEnabled'], (result) => {
        if (result.rezkaDomain) currentRezkaDomain = result.rezkaDomain;
        if (result.torrentLink) currentTorrentLink = result.torrentLink;
        if (result.rezkaDomainList) rezkaList = result.rezkaDomainList;
        if (result.torrentLinkList) torrentList = result.torrentLinkList;

        if (result.rezkaEnabled !== undefined) isRezkaEnabled = result.rezkaEnabled;
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
        if (changes.torrentLink) { currentTorrentLink = changes.torrentLink.newValue; needsRefresh = true; }
        if (changes.rezkaDomainList) { rezkaList = changes.rezkaDomainList.newValue; needsRefresh = true; }
        if (changes.torrentLinkList) { torrentList = changes.torrentLinkList.newValue; needsRefresh = true; }

        if (changes.rezkaEnabled) { isRezkaEnabled = changes.rezkaEnabled.newValue; needsRefresh = true; }
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

function getDisplayDomain(link) {
    if (!link) return '';
    let fullDomain = link.split('/')[0];
    return fullDomain;
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.rezka-split-container')) {
        document.querySelectorAll('.rezka-dropdown-menu').forEach(menu => menu.classList.remove('show'));
    }
});

function createSplitButton(container, id, text, iconPath, order, listItems, currentItemValue, saveKey, onMainClick) {
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
            itemDiv.textContent = getDisplayDomain(itemValue);

            itemDiv.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.storage.local.set({ [saveKey]: itemValue });
                // Note: storage listener will trigger refresh
            };
            dropdown.appendChild(itemDiv);
        });

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

    // REZKA
    if (isRezkaEnabled) {
        createSplitButton(
            container,
            'rezka-button',
            'Find on Rezka',
            'icon/rezka-logo_32.png',
            '10',
            rezkaList,
            currentRezkaDomain,
            'rezkaDomain',
            (e) => {
                e.preventDefault(); e.stopPropagation();
                runSearch(currentRezkaDomain, title, year, false);
            }
        );
    } else {
        // Double check removal if it exists
        const old = container.querySelector('[data-testid="rezka-button-container"]');
        if (old) old.remove();
    }

    // TORRENT
    if (isTorrentEnabled) {
        let tDomain = getDisplayDomain(currentTorrentLink);
        let parts = tDomain.split('.');
        let sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        let displayName = sld.charAt(0).toUpperCase() + sld.slice(1);

        createSplitButton(
            container,
            'torrent-button',
            `Find on ${displayName}`,
            'icon/inbox-traypng_32.png',
            '11',
            torrentList,
            currentTorrentLink,
            'torrentLink',
            (e) => {
                e.preventDefault(); e.stopPropagation();
                runSearch(currentTorrentLink, title, year, true);
            }
        );
    } else {
        const old = container.querySelector('[data-testid="torrent-button-container"]');
        if (old) old.remove();
    }

    // STRICT ORDER
    const tContainer = container.querySelector('[data-testid="torrent-button-container"]');
    const rContainer = container.querySelector('[data-testid="rezka-button-container"]');

    if (tContainer && container.lastElementChild !== tContainer) {
        container.appendChild(tContainer);
    }
    if (rContainer && tContainer && tContainer.previousElementSibling !== rContainer) {
        container.insertBefore(rContainer, tContainer);
    }
}

const observer = new MutationObserver((mutations) => {
    if (!isSettingsLoaded) return;
    refreshButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

initialize();
