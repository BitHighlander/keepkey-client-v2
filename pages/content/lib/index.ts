const TAG = ' | content | ';
console.log('content script loaded');

window.addEventListener('message', event => {
  let tag = TAG + ' | window.addEventListener | ';
  console.log(tag, 'event: ', event.data.type);
  if (event.source !== window || !event.data || event.data.type !== 'WALLET_REQUEST') return;
  const { method, params, chain, requestInfo } = event.data;
  // Forward the request to the background script
  chrome.runtime.sendMessage({ type: 'WALLET_REQUEST', method, params, chain, requestInfo }, response => {
    console.log(tag, 'response: ', response);
    // Send the response back to the web page
    window.postMessage({ type: 'WALLET_RESPONSE', method, result: response }, '*');
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
