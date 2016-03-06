'use strict';

/**
 * @overview Provides an event broker to Cycle.js applications.
 * @author Daniel R Barnes
 */

var _ = require('lodash');

module.exports = (function getBrokerConstructor() {

    var data = new WeakMap(),
        EVENT_ERROR = 'Parameter `event` must be a non-empty string.',
        CALLBACK_ERROR = 'Parameter `callback` must be a function.';

    function isValidEvent(event) {
        return _.isString(event) && !_.isEmpty(_.trim(event));
    }

    function isValidCallback(callback) {
        return _.isFunction(callback);
    }

    function throwIfNot(fn, arg, msg) {
        if (!fn(arg)) {
            throw new TypeError(msg);
        }
    }

    function announce(event, args, callback) {
        /* jshint -W040 */
        var error = _.attempt(_.bind(callback, this, ...args));
        if(_.isError(error)) {
            this.emit(Broker.Events.ERROR, {event, callback, error});
        }
    }

    /**
     * Provides pub/sub functionality to Cycle.js applications.
     * @class Broker
     * @example
     * var broker = require('cycle-events')(); // create instance
     * var off = broker.on('my-custom-event', // register handler
     *   function myCallback(arg1, arg2) { ... }
     * );
     * broker.emit('my-custom-event', 'arg1', 'arg2'); // fire event
     * off(); // remove the event handler
     * @example
     * // add pub/sub functionality to a class and
     * // automatically log any errors caused by
     * // subscribers of the class:
     * function MyClass() {
     *   Broker.call(this); // mixin pub/sub
     *   Rx.Observable.fromEvent(this, 'error')
     *     .subscribeOnNext(logger.error);
     * }
     *
     * // now use the class:
     * var myClass = new MyClass();
     * myClass.on('some-custom-event', function() {
     *   methodDoesNotExist(); // error logged automatically
     * });
     */
    function Broker() {
        if (!(this instanceof Broker)) {
            return new Broker();
        }
        data.set(this, new Map());
    }

    /**
     * @event Broker#error
     * @type {Object}
     * @property {String} event The event the listener was registered for.
     * @property {Function} callback The listener that caused the error.
     * @property {Error} error The error that occurred while invoking the listener.
     * @desc An error occurred in an event listener while firing an event.
     * @example
     * broker.on(Broker.Events.ERROR, function(data) {
     *   log.error('An error occurred:', data.error);
     * });
     */

    /**
     * @event Broker#listenerAdded
     * @type {Object}
     * @property {String} event The event the listener was registered for.
     * @property {Function} callback The listener registered for the event.
     * @desc A listener was added. Examine the event properties for details.
     * @example
     * broker.on(Broker.Events.ADDED, function(data) {
     *   log(data.event); // 'my-custom-event'
     *   log(data.callback); // function callback() { ... }
     * });
     * broker.on('my-custom-event', function callback() { ... });
     */

    /**
     * @event Broker#listenerRemoved
     * @type {Object}
     * @property {String} event The event the listener was removed from.
     * @property {Function} callback The listener removed from the event.
     * @desc A listener was removed. Examine the event properties for details.
     * @example
     * broker.on(Broker.Events.REMOVED, function(data) {
     *   log(data.event); // 'my-custom-event'
     *   log(data.callback); // function callback() { ... }
     * });
     * var off = broker.on('my-custom-event', function callback() { ... });
     * off(); // remove the event handler
     */

    /**
     * Registers a listener for the specified event.
     * @function Broker#on
     * @alias Broker#subscribe
     * @alias Broker#addListener
     * @param event {String} The event to subscribe to.
     * @param callback {Function} The listener to invoke when the
     *  specified event is emitted.
     * @returns {Function} A method to invoke to remove the listener
     *  from the specified event.
     * @throws {TypeError} Parameter `event` must be a non-empty string.
     * @throws {TypeError} Parameter `callback` must be a function.
     * @fires Broker#listenerAdded
     * @example
     * // register an event handler:
     * broker.on('my-custom-event', myEventHandler(arg1, arg2) { ... };
     * // invoke the event handler (any any others registered):
     * broker.emit('my-custom-event', 'arg1', 'arg2');
     */
    Broker.prototype.on =
    Broker.prototype.subscribe =
    Broker.prototype.addListener = function on(event, callback) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        throwIfNot(isValidCallback, callback, CALLBACK_ERROR);
        data.get(this).set(event, _.uniq(_.concat(data.get(this).get(event), callback)));
        this.fire(Broker.Events.ADDED, {event, callback});
        return this.off.bind(this, event, callback);
    };

    /**
     * Registers a listener for the specified event, but ensures the
     * listener will only be fired at most 1 time. Once a listener has
     * been invoked, it will automatically be removed.
     * @function Broker#one
     * @alias Broker#once
     * @param event {String} The event to subscribe to.
     * @param callback {Function} The listener to invoke when the
     *  specified event is emitted.
     * @returns {Function} A method to invoke to remove the listener
     *  from the specified event.
     * @throws {TypeError} Parameter `event` must be a non-empty string.
     * @throws {TypeError} Parameter `callback` must be a function.
     * @fires Broker#listenerAdded
     * @example
     * // register a handler to only run once:
     * broker.one('my-custom-event', myEventHandler(arg1, arg2) { ... };
     * // the handler will be removed after being invoked:
     * broker.emit('my-custom-event', 'arg1', 'arg2');
     */
    Broker.prototype.one =
    Broker.prototype.once = function one(event, callback) {
        var off = this.on(event, function single() {
            callback(...arguments);
            off();
        });
        return off;
    };

    /**
     * Removes the specified listener for the specified event.
     * @function Broker#off
     * @alias Broker#unsubscribe
     * @alias Broker#removeListener
     * @param event {String} The event whose listener should
     *  be removed.
     * @param callback {Function} The listener to remove.
     * @throws {TypeError} Parameter `event` must be a non-empty string.
     * @throws {TypeError} Parameter `callback` must be a function.
     * @fires Broker#listenerRemoved
     * @example
     * function myHandler() { ... }
     * broker.on('my-custom-event', myHandler);
     * broker.off('my-custom-event', myHandler);
     */
    Broker.prototype.off =
    Broker.prototype.unsubscribe =
    Broker.prototype.removeListener = function off(event, callback) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        throwIfNot(isValidCallback, callback, CALLBACK_ERROR);
        var before = data.get(this).get(event) || [],
            after = _.without(before, callback);
        if (before.length !== after.length) {
            if (_.isEmpty(after)) {
                data.get(this).delete(event);
            } else {
                data.get(this).set(event, after);
            }
            this.fire(Broker.Events.REMOVED, {event, callback});
        }
    };

    /**
     * Removes all listeners registered for the specified event.
     * @function Broker#removeAllListeners
     * @param event {String} The event whose listeners should
     *  all be removed.
     * @throws {TypeError} Parameter `event` must be a non-empty string.
     * @throws {TypeError} Parameter `callback` must be a function.
     * @fires Broker#listenerRemoved
     * @example
     * broker.on('custom-event', function myHandler1() { ... });
     * broker.on('custom-event', function myHandler2() { ... });
     * broker.emit('custom-event'); // both handlers invoked
     * broker.removeAllListeners('custom-event');
     * broker.emit('custom-event'); // no handlers invoked
     */
    Broker.prototype.removeAllListeners = function removeAll(event) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        _.forEach(data.get(this).get(event), this.off.bind(this, event));
    };

    /**
     * Invokes any listeners for the specified event--in the order they
     * were registered--and passes any provided arguments to those listeners.
     * If a listener throws an exception, the [error]{@link event:Broker#error}
     * event will be emitted but subsequent listeners will still be invoked.
     * @function Broker#emit
     * @alias Broker#fire
     * @alias Broker#announce
     * @param event {String} The event to emit.
     * @param args {*} Any additional arguments to pass to listeners.
     * @throws {TypeError} Parameter `event` must be a non-empty string.
     * @fires Broker#error
     * @example
     * broker.on('my-custom-event', function() { ... });
     * broker.emit('my-custom-event'); // handler fired
     * @example
     * broker.on('log', function(msg, ...args) {
     *    log.write(msg, args);
     * });
     * broker.emit('log', 'Today is %s', new Date());
     * @example
     * broker.on('sum', function(...nums) {
     *    var sum = nums.reduce(function(result, num) {
     *        return result + num;
     *    }, 0);
     *    log.info('The sum of', nums, 'is', sum);
     * });
     * broker.emit('add', 1, 2, 3, 4, 5);
     */
    Broker.prototype.emit =
    Broker.prototype.fire =
    Broker.prototype.announce = function emit(event, ...args) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        var listeners = _.concat(data.get(this).get(event));
        _.forEach(listeners, _.bind(announce, this, event, args));
    };

    /**
     * @typedef Broker~Events
     * @type {Object}
     * @property {String} ERROR 'error' - An error occurred in an event listener.
     * @property {String} ADDED 'listenerAdded' - An event listener was registered.
     * @property {String} REMOVED 'listenerRemoved' - An event listener was removed.
     */

    /**
     * @member {Broker~Events} Broker.Events
     * @desc An enumeration of event names used internally that external
     *  callers can also subscribe to.
     * @example
     * broker.on(Broker.Events.ADDED, function listenerAdded() { ... });
     * broker.on(Broker.Events.ERROR, function errorOccurred() { ... });
     */
    Broker.Events = {
        ERROR: 'error',
        ADDED: 'listenerAdded',
        REMOVED: 'listenerRemoved'
    };

    return Broker;

})();
