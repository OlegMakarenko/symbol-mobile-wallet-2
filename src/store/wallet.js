import { hasUserSetPinCode } from '@haskkor/react-native-pincode';
import { FailedToSaveMnemonicError } from 'src/errors';
import { PersistentStorage, SecureStorage } from 'src/storage';
import { addressFromPrivateKey, createPrivateKeyFromMnemonic, createWalletAccount } from 'src/utils';
import { config } from 'src/config';

const MAX_SEED_ACCOUNTS = 15;

export default {
    namespace: 'wallet',
    state: {
        mnemonic: null,
        accounts: {
            mainnet: [],
            testnet: []
        },
        seedAddresses: {
            mainnet: [],
            testnet: []
        },
        balances: {},
        selectedAccountId: null,
        isPasscodeEnabled: true,
    },
    mutations: {
        setMnemonic(state, payload) {
            state.wallet.mnemonic = payload;
            return state;
        },
        setAccounts(state, payload) {
            state.wallet.accounts = payload;
            return state;
        },
        setSeedAddresses(state, payload) {
            state.wallet.seedAddresses = payload;
            return state;
        },
        setBalances(state, payload) {
            state.wallet.balances = payload;
            return state;
        },
        setSelectedAccountId(state, payload) {
            state.wallet.selectedAccountId = payload;
            return state;
        },
        setIsPasscodeEnabled(state, payload) {
            state.wallet.isPasscodeEnabled = payload;
            return state;
        },
    },
    actions: {
        loadAll: async ({ dispatchAction }) => {
            await dispatchAction({type: 'wallet/loadState' });
            await dispatchAction({type: 'network/loadState' });
            await dispatchAction({type: 'account/loadState' });
        },
        loadState: async ({ commit }) => {
            const mnemonic = await SecureStorage.getMnemonic();
            const accounts = await SecureStorage.getAccounts();
            const seedAddresses = await PersistentStorage.getSeedAddresses();
            const balances = await PersistentStorage.getBalances();
            const selectedAccountId = await SecureStorage.getSelectedAccountId();
            const isPasscodeEnabled = await hasUserSetPinCode();

            commit({ type: 'wallet/setMnemonic', payload: mnemonic });
            commit({ type: 'wallet/setAccounts', payload: accounts });
            commit({ type: 'wallet/setSeedAddresses', payload: seedAddresses });
            commit({ type: 'wallet/setBalances', payload: balances });
            commit({ type: 'wallet/setSelectedAccountId', payload: selectedAccountId || 0});
            commit({ type: 'wallet/setIsPasscodeEnabled', payload: isPasscodeEnabled || false});
        },

        saveMnemonic: async ({ commit, dispatchAction }, { mnemonic, name }) => {
            let savedMnemonic;

            try {
                await SecureStorage.setMnemonic(mnemonic);
                savedMnemonic = await SecureStorage.getMnemonic();
            }
            catch(e) {
                throw FailedToSaveMnemonicError(e.message)
            }

            if (mnemonic !== savedMnemonic) {
                throw FailedToSaveMnemonicError('Mnemonic does not match');
            }

            commit({ type: 'wallet/setMnemonic', payload: mnemonic });
            await dispatchAction({ type: 'wallet/addSeedAccount', payload: { name, index: 0, forceNetworkIdentifier: 'testnet' } });
            await dispatchAction({ type: 'wallet/addSeedAccount', payload: { name, index: 0, forceNetworkIdentifier: 'mainnet' } });
        },

        generateSeedAddresses: async ({ state, commit }) => {
            const { networkIdentifiers } = config;
            const mnemonic = await SecureStorage.getMnemonic();
            const seedAddresses = {};
            networkIdentifiers.forEach(networkIdentifier => seedAddresses[networkIdentifier] = []);
            
            for (const networkIdentifier of networkIdentifiers) {
                for (index = 0; index < MAX_SEED_ACCOUNTS; ++index) {
                    const privateKey = createPrivateKeyFromMnemonic(index, mnemonic, networkIdentifier);
                    const address = addressFromPrivateKey(privateKey, networkIdentifier);
                    seedAddresses[networkIdentifier][index] = address;
                }
            }

            commit({ type: 'wallet/setSeedAddresses', payload: seedAddresses });
            await PersistentStorage.setSeedAddresses(seedAddresses);
        },

        selectAccount: async ({ commit }, privateKey) => {
            await SecureStorage.setSelectedAccountId(privateKey);
            commit({ type: 'wallet/setSelectedAccountId', payload: privateKey });
        },

        addSeedAccount: async ({ commit, dispatchAction, state }, { index, name, forceNetworkIdentifier }) => {
            const { walletNetworkIdentifier = networkIdentifier } = state.network;
            const { mnemonic } = state.wallet;
            const networkIdentifier = forceNetworkIdentifier || walletNetworkIdentifier;
            const accountType = 'seed';
            const privateKey = createPrivateKeyFromMnemonic(index, mnemonic, networkIdentifier);
            const walletAccount = createWalletAccount(privateKey, networkIdentifier, name, accountType, index);
            const accounts = await SecureStorage.getAccounts();
            const networkAccounts = accounts[networkIdentifier];
            const isAccountAlreadyExists = networkAccounts.find(account => account.index === index);
            
            if (isAccountAlreadyExists) {
                throw Error('failed_add_account_already_exists');
            }
            
            networkAccounts.push(walletAccount);
            
            await SecureStorage.setAccounts(accounts);
            commit({ type: 'wallet/setAccounts', payload: accounts });
            
            await dispatchAction({ type: 'wallet/selectAccount', payload: privateKey });
        },

        removeAccount: async ({ commit }, privateKey) => {
            const accounts = await SecureStorage.getAccounts();
            const updatedAccounts = accounts.filter(account => account.privateKey !== privateKey);
            await SecureStorage.setAccounts(updatedAccounts);

            commit({ type: 'wallet/setAccounts', payload: updatedAccounts });
        },

        fetchBalance: async ({ commit }, address) => {
            const balances = await PersistentStorage.getBalances();
            // TODO: replace with fetch data
            await new Promise(resolve => setTimeout(resolve, 1000));
            const balance = Math.round(Math.random() * 10000000) / 10;
            const addressBalance = {
                [address]: balance
            };
            const updatedBalances = {...balances, ...addressBalance}
            await PersistentStorage.setBalances(updatedBalances);

            commit({ type: 'wallet/setBalances', payload: updatedBalances });
        },
    },
};
