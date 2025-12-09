// Global variables
let currentRezkaDomain = 'rezka.ag';
let currentTorrentLink = 'toloka.to/tracker.php?nm=';
let isSettingsLoaded = false;

// Function to update settings from storage
function initialize() {
    chrome.storage.local.get(['rezkaDomain', 'torrentLink'], (result) => {
        if (result.rezkaDomain) {
            currentRezkaDomain = result.rezkaDomain;
        }
        if (result.torrentLink) {
            currentTorrentLink = result.torrentLink;
        }
        isSettingsLoaded = true;
        // Run main logic once settings are ready
        refreshButtons();
    });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.rezkaDomain) currentRezkaDomain = changes.rezkaDomain.newValue;
        if (changes.torrentLink) currentTorrentLink = changes.torrentLink.newValue;

        // Remove existing buttons to force full re-creation with new text/links
        const btns = document.querySelectorAll('.rezka-btn-custom');
        btns.forEach(b => b.remove());
        refreshButtons();
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
                // Check if it looks like a year (4 digits)
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

function createOrUpdateOneButton(container, id, text, iconPath, order, onClick) {
    let button = container.querySelector(`[data-testid="${id}"]`);

    if (!button) {
        // Create new
        // We assume the container has at least one child (the watched button) to clone from?
        // Actually, we usually clone the watched button.
        const watchedButton = document.querySelector('[data-testid^="watched-button-"]');
        if (watchedButton) {
            button = watchedButton.cloneNode(false);
        } else {
            // Fallback if watched button is missing (rare but possible)
            button = document.createElement('button');
            button.className = 'ipc-btn ipc-btn--full-width ipc-btn--center-align-content ipc-btn--large-height ipc-btn--core-baseAlt ipc-btn--theme-baseAlt ipc-btn--button-radius ipc-btn--on-accent2 ipc-secondary-button sc-104ed846-1 bmBzwD';
        }

        button.classList.add(id); // class identifier
        button.classList.add('rezka-btn-custom');

        button.removeAttribute('id');
        button.setAttribute('data-testid', id);
        button.removeAttribute('aria-label');

        // Styles
        button.style.justifyContent = 'flex-start';
        button.style.textAlign = 'left';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        // We use order, but also physical append ensures order if flex is not used
        button.style.order = order;
        button.style.marginTop = '10px';

        // Icon
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL(iconPath);
        img.style.width = '24px';
        img.style.height = '24px';
        img.style.marginRight = '8px';
        img.style.verticalAlign = 'middle';
        img.style.display = 'inline-block';
        img.style.minWidth = '24px';

        // Text
        const span = document.createElement('span');
        span.className = 'ipc-btn__text';
        span.textContent = text;

        button.appendChild(img);
        button.appendChild(span);
        button.onclick = onClick;

        container.appendChild(button);
        return button;
    } else {
        // Button exists: Update Text/Icon if changed
        const span = button.querySelector('.ipc-btn__text');
        if (span && span.textContent !== text) {
            span.textContent = text;
        }
        // Update click handler? 
        // It's tricky to update onclick function reference. 
        // Easier to set it again.
        button.onclick = onClick;
        return button;
    }
}

function refreshButtons() {
    if (!isSettingsLoaded) return; // Wait for settings

    const { title, year } = getMovieInfo();
    if (!title) return;

    // Find Container via Watched Button
    const watchedButton = document.querySelector('[data-testid^="watched-button-"]');
    if (!watchedButton) return;
    const container = watchedButton.parentElement;
    if (!container) return;

    // 1. REZKA BUTTON
    const rezkaBtn = createOrUpdateOneButton(
        container,
        'rezka-button',
        'Find on Rezka',
        'icon/rezka-logo_32.png',
        '10',
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const query = encodeURIComponent(`${title} ${year}`);
            const url = `https://${currentRezkaDomain}/search/?do=search&subaction=search&q=${query}`;
            window.open(url, '_blank');
        }
    );

    // 2. TORRENT BUTTON
    let fullDomain = currentTorrentLink.split('/')[0];
    let parts = fullDomain.split('.');
    let sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    let displayName = sld.charAt(0).toUpperCase() + sld.slice(1);

    const torrentBtn = createOrUpdateOneButton(
        container,
        'torrent-button',
        `Find on ${displayName}`,
        'icon/inbox-traypng_32.png',
        '11',
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const query = encodeURIComponent(`${title} ${year}`);
            let baseUrl = currentTorrentLink;
            if (!baseUrl.startsWith('http')) {
                baseUrl = 'https://' + baseUrl;
            }
            const fullUrl = baseUrl + query;
            window.open(fullUrl, '_blank');
        }
    );

    // STRICT ORDER ENFORCEMENT
    // Expected order: [Original Content] [Rezka] [Torrent]
    // If container's last child is NOT torrent button, or second to last is NOT rezka button
    // we re-append them to force them to the end.

    if (container.lastElementChild !== torrentBtn) {
        container.appendChild(torrentBtn);
    }
    // Check Rezka is before Torrent
    if (torrentBtn.previousElementSibling !== rezkaBtn) {
        container.insertBefore(rezkaBtn, torrentBtn);
    }
}

// Observer
const observer = new MutationObserver((mutations) => {
    if (!isSettingsLoaded) return;

    // Check if buttons are missing OR if order is wrong
    // It's cheap to just call refreshButtons which does checks internally
    refreshButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

// Start
initialize();
