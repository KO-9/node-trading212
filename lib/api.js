var websocketClient = require('ws');
const EventEmitter = require('events');
const axios = require('axios');

const debug = process._NT && 'debug' in process._NT ? process._NT.debug : 1;

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

        baseUrl = 'https://' + ENV + baseUrl;

        const headers = {
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
            headers
        });

        ws = new websocketClient(wssUrl, { headers });

        ws.on('open', () => {
            this.emit('connection-established'); 
        });

        ws.on('close', () => {
            console.log('ws closed');
            this.emit('trading212-ws-closed');
        });

        ws.on('sid', (data) => {
            //sid received
        });

        ws.on('message', (data) => {
            if (data == 3) ws.send(2);
            
            let msgCode = '[none]', msgType = '[none]', msgObj;
            try {
                const objStart = data.indexOf('[') <= -1 || (data.indexOf('{') > -1 && data.indexOf('{') < data.indexOf('['))
                    ? data.indexOf('{') : data.indexOf('[');
                
                if (objStart < 0) {
                    console.log('message - no object - data :>> ', {chars20: data.substring(0,20)});
                }
                else {
                    msgCode = data.substring(0, objStart);
                    msgObj = JSON.parse( data.substring(objStart) );

                    if (Array.isArray(msgObj)) msgType = msgObj[0];
                    
                    // console.log('message :>> ', {msgCode, msgType, chars20: data.substring(0,30)});
                    // if (msgCode === '42' && msgType === 'acc') {
                    //     console.log('msg as obj :>> ', {objCode: msgCode, objType: msgType, 
                    //         msgObj1Keys: Object.keys(msgObj[1]),
                    //         msgObj1positions: msgObj[1].positions.length
                    //     });
                    // }
                }

                if (msgCode === '42') {
                    if (!Array.isArray(msgObj)) throw new Error('msgCode 42 but payload not an array');
                    
                    if (msgObj.length > 2) {
                        console.log('message - msgCode 42 but message length > 2 :>> ', { msgObj });
                    }

                    const payload = msgObj[1];

                    switch (msgType) {
                        case 'platform-message-sync':
                            this.subscribeRoute('WEBPLATFORM');
                            this.subscribeRoute('ACCOUNT');
                            this.getAccount();
                            this.emit('platform-subscribed');
                        break;
                
                        case 'q':
                        case 'q-sync':
                            console.log('message - TODO - what is in this?:>> ', {msgType, payload, data});
                            let priceData = payload.split('|');
                            priceData = {
                                ticker: priceData[0],
                                bid: priceData[1],
                                ask: priceData[2],
                            }
                            this.emit('price', priceData);
                        break;

                        case 'acc':
                            this.emit('account', payload);
                        break;
                        
                        case 'acc-re': 
                            this.emit('reaccount', payload);                    
                        break;


                        case 'working-schedule-sync':
                            // nothing

                        default: 
                            // nothing
                    }
                }
            }
            catch (error) {
                console.log('message - error :>> ', error, '\n =========== \n', data.substring(0,100));
            }
        });

        ws.on('error', (error) => {
            console.log('ws error :>> ', {error});
        });
    }

    _wsCommand(type, payload = null, code = '42') {
        const msgPayload = [type];
        if (payload) msgPayload.push(payload);
        const wsMsg = code + JSON.stringify(msgPayload);
        
        debug && console.log('wsMsg :>> ', wsMsg);

        ws.send(wsMsg);
    }

    getAccount() {
        this._wsCommand('acc');
    }
    
    subscribeRoute(route) {
        this._wsCommand('subscribe', `/${route}`);
    }

    bulkSubscribe(ticker_symbols) {
        this._wsCommand('s-qbulk', ticker_symbols);
    }
    
    bulkUnsubscribe(ticker_symbols) {
        this._wsCommand('us-qbulk', ticker_symbols);
    }

    getCurrentPrice(instruments) {
        transport
        .post(baseUrl + priceUrl, instruments).then(res => {
            res.data.ticker = res.data.instrumentCode;
            this.emit('price', res.data);
        })
        .catch(error => console.log('getCurrentPrice error', {error}));
    }
    
    getAvailableEquities() {
        transport
        .get(baseUrl + availableEquitiesUrl)
        .then(res => this.emit('equity-data', res.data.items))
        .catch(error => console.log('getAvailableEquities error', {error}));
    }
    
    getHotlist(period, delta) {
        transport.get(hotListUrl + '/' + period + '/' + delta)
        .then(res => this.emit('hotlist', period, delta, res.data))
        .catch(error => console.log('getHotlist error', {error}));
    }
    
    getExchangeRate() {
        axios.get('https://query2.finance.yahoo.com/v10/finance/quoteSummary/GBPUSD=X?modules=assetProfile%2CsummaryProfile%2CsummaryDetail%2CesgScores%2Cprice%2CincomeStatementHistory%2CincomeStatementHistoryQuarterly%2CbalanceSheetHistory%2CbalanceSheetHistoryQuarterly%2CcashflowStatementHistory%2CcashflowStatementHistoryQuarterly%2CdefaultKeyStatistics%2CfinancialData%2CcalendarEvents%2CsecFilings%2CrecommendationTrend%2CupgradeDowngradeHistory%2CinstitutionOwnership%2CfundOwnership%2CmajorDirectHolders%2CmajorHoldersBreakdown%2CinsiderTransactions%2CinsiderHolders%2CnetSharePurchaseActivity%2Cearnings%2CearningsHistory%2CearningsTrend%2CindustryTrend%2CindexTrend%2CsectorTrend')
        .then(res => this.emit('forex', res.data))
        .catch(error => console.log('getExchangeRate error', {error}));
    }
    
    placeOrder(instrumentCode, orderType, stopPrice, limitPrice, quantity, timeValidity) {
        transport
        .post(baseUrl + orderUrl, {
            instrumentCode,
            orderType,
            stopPrice,
            limitPrice,
            quantity,
            timeValidity
        })
        .then(res => {
            if(res.hasOwnProperty('data') && res.data.hasOwnProperty('account')) {
                this.emit('account', res.data.account);
            } else {
                this.emit('order-failure', res.data);
            }
        })
        .catch(error => console.log('placeOrder error', {error}));
    }
    
    modifyOrder(orderId, orderType, stopPrice, limitPrice, quantity, timeValidity) {
        transport
        .put(baseUrl + orderUrl + '/' + orderId, {
            orderType,
            stopPrice,
            limitPrice,
            quantity,
            timeValidity
        })
        .then(res => {
            if(res.hasOwnProperty('data') && res.data.hasOwnProperty('account')) {
                this.emit('account', res.data.account);
            } 
            else {
                console.log('modifyOrder - order-failure', {data: res.data});
                this.emit('order-failure', res.data);
            }
        })
        .catch(error => console.log('modifyOrder error', {error}));
    }
    
    deleteOrder(orderId) {
        console.log('deleteOrder - trying to delete order');
        transport
        .delete(baseUrl + orderUrl + '/' + orderId).then(res => {
            if(res.hasOwnProperty('data') && res.data.hasOwnProperty('account')) {
                this.emit('account', res.data);
            } 
            else {
                this.emit('order-failure', res.data);
            }
        })
        .catch(error => console.log('deleteOrder error', {error}));
    }
}


module.exports = Trading212;