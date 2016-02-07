var assert = require('assert');
var should = require('should');
var MarketEngine = require("../index.js");

describe('MarketEngine', function(){
    
    it('should be a function', function(){
	MarketEngine.should.be.type('function');
    });

    it('should initialize properly', function(){
	var X = new MarketEngine({qCol:3});
	X.a.should.eql([]);
	X.trash.should.eql([]);
	X.count.should.eql(0);
	X.o.should.eql({qCol:3});
    });

    describe('clear', function(){
	
	it('should clear() properly and emit event clear', function(done){
	    var X = new MarketEngine({qCol:3});
	    X.a = [[1,2,3,4,5,6,7],[2,8,7,6,5,5,4]];
            X.trash = [1];
            X.count = 2;
	    X.on('clear', function(){
		X.a.should.eql([]);
		X.trash.should.eql([]);
		X.count.should.eql(0);
		X.o.should.eql({qCol:3});
		done();
	    });
	    X.clear();
	});

	it('should work without trash', function(done){
	    var X = new MarketEngine({qCol:3});
	    X.a = [[1,2,3,4,5,6,7],[2,8,7,6,5,5,4]];
            delete X.trash;
            X.count = 2;
	    X.on('clear', function(){
		X.a.should.eql([]);
		X.should.not.have.ownProperty('trash');
		X.count.should.eql(0);
		X.o.should.eql({qCol:3});
		done();
	    });
	    X.clear();
	});

	it('should work without a', function(done){
	    var X = new MarketEngine({qCol:3});
	    delete X.a;
            X.trash = [1];
            X.count = 2;
	    X.on('clear', function(){
		X.should.not.have.ownProperty('a');
		X.trash.should.eql([]);
		X.count.should.eql(0);
		X.o.should.eql({qCol:3});
		done();
	    });
	    X.clear();
	});

    });

    describe('push', function(){

	it('should ignore array type orders if so configured ', function(){
	    var X = new MarketEngine({});
	    var flag = 0;
	    var order = [3,4,5,6,7,8,1,2,3];
	    var copy = order.slice();
	    X.on('before-order', function(myorder){
		throw "this should not happen";
	    });
	    X.on('order', function(myorder){
		throw "this also wlll not happen";
	    });
	    X.push(order);
	});

	it('should ignore object type orders if so configured', function(){
	    var X = new MarketEngine({});
	    var order = {q:20, buylimit: 100, id:5};	
	    X.on('before-order', function(myorder){
		throw "this should not happen";
	    });
	    X.on('order', function(myorder){
		throw "this also wlll not happen";
	    });
	    X.push(order);
	});

	it('array order -- should emit timestamped array before-order, unshift count and .push(neworder) to .a and emit order', function(done){
	    var X = new MarketEngine();
	    var flag = 0;
	    var order = [3,4,5,6,7,8,1,2,3];
	    var copy = order.slice();
	    X.on('before-order', function(myorder){
		flag = 1;
		myorder.slice(2).should.eql(copy);
		assert.ok(myorder[0]);
		assert.ok(Date.now()>=myorder[1]);
		assert.ok((Date.now()-myorder[1])<=50);
		this.count.should.eql(0);
		this.a.should.eql([]);
	    });
	    X.on('order', function(myorder){
		assert.ok(flag===1);
		myorder.slice(2).should.eql(copy);
		this.a[0].slice(2).should.eql(copy);
		this.count.should.eql(1);
		this.a[0][0].should.eql(1);
		done();
	    });
	    X.push(order);
	});

	it('array order -- should be vetoed if truncated to length===0 in before-order handler', function(){
	    var X = new MarketEngine();
	    var flag = 0;
	    var order = [3,4,5,6,7,8,1,2,3];
	    var copy = order.slice();
	    X.on('before-order', function(myorder){
		flag = 1;
		myorder.slice(2).should.eql(copy);
		assert.ok(myorder[0]);
		assert.ok(Date.now()>=myorder[1]);
		assert.ok((Date.now()-myorder[1])<=50);
		this.count.should.eql(0);
		this.a.should.eql([]);
		myorder.length=0; // veto
	    });
	    X.on('order', function(myorder){
		throw "this should not get called";
	    });
	    X.push(order);
	    X.count.should.eql(0);
	    X.a.should.eql([]);
	});

	it('array order -- should be vetoed if neworder[0] set to 0 in before-order handler', function(){
	    var X = new MarketEngine();
	    var flag = 0;
	    var order = [3,4,5,6,7,8,1,2,3];
	    var copy = order.slice();
	    X.on('before-order', function(myorder){
		flag = 1;
		myorder.slice(2).should.eql(copy);
		assert.ok(myorder[0]);
		assert.ok(Date.now()>=myorder[1]);
		assert.ok((Date.now()-myorder[1])<=50);
		this.count.should.eql(0);
		this.a.should.eql([]);
		myorder[0]=0; // veto
	    });
	    X.on('order', function(myorder){
		throw "this should not get called";
	    });
	    X.push(order);
	    X.count.should.eql(0);
	    X.a.should.eql([]);
	});

	it('object order -- should emit order with .ts and .ok fields before-order, .ts and .num  and .push(neworder) to .a and emit order', function(done){
	    var X = new MarketEngine({pushObject:1});
	    var flag = 0;
	    var order = {q:20, buylimit: 100, id:5};	
	    var copy = Object.assign({}, order);
	    X.on('before-order', function(myorder){
		flag = 1;
		var dropTS = Object.assign({},myorder);
		delete dropTS.ts;
		delete dropTS.ok;
		dropTS.should.eql(copy);
		assert.ok(myorder.ok);
		assert.ok(Date.now()>=myorder.ts);
		assert.ok((Date.now()-myorder.ts)<=50);
		this.count.should.eql(0);
		this.a.should.eql([]);
	    });
	    X.on('order', function(myorder){
		assert.ok(flag===1);
		var drop = Object.assign({},myorder);
		delete drop.ts;
		delete drop.num;
		assert(myorder.ok===undefined);
		drop.should.eql(copy);
		this.count.should.eql(1);
		myorder.num.should.eql(1);
		this.a[0].num.should.eql(1);
		done();
	    });
	    X.push(order);
	});

	it('object order -- should be vetoed if .ok field set to 0 in before-order ', function(){
	    var X = new MarketEngine({pushObject:1});
	    var flag = 0;
	    var order = {q:20, buylimit: 100, id:5};	
	    var copy = Object.assign({}, order);
	    X.on('before-order', function(myorder){
		flag = 1;
		var dropTS = Object.assign({},myorder);
		delete dropTS.ts;
		delete dropTS.ok;
		dropTS.should.eql(copy);
		assert.ok(myorder.ok);
		assert.ok(Date.now()>=myorder.ts);
		assert.ok((Date.now()-myorder.ts)<=50);
		this.count.should.eql(0);
		this.a.should.eql([]);
		myorder.ok=0; //veto
	    });
	    X.on('order', function(myorder){
		throw "this should not be called";
	    });
	    X.push(order);
	    X.a.should.eql([]);
	    X.count.should.eql(0);
	});

    });

    describe('reduceQ', function(){
	var X = new MarketEngine({pushArray:1,  qCol:4});
	var Y = new MarketEngine({pushObject:1, qCol:'q'});
	X.push([1,0,3,0,0,0,0]);
	X.push([1,0,2,0,0,0,0]);
	X.push([5,0,10,0,0,0,0]);
	Y.push({p:1,q:3});
	Y.push({p:1,q:2});
	Y.push({p:5,q:10});
	X.reduceQ([2,0],[10,2]);
	Y.reduceQ([2,0],[10,2]);
	it('should decrement quantities', function(){
	    assert.ok(X.a[0][4]===1);
	    assert.ok(Y.a[0].q===1);
	    assert.ok(X.a[1][4]===2);
	    assert.ok(Y.a[1].q===2);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(Y.a[2].q===0);
	});
	it('should add fully exhausted (q===0) orders to trash', function(){
	    X.trash.should.eql([2]);
	    Y.trash.should.eql([2]);
	});
    });

    describe('trade', function(){
    });

    describe('expire', function(){
    });

    describe('cancel', function(){
    });

    describe('emptyTrash', function(){
    });

});
