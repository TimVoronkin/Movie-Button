function addRezkaButton() {
    // 1. Find the container and reference button first
    const watchedButton = document.querySelector('[data-testid^="watched-button-"]');
    if (!watchedButton) return;

    const container = watchedButton.parentElement;
    if (!container) return;

    // 2. Check if our button exists
    let button = document.querySelector('.rezka-button');

    // 3. Logic to Parse Info (Do this only if we need to create or update the button)
    // We can do this every time just to be safe or store it. 
    // Let's parse.
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

    // 4. Create Button if it doesn't exist
    if (!button) {
        // Clone for base classes/styles from the watched button
        button = watchedButton.cloneNode(false); // false = shallow clone (no children), we build them ourselves
        button.classList.add('rezka-button');
        button.classList.add('rezka-btn-custom');

        button.removeAttribute('id');
        button.setAttribute('data-testid', 'rezka-button');
        button.removeAttribute('aria-label');

        // Force styling
        button.style.justifyContent = 'flex-start';
        button.style.textAlign = 'left';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        // Add order just in case flex is used in a specific way, though physical append is better
        button.style.order = '9999';

        // Build Inner Content Manually to ensure Icon + Text exists

        // Icon
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('icon/rezka-logo_32.png');
        img.style.width = '24px';
        img.style.height = '24px';
        img.style.marginRight = '8px';
        img.style.verticalAlign = 'middle';
        img.style.display = 'inline-block';
        img.style.minWidth = '24px'; // prevent shrinking

        // Text
        const span = document.createElement('span');
        span.className = 'ipc-btn__text'; // keep IMDB class for font consistency
        span.textContent = 'Find on Rezka';

        button.appendChild(img);
        button.appendChild(span);

        // Click Handler
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const query = encodeURIComponent(`${title} ${year}`);
            const url = `https://rezka.ag/search/?do=search&subaction=search&q=${query}`;
            window.open(url, '_blank');
        };

        container.appendChild(button);
    } else {
        // Button exists.
        // CHECK ORDER: If it's not the last element, move it to end.
        if (container.lastElementChild !== button) {
            container.appendChild(button);
        }
    }
}

// Observer: Run frequently to catch React updates
const observer = new MutationObserver((mutations) => {
    addRezkaButton();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial run
addRezkaButton();
