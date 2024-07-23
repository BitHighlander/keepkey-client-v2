import { JsonRpcProvider } from 'ethers';
import { requestStorage, approvalStorage } from '@chrome-extension-boilerplate/storage';
import axios from 'axios';
// import { signMessage, signTransaction, signTypedData, broadcastTransaction, sendTransaction } from './sign';
import { v4 as uuidv4 } from 'uuid';
import { EIP155_CHAINS } from './chains';

const TAG = ' | METHODS | ';
const DOMAIN_WHITE_LIST = [];

const CURRENT_PROVIDER: any = {
  chainId: '0x1',
  blockExplorerUrls: ['https://etherscan.io'],
  name: 'Ethereum',
  providerUrl: 'https://eth.llamarpc.com',
  provider: new JsonRpcProvider('https://eth.llamarpc.com'),
  fallbacks: [],
};

interface ChainInfo {
  chainId: string;
  name: string;
  logo: string;
  rgb: string;
  rpc: string;
  namespace: string;
  caip: string;
}

interface Eip155Chains {
  [key: string]: ChainInfo;
}

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
          // const intervalId = setInterval(() => {
          //   chrome.windows.update(window.id, { focused: true }, updatedWindow => {
          //     if (chrome.runtime.lastError) {
          //       console.error('Error focusing popup:', chrome.runtime.lastError);
          //       clearInterval(intervalId); // Stop the interval if there is an error
          //     } else {
          //       console.log('Popup window focused:', updatedWindow);
          //     }
          //   });
          // }, 600); // Adjust the interval as needed
          //
          // // Optionally, clear the interval when the popup is closed
          // chrome.windows.onRemoved.addListener(windowId => {
          //   if (windowId === window.id) {
          //     clearInterval(intervalId);
          //     console.log('Popup window closed, interval cleared');
          //   }
          // });
        }
      },
    );
  } catch (e) {
    console.error(tag, e);
  }
};

const requireApproval = async function (requestInfo: any, method: string, params: any) {
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

const requireUnlock = async function () {
  const tag = TAG + ' | requireUnlock | ';
  try {
    console.log(tag, 'requireUnlock for domain');
    openPopup();
  } catch (e) {
    console.error(e);
    isPopupOpen = false;
  }
};

const convertHexToDecimalChainId = (hexChainId: string): number => {
  return parseInt(hexChainId, 16);
};

const sanitizeChainId = (chainId: string): string => {
  return chainId.replace(/^0x0x/, '0x');
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
    if (!requestInfo) throw Error('Cannot validate request! Refusing to proceed.');

    if (!ADDRESS || !ADDRESS.length) {
      console.log('Device is not paired!');
      await requireUnlock();
    }

    switch (method) {
      case 'eth_chainId': {
        console.log(tag, 'Returning eth_chainId:', CURRENT_PROVIDER.chainId);
        return CURRENT_PROVIDER.chainId;
      }
      case 'net_version': {
        const netVersion = CURRENT_PROVIDER.chainId.toString();
        console.log(tag, 'Returning net_version:', netVersion);
        return convertHexToDecimalChainId(netVersion).toString();
      }
      case 'eth_getBlockByNumber': {
        const blockByNumber = await CURRENT_PROVIDER.provider.getBlock(params[0]);
        console.log(tag, 'Returning eth_getBlockByNumber:', blockByNumber);
        return blockByNumber;
      }
      case 'eth_blockNumber': {
        const blockNumber = await CURRENT_PROVIDER.provider.getBlockNumber();
        console.log(tag, 'Returning eth_blockNumber:', blockNumber);
        return '0x' + blockNumber.toString(16);
      }
      case 'eth_getBalance': {
        const balance = await CURRENT_PROVIDER.provider.getBalance(params[0], params[1]);
        console.log(tag, 'Returning eth_getBalance:', balance);
        return balance;
      }
      case 'eth_getTransactionReceipt': {
        const transactionReceipt = await CURRENT_PROVIDER.provider.getTransactionReceipt(params[0]);
        console.log(tag, 'Returning eth_getTransactionReceipt:', transactionReceipt);
        return transactionReceipt;
      }
      case 'eth_getTransactionByHash': {
        const transactionByHash = await CURRENT_PROVIDER.provider.getTransaction(params[0]);
        console.log(tag, 'Returning eth_getTransactionByHash:', transactionByHash);
        return transactionByHash;
      }
      case 'eth_call': {
        console.log(tag, 'Calling eth_call with:', params);
        const [callParams, blockTag, stateOverride] = params;
        console.log(tag, 'CURRENT_PROVIDER:', CURRENT_PROVIDER);
        // Ensure callParams and blockTag are properly passed to the provider.call method
        const callResult = await CURRENT_PROVIDER.provider.call(callParams, blockTag, stateOverride);
        console.log(tag, 'callResult:', callResult);
        const callResultString = JSON.stringify(callResult);
        const callResultLength = callResultString.length;
        console.log(tag, '(STEP 1) callResultLength:', callResultLength);

        return callResult;
      }
      case 'eth_estimateGas': {
        const estimateGas = await CURRENT_PROVIDER.provider.estimateGas(params[0]);
        console.log(tag, 'Returning eth_estimateGas:', estimateGas);
        return estimateGas;
      }
      case 'eth_gasPrice': {
        const gasPrice = await CURRENT_PROVIDER.provider.getGasPrice();
        console.log(tag, 'Returning eth_gasPrice:', gasPrice);
        return gasPrice;
      }
      case 'wallet_getSnaps':
        return [];
      case 'wallet_addEthereumChain':
      case 'wallet_switchEthereumChain': {
        console.log(tag, 'Calling wallet_switchEthereumChain with:', params);
        if (!params || !params[0] || !params[0].chainId) throw new Error('Invalid chainId (Required)');
        let chainId = 'eip155:' + convertHexToDecimalChainId(params[0].chainId);
        chainId = sanitizeChainId(chainId);
        console.log(tag, 'Calling wallet_switchEthereumChain chainId:', chainId);
        if (params && params[0] && params[0].rpcUrls && params[0].rpcUrls[0]) {
          console.log(tag, 'Given Params for custom chain addition!');
          /*
              Example from thechainlist.org:
              {
                "blockExplorerUrls": ["https://bscscan.com"],
                "chainId": "0x38",
                "chainName": "BNB Chain LlamaNodes",
                "nativeCurrency": {
                  "name": "BNB Chain Native Token",
                  "symbol": "BNB",
                  "decimals": 18
                },
                "rpcUrls": [
                  "https://binance.llamarpc.com",
                ]
              }
          */
          //blockExplorerUrls
          CURRENT_PROVIDER.blockExplorerUrls = params[0].blockExplorerUrls;
          CURRENT_PROVIDER.chainId = sanitizeChainId(params[0].chainId);
          CURRENT_PROVIDER.caip = `eip155:${parseInt(params[0].chainId, 16)}/slip44:60`;
          CURRENT_PROVIDER.name = params[0].chainName;
          CURRENT_PROVIDER.nativeCurrency = params[0].nativeCurrency;
          CURRENT_PROVIDER.providerUrl = params[0].rpcUrls[0];
          CURRENT_PROVIDER.provider = new JsonRpcProvider(params[0].rpcUrls[0]);

          //TODO check if loaded locally
          //if new send to pioneer api
        } else {
          console.log(tag, 'chain switch (must be a known chain)');
          /*
              Assuming ONLY chainId is provided
          */
          const chainIdToFind = sanitizeChainId(params[0].chainId);
          console.log(tag, 'chainIdToFind:', chainIdToFind);
          let chainFound = false;

          for (const key of Object.keys(EIP155_CHAINS)) {
            if (EIP155_CHAINS[key].chainId === chainIdToFind) {
              CURRENT_PROVIDER.chainId = chainIdToFind;
              CURRENT_PROVIDER.caip = EIP155_CHAINS[key].caip;
              CURRENT_PROVIDER.name = EIP155_CHAINS[key].name;
              CURRENT_PROVIDER.providerUrl = EIP155_CHAINS[key].rpc;
              CURRENT_PROVIDER.provider = new JsonRpcProvider(EIP155_CHAINS[key].rpc);
              chainFound = true;
              break;
            }
          }

          if (!chainFound) {
            throw new Error(`Chain with chainId ${chainIdToFind} not found.`);
          }
        }
        // const chain = EIP155_CHAINS[chainId];
        //get market info by caip
        if (CURRENT_PROVIDER.caip) {
          // const marketInfo = await axios.get(`https://pioneers.dev/api/v1/assetByCaip/${CURRENT_PROVIDER.caip}`);
          // console.log(tag, 'Market info:', marketInfo.data);
          // CURRENT_PROVIDER.marketInfo = marketInfo.data;
        }
        // if (chain) {
        //   console.log('Found Chain in EIP155_CHAINS: ', chain);
        //   CURRENT_PROVIDER.chainId = chain.chainId;
        //   CURRENT_PROVIDER.name = chain.name;
        //   CURRENT_PROVIDER.provider = new JsonRpcProvider(chain.rpc);
        //   console.log(tag, `${method} switched to chain:`, chain.name);
        //   return true;
        // } else {
        //   console.log('Not Found Chain: ', chainId);
        //   throw createProviderRpcError(4902, 'Chain not found');
        // }
        return true;
      }
      case 'wallet_getSnaps': {
        console.log(tag, method + ' Returning true');
        return [];
      }
      case 'wallet_watchAsset': {
        console.log(tag, method + ' Returning true');
        return true;
      }
      case 'wallet_getPermissions':
      case 'wallet_requestPermissions': {
        const permissions = [{ parentCapability: 'eth_accounts' }];
        console.log(tag, 'Returning permissions:', permissions);
        return permissions;
      }
      case 'eth_accounts': {
        const accounts = [ADDRESS];
        console.log(tag, 'Returning eth_accounts:', accounts);
        return accounts;
      }
      case 'eth_requestAccounts': {
        const requestAccounts = [ADDRESS];
        console.log(tag, 'Returning eth_requestAccounts:', requestAccounts);
        return requestAccounts;
      }
      case 'eth_sendRawTransaction':
      case 'eth_signTypedData_v3':
      case 'eth_signTransaction':
      case 'eth_sendTransaction':
      case 'eth_sign': {
        await requireApproval(requestInfo, method, params[0]);
        console.log(tag, 'Returning approval response for method:', method);
        return true;
      }
      case 'eth_getEncryptionPublicKey':
      case 'eth_signTypedData_v4': {
        throw createProviderRpcError(4200, 'Method eth_signTypedData_v4 not supported');
      }
      default: {
        console.log(tag, `Method ${method} not supported`);
        throw createProviderRpcError(4200, `Method ${method} not supported`);
      }
    }
  } catch (error) {
    console.error(tag, `Error processing method ${method}:`, error);

    if ((error as ProviderRpcError).code && (error as ProviderRpcError).message) {
      throw error;
    } else {
      throw createProviderRpcError(4000, `Unexpected error processing method ${method}`, error);
    }
  }
};

// Handle message to get the current provider
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  const tag = TAG + ' | chrome.runtime.onMessage | ';

  if (message.type === 'GET_PROVIDER') {
    sendResponse({ provider: CURRENT_PROVIDER });
    return true;
  }

  // Return false if the message type is not handled
  return false;
});
