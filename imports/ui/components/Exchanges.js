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
} from 'agama-wallet-lib/build/utils';
import { secondsToString } from 'agama-wallet-lib/src/time';

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
      activeSection: 'order',
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
      coinswitchOrders: {},
      deposits: {},
      addcoinActive: false,
      addcoinDirection: 'buy',
    };
    this.coinsListSrc = null;
    this.coinsListDest = null;
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.exchangesCacheInterval = null;
    this.updateInput = this.updateInput.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
    this.addcoinCB = this.addcoinCB.bind(this);
    this.activateAddcoin = this.activateAddcoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.updateExchangesMenu = this.updateExchangesMenu.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.loadTestData = this.loadTestData.bind(this);
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

  componentWillMount() {
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
          <select
            name="activeSection"
            onChange={ this.updateExchangesMenu }
            value={ this.state.activeSection }
            className="exchanges-menu">
            <option value="order">New order</option>
            { this.state.activeSection === 'order' &&
              <option value="clear">Clear current order</option>
            }
            <option value="history">Order history</option>
            { this.state.activeSection === 'history' &&
              <option value="sync">Sync history</option>
            }
            { this.state.activeSection === 'history' &&
              <option value="update">Refresh history</option>
            }
          </select>

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
                        className="btn-inner pull-left btn-back margin-left-15">
                        <div className="btn">{ translate('SEND.BACK') }</div>
                        <div className="group2">
                          <img
                            className="path6"
                            src={ `${assetsPath.menu}/trends-combined-shape.png` } />
                        </div>
                      </div>
                      <div
                        onClick={ this.nextStep }
                        className="btn-inner pull-right margin-right-15">
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