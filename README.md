## About
This module aims to utilize and expose Trading212's RESTFul API and WebSocket APIs to allow users to easily interact with the API to create for instance a custom UI, automated trading, Discord bot, or what ever

# Table of Contents
1. [About](#about)
2. [Disclaimer](#disclaimer)
3. [Installing](#installing)
4. [Usage/Features](#features)
    * [Setup](#setup)
    * [REST API](#rest)
    * [Equity data](#equitydata)
    * [Get Bid/Ask Price](#restprices)
    * [REST BUY order](#restbuy)
    * [REST SELL order](#restsell)
    * [WebSocket API](#websocketapi)
    * [WebSocket Established](#websocketestablished)
6. [Discord](#discord)
7. [Donate](#donate)


## Disclaimer
This code is work in progress. I am in no way affiliated with trading212 and trading212 does not endorse this project.
Use this code at your own risk. I afford no guarantee that the code is stable or error free.
## Installing
You must first have [NodeJS](https://nodejs.org/en/download/) and [NPM](https://www.npmjs.com/get-npm) installed

npm install trading212

alternatively

download the project source from this repo and then create a trading212 folder within your node_modules folder
## Features
## Setup
```
//Setup
//Get these values from your browser cookie at live.trading212.com (F12 -> Application -> Storage -> Cookies)
const CUSTOMER_SESSION = "ab01-cde3-f45g-6789-hijkl1337";
const TRADING_SESSION_LIVE = "ab01-cde3-f45g-6789-hijkl1337";

//Create handle and client
const trading212Hanlder = require('trading212');
const trading212 = new trading212Handler('live', CUSTOMER_SESSION, TRADING212_SESSION_LIVE);
```
## Rest
## Equitydata
Get all data (name, description, ticker, company history, etc) for equities available
```
let result = trading212.getAvailableEquities();
```
## Restprices
Get Bid Ask Prices
```
let result = trading212.getCurrentPrice(["GME_US_EQ", "AMC_US_EQ"]);

//REST api

//Get current price
trading212.getCurrentPrice(["GME_US_EQ"]);
//Listen for response
trading212.on('price', (data) => {
  //data.ticker // GME_US_EQ
  //data.bid // Bid price
  //data.ask // Ask price
});
```
## Restbuy
Place BUY order
```
//Place limit buy of 5 $GME @ $50
let ticker = "GME_US_EQ";
let orderType = "LIMIT";
let stopPrice = null;
let limitPrice = "50";
let quantity = 5;
let timeValidity = "DAY";
trading212.placeOrder(ticker, orderType, stopPrice, limitPrice, quantity, timeValidity);
//If order fails
trading212.on('order-failture', (data) {
  //Axios error
});
//If order succeeds
trading212.on('account', (data) => {
  //data.orders
  //data.positions
  //console.log(data);
});
```
## Restsell
Place SELL order
```

//Place limit sell of 5 $GME @ $50
let ticker = "GME_US_EQ";
let orderType = "LIMIT";
let stopPrice = null;
let limitPrice = "50";
let quantity = -5;
let timeValidity = "DAY";
trading212.placeOrder(ticker, orderType, stopPrice, limitPrice, quantity, timeValidity);
//If order fails
trading212.on('order-failture', (data) {
  //Axios error
});
//If order succeeds
trading212.on('account', (data) => {
  //data.orders
  //data.positions
  //console.log(data);
});
```

## Websocketapi
## Websocketestablished
```
//WebSocket
trading212.on('platform-subscribed', () => {//Trading212 WebSocket established
  //Login for when connection is established
  trading212.bulkSubscribe(["GME_US_EQ"]);//Subscribe to price feeds for this ticker
});
 //Listen for price events from trading212 websocket (must subscribe to ticker by using #bulkSubscribe
trading212.on('price', (data) => {
  console.log(data.ticker);//Symbol/Ticker for equity
  console.log(data.ask);//Asking price
  console.log(data.bid);//Bidding price
});
```
