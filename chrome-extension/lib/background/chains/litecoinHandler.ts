const TAG = ' | thorchainHandler | ';
import { JsonRpcProvider } from 'ethers';
import { Chain } from '@coinmasters/types';
import { AssetValue } from '@pioneer-platform/helpers';
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
  KEEPKEY_WALLET: any,
  requireApproval: (requestInfo: any, chain: any, method: string, params: any) => Promise<void>,
): Promise<any> => {
  const tag = TAG + ' | handleLitecoinRequest | ';
  console.log(tag, 'method:', method);
  console.log(tag, 'params:', params);
  switch (method) {
    case 'request_accounts': {
      let response = await KEEPKEY_WALLET[Chain.Litecoin].walletMethods.getAddress();
      console.log(tag, 'response: ', response);
      console.log(tag, method + ' Returning', response);
      return [response];
    }
    case 'request_balance': {
      //get sum of all pubkeys configured
      let pubkeys = await KEEPKEY_WALLET.swapKit.getBalance(Chain.Litecoin);
      console.log(tag, 'pubkeys: ', pubkeys);
      return [pubkeys];
    }
    case 'transfer': {
      //send tx
      console.log(tag, 'params[0]: ', params[0]);
      let assetString = 'LTC.LTC';
      await AssetValue.loadStaticAssets();
      console.log(tag, 'params[0].amount.amount: ', params[0].amount.amount);
      let assetValue = await AssetValue.fromString(assetString, parseFloat(params[0].amount.amount));
      let sendPayload = {
        from: params[0].from,
        assetValue,
        memo: params[0].memo || '',
        recipient: params[0].recipient,
      };
      console.log(tag, 'sendPayload: ', sendPayload);
      const txHash = await KEEPKEY_WALLET[Chain.Litecoin].walletMethods.transfer(sendPayload);
      console.log(tag, 'txHash: ', txHash);
      return txHash;
    }
    default: {
      console.log(tag, `Method ${method} not supported`);
      throw createProviderRpcError(4200, `Method ${method} not supported`);
    }
  }
};
