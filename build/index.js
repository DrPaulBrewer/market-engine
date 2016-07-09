'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MarketEngine = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; }; /* jshint esnext:true */
/* Copyright 2016 Paul Brewer, Economic & Financial Technology Consulting LLC, <drpaulbrewer@eaftc.com>  */
/* Open Source License:  The MIT License. See included License.md file or https://opensource.org/licenses/MIT */

var _events = require('events');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function reject(order) {
    // for use in MarketEngine before-order event handler
    if (Array.isArray(order)) {
        order[0] = 0;
    } else if ((typeof order === 'undefined' ? 'undefined' : _typeof(order)) === 'object') {
        order.ok = false;
    }
}

var MarketEngine = exports.MarketEngine = function (_EventEmitter) {
    _inherits(MarketEngine, _EventEmitter);

    function MarketEngine() {
        var options = arguments.length <= 0 || arguments[0] === undefined ? { pushArray: 1 } : arguments[0];

        _classCallCheck(this, MarketEngine);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MarketEngine).call(this));

        _this.o = options;
        if (_this.o.goods) _this.goods = _this.o.goods;
        _this.a = [];
        _this.trash = [];
        _this.count = 0;
        _this.on('trade-cleanup', function (tradespec) {
            if (tradespec && tradespec.buyA && tradespec.buyQ && this.o.qCol) this.reduceQ(tradespec.buyA, tradespec.buyQ);
            if (tradespec && tradespec.sellA && tradespec.sellQ && this.o.qCol) this.reduceQ(tradespec.sellA, tradespec.sellQ);
        });
        return _this;
    }

    _createClass(MarketEngine, [{
        key: 'clear',
        value: function clear() {
            if (this.a && this.a.length) this.a.length = 0;
            if (this.trash && this.trash.length) this.trash.length = 0;
            this.count = 0;
            this.emit('clear');
        }
    }, {
        key: 'bump',
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
    }, {
        key: 'push',
        value: function push(order) {
            var myorder = void 0;
            if (this.o.pushArray && Array.isArray(order)) {
                myorder = order.slice();
                myorder.unshift(1, Date.now());
                this.emit('before-order', myorder, reject);
                if (myorder.length && myorder[0]) {
                    this.count++;
                    myorder[0] = this.count;
                    if (!this.o.noBump) this.bump(myorder);
                    if (this.a) this.a.push(myorder);
                    this.emit('order', myorder);
                }
            } else if (this.o.pushObject && (typeof order === 'undefined' ? 'undefined' : _typeof(order)) === 'object') {
                myorder = Object.assign({}, order);
                myorder.ts = Date.now();
                myorder.ok = 1;
                this.emit('before-order', myorder, reject);
                if (myorder.ok) {
                    delete myorder.ok;
                    this.count++;
                    myorder.num = this.count;
                    if (!this.o.noBump) this.bump(myorder);
                    if (this.a) this.a.push(myorder);
                    this.emit('order', myorder);
                }
            }
        }
    }, {
        key: 'reduceQ',
        value: function reduceQ(ais, qs) {
            var i = 0,
                l = Math.max(ais.length, qs.length),
                qCol = this.o.qCol;
            var trash = this.trash,
                a = this.a;
            var order = void 0;
            if (!a) return;
            for (i = 0; i < l; ++i) {
                order = a[ais[i]];
                order[qCol] -= qs[i];
                if (order[qCol] < 0) throw new Error('quantity (' + qs[i] + ') exceeded availability in order:');
                if (order[qCol] === 0 && trash) trash.push(ais[i]);
            }
        }
    }, {
        key: 'trade',
        value: function trade(tradespec) {
            if (this.o.goods) tradespec.goods = this.o.goods;
            if (this.o.money) tradespec.money = this.o.money;
            this.emit('trade', tradespec);
            this.emit('trade-cleanup', tradespec);
            this.emit('after-trade', tradespec);
        }
    }, {
        key: 'expire',
        value: function expire(ts) {
            var i = void 0,
                l = void 0,
                order = void 0,
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
    }, {
        key: 'cancel',
        value: function cancel(id) {
            var i = void 0,
                order = void 0,
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
    }, {
        key: 'emptyTrash',
        value: function emptyTrash() {
            var trash = this.trash,
                a = this.a;
            if (!trash || !a) return;
            trash.sort(function (x, y) {
                return x - y;
            });
            var i = trash.length,
                last = -1,
                j = void 0,
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
