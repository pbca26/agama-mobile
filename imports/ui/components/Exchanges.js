import React from 'react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
  assetsPath,
} from '../actions/utils';
import translate from '../translate/translate';
import {
  devlog,
  config,
} from '../actions/dev';
import AddCoin from './AddCoin';

class Exchanges extends React.Component {
  constructor() {
    super();
    this.state = {
      provider: 'coinswitch',
      newExchangeOrder: false,
      processing: false,
      buyFixedDestCoin: false,
      syncHistoryProgressing: false,
      exchangeCacheUpdateProgress: false,
      //newExchangeOrderDetails: {
      currentBalance: 'none',
      step: 0,
      orderStep: 0,
      depositStep: 0,
      orderId: null,
      amount: 0,
      coinSrc: null,
      coinDest: null,
      rate: null,
      minAmount: null,
      exchangeRate: null,
      fiatPrices: null,
      //exchangeOrder: {"orderId":"5a3c3bc4-7005-45c6-a106-4580aeb52f53","exchangeAddress":{"address":"QjibDEZiKV33xiNR7prhMAU4VanXGvZUN5","tag":null},"destinationAddress":{"address":"GNA1Hwa4vf3Y9LHZoMAYmGEngN2rmMTCU3","tag":null},"createdAt":1544871347246,"status":"timeout","inputTransactionHash":null,"outputTransactionHash":null,"depositCoin":"qtum","destinationCoin":"game","depositCoinAmount":null,"destinationCoinAmount":0,"validTill":1544914547246,"userReferenceId":null,"expectedDepositCoinAmount":9.60589756391216,"expectedDestinationCoinAmount":237},
      exchangeOrder: null,
      sendCoinState: null,
      //},
      cache: {
        coinswitch: {
          coins: {},
          orders: {},
        },
      },
      addcoinActive: false,
      addcoinDirection: null,
    };
    this.depositsRuntimeCache = {
      coinswitch: {},
    };
    this.coinsSrcList = null;
    this.coinsDestList = null;
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.exchangesCacheInterval = null;
    this._toggleExchangesOrderInfoModal = this._toggleExchangesOrderInfoModal.bind(this);
    this.toggleCreateOrder = this.toggleCreateOrder.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.updateSelectedCoin = this.updateSelectedCoin.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
    this.setSendAmountAll = this.setSendAmountAll.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.loadTestData = this.loadTestData.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.sendCoinCB = this.sendCoinCB.bind(this);
    this.makeDeposit = this.makeDeposit.bind(this);
    this.toggleBuyFixedDestCoin = this.toggleBuyFixedDestCoin.bind(this);
    this.syncHistory = this.syncHistory.bind(this);
    this._toggleExchangesTOSModal = this._toggleExchangesTOSModal.bind(this);
    this._toggleExchangesSupportedCoinsModal = this._toggleExchangesSupportedCoinsModal.bind(this);
    this.updateCache = this.updateCache.bind(this);
    this.addcoinCB = this.addcoinCB.bind(this);
    this.activateAddcoin = this.activateAddcoin.bind(this);
  }

  addcoinCB(coin) {
    console.warn('addcoinCB', coin);
  }

  activateAddcoin(direction) {
    this.setState({
      addcoinDirection: direction,
      addcoinActive: true,
    });
  }
  
  updateCache() {
    Store.dispatch(getExchangesCache(this.state.provider));

    this.setState({
      exchangeCacheUpdateProgress: true,
    });

    setTimeout(() => {
      this.setState({
        exchangeCacheUpdateProgress: false,
      });
    }, 1000);
  }

  _toggleExchangesTOSModal() {
    Store.dispatch(toggleExchangesTOSModal(true));
  }

  _toggleExchangesSupportedCoinsModal() {
    Store.dispatch(toggleExchangesSupportedCoinsModal(true));
  }

  syncHistory() {
    this.setState({
      syncHistoryProgressing: true,
    });

    exchangesHistorySync(this.state.provider)
    .then((res) => {
      if (res) {
        this.setState({
          syncHistoryProgressing: false,
        });
        Store.dispatch(getExchangesCache(this.state.provider));
        Store.dispatch(
          triggerToaster(
            'Coinswitch orders history is synchronized',
            translate('TOASTR.WALLET_NOTIFICATION'),
            'success'
          )
        );
      } else {
        this.setState({
          syncHistoryProgressing: false,
        });
        Store.dispatch(
          triggerToaster(
            'Failed to synchronize Coinswitch orders history',
            translate('TOASTR.WALLET_NOTIFICATION'),
            'error'
          )
        );
      }
    });
  }

  toggleBuyFixedDestCoin() {
    let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
    _newState.amount = '';

    this.setState({
      buyFixedDestCoin: !this.state.buyFixedDestCoin,
      newExchangeOrderDetails: _newState,
    });
  }

  makeDeposit(orderId) {
    const _cache = this.props.Dashboard.exchanges && this.props.Dashboard.exchanges[this.state.provider];
    
    console.warn(_cache[orderId]);
    
    let _newState = {};
    _newState.orderStep = 0;
    _newState.step = 1;
    _newState.exchangeOrder = _cache[orderId];

    console.warn(_newState);

    Store.dispatch(dashboardChangeActiveCoin(_cache[orderId].depositCoin.toUpperCase(), 'spv'));
    Store.dispatch(apiElectrumBalance(_cache[orderId].depositCoin.toUpperCase(), this.props.Dashboard.electrumCoins[_cache[orderId].depositCoin.toUpperCase()].pub));

    this.setState({
      newExchangeOrder: true,
      newExchangeOrderDetails: _newState,
    });
    Store.dispatch(getExchangesCache(this.state.provider));
  }

  findDeposits(orderId) {
    const _cache = this.props.Dashboard.exchanges && this.props.Dashboard.exchanges[this.state.provider];
    let _items = [];

    if (_cache &&
        _cache.deposits) {
      for (let key in _cache.deposits) {
        if (_cache.deposits[key] === orderId) {
          _items.push(_cache.deposits[key]);
        }
      }
    }

    return _items;
  }

  testDepositResponse() {
    Store.dispatch(sendToAddressState({ txid: 'test' }));
  }

  /*componentWillReceiveProps(nextProps) {
    // TODO: use runtime deposits flat array
    if (nextProps &&
        nextProps.ActiveCoin.lastSendToResponse &&
        nextProps.ActiveCoin.lastSendToResponse.txid &&
        this.state.newExchangeOrderDetails &&
        this.state.newExchangeOrderDetails.exchangeOrder &&
        !this.depositsRuntimeCache.coinswitch[this.state.newExchangeOrderDetails.exchangeOrder.orderId]) {
      console.warn('exchanges update deposit');

      this.depositsRuntimeCache.coinswitch[this.state.newExchangeOrderDetails.exchangeOrder.orderId] = nextProps.ActiveCoin.lastSendToResponse.txid;
      
      Store.dispatch(
        updateExchangesCacheDeposit(
          this.state.provider,
          this.state.newExchangeOrderDetails.exchangeOrder.depositCoin.toLowerCase(),
          nextProps.ActiveCoin.lastSendToResponse.txid,
          this.state.newExchangeOrderDetails.exchangeOrder.orderId
        )
      );
    }
  }*/

  sendCoinCB(state) {
    console.warn('sendCoinCB', state);

    let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
    _newState.sendCoinState = state;

    this.setState({
      processing: false,
      newExchangeOrderDetails: _newState,
    });
  }

  openExplorerWindow(item, type, coin) {
    let url;

    if (erc20ContractId[coin]) {
      url = `${explorerList.ETH}${item}`;
    } else {
      url = explorerList[coin].split('/').length - 1 > 2 ? `${explorerList[coin]}${item}` : `${explorerList[coin]}/tx/${item}`;      
      
      if (type === 'pub') {
        url = url.replace('/tx/', '/address/');
      }
    }

    return shell.openExternal(url);
  }

  prevStep() {
    let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
    _newState.orderStep--;

    if (!this.state.buyFixedDestCoin) {
      _newState.amount = Number(Number(_newState.amount * this.state.newExchangeOrderDetails.exchangeRate.rate).toFixed(8)); 
    }

    this.setState({
      processing: false,
      newExchangeOrderDetails: _newState,
    });
  }

  loadTestData() {
    let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
    _newState.coinSrc = 'KMD|spv';
    _newState.coinDest = 'GAME|spv';
    _newState.amount = 30;

    this.setState({
      newExchangeOrderDetails: _newState,
    });
  }

  nextStep() {
    // TODO: move to backend, account for tx fee, amount validation
    console.warn('state', this.state);

    if (this.state.newExchangeOrderDetails.orderStep === 0) {
      const srcCoinSym = this.state.newExchangeOrderDetails.coinSrc.split('|')[0].toLowerCase();
      const destCoinSym = this.state.newExchangeOrderDetails.coinDest.split('|')[0].toLowerCase();

      this.setState({
        processing: true,
      });

      exchangesGetRate(
        this.state.provider,
        srcCoinSym,
        destCoinSym
      )
      .then((exchangeRate) => {
        console.warn('rate', exchangeRate);

        if (this.state.provider === 'coinswitch') {
          if (exchangeRate.data) {
            let valid = true;
            let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
            _newState.exchangeRate = exchangeRate.data;

            if (!this.state.buyFixedDestCoin) {
              _newState.amount = Number(_newState.amount / exchangeRate.data.rate).toFixed(8);

              if (Number(_newState.amount) > Number(this.state.newExchangeOrderDetails.currentBalance)) {
                const _maxBuy = Number(Number((this.state.newExchangeOrderDetails.currentBalance - fromSats(staticVar.spvFees[srcCoinSym])) * exchangeRate.data.rate).toFixed(8));

                Store.dispatch(
                  triggerToaster(
                    `${translate('SEND.INSUFFICIENT_FUNDS')} you can buy up to ${_maxBuy} ${destCoinSym.toUpperCase()} max.`,
                    translate('TOASTR.WALLET_NOTIFICATION'),
                    'error'
                  )
                );
                valid = false;
                this.setState({
                  processing: false,
                });
              }
            }

            if (valid) {
              pricesPromise(
                [srcCoinSym, destCoinSym],
                Config.defaultFiatCurrency
              )
              .then((prices) => {
                _newState.prices = prices;
                _newState.orderStep = 1;

                this.setState({
                  processing: false,
                  newExchangeOrderDetails: _newState,
                });

                console.warn('prices', prices);
              });
            }
          } else {
            this.setState({
              processing: false,
            });
            Store.dispatch(
              triggerToaster(
                'This pair is not available for exchange.',
                translate('TOASTR.ERROR'),
                'error'
              )
            );
          }
        }
      });
    } else if (this.state.newExchangeOrderDetails.orderStep === 1) {
      const srcCoinSym = this.state.newExchangeOrderDetails.coinSrc.split('|')[0].toLowerCase();
      const destCoinSym = this.state.newExchangeOrderDetails.coinDest.split('|')[0].toLowerCase();

      this.setState({
        processing: true,
      });

      //provider, src, dest, srcAmount, destAmount, destPub, refundPub
      exchangesPlaceOrder(
        this.state.provider,
        srcCoinSym,
        destCoinSym,
        this.state.newExchangeOrderDetails.amount,
        0,
        this.props.Dashboard.electrumCoins[destCoinSym.toUpperCase()].pub,
        this.props.Dashboard.electrumCoins[srcCoinSym.toUpperCase()].pub,
      )
      .then((order) => {
        console.warn('order place', order);

        if (order.data) {
          Store.dispatch(dashboardChangeActiveCoin(srcCoinSym.toUpperCase(), 'spv'));
          Store.dispatch(apiElectrumBalance(srcCoinSym.toUpperCase(), this.props.Dashboard.electrumCoins[srcCoinSym.toUpperCase()].pub));

          setTimeout(() => {
            let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
            _newState.orderStep = 2;
            _newState.exchangeOrder = order.data;

            this.setState({
              processing: false,
              newExchangeOrderDetails: _newState,
            });
          }, 100);
        } else {
          this.setState({
            processing: false,
          });
          Store.dispatch(
            triggerToaster(
              'Something went wrong. Please try again.',
              translate('TOASTR.ERROR'),
              'error'
            )
          );
        }
      });
    } else if (this.state.newExchangeOrderDetails.orderStep === 2) {
      let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
      _newState.orderStep = 0;
      _newState.step = 1;

      this.setState({
        newExchangeOrderDetails: _newState,
      });
      Store.dispatch(getExchangesCache(this.state.provider));
    }
  }

  setSendAmountAll() {
    const srcCoinSym = this.state.newExchangeOrderDetails.coinSrc.split('|')[0].toUpperCase();
    let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
    _newState.amount = this.state.newExchangeOrderDetails.currentBalance - fromSats(staticVar.spvFees[srcCoinSym]);

    this.setState({
      newExchangeOrderDetails: _newState,
    });
  }

  clearOrder() {
    const _coinsList = JSON.parse(JSON.stringify(this.props.Main.coins));
    this.coinsSrcList = _coinsList;
    this.coinsDestList = _coinsList;

    this.setState({
      buyFixedDestCoin: false,
      newExchangeOrderDetails: this.defaultExchangeOrderState,
    });
  }

  updateSelectedCoin(e, type) {
    if (e &&
        e.value) {
      const _coin = e.value.split('|');
      let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
      _newState[type === 'src' ? 'coinSrc' : 'coinDest'] = e.value;

      if (type === 'src') {
        _newState.amount = '';
        _newState.currentBalance = '...';

        if (_coin[1] === 'spv') {
          apiElectrumBalancePromise(
            _coin[0],
            this.props.Dashboard.electrumCoins[_coin[0]].pub
          )
          .then((res) => {
            let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
            _newState.currentBalance = res.msg === 'success' ? res.result.balance : 'none';

            this.setState({
              newExchangeOrderDetails: _newState,
            });
          });
        } else if (_coin[1] === 'eth') {
          apiEthereumBalancePromise(
            _coin[0],
            this.props.Dashboard.ethereumCoins[_coin[0]].pub
          )
          .then((res) => {
            let _newState = JSON.parse(JSON.stringify(this.state.newExchangeOrderDetails));
            _newState.currentBalance = res.msg === 'success' ? res.result.balance : 'none';

            this.setState({
              newExchangeOrderDetails: _newState,
            });
          });
        }
      }
  
      this.setState({
        newExchangeOrderDetails: _newState,
      });

      let _coins = JSON.parse(JSON.stringify(this.props.Main.coins));
      _coins[_coin[1]].splice(_coins[_coin[1]].indexOf(_coin[0].toUpperCase()), 1);
      
      if (type === 'src') {
        this.coinsDestList = _coins;
      } else {
        this.coinsSrcList = _coins;
      }
    }
  }

  toggleCreateOrder() {
    let _coinsList = JSON.parse(JSON.stringify(this.props.Main.coins));

    if (this.state.provider === 'coinswitch') {
      const coinswitchCoins = this.props.Dashboard.exchanges && this.props.Dashboard.exchanges.coinswitchCoins;

      if (coinswitchCoins &&
          typeof coinswitchCoins === 'object' &&
          coinswitchCoins.length &&
          coinswitchCoins[0].symbol) {
        let coinswitchCoinsFlat = [];

        for (let i = 0; i < coinswitchCoins.length; i++) {
          coinswitchCoinsFlat.push(coinswitchCoins[i].symbol.toUpperCase());
        }

        for (let i = 0; i < _coinsList.spv.length; i++) {
          if (coinswitchCoinsFlat.indexOf(_coinsList.spv[i]) === -1) {
            _coinsList.spv.splice(i, 1);
          }
        }
      }
    }

    this.coinsSrcList = _coinsList;
    this.coinsDestList = _coinsList;

    this.setState({
      newExchangeOrderDetails: this.defaultExchangeOrderState,
      newExchangeOrder: !this.state.newExchangeOrder,
    });
  }

  _toggleExchangesOrderInfoModal(orderId) {
    Store.dispatch(toggleExchangesOrderInfoModal(orderId));
  }

  toggleExchangeProvider(provider) {
    this.setState({
      provider,
    });
    Store.dispatch(getExchangesCache(provider));
  }

  componentWillMount() {
    /*Store.dispatch(getExchangesCache(this.state.provider));
    Store.dispatch(getExchangesCoinswitchCoins());

    this.exchangesCacheInterval = setInterval(() => {
      Store.dispatch(getExchangesCache(this.state.provider));
    }, EXCHANGES_CACHE_UPDATE_INTERVAL * 1000);

    this.coinswitchCoinsInterval = setInterval(() => {
      Store.dispatch(getExchangesCoinswitchCoins());
    }, EXCHANGES_COINSWITCH_COINS_UPDATE_INTERVAL * 1000);*/

    this.props.getCoinswitchCoins();
  }

  componentWillUnmount() {
    clearInterval(this.exchangesCacheInterval);
    clearInterval(this.coinswitchCoinsInterval);
  }

  renderCoinOption(option) {
    return (
      <div>
        <img
          src={ `assets/images/cryptologo/${option.icon.toLowerCase()}.png` }
          alt={ option.label }
          width="30px"
          height="30px" />
          <span className="margin-left-10">{ option.label }</span>
      </div>
    );
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  render() {
    if (Object.keys(this.props.coins).length > 1) {
      return (
        <div className="form exchanges">
          <AddCoin
            coins={ this.props.coins }
            activate={ this.state.addcoinActive }
            cb={ this.addcoinCB } />
          <div className="steps margin-top-45 padding-bottom-35">
            <div className={ 'step' + (this.state.step === 0 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.step === 1 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.step === 2 ? ' current' : '') }></div>
          </div>

          { this.state.step === 0 &&
            <div className="send-step">
              <div className="margin-bottom-40">
                <div className="step-title">Fill in details</div>
              </div>
            </div>
          }

          <select className="exchanges-menu">
            <option value="order">New order</option>
            <option value="clear">Clear current order</option>
            <option value="history">Order history</option>
            <option value="sync">Sync history</option>
            <option value="update">Refresh history</option>
          </select>
          <div className="margin-bottom-25">
            <div
              onClick={ () => this.activateAddcoin('src') }
              className={ 'edit coin' + (!this.state.coinSrc ? ' empty' : '') }>
              <span className="label">Pay</span>
              { this.state.coinSrc &&
                <span>
                  <img src="/images/cryptologo/spv/kmd.png" /> <span className="label">Komodo</span>
                </span>
              }
              { !this.state.coinSrc &&
                <span className="label empty">tap to select a coin</span>
              }
              <i className="fa fa-caret-down"></i>
            </div>
          </div>
          <div className="margin-bottom-25">
            <div
              onClick={ () => this.activateAddcoin('dest') }
              className={ 'edit coin' + (!this.state.coinDest ? ' empty' : '') }>
              <span className="label">Buy</span>
              { this.state.coinDest &&
                <span>
                  <img src="/images/cryptologo/spv/kmd.png" /> <span className="label">Komodo</span>
                </span>
              }
              { !this.state.coinDest &&
                <span className="label empty">tap to select a coin</span>
              }
              <i className="fa fa-caret-down"></i>
            </div>
          </div>
          <div className="margin-bottom-25">
            <div className="edit">
              <input
                type="password"
                className="form-control"
                name="pin"
                onChange={ this.updateInput }
                placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                value={ this.state.pin || '' } />
            </div>
            { this.state.wrongPin &&
              <div className="error margin-top-15 sz350">
                <i className="fa fa-warning"></i> { translate('LOGIN.WRONG_PIN') }
              </div>
            }
          </div>
          <div
            disabled={ !this.state.pin }
            onClick={ this.decodeSeed }
            className="group3 margin-top-40">
            <div className="btn-inner">
              <div className="btn">{ translate('RECOVERY.SHOW') }</div>
              <div className="group2">
                <div className="rectangle8copy"></div>
                <img
                  className="path6"
                  src={ `${assetsPath.login}/reset-password-path-6.png` } />
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="form exchanges text-center margin-top-45">
          Please add one more coin to exchange
        </div>
      );
    }
  }
}

export default Exchanges;