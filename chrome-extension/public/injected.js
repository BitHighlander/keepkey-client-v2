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
      // console.log(tag, 'window object:', window);

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

  function mountWallet() {
    const tag = TAG + ' | window.wallet | ';
    const wallet = {
      isMetaMask: true,
      isKeepKey: true,
      request: async ({ method, params, chain }) => walletRequest(method, params, chain),
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

    const xfi = {
      binance: {
        request: async ({ method, params }) => walletRequest(method, params, 'binance'),
      },
      bitcoin: {
        request: async ({ method, params }) => walletRequest(method, params, 'bitcoin'),
      },
      bitcoincash: {
        request: async ({ method, params }) => walletRequest(method, params, 'bitcoincash'),
      },
      dogecoin: {
        request: async ({ method, params }) => walletRequest(method, params, 'dogecoin'),
      },
      ethereum: wallet, // Using the same wallet object for Ethereum
      keplr: {
        request: async ({ method, params }) => walletRequest(method, params, 'keplr'),
      },
      litecoin: {
        request: async ({ method, params }) => walletRequest(method, params, 'litecoin'),
      },
      thorchain: {
        request: async ({ method, params }) => walletRequest(method, params, 'thorchain'),
      },
      mayachain: {
        request: async ({ method, params }) => walletRequest(method, params, 'mayachain'),
      },
      solana: {
        request: async ({ method, params }) => walletRequest(method, params, 'solana'),
      },
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

    const proxyWallet = new Proxy(wallet, handler);
    const proxyXfi = new Proxy(xfi, handler);

    const info = {
      uuid: '350670db-19fa-4704-a166-e52e178b59d4',
      name: 'KeepKey Client',
      icon: 'https://pioneers.dev/coins/keepkey.png',
      rdns: 'com.keepkey',
    };

    // const announceEvent = new CustomEvent('eip6963:announceProvider', {
    //   detail: Object.freeze({ info, provider: proxyWallet }),
    // });
    //
    // function announceProvider() {
    //   window.dispatchEvent(announceEvent);
    // }

    // window.addEventListener('eip6963:requestProvider', () => {
    //   announceProvider();
    // });
    // announceProvider();
    //TODO debug sending event with empty info

    Object.defineProperty(window, 'wallet', {
      value: proxyWallet,
      writable: false,
      configurable: true,
    });

    Object.defineProperty(window, 'xfi', {
      value: proxyXfi,
      writable: false,
      configurable: true,
    });

    console.log(tag, 'window.wallet and window.xfi have been mounted');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountWallet();
  } else {
    document.addEventListener('DOMContentLoaded', mountWallet);
  }
})();
