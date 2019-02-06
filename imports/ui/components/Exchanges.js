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
      //exchangeOrder: {"orderId":"5a3c3bc4-7005-45c6-a106-4580aeb52f53","exchangeAddress":{"address":"QjibDEZiKV33xiNR7prhMAU4VanXGvZUN5","tag":null},"destinationAddress":{"address":"GNA1Hwa4vf3Y9LHZoMAYmGEngN2rmMTCU3","tag":null},"createdAt":1544871347246,"status":"timeout","inputTransactionHash":null,"outputTransactionHash":null,"depositCoin":"qtum","destinationCoin":"game","depositCoinAmount":null,"destinationCoinAmount":0,"validTill":1544914547246,"userReferenceId":null,"expectedDepositCoinAmount":9.60589756391216,"expectedDestinationCoinAmount":237},
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
  }

  nextStep() {

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
    
    if (this.state.addcoinDirection === 'dest') {
      let _newState = {
        coinDest: coin,
        addcoinActive: false,
      };

      if (Object.keys(this.props.coins).length === 2) {
        const _coins = Object.keys(this.props.coins);
        _newState.coinSrc = _coins[_coins.indexOf(coin) === 0 ? 1 : 0];
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
      }
      this.setState(_newState);

      this.props.balance(coin)
      .then((res) => {
        if (res &&
            res.hasOwnProperty('balance') &&
            JSON.stringify(res).indexOf('error') === -1) {
          devlog(`${coin} balance`, res);
          setState({
            currentBalance: res.balance,
          });
        } else {
          devlog(`error getting ${coin} balance`);
        }
      });
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