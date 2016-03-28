'use strict';

/**
 * @overview Provides an event broker to Cycle.js applications.
 * @author Daniel R Barnes
 */

import {
    uniq,
    without,
    concat,
    forEach,
    isString,
    isEmpty,
    isFunction,
    isError,
    trim,
    attempt,
    bind,
    flow
} from 'lodash';

const data = new WeakMap(),
    EVENT_ERROR = 'Parameter `event` must be a non-empty string.',
    CALLBACK_ERROR = 'Parameter `callback` must be a function.';

// UTILITY METHODS

function isValidEvent(event) {
    return isString(event) && !isEmpty(trim(event));
}

function isValidCallback(callback) {
    return isFunction(callback);
}

function throwIfNot(fn, arg, msg) {
    if (!fn(arg)) {
        throw new TypeError(msg);
    }
}

function announce(event, args, callback) {
    /* jshint -W040 */
    let error = attempt(bind(callback, this, ...args));
    if (isError(error)) {
        this.emit(Broker.Events.ERROR, {event, callback, error});
    }
}

function info(ctx, event) {
    let {map, keys} = data.get(ctx),
        key = keys[event] = keys[event] || {};
    return {map, key, listeners: map.get(key) || []};
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
 *     .subscribe(logger.error);
 * }
 *
 * // now use the class:
 * var myClass = new MyClass();
 * myClass.on('some-custom-event', function() {
 *   methodDoesNotExist(); // error logged automatically
 * });
 */
export class Broker {

    constructor() {
        data.set(this, {
            keys: {},
            map: new WeakMap()
        });
    }

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
    on(event, callback) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        throwIfNot(isValidCallback, callback, CALLBACK_ERROR);
        let {map, key, listeners} = info(this, event);
        map.set(key, uniq(concat(listeners, callback)));
        this.fire(Broker.Events.ADDED, {event, callback});
        return () => this.off(event, callback);
    }

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
    one(event, callback) {
        let single = flow(
            () => callback(...arguments),
            () => this.off(event, single)
        );
        return this.on(event, single);
    }

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
    off(event, callback) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        throwIfNot(isValidCallback, callback, CALLBACK_ERROR);
        let {key, map, listeners} = info(this, event),
            updated = without(listeners, callback);
        if (listeners.length !== updated.length) {
            if (isEmpty(updated)) {
                map.delete(key);
            } else {
                map.set(key, updated);
            }
            this.fire(Broker.Events.REMOVED, {event, callback});
        }
    }

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
    removeAllListeners(event) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        let {listeners} = info(this, event);
        forEach(listeners, (callback) =>
            this.off(event, callback));
    }

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
     * broker.on('add', function(...nums) {
     *    var sum = nums.reduce(function(result, num) {
     *        return result + num;
     *    }, 0);
     *    log.info('The sum of', nums, 'is', sum);
     * });
     * broker.emit('add', 1, 2, 3, 4, 5);
     */
    emit(event, ...args) {
        throwIfNot(isValidEvent, event, EVENT_ERROR);
        forEach(info(this, event).listeners,
            bind(announce, this, event, args));
    }

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
    static get Events () {
        return {

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
            ERROR: 'error',

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
            ADDED: 'listenerAdded',

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
            REMOVED: 'listenerRemoved'

        };
    }

}

// ALIASES

Broker.prototype.subscribe =
Broker.prototype.addListener =
Broker.prototype.on;

Broker.prototype.once =
Broker.prototype.one;

Broker.prototype.unsubscribe =
Broker.prototype.removeListener =
Broker.prototype.off;

Broker.prototype.fire =
Broker.prototype.announce =
Broker.prototype.emit;
