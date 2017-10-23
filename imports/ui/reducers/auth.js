function auth(state = [], action) {
  switch (action.type) {
    case 'AUTH':
      return action.res;
    case 'KEYS':
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

export default auth
