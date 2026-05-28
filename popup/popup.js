document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const status = document.getElementById('status');
    const mainView = document.getElementById('mainView');
    const editView = document.getElementById('editView');

    const rezkaSelect = document.getElementById('rezkaSelect');
    const movieSearchSelect = document.getElementById('movieSearchSelect');
    const torrentSelect = document.getElementById('torrentSelect');

    const rezkaEnabledCb = document.getElementById('rezkaEnabled');
    const movieSearchEnabledCb = document.getElementById('movieSearchEnabled');
    const torrentEnabledCb = document.getElementById('torrentEnabled');

    const rezkaControls = document.getElementById('rezkaControls');
    const movieSearchControls = document.getElementById('movieSearchControls');
    const torrentControls = document.getElementById('torrentControls');

    const editRezkaBtn = document.getElementById('editRezkaBtn');
    const editMovieSearchBtn = document.getElementById('editMovieSearchBtn');
    const editTorrentBtn = document.getElementById('editTorrentBtn');

    const editTextarea = document.getElementById('editTextarea');
    const editError = document.getElementById('editError');
    const loadDefaultBtn = document.getElementById('loadDefaultBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const editTitle = document.getElementById('editTitle');
    const editInstructions = document.getElementById('editInstructions');

    // State needed for edit mode
    let currentEditType = null; // 'rezka', 'movieSearch', or 'torrent'

    // Storage Keys
    const KEYS = {
        rezka: {
            list: 'rezkaDomainList',
            current: 'rezkaDomain',
            enabled: 'rezkaEnabled',
            defaultFile: 'default-configs/rezka-mirror-links-default.txt'
        },
        movieSearch: {
            list: 'movieSearchLinkList',
            current: 'movieSearchLink',
            enabled: 'movieSearchEnabled',
            defaultFile: 'default-configs/movie-streaming-links-default.txt'
        },
        torrent: {
            list: 'torrentLinkList',
            current: 'torrentLink',
            enabled: 'torrentEnabled',
            defaultFile: 'default-configs/torrent-tracker-links-default.txt'
        }
    };

    function showStatus(msg) {
        status.textContent = msg;
        setTimeout(() => { status.textContent = ''; }, 1500);
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

    async function getDefaultList(filename) {
        try {
            const response = await fetch(chrome.runtime.getURL(filename));
            const text = await response.text();
            return text.split('\n').map(l => l.trim()).filter(l => l);
        } catch (e) {
            console.error("Failed to load defaults for " + filename, e);
            return [];
        }
    }

    function populateSelect(element, items, selected, isRezka = false) {
        element.innerHTML = '';
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = getDisplayDomain(item, isRezka);
            if (item === selected) opt.selected = true;
            element.appendChild(opt);
        });
    }

    function toggleSection(type, isEnabled) {
        let controls, cb;
        if (type === 'rezka') {
            controls = rezkaControls;
            cb = rezkaEnabledCb;
        } else if (type === 'movieSearch') {
            controls = movieSearchControls;
            cb = movieSearchEnabledCb;
        } else {
            controls = torrentControls;
            cb = torrentEnabledCb;
        }

        cb.checked = isEnabled;

        if (isEnabled) {
            controls.classList.remove('disabled');
        } else {
            controls.classList.add('disabled');
        }
    }

    async function loadData() {
        // Load Rezka
        chrome.storage.local.get([KEYS.rezka.list, KEYS.rezka.current, KEYS.rezka.enabled], async (res) => {
            let list = res[KEYS.rezka.list];
            if (!list || list.length === 0) {
                list = await getDefaultList(KEYS.rezka.defaultFile);
                chrome.storage.local.set({ [KEYS.rezka.list]: list });
            }
            let current = res[KEYS.rezka.current];
            if (!current || !list.includes(current)) {
                current = list[0];
                chrome.storage.local.set({ [KEYS.rezka.current]: current });
            }

            let enabled = res[KEYS.rezka.enabled];
            if (enabled === undefined) enabled = true;

            populateSelect(rezkaSelect, list, current, true);
            toggleSection('rezka', enabled);
        });

        // Load Movie Search
        chrome.storage.local.get([KEYS.movieSearch.list, KEYS.movieSearch.current, KEYS.movieSearch.enabled], async (res) => {
            let list = res[KEYS.movieSearch.list];
            if (!list || list.length === 0) {
                list = await getDefaultList(KEYS.movieSearch.defaultFile);
                chrome.storage.local.set({ [KEYS.movieSearch.list]: list });
            }
            let current = res[KEYS.movieSearch.current];
            if (!current || !list.includes(current)) {
                current = list[0];
                chrome.storage.local.set({ [KEYS.movieSearch.current]: current });
            }

            let enabled = res[KEYS.movieSearch.enabled];
            if (enabled === undefined) enabled = true;

            populateSelect(movieSearchSelect, list, current, false);
            toggleSection('movieSearch', enabled);
        });

        // Load Torrent
        chrome.storage.local.get([KEYS.torrent.list, KEYS.torrent.current, KEYS.torrent.enabled], async (res) => {
            let list = res[KEYS.torrent.list];
            if (!list || list.length === 0) {
                list = await getDefaultList(KEYS.torrent.defaultFile);
                chrome.storage.local.set({ [KEYS.torrent.list]: list });
            }
            let current = res[KEYS.torrent.current];
            if (!current || !list.includes(current)) {
                current = list[0];
                chrome.storage.local.set({ [KEYS.torrent.current]: current });
            }

            let enabled = res[KEYS.torrent.enabled];
            if (enabled === undefined) enabled = true;

            populateSelect(torrentSelect, list, current, false);
            toggleSection('torrent', enabled);
        });
    }

    // Handlers for Select Changes
    rezkaSelect.addEventListener('change', () => {
        chrome.storage.local.set({ [KEYS.rezka.current]: rezkaSelect.value }, () => showStatus('Saved!'));
    });

    movieSearchSelect.addEventListener('change', () => {
        chrome.storage.local.set({ [KEYS.movieSearch.current]: movieSearchSelect.value }, () => showStatus('Saved!'));
    });

    torrentSelect.addEventListener('change', () => {
        chrome.storage.local.set({ [KEYS.torrent.current]: torrentSelect.value }, () => showStatus('Saved!'));
    });

    // Handlers for Checkboxes
    rezkaEnabledCb.addEventListener('change', () => {
        const isEnabled = rezkaEnabledCb.checked;
        toggleSection('rezka', isEnabled);
        chrome.storage.local.set({ [KEYS.rezka.enabled]: isEnabled }, () => showStatus('Saved!'));
    });

    movieSearchEnabledCb.addEventListener('change', () => {
        const isEnabled = movieSearchEnabledCb.checked;
        toggleSection('movieSearch', isEnabled);
        chrome.storage.local.set({ [KEYS.movieSearch.enabled]: isEnabled }, () => showStatus('Saved!'));
    });

    torrentEnabledCb.addEventListener('change', () => {
        const isEnabled = torrentEnabledCb.checked;
        toggleSection('torrent', isEnabled);
        chrome.storage.local.set({ [KEYS.torrent.enabled]: isEnabled }, () => showStatus('Saved!'));
    });

    // EDIT UI LOGIC
    function openEdit(type) {
        currentEditType = type;
        const selectEl = type === 'rezka' ? rezkaSelect : (type === 'movieSearch' ? movieSearchSelect : torrentSelect);

        // Populate textarea from current Select options because that's our source of truth for the visible list
        const options = Array.from(selectEl.options).map(o => o.value);
        editTextarea.value = options.join('\n');
        editError.textContent = '';
        if (type === 'rezka') {
            editTitle.textContent = 'Edit Rezka List';
            editInstructions.innerHTML = 'Enter one Rezka mirror domain per line. Protocols, paths, and "www." prefixes will be automatically stripped.';
        } else if (type === 'movieSearch') {
            editTitle.textContent = 'Edit Platforms List';
            editInstructions.innerHTML = 'Enter one streaming/database search URL per line. The movie title and year will be appended directly to the end of the URL. Ensure the URL ends with a query parameter.';
        } else {
            editTitle.textContent = 'Edit Torrent List';
            editInstructions.innerHTML = 'Enter one torrent tracker URL per line. The movie title and year will be appended directly to the end of the URL. Ensure the URL ends with a query parameter.';
        }

        mainView.classList.add('hidden');
        editView.classList.remove('hidden');
    }

    editRezkaBtn.addEventListener('click', () => openEdit('rezka'));
    editMovieSearchBtn.addEventListener('click', () => openEdit('movieSearch'));
    editTorrentBtn.addEventListener('click', () => openEdit('torrent'));

    cancelBtn.addEventListener('click', () => {
        editView.classList.add('hidden');
        mainView.classList.remove('hidden');
        currentEditType = null;
    });

    loadDefaultBtn.addEventListener('click', async () => {
        if (!currentEditType) return;
        const defaults = await getDefaultList(KEYS[currentEditType].defaultFile);
        editTextarea.value = defaults.join('\n');
        editError.textContent = '';
    });

    saveBtn.addEventListener('click', () => {
        if (!currentEditType) return;

        const rawLines = editTextarea.value.split('\n');
        const validLines = [];
        let hasError = false;

        for (let line of rawLines) {
            line = line.trim();
            if (line.length === 0) continue;

            // Validation: Simple check if it looks roughly like a domain or URL path
            // Must have a dot at least.
            if (!line.includes('.')) {
                hasError = true;
                break;
            }

            if (currentEditType === 'rezka') {
                // Normalize Rezka to clean domain
                let cleanDomain = line;
                if (cleanDomain.includes('://')) {
                    cleanDomain = cleanDomain.split('://')[1];
                }
                cleanDomain = cleanDomain.split('/')[0];
                if (cleanDomain.startsWith('www.')) {
                    cleanDomain = cleanDomain.slice(4);
                }
                cleanDomain = cleanDomain.split(':')[0]; // strip port
                if (cleanDomain) {
                    validLines.push(cleanDomain);
                } else {
                    hasError = true;
                    break;
                }
            } else {
                // Normalize Torrent & MovieSearch to full URL starting with protocol
                let cleanUrl = line;
                if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                    cleanUrl = 'https://' + cleanUrl;
                }
                validLines.push(cleanUrl);
            }
        }

        if (hasError) {
            editError.textContent = 'Warning: All lines must contain a valid domain';
            return;
        }

        if (validLines.length === 0) {
            editError.textContent = 'Warning: List cannot be empty';
            return;
        }

        // Save
        const keyConfig = KEYS[currentEditType];
        chrome.storage.local.set({ [keyConfig.list]: validLines }, () => {
            // Update current selection if invalidated
            const selectEl = currentEditType === 'rezka' ? rezkaSelect : (currentEditType === 'movieSearch' ? movieSearchSelect : torrentSelect);
            const currentVal = selectEl.value;
            let newVal = currentVal;

            if (!validLines.includes(currentVal)) {
                newVal = validLines[0];
                chrome.storage.local.set({ [keyConfig.current]: newVal });
            }

            // Refresh select
            populateSelect(selectEl, validLines, newVal, currentEditType === 'rezka');

            // Close UI
            editView.classList.add('hidden');
            mainView.classList.remove('hidden');
            currentEditType = null;
            showStatus('List Updated!');
        });
    });

    // Initialize
    loadData();

    // Show "Open in new tab" only if we are in the popup (not an existing tab)
    chrome.tabs.getCurrent((tab) => {
        if (tab === undefined) {
            const openFullPageBtn = document.getElementById('openFullPageBtn');
            if (openFullPageBtn) {
                openFullPageBtn.classList.remove('hidden');
                openFullPageBtn.addEventListener('click', () => {
                    chrome.tabs.create({ url: 'popup/popup.html' });
                    window.close(); // Close the popup
                });
            }
        }
    });
});
