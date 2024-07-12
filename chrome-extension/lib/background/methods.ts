import { JsonRpcProvider } from 'ethers';
const TAG = ' | METHODS | ';
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

const requireApproval = function (method: string, params: any, KEEPKEY_SDK: any) {
  if (isPopupOpen) {
    console.log('Popup is already in the process of being opened.');
    return;
  }
  isPopupOpen = true;
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
const requireUnlock = function (method: string, params: any, KEEPKEY_SDK: any) {
  const tag = TAG + ' | requireUnlock | ';
  if (isPopupOpen) {
    console.log('Popup is already in the process of being opened.');
    return;
  }
  isPopupOpen = true;
  try {
    // First, check if the popup is already open
    chrome.windows.getAll({ windowTypes: ['popup'] }, windows => {
      for (const win of windows) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        if (win.tabs && win.tabs[0].url.includes('popup/index.html')) {
          console.log(tag, 'Popup is already open, focusing on it.');
          chrome.windows.update(win.id, { focused: true });
          chrome.runtime.sendMessage({ action: 'unlock', request: params });
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
            console.error(tag, 'Error creating popup:', chrome.runtime.lastError);
            isPopupOpen = false;
          } else {
            console.log(tag, 'Popup window created:', window);
            // Add event listener for popup close
            chrome.windows.onRemoved.addListener(function popupCloseListener(windowId) {
              if (window.id === windowId) {
                isPopupOpen = false;
                chrome.windows.onRemoved.removeListener(popupCloseListener);
              }
            });
            // Send the unlock request message to the newly created popup
            chrome.runtime.sendMessage({ action: 'unlock', request: params });
          }
        },
      );
    });
  } catch (e) {
    console.error(e);
    isPopupOpen = false;
  }
};

export const handleEthereumRequest = async (
  method: string,
  params: any[],
  provider: JsonRpcProvider,
  KEEPKEY_SDK: any,
  ADDRESS: string,
): Promise<any> => {
  const tag = 'ETH_MOCK | handleEthereumRequest | ';
  try {
    if (!ADDRESS) {
      console.log('Device is not paired!');
      await requireUnlock(method, params, KEEPKEY_SDK);
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
        const userApprovedEthSign = await requireApproval(method, params[0], KEEPKEY_SDK);
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
        const userApproved = await requireApproval(method, params[0], KEEPKEY_SDK);
        console.log(tag, 'Calling sendTransaction with:', params[0]);
        if (userApproved) {
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

const signTransaction = async (transaction: any, provider: JsonRpcProvider, KEEPKEY_SDK: any) => {
  const tag = ' | signTransaction | ';
  try {
    console.log(tag, '**** transaction: ', transaction);

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

const sendTransaction = async (transaction: any, provider: JsonRpcProvider, KEEPKEY_SDK: any, ADDRESS: string) => {
  const tag = ' | sendTransaction | ';
  try {
    const userResponse = { decision: 'accept' }; // This should be dynamic based on actual user input

    if (userResponse.decision === 'accept') {
      console.log(tag, 'User accepted the request');
      console.log(tag, 'transaction:', transaction);
      const params = transaction[0];
      const chainId = '0x1';
      params.chainId = chainId;
      params.from = ADDRESS;
      const signedTx = await signTransaction(params, provider, KEEPKEY_SDK);
      console.log(tag, 'signedTx:', signedTx);

      const result = await broadcastTransaction(signedTx, chainId, provider);
      return result;
    } else if (userResponse.decision === 'reject') {
      console.log(tag, 'User rejected the request');
      throw createProviderRpcError(4001, 'User rejected the transaction');
    }

    throw createProviderRpcError(4000, 'Unexpected user decision');
  } catch (e) {
    console.error(e);
    throw createProviderRpcError(4000, 'Error sending transaction', e);
  }
};
