// Global variables
let currentRezkaDomain = 'rezka.ag';
let currentTorrentLink = 'toloka.to/tracker.php?nm=';

// Function to update settings from storage
function updateSettings() {
    chrome.storage.local.get(['rezkaDomain', 'torrentLink'], (result) => {
        if (result.rezkaDomain) {
            currentRezkaDomain = result.rezkaDomain;
        }
        if (result.torrentLink) {
            currentTorrentLink = result.torrentLink;
        }
    });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.rezkaDomain) currentRezkaDomain = changes.rezkaDomain.newValue;
        if (changes.torrentLink) currentTorrentLink = changes.torrentLink.newValue;

        // Trigger update to refresh links/text potentially? 
        // Realistically, the user changes settings in popup, then clicks button. 
        // We might want to remove and re-add buttons if domain changes affecting text.
        // For now, simpler to just let next click use new value, or simple reload.
        // But updating text "Find on DOMAIN" requires DOM update.
        // Let's force a re-render by removing buttons.
        const btns = document.querySelectorAll('.rezka-btn-custom');
        btns.forEach(b => b.remove());
        addButtons();
    }
});

// Load initial
updateSettings();

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

function createCustomButton(id, text, iconPath, order, onClick) {
    // 1. Find Container
    const watchedButton = document.querySelector('[data-testid^="watched-button-"]');
    if (!watchedButton) return null;
    const container = watchedButton.parentElement;
    if (!container) return null;

    // Check Existence
    let button = container.querySelector(`[data-testid="${id}"]`);

    if (!button) {
        // Create new
        button = watchedButton.cloneNode(false);
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
        button.style.order = order;
        button.style.marginTop = '10px'; // Spacing between buttons if they wrap or stack

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
    } else {
        // Update Text if needed (for Torrents dynamic domain)
        const span = button.querySelector('.ipc-btn__text');
        if (span && span.textContent !== text) {
            span.textContent = text;
        }

        // Ensure position
        // We rely on order style, but appending essentially keeps them in DOM if checked.
        // We don't strictly enforce lastChild here because there are 2 buttons now.
        // Use order flex property to handle sorting.
    }
}

function addButtons() {
    const { title, year } = getMovieInfo();
    if (!title) return;

    // 1. Rezka Button (Order 10)
    createCustomButton(
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

    // 2. Torrent Button (Order 11 - after Rezka)
    // Extract domain for text: "Find on rutracker.org"
    let domainPart = currentTorrentLink.split('/')[0];

    createCustomButton(
        'torrent-button',
        `Find on ${domainPart}`,
        'icon/inbox-traypng_32.png',
        '11',
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Logic: currentTorrentLink + " " + title + " " + year
            // The user said: "у кінець рядку додається просто назва фільму та рік через пробіл"
            // Example link: "toloka.to/tracker.php?nm="
            // Result: "toloka.to/tracker.php?nm=Matrix 1999"
            // Usually search queries need generic encoding or just +, but user said "space". 
            // URLs usually convert space to %20 or +. 
            // Let's safe encode the query part, but leave the base link structure alone.

            // If the base link already has query params, we likely extend the last param value?
            // Or we just append. The prompt is "append Title Year separated by space".
            // Browsers handle space in open() usually by encoding, but let's be cleaner.
            // We'll construct full string then sanitize? No, user provided specific link formats like `...nm=`.
            // Simplest approach: base + encodedQuery.

            const query = encodeURIComponent(`${title} ${year}`);
            // If the link ends with equals or similar, we probably want just the query.
            // But if we just append, space might be encoded. 
            // User's instruction implies the link is a prefix.
            // "toloka.to/tracker.php?nm=" + "Matrix 1999"

            // Wait, user said "Movie Name Year separated by space". 
            // If I encodeURIComponent("Matrix 1999"), it becomes "Matrix%201999". This is standard.

            // Ensure protocol if missing
            let baseUrl = currentTorrentLink;
            if (!baseUrl.startsWith('http')) {
                baseUrl = 'https://' + baseUrl;
            }

            const fullUrl = baseUrl + query;
            window.open(fullUrl, '_blank');
        }
    );
}

const observer = new MutationObserver((mutations) => {
    // Check if buttons exist, if not add them
    if (!document.querySelector('.rezka-button') || !document.querySelector('.torrent-button')) {
        addButtons();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

addButtons();
