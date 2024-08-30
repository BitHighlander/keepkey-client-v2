const TAG = ' | bitcoinHandler | ';
import { JsonRpcProvider } from 'ethers';
import { Chain } from '@coinmasters/types';
import { EIP155_CHAINS } from '../chains';
import { AssetValue } from '@pioneer-platform/helpers';

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

export const handleBitcoinRequest = async (
  method: string,
  params: any[],
  provider: JsonRpcProvider,
  CURRENT_PROVIDER: any,
  requestInfo: any,
  ADDRESS: string,
  KEEPKEY_WALLET: any,
  requireApproval: (requestInfo: any, chain: any, method: string, params: any) => Promise<void>,
): Promise<any> => {
  const tag = TAG + ' | handleBitcoinRequest | ';
  console.log(tag, 'method:', method);
  console.log(tag, 'params:', params);
  switch (method) {
    case 'request_accounts': {
      //Unsigned TX
      let response = await KEEPKEY_WALLET[Chain.Bitcoin].walletMethods.getAddress();
      console.log(tag, 'response: ', response);
      console.log(tag, method + ' Returning', response);
      return [response];
    }
    case 'request_balance': {
      //get sum of all pubkeys configured
      let balance = 0;
      let pubkeys = await KEEPKEY_WALLET[Chain.Bitcoin].walletMethods.getPubkeys();
      console.log(tag, 'pubkeys: ', pubkeys);

      for (let i = 0; i < pubkeys.length; i++) {
        let pubkey = pubkeys[i];
        console.log(tag, 'pubkey: ', pubkey);
        let response = await KEEPKEY_WALLET[Chain.Bitcoin].walletMethods.getBalance([{ pubkey }]);
        console.log(tag, 'response: ', response);
        console.log(tag, 'response value: ', response.getValue('number'));
        balance += response.getValue('number');
      }
      console.log(tag, 'balance final: ', balance);
      return [balance];
    }
    case 'transfer': {
      //send tx
      console.log(tag, 'params[0]: ', params[0]);
      let assetString = 'BTC.BTC';
      await AssetValue.loadStaticAssets();
      console.log(tag, 'params[0].amount.amount: ', params[0].amount.amount);
      let assetValue = await AssetValue.fromString(assetString, parseFloat(params[0].amount.amount) / 100000000);
      let sendPayload = {
        from: params[0].from,
        assetValue,
        memo: params[0].memo || '',
        recipient: params[0].recipient,
      };
      console.log(tag, 'sendPayload: ', sendPayload);
      // @ts-ignore
      console.log(tag, 'sendPayload: ', sendPayload.assetValue.getValue('string'));
      const txHash = await KEEPKEY_WALLET[Chain.Bitcoin].walletMethods.transfer(sendPayload);
      console.log(tag, 'txHash: ', txHash);
      return txHash;
    }
    default: {
      console.log(tag, `Method ${method} not supported`);
      throw createProviderRpcError(4200, `Method ${method} not supported`);
    }
  }
};
