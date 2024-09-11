import 'webextension-polyfill';
import packageJson from '../../package.json'; // Adjust the path as needed
import { onStartKeepkey } from './keepkey';
import { handleWalletRequest } from './methods';
import { listenForApproval } from './approvals';
import { JsonRpcProvider } from 'ethers';
import { Chain } from '@coinmasters/types';

const TAG = ' | background/index.js | ';
console.log('background script loaded');
console.log('Version:', packageJson.version);

const KEEPKEY_STATES = {
  0: 'unknown',
  1: 'disconnected',
  2: 'connected',
  3: 'busy', // multi-user-action signing can not be interrupted
  4: 'errored',
};
let KEEPKEY_STATE = 0;

// Function to update the extension icon based on the theme
function updateIcon() {
  let iconPath = './icon-128.png';
  if (KEEPKEY_STATE === 2) iconPath = './icon-128-online.png';

  chrome.action.setIcon({ path: iconPath }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting icon:', chrome.runtime.lastError);
    }
  });
}
updateIcon();
console.log('background loaded');
console.log("Edit 'chrome-extension/lib/background/index.ts' and save to reload.");

const EIP155_CHAINS = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    logo: '/chain-logos/eip155-1.png',
    rgb: '99, 125, 234',
    rpc: 'https://1rpc.io/eth',
    namespace: 'eip155',
  },
  'eip155:43114': {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    logo: '/chain-logos/eip155-43113.png',
    rgb: '232, 65, 66',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    namespace: 'eip155',
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    logo: '/chain-logos/eip155-137.png',
    rgb: '130, 71, 229',
    rpc: 'https://polygon-rpc.com/',
    namespace: 'eip155',
  },
  'eip155:10': {
    chainId: 10,
    name: 'Optimism',
    logo: '/chain-logos/eip155-10.png',
    rgb: '235, 0, 25',
    rpc: 'https://mainnet.optimism.io',
    namespace: 'eip155',
  },
  'eip155:324': {
    chainId: 324,
    name: 'zkSync Era',
    logo: '/chain-logos/eip155-324.svg',
    rgb: '242, 242, 242',
    rpc: 'https://mainnet.era.zksync.io/',
    namespace: 'eip155',
  },
  'eip155:8453': {
    chainId: 8453,
    name: 'Base',
    logo: '/chain-logos/base.png',
    rgb: '242, 242, 242',
    rpc: 'https://mainnet.base.org',
    namespace: 'eip155',
  },
  //
  'eip155:42161': {
    chainId: 8453,
    name: 'Arbitrum',
    logo: '/chain-logos/arbitrum.png',
    rgb: '4, 100, 214',
    rpc: 'https://api.zan.top/node/v1/arb/one/public',
    namespace: 'eip155',
  },
  'eip155:100': {
    chainId: 100,
    name: 'Gnosis',
    logo: '/chain-logos/gnosis.png',
    rgb: '33, 186, 69',
    rpc: 'https://api.zan.top/node/v1/arb/one/public',
    namespace: 'eip155',
  },
};
const provider = new JsonRpcProvider(EIP155_CHAINS['eip155:1'].rpc);

// Begin KK
let ADDRESS = '';
let KEEPKEY_WALLET: any = '';
const onStart = async function () {
  const tag = TAG + ' | onStart | ';
  try {
    console.log(tag, 'Starting...');
    // Connecting to KeepKey
    const app = await onStartKeepkey();
    console.log(tag, 'app: ', app);
    const address = await app.swapKit.getAddress(Chain.Ethereum);
    if (address) {
      KEEPKEY_STATE = 2;
      updateIcon();
    }
    console.log(tag, 'address: ', address);

    // Set addresses
    ADDRESS = address;
    console.log(tag, '**** keepkey: ', app);
    KEEPKEY_WALLET = app;
    console.log(tag, 'KEEPKEY_WALLET: ', KEEPKEY_WALLET);
    // Start listening for approval events
    listenForApproval(KEEPKEY_WALLET, ADDRESS);

    //sync
    await app.getPubkeys();
    await app.getBalances();
  } catch (e) {
    KEEPKEY_STATE = 4; // errored
    updateIcon();
    console.error(tag, 'e: ', e);
  }
};
onStart();

//Poll for keepkey status
// let checkStatus =

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  const tag = TAG + ' | chrome.runtime.onMessage | ';
  console.log(tag, 'message:', message);
  console.log(tag, 'message:', message.type);

  if (message.type === 'WALLET_REQUEST') {
    console.log(tag, 'Background script received WALLET_REQUEST:', message);
    const { method, params, requestInfo, chain } = message;
    const { id, siteUrl } = requestInfo;
    console.log(tag, 'id:', id);
    //TODO verify siteUrl with whitelist
    //if new site, popup to approve
    //if simular to others warn possible phishing

    //@TODO spammy false requests?
    // if(!method) throw Error('invalid request: method is required');
    console.log(tag, 'chain:', chain);
    console.log(tag, 'requestInfo:', requestInfo);
    console.log(tag, 'method:', method);
    console.log(tag, 'params:', params);
    // console.log(tag, 'ADDRESS:', ADDRESS);

    if (method) {
      handleWalletRequest(requestInfo, chain, method, params, provider, KEEPKEY_WALLET, ADDRESS)
        .then(result => {
          console.log(tag, 'RESPONSE: requestInfo.id:', requestInfo.id);
          let id = requestInfo.id;
          const receivedResultString = JSON.stringify(result);
          const receivedResultLength = receivedResultString.length;
          console.log(tag, '(STEP 2) receivedResultString:', receivedResultString);
          console.log(tag, '(STEP 2) receivedResultLength:', receivedResultLength);
          console.log(tag, 'result:', result);
          sendResponse({ result, id });
        })
        .catch(error => {
          sendResponse({ error: error.message, id });
        });
    } else {
      console.log(tag, 'ignored request: ', message, sender);
    }

    return true; // Indicates that the response is asynchronous
  }

  if (message.type === 'GET_KEEPKEY_STATE') {
    sendResponse({ state: KEEPKEY_STATE });
    return true;
  }

  if (message.type === 'ON_START') {
    onStart();
    setTimeout(() => {
      sendResponse({ state: KEEPKEY_STATE });
    }, 15000); // 15000 milliseconds = 15 seconds
    return true;
  }

  // Return false if the message type is not handled
  return false;
});
