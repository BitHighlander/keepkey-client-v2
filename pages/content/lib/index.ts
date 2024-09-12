// @ts-ignore
const TAG = ' | content | ';
// @ts-ignore
console.log('content script loaded');

window.addEventListener('message', event => {
  let tag = TAG + ' | window.addEventListener | ';
  // console.log(tag, 'event: ', event.data.type);
  if (event.source !== window || !event.data || event.data.type !== 'WALLET_REQUEST') return;
  const { method, params, chain, requestInfo } = event.data;
  // Forward the request to the background script
  chrome.runtime.sendMessage({ type: 'WALLET_REQUEST', method, params, chain, requestInfo }, response => {
    console.log(tag, method + ' response: ', response);
    // Send the response back to the web page
    window.postMessage({ type: 'WALLET_RESPONSE', method, result: response }, '*');
  });
});

// content-script.js
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js'); // Adjust the path as necessary
script.onload = function () {
  // @ts-ignore
  this.remove();
};
(document.head || document.documentElement).appendChild(script);
