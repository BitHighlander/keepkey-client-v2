/*
    Ethereum Provider

 */

import { JsonRpcProvider } from 'ethers';
// @ts-ignore
import { createProviderRpcError } from '../utils'; // Import createProviderRpcError from a common utilities file
import { requestStorage, approvalStorage, assetContextStorage } from '@chrome-extension-boilerplate/storage';
import axios from 'axios';
// import { signMessage, signTransaction, signTypedData, broadcastTransaction, sendTransaction } from './sign';
import { v4 as uuidv4 } from 'uuid';
import { EIP155_CHAINS } from '../chains';

// import { signMessage, signTransaction, signTypedData, sendTransaction } from '../sign';

const TAG = ' | ethereumHandler | ';
const DOMAIN_WHITE_LIST = [];

// const CURRENT_PROVIDER: any = {
//   blockExplorerUrls: ['https://etherscan.io'],
//   caip: 'eip155:1/slip44:60',
//   chainId: '0x1',
//   name: 'Ethereum',
//   providerUrl: 'https://eth.llamarpc.com',
//   provider: new JsonRpcProvider('https://eth.llamarpc.com'),
//   fallbacks: [],
// };

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
  method: string,
  params: any[],
  provider: JsonRpcProvider,
  CURRENT_PROVIDER: any,
  requestInfo: any,
  ADDRESS: string,
  KEEPKEY_WALLET: any,
  requireApproval: (requestInfo: any, chain: any, method: string, params: any) => Promise<void>,
): Promise<any> => {
  const tag = ' | handleEthereumRequest | ';
  console.log('CURRENT_PROVIDER:', CURRENT_PROVIDER);
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
    case 'wallet_addEthereumChain':
    case 'wallet_switchEthereumChain': {
      console.log(tag, method + ' params:', params);
      console.log(tag, method + ' requestInfo:', requestInfo);
      if (!params || !params[0] || !params[0].chainId) throw new Error('Invalid chainId (Required)');
      let chainId = 'eip155:' + convertHexToDecimalChainId(params[0].chainId);
      chainId = sanitizeChainId(chainId);
      console.log(tag, 'Calling wallet_switchEthereumChain chainId:', chainId);
      if (params && params[0] && params[0].rpcUrls && params[0].rpcUrls[0]) {
        console.log(tag, 'Given Params for custom chain addition!');
        console.log(tag, 'params[0]:', params[0]);
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

        console.log('NEW CURRENT_PROVIDER:', CURRENT_PROVIDER);
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

            console.log(tag, 'NEW CURRENT_PROVIDER:', CURRENT_PROVIDER);
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
      //push to local storage
      chrome.runtime.sendMessage({ type: 'PROVIDER_CHANGED', provider: CURRENT_PROVIDER });
      assetContextStorage.updateContext(CURRENT_PROVIDER);
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
    case 'personal_sign':
    case 'eth_sign': {
      // Request approval and wait for user response
      // const approvalResponse = await requireApproval(requestInfo, 'ethereum', method, params[0]);
      // console.log(tag, 'Returning approval response for method:', method);
      //
      // // Wait for approval
      // if (!approvalResponse) {
      //   console.error(tag, 'Approval was denied or an error occurred');
      //   return false; // Or handle this scenario as needed
      // }
      console.log(tag, 'method:', method);
      console.log(tag, 'params:', params);

      let approvalResponse = await processApprovedEvent(method, params, CURRENT_PROVIDER, KEEPKEY_WALLET, ADDRESS);
      //after approval
      return approvalResponse;
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
};

const processApprovedEvent = async (
  method: string,
  params: any,
  CURRENT_PROVIDER: any,
  KEEPKEY_WALLET: any,
  ADDRESS: string,
) => {
  try {
    console.log(TAG, 'processApprovedEvent method:', method);
    console.log(TAG, 'processApprovedEvent params:', params);
    // const EIP155_CHAINS = {
    //   'eip155:1': {
    //     chainId: 1,
    //     name: 'Ethereum',
    //     logo: '/chain-logos/eip155-1.png',
    //     rgb: '99, 125, 234',
    //     rpc: 'https://eth.llamarpc.com',
    //     namespace: 'eip155',
    //   },
    // };
    // // const provider = new JsonRpcProvider(EIP155_CHAINS['eip155:1'].rpc);

    let result;
    switch (method) {
      case 'personal_sign':
      case 'eth_sign':
        result = await signMessage(params, KEEPKEY_WALLET);
        break;
      case 'eth_sendTransaction':
        result = await sendTransaction(params, CURRENT_PROVIDER, CURRENT_PROVIDER.provider, KEEPKEY_WALLET, ADDRESS);
        break;
      case 'eth_signTypedData':
        result = await signTypedData(params, KEEPKEY_WALLET, ADDRESS);
        break;
      default:
        console.error(TAG, `Unsupported event type: ${method}`);
        throw createProviderRpcError(4200, `Method ${method} not supported`);
    }

    console.log(TAG, `Returning result for method ${method}:`, result);
    return result;
  } catch (error) {
    console.error(TAG, 'Error processing approved event:', error);
    throw error; // Re-throw the error so it can be handled upstream if needed
  }
};

const signMessage = async (message: any, KEEPKEY_SDK: any) => {
  try {
    console.log('signMessage: ', message);
    console.log('KEEPKEY_SDK.ETH.walletMethods: ', KEEPKEY_SDK.ETH.walletMethods);
    const address = KEEPKEY_SDK.ETH.wallet.address;
    const messageFormatted = `0x${Buffer.from(
      Uint8Array.from(typeof message === 'string' ? new TextEncoder().encode(message) : message),
    ).toString('hex')}`;
    return KEEPKEY_SDK.eth.ethSign({ address, message: messageFormatted });
  } catch (e) {
    console.error(e);
    throw createProviderRpcError(4000, 'Error signing message', e);
  }
};

const signTransaction = async (transaction: any, provider: JsonRpcProvider, KEEPKEY_WALLET: any) => {
  const tag = ' | signTransaction | ';
  try {
    console.log(tag, '**** transaction: ', transaction);
    console.log(tag, '**** KEEPKEY_WALLET: ', KEEPKEY_WALLET);
    console.log(tag, '**** KEEPKEY_WALLET: ', KEEPKEY_WALLET.ETH);
    console.log(tag, '**** KEEPKEY_WALLET: ', KEEPKEY_WALLET.ETH.keepkeySdk);
    let KEEPKEY_SDK = KEEPKEY_WALLET.ETH.keepkeySdk;

    if (!transaction.from) throw createProviderRpcError(4000, 'Invalid transaction: missing from');
    if (!transaction.to) throw createProviderRpcError(4000, 'Invalid transaction: missing to');
    if (!transaction.chainId) throw createProviderRpcError(4000, 'Invalid transaction: missing chainId');

    const nonce = await provider.getTransactionCount(transaction.from, 'pending');
    transaction.nonce = `0x${nonce.toString(16)}`;

    const feeData = await provider.getFeeData();
    console.log('feeData: ', feeData);
    transaction.gasPrice = `0x${BigInt(feeData.gasPrice || '0').toString(16)}`;
    transaction.maxFeePerGas = `0x${BigInt(feeData.maxFeePerGas || '0').toString(16)}`;
    transaction.maxPriorityFeePerGas = `0x${BigInt(feeData.maxPriorityFeePerGas || '0').toString(16)}`;

    try {
      const estimatedGas = await provider.estimateGas({
        from: transaction.from,
        to: transaction.to,
        data: transaction.data,
      });
      console.log('estimatedGas: ', estimatedGas);
      transaction.gas = `0x${estimatedGas.toString(16)}`;
    } catch (e) {
      transaction.gas = `0x${BigInt('1000000').toString(16)}`;
    }

    const input: any = {
      from: transaction.from,
      addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
      data: transaction.data || '0x',
      nonce: transaction.nonce,
      gasLimit: transaction.gas,
      gas: transaction.gas,
      value: transaction.value || '0x0',
      to: transaction.to,
      chainId: `0x${transaction.chainId.toString(16)}`,
      gasPrice: transaction.gasPrice,
      maxFeePerGas: transaction.maxFeePerGas,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
    };

    console.log(`${tag} Final input: `, input);
    console.log(`${tag} KEEPKEY_SDK: `, KEEPKEY_SDK);
    const output = await KEEPKEY_SDK.eth.ethSignTransaction(input);
    console.log(`${tag} Transaction output: `, output);

    return output.serialized;
  } catch (e) {
    console.error(`${tag} Error: `, e);
    throw createProviderRpcError(4000, 'Error signing transaction', e);
  }
};

const signTypedData = async (params: any, KEEPKEY_SDK: any, ADDRESS: string) => {
  const tag = ' | signTypedData | ';
  try {
    console.log(tag, '**** params: ', params);
    console.log(tag, '**** params: ', typeof params);
    if (typeof params === 'string') params = JSON.parse(params);

    const payload = {
      address: ADDRESS,
      addressNList: [2147483692, 2147483708, 2147483648, 0, 0], //TODO multi path
      typedData: params,
    };
    console.log(tag, '**** payload: ', payload);

    const signedMessage = await KEEPKEY_SDK.eth.ethSignTypedData(payload);
    console.log(tag, '**** signedMessage: ', signedMessage);
    return signedMessage;
  } catch (e) {
    console.error(`${tag} Error: `, e);
    throw createProviderRpcError(4000, 'Error signing typed data', e);
  }
};

const broadcastTransaction = async (signedTx: string, networkId: string, provider: JsonRpcProvider) => {
  try {
    const receipt = await provider.send('eth_sendRawTransaction', [signedTx]);
    console.log('Transaction receipt:', receipt);

    return receipt;
  } catch (e) {
    console.error(e);
    throw createProviderRpcError(4000, 'Error broadcasting transaction', e);
  }
};

const sendTransaction = async (
  params: any,
  CURRENT_PROVIDER: any,
  provider: JsonRpcProvider,
  KEEPKEY_WALLET: any,
  ADDRESS: string,
) => {
  const tag = ' | sendTransaction | ';
  try {
    console.log(tag, 'User accepted the request'); //TODO approve flow
    console.log(tag, 'transaction:', params);
    console.log(tag, 'CURRENT_PROVIDER: ', CURRENT_PROVIDER);
    const transaction = params[0];
    const chainId = CURRENT_PROVIDER.chainId; //TODO get chainId from provider
    transaction.chainId = chainId;
    transaction.from = ADDRESS;
    const signedTx = await signTransaction(transaction, provider, KEEPKEY_WALLET);
    console.log(tag, 'signedTx:', signedTx);

    const result = await broadcastTransaction(signedTx, chainId, provider);
    console.log(tag, 'result:', result);
    return result;

    //nerf
    // return '0x60b4fbee93d0b884186948a7428841922a9984fe92ecba46a1550a87b7a60715';
  } catch (e) {
    console.error(e);
    throw createProviderRpcError(4000, 'Error sending transaction', e);
  }
};
