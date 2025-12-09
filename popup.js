document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const status = document.getElementById('status');
    const mainView = document.getElementById('mainView');
    const editView = document.getElementById('editView');

    const rezkaSelect = document.getElementById('rezkaSelect');
    const torrentSelect = document.getElementById('torrentSelect');

    const editRezkaBtn = document.getElementById('editRezkaBtn');
    const editTorrentBtn = document.getElementById('editTorrentBtn');

    const editTextarea = document.getElementById('editTextarea');
    const editError = document.getElementById('editError');
    const loadDefaultBtn = document.getElementById('loadDefaultBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const editTitle = document.getElementById('editTitle');

    // State needed for edit mode
    let currentEditType = null; // 'rezka' or 'torrent'

    // Storage Keys
    const KEYS = {
        rezka: { list: 'rezkaDomainList', current: 'rezkaDomain', defaultFile: 'default-configs/rezka-domains-default.txt' },
        torrent: { list: 'torrentLinkList', current: 'torrentLink', defaultFile: 'default-configs/torrents-links-default.txt' }
    };

    function showStatus(msg) {
        status.textContent = msg;
        setTimeout(() => { status.textContent = ''; }, 1500);
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

    function populateSelect(element, items, selected) {
        element.innerHTML = '';
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            if (item === selected) opt.selected = true;
            element.appendChild(opt);
        });
    }

    async function loadData() {
        // Load Rezka
        chrome.storage.local.get([KEYS.rezka.list, KEYS.rezka.current], async (res) => {
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
            populateSelect(rezkaSelect, list, current);
        });

        // Load Torrent
        chrome.storage.local.get([KEYS.torrent.list, KEYS.torrent.current], async (res) => {
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
            populateSelect(torrentSelect, list, current);
        });
    }

    // Handlers for Select Changes
    rezkaSelect.addEventListener('change', () => {
        chrome.storage.local.set({ [KEYS.rezka.current]: rezkaSelect.value }, () => showStatus('Saved!'));
    });

    torrentSelect.addEventListener('change', () => {
        chrome.storage.local.set({ [KEYS.torrent.current]: torrentSelect.value }, () => showStatus('Saved!'));
    });

    // EDIT UI LOGIC
    function openEdit(type) {
        currentEditType = type;
        const selectEl = type === 'rezka' ? rezkaSelect : torrentSelect;

        // Populate textarea from current Select options because that's our source of truth for the visible list
        const options = Array.from(selectEl.options).map(o => o.value);
        editTextarea.value = options.join('\n');
        editError.textContent = '';
        editTitle.textContent = type === 'rezka' ? 'Edit Rezka List' : 'Edit Torrent List';

        mainView.classList.add('hidden');
        editView.classList.remove('hidden');
    }

    editRezkaBtn.addEventListener('click', () => openEdit('rezka'));
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
            validLines.push(line);
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
            const selectEl = currentEditType === 'rezka' ? rezkaSelect : torrentSelect;
            const currentVal = selectEl.value;
            let newVal = currentVal;

            if (!validLines.includes(currentVal)) {
                newVal = validLines[0];
                chrome.storage.local.set({ [keyConfig.current]: newVal });
            }

            // Refresh select
            populateSelect(selectEl, validLines, newVal);

            // Close UI
            editView.classList.add('hidden');
            mainView.classList.remove('hidden');
            currentEditType = null;
            showStatus('List Updated!');
        });
    });

    // Initialize
    loadData();
});
