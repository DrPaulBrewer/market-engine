# market-engine

[![Greenkeeper badge](https://badges.greenkeeper.io/DrPaulBrewer/market-engine.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/DrPaulBrewer/market-engine.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/market-engine)
[![Coverage Status](https://coveralls.io/repos/github/DrPaulBrewer/market-engine/badge.svg?branch=master)](https://coveralls.io/github/DrPaulBrewer/market-engine?branch=master)


Provides EventEmitter framework for market/auction implementations, order storage and insertion/cancellation/expiration functionality

## Breaking Changes for v3

### Module changes
v3 is ESM whereas versions 2 and earlier were commonjs.

### removing babel dependencies
v3 is not compiled with Babel

### minor change to this.reduceQ()
will now throw clearer error if parameters are mismatched

## Programmers documentation

[jsdoc pages for market-engine](https://drpaulbrewer.github.io/market-engine/)

## Installation

    npm install market-engine --save

## Initialization

    import MarketEngine from 'market-engine'; // ES Module

## Usage

MarketEngine is used as a base class for building classes representing market exchanges with some set of customized rules.  

MarketEngine does the housekeeping of maintaining an active list of orders, a trash list, and provides a framework for handline new orders and trades,
without specifying the ultimate form of orders or the rules of trade.  

## Subclasses

For a subclass implementing sequential double auction trading rules, see [market-example-contingent](https://www.npmjs.com/package/market-example-contingent)

## Events

MarketEngine is an EventEmitter.  Here is an event reference.  

*bump* -- Fired when one or more orders are cancelled or expired.  

*clear* -- Fired when the market has been reset to an "empty" state with no orders.

*before-order* -- Fired before each order is processed by the market.  Allows for rejection of orders.

*order* -- Fired when an order is ready for processing, i.e. if not rejected in *before-order*

*trade* -- Fired when a trade between orders is ready for processing.

*trade-cleanup* -- Fired to clean up after trade has been processed.

*after-trade* -- Fired after *trade-cleanup*

## Setting Event Handlers

In the explanations below, `XMarket` is a variable containing an instance of `MarketEngine`.

    XMarket.on('clear', function(){...})

specifies function to call when the market data is cleared

    XMarket.on('before-order', function(neworder, reject){ ... })

specifies function to call before each order.

If `neworder` is an `Array`, a timestamp from `Date.now()` will be in `neworder[0]`

If `neworder` is an `Object`, the timestamp is in `neworder.ts`

Any event handler for `before-order` may reject an order, by using the `reject` function that is supplied
as a 2nd parameter, like this:  `return reject(neworder)`

    XMarket.on('order', function(neworder){ ... })

specifies function to call after each order.  Array orders will have the ordernum and timestamp
prepended.  Object orders will have the ordernum in `neworder.num` and the timestamp in `neworder.ts`

    XMarket.on('trade', function(tradespec){ ... })

specifies function to call after each trade

    XMarket.on('trade-cleanup', function(tradespec){ ... })

specifies function to call to clean up after each trade.  The first handler attached by default reduces the quantity
field of each order in the tradespec and marks the order as trash if the quantity reaches zero.

    XMarket.on('after-trade', function(tradespec){ ... })

specifies function to call after the trade event handlers and the trade-cleanup handlers have completed.

##Functions, also see JSdoc documentation.

    MarketEngine.prototype.bump(neworder)

cancels and/or expires any orders in the active list `this.a` depending on the timestamp and id in `neworder`
and the setting of the `cancelReplace` column in `neworder`.  The active list is always scanned for expiring orders,
but will only be scanned for cancellation if the cancelReplace column is truthy in neworder.

    MarketEngine.prototype.clear()

clears the active list `this.a=[]`, the trash list `this.trash=[]` and resets `this.count` to 0, then emits "clear"

Emits: clear()

    MarketEngine.prototype.push(neworder)

processes neworder, as follows:

1. fires  *before-order*
1. exits if order rejected by a *before-order* handler
1. prepends/sets order number and timestamp as first two fields of `neworder` array
1. calls `MarketEngine.prototype.bump(neworder)`, trashing any previously expired or cancelled orders
1. fires *order*

Code listening for *order* may call `MarketEngine.prototype.trade(tradespec)` to indicate a trade in accordance
with some set of market rules, to be defined by the developer.

Emits: before-order(neworder), order(neworder)

    MarketEngine.prototype.trade(tradespec)

1. Copies `this.o.goods` and `this.o.money` to `tradespec.goods` and `tradespec.money`, if the former are defined.
2. Fires  *trade*, *trade-cleanup* and *after-trade*.


Emits: trade, trade-cleanup, after-trade

    MarketEngine.prototype.cancel(id)

Trashes all previous orders by `id` from the active list `this.a` .  

Trashing an order sets it quantity to 0 and places it in the trash list for deletion by `.emptyTrash()`

Called by `MarketEngine.prototype.bump(neworder)` if cancelReplace is indicated.

requires:  options.idCol, options.qCol

optional:  options.cancelCol (shortens search if a previous cancel/replace found)

    MarketEngine.prototype.expire(ts)

Trashes all orders expiring before timestamp `ts` from the active list `this.a`.  

Trashing an order sets it quantity to 0 and places it in the trash list for deletion by `.emptyTrash()`

Called by `MarketEngine.prototype.bump(neworder)` on each `neworder`

requires: options.txCol, options.qCol

    MarketEngine.prototype.reduceQ(ais, qs)

Reduces order quantity of orders locates at indexes in the array `ais` by the amounts in array `qs`

requires: options.qCol

    MarketEngine.prototype.emptyTrash()

Delete any previously trashed orders from active list `this.a`


## Copyright

Copyright 2016- Paul Brewer, Economic and Financial Technology Consulting LLC

## License

[MIT](./LICENSE.md)
