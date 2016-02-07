market-engine
====

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

    MarketEngine.on('before-order', function(neworder){ ... })

    MarketEngine.on('order', function(neworder){ ... })

    MarketEngine.on('trade', function(tradespec){ ... })

    MarketEngine.on('trade-cleanup', function(tradespec){ ... })

    MarketEngine.on('after-trade', function(tradespec){ ... })

##Functions     

    MarketEngine.prototype.clear()

Emits: clear

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

