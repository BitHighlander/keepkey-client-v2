(function () {
  const TAG = ' | InjectedScript | ';
  const VERSION = '1.0.4';
  console.log('**** KeepKey Injection script ****: ', VERSION);
  const SITE_URL = window.location.href;
  const SOURCE_INFO = {
    siteUrl: SITE_URL,
    scriptSource: 'KeepKey Extension',
    version: VERSION,
    injectedTime: new Date().toISOString(),
  };
  console.log('SOURCE_INFO: ', SOURCE_INFO);

  function walletRequest(method, params = [], chain, callback) {
    const tag = TAG + ' | walletRequest | ';
    try {
      const requestInfo = {
        id: method + ':' + new Date().getTime(),
        method,
        params,
        chain,
        siteUrl: SOURCE_INFO.siteUrl,
        scriptSource: SOURCE_INFO.scriptSource,
        version: SOURCE_INFO.version,
        requestTime: new Date().toISOString(),
        referrer: document.referrer,
        href: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };
      console.log(tag, 'method:', method);
      console.log(tag, 'params:', params);
      console.log(tag, 'chain:', chain);
      window.postMessage({ type: 'WALLET_REQUEST', method, params, chain, requestInfo, tag: TAG }, '*');

      function handleMessage(event) {
        console.log(tag, 'event:', event);
        console.log(tag, 'event.id:', event.id);

        console.log(tag, 'event.data.method:', event.data.method);
        console.log(tag, 'method:', method);

        if (event.data.result && event.data.method && method) {
          console.log(tag, 'Resolving response:', event.data.result);
          if (callback && typeof callback === 'function') {
            if (event.data.result.id && event.data.result.id == requestInfo.id) {
              console.log('Winning! id lock valid: ', event.data.result.id, '==', requestInfo.id);
              callback(null, event.data.result.result); // Use callback to return the result
            } else if (event.data.result.id) {
              //TODO queue?
              console.error(tag, 'Ignoring id:', event.data.result.id, '!=', requestInfo.id);
            }
          }
          window.removeEventListener('message', handleMessage);
        } else {
          console.log(tag, 'Ignoring message:', event.data);
        }
      }

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error(tag, `Error in ${TAG}:`, error);
      callback(error); // Use callback to return the error
    }
  }

  function sendRequestAsync(payload, param1, callback) {
    const tag = TAG + ' | sendRequestAsync | ';
    console.log(tag, 'payload:', payload);
    console.log(tag, 'param1:', param1);
    console.log(tag, 'callback:', callback);

    //if !payload.chain use chain state

    if (typeof callback === 'function') {
      walletRequest(payload.method, payload.params, payload.chain).then(
        result => callback(null, { id: payload.id, jsonrpc: '2.0', result }),
        error => callback(error),
      );
    } else {
      console.error(tag, 'Callback is not a function:', callback);
    }
  }

  function sendRequestSync(payload, param1) {
    const tag = TAG + ' | sendRequestSync | ';
    console.log(tag, 'wallet.sendSync called with:', payload);
    console.log(tag, 'wallet.sendSync called with:', payload.params);
    console.log(tag, 'wallet.sendSync called with param1:', param1);
    let params = payload.params || param1;
    let method = payload.method || payload;
    let chain = payload.chain || 'ethereum';
    console.log(tag, 'selected payload:', payload);
    console.log(tag, 'selected params:', params);
    console.log(tag, 'selected params:', chain);
    return {
      id: payload.id,
      jsonrpc: '2.0',
      result: walletRequest(method, params, chain),
    };
  }

  function createWalletObject(chain) {
    console.log('payload:', chain);
    let wallet = {
      network: 'mainnet',
      isKeepKey: true,
      isMetaMask: true,
      isUniswapWallet: true,
      isConnected: true,
      request: ({ method, params }, callback) => {
        if (callback) {
          // If a callback is provided, use it
          walletRequest(method, params, chain, (error, result) => {
            if (error) {
              callback(error);
            } else {
              console.log('createWalletObject: result: ', result);
              callback(null, result);
            }
          });
        } else {
          // If no callback is provided, return a promise
          return new Promise((resolve, reject) => {
            walletRequest(method, params, chain, (error, result) => {
              if (error) {
                reject(error);
              } else {
                console.log('createWalletObject: result: ', result);
                resolve(result);
              }
            });
          });
        }
      },
      send: (payload, param1, callback) => {
        console.log('send: ', { payload, param1, callback });
        // Inject the initialized chain into the payload if not already set
        if (!payload.chain) {
          payload.chain = chain;
        }
        return callback ? sendRequestAsync(payload, param1, callback) : sendRequestSync(payload, param1);
      },
      sendAsync: (payload, param1, callback) => {
        console.log('sendAsync: ', { payload, param1, callback });
        // Inject the initialized chain into the payload if not already set
        if (!payload.chain) {
          payload.chain = chain;
        }
        return sendRequestAsync(payload, param1, callback);
      },
      on: (event, handler) => window.addEventListener(event, handler),
      removeListener: (event, handler) => window.removeEventListener(event, handler),
      removeAllListeners: () => {
        ['message', 'click', 'keydown'].forEach(event => window.removeEventListener(event, () => {}));
      },
    };
    if (chain == 'ethereum') {
      wallet.chainId = '0x1';
      wallet.networkVersion = '1';
      wallet.isMetaMask = true;
    }
    if (chain == 'thorchain') {
      wallet.chainId = 'Thorchain_thorchain';
    }

    return wallet;
  }

  function mountWallet() {
    const tag = TAG + ' | window.wallet | ';

    // Create uniform wallet objects for each chain
    const ethereum = createWalletObject('ethereum');
    const xfi = {
      binance: createWalletObject('binance'),
      bitcoin: createWalletObject('bitcoin'),
      bitcoincash: createWalletObject('bitcoincash'),
      dogecoin: createWalletObject('dogecoin'),
      dash: createWalletObject('dash'),
      ethereum: createWalletObject('ethereum'),
      keplr: createWalletObject('keplr'),
      litecoin: createWalletObject('litecoin'),
      thorchain: createWalletObject('thorchain'),
      mayachain: createWalletObject('mayachain'),
      solana: createWalletObject('solana'),
    };

    const handler = {
      get: function (target, prop, receiver) {
        console.log(tag, `Proxy get handler: ${prop}`);
        return Reflect.get(target, prop, receiver);
      },
      set: function (target, prop, value) {
        console.log(tag, `Proxy set handler: ${prop} = ${value}`);
        return Reflect.set(target, prop, value);
      },
    };

    const proxyEthereum = new Proxy(ethereum, handler);
    const proxyXfi = new Proxy(xfi, handler);

    const info = {
      uuid: '350670db-19fa-4704-a166-e52e178b59d4',
      name: 'KeepKey Client',
      icon: 'https://pioneers.dev/coins/keepkey.png',
      rdns: 'com.keepkey',
    };

    Object.defineProperty(window, 'ethereum', {
      value: proxyEthereum,
      writable: false,
      configurable: true,
    });

    Object.defineProperty(window, 'xfi', {
      value: proxyXfi,
      writable: false,
      configurable: true,
    });

    console.log(tag, 'window.ethereum and window.xfi have been mounted');

    const announceEvent = new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info, provider: proxyEthereum }),
    });

    function announceProvider() {
      console.log(tag, 'Announcing provider to window: ', announceEvent);
      window.dispatchEvent(announceEvent);
    }
    announceProvider();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountWallet();
  } else {
    document.addEventListener('DOMContentLoaded', mountWallet);
  }
})();
