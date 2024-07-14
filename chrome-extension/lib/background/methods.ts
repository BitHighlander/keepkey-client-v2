import { JsonRpcProvider } from 'ethers';
import { keepKeyEventsStorage } from '@chrome-extension-boilerplate/storage'; // Import both storages
import { signMessage, signTransaction, signTypedData, broadcastTransaction, sendTransaction } from './sign';

const TAG = ' | METHODS | ';

const DOMAIN_WHITE_LIST = [];

interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

const createProviderRpcError = (code: number, message: string, data?: unknown): ProviderRpcError => {
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
        }
      },
    );
  } catch (e) {
    console.error(tag, e);
  }
};

const requireApproval = function (requestInfo: any, method: string, params: any, KEEPKEY_SDK: any) {
  if (isPopupOpen) {
    console.log('Popup is already in the process of being opened.');
    return;
  }
  isPopupOpen = true;
  keepKeyEventsStorage.addEvent({ requestInfo, type: method, request: params });
  // First, check if the popup is already open
  chrome.windows.getAll({ windowTypes: ['popup'] }, windows => {
    for (const win of windows) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      if (win.tabs && win.tabs[0].url.includes('popup/index.html')) {
        console.log('Popup is already open, focusing on it.');
        chrome.windows.update(win.id, { focused: true });
        chrome.runtime.sendMessage({ action: 'eth_sign', request: params });
        isPopupOpen = false;
        return;
      }
    }

    // If the popup is not open, create a new one
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
          // Add event listener for popup close
          chrome.windows.onRemoved.addListener(function popupCloseListener(windowId) {
            if (window.id === windowId) {
              isPopupOpen = false;
              chrome.windows.onRemoved.removeListener(popupCloseListener);
            }
          });
          // Send the sign request message to the newly created popup
          chrome.runtime.sendMessage({ action: method, request: params });
        }
      },
    );
  });
};

//locked
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
  const tag = 'ETH_MOCK | handleEthereumRequest | ';
  try {
    console.log(tag, 'requestInfo:', requestInfo);
    if (!requestInfo) throw Error('Can not validate request! refusing to proceed.');
    //TODO enforce url whitelist
    // if (requestInfo.siteUrl && !DOMAIN_WHITE_LIST.includes(requestInfo.siteUrl)) {
    //   console.log('Domain needs approval!');
    //   await requireUnlock(requestInfo, method, params, KEEPKEY_SDK);
    // }
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
      case 'eth_sign':
        // eslint-disable-next-line no-case-declarations
        const userApprovedEthSign = await requireApproval(requestInfo, method, params[0], KEEPKEY_SDK);
        console.log(tag, 'Calling signMessage with:', params[1]);
        if (userApprovedEthSign) {
          return sendTransaction(params, provider, KEEPKEY_SDK, ADDRESS);
        } else {
          return {
            code: 4001,
            message: 'User rejected the transaction',
          };
        }
      case 'eth_sendTransaction':
        // eslint-disable-next-line no-case-declarations
        const userApproved = await requireApproval(requestInfo, method, params[0], KEEPKEY_SDK);
        console.log(tag, 'Calling sendTransaction with:', params[0]);
        if (userApproved) {
          //save to events

          return sendTransaction(params, provider, KEEPKEY_SDK, ADDRESS);
        } else {
          return {
            code: 4001,
            message: 'User rejected the transaction',
          };
        }
      case 'eth_signTransaction':
        console.log(tag, 'Calling signTransaction with:', params[0]);
        return await signTransaction(params[0], provider, KEEPKEY_SDK);
      case 'eth_sendRawTransaction':
        console.log(tag, 'Calling broadcastTransaction with:', params[0], 'and chainId 1');
        return await broadcastTransaction(params[0], '1', provider); // Assuming chainId is 1
      case 'eth_signTypedData':
        // eslint-disable-next-line no-case-declarations
        const typedData = {
          types: { Message: params[0].map((param: any) => ({ name: param.name, type: param.type })) },
          primaryType: 'Message',
          domain: {},
          message: params[0].reduce((msg: any, param: any) => {
            msg[param.name] = param.value;
            return msg;
          }, {}),
        };
        return await signTypedData(typedData, KEEPKEY_SDK, ADDRESS);
      case 'eth_signTypedData_v4':
        throw createProviderRpcError(4200, 'Method eth_signTypedData_v4 not supported');
      case 'eth_signTypedData_v3':
        return await signTypedData(params[1], KEEPKEY_SDK, ADDRESS);
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
