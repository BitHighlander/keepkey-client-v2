/*
    KeepKey Wallet
 */
import { AssetValue } from '@pioneer-platform/helpers';
import { WalletOption, ChainToNetworkId, getChainEnumValue } from '@coinmasters/types';
import { getPaths } from '@pioneer-platform/pioneer-coins';
import { keepKeyApiKeyStorage } from '@chrome-extension-boilerplate/storage'; // Re-import the storage
const TAG = ' | KeepKey | ';
interface KeepKeyWallet {
  type: string;
  icon: string;
  chains: string[];
  wallet: any;
  status: string;
  isConnected: boolean;
}

const syncWalletByChain = async (keepkey: any, chain: any) => {
  let tag = TAG + ' | syncWalletByChain | ';
  if (!keepkey[chain]) throw Error('Missing chain! chain: ' + chain);
  console.log('syncing chain: ', chain);
  let balance: any = [];
  const address = await keepkey[chain].walletMethods.getAddress();
  console.log('address: ', address);
  const pubkeys = await keepkey[chain].walletMethods?.getPubkeys();
  console.log('pubkeys: ', pubkeys);
  if (!address) {
    console.error('Failed to get address for chain! chain: ' + chain);
  }
  if (pubkeys.length <= 0) {
    console.error('Failed to get pubkeys for chain! chain: ' + chain);
  }

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < pubkeys.length; i++) {
    let pubkey = pubkeys[i];
    //console.log(tag, 'pubkey: ', pubkey);
    if (!pubkey || !pubkey.networks) continue;
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let j = 0; j < pubkey.networks.length; j++) {
      let networkId = pubkey.networks[j];
      //console.log(tag, 'networkId: ', networkId);
      if (networkId.includes('eip155') || pubkey.type === 'address') {
        //console.log(tag, 'network includes eip155 or is marked address');
        console.log(tag, 'address: ', address);
        let balance = await keepkey[chain].walletMethods?.getBalance([{ address }]);
        //console.log(tag, 'balance: ', balance);
        balance.push(balance);
      } else {
        //console.log(tag, 'Scan Xpub or other public key type');
        let pubkeyBalances: AssetValue[] = await keepkey[chain].walletMethods?.getBalance([{ pubkey }]);
        //console.log(tag, 'pubkeyBalances: ', pubkeyBalances);
        pubkeyBalances.forEach(pubkeyBalance => {
          balance.push(pubkeyBalance);
        });
      }
    }
  }

  return {
    address,
    pubkeys,
    balance,
    walletType: WalletOption.KEEPKEY,
  };
};

interface AddChainParams {
  info: any;
  keepkeySdk: any;
  chain: any;
  walletMethods: any;
  wallet: any;
}

function addChain(keepkey: any, { info, keepkeySdk, chain, walletMethods, wallet }: AddChainParams) {
  keepkey[chain] = {
    info,
    keepkeySdk,
    walletMethods,
    wallet,
  };
}

export const onStartKeepkey = async function () {
  let tag = TAG + ' | onStartKeepkey | ';
  try {
    let chains = [
      'ARB',
      'AVAX',
      'BSC',
      'BTC',
      'BCH',
      'GAIA',
      'OSMO',
      'XRP',
      'DOGE',
      'DASH',
      'ETH',
      'LTC',
      'OP',
      'MATIC',
      'THOR',
    ];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    const { keepkeyWallet } = await import('@coinmasters/wallet-keepkey');

    const walletKeepKey: KeepKeyWallet = {
      type: 'KEEPKEY',
      icon: '',
      chains,
      wallet: keepkeyWallet,
      status: 'offline',
      isConnected: false,
    };

    const allByCaip = chains.map(chainStr => {
      const chain = getChainEnumValue(chainStr);
      if (chain) {
        return ChainToNetworkId[chain];
      }
      return undefined;
    });

    const paths = getPaths(allByCaip);
    const keepkey: any = {};

    const keepkeyConfig = {
      apiKey: (await keepKeyApiKeyStorage.getApiKey()) || '123',
      pairingInfo: {
        name: 'KeepKey-Client',
        imageUrl: 'https://pioneers.dev/coins/keepkey.png',
        basePath: 'http://localhost:1646/spec/swagger.json',
        url: 'http://localhost:1646',
      },
    };

    const covalentApiKey = 'cqt_rQ6333MVWCVJFVX3DbCCGMVqRH4q';
    const ethplorerApiKey = 'EK-xs8Hj-qG4HbLY-LoAu7';
    const utxoApiKey = 'B_s9XK926uwmQSGTDEcZB3vSAmt5t2';
    const input = {
      apis: {},
      rpcUrls: {},
      addChain: (params: AddChainParams) => addChain(keepkey, params),
      config: { keepkeyConfig, covalentApiKey, ethplorerApiKey, utxoApiKey },
    };

    // Step 1: Invoke the outer function with the input object
    const connectFunction = walletKeepKey.wallet.connect(input);

    // Step 2: Invoke the inner function with chains and paths
    const kkApikey = await connectFunction(chains, paths);
    console.log(tag, 'kkApikey: ', kkApikey);
    await keepKeyApiKeyStorage.saveApiKey(kkApikey.keepkeyApiKey); // Save the API key using custom storage

    // get balances
    // for (let i = 0; i < chains.length; i++) {
    //   const chain = chains[i];
    //   const walletData: any = await syncWalletByChain(keepkey, chain);
    //   console.log(tag,'chain: ', chain);
    // }

    return keepkey;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
