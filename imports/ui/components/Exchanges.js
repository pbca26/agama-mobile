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
import SendCoin from './SendCoin';
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
import supportedCoinsList from '../actions/coins';

const EXCHANGES_CACHE_UPDATE_INTERVAL = 60; // sec
const EXCHANGES_COINSWITCH_COINS_UPDATE_INTERVAL = 120; // sec
const MAX_ORDERS = 30;

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
      maxBuyError: false,
      //},
      coinswitchCoins: {},
      addcoinActive: false,
      addcoinDirection: 'buy',
      activeOrderDetails: null,
      activeOrderTxView: false,
      activeOrderDetailsDepositTx: null,
      prevActiveState: null,
      cacheUpdated: false,
      sendCoinInit: {
        pub: null,
        amount: 0,
      },
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
    this.setMaxBuyAmount = this.setMaxBuyAmount.bind(this);
    this.makeDeposit = this.makeDeposit.bind(this);
    this.sendCoinCB = this.sendCoinCB.bind(this);
    // test
    this.loadTestData = this.loadTestData.bind(this);
  }

  sendCoinCB(sendResult, coin) {
    if (sendResult &&
        sendResult.msg === 'success' &&
        sendResult.result &&
        sendResult.result.txid) {
      this.exchangesCache.coinswitch.deposits[`${coin.toLowerCase()}-${sendResult.result.txid}`] = sendResult.result.txid;
      this.updateCacheStorage();
      this.setState({
        cacheUpdated: !this.state.cacheUpdated,
      });
      this.updateCache();
    }
  }

  makeDeposit() {
    const _cache = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders;
    const _coin = _cache[this.state.activeOrderDetails].depositCoin.toLowerCase();

    if (this.props.coins[`${_coin}|spv`]) {
      this.props.switchCoin(`${_coin}|spv`, true);
      
      setTimeout(() => {
        this.setState({
          activeSection: 'order',
          step: 3,
          sendCoinInit: {
            pub: _cache[this.state.activeOrderDetails].exchangeAddress.address,
            amount: _cache[this.state.activeOrderDetails].expectedDepositCoinAmount,
          },
        });
      }, 100);
    } else {
      this.props.addCoin(`${_coin}|spv`, true);

      setTimeout(() => {
        this.props.switchCoin(`${_coin}|spv`, true);

        setTimeout(() => {
          this.setState({
            activeSection: 'order',
            step: 3,
            sendCoinInit: {
              pub: _cache[this.state.activeOrderDetails].exchangeAddress.address,
              amount: _cache[this.state.activeOrderDetails].expectedDepositCoinAmount,
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
    this.setState({
      amount: this.state.maxBuyError,
    });
  }

  openOrderOnline() {
    window.open(`https://coinswitch.co/app/exchange/transaction/${this.state.activeOrderDetails}`, '_system');
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
    const _cache = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders;

    this.setState({
      activeOrderDetails: orderId,
      activeSection: 'order-details',
      activeOrderTxView: false,
      activeOrderDetailsDepositTx: null,
    });

    if (_cache[orderId].inputTransactionHash) {
      this.props.getTransaction(
        `${_cache[orderId].depositCoin.toLowerCase()}|spv`,
        { 
          txid: _cache[orderId].inputTransactionHash,
          pub: _cache[orderId].exchangeAddress.address,
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
        devlog('rate', exchangeRate);

        if (this.state.provider === 'coinswitch') {
          if (exchangeRate.data) {
            let valid = true;
            let amount;

            if (!this.state.buyFixedDestCoin) {
              amount = Number(this.state.amount / exchangeRate.data.rate).toFixed(8);

              if (Number(amount) > Number(this.state.currentBalance)) {
                const _maxBuy = Number(Number((this.state.currentBalance - fromSats(fees[srcCoinSym])) * exchangeRate.data.rate).toFixed(8));

                valid = false;
                this.setState({
                  processing: false,
                  maxBuyError: _maxBuy,
                });
              }
            }

            if (valid) {
              this.setState({
                processing: false,
                step: 1,
                exchangeRate: exchangeRate.data,
                amount,
                maxBuyError: false,
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
        console.warn('order place', order);

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
          });
        } else {
          devlog('order place error');

          this.setState({
            processing: false,
          });
        }
      });
    } else if (this.state.step === 2) {
      const _cache = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders;
      this.props.switchCoin(this.state.coinSrc, true);

      setTimeout(() => {
        this.setState({
          step: 3,
          sendCoinInit: {
            pub:  _cache[this.state.activeOrderDetails].exchangeAddress.address,
            amount: _cache[this.state.activeOrderDetails].expectedDepositCoinAmount,
          },
        });
      }, 100);
    }
  }

  updateExchangesMenu(e) {
    if (e.target.value !== 'tos') {
      this.setState({
        [e.target.name]: e.target.value,
      });
    }

    if (e.target.value === 'clear') {
      this.clearOrder();
    } else if (e.target.value === 'order') {
      this.coinsListSrc = Object.keys(this.props.coins);
      this.coinsListDest = Object.keys(this.props.coins);
    } else if (e.target.value === 'sync') {
      this.syncHistory();
    } else if (e.target.value === 'tos' || e.target.value === 'supported-coins') {
      this.setState({
        prevActiveState: this.state.activeSection,
        [e.target.name]: e.target.value,
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
    });

    this.coinsListSrc = Object.keys(this.props.coins);
    this.coinsListDest = Object.keys(this.props.coins);
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
    const fetchData = (_coin, pricesCoins) => {
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
    if ((this.state.activeSection === 'order-details' || this.state.activeSection === 'order') &&
        this.state.activeOrderDetails) {
      this.setState({
        activeOrderDetails: null,
        activeSection: 'history',
      });
    } else if (this.state.addcoinActive && this.state.activeSection === 'order' && this.state.step === 0) {
      this.setState({
        addcoinActive: false,
      });
    } else if (this.state.activeSection === 'order' && this.state.step === 1) {
      this.prevStep();
    } else if (this.state.activeSection === 'order' && this.state.step !== 1) {
      if (Object.keys(this.exchangesCache.coinswitch.orders).length) {
        if (this.state.step === 3 &&
            this.state.activeOrderDetails) {
          this.setState({
            activeSection: 'history',
          });
        } else if (this.state.step === 3 && !this.state.activeOrderDetails) {
          this.setState({
            activeSection: 'history',
          });
          this.updateCache();
        }
      } else {
        this.props.historyBack();
      }
    } else if (this.state.activeSection === 'tos' || this.state.activeSection === 'supported-coins') {
      this.setState({
        activeSection: this.state.prevActiveState,
      });
    } else {
      this.props.historyBack();
    }
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
  
    for (let i = 0; i < _cacheFlat.length && i < MAX_ORDERS; i++) {
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
    const _deposits = this.exchangesCache.coinswitch && this.exchangesCache.coinswitch.orders.deposits;
    
    return (
      <section className="exchanges-order-details">
        { (this.findDeposits(_cache[this.state.activeOrderDetails].orderId).length > 0 || (this.state.provider === 'coinswitch' && _cache[this.state.activeOrderDetails].inputTransactionHash) || (this.state.provider === 'coinswitch' && _cache[this.state.activeOrderDetails].inputTransactionHash && _deposits && _deposits[`${_cache[this.state.activeOrderDetails].depositCoin.toLowerCase()}-${_cache[this.state.activeOrderDetails].inputTransactionHash}`])) &&
          <div className="tabs">
            <div
              onClick={ () => this.orderDetailsTab(false) }
              className={ 'tab' + (this.state.activeOrderTxView ? ' active' : '') }>Order info</div>
            <div
              onClick={ () => this.orderDetailsTab(true) }
              className={ 'tab' + (!this.state.activeOrderTxView ? ' active' : '') }>Deposit info</div>
          </div>
        }
        { !this.state.activeOrderTxView &&
          <div>
            { this.findDeposits(_cache[this.state.activeOrderDetails].orderId).length === 0 &&
              !_cache[this.state.activeOrderDetails].inputTransactionHash &&
              _cache[this.state.activeOrderDetails].status === 'no_deposit' &&
              <div className="group3 margin-bottom-30 make-deposit-btn">
                <div
                  onClick={ this.makeDeposit }
                  className="btn-inner">
                  <div className="btn">
                    Make a deposit
                  </div>
                  <div className="group2">
                    <i className="fa fa-money"></i>
                  </div>
                </div>
              </div>
            }
            <div className="edit">
              Date
              <div className="shade margin-top-5">
              { secondsToString(_cache[this.state.activeOrderDetails].createdAt / 1000) }
              </div>
            </div>
            { _cache[this.state.activeOrderDetails].validTill &&
              <div className="edit">
                Valid until
                <div className="shade margin-top-5">
                { secondsToString(_cache[this.state.activeOrderDetails].validTill / 1000) }
                </div>
              </div>
            }
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
              Deposit Transaction ID
              <div
                className="shade margin-top-5"
                onClick={ () => this.openExplorerUrl(_cache[this.state.activeOrderDetails].depositCoin.toLowerCase(), _cache[this.state.activeOrderDetails].inputTransactionHash || this.findDeposits(_cache[this.state.activeOrderDetails].orderId)[0]) }>
              { _cache[this.state.activeOrderDetails].inputTransactionHash || this.findDeposits(_cache[this.state.activeOrderDetails].orderId)[0] ? <span>{ _cache[this.state.activeOrderDetails].inputTransactionHash || this.findDeposits(_cache[this.state.activeOrderDetails].orderId)[0] } <i className="fa fa-external-link margin-left-10"></i></span> : 'N/A' }
              </div>
            </div>
            <div className="edit">
              Destination address
              <div className="shade margin-top-5">
              { _cache[this.state.activeOrderDetails].destinationAddress.address }
              </div>
            </div>
            <div className="edit">
              Destination Transaction ID
              <div
                className="shade margin-top-5"
                onClick={ () => this.openExplorerUrl(_cache[this.state.activeOrderDetails].destinationCoin.toLowerCase(), _cache[this.state.activeOrderDetails].outputTransactionHash) }>
              { _cache[this.state.activeOrderDetails].outputTransactionHash ? <span>{ _cache[this.state.activeOrderDetails].outputTransactionHash } <i className="fa fa-external-link margin-left-10"></i></span> : 'N/A' }
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
              <div
                className="shade margin-top-5"
                onClick={ this.openOrderOnline }>
              { _cache[this.state.activeOrderDetails].orderId }
              <i className="fa fa-external-link margin-left-10"></i>
              </div>
            </div>
          </div>
        }
        { this.state.activeOrderTxView &&
          <div>
            <div className="edit">
              Form
              <div className="shade margin-top-5">
              { this.state.activeOrderDetailsDepositTx.inputAddresses ? this.state.activeOrderDetailsDepositTx.inputAddresses[0] : 'N/A' }
              </div>
            </div>
            <div className="edit">
              To
              <div className="shade margin-top-5">
              { this.state.activeOrderDetailsDepositTx.address }
              </div>
            </div>
            <div className="edit">
              Amount
              <div className="shade margin-top-5">
              { (Number(this.state.activeOrderDetailsDepositTx.amount) === 0 ? 'unknown' : Number(this.state.activeOrderDetailsDepositTx.amount)) }
              </div>
            </div>
            { this.state.activeOrderDetailsDepositTx.amount !== this.state.activeOrderDetailsDepositTx.fee &&
              <div className="edit">
                Fee
                <div className="shade margin-top-5">
                { Number(this.state.activeOrderDetailsDepositTx.fee) }
                </div>
              </div>
            }
            <div className="edit">
              Confirmations
              <div className="shade margin-top-5">
              { this.state.activeOrderDetailsDepositTx.confirmations }
              </div>
            </div>
            <div className="edit">
              Height
              <div className="shade margin-top-5">
              { this.state.activeOrderDetailsDepositTx.height }
              </div>
            </div>
            <div className="edit">
              Timestamp
              <div className="shade margin-top-5">
              { secondsToString(this.state.activeOrderDetailsDepositTx.timestamp) }
              </div>
            </div>
            <div className="edit">
              Transaction ID
              <div
                className="shade margin-top-5"
                onClick={ () => this.openExplorerUrl(_cache[this.state.activeOrderDetails].depositCoin.toLowerCase(), this.state.activeOrderDetailsDepositTx.txid) }>
                { this.state.activeOrderDetailsDepositTx.txid } <i className="fa fa-external-link margin-left-10"></i>
              </div>
            </div>
          </div>
        }
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
          this.setState({
            coinswitchCoins: coins,
          });
        }
      });
    };
    fetchCoinswitchCoins();
    
    this.exchangesCacheInterval = setInterval(() => {
      this.updateCache();
    }, EXCHANGES_CACHE_UPDATE_INTERVAL * 1000);

    this.coinswitchCoinsInterval = setInterval(() => {
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
    });
  }

  renderOrderForm() {
    return (
      <div className="exchanges-new-order">
        <AddCoin
          coins={ Object.keys(this.props.coins) }
          filterOut={ [this.state.coinDest, this.state.coinSrc] }
          activate={ this.state.addcoinActive }
          cb={ this.addcoinCB } />
        { this.state.step !== 3 &&
          <div className="steps margin-top-45 padding-bottom-35">
            <div className={ 'step' + (this.state.step === 0 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.step === 1 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.step === 2 ? ' current' : '') }></div>
          </div>
        }

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
            { this.state.maxBuyError &&
              <div className="error margin-top-15 sz350">
                <i className="fa fa-warning"></i> Insufficient funds, you can buy up to { this.state.maxBuyError } { this.state.coinDest.split('|')[0].toUpperCase() } max.
              </div>
            }
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
            { this.state.exchangeOrder.validTill &&
              <div className="edit">
                Valid until
                <div className="shade margin-top-5">
                { secondsToString(this.state.exchangeOrder.validTill / 1000) }
                </div>
              </div>
            }
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
              init={ this.state.sendCoinInit } />
          </div>
        }
      </div>
    );
  }

  renderTOS() {
    return (
      <div className="exchanges-tos margin-top-45">
        <div className="exchanges-tos-inner">
          <div className="text-center padding-bottom-10">Terms of Service</div>
          <p>If you continue you agee to use a 3rd party service Coinswitch.co. All your actions with the use of Coinswitch.co API are outside of Komodo Platform control and are subject to Coinswitch.co <a onClick={ this.openCoinswitchTOS } className="pointer">terms of service</a>. Komodo Platform will not disclose any private information to Coinswitch.co. All details that you may provide to Coinswitch.co will be subject to Coinswitch.co <a onClick={ this.openCoinswitchTOS } className="pointer">terms for service</a>.</p>
          <p>KOMODO PLATFORM ACCEPTS NO RESPONSIBILITY AND WILL NOT BE LIABLE FOR ANY LOSS OR DAMAGE WHATSOEVER SUFFERED AS A RESULT OF ACCESSING, USE OF, OR RELIANCE UPON COINSWITCH.CO INFORMATION AND SERVICES.</p>
        </div>
      </div>
    );
  }

  renderSupportedCoins() {
    // TODO: sort
    const coins = this.state.coinswitchCoins;
    let items = [];

    if (coins &&
        typeof coins === 'object' &&
        coins.length &&
        coins[0].symbol) {
      for (let i = 0; i < coins.length; i++) {
        if (supportedCoinsList.spv.indexOf(coins[i].symbol.toUpperCase()) > -1) {
          items.push(
            <div
              key={ coins[i].symbol }
              className="exchanges-supported-coins-tile">
              <img
                src={ `/images/cryptologo/spv/${coins[i].symbol.toLowerCase()}.png` }
                width="30px"
                height="30px" />
              <span>{ coins[i].name }</span>
            </div>
          );
        }
      }
    }

    if (!items.length) {
      items.push(
        <div key="exchanges-supported-coins-loading text-center margin-top-15">Loading coins list...</div>
      );
    }

    return (
      <div className="exchanges-supported-coins margin-top-45">
        <div className="exchanges-supported-coins-inner">
          <div className="text-center padding-bottom-35">Supported coins to exchange</div>
          { items }
        </div>
      </div>
    );
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
            <option
              disabled={ this.state.activeSection === 'order' }
              value="order">New order</option>
            { this.state.activeSection === 'order' &&
              (this.state.step === 0 || this.state.step === 1) &&
              <option value="clear">Clear current order</option>
            }
            { this.state.activeSection !== 'order-details' &&
              <option
                disabled={ this.state.activeSection === 'history' }
                value="history">Order history</option>
            }
            { this.state.activeSection === 'order-details' &&
              <option
                disabled={ this.state.activeSection === 'order-details' }
                value="order-details">Order history</option>
            }
            { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
              <option value="sync">Sync history</option>
            }
            { (this.state.activeSection === 'history' || this.state.activeSection === 'order-details') &&
              Object.keys(this.exchangesCache.coinswitch.orders).length > 0 &&
              <option value="update">Refresh history</option>
            }
            <option
              disabled={ this.state.activeSection === 'tos' }
              value="tos">Terms of Service</option>
            { this.state.coinswitchCoins &&
              <option
                disabled={ this.state.activeSection === 'supported-coins' }
                value="supported-coins">Supported coins</option>
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

          { this.state.activeSection === 'order' && this.renderOrderForm() }
          { this.state.activeSection === 'tos' && this.renderTOS() }
          { this.state.activeSection === 'supported-coins' && this.renderSupportedCoins() }
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