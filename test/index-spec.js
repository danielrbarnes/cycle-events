'use strict';

var Broker = require('../index');
var expect = require('chai').expect;

function testEventParam(broker, method) {
    [
        [],
        [123],
        [/rx/],
        [new Date()],
        [null],
        [undefined],
        [NaN],
        [''],
        ['      ']
    ].forEach(function(args) {
        expect(function() {
            broker[method].apply(broker, args);
        }).to.throw(TypeError, 'Parameter `event` must be a non-empty string.');
    });
}

function testCallbackParam(broker, method) {
    [
        [],
        [123],
        [/rx/],
        [new Date()],
        [null],
        [undefined],
        [NaN]
    ].forEach(function(args) {
        expect(function() {
            args.unshift('event-name');
            broker[method].apply(broker, args);
        }).to.throw(TypeError, 'Parameter `callback` must be a function.');
    });
}

describe('Broker', function() {

    describe('as constructor', function() {

        it('is a function', function() {
            expect(Broker).to.be.a('function');
        });

        it('returns instance (called with new)', function() {
            expect(new Broker()).to.be.an.instanceof(Broker);
        });

        it('returns instance (called without new)', function() {
            expect(Broker()).to.be.an.instanceof(Broker);
        });

    });

    describe('static Events enumeration', function() {

        /* jshint -W030 */

        it('is accessible from class', function() {
            expect(Broker.Events).not.to.be.undefined;
        });

        it('is not accessible from object', function() {
            var broker = new Broker();
            expect(broker.Events).to.be.undefined;
        });

        it('has expected built-in events', function() {
            expect(Broker.Events).to.include.keys(['ERROR', 'ADDED', 'REMOVED']);
        });

    });

    describe('instance methods', function() {

        beforeEach(function createInstance() {
            this.broker = new Broker();
        });

        describe('.on', function() {

            it('is alias of subscribe', function() {
                expect(this.broker.on).to.equal(this.broker.subscribe);
            });

            it('is alias of addListener', function() {
                expect(this.broker.on).to.equal(this.broker.addListener);
            });

            it('throws if non-string passed for event', function() {
                testEventParam(this.broker, 'on');
            });

            it('throws if non-function passed for callback', function() {
                testCallbackParam(this.broker, 'on');
            });

            it('does not throw if string and function passed', function() {
                this.broker.on('event-name', Function.prototype);
            });

            it('fires `listenerAdded` event for event and callback', function(done) {
                this.broker.on(Broker.Events.ADDED, function(data) {
                    expect(data.event).to.equal('custom-event');
                    expect(data.callback).to.equal(Function.prototype);
                    done();
                });
                this.broker.on('custom-event', Function.prototype);
            });

            it('returns function', function() {
                expect(this.broker.on('custom-event', Function.prototype)).to.be.a('function');
            });

        });

        describe('.one', function() {

            it('is alias of once', function() {
                expect(this.broker.one).to.be.equal(this.broker.once);
            });

            it('returns function', function() {
                expect(this.broker.one('event', Function.prototype)).to.be.a('function');
            });

            it('delegates to `on`', function(done) {
                this.broker.on = function spy(event, callback) {
                    expect(event).to.equal('event');
                    expect(callback).to.be.a('function');
                    expect(callback.name).to.equal('single');
                    done();
                };
                this.broker.one('event', Function.prototype);
            });

        });

        describe('.off', function() {

            it('is alias of unsubscribe', function() {
                expect(this.broker.off).to.equal(this.broker.unsubscribe);
            });

            it('is alias of removeListener', function() {
                expect(this.broker.off).to.equal(this.broker.removeListener);
            });

            it('throws if non-string passed for event', function() {
                testEventParam(this.broker, 'off');
            });

            it('throws if non-function passed for callback', function() {
                testCallbackParam(this.broker, 'off');
            });

            it('does not throw if string and function passed', function() {
                this.broker.off('event', Function.prototype);
            });

            it('fires `listenerRemoved` event for event and callback', function(done) {
                this.broker.on('custom-event', Function.prototype);
                this.broker.on(Broker.Events.REMOVED, function(data) {
                    expect(data.event).to.equal('custom-event');
                    expect(data.callback).to.equal(Function.prototype);
                    done();
                });
                this.broker.off('custom-event', Function.prototype);
            });

            it('does not fire `listenerRemoved` event if listener not added', function(done) {
                this.broker.on(Broker.Events.REMOVED, function() {
                    done(new Error('this should not be reached'));
                });
                this.broker.off('custom-event', Function.prototype);
                done();
            });

        });

        describe('.removeAllListeners', function() {

            it('throws if non-string passed for event', function() {
                testEventParam(this.broker, 'removeAllListeners');
            });

            it('does not throw if string passed', function() {
                this.broker.removeAllListeners('custom-event');
            });

            it('invokes `off` for each registered listener', function(done) {
                var count = 0;
                this.broker.off = function spy(event, callback) {
                    expect(event).to.equal('custom-event');
                    expect(callback).to.be.a('function');
                    if (++count == 4) {
                        done();
                    }
                };
                this.broker.on('custom-event', function() {});
                this.broker.on('custom-event', function() {});
                this.broker.on('custom-event', function() {});
                this.broker.on('custom-event', function() {});
                this.broker.removeAllListeners('custom-event');
            });

        });

        describe('.emit', function() {

            it('throws if non-string passed for event', function() {
                testEventParam(this.broker, 'emit');
            });

            it('does not throw if string passed', function() {
                this.broker.emit('custom-event');
            });

        });

        describe('end-to-end:', function() {

            it('`on` does not add same listener twice', function() {
                var callCount = 0;
                function callback() {
                    callCount++;
                }
                this.broker.on('event', callback);
                this.broker.on('event', callback);
                this.broker.on('event', callback);
                this.broker.on('event', callback);
                this.broker.on('event', callback);
                expect(callCount).to.equal(0);
                this.broker.emit('event');
                expect(callCount).to.equal(1);
            });

            it('method returned by `on` removes callback', function() {
                var callCount = 0;
                var off = this.broker.on('event', function() {
                    callCount++;
                });
                expect(callCount).to.equal(0);
                this.broker.emit('event');
                expect(callCount).to.equal(1);
                off();
                this.broker.emit('event');
                expect(callCount).to.equal(1);
            });

            it('listener invoked when matching event emitted', function(done) {
                this.broker.on('event', done);
                this.broker.emit('event');
            });

            it('listener not invoked when non-matching event emitted', function() {
                var called = false;
                this.broker.on('event', function() {
                    called = true;
                });
                expect(called).to.equal(false);
                this.broker.emit('another-event');
                expect(called).to.equal(false);
            });

            it('listeners invoked in order registered', function() {
                var num = 0,
                    called = [],
                    create = function() {
                        return function() {
                            called.push(++num);
                        };
                    };
                this.broker.on('event', create());
                this.broker.on('event', create());
                this.broker.on('event', create());
                this.broker.on('event', create());
                this.broker.on('event', create());
                expect(called).to.eql([]);
                this.broker.emit('event');
                expect(called).to.eql([1, 2, 3, 4, 5]);
            });

            it('listeners receive any args passed to emit', function(done) {
                this.broker.on('event', function(arg1, arg2, arg3) {
                    expect(arg1).to.equal(123);
                    expect(arg2).to.equal('abc');
                    expect(arg3).to.equal(null);
                    done();
                });
                this.broker.emit('event', 123, 'abc', null);
            });

            it('listeners have broker instance as context', function(done) {
                var broker = this.broker;
                this.broker.on('event', function() {
                    expect(this).to.equal(broker);
                    done();
                });
                this.broker.emit('event');
            });

            it('errors in listeners fire ERROR event', function(done) {
                var err = new Error();
                function callback() {
                    throw err;
                }
                this.broker.on(Broker.Events.ERROR, function(data) {
                    expect(data.event).to.equal('custom-event');
                    expect(data.callback).to.equal(callback);
                    expect(data.error).to.equal(err);
                    done();
                });
                this.broker.on('custom-event', callback);
                this.broker.emit('custom-event');
            });

            it('errors during emit still invoke other listeners', function(done) {
                this.broker.on('event', function() {});
                this.broker.on('event', function() {});
                this.broker.on('event', function() { throw new Error(); });
                this.broker.on('event', function() {});
                this.broker.on('event', done);
                this.broker.emit('event');
            });

            it('listener from `one` removed after invoked', function() {
                var callCount = 0;
                this.broker.one('event', function() {
                    callCount++;
                });
                expect(callCount).to.equal(0);
                this.broker.emit('event');
                expect(callCount).to.equal(1);
                this.broker.emit('event');
                expect(callCount).to.equal(1);
            });

            it('removing callback during emit does not cause skip', function() {
                var num = 0,
                    called = [],
                    broker = this.broker,
                    create = function() {
                        var fn = function() {
                            if (++num === 3) {
                                broker.off('event', fn);
                            } else {
                                called.push(num);
                            }
                        };
                        return fn;
                    };
                this.broker.on('event', create());
                this.broker.on('event', create());
                this.broker.on('event', create());
                this.broker.on('event', create());
                this.broker.on('event', create());
                expect(called).to.eql([]);
                this.broker.emit('event');
                expect(called).to.eql([1, 2, 4, 5]);
            });

            it('`off` removes callback for event', function() {
                var called = false;
                var off = this.broker.on('event', function() {
                    called = true;
                });
                expect(called).to.equal(false);
                off();
                this.broker.emit('event');
                expect(called).to.equal(false);
            });

            it('same callback can be registered for multiple events', function() {
                var callCount = 0,
                    callback = function() {
                        callCount++;
                    };
                this.broker.on('event-1', callback);
                this.broker.on('event-2', callback);
                expect(callCount).to.equal(0);
                this.broker.emit('event-2');
                expect(callCount).to.equal(1);
                this.broker.emit('event-1');
                expect(callCount).to.equal(2);
                this.broker.emit('event-1');
                expect(callCount).to.equal(3);
            });

            it('`off` does not remove non-matching callbacks', function(done) {
                this.broker.on('event', done);
                this.broker.on('another', Function.prototype);
                this.broker.off('another', Function.prototype);
                this.broker.emit('event');
            });

            it('`removeAllListeners` does not affect non-matching event callbacks', function(done) {
                this.broker.on('event', done);
                this.broker.on('another', Function.prototype);
                this.broker.removeAllListeners('another');
                this.broker.emit('event');
            });

        });

    });

    describe('Observable.fromEvent', function() {

        beforeEach(function() {
            this.broker = new Broker();
            this.obs = require('rxjs').Observable;
        });

        it('passes arguments to subscribers', function(done) {
            var testArg = {a: 'b'};
            this.obs.fromEvent(this.broker, 'event')
                .subscribe(function onNext(arg) {
                    expect(arg).to.equal(testArg);
                    done();
                });
            this.broker.emit('event', testArg);
        });

        it('invokes selector if provided', function(done) {

            var index = 0,
                values = [0, 2, 4, 6, 8],
                broker = this.broker;

            this.obs.fromEvent(broker, 'event',
                function selector(num) {
                    return num * 2;
                })
                .subscribe(function onNext(value) {
                    expect(value).to.equal(values[index++]);
                    if (index >= values.length) {
                        done();
                    }
                });

            this.obs.range(0, values.length)
                .subscribe(function(num) {
                    broker.emit('event', num);
                });

        });

    });

});
