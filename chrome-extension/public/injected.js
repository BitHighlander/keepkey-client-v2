(function () {
  const TAG = ' | InjectedScript | ';
  const VERSION = '1.0.3';
  console.log('**** KeepKey Injection script ****: ', VERSION);
  const SITE_URL = window.location.href;
  const SOURCE_INFO = {
    siteUrl: SITE_URL,
    scriptSource: 'KeepKey Extension',
    version: VERSION,
    injectedTime: new Date().toISOString(),
  };
  console.log('SOURCE_INFO: ', SOURCE_INFO);

  async function walletRequest(method, params = [], chain = '') {
    let tag = TAG + ' | walletRequest | ';
    try {
      const requestInfo = {
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

      return await new Promise((resolve, reject) => {
        window.postMessage({ type: 'WALLET_REQUEST', method, params, chain, requestInfo, tag: TAG }, '*');

        function handleMessage(event) {
          if (event.data.result) resolve(event.data.result);
        }

        window.addEventListener('message', handleMessage);
      });
    } catch (error) {
      console.error(tag, `Error in ${TAG}:`, error);
      throw error;
    }
  }

  function sendRequestAsync(payload, callback) {
    const tag = TAG + ' | sendRequestAsync | ';
    console.log(tag, 'wallet.sendAsync called with chain:', payload.chain);
    console.log(tag, 'wallet.sendAsync called with method:', payload.method);
    console.log(tag, 'wallet.sendAsync called with params:', payload.params);
    walletRequest(payload.method, payload.params, payload.chain).then(
      result => callback(null, { id: payload.id, jsonrpc: '2.0', result }),
      error => callback(error),
    );
  }

  function sendRequestSync(payload) {
    const tag = TAG + ' | sendRequestSync | ';
    console.log(tag, 'wallet.sendSync called with:', payload);
    return {
      id: payload.id,
      jsonrpc: '2.0',
      result: walletRequest(payload.method, payload.params, payload.chain),
    };
  }

  function createWalletObject(chain) {
    return {
      isMetaMask: chain === 'ethereum',
      isKeepKey: true,
      request: async ({ method, params }) => walletRequest(method, params, chain),
      send: (payload, callback) => (callback ? sendRequestAsync(payload, callback) : sendRequestSync(payload)),
      sendAsync: (payload, callback) => sendRequestAsync(payload, callback),
      on: (event, handler) => window.addEventListener(event, handler),
      removeListener: (event, handler) => window.removeEventListener(event, handler),
      removeAllListeners: () => {
        ['message', 'click', 'keydown'].forEach(event => window.removeEventListener(event, () => {}));
      },
      chainId: '0x1',
      networkVersion: '1',
    };
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
