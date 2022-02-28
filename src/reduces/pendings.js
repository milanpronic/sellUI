export function pendings(state = [], action) {
    switch(action.type) {
        case "SET_PENDINGS":
            return action.payload;
            break;
        case "ADD_PENDING": 
            return [...state, action.payload];
            break;
        case "REPLACE_PENDING":
            return state.map(pend => {
                if(pend.idx == action.payload.idx && pend.hash == action.payload.oldHash) {
                    return {idx: action.payload.idx, hash: action.payload.hash};
                } else return pend;
            });
            break;
        case "REMOVE_PENDING":
            return state.filter(pend => {
                if(pend.idx == action.payload.idx && pend.hash == action.payload.hash) return false;
                return true;
            });
            break;
        default:
            return state;
            break;
    }
}