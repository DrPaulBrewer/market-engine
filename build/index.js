"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MarketEngine = void 0;

var _events = require("events");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * mark an order as rejected by setting first column or .ok to 0
 *
 */
function reject(order) {
  // for use in MarketEngine before-order event handler
  if (Array.isArray(order)) {
    order[0] = 0;
  } else if (_typeof(order) === 'object') {
    order.ok = false;
  }
}
/**
 * Market "Engine" providing some minimal housekeeping functions for a trading exchange, but no economic functions.
 *
 */


var MarketEngine =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(MarketEngine, _EventEmitter);

  /**
   * create MarketEngine
   *
   * @param {Object} [options={pushArray:1}] options copied to this.o
   * @param {string} [options.goods] sets name of goods to be traded in this market
   * @param {string} [options.money] sets name of money used in this market
   * @param {boolean} [options.pushArray] set to 1 if orders are numeric arrays, affects .push handling, accept/reject is in order[0] after prepending 2 elements
   * @param {boolean} [options.pushObject] set to 1 if orders are objects, affects .push handling, accept/reject is in order.ok
   * @param {number|string} [options.idCol] order column number or name for id number of agent submitting the order
   * @param {number|string} [options.cancelCol] order column number or name for indicating cancellation (1) or no cancellation (0) of previous orders by this agent
   * @param {number|string} [options.tCol] order column number or name for time of order
   * @param {number|string} [options.txCol] order column number or name for expiration time of order
   * @param {number|string} [options.qCol] order column number or name for quantity to buy or sell
   * @param {boolean} [options.noBump] if truthy, no cancel/expire search of old orders is performed when pre-processing new orders
   * @listens {trade-cleanup(tradespec)} to reduce order quantity by quantity tradedo
   */
  function MarketEngine() {
    var _this;

    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      pushArray: 1
    };

    _classCallCheck(this, MarketEngine);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(MarketEngine).call(this));
    /** 
     * options passed to constructor 
     * @type {Object} this.o 
     *
     */

    _this.o = options;
    /** 
     * name of goods traded in this market
     * @type {string} this.o.goods
     */

    if (_this.o.goods) _this.goods = _this.o.goods;
    /**
     * list of active orders
     * orders may be objects or arrays of fixed length
     * @type {Array<Object|number[]>} this.a
     */

    _this.a = [];
    /**
     * list of indexes into this.a[] of trashed orders to be removed
     * @type {number[]} this.trash
     */

    _this.trash = [];
    /**
     * counter of order number stamp
     *
     * @type {number} this.count
     */

    _this.count = 0;

    _this.on('trade-cleanup', function (tradespec) {
      if (tradespec && tradespec.buyA && tradespec.buyQ && this.o.qCol) this.reduceQ(tradespec.buyA, tradespec.buyQ);
      if (tradespec && tradespec.sellA && tradespec.sellQ && this.o.qCol) this.reduceQ(tradespec.sellA, tradespec.sellQ);
    });

    return _this;
  }
  /**
   * clear active and trash list, reset counter, and emit clear event
   * @emits {clear} after clearing active and trash lists and resetting counter
   */


  _createClass(MarketEngine, [{
    key: "clear",
    value: function clear() {
      if (this.a && this.a.length) this.a.length = 0;
      if (this.trash && this.trash.length) this.trash.length = 0;
      this.count = 0;
      this.emit('clear');
    }
    /**
     * cancel or expire orders prior to processing new order.
     * new orders can be marked cancelReplace, necessitating a cancel search.
     * new orders also update simulation time, necessitating an expired order search.
     * @param {Object|number[]} neworder
     * @emits {bump} after cancelling or expiring any old orders
     */

  }, {
    key: "bump",
    value: function bump(neworder) {
      var countRemoved = 0;
      var cancelCol = this.o.cancelCol,
          tCol = this.o.tCol,
          idCol = this.o.idCol;

      if (cancelCol !== undefined && idCol !== undefined && neworder[cancelCol]) {
        countRemoved += this.cancel(neworder[idCol]);
      }

      if (tCol !== undefined && neworder[tCol]) {
        countRemoved += this.expire(neworder[tCol]);
      }

      if (countRemoved > 0) this.emit('bump');
    }
    /**
     * "push" a new order to the market
     * performs housekeeping:
     * 1. pre-adding fields such as processing timestamp and order number
     * 1. emitting before-order(myorder,function reject()) to allow customized order acceptance/rejection rules
     * 1. if rejected, emitting reject(myorder) to allow additional processing or logging of rejected orders, after setting a rejection flag (which can still be unset)
     * 1. assigning the order number in myorder[0] 
     * 1. emitting preorder(myorder) for logging or additional processing before order affects books, other orders, or trades
     * 1. procesing any cancellation or expiration triggered in pre-processing of the order with this.bump(myorder)
     * 1. If the this.a active list exists, add the new order to the active list
     * 1. emit order(myorder) to allow for additional customized processing (such as identifying trades or enforcing other rules)
     * @param {Object|number[]} order A new order to the market for processing
     * @emits {before-order(myorder, reject())} to allow customized rejection rules for orders
     * @emits {reject(myorder)} to allow for logging or other processing of rejected orders
     * @emits {preorder(myorder)} to allow for logging or other processing of acceptable orders
     * @emits {order(myorder)} to allow customized rules and trading procedures
     */

  }, {
    key: "push",
    value: function push(order) {
      var myorder;

      if (this.o.pushArray && Array.isArray(order)) {
        myorder = order.slice();
        myorder.unshift(1, Date.now());
        this.emit('before-order', myorder, reject);

        if (myorder.length && myorder[0]) {
          this.count++;
          myorder[0] = this.count;
          this.emit('preorder', myorder);
          if (!this.o.noBump) this.bump(myorder);
          if (this.a) this.a.push(myorder);
          this.emit('order', myorder);
        } else {
          this.emit('reject', myorder);
        }
      } else if (this.o.pushObject && _typeof(order) === 'object') {
        myorder = Object.assign({}, order);
        myorder.ts = Date.now();
        myorder.ok = 1;
        this.emit('before-order', myorder, reject);

        if (myorder.ok) {
          delete myorder.ok;
          this.count++;
          myorder.num = this.count;
          this.emit('preorder', myorder);
          if (!this.o.noBump) this.bump(myorder);
          if (this.a) this.a.push(myorder);
          this.emit('order', myorder);
        } else {
          this.emit('reject', myorder);
        }
      }
    }
    /**
     * reduce the amounts of orders at active array indexes ais by amounts qs.
     * Calls trash.push(ais[i]), pushing indexes to trash list, for affected orders reduced to zero quantity.
     * Reducing an order to a negative quantity throws Error.
     *
     * @param {number[]} ais Indexes in the active array this.a[] of the orders to be affected.
     * @param {number[]} qs Amounts for reduction in the quantity of the affected orders. 
     * @throws {Error} if order is reduced to a negative quantity
     */

  }, {
    key: "reduceQ",
    value: function reduceQ(ais, qs) {
      var i = 0,
          l = Math.max(ais.length, qs.length),
          qCol = this.o.qCol;
      var trash = this.trash,
          a = this.a;
      var order;
      if (!a) return;

      for (i = 0; i < l; ++i) {
        order = a[ais[i]];
        order[qCol] -= qs[i];
        if (order[qCol] < 0) throw new Error('quantity (' + qs[i] + ') exceeded availability in order:');
        if (order[qCol] === 0 && trash) trash.push(ais[i]);
      }
    }
    /** 
     * Register a trade in this market.
     * Sets tradespec.goods and tradespec.money to market goods and money, if any. 
     * Then emits trade(tradeSpec), trade-cleanup(tradeSpec), and after-trade(tradeSpec) for further processing.
     * @param {Object} tradeSpec
     * @emits {trade(tradeSpec)} to allow custom processing of trade
     * @emits {trade-cleanup(tradeSpec)} to allow custom cleanup of market structures after processing trade
     * @emits {after-trade(tradeSpec)} to allow custom post-processing after trade
     */

  }, {
    key: "trade",
    value: function trade(tradespec) {
      if (this.o.goods) tradespec.goods = this.o.goods;
      if (this.o.money) tradespec.money = this.o.money;
      this.emit('trade', tradespec);
      this.emit('trade-cleanup', tradespec);
      this.emit('after-trade', tradespec);
    }
    /**
     * find and expire orders.
     * Orders are expired if supplied time ts is greater than order txCol.  
     * Orders are expired by setting quantity to 0 and adding to trash list
     * @param {number} ts The current effective market time
     */

  }, {
    key: "expire",
    value: function expire(ts) {
      var i,
          l,
          order,
          countExpired = 0;
      var xCol = this.o.txCol,
          qCol = this.o.qCol;
      var a = this.a,
          trash = this.trash;
      if (!a || xCol === undefined) return;

      for (i = 0, l = a.length; i < l; ++i) {
        order = a[i];

        if (order && order[xCol] > 0 && ts > order[xCol]) {
          countExpired++;
          if (trash) trash.push(i);
          if (qCol !== undefined) order[qCol] = 0;
        }
      }

      return countExpired;
    }
    /** 
     * find and cancel previous orders by id.
     * Orders are cancelled by setting quantity to 0 and adding to trash list.
     * Optimistic searching is done: if an order is found which itself has a cancelCol set, the search is complete. 
     * @param {number} id The id number of an agent whose orders will be cancelled.
     */

  }, {
    key: "cancel",
    value: function cancel(id) {
      var i,
          order,
          countCancelled = 0;
      var idCol = this.o.idCol,
          qCol = this.o.qCol;
      var a = this.a,
          trash = this.trash;
      var cancelCol = this.o.cancelCol;
      if (!a) return;
      i = a.length;

      while (i-- > 0) {
        order = a[i];

        if (order && id === order[idCol]) {
          countCancelled++;
          if (trash) trash.push(i);
          if (qCol !== undefined) order[qCol] = 0;
          if (order[cancelCol]) i = 0; // skip because earlier cancel cancelled others
        }
      }

      return countCancelled;
    }
    /**
     * delete the orders in the trash list from the active list.
     * Orders are deleted from the active list using Array.splice, so order indexes in this.a[] will also change. 
     * 
     */

  }, {
    key: "emptyTrash",
    value: function emptyTrash() {
      var trash = this.trash,
          a = this.a;
      if (!trash || !a) return;
      trash.sort(function (x, y) {
        return x - y;
      });
      var i = trash.length,
          last = -1,
          j,
          uniq = [];

      while (i-- > 0) {
        j = trash[i];

        if (j !== last) {
          last = j;
          uniq.unshift(j);
          a.splice(j, 1);
        }
      }

      this.trash = [];
      return uniq;
    }
  }]);

  return MarketEngine;
}(_events.EventEmitter);

exports.MarketEngine = MarketEngine;
