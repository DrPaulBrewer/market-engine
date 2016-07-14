/* jshint esnext:true */
/* Copyright 2016 Paul Brewer, Economic & Financial Technology Consulting LLC, <drpaulbrewer@eaftc.com>  */
/* Open Source License:  The MIT License. See included License.md file or https://opensource.org/licenses/MIT */

import {EventEmitter} from 'events';

/**
 * mark an order as rejected by setting first column or .ok to 0
 *
 */

function reject(order){
    // for use in MarketEngine before-order event handler
    if (Array.isArray(order)){
        order[0] = 0;
    } else if (typeof(order)==='object') {
        order.ok = false;
    }
}

/**
 * Market "Engine" providing some minimal housekeeping functions for a trading exchange, but no economic functions.
 *
 */

export class MarketEngine extends EventEmitter {

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

    constructor(options={pushArray:1}){
        super();

        /** 
         * options passed to constructor 
         * @type {Object} this.o 
         *
         */

        this.o = options;

        /** 
         * name of goods traded in this market
         * @type {string} this.o.goods
         */

        if (this.o.goods)
            this.goods = this.o.goods;
        
        /**
         * list of active orders
         * orders may be objects or arrays of fixed length
         * @type {Array<Object|number[]>} this.a
         */
        
        this.a = [];

        /**
         * list of indexes into this.a[] of trashed orders to be removed
         * @type {number[]} this.trash
         */

        this.trash = [];
 
        /**
         * counter of order number stamp
         *
         * @type {number} this.count
         */
        
        this.count = 0;
        this.on('trade-cleanup',function(tradespec){
            if (tradespec && tradespec.buyA && tradespec.buyQ && this.o.qCol)
                this.reduceQ(tradespec.buyA,tradespec.buyQ);
            if (tradespec && tradespec.sellA && tradespec.sellQ && this.o.qCol)
                this.reduceQ(tradespec.sellA,tradespec.sellQ);
        });
    }

    /**
     * clear active and trash list, reset counter, and emit clear event
     * @emits {clear} after clearing active and trash lists and resetting counter
     */

    clear(){
        if (this.a && this.a.length) this.a.length=0;
        if (this.trash && this.trash.length ) this.trash.length  = 0;
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

    bump(neworder){
        let countRemoved=0;
        let cancelCol=this.o.cancelCol, tCol=this.o.tCol, idCol=this.o.idCol;
        if ((cancelCol!==undefined) && (idCol!==undefined) && (neworder[cancelCol])){
            countRemoved += this.cancel(neworder[idCol]);
        }
        if ((tCol!==undefined) && neworder[tCol]){
            countRemoved += this.expire(neworder[tCol]);
        }
        if (countRemoved>0) this.emit('bump');
    }

    /**
     * "push" a new order to the market
     * performs housekeeping:
     * 1. pre-adding fields such as processing timestamp and order number
     * 1. emitting before-order(myorder,function reject()) to allow customized order acceptance/rejection rules
     * 1. procesing any cancellation or expiration triggered in pre-processing of the order with this.bump(myorder)
     * 1. If the this.a activer list exists, add the new order to the active list
     * 1. emit order(myorder) to allow for additional customized processing (such as identifying trades or enforcing other rules)
     * @param {Object|number[]} order A new order to the market for processing
     * @emits {before-order(myorder, reject())} to allow customized rejection rules for orders
     * @emits {order(myorder)} to allow customized rules and trading procedures
     */
    
    push(order){
        let myorder;
        if (this.o.pushArray && Array.isArray(order)){
            myorder = order.slice();
            myorder.unshift(1,Date.now());
            this.emit('before-order',myorder,reject);
            if (myorder.length && myorder[0]){
                this.count++;
                myorder[0] = this.count;
                if (!this.o.noBump) this.bump(myorder);
                if (this.a) this.a.push(myorder);
                this.emit('order',myorder);
            }
        } else if (this.o.pushObject && typeof(order)==='object'){
            myorder = Object.assign({},order);
            myorder.ts = Date.now();
            myorder.ok = 1;
            this.emit('before-order',myorder,reject);
            if (myorder.ok){
                delete myorder.ok;
                this.count++;
                myorder.num = this.count;
                if (!this.o.noBump) this.bump(myorder);
                if (this.a) this.a.push(myorder);
                this.emit('order',myorder);
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
    
    reduceQ(ais, qs){
        let i=0,l=Math.max(ais.length,qs.length),qCol=this.o.qCol;
        let trash = this.trash, a=this.a;
        let order;
        if (!a) return;
        for(i=0;i<l;++i){
            order = a[ais[i]];
            order[qCol] -= qs[i];
            if (order[qCol]<0)
                throw new Error('quantity ('+qs[i]+') exceeded availability in order:');
            if ((order[qCol]===0) && (trash))
                trash.push(ais[i]);
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

    trade(tradespec){
        if (this.o.goods)
            tradespec.goods = this.o.goods;
        if (this.o.money)
            tradespec.money = this.o.money;
        this.emit('trade',tradespec);
        this.emit('trade-cleanup', tradespec);
        this.emit('after-trade',tradespec);
    }

    /**
     * find and expire orders.
     * Orders are expired if supplied time ts is greater than order txCol.  
     * Orders are expired by setting quantity to 0 and adding to trash list
     * @param {number} ts The current effective market time
     */

    expire(ts){
        let i,l,order,countExpired=0;
        let xCol = this.o.txCol, qCol = this.o.qCol;
        let a = this.a, trash=this.trash;
        if ((!a) || (xCol===undefined)) return;
        for(i=0,l=a.length;i<l;++i){
            order = a[i];
            if (order && (order[xCol]>0) && (ts>order[xCol])){
                countExpired++;
                if (trash) 
                    trash.push(i);
                if (qCol!==undefined)
                    order[qCol]=0;
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
     
    cancel(id){
        let i,order,countCancelled=0;
        let idCol = this.o.idCol, qCol = this.o.qCol;
        let a=this.a, trash=this.trash;
        let cancelCol = this.o.cancelCol;
        if (!a) return;
        i = a.length;
        while(i-->0){ 
            order = a[i];
            if (order && (id===order[idCol])){
                countCancelled++;
                if (trash)
                    trash.push(i);
                if (qCol!==undefined)
                    order[qCol]=0;
                if (order[cancelCol])
                    i = 0; // skip because earlier cancel cancelled others
            }
        }
        return countCancelled;
    }

    /**
     * delete the orders in the trash list from the active list.
     * Orders are deleted from the active list using Array.splice, so order indexes in this.a[] will also change. 
     * 
     */
            
    emptyTrash(){
        let trash = this.trash, a=this.a;
        if (!trash || !a) return;
        trash.sort(function(x,y){ return (x-y);});
        let i = trash.length,last=-1,j,uniq=[];
        while(i-->0){
            j = trash[i];
            if (j!==last){
                last = j;
                uniq.unshift(j);
                a.splice(j,1);
            }
        }
        this.trash = [];
        return uniq;
    }
}

