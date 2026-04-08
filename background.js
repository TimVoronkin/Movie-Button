chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openSettings') {
        chrome.tabs.create({ url: 'popup/popup.html' });
    }
});
