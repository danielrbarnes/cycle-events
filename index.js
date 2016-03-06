'use strict';

/**
 * @overview Provides an event broker to Cycle.js applications.
 * @author Daniel R Barnes
 */

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Broker = undefined;

var _forEach = require('lodash\\forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _without = require('lodash\\without');

var _without2 = _interopRequireDefault(_without);

var _flow = require('lodash\\flow');

var _flow2 = _interopRequireDefault(_flow);

var _concat = require('lodash\\concat');

var _concat2 = _interopRequireDefault(_concat);

var _uniq = require('lodash\\uniq');

var _uniq2 = _interopRequireDefault(_uniq);

var _isError = require('lodash\\isError');

var _isError2 = _interopRequireDefault(_isError);

var _bind = require('lodash\\bind');

var _bind2 = _interopRequireDefault(_bind);

var _attempt = require('lodash\\attempt');

var _attempt2 = _interopRequireDefault(_attempt);

var _isFunction = require('lodash\\isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _trim = require('lodash\\trim');

var _trim2 = _interopRequireDefault(_trim);

var _isEmpty = require('lodash\\isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _isString = require('lodash\\isString');

var _isString2 = _interopRequireDefault(_isString);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var data = new WeakMap(),
    EVENT_ERROR = 'Parameter `event` must be a non-empty string.',
    CALLBACK_ERROR = 'Parameter `callback` must be a function.';

// UTILITY METHODS

function isValidEvent(event) {
    return (0, _isString2.default)(event) && !(0, _isEmpty2.default)((0, _trim2.default)(event));
}

function isValidCallback(callback) {
    return (0, _isFunction2.default)(callback);
}

function throwIfNot(fn, arg, msg) {
    if (!fn(arg)) {
        throw new TypeError(msg);
    }
}

function announce(event, args, callback) {
    /* jshint -W040 */
    var error = (0, _attempt2.default)(_bind2.default.apply(undefined, [callback, this].concat(_toConsumableArray(args))));
    if ((0, _isError2.default)(error)) {
        this.emit(Broker.Events.ERROR, { event: event, callback: callback, error: error });
    }
}

function info(ctx, event) {
    var _data$get = data.get(ctx);

    var map = _data$get.map;
    var keys = _data$get.keys;
    var key = keys[event] = keys[event] || {};
    return { map: map, key: key, listeners: map.get(key) || [] };
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

var Broker = exports.Broker = function () {
    function Broker() {
        _classCallCheck(this, Broker);

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


    _createClass(Broker, [{
        key: 'on',
        value: function on(event, callback) {
            var _this = this;

            throwIfNot(isValidEvent, event, EVENT_ERROR);
            throwIfNot(isValidCallback, callback, CALLBACK_ERROR);

            var _info = info(this, event);

            var map = _info.map;
            var key = _info.key;
            var listeners = _info.listeners;

            map.set(key, (0, _uniq2.default)((0, _concat2.default)(listeners, callback)));
            this.fire(Broker.Events.ADDED, { event: event, callback: callback });
            return function () {
                return _this.off(event, callback);
            };
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

    }, {
        key: 'one',
        value: function one(event, callback) {
            var _arguments = arguments,
                _this2 = this;

            var single = (0, _flow2.default)(function () {
                return callback.apply(undefined, _arguments);
            }, function () {
                return _this2.off(event, single);
            });
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

    }, {
        key: 'off',
        value: function off(event, callback) {
            throwIfNot(isValidEvent, event, EVENT_ERROR);
            throwIfNot(isValidCallback, callback, CALLBACK_ERROR);

            var _info2 = info(this, event);

            var key = _info2.key;
            var map = _info2.map;
            var listeners = _info2.listeners;
            var updated = (0, _without2.default)(listeners, callback);
            if (listeners.length !== updated.length) {
                if ((0, _isEmpty2.default)(updated)) {
                    map.delete(key);
                } else {
                    map.set(key, updated);
                }
                this.fire(Broker.Events.REMOVED, { event: event, callback: callback });
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

    }, {
        key: 'removeAllListeners',
        value: function removeAllListeners(event) {
            var _this3 = this;

            throwIfNot(isValidEvent, event, EVENT_ERROR);

            var _info3 = info(this, event);

            var listeners = _info3.listeners;

            (0, _forEach2.default)(listeners, function (callback) {
                return _this3.off(event, callback);
            });
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
         * broker.on('sum', function(...nums) {
         *    var sum = nums.reduce(function(result, num) {
         *        return result + num;
         *    }, 0);
         *    log.info('The sum of', nums, 'is', sum);
         * });
         * broker.emit('add', 1, 2, 3, 4, 5);
         */

    }, {
        key: 'emit',
        value: function emit(event) {
            throwIfNot(isValidEvent, event, EVENT_ERROR);

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            (0, _forEach2.default)(info(this, event).listeners, (0, _bind2.default)(announce, this, event, args));
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

    }], [{
        key: 'Events',
        get: function get() {
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
    }]);

    return Broker;
}();

// ALIASES

Broker.prototype.subscribe = Broker.prototype.addListener = Broker.prototype.on;

Broker.prototype.once = Broker.prototype.one;

Broker.prototype.unsubscribe = Broker.prototype.removeListener = Broker.prototype.off;

Broker.prototype.fire = Broker.prototype.announce = Broker.prototype.emit;
