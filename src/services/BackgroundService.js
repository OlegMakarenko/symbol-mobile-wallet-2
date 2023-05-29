import BackgroundFetch from 'react-native-background-fetch';
import PushNotification from 'react-native-push-notification';
import { TransactionService } from './TransactionService';
import { transactionFromDTO } from 'src/utils';
import { PersistentStorage, SecureStorage } from 'src/storage';
import { Platform } from 'react-native';
import { NetworkService } from './NetworkService';
import { AppState } from 'react-native'

const CHANNEL_ID = 'channel_symbol';

export class BackgroundService {
    static async start() {
        PushNotification.configure({
            onNotification: notification => console.log(notification),
            permissions: {
                alert: true,
                badge: true,
                sound: true,
            },
            popInitialNotification: true,
            requestPermissions: Platform.OS === 'ios'
        });
        PushNotification.createChannel({
                channelId: CHANNEL_ID,
                channelName: "Symbol Notification Channel",
                channelDescription: "Symbol Notification Channel",
                playSound: true,
                soundName: "default",
                importance: 4,
                vibrate: true,
            }
        );

        const status = await BackgroundFetch.configure(
            {
                minimumFetchInterval: 1, // fetch interval in minutes
                enableHeadless: true,
                startOnBoot: true,
                stopOnTerminate: false,
                forceAlarmManager: true,
                enableHeadless: true
            },
            (taskId) => BackgroundService.task({taskId}),
            (taskId) => BackgroundFetch.finish(taskId),
        );
        console.log('BackgroundService.status', status)
    }

    static async task(event) {
        console.log('BackgroundService.event: ', event.taskId);

        const networkIdentifier = await PersistentStorage.getNetworkIdentifier();
        const nodes = await NetworkService.fetchNodeList(networkIdentifier);
        const nodeIndex = Math.floor(Math.random() * nodes.length);
        const nodeUrl = nodes[nodeIndex]

        const networkProperties = await NetworkService.fetchNetworkProperties(nodeUrl);
        const allAccounts = await SecureStorage.getAccounts();
        const groups = await PersistentStorage.getChatGroups();
        const accounts = [...allAccounts[networkIdentifier], ...groups];
        const addressBook = await PersistentStorage.getAddressBook();
        const contacts = addressBook.getWhiteListedContacts();

        for (const account of accounts) {
            const updates = await BackgroundService.fetchAccountUpdates(networkProperties, account, contacts);

            const isAppInBackground = AppState?.currentState === 'background';

            if (updates.transactions.length === 1 && isAppInBackground) {
                const transaction = updates.transactions[0];
                const { signerAddress } = transaction;
                const contact = contacts.find(contact => contact.address === signerAddress);
                const sender = contact?.name || signerAddress;

                PushNotification.localNotification({
                    channelId: CHANNEL_ID,
                    title: account.name,
                    message: `Received transaction from ${sender}`,
                    playSound: true,
                    soundName: 'default',
                });
            }
            if (updates.transactions.length > 1 && isAppInBackground) {
                PushNotification.localNotification({
                    channelId: CHANNEL_ID,
                    title: account.name,
                    message: `Received transactions`,
                    playSound: true,
                    soundName: 'default',
                });
            }
        }

        BackgroundFetch.finish(event.taskId);
    }

    static async fetchAccountUpdates(networkProperties, currentAccount) {
        const updates = {
            address: currentAccount,
            transactions: []
        };

        try {
            const page = await TransactionService.fetchAccountTransactions(currentAccount, networkProperties, {
                group:'confirmed',
                filter: { direction: 'incoming' },
                pageNumber: 1,
                pageSize: 10
            });
            const latestTransactionHashMap = await PersistentStorage.getLatestTransactionHash();
            const latestTransactionHash = latestTransactionHashMap[currentAccount.address];
            const transactionOptions = {
                networkProperties,
                currentAccount,
                mosaicInfos: {},
                namespaceNames: {},
                resolvedAddresses: {},
            }

            const allTransactions = page
                .map((transactionDTO) => transactionFromDTO(transactionDTO, transactionOptions))
                .sort((a, b) => {
                    if (!a || !b)
                    console.log(a, b);
                    const heightCompare = b.height - a.height;

                    return heightCompare !== 0 ? heightCompare : a.hash.localeCompare(b.hash);
                });

            let transactions = [];
            for (const transaction of allTransactions) {
                if (transaction.hash === latestTransactionHash) {
                    break;
                }
                transactions.push(transaction);
            }

            if (transactions.length) {
                latestTransactionHashMap[currentAccount.address] = transactions[0].hash;
                await PersistentStorage.setLatestTransactionHash(latestTransactionHashMap);
            }

            updates.transactions = transactions;

            return updates;
        }
        catch(e) {console.warn(e)}

        return updates;
    }
}
