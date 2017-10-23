function dashboard(state = [], action) {
  switch (action.type) {
    case 'BALANCE':
      return action.res;
    case 'TRANSACTIONS':
      return action.res;
    case 'COINS':
      return action.res;
    /*case 'CREATE_WIDGET':
      const { name, _id } = action.payload;

      return [
        ...state,
        { name, _id }
      ]*/
    default:
      return state
  }
}

export default dashboard
