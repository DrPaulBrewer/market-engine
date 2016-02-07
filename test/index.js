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
		myorder.slice(1).should.eql(copy);
		assert.ok(Date.now()>=myorder[0]);
		assert.ok((Date.now()-myorder[0])<=50);
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
    });
});
