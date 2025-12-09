document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('domainSelect');
    const status = document.getElementById('status');
    const selectMode = document.getElementById('selectMode');
    const editMode = document.getElementById('editMode');
    const editBtn = document.getElementById('editBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadDefaultBtn = document.getElementById('loadDefaultBtn');
    const textarea = document.getElementById('domainsTextarea');
    const editError = document.getElementById('editError');

    // Hardcoded fallback if file read fails, though file read should work.
    const FALLBACK_DEFAULTS = [
        "rezka.ag", "hdrezka.ag", "rezka-ua.tv", "hdrezka.tv",
        "rezka.so", "hdrezka.co", "hdrezka.sh", "hdrezka.rest"
    ];

    // Helper: Read default file
    async function getDefaultList() {
        try {
            const response = await fetch(chrome.runtime.getURL('rezka-domains-default.txt'));
            const text = await response.text();
            // Filter empty lines
            return text.split('\n').map(l => l.trim()).filter(l => l);
        } catch (e) {
            console.error("Failed to load defaults", e);
            return FALLBACK_DEFAULTS;
        }
    }

    // Helper: Populate Select
    function populateSelect(domains, selected) {
        select.innerHTML = '';
        domains.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            if (d === selected) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // Load state
    chrome.storage.local.get(['rezkaDomain', 'rezkaDomainList'], async (result) => {
        let domains = result.rezkaDomainList;
        if (!domains || domains.length === 0) {
            domains = await getDefaultList();
            // Save defaults initially if missing
            chrome.storage.local.set({ rezkaDomainList: domains });
        }

        let current = result.rezkaDomain;
        if (!current || !domains.includes(current)) {
            current = domains[0];
            chrome.storage.local.set({ rezkaDomain: current });
        }

        populateSelect(domains, current);
    });

    // Event: Change Selection
    select.addEventListener('change', () => {
        chrome.storage.local.set({ rezkaDomain: select.value }, () => {
            status.textContent = 'Saved!';
            setTimeout(() => { status.textContent = ''; }, 1500);
        });
    });

    // EDIT MODE HANDLERS

    editBtn.addEventListener('click', () => {
        // Populate textarea with current options
        const options = Array.from(select.options).map(o => o.value);
        textarea.value = options.join('\n');
        editError.textContent = '';

        selectMode.classList.add('hidden');
        editMode.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        editMode.classList.add('hidden');
        selectMode.classList.remove('hidden');
        editError.textContent = '';
    });

    loadDefaultBtn.addEventListener('click', async () => {
        const defaults = await getDefaultList();
        textarea.value = defaults.join('\n');
        editError.textContent = ''; // Clear errors on reset
    });

    saveBtn.addEventListener('click', () => {
        const rawLines = textarea.value.split('\n');
        const validLines = [];
        let hasError = false;

        for (let line of rawLines) {
            line = line.trim();
            if (line.length === 0) continue; // Skip empty lines

            // Validation: Must contain a dot
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

        // Save new list
        chrome.storage.local.set({ rezkaDomainList: validLines }, () => {
            // If current selection is not in new list, pick first of new list
            const currentSelection = select.value;
            let newSelection = currentSelection;
            if (!validLines.includes(currentSelection)) {
                newSelection = validLines[0];
                chrome.storage.local.set({ rezkaDomain: newSelection });
            }

            populateSelect(validLines, newSelection);

            editMode.classList.add('hidden');
            selectMode.classList.remove('hidden');
            status.textContent = 'List Updated!';
            setTimeout(() => { status.textContent = ''; }, 1500);
        });
    });

});
