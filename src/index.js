/* jshint esnext:true */
/* Copyright 2016 Paul Brewer, Economic & Financial Technology Consulting LLC, <drpaulbrewer@eaftc.com>  */
/* Open Source License:  The MIT License. See included License.md file or https://opensource.org/licenses/MIT */

import {EventEmitter} from 'events';

function reject(order){
    // for use in MarketEngine before-order event handler
    if (Array.isArray(order)){
        order[0] = 0;
    } else if (typeof(order)==='object') {
        order.ok = false;
    }
}

export class MarketEngine extends EventEmitter {
    constructor(options={pushArray:1}){
        super();
        this.o = options;
        if (this.o.goods)
            this.goods = this.o.goods;
        this.a = [];
        this.trash = [];
        this.count = 0;
        this.on('trade-cleanup',function(tradespec){
            if (tradespec && tradespec.buyA && tradespec.buyQ && this.o.qCol)
                this.reduceQ(tradespec.buyA,tradespec.buyQ);
            if (tradespec && tradespec.sellA && tradespec.sellQ && this.o.qCol)
                this.reduceQ(tradespec.sellA,tradespec.sellQ);
        });
    }

    clear(){
        if (this.a && this.a.length) this.a.length=0;
        if (this.trash && this.trash.length ) this.trash.length  = 0;
        this.count = 0;
        this.emit('clear');
    }

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

    trade(tradespec){
        if (this.o.goods)
            tradespec.goods = this.o.goods;
        if (this.o.money)
            tradespec.money = this.o.money;
        this.emit('trade',tradespec);
        this.emit('trade-cleanup', tradespec);
        this.emit('after-trade',tradespec);
    }

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

