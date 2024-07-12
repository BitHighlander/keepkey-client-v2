import 'webextension-polyfill';
import { exampleThemeStorage } from '@chrome-extension-boilerplate/storage';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import packageJson from '../../package.json'; // Adjust the path as needed
import { onStartKeepkey } from './keepkey';
import { handleEthereumRequest } from './methods';
import { JsonRpcProvider } from 'ethers';
const TAG = ' | background | ';
console.log('background script loaded');
console.log('Version:', packageJson.version);

const KEEPKEY_STATES = {
  0: 'unknown',
  1: 'disconnected',
  2: 'connected',
  3: 'errored',
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
    rpc: 'https://eth.llamarpc.com',
    namespace: 'eip155',
  },
};
const provider = new JsonRpcProvider(EIP155_CHAINS['eip155:1'].rpc);

//Begin KK
let ADDRESS = '';
let KEEPKEY_SDK: any = '';
const onStart = async function () {
  const tag = TAG + ' | onStart | ';
  try {
    console.log(tag, 'Starting...');
    // Connecting to KeepKey
    const keepkey = await onStartKeepkey();
    console.log(tag, 'keepkey: ', keepkey);
    const address = keepkey.ETH.wallet.address;
    if (address) {
      KEEPKEY_STATE = 2;
      updateIcon();
    }
    console.log(tag, 'address: ', address);

    // Set addresses
    ADDRESS = address;
    console.log(tag, '**** keepkey: ', keepkey);
    KEEPKEY_SDK = keepkey.ETH.keepkeySdk;
    console.log(tag, 'keepkeySdk: ', KEEPKEY_SDK);
  } catch (e) {
    console.error(tag, 'e: ', e);
  }
};
onStart();

// Function to create the popup window

// Methods that should trigger the popup
// const POPUP_METHODS = [
//   'eth_signTypedData',
//   'eth_signTypedData_v4',
//   'eth_signTypedData_v3',
//   'eth_sign',
//   'eth_sendTransaction',
// ];

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  const tag = 'ETH_MOCK | chrome.runtime.onMessage | ';
  console.log(tag, 'message:', message);

  if (message.type === 'ETH_REQUEST') {
    console.log(tag, 'Background script received ETH_REQUEST:', message);
    const { method, params } = message;
    console.log(tag, 'method:', method);
    console.log(tag, 'params:', params);
    console.log(tag, 'ADDRESS:', ADDRESS);
    // console.log(tag, 'KEEPKEY_SDK:', KEEPKEY_SDK);

    // Check if the method is one of the specific methods that should trigger the popup
    // eslint-disable-next-line no-constant-condition
    // if (POPUP_METHODS.includes(method)) {
    //   openPopupWindow();
    // }

    handleEthereumRequest(method, params, provider, KEEPKEY_SDK, ADDRESS)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });

    return true; // Indicates that the response is asynchronous
  }

  // Return false if the message type is not 'ETH_REQUEST'
  return false;
});
