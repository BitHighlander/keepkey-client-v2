import { JsonRpcProvider } from 'ethers';
import { requestStorage, approvalStorage } from '@chrome-extension-boilerplate/storage';
import { signMessage, signTransaction, signTypedData, broadcastTransaction, sendTransaction } from './sign';

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

const requireApproval = async function (requestInfo: any, method: string, params: any, KEEPKEY_SDK: any) {
  const tag = TAG + ' | requireApproval | ';
  try {
    isPopupOpen = true;
    const event: Event = {
      id: '', // ID will be generated in storage
      type: method,
      request: params,
      status: 'request',
      timestamp: new Date().toISOString()
    };

    const eventSaved = await requestStorage.addEvent(event);
    if (eventSaved) {
      console.log(tag, 'Event saved:', event);
    } else {
      throw new Error('Event not saved');
    }

    chrome.windows.getAll({ windowTypes: ['popup'] }, windows => {
      for (const win of windows) {
        if (win.tabs && win.tabs[0].url.includes('popup/index.html')) {
          console.log('Popup is already open, focusing on it.');
          chrome.windows.update(win.id, { focused: true });
          chrome.runtime.sendMessage({ action: 'eth_sign', request: params });
          isPopupOpen = false;
          return;
        }
      }

      chrome.windows.create(
          {
            url: chrome.runtime.getURL('popup/index.html'),
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
              chrome.windows.onRemoved.addListener(function popupCloseListener(windowId) {
                if (window.id === windowId) {
                  isPopupOpen = false;
                  chrome.windows.onRemoved.removeListener(popupCloseListener);
                }
              });
            }
          }
      );
    });
  } catch (e) {
    console.error(tag, e);
  }
};

const listenForApproval = (KEEPKEY_SDK: any) => {
  const tag = TAG + ' | listenForApproval | ';

  const processApprovedEvent = async (event: Event) => {
    try {
      console.log(tag, 'Processing approved event:', event);
      const provider = new JsonRpcProvider();
      const ADDRESS = '0xAddress'; // Replace with the correct address or fetch dynamically

      switch (event.type) {
        case 'eth_sign':
          await signMessage(event.request, KEEPKEY_SDK);
          break;
        case 'eth_sendTransaction':
          await sendTransaction(event.request, provider, KEEPKEY_SDK, ADDRESS);
          break;
        case 'eth_signTypedData':
          await signTypedData(event.request, KEEPKEY_SDK, ADDRESS);
          break;
        default:
          console.error(tag, `Unsupported event type: ${event.type}`);
          throw createProviderRpcError(4200, `Method ${event.type} not supported`);
      }

      // await completeEvent(event.id);
    } catch (error) {
      console.error(tag, 'Error processing approved event:', error);
    }
  };

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
      if (message.action === 'eth_sign_response' && message.response.decision === 'accept') {
        const approvedEventId = message.response.eventId;
        const approvedEvent = await approvalStorage.getEventById(approvedEventId);
        if (approvedEvent && approvedEvent.status === 'approval') {
          await processApprovedEvent(approvedEvent);
        } else {
          console.error(tag, 'Approved event not found or status is incorrect:', approvedEventId);
        }
      }
    } catch (error) {
      console.error(tag, 'Error handling message:', error);
    }
  });

  approvalStorage.subscribe(async changes => {
    try {
      for (const [key, change] of Object.entries(changes)) {
        if (change.newValue) {
          const event: Event = change.newValue;
          if (event.status === 'approval') {
            await processApprovedEvent(event);
          }
        }
      }
    } catch (error) {
      console.error(tag, 'Error handling storage changes:', error);
    }
  });
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
  const tag = 'ETH_MOCK | handleEthereumRequest | ';
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
      case 'eth_sign':
        await requireApproval(requestInfo, method, params[0], KEEPKEY_SDK);
        console.log(tag, 'Calling signMessage with:', params[1]);
        return await signMessage(params[1], KEEPKEY_SDK);
      case 'eth_sendTransaction':
        await requireApproval(requestInfo, method, params[0], KEEPKEY_SDK);
        console.log(tag, 'Calling sendTransaction with:', params[0]);
        return await sendTransaction(params[0], provider, KEEPKEY_SDK, ADDRESS);
      case 'eth_signTransaction':
        console.log(tag, 'Calling signTransaction with:', params[0]);
        return await signTransaction(params[0], provider, KEEPKEY_SDK);
      case 'eth_sendRawTransaction':
        console.log(tag, 'Calling broadcastTransaction with:', params[0], 'and chainId 1');
        return await broadcastTransaction(params[0], '1', provider); // Assuming chainId is 1
      case 'eth_signTypedData':
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

// Start listening for approval events
export const initApprovalListener = (KEEPKEY_SDK: any) => {
  listenForApproval(KEEPKEY_SDK);
};
