var websocketClient = require('ws');
const EventEmitter = require('events');
const axios = require('axios')


var baseUrl = '.trading212.com';
var availableEquitiesUrl = '/rest/instruments/EQUITY/900781274'
var orderUrl = '/rest/public/v2/equity/order';
var priceUrl = '/charting/prices?withFakes=false'
var hotListUrl = 'https://live.trading212.com/rest/positions-tracker/deltas/';

/*
Old
var statsUrl = '/rest/v1/customer/accounts/stats'
var fundsUrl = '/rest/customer/accounts/funds';
var openPositionsUrl = '/rest/v2/trading/open-positions';
var initInfoUrl = '/rest/v3/init-info';
var instrumentsUrl = '/rest/v1/instruments/';
*/

var transport = null;

var ws = null;

const wssUrl = 'wss://live.trading212.com/streaming/events/?app=WC4&appVersion=5.119.2&EIO=3&transport=websocket';

class Trading212 extends EventEmitter {
    constructor(ENV, CUSTOMER_SESSION, TRADING212_SESSION_LIVE) {
        super();

        baseUrl = "https://" + ENV + baseUrl;

        var headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Sec-GPC": 1,
            "Referer": "https://live.trading212.com/",
            "Content-Type": "application/json",
            Cookie: `CUSTOMER_SESSION=${CUSTOMER_SESSION}; TRADING212_SESSION_LIVE=${TRADING212_SESSION_LIVE}`
        }

        transport = axios.create({
            withCredentials: true,
            headers: headers
        });

        var opts = { headers: headers };
        ws = new websocketClient(wssUrl, opts);

        ws.on('open', () => {
            this.emit('connection-established')
        });

        ws.on('close', () => {
            console.log("ws closed");
            this.emit('trading212-ws-closed');
        })

        ws.on('sid', (data) => {
            //sid received
        });

        ws.on('message', (data) => {
            if(data == 3) {
                ws.send(2);
            }

            if(data.substring(0, '42["platform-message-sync"'.length) == '42["platform-message-sync"') {
                this.subscribeRoute('WEBPLATFORM');
                this.subscribeRoute('ACCOUNT');
                ws.send('42["acc"]');
                this.emit('platform-subscribed');
            } else if(data.substring(0, '42["q"'.length) == '42["q"') {
                data = data.substring('42["q"'.length);
                data = data.substring(2, data.length - 1);
                data = data.split("|");
                data = {
                    ticker: data[0],
                    bid: data[1],
                    ask: data[2],
                }
                this.emit('price', data);
            } else if(data.substring(0, '42["q-sync"'.length) == '42["q-sync"') {
                data = data.substring('42["q-sync"'.length);
                data = data.substring(2, data.length - 1);
                data = data.split("|");
                data = {
                    ticker: data[0],
                    bid: data[1],
                    ask: data[2],
                }
                this.emit('price', data);
            } else if(data.substring(0, '42["working-schedule-sync"'.length) == '42["working-schedule-sync"') {
               
            } else if(data.substring(0, 9) == '42["acc",') {
                data = data.substring(9);
                data = data.substring(0, data.length - 1);
                data = JSON.parse(data);
                this.emit('account', data);
            } else if(data.substring(0, 12) == '42["acc-re",') {
                data = data.substring(12);
                data = data.substring(0, data.length - 1);
                data = JSON.parse(data);
                this.emit('reaccount', data);
            } else {
                //console.log(data);
            }
        });

    }

    subscribeRoute(route) {
        ws.send('42["subscribe","/'+route+'"]');
    }

    bulkSubscribe(ticker_symbols) {
        ticker_symbols = ticker_symbols.map(el => {
            return '"'+el+'"';
        });
        ws.send('42["s-qbulk",['+ticker_symbols+']]');
    }

    bulkUnsubscribe(ticker_symbols) {
        ticker_symbols = ticker_symbols.map(el => {
            return '"'+el+'"';
        });
        ws.send('42["us-qbulk",['+ticker_symbols+']]');
    }

    getCurrentPrice(instruments) {
        transport
        .post(baseUrl + priceUrl, instruments).then(res => {
            res.data.ticker = res.data.instrumentCode;
            this.emit('price', res.data);
        }).catch(err => {
            console.log(err);
        })
    }

    getAvailableEquities() {
        transport
        .get(baseUrl + availableEquitiesUrl)
        .then(res => { this.emit('equity-data', res.data.items); } )
        .catch(err => { console.log(err) })
    }

    getHotlist(period, delta) {
        transport
        .get(hotListUrl + period + "/" + delta)
        .then(res => { this.emit('hotlist', period, delta, res.data); } )
        .catch(err => { console.log(err) })
    }
    
    getExchangeRate() {
        axios.get('https://query2.finance.yahoo.com/v10/finance/quoteSummary/GBPUSD=X?modules=assetProfile%2CsummaryProfile%2CsummaryDetail%2CesgScores%2Cprice%2CincomeStatementHistory%2CincomeStatementHistoryQuarterly%2CbalanceSheetHistory%2CbalanceSheetHistoryQuarterly%2CcashflowStatementHistory%2CcashflowStatementHistoryQuarterly%2CdefaultKeyStatistics%2CfinancialData%2CcalendarEvents%2CsecFilings%2CrecommendationTrend%2CupgradeDowngradeHistory%2CinstitutionOwnership%2CfundOwnership%2CmajorDirectHolders%2CmajorHoldersBreakdown%2CinsiderTransactions%2CinsiderHolders%2CnetSharePurchaseActivity%2Cearnings%2CearningsHistory%2CearningsTrend%2CindustryTrend%2CindexTrend%2CsectorTrend')
        .then(res => {
            this.emit('forex', res.data);
        }).catch(err => {
            console.log(err);
        });
        //
    }

    placeOrder(instrumentCode, orderType, stopPrice, limitPrice, quantity, timeValidity) {
        transport
        .post(baseUrl + orderUrl, {
            instrumentCode: instrumentCode,
            orderType: orderType,
            stopPrice: stopPrice,
            limitPrice: limitPrice,
            quantity: quantity,
            timeValidity: timeValidity,

        }).then(res => {
            if(res.hasOwnProperty("data") && res.data.hasOwnProperty("account")) {
                this.emit('account', res.data.account);
            } else {
                this.emit('order-failure', res.data);
            }
        }).catch(err => {
            console.log(err);
        })
    }

    modifyOrder(orderId, orderType, stopPrice, limitPrice, quantity, timeValidity) {
        transport
        .put(baseUrl + orderUrl + "/" + orderId, {
            orderType: orderType,
            stopPrice: stopPrice,
            limitPrice: limitPrice,
            quantity: quantity,
            timeValidity: timeValidity,

        }).then(res => {
            if(res.hasOwnProperty("data") && res.data.hasOwnProperty("account")) {
                this.emit('account', res.data.account);
            } else {
                this.emit('order-failure', res.data);
            }
        }).catch(err => {
            console.log(err);
        })
    }

    deleteOrder(orderId) {
        console.log('trying to delete order');
        transport
        .delete(baseUrl + orderUrl + '/' + orderId).then(res => {
            if(res.hasOwnProperty("data") && res.data.hasOwnProperty("account")) {
                this.emit('account', res.data);
            } else {
                this.emit('order-failure', res.data);
            }
        }).catch(err => {
            console.log(err);
        })
    }
}


module.exports = Trading212;