import 'webextension-polyfill';
import { exampleThemeStorage } from '@chrome-extension-boilerplate/storage';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import packageJson from '../../package.json'; // Adjust the path as needed
// import { onStartKeepkey } from './keepkey';
import { handleEthereumRequest } from './methods';
import { JsonRpcProvider } from 'ethers';
const TAG = ' | background | ';
console.log('background script loaded');
console.log('Version:', packageJson.version);

// Function to update the extension icon based on the theme
function updateIcon(theme:any) {
  const iconPath = theme === 'dark' ? './icon-128.png' : './icon-128.png';

  chrome.action.setIcon({ path: iconPath }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting icon:', chrome.runtime.lastError);
    }
  });
}

// Initial setup to set the icon based on the current theme
exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
  updateIcon(theme || 'light');
});

// Listener for theme changes
chrome.runtime.onMessage.addListener((message:any, sender:any, sendResponse:any) => {
  if (message.type === 'themeChanged') {
    updateIcon(message.theme);
    sendResponse({ status: 'icon updated' });
  }
});

// Ensure the icon is set when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['theme'], result => {
    const theme = result.theme || 'light'; // Default to light theme if not set
    updateIcon(theme);
  });
});

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
    // const keepkey = await onStartKeepkey();
    // console.log(tag, 'keepkey: ', keepkey);
    // const address = keepkey.ETH.wallet.address;
    // console.log(tag, 'address: ', address);

    // Set addresses
    ADDRESS = '0x241D9959cAe3853b035000490C03991eB70Fc4aC';
    // console.log(tag, '**** keepkey: ', keepkey);
    KEEPKEY_SDK = {}
    // console.log(tag, 'keepkeySdk: ', KEEPKEY_SDK);
  } catch (e) {
    console.error(tag, 'e: ', e);
  }
};
onStart();

// Function to create the popup window
function openPopupWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'), // Adjust the URL to your popup file
    type: 'popup',
    width: 400,
    height: 600,
  }, (window) => {
    if (chrome.runtime.lastError) {
      console.error('Error creating popup:', chrome.runtime.lastError);
    } else {
      console.log('Popup window created:', window);
    }
  });
}

// Methods that should trigger the popup
const POPUP_METHODS = ['signing', 'anotherMethod', 'yetAnotherMethod'];

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
    // if (POPUP_METHODS.includes(method) || true) {
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
