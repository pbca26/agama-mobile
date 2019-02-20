import React from 'react';

class FiatSymbol extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  renderCurrency(symbol) {
    switch (symbol) {
      case 'thb':
        return (<span>&#3647;</span>);
      case 'aud':
        return (<span>A&#36; </span>);
      case 'brl':
        return (<span>R&#36; </span>);
      case 'gbp':
        return (<span>&#163;</span>);
      case 'bgn':
        return (<span>лв </span>);
      case 'cad':
        return (<span>C&#36; </span>);
      case 'hrk':
        return (<span>kn </span>);
      case 'czk':
        return (<span>Kč </span>);
      case 'cny':
        return (<span>&#165;</span>);
      case 'dkk':
        return (<span>Kr </span>);
      case 'eur':
        return (<span>&#8364;</span>);
      case 'hkd':
        return (<span>HK </span>);
      case 'huf':
        return (<span>Ft </span>);
      case 'inr':
        return (<span>&#8377;</span>);
      case 'idr':
        return (<span>Rp </span>);
      case 'ils':
        return (<span>&#8362;</span>);
      case 'jpy':
        return (<span>&#165;</span>);
      case 'krw':
        return (<span>&#8361;</span>);
      case 'myr':
        return (<span>RM </span>);
      case 'mxn':
        return (<span>Mex&#36; </span>);
      case 'nzd':
        return (<span>NZ&#36; </span>);
      case 'nok':
        return (<span>kr </span>);
      case 'php':
        return (<span>&#8369;</span>);
      case 'pln':
        return (<span>zł </span>);
      case 'ron':
        return (<span>lei </span>);
      case 'rub':
        return (<span>P </span>);
      case 'sgd':
        return (<span>S&#36; </span>);
      case 'zar':
        return (<span>R </span>);
      case 'sek':
        return (<span>kr </span>);
      case 'chf':
        return (<span>Fr </span>);
      case 'thb':
        return (<span>&#3647;</span>);
      case 'try':
        return (<span>&#8378;</span>);
      case 'usd':
        return (<span>&#36;</span>);
    }
  }

  render() {
    return (
      <span className="fiat-symbol">{ this.renderCurrency(this.props.symbol || 'usd') }</span>
    );
  }
}

export default FiatSymbol;