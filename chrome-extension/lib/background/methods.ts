import { JsonRpcProvider } from 'ethers';
import { requestStorage, approvalStorage } from '@chrome-extension-boilerplate/storage';
import { signMessage, signTransaction, signTypedData, broadcastTransaction, sendTransaction } from './sign';
import { v4 as uuidv4 } from 'uuid';
const TAG = ' | METHODS | ';
const DOMAIN_WHITE_LIST = [];

type Event = {
  id: string;
  type: string;
  request: any;
  status: 'request' | 'approval' | 'completed';
  timestamp: string;
};

interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export const createProviderRpcError = (code: number, message: string, data?: unknown): ProviderRpcError => {
  const error = new Error(message) as ProviderRpcError;
  error.code = code;
  if (data) error.data = data;
  return error;
};

let isPopupOpen = false; // Flag to track popup state

const openPopup = function () {
  const tag = TAG + ' | openPopup | ';
  try {
    console.log(tag, 'Opening popup');
    chrome.windows.create(
      {
        url: chrome.runtime.getURL('popup/index.html'), // Adjust the URL to your popup file
        type: 'popup',
        width: 400,
        height: 600,
      },
      window => {
        if (chrome.runtime.lastError) {
          console.error('Error creating popup:', chrome.runtime.lastError);
          isPopupOpen = false;
        } else {
          console.log('Popup window created:', window);

          // Continuously focus the popup to simulate "always on top"
          const intervalId = setInterval(() => {
            chrome.windows.update(window.id, { focused: true }, updatedWindow => {
              if (chrome.runtime.lastError) {
                console.error('Error focusing popup:', chrome.runtime.lastError);
                clearInterval(intervalId); // Stop the interval if there is an error
              } else {
                console.log('Popup window focused:', updatedWindow);
              }
            });
          }, 600); // Adjust the interval as needed

          // Optionally, clear the interval when the popup is closed
          chrome.windows.onRemoved.addListener(windowId => {
            if (windowId === window.id) {
              clearInterval(intervalId);
              console.log('Popup window closed, interval cleared');
            }
          });
        }
      },
    );
  } catch (e) {
    console.error(tag, e);
  }
};

// const openPopup = function () {
//   const tag = TAG + ' | openPopup | ';
//   try {
//     console.log(tag, 'Opening popup');
//     chrome.windows.create(
//       {
//         url: chrome.runtime.getURL('popup/index.html'), // Adjust the URL to your popup file
//         type: 'popup',
//         width: 400,
//         height: 600,
//       },
//       window => {
//         if (chrome.runtime.lastError) {
//           console.error('Error creating popup:', chrome.runtime.lastError);
//           isPopupOpen = false;
//         } else {
//           console.log('Popup window created:', window);
//         }
//       },
//     );
//   } catch (e) {
//     console.error(tag, e);
//   }
// };

const requireApproval = async function (requestInfo: any, method: string, params: any, KEEPKEY_SDK: any) {
  const tag = TAG + ' | requireApproval | ';
  try {
    isPopupOpen = true;
    const event: Event = {
      id: uuidv4(), // ID will be generated in storage
      type: method,
      request: params,
      status: 'request',
      timestamp: new Date().toISOString(),
    };
    console.log(tag, 'Requesting approval for event:', event);
    const eventSaved = await requestStorage.addEvent(event);
    if (eventSaved) {
      console.log(tag, 'eventSaved:', eventSaved);
      console.log(tag, 'Event saved:', event);
    } else {
      throw new Error('Event not saved');
    }
    openPopup();
  } catch (e) {
    console.error(tag, e);
  }
};

const requireUnlock = function (requestInfo: any, method: string, params: any, KEEPKEY_SDK: any) {
  const tag = TAG + ' | requireUnlock | ';
  try {
    console.log(tag, 'requireUnlock for domain');
    openPopup();
  } catch (e) {
    console.error(e);
    isPopupOpen = false;
  }
};

export const handleEthereumRequest = async (
  requestInfo: any,
  method: string,
  params: any[],
  provider: JsonRpcProvider,
  KEEPKEY_SDK: any,
  ADDRESS: string,
): Promise<any> => {
  const tag = ' | handleEthereumRequest | ';
  try {
    console.log(tag, 'requestInfo:', requestInfo);
    if (!requestInfo) throw Error('Can not validate request! refusing to proceed.');

    if (!ADDRESS) {
      console.log('Device is not paired!');
      await requireUnlock(requestInfo, method, params, KEEPKEY_SDK);
    }

    switch (method) {
      case 'eth_chainId':
        console.log(tag, 'Returning eth_chainId:', '0x1');
        return '0x1';
      case 'net_version':
        console.log(tag, 'Returning net_version:', '1');
        return '1';
      case 'eth_getBlockByNumber':
        console.log(tag, 'Calling eth_getBlockByNumber with:', params);
        return await provider.getBlock(params[0]);
      case 'eth_blockNumber':
        console.log(tag, 'Calling eth_blockNumber');
        return await provider.getBlockNumber();
      case 'eth_getBalance':
        console.log(tag, 'Calling eth_getBalance with:', params);
        return await provider.getBalance(params[0], params[1]);
      case 'eth_getTransactionReceipt':
        console.log(tag, 'Calling eth_getTransactionReceipt with:', params);
        return await provider.getTransactionReceipt(params[0]);
      case 'eth_getTransactionByHash':
        console.log(tag, 'Calling eth_getTransactionByHash with:', params);
        return await provider.getTransaction(params[0]);
      case 'eth_call':
        console.log(tag, 'Calling eth_call with:', params);
        return await provider.call(params[0]);
      case 'eth_estimateGas':
        console.log(tag, 'Calling eth_estimateGas with:', params);
        return await provider.estimateGas(params[0]);
      case 'eth_gasPrice':
        console.log(tag, 'Calling eth_gasPrice');
        return await provider.getGasPrice();
      case 'wallet_addEthereumChain':
      case 'wallet_switchEthereumChain':
      case 'wallet_watchAsset':
        console.log(tag, method + ' Returning true');
        return true;
      case 'wallet_getPermissions':
      case 'wallet_requestPermissions':
        return [{ parentCapability: 'eth_accounts' }];
      case 'eth_accounts':
        console.log(tag, 'Returning eth_accounts:', [ADDRESS]);
        return [ADDRESS];
      case 'eth_requestAccounts':
        console.log(tag, 'Returning eth_requestAccounts:', [ADDRESS]);
        return [ADDRESS];
      case 'eth_sendRawTransaction':
      case 'eth_signTypedData_v3':
      case 'eth_signTransaction':
      case 'eth_sendTransaction':
      case 'eth_sign':
        await requireApproval(requestInfo, method, params[0], KEEPKEY_SDK);
        return true;
      case 'eth_getEncryptionPublicKey':
      case 'eth_signTypedData_v4':
        throw createProviderRpcError(4200, 'Method eth_signTypedData_v4 not supported');
      default:
        console.log(tag, `Method ${method} not supported`);
        throw createProviderRpcError(4200, `Method ${method} not supported`);
    }
  } catch (error) {
    console.error(tag, `Error processing method ${method}:`, error);

    if (error.code && error.message) {
      throw error;
    } else {
      throw createProviderRpcError(4000, `Unexpected error processing method ${method}`, error);
    }
  }
};
