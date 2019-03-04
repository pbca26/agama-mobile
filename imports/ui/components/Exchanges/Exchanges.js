import React from 'react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
  assetsPath,
} from '../../actions/utils';
import translate from '../../translate/translate';
import {
  devlog,
  config,
} from '../../actions/dev';
import AddCoin from '../AddCoin';
import SendCoin from '../SendCoin';
import ExchangesSupportedCoins from './Coins';
import ExchangesTOS from './TOS';
import ExchangesOrderDetails from './OrderDetails';
import ExchangesHistory from './History';
import FiatSymbol from '../FiatSymbol';
import fees from 'agama-wallet-lib/build/fees';
import {
  fromSats,
  toSats,
  formatValue,
  isNumber,
} from 'agama-wallet-lib/build/utils';
import { secondsToString } from 'agama-wallet-lib/build/time';
import { Meteor } from 'meteor/meteor';
import {
  coinswitchStatusLookup,
  statusLookup,
} from './utils';

const EXCHANGES_CACHE_UPDATE_INTERVAL = 60; // sec
const EXCHANGES_COINSWITCH_COINS_UPDATE_INTERVAL = 120; // sec

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
      currentBalanceSrc: 'none',
      currentBalanceDest: 'none',
      step: 0,
      orderId: null,
      amount: 0,
      amountInput: 0,
      coinSrc: null,
      coinDest: null,
      rate: null,
      exchangeRate: null,
      fiatPrices: null,
      exchangeOrder: null,
      sendCoinState: null,
      maxBuyError: false,
      orderPlaceError: null,
      coinswitchCoins: null,
      coinswitchCoinsObj: null,
      addcoinActive: false,
      addcoinDirection: 'buy',
      activeOrderDetails: null,
      activeOrderDetailsDepositTx: null,
      prevActiveState: null,
      cacheUpdated: false,
      sendCoinInit: {
        pub: null,
        amount: 0,
      },
      exchangesCache: {
        coinswitch: {
          deposits: {},
          orders: {},
        },
      },
    };
    this.coinsListSrc = null;
    this.coinsListDest = null;
    this.exchangesCacheInterval = null;
    this.exchangesCache = {
      coinswitch: {
        deposits: {},
        orders: {},
      },
    };
    this.coinswitchStatusLookup = coinswitchStatusLookup;
    this.statusLookup = statusLookup;
    this.updateInput = this.updateInput.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
    this.addcoinCB = this.addcoinCB.bind(this);
    this.activateAddcoin = this.activateAddcoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.updateExchangesMenu = this.updateExchangesMenu.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.fetchOrder = this.fetchOrder.bind(this);
    this.updateCacheStorage = this.updateCacheStorage.bind(this);
    this.menuBack = this.menuBack.bind(this);
    this.openOrderDetails = this.openOrderDetails.bind(this);
    this.syncHistory = this.syncHistory.bind(this);
    this.openOrderOnline = this.openOrderOnline.bind(this);
    this.setMaxBuyAmount = this.setMaxBuyAmount.bind(this);
    this.makeDeposit = this.makeDeposit.bind(this);
    this.sendCoinCB = this.sendCoinCB.bind(this);
    this.filterOutETH = this.filterOutETH.bind();
    this.toggleBuyFixedDestCoin = this.toggleBuyFixedDestCoin.bind(this);
    // test
    this.loadTestData = this.loadTestData.bind(this);
  }

  toggleBuyFixedDestCoin() {
    this.setState({
      buyFixedDestCoin: !this.state.buyFixedDestCoin,
      maxBuyError: null,
    });
  }

  filterOutETH = (coins) => {
    let _items = JSON.parse(JSON.stringify(coins));
  
    for (let key in coins) {
      if (key.indexOf('|spv') === -1 ||
          (this.state.coinswitchCoins && this.state.coinswitchCoins.indexOf(key.split('|')[0].toLowerCase()) === -1)) {
        delete _items[key];
      }
    }
  
    return _items;
  }

  sendCoinCB(sendResult, coin) {    
    if (sendResult &&
        sendResult.msg === 'success' &&
        sendResult.result &&
        sendResult.result.txid) {
      let orderId;

      if (this.state.activeOrderDetails) {
        orderId = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders[this.state.activeOrderDetails].orderId;
      } else {
        orderId = this.state.exchangeOrder.orderId;
      }

      this.exchangesCache.coinswitch.deposits[`${coin.split('|')[0].toLowerCase()}-${sendResult.result.txid}`] = orderId;
      this.setState({
        exchangesCache: this.exchangesCache,
      });
      this.updateCacheStorage();

      Meteor.setTimeout(() => {
        this.setState({
          step: 0,
          activeSection: 'history',
          cacheUpdated: !this.state.cacheUpdated,
          activeOrderDetails: null,
          activeOrderTxView: false,
        });

        Meteor.setTimeout(() => {
          this.updateCache();
        }, 2000);
      }, 10000);
    }
  }

  makeDeposit() {
    const _cache = this.exchangesCache ? this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders[this.state.activeOrderDetails] : this.state.exchangesCache.coinswitch && this.state.exchangesCache.coinswitch.orders[this.state.activeOrderDetails];
    const _coin = _cache.depositCoin.toLowerCase();

    if (this.props.coins[`${_coin}|spv`]) {
      this.props.switchCoin(`${_coin}|spv`, true);
      
      Meteor.setTimeout(() => {
        this.setState({
          activeSection: 'order',
          step: 3,
          sendCoinInit: {
            pub: _cache.exchangeAddress.address,
            amount: _cache.expectedDepositCoinAmount,
          },
        });
      }, 100);
    } else {
      this.props.addCoin(`${_coin}|spv`, true);

      Meteor.setTimeout(() => {
        this.props.switchCoin(`${_coin}|spv`, true);

        Meteor.setTimeout(() => {
          this.setState({
            activeSection: 'order',
            step: 3,
            sendCoinInit: {
              pub: _cache.exchangeAddress.address,
              amount: _cache.expectedDepositCoinAmount,
            },
          });
        }, 100);
      }, 200);
    }
  }

  orderDetailsTab(val) {
    this.setState({
      activeOrderTxView: val,
    });
  }

  setMaxBuyAmount() {
    if (this.state.buyFixedDestCoin) {
      this.setState({
        amount: this.state.currentBalanceSrc,
        maxBuyError: null,
      });
    } else {
      this.setState({
        amount: this.state.maxBuyError,
        maxBuyError: null,
      });
    }
  }

  openOrderOnline() {
    window.open(`https://coinswitch.co/app/exchange/transaction/${this.state.activeOrderDetails}`, '_system');
  }

  syncHistory() {
    this.setState({
      activeSection: 'history',
      syncHistoryProgressing: true,
    });

    this.props.syncExchangesHistory(this.state.provider)
    .then((res) => {
      if (res &&
          typeof res === 'object') {
        for (let i = 0; i < res.length; i++) {
          if (!this.exchangesCache.coinswitch.orders[res[i].orderId]) {
            devlog(`history sync new order ${res[i].orderId}`);

            this.exchangesCache.coinswitch.orders[res[i].orderId] = res[i];
          }
        }

        this.updateCacheStorage();
        this.updateCache();
      }

      this.setState({
        syncHistoryProgressing: false,
      });
    });
  }

  openOrderDetails(orderId) {
    const _cache = this.exchangesCache ? this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders[orderId] : this.state.exchangesCache.coinswitch && this.state.exchangesCache.coinswitch.orders[orderId];

    this.setState({
      activeOrderDetails: orderId,
      activeSection: 'order-details',
      activeOrderTxView: false,
      activeOrderDetailsDepositTx: null,
    });

    if (_cache.inputTransactionHash) {
      this.props.getTransaction(
        `${_cache.depositCoin.toLowerCase()}|spv`,
        { 
          txid: _cache.inputTransactionHash,
          pub: _cache.exchangeAddress.address,
        }
      )
      .then((res) => {
        devlog(`order ${orderId} deposit tx`, res);
        
        this.setState({
          activeOrderDetailsDepositTx: res[0],
        });
      });
    }
  }

  updateCacheStorage() {
    setLocalStorageVar('exchanges', this.exchangesCache);
    devlog('updateCacheStorage', this.exchangesCache);
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
          
          this.setState({
            cacheUpdated: !this.state.cacheUpdated,
            exchangesCache: this.exchangesCache,
          });
        } else {
          devlog(`coinswitch request order ${orderId} state update failed`);
        }
      }
    });
  }

  updateCache() {
    const provider = this.state.provider;

    if (provider === 'coinswitch') {
      for (let key in this.exchangesCache.coinswitch.orders) {
        const order = this.exchangesCache.coinswitch.orders[key];

        devlog(`coinswitch order ${key} state is ${order.status}`);

        if (order.status &&
            this.coinswitchStatusLookup.indexOf(order.status) === -1) {
          devlog(`coinswitch request order ${key} state update`);
          
          this.fetchOrder(key);
        }
      }
    }
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
      _newState.amount = this.state.amountInput; 
    }

    this.setState(_newState);
  }

  nextStep() {
    // TODO: account for tx fee
    if (this.state.step === 0) {
      if (!isNumber(this.state.amount)) {
        this.setState({
          orderPlaceError: translate('EXCHANGES.AMOUNT_IS_INCORRECT'),
        });
      } else {
        const srcCoinSym = this.state.coinSrc.split('|')[0].toLowerCase();
        const destCoinSym = this.state.coinDest.split('|')[0].toLowerCase();

        this.setState({
          processing: true,
          amountInput: this.state.amount,
        });

        this.props.getRate(
          this.state.provider,
          srcCoinSym,
          destCoinSym
        )
        .then((exchangeRate) => {
          devlog('rate', exchangeRate);

          if (this.state.provider === 'coinswitch') {
            if (exchangeRate.data) {
              let valid = true;
              let amount = this.state.amount;

              if (!this.state.buyFixedDestCoin) {
                amount = Number(this.state.amount / exchangeRate.data.rate).toFixed(8);
              }

              if (Number(amount) > Number(this.state.currentBalanceSrc)) {
                const _maxBuy = this.state.buyFixedDestCoin ? Number(Number((this.state.currentBalanceSrc - fromSats(fees[srcCoinSym] || 0))).toFixed(8)) : Number(Number((this.state.currentBalanceSrc - fromSats(fees[srcCoinSym] || 0)) * exchangeRate.data.rate).toFixed(8));
                valid = false;
                
                this.setState({
                  processing: false,
                  maxBuyError: Number(_maxBuy) > 0 ? _maxBuy : 'noBalance',
                });
              }

              if (valid) {
                this.setState({
                  processing: false,
                  step: 1,
                  exchangeRate: exchangeRate.data,
                  amount,
                  maxBuyError: null,
                  orderPlaceError: null,
                });
              }
            } else {
              this.setState({
                processing: false,
                orderPlaceError: JSON.stringify(order),
              });
              
              devlog('This pair is not available for exchange.');
            }
          }
        });
      }
    } else if (this.state.step === 1) {
      const srcCoinSym = this.state.coinSrc.split('|')[0].toLowerCase();
      const destCoinSym = this.state.coinDest.split('|')[0].toLowerCase();

      this.setState({
        processing: true,
      });

      this.props.placeOrder(
        this.state.provider,
        srcCoinSym,
        destCoinSym,
        this.state.amount,
        0,
        this.props.pubKeys.spv[destCoinSym.toLowerCase()],
        this.props.pubKeys.spv[srcCoinSym.toLowerCase()],
      )
      .then((order) => {
        devlog('order place', order);

        if (order.data) {
          this.exchangesCache.coinswitch.orders[order.data.orderId] = order.data;
          this.exchangesCache.coinswitch.orders[order.data.orderId].depositCoin = srcCoinSym;
          this.exchangesCache.coinswitch.orders[order.data.orderId].destinationCoin = destCoinSym;
          this.exchangesCache.coinswitch.orders[order.data.orderId].status = 'no_deposit';
          this.exchangesCache.coinswitch.orders[order.data.orderId].createdAt = Math.floor(Date.now());
          this.exchangesCache.coinswitch.orders[order.data.orderId].destinationAddress = { address: this.props.pubKeys.spv[destCoinSym.toLowerCase()] };
          
          this.updateCacheStorage();
          
          this.setState({
            processing: false,
            exchangeOrder: order.data,
            step: 2,
            activeOrderDetails: order.data.orderId,
            orderPlaceError: null,
            exchangesCache: this.exchangesCache,
          });
        } else {
          devlog('order place error');

          this.setState({
            processing: false,
            orderPlaceError: JSON.stringify(order),
          });
        }
      });
    } else if (this.state.step === 2) {
      const _cache = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders[this.state.activeOrderDetails];
      
      this.props.switchCoin(this.state.coinSrc, true);

      Meteor.setTimeout(() => {
        this.setState({
          step: 3,
          sendCoinInit: {
            pub:  _cache.exchangeAddress.address,
            amount: _cache.expectedDepositCoinAmount,
          },
        });
      }, 100);
    }
  }

  updateExchangesMenu(e) {
    const coins = Object.keys(this.filterOutETH(this.props.coins));

    if (e.target.value !== 'tos') {
      this.setState({
        [e.target.name]: e.target.value,
      });
    }

    if (e.target.value === 'clear') {
      this.clearOrder();
    } else if (e.target.value === 'order') {
      this.coinsListSrc = coins;
      this.coinsListDest = coins;
    } else if (e.target.value === 'sync') {
      this.syncHistory();
    } else if (
      e.target.value === 'tos' ||
      e.target.value === 'supported-coins'
    ) {
      this.setState({
        prevActiveState: this.state.activeSection,
        [e.target.name]: e.target.value,
      });
    } else if (e.target.value === 'update') {
      this.updateCache();

      this.setState({
        activeSection: 'history',
      });
    }
  }  

  clearOrder() {
    this.setState({
      activeSection: 'order',
      amount: 0,
      coinSrc: null,
      coinDest: null,
      step: 0,
      maxBuyError: null,
      processing: false,
      orderPlaceError: null,
      buyFixedDestCoin: false,
      currentBalanceDest: 'none',
      currentBalanceSrc: 'none',
    });

    this.coinsListSrc = Object.keys(this.filterOutETH(this.props.coins));
    this.coinsListDest = this.coinsListSrc;
  }

  changeActiveSection(sectionName) {
    if (sectionName === 'order') {
      this.clearOrder();
    } else {
      this.setState({
        activeSection: sectionName,
      });
    }
  }

  addcoinCB(coin) {
    const propsCoins = Object.keys(this.filterOutETH(this.props.coins));
    const fetchData = (_coin, pricesCoins) => {
      let direction = this.state.addcoinDirection;
      
      if (_coin.match(/\|/g).length === 2) {
        const _coinSplit = _coin.split('|');
        _coin = `${_coinSplit[0]}|${_coinSplit[1]}`;
        direction = _coinSplit[2];
      }

      this.props.getBalance(_coin)
      .then((res) => {
        if (res &&
            res.hasOwnProperty('balance') &&
            JSON.stringify(res).indexOf('error') === -1) {
          devlog(`${_coin} balance`, res);

          if (direction === 'src') {
            this.setState({
              currentBalanceSrc: Number(res.balance),
            });
          } else {
            this.setState({
              currentBalanceDest: Number(res.balance),
            });
          }
        } else {
          devlog(`error getting ${_coin} balance`);
        }
      });

      if (pricesCoins) {
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
    }
    
    if (this.state.addcoinDirection === 'dest') {
      let _newState = {
        coinDest: coin,
        addcoinActive: false,
      };

      if (propsCoins.length === 2) {
        _newState.coinSrc = propsCoins[propsCoins.indexOf(coin) === 0 ? 1 : 0];
        fetchData(`${coin}|dest`);
        fetchData(`${_newState.coinSrc}|src`, [coin.split('|')[0], _newState.coinSrc.split('|')[0]]);
      } else if (this.state.coinSrc) {
        fetchData(coin, [coin.split('|')[0], this.state.coinSrc.split('|')[0]]);
      }
      this.setState(_newState);
    } else {
      let _newState = {
        coinSrc: coin,
        addcoinActive: false,
      };
      
      if (propsCoins.length === 2) {
        _newState.coinDest = propsCoins[propsCoins.indexOf(coin) === 0 ? 1 : 0];
        fetchData(`${_newState.coinDest}|dest`);
        fetchData(`${coin}|src`, [coin.split('|')[0], _newState.coinDest.split('|')[0]]);
      } else if (this.state.coinDest) {
        fetchData(coin, [coin.split('|')[0], this.state.coinDest.split('|')[0]]);
      } else {
        fetchData(coin, coin.split('|')[0]);
      }
      
      this.setState(_newState);
    }
  }

  activateAddcoin(direction) {
    const len = Object.keys(this.filterOutETH(this.props.coins)).length;

    if ((direction === 'src' && (len > 2 || (len === 2 && !this.state.coinSrc))) ||
        (direction === 'dest' && (len > 2 || (len === 2 && !this.state.coinDest)))) {
      this.setState({
        addcoinDirection: direction,
        addcoinActive: true,
      });
    }
  }

  findDeposits(orderId) {
    const _cache = this.exchangesCache ? this.exchangesCache.coinswitch : this.state && this.state.exchangesCache && this.state.exchangesCache.coinswitch;
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
    if ((this.state.activeSection === 'order-details' || this.state.activeSection === 'order') &&
        this.state.activeOrderDetails) {
      this.setState({
        activeOrderDetails: null,
        activeSection: 'history',
      });
    } else if (
      this.state.addcoinActive &&
      this.state.activeSection === 'order' &&
      this.state.step === 0
    ) {
      this.setState({
        addcoinActive: false,
      });
    } else if (
      this.state.activeSection === 'order' &&
      this.state.step === 1
    ) {
      this.prevStep();
    } else if (
      this.state.activeSection === 'order' &&
      this.state.step === 3
    ) {
      if (this.state.activeOrderDetails) {
        this.setState({
          activeSection: 'history',
        });
        this.updateCache();
      } else {
        this.setState({
          activeSection: 'history',
        });
        this.updateCache();
      }
    } else if (
      this.state.activeSection === 'order' &&
      this.state.step === 0
    ) {
      if (Object.keys(this.exchangesCache.coinswitch.orders).length) {
        this.setState({
          activeSection: 'history',
        });
      } else {
        this.props.historyBack();
      }
    } else if (
      this.state.activeSection === 'tos' ||
      this.state.activeSection === 'supported-coins'
    ) {
      this.setState({
        activeSection: this.state.prevActiveState,
      });
    } else {
      if (this.props.history === 'exchanges') {
        this.props.changeActiveSection('dashboard');
      } else {
        this.props.historyBack();
      }
    }
  }

  componentWillMount() {
    const _cache = getLocalStorageVar('exchanges');

    if (_cache) {
      this.exchangesCache = _cache;
      this.setState({
        activeSection: 'history',
        exchangesCache: _cache,
      });
      this.updateCache();
    } else {
      this.setState({
        activeSection: 'order',
      });
    }
    
    const fetchCoinswitchCoins = () => {
      devlog('update coinswitch coins list');

      this.props.getCoinswitchCoins()
      .then((coins) => {
        if (coins &&
            coins.length) {
          let coinswitchCoinsFlat = [];

          if (coins &&
              typeof coins === 'object' &&
              coins[0].symbol) {
  
            for (let i = 0; i < coins.length; i++) {
              if (coins[i].isActive) {
                coinswitchCoinsFlat.push(coins[i].symbol.toLowerCase());
              }
            }
            
            this.setState({
              coinswitchCoinsObj: coins,
              coinswitchCoins: coinswitchCoinsFlat,
            });
          }
        }
      });
    };

    fetchCoinswitchCoins();
    
    this.exchangesCacheInterval = Meteor.setInterval(() => {
      this.updateCache();
    }, EXCHANGES_CACHE_UPDATE_INTERVAL * 1000);

    this.coinswitchCoinsInterval = Meteor.setInterval(() => {
      fetchCoinswitchCoins();
    }, EXCHANGES_COINSWITCH_COINS_UPDATE_INTERVAL * 1000);
  }

  componentWillUnmount() {
    clearInterval(this.exchangesCacheInterval);
    clearInterval(this.coinswitchCoinsInterval);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      maxBuyError: null,
    });
  }

  renderOrderForm() {
    const coins = Object.keys(this.filterOutETH(this.props.coins));
    const settingsCurrency = getLocalStorageVar('settings').fiat;

    return (
      <div className="exchanges-new-order">
        <AddCoin
          coins={ coins }
          filterOut={ [this.state.coinDest, this.state.coinSrc] }
          activate={ this.state.addcoinActive }
          cb={ this.addcoinCB } />
        { this.state.step !== 3 &&
          !this.state.addcoinActive &&
          <div className="steps margin-top-45 padding-bottom-35">
            <div className={ 'step' + (this.state.step === 0 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.step === 1 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.step === 2 ? ' current' : '') }></div>
          </div>
        }

        { this.state.step === 0 &&
          !this.state.addcoinActive &&
          <div className="send-step">
            <div className="margin-bottom-40">
              <div className="step-title">{ translate('EXCHANGES.FILL_IN_ORDER_DETAILS') }</div>
            </div>
          </div>
        }

        { this.state.step === 1 &&
          <div className="send-step">
            <div className="margin-bottom-40">
              <div className="step-title">{ translate('EXCHANGES.CONFIRM_ORDER_DETAILS') }</div>
            </div>
          </div>
        }

        { this.state.step === 2 &&
          <div className="send-step">
            <div className="margin-bottom-40">
              <div className="step-title">{ translate('EXCHANGES.REVIEW_ORDER_DETAILS') }</div>
            </div>
          </div>
        }

        { this.state.step === 0 &&
          !this.state.addcoinActive &&
          <section>
            {/*<div
              className="padding-bottom-20"
              onClick={ this.loadTestData }>Test data</div>*/}

            <div className="margin-bottom-25">
              <div
                onClick={ () => this.activateAddcoin('src') }
                className={ 'edit coin' + (!this.state.coinSrc ? ' empty' : '') }>
                <span className="label">{ translate('EXCHANGES.PAY') }</span>
                { this.state.coinSrc &&
                  <span>
                    <img src={ `${assetsPath.coinLogo}/${this.state.coinSrc.split('|')[1].toLowerCase()}/${this.state.coinSrc.split('|')[0].toLowerCase()}.png` } /> <span className="label">{ translate((this.state.coinSrc.indexOf('|spv') > -1 ? 'SPV.' : 'ETH.') + this.state.coinSrc.split('|')[0].toUpperCase()) }</span>
                  </span>
                }
                { !this.state.coinSrc &&
                  <span className="label empty">{ translate('EXCHANGES.TAP_TO_SELECT_COIN') }</span>
                }
                { (coins.length > 2 || (coins.length === 2 && !this.state.coinSrc)) &&
                  <i className="fa fa-caret-down"></i>
                }
              </div>
            </div>
            <div className="margin-bottom-25">
              <div
                onClick={ () => this.activateAddcoin('dest') }
                className={ 'edit coin' + (!this.state.coinDest ? ' empty' : '') }>
                <span className="label">{ translate('EXCHANGES.BUY') }</span>
                { this.state.coinDest &&
                  <span>
                    <img src={ `${assetsPath.coinLogo}/${this.state.coinDest.split('|')[1].toLowerCase()}/${this.state.coinDest.split('|')[0].toLowerCase()}.png` } /> <span className="label">{ translate((this.state.coinDest.indexOf('|spv') > -1 ? 'SPV.' : 'ETH.') + this.state.coinDest.split('|')[0].toUpperCase()) }</span>
                  </span>
                }
                { !this.state.coinDest &&
                  <span className="label empty">{ translate('EXCHANGES.TAP_TO_SELECT_COIN') }</span>
                }
                { (coins.length > 2 || (coins.length === 2 && !this.state.coinDest)) &&
                  <i className="fa fa-caret-down"></i>
                }
              </div>
            </div>
            <div className="margin-bottom-25 toggle-buy-coin">
              <div className={ 'edit' + (!this.state.coinDest || !this.state.coinSrc ? ' disabled' : '') }>
                <label className="switch">
                  <input
                    type="checkbox"
                    value="on"
                    checked={ this.state.buyFixedDestCoin }
                    readOnly />
                  <div
                    className="slider"
                    onClick={ this.toggleBuyFixedDestCoin }></div>
                </label>
                <div
                  className="toggle-label"
                  onClick={ this.toggleBuyFixedDestCoin }>
                  { translate('EXCHANGES.SWITCH_AMOUNT_CURRENCY') }
                </div>
              </div>
            </div>
            { this.state.buyFixedDestCoin &&
              <div className="margin-bottom-25 toggle-buy-coin">
                <div
                  className="edit fs14"
                  onClick={ this.setMaxBuyAmount }>
                  <label>
                    { translate('EXCHANGES.CURRENT_BALANCE', this.state.coinSrc.split('|')[0].toUpperCase()) }: <span className="success">{ this.state.currentBalanceSrc }</span>
                  </label>
                </div>
              </div>
            }
            <div className="margin-bottom-25">
              <div className="edit">
                <input
                  type="text"
                  className="form-control"
                  name="amount"
                  onChange={ this.updateInput }
                  placeholder={ translate('EXCHANGES.ENTER_AN_AMOUNT') + (this.state.coinDest && this.state.coinSrc ? ` ${translate('EXCHANGES.IN_SM')} ${this.state.buyFixedDestCoin ? this.state.coinSrc.split('|')[0].toUpperCase() : this.state.coinDest.split('|')[0].toUpperCase()}` : '') }
                  value={ this.state.amount || '' } />
              </div>
            </div>
            { (this.state.maxBuyError && this.state.maxBuyError !== 'noBalance') &&
              <div
                onClick={ this.setMaxBuyAmount }
                className="error margin-top-15 sz350 text-center">
                <i className="fa fa-warning"></i> { translate('EXCHANGES.' + (!this.state.buyFixedDestCoin ? 'INSUFFICIENT_FUNDS_SRC' : 'INSUFFICIENT_FUNDS_DESC'), `${this.state.maxBuyError} ${this.state.buyFixedDestCoin ? this.state.coinSrc.split('|')[0].toUpperCase() : this.state.coinDest.split('|')[0].toUpperCase()}`) }.
              </div>
            }
            { (this.state.maxBuyError && this.state.maxBuyError === 'noBalance') &&
              <div className="error margin-top-15 sz350 text-center">
                <i className="fa fa-warning"></i> { translate('EXCHANGES.INSUFFICIENT_FUNDS', `${this.state.coinSrc.split('|')[0].toUpperCase()}`) }.
              </div>
            }
            { this.state.orderPlaceError &&
              <div className="error margin-top-15 sz350 text-center">
                <i className="fa fa-warning"></i> { translate('EXCHANGES.ERROR') }: { this.state.orderPlaceError }.
              </div>
            }
            <div className="widget-body-footer step-1-footer">
              <div className="group3 margin-top-40">
                <div
                  onClick={ this.clearOrder }
                  className="btn-inner pull-left btn-back margin-left-15"
                  disabled={ this.state.processing }>
                  <div className="btn">{ translate('EXCHANGES.CLEAR') }</div>
                </div>
                <div
                  className="btn-inner pull-right margin-right-15"
                  onClick={ this.nextStep }
                  disabled={
                    !this.state.coinSrc ||
                    !this.state.coinDest ||
                    !this.state.amount ||
                    this.state.processing ||
                    (this.state.buyFixedDestCoin && this.state.currentBalanceSrc === 'none') ||
                    (!this.state.buyFixedDestCoin && this.state.currentBalanceDest === 'none')
                  }>
                  <div className="btn">
                    { this.state.processing ? `${translate('EXCHANGES.PLEASE_WAIT')}...` : translate('EXCHANGES.NEXT') }
                  </div>
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
        { this.state.step === 1 &&
          <section className="exchanges-order-confirm-step">
            <div className="edit">
              { translate('EXCHANGES.YOU_PAY') }
              <div className="shade margin-top-5">
                <span className="one-size">
                  { Number(this.state.amount) } { this.state.coinSrc.split('|')[0].toUpperCase() }
                </span>
                <span className="padding-left-30">
                  <FiatSymbol symbol={ settingsCurrency } /> { Number(Number(this.state.amount * this.state.fiatPrices[this.state.coinSrc.split('|')[0].toUpperCase()][settingsCurrency.toUpperCase()]).toFixed(8)) }
                </span>
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.YOU_RECEIVE') }
              <div className="shade margin-top-5">
                <span className="one-size">
                  { Number(Number(this.state.amount * this.state.exchangeRate.rate).toFixed(8)) } { this.state.coinDest.split('|')[0].toUpperCase() }
                </span>
                <span className="padding-left-30">
                  <FiatSymbol symbol={ settingsCurrency } /> { Number(Number(this.state.amount * this.state.fiatPrices[this.state.coinSrc.split('|')[0].toUpperCase()][settingsCurrency.toUpperCase()]).toFixed(8)) }
                </span>
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.EXCHANGE_RATE') }
              <div className="shade margin-top-5">
                { Number(this.state.exchangeRate.rate) } { this.state.coinDest.split('|')[0].toUpperCase() } { translate('EXCHANGES.FOR_SM') } 1 { this.state.coinSrc.split('|')[0].toUpperCase() }
              </div>
            </div>
            { this.state.amount > this.state.exchangeRate.limitMaxDepositCoin &&
              <div className="edit error">
                { translate('EXCHANGES.ERROR') }
                <div className="shade margin-top-5">
                  { this.state.coinSrc.split('|')[0].toUpperCase() } { translate('EXCHANGES.AMOUNT_EXCEEDS_MAX_ALLOWED_VAL') } { this.state.exchangeRate.limitMaxDepositCoin }
                </div>
              </div>
            }
            { this.state.amount < this.state.exchangeRate.limitMinDepositCoin &&
              <div className="edit error">
                { translate('EXCHANGES.ERROR') }
                <div className="shade margin-top-5">
                  { this.state.coinSrc.split('|')[0].toUpperCase() } { translate('EXCHANGES.AMOUNT_IS_TOO_LOW') } { this.state.exchangeRate.limitMinDepositCoin }
                </div>
              </div>
            }
            { this.state.orderPlaceError &&
              <div className="error margin-top-15 sz350 text-center">
                <i className="fa fa-warning"></i> { translate('EXCHANGES.ERROR') }: { this.state.orderPlaceError }.
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
                  disabled={
                    this.state.processing ||
                    this.state.amount < this.state.exchangeRate.limitMinDepositCoin ||
                    this.state.amount > this.state.exchangeRate.limitMaxDepositCoin
                  }>
                  <div className="btn">
                    { this.state.processing ? `${translate('EXCHANGES.PLEASE_WAIT')}...` : translate('EXCHANGES.NEXT') }
                  </div>
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
              { translate('EXCHANGES.DATE') }
              <div className="shade margin-top-5">
                { secondsToString(this.state.exchangeOrder.createdAt / 1000) }
              </div>
            </div>
            { this.state.exchangeOrder.validTill &&
              <div className="edit">
                { translate('EXCHANGES.VALID_UNTIL') }
                <div className="shade margin-top-5">
                  { secondsToString(this.state.exchangeOrder.validTill / 1000) }
                </div>
              </div>
            }
            <div className="edit">
              { translate('EXCHANGES.YOU_PAY') }
              <div className="shade margin-top-5">
                <span className="one-size">
                  { Number(Number(this.state.exchangeOrder.expectedDepositCoinAmount).toFixed(8)) } { this.state.exchangeOrder.depositCoin.toUpperCase() }
                </span>
                <span className="padding-left-30">
                  <FiatSymbol symbol={ settingsCurrency } /> { Number(Number(this.state.amount * this.state.fiatPrices[this.state.coinSrc.split('|')[0].toUpperCase()][settingsCurrency.toUpperCase()]).toFixed(8)) }
                </span>
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.YOU_RECEIVE') }
              <div className="shade margin-top-5">
                <span className="one-size">
                  { Number(Number(this.state.exchangeOrder.expectedDestinationCoinAmount).toFixed(8)) } { this.state.exchangeOrder.destinationCoin.toUpperCase() }
                </span>
                <span className="padding-left-30">
                  <FiatSymbol symbol={ settingsCurrency } /> { Number(Number(this.state.amount * this.state.fiatPrices[this.state.coinSrc.split('|')[0].toUpperCase()][settingsCurrency.toUpperCase()]).toFixed(8)) }
                </span>
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.EXCHANGE_RATE') }
              <div className="shade margin-top-5">
                { Number(Number((1 / this.state.exchangeOrder.expectedDepositCoinAmount) * this.state.exchangeOrder.expectedDestinationCoinAmount).toFixed(8)) } { this.state.exchangeOrder.destinationCoin.toUpperCase() } { translate('EXCHANGES.FOR_SM') } 1 { this.state.exchangeOrder.depositCoin.toUpperCase() }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DEPOSIT_ADDRESS') }
              <div className="shade margin-top-5">
                { this.state.exchangeOrder.exchangeAddress.address }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DEST_ADDRESS') }
              <div className="shade margin-top-5">
                { this.state.exchangeOrder.destinationAddress.address }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.ORDER_ID') }
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
                  <div className="btn">
                    { this.state.processing ? `${translate('EXCHANGES.PLEASE_WAIT')}...` : translate('EXCHANGES.PROCEED_TO_DEPOSIT') }
                  </div>
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
        { this.state.step === 3 &&
          <div className="exchanges-send-coin">
            <SendCoin
              cb={ this.sendCoinCB }
              coin={ this.props.coin }
              address={ this.props.address }
              balance={ this.props.balance || 'loading' }
              btcFees={ this.props.btcFees }
              ethFees={ this.props.ethFees }
              sendtx={ this.props.sendtx }
              getEthGasPrice={ this.props.getEthGasPrice }
              sendtxEth={ this.props.sendtxEth }
              getBtcFees={ this.props.getBtcFees }
              init={ this.state.sendCoinInit }
              lock={ this.props.lock } />
          </div>
        }
      </div>
    );
  }

  render() {
    return (
      <div className="form exchanges">
        <img
          className="menu-back"
          src={ `${assetsPath.menu}/trends-combined-shape.png` }
          onClick={ this.menuBack } />
        <select
          name="activeSection"
          onChange={ this.updateExchangesMenu }
          value={ this.state.activeSection }
          className="exchanges-menu">
          <option
            disabled={ this.state.activeSection === 'order' }
            value="order">
            { translate('EXCHANGES.NEW_ORDER') }
          </option>
          { this.state.activeSection !== 'order-details' &&
            <option
              disabled={ this.state.activeSection === 'history' }
              value="history">
              { translate('EXCHANGES.ORDER_HISTORY') }
            </option>
          }
          { this.state.activeSection === 'order-details' &&
            <option
              disabled={ this.state.activeSection === 'order-details' }
              value="order-details">
              { translate('EXCHANGES.ORDER_HISTORY') }
            </option>
          }
          { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
            <option value="sync">
              { translate('EXCHANGES.SYNC_HISTORY') }
            </option>
          }
          { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
            Object.keys(this.exchangesCache.coinswitch.orders).length > 0 &&
            <option value="update">
              { translate('EXCHANGES.REFRESH_HISTORY') }
            </option>
          }
          <option
            disabled={ this.state.activeSection === 'tos' }
            value="tos">
            { translate('EXCHANGES.TOS') }
          </option>
          { this.state.coinswitchCoins &&
            <option
              disabled={ this.state.activeSection === 'supported-coins' }
              value="supported-coins">
              { translate('EXCHANGES.SUPPORTED_COINS') }
            </option>
          }
        </select>

        { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
          <div className="exchanges-order-history margin-top-45">
            { !this.state.activeOrderDetails &&
              !this.state.syncHistoryProgressing &&
              <ExchangesHistory
                provider={ this.state.provider }
                orders={
                  this.exchangesCache.coinswitch &&
                  this.exchangesCache.coinswitch.orders
                }
                deposits={
                  this.exchangesCache.coinswitch &&
                  this.exchangesCache.coinswitch.orders.deposits
                }
                openOrderDetails={ this.openOrderDetails }
                findDeposits={ this.findDeposits } />
            }
            { this.state.activeOrderDetails &&
              !this.state.syncHistoryProgressing &&
              <ExchangesOrderDetails
                { ...this.state }
                order={
                  this.exchangesCache.coinswitch &&
                  this.exchangesCache.coinswitch.orders[this.state.activeOrderDetails]
                }
                deposit={
                  this.exchangesCache.coinswitch &&
                  this.exchangesCache.coinswitch.orders.deposits
                }
                findDeposits={ this.findDeposits }
                openOrderOnline={ this.openOrderOnline }
                makeDeposit={ this.makeDeposit } />
            }
            { this.state.syncHistoryProgressing &&
              <div className="text-center">
                { translate('EXCHANGES.SYNCING_HISTORY') }...
              </div>
            }
          </div>
        }

        { this.state.activeSection === 'order' &&
          Object.keys(this.filterOutETH(this.props.coins)).length > 1 &&
          this.renderOrderForm() }
        { this.state.activeSection === 'order' &&
          Object.keys(this.filterOutETH(this.props.coins)).length < 2 &&
          <div className="form exchanges text-center margin-top-45 padding-top-55">
            { translate('EXCHANGES.PLEASE_ADD_ONE_MORE_COIN') }
          </div>
        }
        { this.state.activeSection === 'tos' &&
          <ExchangesTOS /> }
        { this.state.activeSection === 'supported-coins' &&
          <ExchangesSupportedCoins coins={ this.state.coinswitchCoinsObj } /> }
      </div>
    );
  }
}

export default Exchanges;