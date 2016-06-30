market-engine
====

[![Build Status](https://travis-ci.org/DrPaulBrewer/market-engine.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/market-engine)
[![Coverage Status](https://coveralls.io/repos/github/DrPaulBrewer/market-engine/badge.svg?branch=master)](https://coveralls.io/github/DrPaulBrewer/market-engine?branch=master)


## Provides EventEmitter framework for market/auction implementations, order storage and insertion/cancellation/expiration functionality

### Warning: versions less than 1.0.0 are pre-release/experimental, may be subject to massive change without notice or not work 

##Installation

    npm install market-engine --save

##Initialization

    var MarketEngine = require('market-engine');
    XMarket = new MarketEngine({qCol: order-quantity-column-number, goods:"X"});

##Events 

MarketEngine defines these events:

*bump* -- Fired when one or more orders are cancelled or expired.  

*clear* -- Fired when the market has been reset to an "empty" state with no orders.

*before-order* -- Fired before each order is processed by the market.  Allows for rejection of orders.

*order* -- Fired when an order is ready for processing, i.e. if not rejected in *before-order* 

*trade* -- Fired when a trade between orders is ready for processing.

*trade-cleanup* -- Fired to clean up after trade has been processed.

*after-trade* -- Fired after *trade-cleanup*

##Setting Event Handlers
    XMarket.on('clear', function(){...})

specifies function to call when the market data is cleared 

    XMarket.on('before-order', function(neworder, reject){ ... })

specifies function to call before each order. 

If `neworder` is an `Array`, a timestamp from `Date.now()` will be in `neworder[0]`

If `neworder` is an `Object`, the timestamp is in `neworder.ts`

Any event handler for `before-order` may reject an order, by using the `reject` function that is supplied
as a 2nd parameter, like this:  `return reject(neworder)`

    MarketEngine.on('order', function(neworder){ ... })

specifies function to call after each order.  Array orders will have the ordernum and timestamp
prepended.  Object orders will have the ordernum in `neworder.num` and the timestamp in `neworder.ts` 

    MarketEngine.on('trade', function(tradespec){ ... })

specifies function to call after each trade

    MarketEngine.on('trade-cleanup', function(tradespec){ ... })

specifies function to call to clean up after each trade.  The first handler attached by default reduces the quantity
field of each order in the tradespec and marks the order as trash if the quantity reaches zero.

    MarketEngine.on('after-trade', function(tradespec){ ... })

specifies function to call after the trade event handlers and the trade-cleanup handlers have completed.

##Functions     

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
2. exits if order rejected by a *before-order* handler
3. calls `MarketEngine.prototype.bump(neworder)` or unrejected `neworder`, clearing any expired or cancelled orders
4. fires *order*

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
