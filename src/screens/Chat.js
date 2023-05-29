import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { memo, useMemo } from 'react';
import { DeviceEventEmitter, Dimensions, Image, Linking, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { FlatList, RefreshControl, TextInput, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { launchImageLibrary } from 'react-native-image-picker';
import Animated, { Easing, FadeIn, FadeInLeft, FadeInUp, FadeOut, FadeOutLeft, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AccountAvatar, ButtonPlain, DialogBox, LoadingIndicator, Screen, StyledText, TableView } from 'src/components';
import { Constants } from 'src/config';
import { $t } from 'src/localization';
import { Router } from 'src/Router';
import { AccountService, ListenerService, TransactionService } from 'src/services';
import { PersistentStorage } from 'src/storage';
import { connect } from 'src/store';
import { borders, colors, fonts, layout, spacings } from 'src/styles';
import { chunkString, chunkStringBytes, chunkSubstr, copyToClipboard, createImageMessageTransaction, createLongMessageTransaction, fetchChatMessages, formatDate, getColorFromHash, getTransactionFees, handleError, isSameDay, mergeMessageHistory, publicAccountFromPrivateKey, transactionFromDTO, trunc, useDataManager, useInit, useToggle } from 'src/utils';
import { TransactionType } from 'symbol-sdk';

const SCREEN_WIDTH = Dimensions.get('screen').width;
const SCREEN_HEIGHT = Dimensions.get('screen').height;
const allowedExtensions = ['.png', '.PNG', '.jpg', '.JPG', '.jpeg', '.JPEG', '.gif', '.GIF', '.bmp', '.BMP'];
const cache = {};
const publicKeyMap = {};
const addressBookMap = {};

const Message = memo(function Message(props) {
    const { isGroup, currentAccount, signerAddress, previousMessageSignerAddress, nextMessageSignerAddress, text, isEncrypted, date, previousDate, height, imageBase64 } = props;

    const [isImageViewVisible, toggleImageView] = useToggle(false);

    const signerName = addressBookMap[signerAddress]?.name;
    const signerColor = addressBookMap[signerAddress]?.color || colors.textBody;
    const isFirstMessageInSet = nextMessageSignerAddress !== signerAddress;
    const isLastMessageInSet = previousMessageSignerAddress !== signerAddress;
    const isMiddleMessageInSet = previousMessageSignerAddress === signerAddress;
    const isUnconfirmed = !height;
    const isOurMessage = signerAddress === currentAccount.address;
    const isDateShown = !isSameDay(date, previousDate);
    const messageStyle = [
        styles.message, 
        isOurMessage ? styles.messageOur : styles.messageTheir, 
        isOurMessage && isMiddleMessageInSet ? {borderBottomRightRadius: 0, marginBottom: 0} : null, 
        !isOurMessage && isMiddleMessageInSet ? {borderBottomLeftRadius: 0, marginBottom: 0} : null, 
        isUnconfirmed ? styles.messageUnconfirmed : null,
        //isFirstMessageInSet && signerName ? {marginTop: 0} : null
    ];
    const messageContainerStyle = [
        styles.messageContainer, 
        isOurMessage ? styles.messageContainerOur : styles.messageContainerTheir
    ];
    const messageUrls = text.match(/(https?:\/\/[^\s]+)/g) || [];
    const messageImages = messageUrls.filter(url => {
        const lastIndex = url.lastIndexOf('.');
        return lastIndex !== -1 && allowedExtensions.includes(url.substr(lastIndex))
    });
    const textStyle = messageImages.length ? {maxWidth: 200} : null;
    const avatarStyle = [
        styles.senderAvatar,
        !isFirstMessageInSet ? {opacity: 0} : null 
    ];

    const handleMessagePress = () => {
        if (messageUrls.length) {
            Linking.openURL(messageUrls[0]);
        }
        if (imageBase64) {
            toggleImageView();
        }
    }
    const handleLongMessagePress = () => {
        try {
            copyToClipboard(text)
            showMessage({ message: text, type: 'info' });
        } catch (error) {
            showMessage({ message: error.message, type: 'danger' });
        }
    }

    return (
        <View style={{width: '100%'}}>
            {isDateShown && <StyledText type="label" style={styles.date}>{formatDate(date, $t, false, false)}</StyledText>}
            <Animated.View entering={FadeInUp} style={messageContainerStyle}>
                {!isOurMessage && isGroup && <AccountAvatar size="xm" address={signerAddress} style={avatarStyle}/>}
                <View style={{width: '100%'}}>
                {!isOurMessage && isGroup && isFirstMessageInSet && signerName && <StyledText type="label" style={[styles.messageSenderName, {color: signerColor}]} numberOfLines={1}>{signerName}</StyledText>}
                <TouchableOpacity  
                    style={messageStyle} 
                    activeOpacity={0.8}
                    onPress={handleMessagePress}
                    onLongPress={handleLongMessagePress}
                >
                    {/* {!isOurMessage && isGroup && isFirstMessageInSet && signerName && <StyledText type="label" style={[styles.messageSenderName, {color: signerColor}]} numberOfLines={1}>{signerName}</StyledText>} */}
                    {!!text && <StyledText type="body" style={textStyle}>{text}</StyledText>}
                    {messageImages.map((uri, index) => (
                        <Image source={{uri}} style={{ width: 200, height: 200, resizeMode: 'cover'}} key={'img' + index} />
                    ))}
                    {!!imageBase64 && <Image source={{uri: `data:image/jpeg;base64,${imageBase64}`}} style={{ width: 200, height: 200, resizeMode: 'cover'}} />}
                    <View style={styles.messageStatus}>
                        {/* {!isUnconfirmed &&  <StyledText type="label" style={styles.date}>{formatDate(date, $t, false, false, false)}</StyledText>} */}
                        {isUnconfirmed && (
                            <Image source={require('src/assets/images/icon-pending.png')} style={styles.iconPending} />
                        )}
                        {isEncrypted && (
                            <Image source={require('src/assets/images/icon-tx-lock.png')} style={styles.messageLockIcon} />
                        )}
                    </View>
                </TouchableOpacity>
                </View>
                <Animated.View entering={FadeIn} exiting={FadeOut}> 
                    {imageBase64 && <Modal animationType="fade" visible={isImageViewVisible} onRequestClose={toggleImageView}>
                        <View style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
                            <Image source={{uri: `data:image/jpeg;base64,${imageBase64}`}} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, resizeMode: 'contain'}} />
                            </View> 
                    </Modal>}
                </Animated.View>
            </Animated.View>
        </View>
    )
});

const Messages = memo(function Messages(props) {
    const { isGroup, currentAccount, confirmed, unconfirmed, pendingMessageTexts, onEndReached} = props;
    const messageHistory = useMemo(() => {
        const messages = [...confirmed];
        unconfirmed.forEach((message, index) => {
            if (messages[index]?.hash !== message.hash) {
                messages.unshift(message);
            }
        });
        return messages;
    }, [unconfirmed, confirmed]);


    return (
        <FlatList
            inverted
            onEndReached={onEndReached}
            onEndReachedThreshold={1}
            contentContainerStyle={styles.listContainer}
            data={messageHistory}
            keyExtractor={(item, index) => item.hash || item.message?.timestamp || index}
            renderItem={({ item, index }) => (
                <Message
                    isGroup={isGroup} 
                    currentAccount={currentAccount}
                    signerAddress={item.signerAddress}
                    nextMessageSignerAddress={messageHistory[index + 1]?.signerAddress}
                    previousMessageSignerAddress={messageHistory[index - 1]?.signerAddress}
                    previousDate={messageHistory[index + 1]?.deadline}
                    text={item.message?.text || ''}
                    imageBase64={item.message?.imageBase64 || ''}
                    isEncrypted={item.message?.isEncrypted}
                    date={item.deadline}
                    height={item.height}
                />
            )}
            ListHeaderComponent={
                <>
                    {pendingMessageTexts.map((message, index) => 
                        <Animated.View style={[styles.message, styles.messageOurPending]} entering={FadeInUp} exiting={FadeOutLeft} key={index + message}>
                            <StyledText type="body">{message}</StyledText>
                        </Animated.View>
                    )}
                    <View style={styles.footerOffset} />
                </>
            }
        />
    );
});

export const Chat = connect((state) => ({
    isWalletReady: state.wallet.isReady,
    currentAccount: state.account.current,
    isLastPage: state.transaction.isLastPage,
    networkProperties: state.network.networkProperties,
    chainHeight: state.network.chainHeight,
    ticker: state.network.ticker,
    addressBookWhiteList: state.addressBook.whiteList,
}))(function Chat(props) {
    const { isWalletReady, chainHeight, currentAccount, networkProperties, ticker, addressBookWhiteList, route } = props;
    const chatAddress = route.params.address;
    const chatName = route.params.name;
    const chatPrivateKey = route.params.privateKey;
    const isGroup = !!chatPrivateKey;
    const [chatPublicKey, setChatPublicKey] = useState('');
    const [isFirstLoading, setIsFirstLoading] = useState(true);
    const [isTextBoxFocused, setIsTextBoxFocused] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [attachedImage, setAttachedImage] = useState({});
    const [pendingMessageTexts, setPendingMessageTexts] = useState([]);
    const [unconfirmedMessages, setUnconfirmedMessages] = useState([]);
    const [messages, setMessages] = useState([]);
    const [currentPageNumber, setPageNumber] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [isNextPageRequested, setIsNextPageRequested] = useState(false);
    const [isRefreshRequested, setIsRefreshRequested] = useState(false);
    const [isPrivateKeyDialogShown, togglePrivateKeyDialog] = useToggle(false);

    
    const transaction = {
        signerAddress: currentAccount.address,
        recipientAddress: chatAddress,
        mosaics: [],
        messageText: messageText || attachedImage.base64,
        messageEncrypted: (messageText.length > 0 || attachedImage.base64?.length > 0) && chatPublicKey.length > 0,
        fee: 0
    };
    const transactionFees = useMemo(() => getTransactionFees(transaction, networkProperties), [messageText, attachedImage]);
    const fee = transactionFees.medium;
    const transactionWithFee = { ...transaction, fee };

    const fetchTransactionsDirect = async (type) => {
        const nextPageNumber = currentPageNumber + 1;
        let pageNumber;
        let pageSize;
        let group;

        switch (type) {
            default:
            case 'init':
                pageNumber = 1;
                pageSize = 100;
                group = 'confirmed';
                break;
            case 'refresh':
                pageNumber = 1;
                pageSize = 25;
                group = 'confirmed';
                break;
            case 'next':
                pageNumber = nextPageNumber;
                pageSize = 100;
                group = 'unconfirmed';
                break;
            case 'unconfirmed':
                pageNumber = 1;
                pageSize = 100;
                group = 'unconfirmed';
                break;
        }
        console.log('[Fetch Messsages]', type, pageNumber, group)
        const page = await fetchChatMessages(networkProperties, {
            currentAccount,
            recipientAddress: chatAddress,
            recipientPrivateKey: chatPrivateKey,
            publicKeyMap,
            pageSize,
            pageNumber,
            group,
            cache,
        });
        const isLastPage = page.length === 0;

        if (type === 'refresh') {
            await fetchTransactionsDirect('unconfirmed');
        }

        setPendingMessageTexts([]);

        if (type === 'unconfirmed') {
            setUnconfirmedMessages(page);
        }
        else {
            setMessages(messages => mergeMessageHistory(messages, page));
        }

        if (type === 'next') {
            setPageNumber(nextPageNumber);
            setIsLastPage(isLastPage);
        }

        await PersistentStorage.setMessageCache(cache);
    };
    
    const [fetchTransactions, isLoading] = useDataManager(fetchTransactionsDirect, null, handleError);
    const [send] = useDataManager(
        async () => {
            const timestamp = Math.round((new Date().getTime() / 1000)) - networkProperties.epochAdjustment;
        
            // const isLongText = messageText?.length > 200;

            // if (isLongText && isGroup) {
            //     const aggregateTransaction = createLongMessageTransaction({
            //         text: messageText, 
            //         currentAccount, 
            //         recipientAddress: chatAddress, 
            //         fee: transactionWithFee.fee, 
            //         timestamp, 
            //     });
            //     console.log(aggregateTransaction)
            //     return TransactionService.sendAggregateCompleteTransaction(aggregateTransaction, currentAccount, networkProperties);
            // }

            if (messageText) {
                const chunks = chunkStringBytes(messageText, 200);
                return Promise.all(chunks.map(async (msg, index) => {
                    const transaction = {
                        ...transactionWithFee,
                        fee: chunks.length === 1 
                            ? transactionWithFee.fee
                            : (transactionWithFee.fee / (chunks.length / 2)), 
                        messageText: JSON.stringify({v: 1, t: timestamp + index, m: msg})
                    }
                    return TransactionService.sendTransferTransaction(transaction, currentAccount, networkProperties, chatPublicKey);
                }));
            }
            // if (messageText && messageText?.length < 200) {
            //     const transaction = {
            //         ...transactionWithFee,
            //         messageText: JSON.stringify({v: 1, t: timestamp, m: messageText})//`@@1@t${timestamp}@m${messageText}`
            //     }
            //     return TransactionService.sendTransferTransaction(transaction, currentAccount, networkProperties, chatPublicKey);
            // }
            if (attachedImage.base64) {
                const aggregateTransaction = createImageMessageTransaction({
                    image: attachedImage, 
                    currentAccount, 
                    recipientAddress: chatAddress,
                    recipientPublicKey: chatPublicKey,
                    fee: transactionWithFee.fee, 
                    timestamp, 
                });
                return TransactionService.sendAggregateCompleteTransaction(aggregateTransaction, currentAccount, networkProperties);
            }
        },
        null,
        handleError
    );
    const [attachImage, isImageAttaching] = useDataManager(
        async () => {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                maxWidth: 512,
                maxHeight: 512,
                quality: 0.5,
                includeBase64: true,
                includeExtra: false,
                presentationStyle: 'fullScreen'
            });
            setAttachedImage(result.assets[0]);
            console.log('Picked image length:', result.assets[0].base64.length)
            console.log(`${result.assets[0].width} x ${result.assets[0].height}`)
        },
        null,
    );
    const handleSendPress = async () => {
        if ((!messageText || messageText === ' ' || messageText === '  ') && !attachedImage.base64) {
            return;
        }
        if (messageText) {
            setPendingMessageTexts([...pendingMessageTexts, messageText]);
        }
        else if (attachedImage.base64) {
            setPendingMessageTexts([...pendingMessageTexts, 'Sending an image...']);
        }
        setMessageText('');
        await send();
        setAttachedImage({});
    };
    const onEndReached = () => !isLoading && setIsNextPageRequested(true);
    const init = async () => {
        addressBookWhiteList.forEach((contact) => 
            addressBookMap[contact.address] = {
                name: contact.name,
                color: getColorFromHash(contact.address),
            }
        );

        const loadedCache = await PersistentStorage.getMessageCache();
        Object.assign(cache, loadedCache);

        try {
            if (chatPrivateKey) {
                const { publicKey, address } = publicAccountFromPrivateKey(chatPrivateKey, networkProperties.networkIdentifier);
                publicKeyMap[address] = publicKey;
                setChatPublicKey(publicKey);
            }
            else {
                const { publicKey } = await AccountService.fetchAccountInfo(networkProperties, chatAddress);
                publicKeyMap[chatAddress] = publicKey;
                setChatPublicKey(publicKey);  
            }
            ListenerService.listen(networkProperties, chatAddress, {
                onConfirmedAdd: () => setIsRefreshRequested(true), 
                onUnconfirmedAdd: () => setIsRefreshRequested(true),
            });
        }
        catch {
            setChatPublicKey(null);
        }

        await fetchTransactions('init');
        setIsFirstLoading(false);
    }

    useInit(init, isWalletReady);
    useEffect(() => {
        if (isLoading || isFirstLoading) {
            return;
        }

        if (!isLastPage && isNextPageRequested) {
            setIsNextPageRequested(false);
            fetchTransactions('next');
            return;
        }

        if (isRefreshRequested) {
            setIsRefreshRequested(false);
            fetchTransactions('refresh');
            return;
        }
    }, [isLoading, isFirstLoading, isNextPageRequested, isLastPage, isRefreshRequested]);
    useEffect(() => {
        if (!isRefreshRequested) {
            setIsRefreshRequested(true);
        }
    }, [chainHeight]);

    return (
        <Screen>
            <View style={styles.header}>
                <TouchableOpacity onPress={Router.goBack}>
                    <Image source={require('src/assets/images/icon-back.png')} style={{ width: 28, height: 28, marginRight: spacings.margin * 2 }} />
                </TouchableOpacity>
                <AccountAvatar size="xm" address={chatAddress} style={styles.chatAvatar} />
                <View style={layout.justifyCenter}>
                    <StyledText type="subtitle">{chatName}</StyledText>
                    <StyledText type="body">{trunc(chatAddress, 'address')}</StyledText>
                </View>
                <View style={{flex: 1, flexDirection: 'row', justifyContent: 'flex-end'}}>
                    {isGroup && <TouchableOpacity onPress={togglePrivateKeyDialog} hitSlop={5} style={{marginLeft: spacings.margin * 2}}>
                        <Image source={require('src/assets/images/icon-account-add.png')} style={{ width: 24, height: 24 }} />
                    </TouchableOpacity>}
                    <TouchableOpacity onPress={() => setIsRefreshRequested(true)} hitSlop={5} style={{marginLeft: spacings.margin * 2}}>
                        <Image source={require('src/assets/images/icon-refresh.png')} style={{ width: 24, height: 24 }} />
                    </TouchableOpacity>
                </View>
            </View>
            <Messages
                isGroup={isGroup}
                currentAccount={currentAccount} 
                confirmed={messages} 
                unconfirmed={unconfirmedMessages} 
                pendingMessageTexts={pendingMessageTexts} 
                onEndReached={onEndReached} 
            />
            {isFirstLoading && <LoadingIndicator />}
            <View style={styles.footerContainer}>
                {chatPublicKey && <Animated.View style={styles.footer} entering={FadeIn}> 
                    {true && isGroup && !messageText && !attachedImage.base64 && !isTextBoxFocused && !isImageAttaching && <Animated.View entering={FadeInLeft.duration(100)} exiting={FadeOutLeft.duration(50)}>
                        <ButtonPlain icon={require('src/assets/images/icon-image-add.png')} onPress={attachImage} />
                    </Animated.View>}
                    {!attachedImage.base64 && <TextInput 
                        multiline 
                        maxLength={900} 
                        value={messageText} 
                        onChangeText={setMessageText}
                        onFocus={() => setIsTextBoxFocused(true)}
                        onBlur={() => setIsTextBoxFocused(false)}
                        style={styles.input}
                    />}
                    {!!attachedImage.base64 && <Animated.View exiting={FadeOut}>
                        <TouchableWithoutFeedback onPress={() => setAttachedImage({})}>
                            <Image source={{uri: `data:image/jpeg;base64,${attachedImage.base64}`}} style={styles.attachedImage}/>
                        </TouchableWithoutFeedback>
                    </Animated.View>}
                    {!!attachedImage.base64 && <View style={layout.fill}/>}
                    <StyledText type="body" style={styles.fee}>-{fee} {ticker}</StyledText>
                    <View>
                        {!isLoading && !isImageAttaching && <Animated.View entering={FadeInLeft}>
                            <ButtonPlain icon={require('src/assets/images/icon-primary-send.png')} onPress={handleSendPress} />
                        </Animated.View> }
                        {(isLoading || isImageAttaching) && <Animated.View entering={FadeIn}>
                            <LoadingIndicator size="sm" style={{position: 'relative', width: 18,height: 18, marginRight: spacings.paddingSm}}/>
                        </Animated.View>}
                    </View>
                </Animated.View>}
                {chatPublicKey === null && <View style={[styles.footer, styles.input]}>
                    <StyledText type="body" style={styles.fee}>Seems like your recipient have never sent any transaction from his account. It means that we don't know his public key to encrypt your messages. To fix that and to enable sending messages in this chat your recipient should send at least 1 transfer transaction via send form. No matter how much {ticker} to transfer, it could be 0.</StyledText>
                </View>}
            </View>
            <DialogBox
                type="alert"
                title={'Invite to this group'}
                text={'Copy the private key of this group and send it to your contact. Then he will need to paste it into the input field in the "ADD GROUP" dialog box'}
                body={<TableView data={{privateKey: chatPrivateKey}} />}
                isVisible={isPrivateKeyDialogShown}
                onSuccess={togglePrivateKeyDialog}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    header: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: spacings.padding,
        paddingVertical: spacings.padding / 2,
        backgroundColor: colors.bgNavbar,
    },
    chatAvatar: {
        marginRight: spacings.margin
    },
    blockTime: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: borders.borderWidth,
        backgroundColor: colors.accentLightForm
    },
    listContainer: {
        flexGrow: 1
    },
    loadingIndicator: {
        position: 'absolute',
        height: '100%',
        width: '100%',
    },
    sectionFooter: {
        position: 'relative',
    },
    emptyList: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyListText: {
        textAlign: 'center',
        color: colors.bgMain,
    },
    messageContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center'
    },
    messageContainerTheir: {
        justifyContent: 'flex-start',
    },
    messageContainerOur: {
        justifyContent: 'flex-end',
    },
    message: {
        position: 'relative',
        borderRadius: 12,
        paddingHorizontal: spacings.padding,
        paddingVertical: spacings.padding,
        marginHorizontal: spacings.margin,
        marginVertical: spacings.margin / 2,
        minWidth: 40,
        maxWidth: '70%',
    },
    messageInSet: {
        marginVertical: 0,
        marginBottom: spacings.margin / 2,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    messageTheir: {
        alignSelf: 'flex-start',
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 0
    },
    messageOur: {
        alignSelf: 'flex-end',
        backgroundColor: colors.accentForm,
        borderTopRightRadius: 0
    },
    messageOurPending: {
        alignSelf: 'flex-end',
        backgroundColor: colors.bgMain,
        borderTopRightRadius: 0
    },
    messageUnconfirmed: {
        opacity: 0.5
    },
    messageStatus: {
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        bottom: 2,
        right: 8,
        opacity: 0.3,
        height: 16
    },
    messageLockIcon: {
        width: 8,
        height: 8,
    },
    senderAvatar: {
        marginVertical: spacings.margin / 2,
        marginLeft: spacings.padding,
        alignSelf: 'flex-start'
    },
    messageSenderName: {
        // position: 'absolute',
        // top: 2,
        // left: spacings.padding,
        // fontSize: 10,
        ///
        fontSize: 10,

        marginTop: spacings.margin / 2,
        marginLeft: spacings.margin,
        marginBottom: - spacings.margin / 2,
    },
    date: {
        width: '100%',
        textAlign: 'center',
        marginRight: spacings.margin / 2,
        fontSize: 10,
        opacity: 0.7,
        marginTop: spacings.margin + spacings.margin / 2,
        marginBottom: spacings.margin / 2
    },
    iconPending: {
        marginRight: spacings.margin / 2,
        height: 8,
        width: 8,
    },
    footerOffset: {
        marginBottom: 100 + spacings.margin * 2 + spacings.padding * 2,
    },
    footerContainer: {
        position: 'absolute',
        width: '100%',
        left: 0,
        bottom: 0,
        padding: spacings.margin,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacings.padding,
        borderRadius: 12,
        backgroundColor: colors.bgCard,
        elevation: 3
    },
    input: {
        ...fonts.textBox,
        flex: 1,
        width: '100%',
        maxHeight: 100,
        marginVertical: 0,
        marginRight: spacings.margin,
        padding: 0,
        paddingVertical: spacings.padding,
        color: colors.textBody,
    },
    attachedImage: {
        width: 60,
        height: 60,
        resizeMode: 'cover',
        borderRadius: 12,
        padding: spacings.margin,
        marginRight: spacings.margin,
    },
    fee: {
        minWidth: '21%',
        textAlign: 'right',
        fontSize: 10,
        color: colors.danger,
        marginRight: spacings.margin,
    }
});
