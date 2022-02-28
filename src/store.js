import { createStore } from 'redux';
import reducers from './reduces';

const store = createStore(reducers, {pendings: []});

export default store;