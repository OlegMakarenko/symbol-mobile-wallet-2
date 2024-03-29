import _ from 'lodash';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import account from 'src/store/account';
import addressBook from 'src/store/addressBook';
import listener from 'src/store/listener';
import market from 'src/store/market';
import network from 'src/store/network';
import transaction from 'src/store/transaction';
import wallet from 'src/store/wallet';

const modules = {
    account,
    addressBook,
    listener,
    market,
    network,
    transaction,
    wallet,
};

const defaultRootState = {
    account: account.state,
    addressBook: addressBook.state,
    listener: listener.state,
    market: market.state,
    network: network.state,
    transaction: transaction.state,
    wallet: wallet.state,
};

const createModuleReducer = (module, state = {}, action) => {
    if (!state[module.namespace]) state[module.namespace] = _.cloneDeep(module.state);

    const namespace = action.type.split('/')[0];
    const mutation = action.type.split('/')[1];

    if (module.namespace === namespace && typeof module.mutations[mutation] !== 'function') {
        console.error('[Store] Failed to commit mutation. Type "' + mutation + '" does not exist in "' + namespace + '"');
        return state;
    }

    if (module.namespace === namespace && typeof module.mutations[mutation] === 'function')
        return module.mutations[mutation](state, action.payload);

    return state;
};

const createRootReducer = (state, action) => {
    if (action.type === 'reset') {
        return _.cloneDeep(defaultRootState);
    }

    let rootState = { ...state };

    if (typeof action.type !== 'string') {
        console.error('[Store] Failed to commit mutation. Type "' + action.type + '" is not a string');
        return rootState;
    }

    const namespace = action.type.split('/')[0];

    if (namespace !== '@@redux' && !modules[namespace]) {
        console.error('[Store] Failed to commit mutation. Module "' + namespace + '" not found');
        return rootState;
    }

    Object.values(modules).forEach((module) => {
        rootState = {
            ...rootState,
            ...createModuleReducer(module, state, action),
        };
    });

    return rootState;
};

const store = createStore(createRootReducer, applyMiddleware(thunk));

store.dispatchAction = ({ type, payload }) => {
    if (typeof type !== 'string') {
        console.error('[Store] Failed to dispatchAction. Type "' + type + '" is not a string');
        return;
    }
    const namespace = type.split('/')[0];
    const action = type.split('/')[1];

    if (!modules[namespace]) {
        console.error('[Store] Failed to dispatchAction. Module "' + namespace + '" not found');
        return;
    }

    if (typeof modules[namespace].actions[action] !== 'function') {
        console.error('[Store] Failed to dispatchAction. Action "' + action + '" not found');
        return;
    }

    const state = store.getState();
    return store.dispatch((dispatch) =>
        modules[namespace].actions[action](
            {
                commit: dispatch,
                state: state,
                dispatchAction: store.dispatchAction,
            },
            payload
        )
    );
};

store.reset = () => {
    store.dispatch((dispatch) => dispatch({ type: 'reset' }));
};

export { connect } from 'react-redux';
export default store;
