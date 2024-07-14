import { AssetValue } from '@pioneer-platform/helpers';
import { ChainToNetworkId, getChainEnumValue } from '@coinmasters/types';
import { getPaths } from '@pioneer-platform/pioneer-coins';
import { keepKeyApiKeyStorage } from '@chrome-extension-boilerplate/storage'; // Re-import the storage

interface KeepKeyWallet {
  type: string;
  icon: string;
  chains: string[];
  wallet: any;
  status: string;
  isConnected: boolean;
}

const getWalletByChain = async (keepkey: any, chain: any) => {
  if (!keepkey[chain]) return null;

  const walletMethods = keepkey[chain].walletMethods;
  const address = await walletMethods.getAddress();
  if (!address) return null;

  let balance = [];
  if (walletMethods.getPubkeys) {
    const pubkey = await walletMethods.getPubkeys();
    console.log('** pubkey: ', pubkey);
    const pubkeyBalance = await walletMethods.getBalance([pubkey]);
    console.log('pubkeyBalance: ', pubkeyBalance);
    const assetValue = AssetValue.fromChainOrSignature(chain, '0.001');
    balance = [assetValue];
  } else {
    balance = await walletMethods.getBalance([{ address }]);
  }

  return { address, balance };
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
  try {
    const chains = ['ETH'];
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
    console.log('kkApikey: ', kkApikey);
    await keepKeyApiKeyStorage.saveApiKey(kkApikey.keepkeyApiKey); // Save the API key using custom storage

    // got balances
    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      const walletData: any = await getWalletByChain(keepkey, chain);
      console.log('chain: ', chain);
      keepkey[chain].wallet.balance = walletData.balance;
    }

    return keepkey;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
