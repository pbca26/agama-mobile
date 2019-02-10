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
import fees from 'agama-wallet-lib/build/fees';
import {
  fromSats,
  toSats,
  sort,
  formatValue,
} from 'agama-wallet-lib/build/utils';
import { secondsToString } from 'agama-wallet-lib/src/time';
import {
  explorerList,
  isKomodoCoin,
} from 'agama-wallet-lib/build/coin-helpers';

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
      activeSection: 'history',
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
      exchangeOrder: null,
      sendCoinState: null,
      //},
      coinswitchCoins: {},
      addcoinActive: false,
      addcoinDirection: 'buy',
      activeOrderDetails: null,
    };
    this.coinsListSrc = null;
    this.coinsListDest = null;
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.exchangesCacheInterval = null;
    this.exchangesCache = {
      coinswitch: {
        deposits: {},
        orders: {},
      },
    };
    this.coinswitchStatusLookup = [
      'complete',
      'failed',
      'refunded',
      'timeout',
    ];
    this.statusLookup = {
      coinswitch: {
        timeout: 'expired',
        no_deposit: 'awaiting deposit',
      },
    };
    this.updateInput = this.updateInput.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
    this.addcoinCB = this.addcoinCB.bind(this);
    this.activateAddcoin = this.activateAddcoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.updateExchangesMenu = this.updateExchangesMenu.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.updateDeposit = this.updateDeposit.bind(this);
    this.fetchOrder = this.fetchOrder.bind(this);
    this.updateCacheStorage = this.updateCacheStorage.bind(this);
    this.menuBack = this.menuBack.bind(this);
    this.openOrderDetails = this.openOrderDetails.bind(this);
    this.syncHistory = this.syncHistory.bind(this);
    this.openExplorerUrl = this.openExplorerUrl.bind(this);
    this.openOrderOnline = this.openOrderOnline.bind(this);
    this.loadTestData = this.loadTestData.bind(this);
  }

  openOrderOnline() {
    window.open(`https://coinswitch.co/site/transaction/${this.state.activeOrderDetails}`, '_system');
  }

  openExplorerUrl(coin, txid) {
    if (txid) {
      const _name = coin;
      let url;
      
      if (coin.indexOf('|eth') > -1) {
        if (_name === 'eth' ||
            _name === 'eth_ropsten') {
          url = `${explorerList[_name.toUpperCase()]}${txid}`;
        } else {
          url = `${explorerList.ETH}${txid}`;
        }
      } else {
        url = explorerList[_name.toUpperCase()].split('/').length - 1 > 2 ? `${explorerList[_name.toUpperCase()]}${txid}` : `${explorerList[_name.toUpperCase()]}/tx/${txid}`;
      }

      window.open(url, '_system');
    }
  }

  syncHistory() {
    this.setState({
      activeSection: 'history',
      syncHistoryProgressing: true,
    });
    this.props.syncExchangesHistory(this.state.provider)
    .then((res) => {
      if (res) {
        for (let i = 0; i < res.length; i++) {
          if (!this.exchangesCache.coinswitch.orders[res[i].orderId]) {
            devlog(`history sync new order ${res[i].orderId}`);
            this.exchangesCache.coinswitch.orders[res[i].orderId] = res[i];
          }
        }
        this.updateCacheStorage();
      }
      this.setState({
        syncHistoryProgressing: false,
      });
    });
  }

  openOrderDetails(orderId) {
    this.setState({
      activeOrderDetails: orderId,
      activeSection: 'order-details',
    });
  }

  updateCacheStorage() {
    setLocalStorageVar('exchanges', this.exchangesCache);
    console.warn('updateCacheStorage', this.exchangesCache);
  }

  fetchOrder(orderId) {
    this.props.getOrder(this.state.provider, orderId)
    .then((result) => {
      if (!result ||
          (result.success && !result.data)) {
        devlog(`coinswitch request order ${orderId} state update failed`);
      } else {
        if (result.data &&
            result.data.orderId) {
          this.exchangesCache.coinswitch.orders[result.data.orderId] = result.data;
          devlog(`coinswitch request order ${orderId} state update success, new state is ${result.data.status}`);
          this.updateCacheStorage();
        } else {
          devlog(`coinswitch request order ${orderId} state update failed`);
        }
      }
    });
  }

  updateCache() {
    const provider = this.state.provider;

    if (provider === 'coinswitch') {
      for (key in this.exchangesCache.coinswitch.orders) {
        devlog(`coinswitch order ${key} state is ${this.exchangesCache.coinswitch.orders[key].status}`);

        if (this.exchangesCache.coinswitch.orders[key].status &&
            this.coinswitchStatusLookup.indexOf(this.exchangesCache.coinswitch.orders[key].status) === -1) {
          devlog(`coinswitch request order ${key} state update`);
          this.fetchOrder(key);
        }
      }
    }
  }

  updateDeposit(coin, txid, orderId) {
    if (!this.exchangesCache[this.state.provider].deposits) {
      this.exchangesCache[this.state.provider].deposits = {};
    }

    this.exchangesCache[this.state.provider].deposits[`${coin.toLowerCase()}-${txid}`] = orderId;

    devlog('updateDeposit', this.exchangesCache);
  }

  loadTestData() {
    this.addcoinCB('kmd|spv');

    this.setState({
      amount: 10,
    });
  }

  prevStep() {
    let _newState = {
      step: this.state.step - 1,
    };

    if (!this.state.buyFixedDestCoin) {
      _newState.amount = Number(Number(this.state.amount * this.state.exchangeRate.rate).toFixed(8)); 
    }

    this.setState(_newState);
  }

  nextStep() {
    // TODO: move to backend, account for tx fee
    console.warn('state', this.state);

    if (this.state.step === 0) {
      const srcCoinSym = this.state.coinSrc.split('|')[0].toLowerCase();
      const destCoinSym = this.state.coinDest.split('|')[0].toLowerCase();

      this.setState({
        processing: true,
      });

      this.props.getRate(
        this.state.provider,
        srcCoinSym,
        destCoinSym
      )
      .then((exchangeRate) => {
        console.warn('rate', exchangeRate);

        if (this.state.provider === 'coinswitch') {
          if (exchangeRate.data) {
            let valid = true;
            let amount;

            if (!this.state.buyFixedDestCoin) {
              amount = Number(this.state.amount / exchangeRate.data.rate).toFixed(8);

              if (Number(amount) > Number(this.state.currentBalance)) {
                const _maxBuy = Number(Number((this.state.currentBalance - fromSats(fees[srcCoinSym])) * exchangeRate.data.rate).toFixed(8));

                console.warn('_maxBuy error', _maxBuy);
                /*Store.dispatch(
                  triggerToaster(
                    `${translate('SEND.INSUFFICIENT_FUNDS')} you can buy up to ${_maxBuy} ${destCoinSym.toUpperCase()} max.`,
                    translate('TOASTR.WALLET_NOTIFICATION'),
                    'error'
                  )
                );*/
                valid = false;
                this.setState({
                  processing: false,
                });
              }
            }

            if (valid) {
              this.setState({
                processing: false,
                step: 1,
                exchangeRate: exchangeRate.data,
                amount,
              });
            }
          } else {
            this.setState({
              processing: false,
            });
            devlog('This pair is not available for exchange.');
          }
        }
      });
    } else if (this.state.step === 1) {
      const srcCoinSym = this.state.coinSrc.split('|')[0].toLowerCase();
      const destCoinSym = this.state.coinDest.split('|')[0].toLowerCase();

      this.setState({
        processing: true,
      });

      const exchangeOrder = {"orderId":"5a3c3bc4-7005-45c6-a106-4580aeb52f53","exchangeAddress":{"address":"QjibDEZiKV33xiNR7prhMAU4VanXGvZUN5","tag":null},"destinationAddress":{"address":"GNA1Hwa4vf3Y9LHZoMAYmGEngN2rmMTCU3","tag":null},"createdAt":1544871347246,"status":"timeout","inputTransactionHash":null,"outputTransactionHash":null,"depositCoin":"qtum","destinationCoin":"game","depositCoinAmount":null,"destinationCoinAmount":0,"validTill":1544914547246,"userReferenceId":null,"expectedDepositCoinAmount":9.60589756391216,"expectedDestinationCoinAmount":237};

      setTimeout(() => {
        this.setState({
          processing: false,
          exchangeOrder,
          step: 2,
        });
      }, 2000);
      //provider, src, dest, srcAmount, destAmount, destPub, refundPub
      /*exchangesPlaceOrder(
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
          /*Store.dispatch(
            triggerToaster(
              'Something went wrong. Please try again.',
              translate('TOASTR.ERROR'),
              'error'
            )
          );*/
        //}
      //});
    } else if (this.state.step === 2) {
      this.setState({
        step: 3,
      });
      // update history Store.dispatch(getExchangesCache(this.state.provider));
    }
  }

  updateExchangesMenu(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });

    if (e.target.value === 'clear') {
      this.clearOrder();
    } else if (e.target.value === 'order') {
      this.coinsListSrc = Object.keys(this.props.coins);
      this.coinsListDest = Object.keys(this.props.coins);
    } else if (e.target.value === 'sync') {
      this.syncHistory();
    }
  }  

  clearOrder() {
    this.setState({
      activeSection: 'order',
      amount: 0,
      coinSrc: null,
      coinDest: null,
      step: 0,
    });

    this.coinsListSrc = Object.keys(this.props.coins);
    this.coinsListDest = Object.keys(this.props.coins);
  }

  changeActiveSection(sectionName) {
    this.setState({
      activeSection: sectionName,
    });
  }

  addcoinCB(coin) {
    console.warn('addcoinCB', coin);

    const fetchData = (_coin, pricesCoins) => {
      console.warn(pricesCoins);
      this.props.getBalance(_coin)
      .then((res) => {
        if (res &&
            res.hasOwnProperty('balance') &&
            JSON.stringify(res).indexOf('error') === -1) {
          devlog(`${_coin} balance`, res);
          this.setState({
            currentBalance: res.balance,
          });
        } else {
          devlog(`error getting ${_coin} balance`);
        }
      });

      this.props.getPrices(pricesCoins)
      .then((res) => {
        devlog('coin prices', res);
        if (res &&
            res !== 'error') {
          this.setState({
            fiatPrices: res,
          });
        }
      });
    }
    
    if (this.state.addcoinDirection === 'dest') {
      let _newState = {
        coinDest: coin,
        addcoinActive: false,
      };

      if (Object.keys(this.props.coins).length === 2) {
        const _coins = Object.keys(this.props.coins);
        _newState.coinSrc = _coins[_coins.indexOf(coin) === 0 ? 1 : 0];
        fetchData(_newState.coinSrc, [coin.split('|')[0], _newState.coinSrc.split('|')[0]]);
      } else if (this.state.coinSrc) {
        this.props.getPrices([coin.split('|')[0], this.state.coinSrc.split('|')[0]])
        .then((res) => {
          devlog('coin prices', res);
          if (res &&
              res !== 'error') {
            this.setState({
              fiatPrices: res,
            });
          }
        });
      }
      this.setState(_newState);
    } else {
      let _newState = {
        coinSrc: coin,
        addcoinActive: false,
      };
      
      if (Object.keys(this.props.coins).length === 2) {
        const _coins = Object.keys(this.props.coins);
        _newState.coinDest = _coins[_coins.indexOf(coin) === 0 ? 1 : 0];
        fetchData(coin, [coin.split('|')[0], _newState.coinDest.split('|')[0]]);
      } else if (this.state.coinDest) {
        this.props.getPrices([coin.split('|')[0], this.state.coinDest.split('|')[0]])
        .then((res) => {
          devlog('coin prices', res);
          if (res &&
              res !== 'error') {
            this.setState({
              fiatPrices: res,
            });
          }
        });
      } else {
        fetchData(coin, coin.split('|')[0]);
      }
      this.setState(_newState);
    }
  }

  activateAddcoin(direction) {
    if ((direction === 'src' && (Object.keys(this.props.coins).length > 2 || (Object.keys(this.props.coins).length === 2 && !this.state.coinSrc))) ||
        (direction === 'dest' && (Object.keys(this.props.coins).length > 2 || (Object.keys(this.props.coins).length === 2 && !this.state.coinDest)))) {
      this.setState({
        addcoinDirection: direction,
        addcoinActive: true,
      });
    }
  }

  findDeposits(orderId) {
    const _cache = this.exchangesCache.coinswitch;
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

  menuBack() {
    if (this.state.activeSection === 'order-details') {
      this.changeActiveSection('history');
    } else if (this.state.activeSection === 'order' && this.state.step === 1) {
      this.prevStep();
    } else if (this.state.activeSection === 'order' && this.state.step !== 1) {
      if (Object.keys(this.exchangesCache.coinswitch.orders).length) {
        this.changeActiveSection('history');
      } else {
        this.props.historyBack();
      }
    } else {
      this.props.historyBack();
    }

    this.setState({
      activeOrderDetails: null,
    });
  }

  renderOrderHistory() {
    const _cache = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders;
    const _deposits = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.deposits;
    let _cacheFlat = [];
    let _items = [];
  
    for (let key in _cache) {
      _cacheFlat.push(_cache[key]);
    }
  
    _cacheFlat = sort(_cacheFlat, 'createdAt', true);
  
    for (let i = 0; i < _cacheFlat.length; i++) {
      if (this.state.provider === 'coinswitch') {
        _items.push(
          <div
            key={ `${this.state.provider}-${i}` }
            className="item"
            onClick={ () => this.openOrderDetails(_cacheFlat[i].orderId) }>
            <div className="src">
              <div className="date">{ secondsToString(_cacheFlat[i].createdAt / 1000) }</div>
              <div className="item-info">
                <img
                  className="icon"
                  src={ `/images/cryptologo/spv/${_cacheFlat[i].depositCoin}.png` } />
                <div className="item-info-details">
                  <div className="name">{ _cacheFlat[i].depositCoin.toUpperCase() }</div>
                  <div className="amount">{ formatValue(_cacheFlat[i].expectedDepositCoinAmount) }</div>
                </div>
              </div>
            </div>
            <i className="fa fa-exchange"></i>
            <div className="dest">
              <div className={ _cacheFlat[i].status === 'confirming' || _cacheFlat[i].status === 'exchanging' || (_cacheFlat[i].status === 'sending' && !_cacheFlat[i].outputTransactionHash) ? 'status col-warning' : 'status' }>
                { _cacheFlat[i].outputTransactionHash ? 'complete' : this.statusLookup.coinswitch[_cacheFlat[i].status] ? this.statusLookup.coinswitch[_cacheFlat[i].status] : _cacheFlat[i].status }
              </div>
              <div className="item-info">
                <img
                  className="icon"
                  src={ `/images/cryptologo/spv/${_cacheFlat[i].destinationCoin}.png` } />
                <div className="item-info-details">
                  <div className="name">{ _cacheFlat[i].destinationCoin.toUpperCase() }</div>
                  <div className="amount">{ formatValue(_cacheFlat[i].expectedDestinationCoinAmount) }</div>
                </div>
              </div>
              <div className="deposit">
              { this.findDeposits(_cacheFlat[i].orderId).length > 0 || (this.state.provider === 'coinswitch' && _cacheFlat[i].inputTransactionHash) || (this.state.provider === 'coinswitch' && _cacheFlat[i].inputTransactionHash && _deposits && _deposits[`${_cacheFlat[i].depositCoin.toLowerCase()}-${_cacheFlat[i].inputTransactionHash}`]) ? <i className="fa fa-check-circle green"></i> : <i className="fa fa-exclamation-circle"></i> }
              </div>
            </div>
            {/*
            <td>
              { this.findDeposits(_cacheFlat[i].orderId).length > 0 || (this.state.provider === 'coinswitch' && _cacheFlat[i].inputTransactionHash) || (this.state.provider === 'coinswitch' && _cacheFlat[i].inputTransactionHash && _cache.deposits && _cache.deposits[`${_cacheFlat[i].depositCoin.toLowerCase()}-${_cacheFlat[i].inputTransactionHash}`]) ? 'Yes' : 'No' }
              { ((this.state.provider === 'coinswitch' && this.findDeposits(_cacheFlat[i].orderId).length === 0 && _cacheFlat[i].status === 'no_deposit')) &&
                <button
                  type="button"
                  className="btn btn-xs white btn-success waves-effect waves-lightm margin-left-10"
                  disabled={ this.state.syncHistoryProgressing }
                  onClick={ () => this.makeDeposit(_cacheFlat[i].orderId) }>
                  Send
                </button>
              }
            </td>
            <td>
              <button
                type="button"
                className="btn btn-xs white btn-info waves-effect waves-light btn-kmdtxid"
                disabled={ this.state.syncHistoryProgressing }
                onClick={ () => this._toggleExchangesOrderInfoModal(_cacheFlat[i].orderId) }>
                <i className="fa fa-search"></i>
              </button>
            </td>*/}
          </div>
        );
      }
    }
  
    if (_items.length) {
      return (
        <div className="exchanges-history-inner-block">
        { _items }
        </div>
      );
    } else {
      return (
        <div className="margin-left-10">No history</div>
      );
    }
  }

  renderOrderDetails() {
    const _cache = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders;

    return (
      <section className="exchanges-order-details">
        <div className="edit">
          Date
          <div className="shade margin-top-5">
          { secondsToString(_cache[this.state.activeOrderDetails].createdAt / 1000) }
          </div>
        </div>
        <div className="edit">
          Valid until
          <div className="shade margin-top-5">
          { secondsToString(_cache[this.state.activeOrderDetails].validTill / 1000) }
          </div>
        </div>
        <div className="edit">
          Deposit
          <div className="shade margin-top-5">
          { Number(_cache[this.state.activeOrderDetails].expectedDepositCoinAmount).toFixed(8) } { _cache[this.state.activeOrderDetails].depositCoin.toUpperCase() }
          </div>
        </div>
        <div className="edit">
          Destination
          <div className="shade margin-top-5">
          { Number(_cache[this.state.activeOrderDetails].expectedDestinationCoinAmount).toFixed(8) } { _cache[this.state.activeOrderDetails].destinationCoin.toUpperCase() }
          </div>
        </div>
        <div className="edit">
          Exchange rate
          <div className="shade margin-top-5">
          { Number((1 / _cache[this.state.activeOrderDetails].expectedDepositCoinAmount) * _cache[this.state.activeOrderDetails].expectedDestinationCoinAmount).toFixed(8) } { _cache[this.state.activeOrderDetails].destinationCoin.toUpperCase() } for 1 { _cache[this.state.activeOrderDetails].depositCoin.toUpperCase() }
          </div>
        </div>
        <div className="edit">
          Deposit address
          <div className="shade margin-top-5">
          { _cache[this.state.activeOrderDetails].exchangeAddress.address }
          </div>
        </div>
        <div className="edit">
          Deposit TXID
          <div
            className="shade margin-top-5"
            onClick={ () => this.openExplorerUrl(_cache[this.state.activeOrderDetails].depositCoin.toLowerCase(), _cache[this.state.activeOrderDetails].inputTransactionHash || this.findDeposits(_cache[this.state.activeOrderDetails].orderId)[0]) }>
          { _cache[this.state.activeOrderDetails].inputTransactionHash || this.findDeposits(_cache[this.state.activeOrderDetails].orderId)[0] ? _cache[this.state.activeOrderDetails].inputTransactionHash || this.findDeposits(_cache[this.state.activeOrderDetails].orderId)[0] : 'N/A' }
          </div>
        </div>
        <div className="edit">
          Destination address
          <div className="shade margin-top-5">
          { _cache[this.state.activeOrderDetails].destinationAddress.address }
          </div>
        </div>
        <div className="edit">
          Destination TXID
          <div
            className="shade margin-top-5"
            onClick={ () => this.openExplorerUrl(_cache[this.state.activeOrderDetails].destinationCoin.toLowerCase(), _cache[this.state.activeOrderDetails].outputTransactionHash) }>
          { _cache[this.state.activeOrderDetails].outputTransactionHash ? _cache[this.state.activeOrderDetails].outputTransactionHash : 'N/A' }
          </div>
        </div>
        <div className="edit">
          Status
          <div className="shade margin-top-5">
          { _cache[this.state.activeOrderDetails].outputTransactionHash ? 'complete' : this.statusLookup.coinswitch[_cache[this.state.activeOrderDetails].status] ? this.statusLookup.coinswitch[_cache[this.state.activeOrderDetails].status] : _cache[this.state.activeOrderDetails].status }
          </div>
        </div>
        <div className="edit">
          Order ID
          <div className="shade margin-top-5">
          { _cache[this.state.activeOrderDetails].orderId }
          </div>
        </div>
      </section>
    );
  }

  componentWillMount() {
    const _cache = getLocalStorageVar('exchanges');

    if (_cache) {
      this.exchangesCache = _cache;
      this.setState({
        activeSection: 'history',
      });
    } else {
      this.setState({
        activeSection: 'order',
      });
    }
    /*Store.dispatch(getExchangesCache(this.state.provider));
    Store.dispatch(getExchangesCoinswitchCoins());

    this.exchangesCacheInterval = setInterval(() => {
      Store.dispatch(getExchangesCache(this.state.provider));
    }, EXCHANGES_CACHE_UPDATE_INTERVAL * 1000);

    this.coinswitchCoinsInterval = setInterval(() => {
      Store.dispatch(getExchangesCoinswitchCoins());
    }, EXCHANGES_COINSWITCH_COINS_UPDATE_INTERVAL * 1000);*/

    this.props.getCoinswitchCoins()
    .then((coins) => {
      if (coins &&
          coins.length) {
        this.setState({
          coinswitchCoins: coins,
        });
      }
    });
  }

  componentWillUnmount() {
    clearInterval(this.exchangesCacheInterval);
    clearInterval(this.coinswitchCoinsInterval);
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
          <img
            className="menu-back"
            src="/images/template/menu/trends-combined-shape.png"
            onClick={ this.menuBack } />
          <select
            name="activeSection"
            onChange={ this.updateExchangesMenu }
            value={ this.state.activeSection }
            className="exchanges-menu">
            <option value="order">New order</option>
            { this.state.activeSection === 'order' &&
              (this.state.step === 0 || this.state.step === 1) &&
              <option value="clear">Clear current order</option>
            }
            { this.state.activeSection !== 'order-details' &&
              <option value="history">Order history</option>
            }
            { this.state.activeSection === 'order-details' &&
              <option value="order-details">Order history</option>
            }
            { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
              <option value="sync">Sync history</option>
            }
            { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
              Object.keys(this.exchangesCache.coinswitch.orders).length > 0 &&
              <option value="update">Refresh history</option>
            }
          </select>

          { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
            <div className="exchanges-order-history margin-top-45">
              { !this.state.activeOrderDetails && !this.state.syncHistoryProgressing && this.renderOrderHistory() }
              { this.state.activeOrderDetails && !this.state.syncHistoryProgressing && this.renderOrderDetails() }
              { this.state.syncHistoryProgressing &&
                <div className="text-center">Synchronizing order history. Please wait...</div>
              }
            </div>
          }

          { this.state.activeSection === 'order' &&
            <div className="exchanges-new-order">
              <AddCoin
                coins={ Object.keys(this.props.coins) }
                filterOut={ [this.state.coinDest, this.state.coinSrc] }
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
                    <div className="step-title">Fill in order details</div>
                  </div>
                </div>
              }

              { this.state.step === 1 &&
                <div className="send-step">
                  <div className="margin-bottom-40">
                    <div className="step-title">Confirm order details</div>
                  </div>
                </div>
              }

              { this.state.step === 2 &&
                <div className="send-step">
                  <div className="margin-bottom-40">
                    <div className="step-title">Review order details</div>
                  </div>
                </div>
              }

              { this.state.step === 0 &&
                <section>
                  <div
                    className="padding-bottom-20"
                    onClick={ this.loadTestData }>Test data</div>

                  <div className="margin-bottom-25">
                    <div
                      onClick={ () => this.activateAddcoin('src') }
                      className={ 'edit coin' + (!this.state.coinSrc ? ' empty' : '') }>
                      <span className="label">Pay</span>
                      { this.state.coinSrc &&
                        <span>
                          <img src={ `/images/cryptologo/${this.state.coinSrc.split('|')[1].toLowerCase()}/${this.state.coinSrc.split('|')[0].toLowerCase()}.png` } /> <span className="label">{ translate((this.state.coinSrc.indexOf('|spv') > -1 ? 'SPV.' : 'ETH.') + this.state.coinSrc.split('|')[0].toUpperCase()) }</span>
                        </span>
                      }
                      { !this.state.coinSrc &&
                        <span className="label empty">tap to select a coin</span>
                      }
                      { (Object.keys(this.props.coins).length > 2 || (Object.keys(this.props.coins).length === 2 && !this.state.coinSrc)) &&
                        <i className="fa fa-caret-down"></i>
                      }
                    </div>
                  </div>
                  <div className="margin-bottom-25">
                    <div
                      onClick={ () => this.activateAddcoin('dest') }
                      className={ 'edit coin' + (!this.state.coinDest ? ' empty' : '') }>
                      <span className="label">Buy</span>
                      { this.state.coinDest &&
                        <span>
                          <img src={ `/images/cryptologo/${this.state.coinDest.split('|')[1].toLowerCase()}/${this.state.coinDest.split('|')[0].toLowerCase()}.png` } /> <span className="label">{ translate((this.state.coinDest.indexOf('|spv') > -1 ? 'SPV.' : 'ETH.') + this.state.coinDest.split('|')[0].toUpperCase()) }</span>
                        </span>
                      }
                      { !this.state.coinDest &&
                        <span className="label empty">tap to select a coin</span>
                      }
                      { (Object.keys(this.props.coins).length > 2 || (Object.keys(this.props.coins).length === 2 && !this.state.coinDest)) &&
                        <i className="fa fa-caret-down"></i>
                      }
                    </div>
                  </div>
                  <div className="margin-bottom-25">
                    <div className="edit">
                      <input
                        type="text"
                        className="form-control"
                        name="amount"
                        onChange={ this.updateInput }
                        placeholder={ 'Enter an amount' + (this.state.coinDest ? `in ${this.state.coinDest.split('|')[0].toUpperCase()}` : '') }
                        value={ this.state.amount || '' } />
                    </div>
                  </div>
                  <div
                    disabled={
                      !this.state.coinSrc ||
                      !this.state.coinDest ||
                      !this.state.amount ||
                      this.state.processing
                    }
                    onClick={ this.nextStep }
                    className="group3 margin-top-40">
                    <div className="btn-inner">
                      <div className="btn">{ this.state.processing ? 'Please wait...' : 'Next' }</div>
                      <div className="group2">
                        <div className="rectangle8copy"></div>
                        <img
                          className="path6"
                          src={ `${assetsPath.login}/reset-password-path-6.png` } />
                      </div>
                    </div>
                  </div>
                </section>
              }
              { this.state.step === 1 &&
                <section className="exchanges-order-confirm-step">
                  <div className="edit">
                    You pay
                    <div className="shade margin-top-5">
                    { this.state.amount } { this.state.coinSrc.split('|')[0].toUpperCase() }
                    <span className="padding-left-30">{ Number(this.state.amount * this.state.fiatPrices[this.state.coinSrc.split('|')[0].toUpperCase()].USD).toFixed(8) } USD</span>
                    </div>
                  </div>
                  <div className="edit">
                    You receive
                    <div className="shade margin-top-5">
                    { Number(this.state.amount * this.state.exchangeRate.rate).toFixed(8) } { this.state.coinDest.split('|')[0].toUpperCase() }
                    <span className="padding-left-30">{ Number(this.state.amount * this.state.fiatPrices[this.state.coinSrc.split('|')[0].toUpperCase()].USD).toFixed(8) } USD</span>
                    </div>
                  </div>
                  <div className="edit">
                    Exchange rate
                    <div className="shade margin-top-5">
                    { this.state.exchangeRate.rate } { this.state.coinDest.split('|')[0].toUpperCase() } for 1 { this.state.coinSrc.split('|')[0].toUpperCase() }
                    </div>
                  </div>
                  { this.state.amount > this.state.exchangeRate.limitMaxDepositCoin &&
                    <div className="edit error">
                      Error
                      <div className="shade margin-top-5">
                        { this.state.coinSrc.split('|')[0].toUpperCase() } amount exceeds max allowed value { this.state.exchangeRate.limitMaxDepositCoin }
                      </div>
                    </div>
                  }
                  { this.state.amount < this.state.exchangeRate.limitMinDepositCoin &&
                    <div className="edit error">
                      Error
                      <div className="shade margin-top-5">
                        { this.state.coinSrc.split('|')[0].toUpperCase() } amount is too low, min deposit amount is { this.state.exchangeRate.limitMinDepositCoin }
                      </div>
                    </div>
                  }
                  <div className="widget-body-footer">
                    <div className="group3 margin-top-40">
                      <div
                        onClick={ this.prevStep }
                        className="btn-inner pull-left btn-back margin-left-15"
                        disabled={ this.state.processing }>
                        <div className="btn">{ translate('SEND.BACK') }</div>
                        <div className="group2">
                          <img
                            className="path6"
                            src={ `${assetsPath.menu}/trends-combined-shape.png` } />
                        </div>
                      </div>
                      <div
                        onClick={ this.nextStep }
                        className="btn-inner pull-right margin-right-15"
                        disabled={ this.state.processing }>
                        <div className="btn">{ this.state.processing ? 'Please wait...' : 'Next' }</div>
                        <div className="group2">
                          <div className="rectangle8copy"></div>
                          <img
                            className="path6"
                            src={ `${assetsPath.login}/reset-password-path-6.png` } />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              }
              { this.state.step === 2 &&
                <section className="exchanges-order-confirm-step">
                  <div className="edit">
                    Date
                    <div className="shade margin-top-5">
                    { secondsToString(this.state.exchangeOrder.createdAt / 1000) }
                    </div>
                  </div>
                  <div className="edit">
                    Valid until
                    <div className="shade margin-top-5">
                    { secondsToString(this.state.exchangeOrder.validTill / 1000) }
                    </div>
                  </div>
                  <div className="edit">
                    You pay
                    <div className="shade margin-top-5">
                    { Number(this.state.exchangeOrder.expectedDepositCoinAmount).toFixed(8) } { this.state.exchangeOrder.depositCoin.toUpperCase() }
                    </div>
                  </div>
                  <div className="edit">
                    You receive
                    <div className="shade margin-top-5">
                    { Number(this.state.exchangeOrder.expectedDestinationCoinAmount).toFixed(8) } { this.state.exchangeOrder.destinationCoin.toUpperCase() }
                    </div>
                  </div>
                  <div className="edit">
                    Exchange rate
                    <div className="shade margin-top-5">
                    { Number((1 / this.state.exchangeOrder.expectedDepositCoinAmount) * this.state.exchangeOrder.expectedDestinationCoinAmount).toFixed(8) } { this.state.exchangeOrder.destinationCoin.toUpperCase() } for 1 { this.state.exchangeOrder.depositCoin.toUpperCase() }
                    </div>
                  </div>
                  <div className="edit">
                    Deposit address
                    <div className="shade margin-top-5">
                    { this.state.exchangeOrder.exchangeAddress.address }
                    </div>
                  </div>
                  <div className="edit">
                    Receive address
                    <div className="shade margin-top-5">
                    { this.state.exchangeOrder.destinationAddress.address }
                    </div>
                  </div>
                  <div className="edit">
                    Order ID
                    <div
                      className="shade margin-top-5"
                      onClick={ this.openOrderOnline }>
                    { this.state.exchangeOrder.orderId }
                    </div>
                  </div>
                  <div className="widget-body-footer">
                    <div className="group3 margin-top-40">
                      <div
                        onClick={ this.nextStep }
                        className="btn-inner">
                        <div className="btn">{ this.state.processing ? 'Please wait...' : 'Proceed to deposit' }</div>
                        <div className="group2">
                          <div className="rectangle8copy"></div>
                          <img
                            className="path6"
                            src={ `${assetsPath.login}/reset-password-path-6.png` } />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              }
            </div>
          }
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