import { JsonRpcProvider } from 'ethers';

import { EIP155_CHAINS } from '../chains';

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

export const handleEthereumRequest = async (
  method: string,
  params: any[],
  provider: JsonRpcProvider,
  CURRENT_PROVIDER: any,
  requestInfo: any,
  ADDRESS: string,
  KEEPKEY_SDK: any,
  requireApproval: (requestInfo: any, chain: any, method: string, params: any) => Promise<void>,
): Promise<any> => {
  const tag = ' | handleEthereumRequest | ';

  switch (method) {
    case 'eth_chainId': {
      console.log(tag, 'Returning eth_chainId:', CURRENT_PROVIDER.chainId);
      return CURRENT_PROVIDER.chainId;
    }
    case 'net_version': {
      const netVersion = CURRENT_PROVIDER.chainId.toString();
      console.log(tag, 'Returning net_version:', netVersion);
      return parseInt(netVersion, 16).toString();
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
      const callResult = await CURRENT_PROVIDER.provider.call(callParams, blockTag, stateOverride);
      console.log(tag, 'callResult:', callResult);
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
      console.log(tag, 'Calling wallet_switchEthereumChain with:', params);
      if (!params || !params[0] || !params[0].chainId) throw new Error('Invalid chainId (Required)');
      let chainId = 'eip155:' + parseInt(params[0].chainId, 16);
      console.log(tag, 'Calling wallet_switchEthereumChain chainId:', chainId);
      if (params && params[0] && params[0].rpcUrls && params[0].rpcUrls[0]) {
        console.log(tag, 'Given Params for custom chain addition!');

        CURRENT_PROVIDER.blockExplorerUrls = params[0].blockExplorerUrls;
        CURRENT_PROVIDER.chainId = params[0].chainId;
        CURRENT_PROVIDER.caip = `eip155:${parseInt(params[0].chainId, 16)}/slip44:60`;
        CURRENT_PROVIDER.name = params[0].chainName;
        CURRENT_PROVIDER.nativeCurrency = params[0].nativeCurrency;
        CURRENT_PROVIDER.providerUrl = params[0].rpcUrls[0];
        CURRENT_PROVIDER.provider = new JsonRpcProvider(params[0].rpcUrls[0]);
      } else {
        console.log(tag, 'chain switch (must be a known chain)');
        const chainIdToFind = params[0].chainId;
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
      await requireApproval(requestInfo, 'ethereum', method, params[0]);
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
};
