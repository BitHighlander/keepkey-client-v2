// content-script.js

// @ts-ignore
console.log('Content script loaded');
window.addEventListener('message', event => {
  const tag = ' | content | ';
  if (event.source !== window) return;

  if (event.data?.source === 'keepkey-injected' && event.data.type === 'WALLET_REQUEST') {
    const { requestId, requestInfo } = event.data;
    console.log(tag, 'Received WALLET_REQUEST:', requestInfo);

    // Forward the request to the background script
    chrome.runtime.sendMessage({ type: 'WALLET_REQUEST', requestInfo }, response => {
      if (chrome.runtime.lastError) {
        console.error(tag, 'Error communicating with background:', chrome.runtime.lastError);
        return;
      }

      console.log(tag, 'Received response from background:', response);

      // Send the response back to the injected script
      window.postMessage(
        {
          source: 'keepkey-content',
          type: 'WALLET_RESPONSE',
          requestId,
          result: response?.result || null,
          error: response?.error || null,
        },
        '*',
      );
    });
  }
});

// Inject the provider script into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);
