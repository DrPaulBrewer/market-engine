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

	it('array order -- should work without .a', function(done){
	    var X = new MarketEngine();
	    delete X.a;
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
		this.should.not.have.ownProperty('a');
	    });
	    X.on('order', function(myorder){
		assert.ok(flag===1);
		myorder.slice(2).should.eql(copy);
		this.should.not.have.ownProperty('a');
		this.count.should.eql(1);
		done();
	    });
	    X.push(order);
	});

	it('array order -- should be vetoed if rejected with reject() in before-order handler, which sets col 0 to 0', function(){
	    var X = new MarketEngine();
	    var flag = 0, zeroOrderLength=0, zeroFirstColumn=0;
	    var order = [3,4,5,6,7,8,1,2,3];
	    var copy = order.slice();
	    X.on('before-order', function(myorder,reject){
		flag = 1;
		myorder.slice(2).should.eql(copy);
		assert.ok(myorder[0]);
		assert.ok(Date.now()>=myorder[1]);
		assert.ok((Date.now()-myorder[1])<=50);
		this.count.should.eql(0);
		this.a.should.eql([]);
		reject(myorder); // veto
	    });
	    X.on('before-order', function(myorder, reject){
		if (myorder.length===0)
		    zeroOrderLength++;
		if (myorder[0]===0)
		    zeroFirstColumn++;
	    });
	    X.on('order', function(myorder){
		throw "this should not get called";
	    });
	    X.push(order);
	    X.count.should.eql(0);
	    X.a.should.eql([]);
	    flag.should.equal(1);
	    zeroOrderLength.should.equal(0);
	    zeroFirstColumn.should.equal(1);
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

	it('object order -- should work without .a', function(done){
	    var X = new MarketEngine({pushObject:1});
	    delete X.a;
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
		this.should.not.have.ownProperty('a');
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
		this.should.not.have.ownProperty('a');
		done();
	    });
	    X.push(order);
	});

	it('object order -- should veto order if rejected with reject(order) in before-order handler ', function(){
	    var X = new MarketEngine({pushObject:1});
	    var flag = 0;
	    var order = {q:20, buylimit: 100, id:5};	
	    var copy = Object.assign({}, order);
	    X.on('before-order', function(myorder, reject){
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
		reject(myorder); //veto
	    });
	    X.on('order', function(myorder){
		throw "this should not be called";
	    });
	    X.push(order);
	    X.a.should.eql([]);
	    X.count.should.eql(0);
	});


	it('object order -- should veto order if .ok set to zero in before-order handler ', function(){
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
	X.push([7,0,2,0,0,0,0]);
	Y.push({p:1,q:3});
	Y.push({p:1,q:2});
	Y.push({p:5,q:10});
	Y.push({p:7,q:2});
	X.reduceQ([2,0],[10,2]);
	Y.reduceQ([2,0],[10,2]);
	var throwX=0, throwY=0;
	/* excessive reduction */
	try {
	    X.reduceQ([3],[3]);
	} catch(e){
	    throwX = 1;
	}
	try {
	    Y.reduceQ([3],[3]);
	} catch(e){
	    throwY = 1;
	}
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
	it('should throw when quantity reduction makes q negative', function(){
	    assert.ok(throwX);
	    assert.ok(throwY);
	    assert.ok(X.a[3][4]===-1);
	    assert.ok(Y.a[3].q===-1);
	});
    });

    describe('trade', function(){
	it('should decrement quantities via reduceQ', function(){
	    var X = new MarketEngine({pushArray:1,  qCol:4});
	    var Y = new MarketEngine({pushObject:1, qCol:'q'});
	    X.push([1,0,3,0,0,0,0]);
	    X.push([1,0,2,0,0,0,0]);
	    X.push([5,0,10,0,0,0,0]);
	    Y.push({p:1,q:3});
	    Y.push({p:1,q:2});
	    Y.push({p:5,q:10});
	    X.trade({buyA:[2],buyQ:[10],sellA:[0],sellQ:[2]});
	    Y.trade({sellA:[2,0],sellQ:[10,2]});
	    assert.ok(X.a[0][4]===1);
	    assert.ok(Y.a[0].q===1);
	    assert.ok(X.a[1][4]===2);
	    assert.ok(Y.a[1].q===2);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(Y.a[2].q===0);
	}); 
	it('should emit trade, trade-cleanup and after-trade', function(){
	    var X = new MarketEngine();
	    var flag = {};
	    X.on('trade', function(){
		flag.should.eql({});
		flag.trade=1;
	    });
	    X.on('trade-cleanup', function(){
		flag.should.eql({trade:1});
		flag.cleanup=1;
	    });
	    X.on('after-trade', function(){
		flag.should.eql({trade:1,cleanup:1});
		flag.after=1;
	    });
	    X.trade();
	    flag.should.eql({trade:1,cleanup:1,after:1});
	});
    });

    describe('expire', function(){
	it('.expire(5000) should expire orders expiring earler than 5000 and not others', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, noBump:1});
	    X.push([1000,4000,10]);
	    X.push([1200,7000,5]);
	    X.push([1750,4500,3]);
	    X.push([2000,6000,4]);
	    X.push([2200,0,7]);
	    X.push([2500,4950,1]);
	    X.push([3000,6000,5]);
	    X.expire(5000);
	    assert.ok(X.a[0][4]===0);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===7);
	    assert.ok(X.a[5][4]===0);
	    assert.ok(X.a[6][4]===5);
	    X.trash.should.eql([0,2,5]);
	});

	it('.bump() should normally auto-expire orders expiring earlier than the last order (5000) and not others', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, tCol:2, txCol:3});
	    var bumpCount=0;
	    X.on('bump', function(){ bumpCount++; });
	    X.push([1000,4000,10]);
	    X.push([1200,7000,5]);
	    X.push([1750,4500,3]);
	    X.push([2000,6000,4]);
	    X.push([2200,0,7]);
	    X.push([2500,4950,1]);
	    X.push([3000,6000,5]);
	    X.push([5000,9000,6]);
	    assert.ok(bumpCount===1);
	    assert.ok(X.a[0][4]===0);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===7);
	    assert.ok(X.a[5][4]===0);
	    assert.ok(X.a[6][4]===5);
	    X.trash.should.eql([0,2,5]);
	});

	it('.expire(5000) should stil work when .trash does not exist', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, noBump:1});
	    delete X.trash;
	    X.push([1000,4000,10]);
	    X.push([1200,7000,5]);
	    X.push([1750,4500,3]);
	    X.push([2000,6000,4]);
	    X.push([2200,0,7]);
	    X.push([2500,4950,1]);
	    X.push([3000,6000,5]);
	    X.expire(5000);
	    assert.ok(X.a[0][4]===0);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===7);
	    assert.ok(X.a[5][4]===0);
	    assert.ok(X.a[6][4]===5);
	});

	it('.expire(5000) should not throw if .a does not exist', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, noBump:1});
	    delete X.a;
	    X.push([1000,4000,10]);
	    X.push([1200,7000,5]);
	    X.push([1750,4500,3]);
	    X.push([2000,6000,4]);
	    X.push([2200,0,7]);
	    X.push([2500,4950,1]);
	    X.push([3000,6000,5]);
	    X.expire(5000);
	    X.should.not.have.ownProperty('a');
	});

    });

    describe('cancel', function(){
	it('explicit cancel(4) should cancel orders by id 4 and not others', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, idCol:5, noBump:1});
	    X.push([1000,4000,10,1]);
	    X.push([1200,7000,5,3]);
	    X.push([1750,4500,3,4]);
	    X.push([2000,6000,4,7]);
	    X.push([2200,0,7,4]);
	    X.push([2500,4950,1,9]);
	    X.push([3000,6000,5,11]);
	    X.cancel(4);
	    assert.ok(X.a[0][4]===10);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===0);
	    assert.ok(X.a[5][4]===1);
	    assert.ok(X.a[6][4]===5);
	    X.trash.should.eql([4,2]);
	});

	it('bump should refer to cancelCol to recognize cancelReplace orders and cancel some earlier orders by same id', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, idCol:5, cancelCol:6});
	    X.push([1000,4000,10,1,0]);
	    X.push([1200,7000,5,3,0]);
	    X.push([1750,4500,3,4,0]);
	    X.push([2000,6000,4,7,0]);
	    X.push([2200,0,7,4,0]);
	    X.push([2500,4950,1,9,0]);
	    X.push([3000,6000,5,11,0]);
	    X.push([5000,0,2,4,1]); 
	    /* last order is cancelReplace from id 4 */
	    assert.ok(X.a[0][4]===10);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===0);
	    assert.ok(X.a[5][4]===1);
	    assert.ok(X.a[6][4]===5);
	    X.trash.should.eql([4,2]);
	});

	it('orders preceding a preceding cancelReplace order are not scanned and not deleted (for performance)', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, idCol:5, cancelCol:6});
	    X.o.noBump = true; /* turn off cancel/expire checking */
	    X.push([1000,4000,10,4,0]); /* changed id to 4, will not be scanned */
	    X.push([1200,7000,5,3,0]);
	    X.push([1750,4500,3,4,1]); /* set cancelCol for cancel replace */
	    X.push([2000,6000,4,7,0]); /* set cancelCol */
	    X.push([2200,0,7,4,0]);
	    X.push([2500,4950,1,9,0]);
	    X.push([3000,6000,5,11,0]);
	    X.o.noBump=false; /* turn cancel/expire checking on */
	    X.push([5000,0,2,4,1]); 
	    /* last order is cancelReplace from id 4 */
	    assert.ok(X.a[0][4]===10);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===0);
	    assert.ok(X.a[5][4]===1);
	    assert.ok(X.a[6][4]===5);
	    X.trash.should.eql([4,2]);
	});

	it('cancel(4) should still work if .trash does not exist', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, idCol:5, noBump:1});
	    delete X.trash;
	    X.push([1000,4000,10,1]);
	    X.push([1200,7000,5,3]);
	    X.push([1750,4500,3,4]);
	    X.push([2000,6000,4,7]);
	    X.push([2200,0,7,4]);
	    X.push([2500,4950,1,9]);
	    X.push([3000,6000,5,11]);
	    X.cancel(4);
	    assert.ok(X.a[0][4]===10);
	    assert.ok(X.a[1][4]===5);
	    assert.ok(X.a[2][4]===0);
	    assert.ok(X.a[3][4]===4);
	    assert.ok(X.a[4][4]===0);
	    assert.ok(X.a[5][4]===1);
	    assert.ok(X.a[6][4]===5);
	    X.should.not.have.ownProperty('trash');
	});

	it('cancel(4) should not throw if .a does not exist', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, idCol:5, noBump:1});
	    delete X.a;
	    X.push([1000,4000,10,1]);
	    X.push([1200,7000,5,3]);
	    X.push([1750,4500,3,4]);
	    X.push([2000,6000,4,7]);
	    X.push([2200,0,7,4]);
	    X.push([2500,4950,1,9]);
	    X.push([3000,6000,5,11]);
	    X.cancel(4);
	    X.should.not.have.ownProperty('a');
	});
    });

    describe('emptyTrash', function(){
	it('should return undefined if .trash or .a does not exist', function(){
	    var X = new MarketEngine();
	    delete X.trash;
	    var Y = new MarketEngine();
	    delete Y.a;
	    assert(X.emptyTrash()===undefined);
	    assert(Y.emptyTrash()===undefined);
	});

	it('should return deduplicated removal list', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, idCol:5, noBump:1});
	    X.push([1000,4000,10,1]);
	    X.push([1200,7000,5,3]);
	    X.push([1750,4500,3,4]);
	    X.push([2000,6000,4,7]);
	    X.push([2200,0,7,4]);
	    X.push([2500,4950,1,9]);
	    X.push([3000,6000,5,11]);
	    X.cancel(4);
	    X.expire(5000);
	    X.trash.should.eql([4,2,0,2,5]);
	    X.emptyTrash().should.eql([0,2,4,5]);
	});

	it('should delete previously cancelled and expired orders and leave others', function(){
	    var X = new MarketEngine({pushArray:1, qCol: 4, txCol:3, idCol:5, noBump:1});
	    X.push([1000,4000,10,1]);
	    X.push([1200,7000,5,3]);
	    X.push([1750,4500,3,4]);
	    X.push([2000,6000,4,7]);
	    X.push([2200,0,7,4]);
	    X.push([2500,4950,1,9]);
	    X.push([3000,6000,5,11]);
	    X.cancel(4);
	    X.expire(5000);
	    X.trash.should.eql([4,2,0,2,5]);
	    X.emptyTrash().should.eql([0,2,4,5]);
	    assert.ok(X.a.length===3);
	    X.a[0].slice(2).should.eql([1200,7000,5,3]);
	    X.a[1].slice(2).should.eql([2000,6000,4,7]);
	    X.a[2].slice(2).should.eql([3000,6000,5,11]);
	});

    });
    
    
    
});
