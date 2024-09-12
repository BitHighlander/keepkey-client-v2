(function () {
  const TAG = ' | InjectedScript | ';
  const VERSION = '1.0.5';
  console.log('**** KeepKey Injection script ****:', VERSION);

  // Prevent multiple injections
  if (window.keepkeyInjected) {
    console.log(TAG, 'KeepKey is already injected.');
    return;
  }
  window.keepkeyInjected = true;

  const SOURCE_INFO = {
    siteUrl: window.location.href,
    scriptSource: 'KeepKey Extension',
    version: VERSION,
    injectedTime: new Date().toISOString(),
  };
  console.log('SOURCE_INFO:', SOURCE_INFO);

  let messageId = 0;
  const callbacks = {};

  function walletRequest(method, params = [], chain) {
    const tag = TAG + ' | walletRequest | ';
    return new Promise((resolve, reject) => {
      try {
        const requestId = ++messageId;
        const requestInfo = {
          id: requestId,
          method,
          params,
          chain,
          siteUrl: SOURCE_INFO.siteUrl,
          scriptSource: SOURCE_INFO.scriptSource,
          version: SOURCE_INFO.version,
          requestTime: new Date().toISOString(),
        };

        callbacks[requestId] = { resolve, reject };

        window.postMessage(
          {
            source: 'keepkey-injected',
            type: 'WALLET_REQUEST',
            requestId,
            requestInfo,
          },
          '*',
        );
      } catch (error) {
        console.error(tag, 'Error in walletRequest:', error);
        reject(error);
      }
    });
  }

  // Listen for responses from the content script
  window.addEventListener('message', event => {
    const tag = TAG + ' | window.message | ';
    if (event.source !== window) return;
    if (event.data && event.data.source === 'keepkey-content' && event.data.type === 'WALLET_RESPONSE') {
      const { requestId, result, error } = event.data;
      const callback = callbacks[requestId];
      if (callback) {
        if (error) {
          callback.reject(new Error(error));
        } else {
          callback.resolve(result);
        }
        delete callbacks[requestId];
      }
    }
  });

  function createWalletObject(chain) {
    console.log(TAG, 'Creating wallet object for chain:', chain);
    const wallet = {
      isKeepKey: true,
      isMetaMask: true,
      isConnected: true,
      request: args => {
        const { method, params } = args;
        return walletRequest(method, params, chain);
      },
      send: (payload, callback) => {
        console.log(TAG, 'send:', payload);
        if (typeof callback === 'function') {
          walletRequest(payload.method, payload.params, chain)
            .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
            .catch(error => callback(error, null));
        } else {
          // Return a promise
          return walletRequest(payload.method, payload.params, chain).then(result => ({
            id: payload.id,
            jsonrpc: '2.0',
            result,
          }));
        }
      },
      sendAsync: (payload, callback) => {
        console.log(TAG, 'sendAsync:', payload);
        walletRequest(payload.method, payload.params, chain)
          .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
          .catch(error => callback(error, null));
      },
      on: (event, handler) => {
        // Implement event handling as needed
        console.log(TAG, 'Event listener added for event:', event);
      },
      removeListener: (event, handler) => {
        // Implement event removal as needed
        console.log(TAG, 'Event listener removed for event:', event);
      },
    };

    if (chain === 'ethereum') {
      wallet.chainId = '0x1';
      wallet.networkVersion = '1';
    }

    return wallet;
  }

  function announceProvider(ethereumProvider) {
    const info = {
      uuid: '350670db-19fa-4704-a166-e52e178b59d4',
      name: 'KeepKey Client',
      icon: 'https://pioneers.dev/coins/keepkey.png',
      rdns: 'com.keepkey',
    };

    const announceEvent = new CustomEvent('eip6963:announceProvider', {
      detail: { info, provider: ethereumProvider },
    });

    console.log(TAG, 'Dispatching provider event with correct detail:', announceEvent);
    window.dispatchEvent(announceEvent);
  }

  function mountWallet() {
    const ethereum = createWalletObject('ethereum');
    const xfi = {
      binance: createWalletObject('binance'),
      bitcoin: createWalletObject('bitcoin'),
      // Add other chains as needed
    };

    // Mount the providers on the window object
    Object.defineProperty(window, 'ethereum', {
      value: ethereum,
      writable: false,
      configurable: true,
    });

    Object.defineProperty(window, 'xfi', {
      value: xfi,
      writable: false,
      configurable: true,
    });

    console.log(TAG, 'window.ethereum and window.xfi have been mounted');

    // Announce the provider
    announceProvider(ethereum);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountWallet();
  } else {
    document.addEventListener('DOMContentLoaded', mountWallet);
  }
})();
