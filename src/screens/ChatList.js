import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlatList, } from 'react-native-gesture-handler';
import { Button, ButtonCircle, DialogBox, FormItem, ItemContact, Screen, StyledText, TabView} from 'src/components';
import { $t } from 'src/localization';
import { Router } from 'src/Router';
import { connect } from 'src/store';
import { colors, layout } from 'src/styles';
import * as bip39 from 'bip39';
import { networkIdentifierToNetworkType, useToggle, validateKey, validateRequired } from 'src/utils';
import { Account } from 'symbol-sdk';
import { useState } from 'react';
import { showMessage } from 'react-native-flash-message';
import { PersistentStorage } from 'src/storage';
const wordlist = bip39.wordlists['english'];

export const ChatList = connect((state) => ({
    contacts: state.addressBook.whiteList,
    networkProperties: state.network.networkProperties,
}))(function ChatList(props) {
    const { contacts, networkProperties } = props;
    const [groups, setGroups] = useState([]);
    const [isGroupPromptShown, toggleGroupPrompt] = useToggle(false);
    const [isGroupRemoveShown, toggleGroupRemove] = useToggle(false);
    const [groupToRemove, setGroupToRemove] = useState({});

    const init = async () => {
        const groups = await PersistentStorage.getChatGroups();
        
        if (groups) {
            setGroups(groups);
        }
    };
    const saveGroupPrivateKey = async (name, privateKey, address) => {
        const group = {
            name,    
            privateKey,
            address,
        };
        const updatedGroups = [...groups, group];
        await PersistentStorage.setChatGroups(updatedGroups);
        setGroups(updatedGroups);
        toggleGroupPrompt();
    }
    const handleAddGroup = (privateKey) => {
        const networkType = networkIdentifierToNetworkType(networkProperties.networkIdentifier);
        let accountPrivateKey;
        let address;
        
        if (!privateKey) {
            const account = Account.generateNewAccount(networkType);
            accountPrivateKey = account.privateKey;
            address = account.address.plain();
        }
        else {
            accountPrivateKey = privateKey.trim();

            if (groups.some(group => group.privateKey === accountPrivateKey)) {
                showMessage({ message: 'This group is already added', type: 'danger' });
                return;
            }

            try {
                const account = Account.createFromPrivateKey(privateKey, networkType);
                address = account.address.plain();
            }
            catch {
                showMessage({ message: 'Invalid private key', type: 'danger' });
                return;
            }
        }

        const wordIndex1 = Math.round(parseInt(accountPrivateKey.slice(0, 3), 16) / 2);
        const wordIndex2 = Math.round(parseInt(accountPrivateKey.slice(0, 3), 16) / 4);
        const name = wordlist[wordIndex1] + ' ' + wordlist[wordIndex2];

        saveGroupPrivateKey(name, accountPrivateKey, address);
    }

    const handleLongGroupPress = (group) => {
        setGroupToRemove(group);
        toggleGroupRemove();
    }
    const removeGroup = async () => {
        const updatedGroups = groups.filter(group => groupToRemove.privateKey !== group.privateKey);
        await PersistentStorage.setChatGroups(updatedGroups);
        setGroups(updatedGroups);
        toggleGroupRemove();
    };

    useEffect(() => {
        init();
    }, []);

    const tabs = [
        {
            label: 'Personal',
            value: 'personal',
            content: (
                <>
                    <FlatList
                        style={layout.fill}
                        contentContainerStyle={layout.listContainer}
                        data={contacts}
                        ListEmptyComponent={(
                            <View style={styles.emptyList}> 
                                <StyledText type="label" style={styles.emptyListText}>{$t('message_emptyList')}</StyledText>
                            </View>
                        )}
                        keyExtractor={(item) => 'contact' + item.id}
                        renderItem={({ item }) => <ItemContact contact={item} onPress={() => Router.goToChat(item)} onLongPress={() => Router.goToAddressBookContact(item)}/>}
                    />
                    <FormItem>
                        <Button title="Manage Contacts" onPress={() => Router.goToAddressBookList()} />
                    </FormItem>
                </>
            ),
        },
        {
            label: 'Groups',
            value: 'groups',
            content: (
                <>
                    <FlatList
                        style={layout.fill}
                        contentContainerStyle={layout.listContainer}
                        data={groups}
                        ListEmptyComponent={(
                            <View style={styles.emptyList}> 
                                <StyledText type="label" style={styles.emptyListText}>{$t('message_emptyList')}</StyledText>
                            </View>
                        )}
                        keyExtractor={(item) => 'group' + item.privateKey}
                        renderItem={({ item }) => <ItemContact contact={item} onPress={() => Router.goToChat(item)} onLongPress={() => handleLongGroupPress(item)} />}
                    />
                    <FormItem>
                        <Button title="Add Group" onPress={toggleGroupPrompt} />
                    </FormItem>
                </>
            ),
        },
    ];

    return (
        <Screen>
            <TabView tabs={tabs} />
            {/* <ButtonCircle
                source={require('src/assets/images/icon-dark-account-add.png')}
                onPress={() => Router.goToAddressBookEdit()}
            /> */}
            <DialogBox
                type="prompt"
                title={'Join or Create a Group'}
                text={'Private key (Empty to create a new one)'}
                isVisible={isGroupPromptShown}
                onSuccess={handleAddGroup}
                onCancel={toggleGroupPrompt}
            />
            <DialogBox
                type="confirm"
                title={'Remove Group from list?'}
                text={`Do you want to remove "${groupToRemove.name}" from your group list?`}
                isVisible={isGroupRemoveShown}
                onSuccess={removeGroup}
                onCancel={toggleGroupRemove}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    emptyList: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyListText: {
        textAlign: 'center',
        color: colors.bgMain,
    }
});
