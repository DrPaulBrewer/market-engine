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
    XMarket = new MarketEngine({qCol: order-quantity-column-number});

##Usage

    XMarket.on('some-event', function(...){ statement; statement; ... });

##Events
    MarketEngine.on('clear', function(){...})

specifies function to call when the market data is cleared 

    MarketEngine.on('before-order', function(neworder){ ... })

specifies function to call before each order. 

If `neworder` is an `Array`, a timestamp from `Date.now()` will be in `neworder[0]`

If `neworder` is an `Object`, the timestamp is in `neworder.ts`

Any event handler for `before-order` may veto an order. The method depends on the type
of order.  An object order may be vetoed by setting `neworder.ok=0`.  An array order may
be vetored by setting `neworder[0]=0` or `neworder.length=0`.  Vetos do not prevent subsequent event handlers for
`before-order` from firing. If the veto is still in effect when the last `before-order` handler
has fired, then the order will not be handled further.

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

    MarketEngine.prototype.clear()

clears the active list `this.a=[]`, the trash list `this.trash=[]` and resets `this.count` to 0, then emits "clear"

Emits: clear()

    MarketEngine.prototype.push(neworder)

Emits: before-order(neworder), order(neworder)

    MarketEngine.prototype.trade(tradespec)

Emits: trade, trade-cleanup, after-trade

    MarketEngine.prototype.cancel(id)

requires:  options.idCol, options.qCol

    MarketEngine.prototype.expire(ts)

requires: options.txCol, options.qCol

    MarketEngine.prototype.reduceQ(ais, qs)

requires: options.qCol

    MarketEngine.prototype.emptyTrash()

