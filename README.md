# cycle-events
Provides event-based pub/sub to cycle.js applications.

## Installation
`npm i cycle-events --save`

## Scripts
NOTE: Make sure you've installed all dependencies using `npm install` first.

To generate documentation: `npm run doc`. This will create documentation in the
`build/docs` folder.

To run unit tests: `npm test`

## API
### Broker
**Kind**: global class  

* [Broker](#Broker)
    * [new Broker()](#new_Broker_new)
    * _instance_
        * [.on(event, callback)](#Broker+on) ⇒ <code>function</code>
        * [.one(event, callback)](#Broker+one) ⇒ <code>function</code>
        * [.off(event, callback)](#Broker+off)
        * [.removeAllListeners(event)](#Broker+removeAllListeners)
        * [.emit(event, args)](#Broker+emit)
        * ["error"](#Broker+event_error)
        * ["listenerAdded"](#Broker+event_listenerAdded)
        * ["listenerRemoved"](#Broker+event_listenerRemoved)
    * _static_
        * [.Events](#Broker.Events) : <code>[Events](#Broker..Events)</code>
    * _inner_
        * [~Events](#Broker..Events) : <code>Object</code>

<a name="new_Broker_new"></a>
### new Broker()
Provides pub/sub functionality to Cycle.js applications.

**Example**  
```js
var broker = require('cycle-events')(); // create instance
var off = broker.on('my-custom-event', // register handler
  function myCallback(arg1, arg2) { ... }
);
broker.emit('my-custom-event', 'arg1', 'arg2'); // fire event
off(); // remove the event handler
```
**Example**  
```js
// add pub/sub functionality to a class and
// automatically log any errors caused by
// subscribers of the class:
function MyClass() {
  Broker.call(this); // mixin pub/sub
  Rx.Observable.fromEvent(this, 'error')
    .subscribeOnNext(logger.error);
}

// now use the class:
var myClass = new MyClass();
myClass.on('some-custom-event', function() {
  methodDoesNotExist(); // error logged automatically
});
```
<a name="Broker+on"></a>
### broker.on(event, callback) ⇒ <code>function</code>
Registers a listener for the specified event.

**Kind**: instance method of <code>[Broker](#Broker)</code>  
**Returns**: <code>function</code> - A method to invoke to remove the listener
 from the specified event.  
**Throws**:

- <code>TypeError</code> Parameter `event` must be a non-empty string.
- <code>TypeError</code> Parameter `callback` must be a function.

**Emits**: <code>[listenerAdded](#Broker+event_listenerAdded)</code>  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event to subscribe to. |
| callback | <code>function</code> | The listener to invoke when the  specified event is emitted. |

**Example**  
```js
// register an event handler:
broker.on('my-custom-event', myEventHandler(arg1, arg2) { ... };
// invoke the event handler (any any others registered):
broker.emit('my-custom-event', 'arg1', 'arg2');
```
<a name="Broker+one"></a>
### broker.one(event, callback) ⇒ <code>function</code>
Registers a listener for the specified event, but ensures the
listener will only be fired at most 1 time. Once a listener has
been invoked, it will automatically be removed.

**Kind**: instance method of <code>[Broker](#Broker)</code>  
**Returns**: <code>function</code> - A method to invoke to remove the listener
 from the specified event.  
**Throws**:

- <code>TypeError</code> Parameter `event` must be a non-empty string.
- <code>TypeError</code> Parameter `callback` must be a function.

**Emits**: <code>[listenerAdded](#Broker+event_listenerAdded)</code>  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event to subscribe to. |
| callback | <code>function</code> | The listener to invoke when the  specified event is emitted. |

**Example**  
```js
// register a handler to only run once:
broker.one('my-custom-event', myEventHandler(arg1, arg2) { ... };
// the handler will be removed after being invoked:
broker.emit('my-custom-event', 'arg1', 'arg2');
```
<a name="Broker+off"></a>
### broker.off(event, callback)
Removes the specified listener for the specified event.

**Kind**: instance method of <code>[Broker](#Broker)</code>  
**Throws**:

- <code>TypeError</code> Parameter `event` must be a non-empty string.
- <code>TypeError</code> Parameter `callback` must be a function.

**Emits**: <code>[listenerRemoved](#Broker+event_listenerRemoved)</code>  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event whose listener should  be removed. |
| callback | <code>function</code> | The listener to remove. |

**Example**  
```js
function myHandler() { ... }
broker.on('my-custom-event', myHandler);
broker.off('my-custom-event', myHandler);
```
<a name="Broker+removeAllListeners"></a>
### broker.removeAllListeners(event)
Removes all listeners registered for the specified event.

**Kind**: instance method of <code>[Broker](#Broker)</code>  
**Throws**:

- <code>TypeError</code> Parameter `event` must be a non-empty string.
- <code>TypeError</code> Parameter `callback` must be a function.

**Emits**: <code>[listenerRemoved](#Broker+event_listenerRemoved)</code>  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event whose listeners should  all be removed. |

**Example**  
```js
broker.on('custom-event', function myHandler1() { ... });
broker.on('custom-event', function myHandler2() { ... });
broker.emit('custom-event'); // both handlers invoked
broker.removeAllListeners('custom-event');
broker.emit('custom-event'); // no handlers invoked
```
<a name="Broker+emit"></a>
### broker.emit(event, args)
Invokes any listeners for the specified event--in the order they
were registered--and passes any provided arguments to those listeners.
If a listener throws an exception, the [error](event:Broker#error)
event will be emitted but subsequent listeners will still be invoked.

**Kind**: instance method of <code>[Broker](#Broker)</code>  
**Throws**:

- <code>TypeError</code> Parameter `event` must be a non-empty string.

**Emits**: <code>[error](#Broker+event_error)</code>  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event to emit. |
| args | <code>\*</code> | Any additional arguments to pass to listeners. |

**Example**  
```js
broker.on('my-custom-event', function() { ... });
broker.emit('my-custom-event'); // handler fired
```
**Example**  
```js
broker.on('log', function(msg, ...args) {
   log.write(msg, args);
});
broker.emit('log', 'Today is %s', new Date());
```
**Example**  
```js
broker.on('sum', function(...nums) {
   var sum = nums.reduce(function(result, num) {
       return result + num;
   }, 0);
   log.info('The sum of', nums, 'is', sum);
});
broker.emit('add', 1, 2, 3, 4, 5);
```
<a name="Broker+event_error"></a>
### "error"
An error occurred in an event listener while firing an event.

**Kind**: event emitted by <code>[Broker](#Broker)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event the listener was registered for. |
| callback | <code>function</code> | The listener that caused the error. |
| error | <code>Error</code> | The error that occurred while invoking the listener. |

**Example**  
```js
broker.on(Broker.Events.ERROR, function(data) {
  log.error('An error occurred:', data.error);
});
```
<a name="Broker+event_listenerAdded"></a>
### "listenerAdded"
A listener was added. Examine the event properties for details.

**Kind**: event emitted by <code>[Broker](#Broker)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event the listener was registered for. |
| callback | <code>function</code> | The listener registered for the event. |

**Example**  
```js
broker.on(Broker.Events.ADDED, function(data) {
  log(data.event); // 'my-custom-event'
  log(data.callback); // function callback() { ... }
});
broker.on('my-custom-event', function callback() { ... });
```
<a name="Broker+event_listenerRemoved"></a>
### "listenerRemoved"
A listener was removed. Examine the event properties for details.

**Kind**: event emitted by <code>[Broker](#Broker)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| event | <code>String</code> | The event the listener was removed from. |
| callback | <code>function</code> | The listener removed from the event. |

**Example**  
```js
broker.on(Broker.Events.REMOVED, function(data) {
  log(data.event); // 'my-custom-event'
  log(data.callback); // function callback() { ... }
});
var off = broker.on('my-custom-event', function callback() { ... });
off(); // remove the event handler
```
<a name="Broker.Events"></a>
### Broker.Events : <code>[Events](#Broker..Events)</code>
An enumeration of event names used internally that external
 callers can also subscribe to.

**Kind**: static property of <code>[Broker](#Broker)</code>  
**Example**  
```js
broker.on(Broker.Events.ADDED, function listenerAdded() { ... });
broker.on(Broker.Events.ERROR, function errorOccurred() { ... });
```
<a name="Broker..Events"></a>
### Broker~Events : <code>Object</code>
**Kind**: inner typedef of <code>[Broker](#Broker)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| ERROR | <code>String</code> | 'error' - An error occurred in an event listener. |
| ADDED | <code>String</code> | 'listenerAdded' - An event listener was registered. |
| REMOVED | <code>String</code> | 'listenerRemoved' - An event listener was removed. |

