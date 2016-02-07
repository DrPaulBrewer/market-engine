/* jshint esnext:true */
/* Copyright 2016 Paul Brewer, Economic & Financial Technology Consulting LLC, <drpaulbrewer@eaftc.com>  */
/* Open Source License:  The MIT License. See included License.md file or https://opensource.org/licenses/MIT */

const util = require('util');
const EventEmitter = require('events').EventEmitter;

function MarketEngine(options){
    EventEmitter.call(this);
    this.o = options || {pushArray:1};
    this.clear();
    this.on('trade-cleanup',function(tradespec){
	if (tradespec && tradespec.buyA && tradespec.buyQ && this.o.qCol)
	    this.reduceQ(tradespec.buyA,tradespec.buyQ);
	if (tradespec && tradespec.sellA && tradespec.sellQ && this.o.qCol)
	    this.reduceQ(tradespec.sellA,tradespec.sellQ);
    });
}

util.inherits(MarketEngine, EventEmitter);

MarketEngine.prototype.clear = function(){
    this.a = [];
    this.trash = [];
    this.count = 0;
    this.emit('clear');
};

MarketEngine.prototype.push = function(order){
    var myorder;
    if (this.o.pushArray && Array.isArray(order)){
	myorder = order.slice();
	myorder.unshift(Date.now());
	this.emit('before-order',myorder);
	if (myorder.length){
	    this.count++;
	    myorder.unshift(this.count);
	    this.a.push(myorder);
	    this.emit('order',myorder);
	}
    } else if (this.o.pushObject && typeof(order)==='object'){
	myorder = Object.assign({},order);
	myorder.ts = Date.now();
	myorder.ok = 1;
	this.emit('before-order',myorder);
	if (myorder.ok){
	    delete myorder.ok;
	    this.count++;
	    myorder.num = this.count;
	    this.a.push(myorder);
	    this.emit('order',myorder);
	}
    }
};

MarketEngine.prototype.reduceQ = function(ais, qs){
    var i=0,l=Math.max(ais.length,qs.length),qCol=this.o.qCol;
    var trash = this.trash, a=this.a;
    var order;
    for(i=0;i<l;++i){
	order = a[ais[i]];
	order[qCol] -= qs[i];
	if (order[qCol]<0)
	    throw new Error('quantity ('+qs[i]+') exceeded availability in order:');
	if (order[qCol]===0)
	    trash.push(ais[i]);
    }
};

MarketEngine.prototype.trade = function(tradespec){
    var i,l,order;
    this.emit('trade',tradespec);
    this.emit('trade-cleanup', tradespec);
    this.emit('after-trade',tradespec);
};

MarketEngine.prototype.expire = function(ts){
    var i,l,order,countExpired=0;
    var xCol = this.o.txCol, qCol = this.o.qCol;
    for(i=0,l=this.a.length;i<l;++i){
	order = this.a[i];
	if (order && (order[xCol]>0) && (ts>order[xCol])){
	    countExpired++;
	    this.trash.push(i);
	    if (qCol)
		order[qCol]=0;
	}
    }
    return countExpired;
};

MarketEngine.prototype.cancel = function(id){
    var i,l,order,countCancelled=0;
    var idCol = this.o.idCol, qCol = this.o.qCol;
    for(i=0,l=this.a.length;i<l;++i){
	order = this.a[i];
	if (order && (id===order[idCol])){
	    countCancelled++;
	    this.trash.push(i);
	    if (qCol)
		order[qCol]=0;
	}
    }
    return countCancelled;
};
	    
MarketEngine.prototype.emptyTrash = function(){
    this.trash.sort(function(a,b){ return (a-b);});
    var i = this.trash.length,last=-1,trash=this.trash,j,uniq=[];
    while(i-->0){
	j = trash[i];
	if (j!==last){
	    last = j;
	    uniq.unshift(j);
	    this.a.splice(j,1);
	}
    }
    this.trash = [];
    return uniq;
};

module.exports = MarketEngine;    
