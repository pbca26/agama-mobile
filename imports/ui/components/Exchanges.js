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
      addcoinDirection: null,
    };
    this.coinsList = null;
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.exchangesCacheInterval = null;
    this.updateInput = this.updateInput.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
    this.addcoinCB = this.addcoinCB.bind(this);
    this.activateAddcoin = this.activateAddcoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
  }

  changeActiveSection(sectionName) {
    this.setState({
      activeSection: sectionName,
    });
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
            className="exchanges-menu">
            <option value="order">New order</option>
            <option value="clear">Clear current order</option>
            <option value="history">Order history</option>
            <option value="sync">Sync history</option>
            <option value="update">Refresh history</option>
          </select>

          { this.state.changeActiveSection === 'order' &&
            <div className="exchanges-new-order">
              <AddCoin
                coins={ this.coinsList }
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