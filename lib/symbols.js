
const decode = (symbolText) => {
    // eg KMI_US_EQ = KMI = ticker, US = exchange, _EQ = ?
    // eg EMANl_EQ = EMAN = ticker, l = exchange, _EQ = ?
    const parts = symbolText.split('_');
    
    const symbol = {
        ticker: '',
        exchange: '',
        type: parts[parts.length-1]
    }

    if (parts.length === 2) {
        symbol.ticker = parts[0].substring(0, parts[0].length-1);
        symbol.exchange = parts[0].substring(parts[0].length-1);
    }
    else if (parts.length === 3) {
        symbol.ticker = parts[0];
        symbol.exchange = parts[1];
    }
    else throw new Error('symbolText not understood')

    return symbol;
}

const encode = (ticker, exchange, type = 'EQ') => {
    let symbol = ticker;
    if (exchange.length > 1) symbol += `_${exchange}`
    else symbol += `${exchange}`
    return symbol += `_${type}`;
}

module.exports = {
    decode,
    encode
};