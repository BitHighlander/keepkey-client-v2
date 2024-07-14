console.log('content script loaded');

window.addEventListener('message', event => {
  if (event.source !== window || !event.data || event.data.type !== 'ETH_REQUEST') return;

  const { method, params, requestInfo } = event.data;

  // Forward the request to the background script
  chrome.runtime.sendMessage({ type: 'ETH_REQUEST', method, params, requestInfo }, response => {
    // Send the response back to the web page
    window.postMessage({ type: 'ETH_RESPONSE', method, result: response }, '*');
  });
});

// Inject the provider script early in the document lifecycle
const injectProviderScript = () => {
  const container = document.head || document.documentElement;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  container.insertBefore(script, container.children[0]);
  script.onload = () => script.remove();
};
injectProviderScript();
