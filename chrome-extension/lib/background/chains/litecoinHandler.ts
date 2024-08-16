const TAG = ' | thorchainHandler | ';
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

export const handleLitecoinRequest = async (
  method: string,
  params: any[],
  provider: JsonRpcProvider,
  CURRENT_PROVIDER: any,
  requestInfo: any,
  ADDRESS: string,
  KEEPKEY_SDK: any,
  requireApproval: (requestInfo: any, chain: any, method: string, params: any) => Promise<void>,
): Promise<any> => {
  const tag = TAG + ' | handleLitecoinRequest | ';
  console.log(tag, 'method:', method);
  console.log(tag, 'params:', params);
  switch (method) {
    case 'request_accounts': {
      //Unsigned TX
      let addressInfo = {
        addressNList: [0x80000000 + 44, 0x80000000 + 2, 0x80000000 + 0, 0, 0],
        coin: 'Litecoin',
        scriptType: 'p2pkh',
        showDisplay: false,
      };
      let response = await KEEPKEY_SDK.address.utxoGetAddress({
        address_n: addressInfo.addressNList,
        script_type: addressInfo.scriptType,
        coin: addressInfo.coin,
      });
      console.log('response: ', response);
      console.log(tag, method + ' Returning', response);
      return [response.address];
    }
    case 'eth_signTypedData_v4': {
      throw createProviderRpcError(4200, 'Method eth_signTypedData_v4 not supported');
    }
    default: {
      console.log(tag, `Method ${method} not supported`);
      throw createProviderRpcError(4200, `Method ${method} not supported`);
    }
  }
};