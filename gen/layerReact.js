(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.layerReact = factory());
}(this, (function () { 'use strict';

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    /*
    object-assign
    (c) Sindre Sorhus
    @license MIT
    */

    /* eslint-disable no-unused-vars */
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;

    function toObject(val) {
    	if (val === null || val === undefined) {
    		throw new TypeError('Object.assign cannot be called with null or undefined');
    	}

    	return Object(val);
    }

    function shouldUseNative() {
    	try {
    		if (!Object.assign) {
    			return false;
    		}

    		// Detect buggy property enumeration order in older V8 versions.

    		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
    		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
    		test1[5] = 'de';
    		if (Object.getOwnPropertyNames(test1)[0] === '5') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test2 = {};
    		for (var i = 0; i < 10; i++) {
    			test2['_' + String.fromCharCode(i)] = i;
    		}
    		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
    			return test2[n];
    		});
    		if (order2.join('') !== '0123456789') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test3 = {};
    		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
    			test3[letter] = letter;
    		});
    		if (Object.keys(Object.assign({}, test3)).join('') !==
    				'abcdefghijklmnopqrst') {
    			return false;
    		}

    		return true;
    	} catch (err) {
    		// We don't expect any of the above to throw, but better to be safe.
    		return false;
    	}
    }

    var index$2 = shouldUseNative() ? Object.assign : function (target, source) {
    	var from;
    	var to = toObject(target);
    	var symbols;

    	for (var s = 1; s < arguments.length; s++) {
    		from = Object(arguments[s]);

    		for (var key in from) {
    			if (hasOwnProperty.call(from, key)) {
    				to[key] = from[key];
    			}
    		}

    		if (getOwnPropertySymbols) {
    			symbols = getOwnPropertySymbols(from);
    			for (var i = 0; i < symbols.length; i++) {
    				if (propIsEnumerable.call(from, symbols[i])) {
    					to[symbols[i]] = from[symbols[i]];
    				}
    			}
    		}
    	}

    	return to;
    };

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */
    /**
     * WARNING: DO NOT manually require this module.
     * This is a replacement for `invariant(...)` used by the error code system
     * and will _only_ be required by the corresponding babel pass.
     * It always throws.
     */

    function reactProdInvariant(code) {
      var argCount = arguments.length - 1;

      var message = 'Minified React error #' + code + '; visit ' + 'http://facebook.github.io/react/docs/error-decoder.html?invariant=' + code;

      for (var argIdx = 0; argIdx < argCount; argIdx++) {
        message += '&args[]=' + encodeURIComponent(arguments[argIdx + 1]);
      }

      message += ' for the full message or use the non-minified dev environment' + ' for full errors and additional helpful warnings.';

      var error = new Error(message);
      error.name = 'Invariant Violation';
      error.framesToPop = 1; // we don't care about reactProdInvariant's own frame

      throw error;
    }

    var reactProdInvariant_1 = reactProdInvariant;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    function makeEmptyFunction(arg) {
      return function () {
        return arg;
      };
    }

    /**
     * This function accepts and discards inputs; it has no side effects. This is
     * primarily useful idiomatically for overridable function endpoints which
     * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
     */
    var emptyFunction$1 = function emptyFunction() {};

    emptyFunction$1.thatReturns = makeEmptyFunction;
    emptyFunction$1.thatReturnsFalse = makeEmptyFunction(false);
    emptyFunction$1.thatReturnsTrue = makeEmptyFunction(true);
    emptyFunction$1.thatReturnsNull = makeEmptyFunction(null);
    emptyFunction$1.thatReturnsThis = function () {
      return this;
    };
    emptyFunction$1.thatReturnsArgument = function (arg) {
      return arg;
    };

    var emptyFunction_1 = emptyFunction$1;

    var emptyFunction = emptyFunction_1;

    /**
     * Similar to invariant but only logs a warning if the condition is not met.
     * This can be used to log issues in development environments in critical
     * paths. Removing the logging code for production environments will keep the
     * same logic and follow the same code paths.
     */

    var warning$1 = emptyFunction;

    var warning_1 = warning$1;

    function warnNoop(publicInstance, callerName) {
      
    }

    /**
     * This is the abstract API for an update queue.
     */
    var ReactNoopUpdateQueue$1 = {
      /**
       * Checks whether or not this composite component is mounted.
       * @param {ReactClass} publicInstance The instance we want to test.
       * @return {boolean} True if mounted, false otherwise.
       * @protected
       * @final
       */
      isMounted: function (publicInstance) {
        return false;
      },

      /**
       * Enqueue a callback that will be executed after all the pending updates
       * have processed.
       *
       * @param {ReactClass} publicInstance The instance to use as `this` context.
       * @param {?function} callback Called after state is updated.
       * @internal
       */
      enqueueCallback: function (publicInstance, callback) {},

      /**
       * Forces an update. This should only be invoked when it is known with
       * certainty that we are **not** in a DOM transaction.
       *
       * You may want to call this when you know that some deeper aspect of the
       * component's state has changed but `setState` was not called.
       *
       * This will not invoke `shouldComponentUpdate`, but it will invoke
       * `componentWillUpdate` and `componentDidUpdate`.
       *
       * @param {ReactClass} publicInstance The instance that should rerender.
       * @internal
       */
      enqueueForceUpdate: function (publicInstance) {
        warnNoop(publicInstance, 'forceUpdate');
      },

      /**
       * Replaces all of the state. Always use this or `setState` to mutate state.
       * You should treat `this.state` as immutable.
       *
       * There is no guarantee that `this.state` will be immediately updated, so
       * accessing `this.state` after calling this method may return the old value.
       *
       * @param {ReactClass} publicInstance The instance that should rerender.
       * @param {object} completeState Next state.
       * @internal
       */
      enqueueReplaceState: function (publicInstance, completeState) {
        warnNoop(publicInstance, 'replaceState');
      },

      /**
       * Sets a subset of the state. This only exists because _pendingState is
       * internal. This provides a merging strategy that is not available to deep
       * properties which is confusing. TODO: Expose pendingState or don't use it
       * during the merge.
       *
       * @param {ReactClass} publicInstance The instance that should rerender.
       * @param {object} partialState Next partial state to be merged with state.
       * @internal
       */
      enqueueSetState: function (publicInstance, partialState) {
        warnNoop(publicInstance, 'setState');
      }
    };

    var ReactNoopUpdateQueue_1 = ReactNoopUpdateQueue$1;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     */

    var emptyObject$1 = {};

    var emptyObject_1 = emptyObject$1;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     */

    /**
     * Use invariant() to assert state which your program assumes to be true.
     *
     * Provide sprintf-style format (only %s is supported) and arguments
     * to provide information about what broke and what you were
     * expecting.
     *
     * The invariant message will be stripped in production, but the invariant
     * will remain to ensure logic does not differ in production.
     */

    var validateFormat = function validateFormat(format) {};

    function invariant$1(condition, format, a, b, c, d, e, f) {
      validateFormat(format);

      if (!condition) {
        var error;
        if (format === undefined) {
          error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
        } else {
          var args = [a, b, c, d, e, f];
          var argIndex = 0;
          error = new Error(format.replace(/%s/g, function () {
            return args[argIndex++];
          }));
          error.name = 'Invariant Violation';
        }

        error.framesToPop = 1; // we don't care about invariant's own frame
        throw error;
      }
    }

    var invariant_1 = invariant$1;

    /**
     * Copyright (c) 2014-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     */

    var _prodInvariant = reactProdInvariant_1;
    var _assign$1 = index$2;

    var ReactNoopUpdateQueue = ReactNoopUpdateQueue_1;

    var emptyObject = emptyObject_1;
    /**
     * Base class helpers for the updating state of a component.
     */
    function ReactComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      // We initialize the default updater but the real one gets injected by the
      // renderer.
      this.updater = updater || ReactNoopUpdateQueue;
    }

    ReactComponent.prototype.isReactComponent = {};

    /**
     * Sets a subset of the state. Always use this to mutate
     * state. You should treat `this.state` as immutable.
     *
     * There is no guarantee that `this.state` will be immediately updated, so
     * accessing `this.state` after calling this method may return the old value.
     *
     * There is no guarantee that calls to `setState` will run synchronously,
     * as they may eventually be batched together.  You can provide an optional
     * callback that will be executed when the call to setState is actually
     * completed.
     *
     * When a function is provided to setState, it will be called at some point in
     * the future (not synchronously). It will be called with the up to date
     * component arguments (state, props, context). These values can be different
     * from this.* because your function may be called after receiveProps but before
     * shouldComponentUpdate, and this new state, props, and context will not yet be
     * assigned to this.
     *
     * @param {object|function} partialState Next partial state or function to
     *        produce next partial state to be merged with current state.
     * @param {?function} callback Called after state is updated.
     * @final
     * @protected
     */
    ReactComponent.prototype.setState = function (partialState, callback) {
      !(typeof partialState === 'object' || typeof partialState === 'function' || partialState == null) ? _prodInvariant('85') : void 0;
      this.updater.enqueueSetState(this, partialState);
      if (callback) {
        this.updater.enqueueCallback(this, callback, 'setState');
      }
    };

    /**
     * Forces an update. This should only be invoked when it is known with
     * certainty that we are **not** in a DOM transaction.
     *
     * You may want to call this when you know that some deeper aspect of the
     * component's state has changed but `setState` was not called.
     *
     * This will not invoke `shouldComponentUpdate`, but it will invoke
     * `componentWillUpdate` and `componentDidUpdate`.
     *
     * @param {?function} callback Called after update is complete.
     * @final
     * @protected
     */
    ReactComponent.prototype.forceUpdate = function (callback) {
      this.updater.enqueueForceUpdate(this);
      if (callback) {
        this.updater.enqueueCallback(this, callback, 'forceUpdate');
      }
    };

    /**
     * Deprecated APIs. These APIs used to exist on classic React classes but since
     * we would like to deprecate them, we're not going to move them over to this
     * modern base class. Instead, we define a getter that warns if it's accessed.
     */
    /**
     * Base class helpers for the updating state of a component.
     */
    function ReactPureComponent(props, context, updater) {
      // Duplicated from ReactComponent.
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      // We initialize the default updater but the real one gets injected by the
      // renderer.
      this.updater = updater || ReactNoopUpdateQueue;
    }

    function ComponentDummy() {}
    ComponentDummy.prototype = ReactComponent.prototype;
    ReactPureComponent.prototype = new ComponentDummy();
    ReactPureComponent.prototype.constructor = ReactPureComponent;
    // Avoid an extra prototype jump for these methods.
    _assign$1(ReactPureComponent.prototype, ReactComponent.prototype);
    ReactPureComponent.prototype.isPureReactComponent = true;

    var ReactBaseClasses$1 = {
      Component: ReactComponent,
      PureComponent: ReactPureComponent
    };

    var _prodInvariant$1 = reactProdInvariant_1;

    /**
     * Static poolers. Several custom versions for each potential number of
     * arguments. A completely generic pooler is easy to implement, but would
     * require accessing the `arguments` object. In each of these, `this` refers to
     * the Class itself, not an instance. If any others are needed, simply add them
     * here, or in their own files.
     */
    var oneArgumentPooler = function (copyFieldsFrom) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, copyFieldsFrom);
        return instance;
      } else {
        return new Klass(copyFieldsFrom);
      }
    };

    var twoArgumentPooler$1 = function (a1, a2) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, a1, a2);
        return instance;
      } else {
        return new Klass(a1, a2);
      }
    };

    var threeArgumentPooler = function (a1, a2, a3) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, a1, a2, a3);
        return instance;
      } else {
        return new Klass(a1, a2, a3);
      }
    };

    var fourArgumentPooler$1 = function (a1, a2, a3, a4) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, a1, a2, a3, a4);
        return instance;
      } else {
        return new Klass(a1, a2, a3, a4);
      }
    };

    var standardReleaser = function (instance) {
      var Klass = this;
      !(instance instanceof Klass) ? _prodInvariant$1('25') : void 0;
      instance.destructor();
      if (Klass.instancePool.length < Klass.poolSize) {
        Klass.instancePool.push(instance);
      }
    };

    var DEFAULT_POOL_SIZE = 10;
    var DEFAULT_POOLER = oneArgumentPooler;

    /**
     * Augments `CopyConstructor` to be a poolable class, augmenting only the class
     * itself (statically) not adding any prototypical fields. Any CopyConstructor
     * you give this may have a `poolSize` property, and will look for a
     * prototypical `destructor` on instances.
     *
     * @param {Function} CopyConstructor Constructor that can be used to reset.
     * @param {Function} pooler Customizable pooler.
     */
    var addPoolingTo = function (CopyConstructor, pooler) {
      // Casting as any so that flow ignores the actual implementation and trusts
      // it to match the type we declared
      var NewKlass = CopyConstructor;
      NewKlass.instancePool = [];
      NewKlass.getPooled = pooler || DEFAULT_POOLER;
      if (!NewKlass.poolSize) {
        NewKlass.poolSize = DEFAULT_POOL_SIZE;
      }
      NewKlass.release = standardReleaser;
      return NewKlass;
    };

    var PooledClass$1 = {
      addPoolingTo: addPoolingTo,
      oneArgumentPooler: oneArgumentPooler,
      twoArgumentPooler: twoArgumentPooler$1,
      threeArgumentPooler: threeArgumentPooler,
      fourArgumentPooler: fourArgumentPooler$1
    };

    var PooledClass_1 = PooledClass$1;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    /**
     * Keeps track of the current owner.
     *
     * The current owner is the component who should own any components that are
     * currently being constructed.
     */
    var ReactCurrentOwner$1 = {
      /**
       * @internal
       * @type {ReactComponent}
       */
      current: null
    };

    var ReactCurrentOwner_1 = ReactCurrentOwner$1;

    /**
     * Copyright (c) 2014-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    // The Symbol used to tag the ReactElement type. If there is no native Symbol
    // nor polyfill, then a plain number is used for performance.

    var REACT_ELEMENT_TYPE$1 = typeof Symbol === 'function' && Symbol['for'] && Symbol['for']('react.element') || 0xeac7;

    var ReactElementSymbol = REACT_ELEMENT_TYPE$1;

    var _assign$2 = index$2;

    var ReactCurrentOwner = ReactCurrentOwner_1;

    var hasOwnProperty$1 = Object.prototype.hasOwnProperty;

    var REACT_ELEMENT_TYPE = ReactElementSymbol;

    var RESERVED_PROPS = {
      key: true,
      ref: true,
      __self: true,
      __source: true
    };

    function hasValidRef(config) {
      return config.ref !== undefined;
    }

    function hasValidKey(config) {
      return config.key !== undefined;
    }

    /**
     * Factory method to create a new React element. This no longer adheres to
     * the class pattern, so do not use new to call it. Also, no instanceof check
     * will work. Instead test $$typeof field against Symbol.for('react.element') to check
     * if something is a React Element.
     *
     * @param {*} type
     * @param {*} key
     * @param {string|object} ref
     * @param {*} self A *temporary* helper to detect places where `this` is
     * different from the `owner` when React.createElement is called, so that we
     * can warn. We want to get rid of owner and replace string `ref`s with arrow
     * functions, and as long as `this` and owner are the same, there will be no
     * change in behavior.
     * @param {*} source An annotation object (added by a transpiler or otherwise)
     * indicating filename, line number, and/or other information.
     * @param {*} owner
     * @param {*} props
     * @internal
     */
    var ReactElement$2 = function (type, key, ref, self, source, owner, props) {
      var element = {
        // This tag allow us to uniquely identify this as a React Element
        $$typeof: REACT_ELEMENT_TYPE,

        // Built-in properties that belong on the element
        type: type,
        key: key,
        ref: ref,
        props: props,

        // Record the component responsible for creating this element.
        _owner: owner
      };

      return element;
    };

    /**
     * Create and return a new ReactElement of the given type.
     * See https://facebook.github.io/react/docs/top-level-api.html#react.createelement
     */
    ReactElement$2.createElement = function (type, config, children) {
      var propName;

      // Reserved names are extracted
      var props = {};

      var key = null;
      var ref = null;
      var self = null;
      var source = null;

      if (config != null) {
        if (hasValidRef(config)) {
          ref = config.ref;
        }
        if (hasValidKey(config)) {
          key = '' + config.key;
        }

        self = config.__self === undefined ? null : config.__self;
        source = config.__source === undefined ? null : config.__source;
        // Remaining properties are added to a new props object
        for (propName in config) {
          if (hasOwnProperty$1.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
            props[propName] = config[propName];
          }
        }
      }

      // Children can be more than one argument, and those are transferred onto
      // the newly allocated props object.
      var childrenLength = arguments.length - 2;
      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2];
        }
        props.children = childArray;
      }

      // Resolve default props
      if (type && type.defaultProps) {
        var defaultProps = type.defaultProps;
        for (propName in defaultProps) {
          if (props[propName] === undefined) {
            props[propName] = defaultProps[propName];
          }
        }
      }
      return ReactElement$2(type, key, ref, self, source, ReactCurrentOwner.current, props);
    };

    /**
     * Return a function that produces ReactElements of a given type.
     * See https://facebook.github.io/react/docs/top-level-api.html#react.createfactory
     */
    ReactElement$2.createFactory = function (type) {
      var factory = ReactElement$2.createElement.bind(null, type);
      // Expose the type on the factory and the prototype so that it can be
      // easily accessed on elements. E.g. `<Foo />.type === Foo`.
      // This should not be named `constructor` since this may not be the function
      // that created the element, and it may not even be a constructor.
      // Legacy hook TODO: Warn if this is accessed
      factory.type = type;
      return factory;
    };

    ReactElement$2.cloneAndReplaceKey = function (oldElement, newKey) {
      var newElement = ReactElement$2(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);

      return newElement;
    };

    /**
     * Clone and return a new ReactElement using element as the starting point.
     * See https://facebook.github.io/react/docs/top-level-api.html#react.cloneelement
     */
    ReactElement$2.cloneElement = function (element, config, children) {
      var propName;

      // Original props are copied
      var props = _assign$2({}, element.props);

      // Reserved names are extracted
      var key = element.key;
      var ref = element.ref;
      // Self is preserved since the owner is preserved.
      var self = element._self;
      // Source is preserved since cloneElement is unlikely to be targeted by a
      // transpiler, and the original source is probably a better indicator of the
      // true owner.
      var source = element._source;

      // Owner will be preserved, unless ref is overridden
      var owner = element._owner;

      if (config != null) {
        if (hasValidRef(config)) {
          // Silently steal the ref from the parent.
          ref = config.ref;
          owner = ReactCurrentOwner.current;
        }
        if (hasValidKey(config)) {
          key = '' + config.key;
        }

        // Remaining properties override existing props
        var defaultProps;
        if (element.type && element.type.defaultProps) {
          defaultProps = element.type.defaultProps;
        }
        for (propName in config) {
          if (hasOwnProperty$1.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
            if (config[propName] === undefined && defaultProps !== undefined) {
              // Resolve default props
              props[propName] = defaultProps[propName];
            } else {
              props[propName] = config[propName];
            }
          }
        }
      }

      // Children can be more than one argument, and those are transferred onto
      // the newly allocated props object.
      var childrenLength = arguments.length - 2;
      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2];
        }
        props.children = childArray;
      }

      return ReactElement$2(element.type, key, ref, self, source, owner, props);
    };

    /**
     * Verifies the object is a ReactElement.
     * See https://facebook.github.io/react/docs/top-level-api.html#react.isvalidelement
     * @param {?object} object
     * @return {boolean} True if `object` is a valid component.
     * @final
     */
    ReactElement$2.isValidElement = function (object) {
      return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    };

    var ReactElement_1 = ReactElement$2;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    /* global Symbol */

    var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
    var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

    /**
     * Returns the iterator method function contained on the iterable object.
     *
     * Be sure to invoke the function with the iterable as context:
     *
     *     var iteratorFn = getIteratorFn(myIterable);
     *     if (iteratorFn) {
     *       var iterator = iteratorFn.call(myIterable);
     *       ...
     *     }
     *
     * @param {?object} maybeIterable
     * @return {?function}
     */
    function getIteratorFn$1(maybeIterable) {
      var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
      if (typeof iteratorFn === 'function') {
        return iteratorFn;
      }
    }

    var getIteratorFn_1 = getIteratorFn$1;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    /**
     * Escape and wrap key so it is safe to use as a reactid
     *
     * @param {string} key to be escaped.
     * @return {string} the escaped key.
     */

    function escape(key) {
      var escapeRegex = /[=:]/g;
      var escaperLookup = {
        '=': '=0',
        ':': '=2'
      };
      var escapedString = ('' + key).replace(escapeRegex, function (match) {
        return escaperLookup[match];
      });

      return '$' + escapedString;
    }

    /**
     * Unescape and unwrap key for human-readable display
     *
     * @param {string} key to unescape.
     * @return {string} the unescaped key.
     */
    function unescape(key) {
      var unescapeRegex = /(=0|=2)/g;
      var unescaperLookup = {
        '=0': '=',
        '=2': ':'
      };
      var keySubstring = key[0] === '.' && key[1] === '$' ? key.substring(2) : key.substring(1);

      return ('' + keySubstring).replace(unescapeRegex, function (match) {
        return unescaperLookup[match];
      });
    }

    var KeyEscapeUtils$1 = {
      escape: escape,
      unescape: unescape
    };

    var KeyEscapeUtils_1 = KeyEscapeUtils$1;

    var _prodInvariant$2 = reactProdInvariant_1;

    var REACT_ELEMENT_TYPE$2 = ReactElementSymbol;

    var getIteratorFn = getIteratorFn_1;
    var KeyEscapeUtils = KeyEscapeUtils_1;
    var SEPARATOR = '.';
    var SUBSEPARATOR = ':';

    /**
     * Generate a key string that identifies a component within a set.
     *
     * @param {*} component A component that could contain a manual key.
     * @param {number} index Index that is used if a manual key is not provided.
     * @return {string}
     */
    function getComponentKey(component, index) {
      // Do some typechecking here since we call this blindly. We want to ensure
      // that we don't block potential future ES APIs.
      if (component && typeof component === 'object' && component.key != null) {
        // Explicit key
        return KeyEscapeUtils.escape(component.key);
      }
      // Implicit key determined by the index in the set
      return index.toString(36);
    }

    /**
     * @param {?*} children Children tree container.
     * @param {!string} nameSoFar Name of the key path so far.
     * @param {!function} callback Callback to invoke with each child found.
     * @param {?*} traverseContext Used to pass information throughout the traversal
     * process.
     * @return {!number} The number of children in this subtree.
     */
    function traverseAllChildrenImpl(children, nameSoFar, callback, traverseContext) {
      var type = typeof children;

      if (type === 'undefined' || type === 'boolean') {
        // All of the above are perceived as null.
        children = null;
      }

      if (children === null || type === 'string' || type === 'number' ||
      // The following is inlined from ReactElement. This means we can optimize
      // some checks. React Fiber also inlines this logic for similar purposes.
      type === 'object' && children.$$typeof === REACT_ELEMENT_TYPE$2) {
        callback(traverseContext, children,
        // If it's the only child, treat the name as if it was wrapped in an array
        // so that it's consistent if the number of children grows.
        nameSoFar === '' ? SEPARATOR + getComponentKey(children, 0) : nameSoFar);
        return 1;
      }

      var child;
      var nextName;
      var subtreeCount = 0; // Count of children found in the current subtree.
      var nextNamePrefix = nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

      if (Array.isArray(children)) {
        for (var i = 0; i < children.length; i++) {
          child = children[i];
          nextName = nextNamePrefix + getComponentKey(child, i);
          subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
        }
      } else {
        var iteratorFn = getIteratorFn(children);
        if (iteratorFn) {
          var iterator = iteratorFn.call(children);
          var step;
          if (iteratorFn !== children.entries) {
            var ii = 0;
            while (!(step = iterator.next()).done) {
              child = step.value;
              nextName = nextNamePrefix + getComponentKey(child, ii++);
              subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
            }
          } else {
            while (!(step = iterator.next()).done) {
              var entry = step.value;
              if (entry) {
                child = entry[1];
                nextName = nextNamePrefix + KeyEscapeUtils.escape(entry[0]) + SUBSEPARATOR + getComponentKey(child, 0);
                subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
              }
            }
          }
        } else if (type === 'object') {
          var addendum = '';
          var childrenString = String(children);
          _prodInvariant$2('31', childrenString === '[object Object]' ? 'object with keys {' + Object.keys(children).join(', ') + '}' : childrenString, addendum);
        }
      }

      return subtreeCount;
    }

    /**
     * Traverses children that are typically specified as `props.children`, but
     * might also be specified through attributes:
     *
     * - `traverseAllChildren(this.props.children, ...)`
     * - `traverseAllChildren(this.props.leftPanelChildren, ...)`
     *
     * The `traverseContext` is an optional argument that is passed through the
     * entire traversal. It can be used to store accumulations or anything else that
     * the callback might find relevant.
     *
     * @param {?*} children Children tree object.
     * @param {!function} callback To invoke upon traversing each child.
     * @param {?*} traverseContext Context for traversal.
     * @return {!number} The number of children in this subtree.
     */
    function traverseAllChildren$1(children, callback, traverseContext) {
      if (children == null) {
        return 0;
      }

      return traverseAllChildrenImpl(children, '', callback, traverseContext);
    }

    var traverseAllChildren_1 = traverseAllChildren$1;

    var PooledClass = PooledClass_1;
    var ReactElement$1 = ReactElement_1;

    var emptyFunction$2 = emptyFunction_1;
    var traverseAllChildren = traverseAllChildren_1;

    var twoArgumentPooler = PooledClass.twoArgumentPooler;
    var fourArgumentPooler = PooledClass.fourArgumentPooler;

    var userProvidedKeyEscapeRegex = /\/+/g;
    function escapeUserProvidedKey(text) {
      return ('' + text).replace(userProvidedKeyEscapeRegex, '$&/');
    }

    /**
     * PooledClass representing the bookkeeping associated with performing a child
     * traversal. Allows avoiding binding callbacks.
     *
     * @constructor ForEachBookKeeping
     * @param {!function} forEachFunction Function to perform traversal with.
     * @param {?*} forEachContext Context to perform context with.
     */
    function ForEachBookKeeping(forEachFunction, forEachContext) {
      this.func = forEachFunction;
      this.context = forEachContext;
      this.count = 0;
    }
    ForEachBookKeeping.prototype.destructor = function () {
      this.func = null;
      this.context = null;
      this.count = 0;
    };
    PooledClass.addPoolingTo(ForEachBookKeeping, twoArgumentPooler);

    function forEachSingleChild(bookKeeping, child, name) {
      var func = bookKeeping.func,
          context = bookKeeping.context;

      func.call(context, child, bookKeeping.count++);
    }

    /**
     * Iterates through children that are typically specified as `props.children`.
     *
     * See https://facebook.github.io/react/docs/top-level-api.html#react.children.foreach
     *
     * The provided forEachFunc(child, index) will be called for each
     * leaf child.
     *
     * @param {?*} children Children tree container.
     * @param {function(*, int)} forEachFunc
     * @param {*} forEachContext Context for forEachContext.
     */
    function forEachChildren(children, forEachFunc, forEachContext) {
      if (children == null) {
        return children;
      }
      var traverseContext = ForEachBookKeeping.getPooled(forEachFunc, forEachContext);
      traverseAllChildren(children, forEachSingleChild, traverseContext);
      ForEachBookKeeping.release(traverseContext);
    }

    /**
     * PooledClass representing the bookkeeping associated with performing a child
     * mapping. Allows avoiding binding callbacks.
     *
     * @constructor MapBookKeeping
     * @param {!*} mapResult Object containing the ordered map of results.
     * @param {!function} mapFunction Function to perform mapping with.
     * @param {?*} mapContext Context to perform mapping with.
     */
    function MapBookKeeping(mapResult, keyPrefix, mapFunction, mapContext) {
      this.result = mapResult;
      this.keyPrefix = keyPrefix;
      this.func = mapFunction;
      this.context = mapContext;
      this.count = 0;
    }
    MapBookKeeping.prototype.destructor = function () {
      this.result = null;
      this.keyPrefix = null;
      this.func = null;
      this.context = null;
      this.count = 0;
    };
    PooledClass.addPoolingTo(MapBookKeeping, fourArgumentPooler);

    function mapSingleChildIntoContext(bookKeeping, child, childKey) {
      var result = bookKeeping.result,
          keyPrefix = bookKeeping.keyPrefix,
          func = bookKeeping.func,
          context = bookKeeping.context;


      var mappedChild = func.call(context, child, bookKeeping.count++);
      if (Array.isArray(mappedChild)) {
        mapIntoWithKeyPrefixInternal(mappedChild, result, childKey, emptyFunction$2.thatReturnsArgument);
      } else if (mappedChild != null) {
        if (ReactElement$1.isValidElement(mappedChild)) {
          mappedChild = ReactElement$1.cloneAndReplaceKey(mappedChild,
          // Keep both the (mapped) and old keys if they differ, just as
          // traverseAllChildren used to do for objects as children
          keyPrefix + (mappedChild.key && (!child || child.key !== mappedChild.key) ? escapeUserProvidedKey(mappedChild.key) + '/' : '') + childKey);
        }
        result.push(mappedChild);
      }
    }

    function mapIntoWithKeyPrefixInternal(children, array, prefix, func, context) {
      var escapedPrefix = '';
      if (prefix != null) {
        escapedPrefix = escapeUserProvidedKey(prefix) + '/';
      }
      var traverseContext = MapBookKeeping.getPooled(array, escapedPrefix, func, context);
      traverseAllChildren(children, mapSingleChildIntoContext, traverseContext);
      MapBookKeeping.release(traverseContext);
    }

    /**
     * Maps children that are typically specified as `props.children`.
     *
     * See https://facebook.github.io/react/docs/top-level-api.html#react.children.map
     *
     * The provided mapFunction(child, key, index) will be called for each
     * leaf child.
     *
     * @param {?*} children Children tree container.
     * @param {function(*, int)} func The map function.
     * @param {*} context Context for mapFunction.
     * @return {object} Object containing the ordered map of results.
     */
    function mapChildren(children, func, context) {
      if (children == null) {
        return children;
      }
      var result = [];
      mapIntoWithKeyPrefixInternal(children, result, null, func, context);
      return result;
    }

    function forEachSingleChildDummy(traverseContext, child, name) {
      return null;
    }

    /**
     * Count the number of children that are typically specified as
     * `props.children`.
     *
     * See https://facebook.github.io/react/docs/top-level-api.html#react.children.count
     *
     * @param {?*} children Children tree container.
     * @return {number} The number of children.
     */
    function countChildren(children, context) {
      return traverseAllChildren(children, forEachSingleChildDummy, null);
    }

    /**
     * Flatten a children object (typically specified as `props.children`) and
     * return an array with appropriately re-keyed children.
     *
     * See https://facebook.github.io/react/docs/top-level-api.html#react.children.toarray
     */
    function toArray(children) {
      var result = [];
      mapIntoWithKeyPrefixInternal(children, result, null, emptyFunction$2.thatReturnsArgument);
      return result;
    }

    var ReactChildren$1 = {
      forEach: forEachChildren,
      map: mapChildren,
      mapIntoWithKeyPrefixInternal: mapIntoWithKeyPrefixInternal,
      count: countChildren,
      toArray: toArray
    };

    var ReactChildren_1 = ReactChildren$1;

    function isNative(fn) {
      // Based on isNative() from Lodash
      var funcToString = Function.prototype.toString;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var reIsNative = RegExp('^' + funcToString
      // Take an example native function source for comparison
      .call(hasOwnProperty
      // Strip regex characters so we can use it for regex
      ).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'
      // Remove hasOwnProperty from the template to make it generic
      ).replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
      try {
        var source = funcToString.call(fn);
        return reIsNative.test(source);
      } catch (err) {
        return false;
      }
    }

    var canUseCollections =
    // Array.from
    typeof Array.from === 'function' &&
    // Map
    typeof Map === 'function' && isNative(Map) &&
    // Map.prototype.keys
    Map.prototype != null && typeof Map.prototype.keys === 'function' && isNative(Map.prototype.keys) &&
    // Set
    typeof Set === 'function' && isNative(Set) &&
    // Set.prototype.keys
    Set.prototype != null && typeof Set.prototype.keys === 'function' && isNative(Set.prototype.keys);

    var setItem;
    var getItem;
    var removeItem;
    var getItemIDs;
    var addRoot;
    var removeRoot;
    var getRootIDs;

    if (canUseCollections) {
      var itemMap = new Map();
      var rootIDSet = new Set();

      setItem = function (id, item) {
        itemMap.set(id, item);
      };
      getItem = function (id) {
        return itemMap.get(id);
      };
      removeItem = function (id) {
        itemMap['delete'](id);
      };
      getItemIDs = function () {
        return Array.from(itemMap.keys());
      };

      addRoot = function (id) {
        rootIDSet.add(id);
      };
      removeRoot = function (id) {
        rootIDSet['delete'](id);
      };
      getRootIDs = function () {
        return Array.from(rootIDSet.keys());
      };
    } else {
      var itemByKey = {};
      var rootByKey = {};

      // Use non-numeric keys to prevent V8 performance issues:
      // https://github.com/facebook/react/pull/7232
      var getKeyFromID = function (id) {
        return '.' + id;
      };
      var getIDFromKey = function (key) {
        return parseInt(key.substr(1), 10);
      };

      setItem = function (id, item) {
        var key = getKeyFromID(id);
        itemByKey[key] = item;
      };
      getItem = function (id) {
        var key = getKeyFromID(id);
        return itemByKey[key];
      };
      removeItem = function (id) {
        var key = getKeyFromID(id);
        delete itemByKey[key];
      };
      getItemIDs = function () {
        return Object.keys(itemByKey).map(getIDFromKey);
      };

      addRoot = function (id) {
        var key = getKeyFromID(id);
        rootByKey[key] = true;
      };
      removeRoot = function (id) {
        var key = getKeyFromID(id);
        delete rootByKey[key];
      };
      getRootIDs = function () {
        return Object.keys(rootByKey).map(getIDFromKey);
      };
    }

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    var ReactElement$3 = ReactElement_1;

    /**
     * Create a factory that creates HTML tag elements.
     *
     * @private
     */
    var createDOMFactory = ReactElement$3.createFactory;
    /**
     * Creates a mapping from supported HTML tags to `ReactDOMComponent` classes.
     *
     * @public
     */
    var ReactDOMFactories$1 = {
      a: createDOMFactory('a'),
      abbr: createDOMFactory('abbr'),
      address: createDOMFactory('address'),
      area: createDOMFactory('area'),
      article: createDOMFactory('article'),
      aside: createDOMFactory('aside'),
      audio: createDOMFactory('audio'),
      b: createDOMFactory('b'),
      base: createDOMFactory('base'),
      bdi: createDOMFactory('bdi'),
      bdo: createDOMFactory('bdo'),
      big: createDOMFactory('big'),
      blockquote: createDOMFactory('blockquote'),
      body: createDOMFactory('body'),
      br: createDOMFactory('br'),
      button: createDOMFactory('button'),
      canvas: createDOMFactory('canvas'),
      caption: createDOMFactory('caption'),
      cite: createDOMFactory('cite'),
      code: createDOMFactory('code'),
      col: createDOMFactory('col'),
      colgroup: createDOMFactory('colgroup'),
      data: createDOMFactory('data'),
      datalist: createDOMFactory('datalist'),
      dd: createDOMFactory('dd'),
      del: createDOMFactory('del'),
      details: createDOMFactory('details'),
      dfn: createDOMFactory('dfn'),
      dialog: createDOMFactory('dialog'),
      div: createDOMFactory('div'),
      dl: createDOMFactory('dl'),
      dt: createDOMFactory('dt'),
      em: createDOMFactory('em'),
      embed: createDOMFactory('embed'),
      fieldset: createDOMFactory('fieldset'),
      figcaption: createDOMFactory('figcaption'),
      figure: createDOMFactory('figure'),
      footer: createDOMFactory('footer'),
      form: createDOMFactory('form'),
      h1: createDOMFactory('h1'),
      h2: createDOMFactory('h2'),
      h3: createDOMFactory('h3'),
      h4: createDOMFactory('h4'),
      h5: createDOMFactory('h5'),
      h6: createDOMFactory('h6'),
      head: createDOMFactory('head'),
      header: createDOMFactory('header'),
      hgroup: createDOMFactory('hgroup'),
      hr: createDOMFactory('hr'),
      html: createDOMFactory('html'),
      i: createDOMFactory('i'),
      iframe: createDOMFactory('iframe'),
      img: createDOMFactory('img'),
      input: createDOMFactory('input'),
      ins: createDOMFactory('ins'),
      kbd: createDOMFactory('kbd'),
      keygen: createDOMFactory('keygen'),
      label: createDOMFactory('label'),
      legend: createDOMFactory('legend'),
      li: createDOMFactory('li'),
      link: createDOMFactory('link'),
      main: createDOMFactory('main'),
      map: createDOMFactory('map'),
      mark: createDOMFactory('mark'),
      menu: createDOMFactory('menu'),
      menuitem: createDOMFactory('menuitem'),
      meta: createDOMFactory('meta'),
      meter: createDOMFactory('meter'),
      nav: createDOMFactory('nav'),
      noscript: createDOMFactory('noscript'),
      object: createDOMFactory('object'),
      ol: createDOMFactory('ol'),
      optgroup: createDOMFactory('optgroup'),
      option: createDOMFactory('option'),
      output: createDOMFactory('output'),
      p: createDOMFactory('p'),
      param: createDOMFactory('param'),
      picture: createDOMFactory('picture'),
      pre: createDOMFactory('pre'),
      progress: createDOMFactory('progress'),
      q: createDOMFactory('q'),
      rp: createDOMFactory('rp'),
      rt: createDOMFactory('rt'),
      ruby: createDOMFactory('ruby'),
      s: createDOMFactory('s'),
      samp: createDOMFactory('samp'),
      script: createDOMFactory('script'),
      section: createDOMFactory('section'),
      select: createDOMFactory('select'),
      small: createDOMFactory('small'),
      source: createDOMFactory('source'),
      span: createDOMFactory('span'),
      strong: createDOMFactory('strong'),
      style: createDOMFactory('style'),
      sub: createDOMFactory('sub'),
      summary: createDOMFactory('summary'),
      sup: createDOMFactory('sup'),
      table: createDOMFactory('table'),
      tbody: createDOMFactory('tbody'),
      td: createDOMFactory('td'),
      textarea: createDOMFactory('textarea'),
      tfoot: createDOMFactory('tfoot'),
      th: createDOMFactory('th'),
      thead: createDOMFactory('thead'),
      time: createDOMFactory('time'),
      title: createDOMFactory('title'),
      tr: createDOMFactory('tr'),
      track: createDOMFactory('track'),
      u: createDOMFactory('u'),
      ul: createDOMFactory('ul'),
      'var': createDOMFactory('var'),
      video: createDOMFactory('video'),
      wbr: createDOMFactory('wbr'),

      // SVG
      circle: createDOMFactory('circle'),
      clipPath: createDOMFactory('clipPath'),
      defs: createDOMFactory('defs'),
      ellipse: createDOMFactory('ellipse'),
      g: createDOMFactory('g'),
      image: createDOMFactory('image'),
      line: createDOMFactory('line'),
      linearGradient: createDOMFactory('linearGradient'),
      mask: createDOMFactory('mask'),
      path: createDOMFactory('path'),
      pattern: createDOMFactory('pattern'),
      polygon: createDOMFactory('polygon'),
      polyline: createDOMFactory('polyline'),
      radialGradient: createDOMFactory('radialGradient'),
      rect: createDOMFactory('rect'),
      stop: createDOMFactory('stop'),
      svg: createDOMFactory('svg'),
      text: createDOMFactory('text'),
      tspan: createDOMFactory('tspan')
    };

    var ReactDOMFactories_1 = ReactDOMFactories$1;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var ReactPropTypesSecret$3 = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

    var ReactPropTypesSecret_1$2 = ReactPropTypesSecret$3;

    /**
     * Assert that the values match with the type specs.
     * Error messages are memorized and will only be shown once.
     *
     * @param {object} typeSpecs Map of name to a ReactPropType
     * @param {object} values Runtime values that need to be type-checked
     * @param {string} location e.g. "prop", "context", "child context"
     * @param {string} componentName Name of the component for error messages.
     * @param {?Function} getStack Returns the component stack.
     * @private
     */
    function checkPropTypes$1(typeSpecs, values, location, componentName, getStack) {
      
    }

    var checkPropTypes_1 = checkPropTypes$1;

    var emptyFunction$3 = emptyFunction_1;
    var invariant$6 = invariant_1;
    var warning$7 = warning_1;
    var assign = index$2;

    var ReactPropTypesSecret$2 = ReactPropTypesSecret_1$2;
    var checkPropTypes = checkPropTypes_1;

    var factoryWithTypeCheckers = function(isValidElement, throwOnDirectAccess) {
      /* global Symbol */
      var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
      var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

      /**
       * Returns the iterator method function contained on the iterable object.
       *
       * Be sure to invoke the function with the iterable as context:
       *
       *     var iteratorFn = getIteratorFn(myIterable);
       *     if (iteratorFn) {
       *       var iterator = iteratorFn.call(myIterable);
       *       ...
       *     }
       *
       * @param {?object} maybeIterable
       * @return {?function}
       */
      function getIteratorFn(maybeIterable) {
        var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
        if (typeof iteratorFn === 'function') {
          return iteratorFn;
        }
      }

      /**
       * Collection of methods that allow declaration and validation of props that are
       * supplied to React components. Example usage:
       *
       *   var Props = require('ReactPropTypes');
       *   var MyArticle = React.createClass({
       *     propTypes: {
       *       // An optional string prop named "description".
       *       description: Props.string,
       *
       *       // A required enum prop named "category".
       *       category: Props.oneOf(['News','Photos']).isRequired,
       *
       *       // A prop named "dialog" that requires an instance of Dialog.
       *       dialog: Props.instanceOf(Dialog).isRequired
       *     },
       *     render: function() { ... }
       *   });
       *
       * A more formal specification of how these methods are used:
       *
       *   type := array|bool|func|object|number|string|oneOf([...])|instanceOf(...)
       *   decl := ReactPropTypes.{type}(.isRequired)?
       *
       * Each and every declaration produces a function with the same signature. This
       * allows the creation of custom validation functions. For example:
       *
       *  var MyLink = React.createClass({
       *    propTypes: {
       *      // An optional string or URI prop named "href".
       *      href: function(props, propName, componentName) {
       *        var propValue = props[propName];
       *        if (propValue != null && typeof propValue !== 'string' &&
       *            !(propValue instanceof URI)) {
       *          return new Error(
       *            'Expected a string or an URI for ' + propName + ' in ' +
       *            componentName
       *          );
       *        }
       *      }
       *    },
       *    render: function() {...}
       *  });
       *
       * @internal
       */

      var ANONYMOUS = '<<anonymous>>';

      // Important!
      // Keep this list in sync with production version in `./factoryWithThrowingShims.js`.
      var ReactPropTypes = {
        array: createPrimitiveTypeChecker('array'),
        bool: createPrimitiveTypeChecker('boolean'),
        func: createPrimitiveTypeChecker('function'),
        number: createPrimitiveTypeChecker('number'),
        object: createPrimitiveTypeChecker('object'),
        string: createPrimitiveTypeChecker('string'),
        symbol: createPrimitiveTypeChecker('symbol'),

        any: createAnyTypeChecker(),
        arrayOf: createArrayOfTypeChecker,
        element: createElementTypeChecker(),
        instanceOf: createInstanceTypeChecker,
        node: createNodeChecker(),
        objectOf: createObjectOfTypeChecker,
        oneOf: createEnumTypeChecker,
        oneOfType: createUnionTypeChecker,
        shape: createShapeTypeChecker,
        exact: createStrictShapeTypeChecker,
      };

      /**
       * inlined Object.is polyfill to avoid requiring consumers ship their own
       * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
       */
      /*eslint-disable no-self-compare*/
      function is(x, y) {
        // SameValue algorithm
        if (x === y) {
          // Steps 1-5, 7-10
          // Steps 6.b-6.e: +0 != -0
          return x !== 0 || 1 / x === 1 / y;
        } else {
          // Step 6.a: NaN == NaN
          return x !== x && y !== y;
        }
      }
      /*eslint-enable no-self-compare*/

      /**
       * We use an Error-like object for backward compatibility as people may call
       * PropTypes directly and inspect their output. However, we don't use real
       * Errors anymore. We don't inspect their stack anyway, and creating them
       * is prohibitively expensive if they are created too often, such as what
       * happens in oneOfType() for any type before the one that matched.
       */
      function PropTypeError(message) {
        this.message = message;
        this.stack = '';
      }
      // Make `instanceof Error` still work for returned errors.
      PropTypeError.prototype = Error.prototype;

      function createChainableTypeChecker(validate) {
        var manualPropTypeCallCache, manualPropTypeWarningCount;

function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
          componentName = componentName || ANONYMOUS;
          propFullName = propFullName || propName;

          if (secret !== ReactPropTypesSecret$2) {
            if (throwOnDirectAccess) {
              // New behavior only for users of `prop-types` package
              invariant$6(
                false,
                'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
                'Use `PropTypes.checkPropTypes()` to call them. ' +
                'Read more at http://fb.me/use-check-prop-types'
              );
            } else if ("production" !== 'production' && typeof console !== 'undefined') {
              // Old behavior for people using React.PropTypes
              var cacheKey = componentName + ':' + propName;
              if (
                !manualPropTypeCallCache[cacheKey] &&
                // Avoid spamming the console because they are often not actionable except for lib authors
                manualPropTypeWarningCount < 3
              ) {
                warning$7(
                  false,
                  'You are manually calling a React.PropTypes validation ' +
                  'function for the `%s` prop on `%s`. This is deprecated ' +
                  'and will throw in the standalone `prop-types` package. ' +
                  'You may be seeing this warning due to a third-party PropTypes ' +
                  'library. See https://fb.me/react-warning-dont-call-proptypes ' + 'for details.',
                  propFullName,
                  componentName
                );
                manualPropTypeCallCache[cacheKey] = true;
                manualPropTypeWarningCount++;
              }
            }
          }
          if (props[propName] == null) {
            if (isRequired) {
              if (props[propName] === null) {
                return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required ' + ('in `' + componentName + '`, but its value is `null`.'));
              }
              return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required in ' + ('`' + componentName + '`, but its value is `undefined`.'));
            }
            return null;
          } else {
            return validate(props, propName, componentName, location, propFullName);
          }
        }

        var chainedCheckType = checkType.bind(null, false);
        chainedCheckType.isRequired = checkType.bind(null, true);

        return chainedCheckType;
      }

      function createPrimitiveTypeChecker(expectedType) {
        function validate(props, propName, componentName, location, propFullName, secret) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== expectedType) {
            // `propValue` being instance of, say, date/regexp, pass the 'object'
            // check, but we can offer a more precise error message here rather than
            // 'of type `object`'.
            var preciseType = getPreciseType(propValue);

            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createAnyTypeChecker() {
        return createChainableTypeChecker(emptyFunction$3.thatReturnsNull);
      }

      function createArrayOfTypeChecker(typeChecker) {
        function validate(props, propName, componentName, location, propFullName) {
          if (typeof typeChecker !== 'function') {
            return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside arrayOf.');
          }
          var propValue = props[propName];
          if (!Array.isArray(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an array.'));
          }
          for (var i = 0; i < propValue.length; i++) {
            var error = typeChecker(propValue, i, componentName, location, propFullName + '[' + i + ']', ReactPropTypesSecret$2);
            if (error instanceof Error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createElementTypeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          if (!isValidElement(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected a single ReactElement.'));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createInstanceTypeChecker(expectedClass) {
        function validate(props, propName, componentName, location, propFullName) {
          if (!(props[propName] instanceof expectedClass)) {
            var expectedClassName = expectedClass.name || ANONYMOUS;
            var actualClassName = getClassName(props[propName]);
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + actualClassName + '` supplied to `' + componentName + '`, expected ') + ('instance of `' + expectedClassName + '`.'));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createEnumTypeChecker(expectedValues) {
        if (!Array.isArray(expectedValues)) {
          void 0;
          return emptyFunction$3.thatReturnsNull;
        }

        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          for (var i = 0; i < expectedValues.length; i++) {
            if (is(propValue, expectedValues[i])) {
              return null;
            }
          }

          var valuesString = JSON.stringify(expectedValues);
          return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of value `' + propValue + '` ' + ('supplied to `' + componentName + '`, expected one of ' + valuesString + '.'));
        }
        return createChainableTypeChecker(validate);
      }

      function createObjectOfTypeChecker(typeChecker) {
        function validate(props, propName, componentName, location, propFullName) {
          if (typeof typeChecker !== 'function') {
            return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside objectOf.');
          }
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== 'object') {
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an object.'));
          }
          for (var key in propValue) {
            if (propValue.hasOwnProperty(key)) {
              var error = typeChecker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret$2);
              if (error instanceof Error) {
                return error;
              }
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createUnionTypeChecker(arrayOfTypeCheckers) {
        if (!Array.isArray(arrayOfTypeCheckers)) {
          void 0;
          return emptyFunction$3.thatReturnsNull;
        }

        for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
          var checker = arrayOfTypeCheckers[i];
          if (typeof checker !== 'function') {
            warning$7(
              false,
              'Invalid argument supplied to oneOfType. Expected an array of check functions, but ' +
              'received %s at index %s.',
              getPostfixForTypeWarning(checker),
              i
            );
            return emptyFunction$3.thatReturnsNull;
          }
        }

        function validate(props, propName, componentName, location, propFullName) {
          for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
            var checker = arrayOfTypeCheckers[i];
            if (checker(props, propName, componentName, location, propFullName, ReactPropTypesSecret$2) == null) {
              return null;
            }
          }

          return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`.'));
        }
        return createChainableTypeChecker(validate);
      }

      function createNodeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          if (!isNode(props[propName])) {
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`, expected a ReactNode.'));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createShapeTypeChecker(shapeTypes) {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== 'object') {
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
          }
          for (var key in shapeTypes) {
            var checker = shapeTypes[key];
            if (!checker) {
              continue;
            }
            var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret$2);
            if (error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }

      function createStrictShapeTypeChecker(shapeTypes) {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== 'object') {
            return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
          }
          // We need to check all keys in case some are required but missing from
          // props.
          var allKeys = assign({}, props[propName], shapeTypes);
          for (var key in allKeys) {
            var checker = shapeTypes[key];
            if (!checker) {
              return new PropTypeError(
                'Invalid ' + location + ' `' + propFullName + '` key `' + key + '` supplied to `' + componentName + '`.' +
                '\nBad object: ' + JSON.stringify(props[propName], null, '  ') +
                '\nValid keys: ' +  JSON.stringify(Object.keys(shapeTypes), null, '  ')
              );
            }
            var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret$2);
            if (error) {
              return error;
            }
          }
          return null;
        }

        return createChainableTypeChecker(validate);
      }

      function isNode(propValue) {
        switch (typeof propValue) {
          case 'number':
          case 'string':
          case 'undefined':
            return true;
          case 'boolean':
            return !propValue;
          case 'object':
            if (Array.isArray(propValue)) {
              return propValue.every(isNode);
            }
            if (propValue === null || isValidElement(propValue)) {
              return true;
            }

            var iteratorFn = getIteratorFn(propValue);
            if (iteratorFn) {
              var iterator = iteratorFn.call(propValue);
              var step;
              if (iteratorFn !== propValue.entries) {
                while (!(step = iterator.next()).done) {
                  if (!isNode(step.value)) {
                    return false;
                  }
                }
              } else {
                // Iterator will provide entry [k,v] tuples rather than values.
                while (!(step = iterator.next()).done) {
                  var entry = step.value;
                  if (entry) {
                    if (!isNode(entry[1])) {
                      return false;
                    }
                  }
                }
              }
            } else {
              return false;
            }

            return true;
          default:
            return false;
        }
      }

      function isSymbol(propType, propValue) {
        // Native Symbol.
        if (propType === 'symbol') {
          return true;
        }

        // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
        if (propValue['@@toStringTag'] === 'Symbol') {
          return true;
        }

        // Fallback for non-spec compliant Symbols which are polyfilled.
        if (typeof Symbol === 'function' && propValue instanceof Symbol) {
          return true;
        }

        return false;
      }

      // Equivalent of `typeof` but with special handling for array and regexp.
      function getPropType(propValue) {
        var propType = typeof propValue;
        if (Array.isArray(propValue)) {
          return 'array';
        }
        if (propValue instanceof RegExp) {
          // Old webkits (at least until Android 4.0) return 'function' rather than
          // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
          // passes PropTypes.object.
          return 'object';
        }
        if (isSymbol(propType, propValue)) {
          return 'symbol';
        }
        return propType;
      }

      // This handles more types than `getPropType`. Only used for error messages.
      // See `createPrimitiveTypeChecker`.
      function getPreciseType(propValue) {
        if (typeof propValue === 'undefined' || propValue === null) {
          return '' + propValue;
        }
        var propType = getPropType(propValue);
        if (propType === 'object') {
          if (propValue instanceof Date) {
            return 'date';
          } else if (propValue instanceof RegExp) {
            return 'regexp';
          }
        }
        return propType;
      }

      // Returns a string that is postfixed to a warning about an invalid type.
      // For example, "undefined" or "of type array"
      function getPostfixForTypeWarning(value) {
        var type = getPreciseType(value);
        switch (type) {
          case 'array':
          case 'object':
            return 'an ' + type;
          case 'boolean':
          case 'date':
          case 'regexp':
            return 'a ' + type;
          default:
            return type;
        }
      }

      // Returns class name of the object, if any.
      function getClassName(propValue) {
        if (!propValue.constructor || !propValue.constructor.name) {
          return ANONYMOUS;
        }
        return propValue.constructor.name;
      }

      ReactPropTypes.checkPropTypes = checkPropTypes;
      ReactPropTypes.PropTypes = ReactPropTypes;

      return ReactPropTypes;
    };

    // React 15.5 references this module, and assumes PropTypes are still callable in production.
    // Therefore we re-export development-only version with all the PropTypes checks here.
    // However if one is migrating to the `prop-types` npm library, they will go through the
    // `index.js` entry point, and it will branch depending on the environment.
    var factory$1 = factoryWithTypeCheckers;
    var factory_1 = function(isValidElement) {
      // It is still allowed in 15.5.
      var throwOnDirectAccess = false;
      return factory$1(isValidElement, throwOnDirectAccess);
    };

    var _require = ReactElement_1;
    var isValidElement = _require.isValidElement;

    var factory = factory_1;

    var ReactPropTypes$1 = factory(isValidElement);

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     */

    var ReactVersion$1 = '15.6.2';

    var _assign$3 = index$2;

    var emptyObject$2 = emptyObject_1;
    var _invariant = invariant_1;

    var MIXINS_KEY = 'mixins';

    // Helper function to allow the creation of anonymous functions which do not
    // have .name set to the name of the variable being assigned to.
    function identity(fn) {
      return fn;
    }

    {
      
    }

    function factory$3(ReactComponent, isValidElement, ReactNoopUpdateQueue) {
      /**
       * Policies that describe methods in `ReactClassInterface`.
       */

      var injectedMixins = [];

      /**
       * Composite components are higher-level components that compose other composite
       * or host components.
       *
       * To create a new type of `ReactClass`, pass a specification of
       * your new class to `React.createClass`. The only requirement of your class
       * specification is that you implement a `render` method.
       *
       *   var MyComponent = React.createClass({
       *     render: function() {
       *       return <div>Hello World</div>;
       *     }
       *   });
       *
       * The class specification supports a specific protocol of methods that have
       * special meaning (e.g. `render`). See `ReactClassInterface` for
       * more the comprehensive protocol. Any other properties and methods in the
       * class specification will be available on the prototype.
       *
       * @interface ReactClassInterface
       * @internal
       */
      var ReactClassInterface = {
        /**
         * An array of Mixin objects to include when defining your component.
         *
         * @type {array}
         * @optional
         */
        mixins: 'DEFINE_MANY',

        /**
         * An object containing properties and methods that should be defined on
         * the component's constructor instead of its prototype (static methods).
         *
         * @type {object}
         * @optional
         */
        statics: 'DEFINE_MANY',

        /**
         * Definition of prop types for this component.
         *
         * @type {object}
         * @optional
         */
        propTypes: 'DEFINE_MANY',

        /**
         * Definition of context types for this component.
         *
         * @type {object}
         * @optional
         */
        contextTypes: 'DEFINE_MANY',

        /**
         * Definition of context types this component sets for its children.
         *
         * @type {object}
         * @optional
         */
        childContextTypes: 'DEFINE_MANY',

        // ==== Definition methods ====

        /**
         * Invoked when the component is mounted. Values in the mapping will be set on
         * `this.props` if that prop is not specified (i.e. using an `in` check).
         *
         * This method is invoked before `getInitialState` and therefore cannot rely
         * on `this.state` or use `this.setState`.
         *
         * @return {object}
         * @optional
         */
        getDefaultProps: 'DEFINE_MANY_MERGED',

        /**
         * Invoked once before the component is mounted. The return value will be used
         * as the initial value of `this.state`.
         *
         *   getInitialState: function() {
         *     return {
         *       isOn: false,
         *       fooBaz: new BazFoo()
         *     }
         *   }
         *
         * @return {object}
         * @optional
         */
        getInitialState: 'DEFINE_MANY_MERGED',

        /**
         * @return {object}
         * @optional
         */
        getChildContext: 'DEFINE_MANY_MERGED',

        /**
         * Uses props from `this.props` and state from `this.state` to render the
         * structure of the component.
         *
         * No guarantees are made about when or how often this method is invoked, so
         * it must not have side effects.
         *
         *   render: function() {
         *     var name = this.props.name;
         *     return <div>Hello, {name}!</div>;
         *   }
         *
         * @return {ReactComponent}
         * @required
         */
        render: 'DEFINE_ONCE',

        // ==== Delegate methods ====

        /**
         * Invoked when the component is initially created and about to be mounted.
         * This may have side effects, but any external subscriptions or data created
         * by this method must be cleaned up in `componentWillUnmount`.
         *
         * @optional
         */
        componentWillMount: 'DEFINE_MANY',

        /**
         * Invoked when the component has been mounted and has a DOM representation.
         * However, there is no guarantee that the DOM node is in the document.
         *
         * Use this as an opportunity to operate on the DOM when the component has
         * been mounted (initialized and rendered) for the first time.
         *
         * @param {DOMElement} rootNode DOM element representing the component.
         * @optional
         */
        componentDidMount: 'DEFINE_MANY',

        /**
         * Invoked before the component receives new props.
         *
         * Use this as an opportunity to react to a prop transition by updating the
         * state using `this.setState`. Current props are accessed via `this.props`.
         *
         *   componentWillReceiveProps: function(nextProps, nextContext) {
         *     this.setState({
         *       likesIncreasing: nextProps.likeCount > this.props.likeCount
         *     });
         *   }
         *
         * NOTE: There is no equivalent `componentWillReceiveState`. An incoming prop
         * transition may cause a state change, but the opposite is not true. If you
         * need it, you are probably looking for `componentWillUpdate`.
         *
         * @param {object} nextProps
         * @optional
         */
        componentWillReceiveProps: 'DEFINE_MANY',

        /**
         * Invoked while deciding if the component should be updated as a result of
         * receiving new props, state and/or context.
         *
         * Use this as an opportunity to `return false` when you're certain that the
         * transition to the new props/state/context will not require a component
         * update.
         *
         *   shouldComponentUpdate: function(nextProps, nextState, nextContext) {
         *     return !equal(nextProps, this.props) ||
         *       !equal(nextState, this.state) ||
         *       !equal(nextContext, this.context);
         *   }
         *
         * @param {object} nextProps
         * @param {?object} nextState
         * @param {?object} nextContext
         * @return {boolean} True if the component should update.
         * @optional
         */
        shouldComponentUpdate: 'DEFINE_ONCE',

        /**
         * Invoked when the component is about to update due to a transition from
         * `this.props`, `this.state` and `this.context` to `nextProps`, `nextState`
         * and `nextContext`.
         *
         * Use this as an opportunity to perform preparation before an update occurs.
         *
         * NOTE: You **cannot** use `this.setState()` in this method.
         *
         * @param {object} nextProps
         * @param {?object} nextState
         * @param {?object} nextContext
         * @param {ReactReconcileTransaction} transaction
         * @optional
         */
        componentWillUpdate: 'DEFINE_MANY',

        /**
         * Invoked when the component's DOM representation has been updated.
         *
         * Use this as an opportunity to operate on the DOM when the component has
         * been updated.
         *
         * @param {object} prevProps
         * @param {?object} prevState
         * @param {?object} prevContext
         * @param {DOMElement} rootNode DOM element representing the component.
         * @optional
         */
        componentDidUpdate: 'DEFINE_MANY',

        /**
         * Invoked when the component is about to be removed from its parent and have
         * its DOM representation destroyed.
         *
         * Use this as an opportunity to deallocate any external resources.
         *
         * NOTE: There is no `componentDidUnmount` since your component will have been
         * destroyed by that point.
         *
         * @optional
         */
        componentWillUnmount: 'DEFINE_MANY',

        /**
         * Replacement for (deprecated) `componentWillMount`.
         *
         * @optional
         */
        UNSAFE_componentWillMount: 'DEFINE_MANY',

        /**
         * Replacement for (deprecated) `componentWillReceiveProps`.
         *
         * @optional
         */
        UNSAFE_componentWillReceiveProps: 'DEFINE_MANY',

        /**
         * Replacement for (deprecated) `componentWillUpdate`.
         *
         * @optional
         */
        UNSAFE_componentWillUpdate: 'DEFINE_MANY',

        // ==== Advanced methods ====

        /**
         * Updates the component's currently mounted DOM representation.
         *
         * By default, this implements React's rendering and reconciliation algorithm.
         * Sophisticated clients may wish to override this.
         *
         * @param {ReactReconcileTransaction} transaction
         * @internal
         * @overridable
         */
        updateComponent: 'OVERRIDE_BASE'
      };

      /**
       * Similar to ReactClassInterface but for static methods.
       */
      var ReactClassStaticInterface = {
        /**
         * This method is invoked after a component is instantiated and when it
         * receives new props. Return an object to update state in response to
         * prop changes. Return null to indicate no change to state.
         *
         * If an object is returned, its keys will be merged into the existing state.
         *
         * @return {object || null}
         * @optional
         */
        getDerivedStateFromProps: 'DEFINE_MANY_MERGED'
      };

      /**
       * Mapping from class specification keys to special processing functions.
       *
       * Although these are declared like instance properties in the specification
       * when defining classes using `React.createClass`, they are actually static
       * and are accessible on the constructor instead of the prototype. Despite
       * being static, they must be defined outside of the "statics" key under
       * which all other static methods are defined.
       */
      var RESERVED_SPEC_KEYS = {
        displayName: function(Constructor, displayName) {
          Constructor.displayName = displayName;
        },
        mixins: function(Constructor, mixins) {
          if (mixins) {
            for (var i = 0; i < mixins.length; i++) {
              mixSpecIntoComponent(Constructor, mixins[i]);
            }
          }
        },
        childContextTypes: function(Constructor, childContextTypes) {
          Constructor.childContextTypes = _assign$3(
            {},
            Constructor.childContextTypes,
            childContextTypes
          );
        },
        contextTypes: function(Constructor, contextTypes) {
          Constructor.contextTypes = _assign$3(
            {},
            Constructor.contextTypes,
            contextTypes
          );
        },
        /**
         * Special case getDefaultProps which should move into statics but requires
         * automatic merging.
         */
        getDefaultProps: function(Constructor, getDefaultProps) {
          if (Constructor.getDefaultProps) {
            Constructor.getDefaultProps = createMergedResultFunction(
              Constructor.getDefaultProps,
              getDefaultProps
            );
          } else {
            Constructor.getDefaultProps = getDefaultProps;
          }
        },
        propTypes: function(Constructor, propTypes) {
          Constructor.propTypes = _assign$3({}, Constructor.propTypes, propTypes);
        },
        statics: function(Constructor, statics) {
          mixStaticSpecIntoComponent(Constructor, statics);
        },
        autobind: function() {}
      };

      function validateMethodOverride(isAlreadyDefined, name) {
        var specPolicy = ReactClassInterface.hasOwnProperty(name)
          ? ReactClassInterface[name]
          : null;

        // Disallow overriding of base class methods unless explicitly allowed.
        if (ReactClassMixin.hasOwnProperty(name)) {
          _invariant(
            specPolicy === 'OVERRIDE_BASE',
            'ReactClassInterface: You are attempting to override ' +
              '`%s` from your class specification. Ensure that your method names ' +
              'do not overlap with React methods.',
            name
          );
        }

        // Disallow defining methods more than once unless explicitly allowed.
        if (isAlreadyDefined) {
          _invariant(
            specPolicy === 'DEFINE_MANY' || specPolicy === 'DEFINE_MANY_MERGED',
            'ReactClassInterface: You are attempting to define ' +
              '`%s` on your component more than once. This conflict may be due ' +
              'to a mixin.',
            name
          );
        }
      }

      /**
       * Mixin helper which handles policy validation and reserved
       * specification keys when building React classes.
       */
      function mixSpecIntoComponent(Constructor, spec) {
        if (!spec) {
          return;
        }

        _invariant(
          typeof spec !== 'function',
          "ReactClass: You're attempting to " +
            'use a component class or function as a mixin. Instead, just use a ' +
            'regular object.'
        );
        _invariant(
          !isValidElement(spec),
          "ReactClass: You're attempting to " +
            'use a component as a mixin. Instead, just use a regular object.'
        );

        var proto = Constructor.prototype;
        var autoBindPairs = proto.__reactAutoBindPairs;

        // By handling mixins before any other properties, we ensure the same
        // chaining order is applied to methods with DEFINE_MANY policy, whether
        // mixins are listed before or after these methods in the spec.
        if (spec.hasOwnProperty(MIXINS_KEY)) {
          RESERVED_SPEC_KEYS.mixins(Constructor, spec.mixins);
        }

        for (var name in spec) {
          if (!spec.hasOwnProperty(name)) {
            continue;
          }

          if (name === MIXINS_KEY) {
            // We have already handled mixins in a special case above.
            continue;
          }

          var property = spec[name];
          var isAlreadyDefined = proto.hasOwnProperty(name);
          validateMethodOverride(isAlreadyDefined, name);

          if (RESERVED_SPEC_KEYS.hasOwnProperty(name)) {
            RESERVED_SPEC_KEYS[name](Constructor, property);
          } else {
            // Setup methods on prototype:
            // The following member methods should not be automatically bound:
            // 1. Expected ReactClass methods (in the "interface").
            // 2. Overridden methods (that were mixed in).
            var isReactClassMethod = ReactClassInterface.hasOwnProperty(name);
            var isFunction = typeof property === 'function';
            var shouldAutoBind =
              isFunction &&
              !isReactClassMethod &&
              !isAlreadyDefined &&
              spec.autobind !== false;

            if (shouldAutoBind) {
              autoBindPairs.push(name, property);
              proto[name] = property;
            } else {
              if (isAlreadyDefined) {
                var specPolicy = ReactClassInterface[name];

                // These cases should already be caught by validateMethodOverride.
                _invariant(
                  isReactClassMethod &&
                    (specPolicy === 'DEFINE_MANY_MERGED' ||
                      specPolicy === 'DEFINE_MANY'),
                  'ReactClass: Unexpected spec policy %s for key %s ' +
                    'when mixing in component specs.',
                  specPolicy,
                  name
                );

                // For methods which are defined more than once, call the existing
                // methods before calling the new property, merging if appropriate.
                if (specPolicy === 'DEFINE_MANY_MERGED') {
                  proto[name] = createMergedResultFunction(proto[name], property);
                } else if (specPolicy === 'DEFINE_MANY') {
                  proto[name] = createChainedFunction(proto[name], property);
                }
              } else {
                proto[name] = property;
                
              }
            }
          }
        }
      }

      function mixStaticSpecIntoComponent(Constructor, statics) {
        if (!statics) {
          return;
        }

        for (var name in statics) {
          var property = statics[name];
          if (!statics.hasOwnProperty(name)) {
            continue;
          }

          var isReserved = name in RESERVED_SPEC_KEYS;
          _invariant(
            !isReserved,
            'ReactClass: You are attempting to define a reserved ' +
              'property, `%s`, that shouldn\'t be on the "statics" key. Define it ' +
              'as an instance property instead; it will still be accessible on the ' +
              'constructor.',
            name
          );

          var isAlreadyDefined = name in Constructor;
          if (isAlreadyDefined) {
            var specPolicy = ReactClassStaticInterface.hasOwnProperty(name)
              ? ReactClassStaticInterface[name]
              : null;

            _invariant(
              specPolicy === 'DEFINE_MANY_MERGED',
              'ReactClass: You are attempting to define ' +
                '`%s` on your component more than once. This conflict may be ' +
                'due to a mixin.',
              name
            );

            Constructor[name] = createMergedResultFunction(Constructor[name], property);

            return;
          }

          Constructor[name] = property;
        }
      }

      /**
       * Merge two objects, but throw if both contain the same key.
       *
       * @param {object} one The first object, which is mutated.
       * @param {object} two The second object
       * @return {object} one after it has been mutated to contain everything in two.
       */
      function mergeIntoWithNoDuplicateKeys(one, two) {
        _invariant(
          one && two && typeof one === 'object' && typeof two === 'object',
          'mergeIntoWithNoDuplicateKeys(): Cannot merge non-objects.'
        );

        for (var key in two) {
          if (two.hasOwnProperty(key)) {
            _invariant(
              one[key] === undefined,
              'mergeIntoWithNoDuplicateKeys(): ' +
                'Tried to merge two objects with the same key: `%s`. This conflict ' +
                'may be due to a mixin; in particular, this may be caused by two ' +
                'getInitialState() or getDefaultProps() methods returning objects ' +
                'with clashing keys.',
              key
            );
            one[key] = two[key];
          }
        }
        return one;
      }

      /**
       * Creates a function that invokes two functions and merges their return values.
       *
       * @param {function} one Function to invoke first.
       * @param {function} two Function to invoke second.
       * @return {function} Function that invokes the two argument functions.
       * @private
       */
      function createMergedResultFunction(one, two) {
        return function mergedResult() {
          var a = one.apply(this, arguments);
          var b = two.apply(this, arguments);
          if (a == null) {
            return b;
          } else if (b == null) {
            return a;
          }
          var c = {};
          mergeIntoWithNoDuplicateKeys(c, a);
          mergeIntoWithNoDuplicateKeys(c, b);
          return c;
        };
      }

      /**
       * Creates a function that invokes two functions and ignores their return vales.
       *
       * @param {function} one Function to invoke first.
       * @param {function} two Function to invoke second.
       * @return {function} Function that invokes the two argument functions.
       * @private
       */
      function createChainedFunction(one, two) {
        return function chainedFunction() {
          one.apply(this, arguments);
          two.apply(this, arguments);
        };
      }

      /**
       * Binds a method to the component.
       *
       * @param {object} component Component whose method is going to be bound.
       * @param {function} method Method to be bound.
       * @return {function} The bound method.
       */
      function bindAutoBindMethod(component, method) {
        var boundMethod = method.bind(component);
        return boundMethod;
      }

      /**
       * Binds all auto-bound methods in a component.
       *
       * @param {object} component Component whose method is going to be bound.
       */
      function bindAutoBindMethods(component) {
        var pairs = component.__reactAutoBindPairs;
        for (var i = 0; i < pairs.length; i += 2) {
          var autoBindKey = pairs[i];
          var method = pairs[i + 1];
          component[autoBindKey] = bindAutoBindMethod(component, method);
        }
      }

      var IsMountedPreMixin = {
        componentDidMount: function() {
          this.__isMounted = true;
        }
      };

      var IsMountedPostMixin = {
        componentWillUnmount: function() {
          this.__isMounted = false;
        }
      };

      /**
       * Add more to the ReactClass base class. These are all legacy features and
       * therefore not already part of the modern ReactComponent.
       */
      var ReactClassMixin = {
        /**
         * TODO: This will be deprecated because state should always keep a consistent
         * type signature and the only use case for this, is to avoid that.
         */
        replaceState: function(newState, callback) {
          this.updater.enqueueReplaceState(this, newState, callback);
        },

        /**
         * Checks whether or not this composite component is mounted.
         * @return {boolean} True if mounted, false otherwise.
         * @protected
         * @final
         */
        isMounted: function() {
          return !!this.__isMounted;
        }
      };

      var ReactClassComponent = function() {};
      _assign$3(
        ReactClassComponent.prototype,
        ReactComponent.prototype,
        ReactClassMixin
      );

      /**
       * Creates a composite component class given a class specification.
       * See https://facebook.github.io/react/docs/top-level-api.html#react.createclass
       *
       * @param {object} spec Class specification (which must define `render`).
       * @return {function} Component constructor function.
       * @public
       */
      function createClass(spec) {
        // To keep our warnings more understandable, we'll use a little hack here to
        // ensure that Constructor.name !== 'Constructor'. This makes sure we don't
        // unnecessarily identify a class without displayName as 'Constructor'.
        var Constructor = identity(function(props, context, updater) {
          // This constructor gets overridden by mocks. The argument is used
          // by mocks to assert on what gets mounted.

          if (this.__reactAutoBindPairs.length) {
            bindAutoBindMethods(this);
          }

          this.props = props;
          this.context = context;
          this.refs = emptyObject$2;
          this.updater = updater || ReactNoopUpdateQueue;

          this.state = null;

          // ReactClasses doesn't have constructors. Instead, they use the
          // getInitialState and componentWillMount methods for initialization.

          var initialState = this.getInitialState ? this.getInitialState() : null;
          _invariant(
            typeof initialState === 'object' && !Array.isArray(initialState),
            '%s.getInitialState(): must return an object or null',
            Constructor.displayName || 'ReactCompositeComponent'
          );

          this.state = initialState;
        });
        Constructor.prototype = new ReactClassComponent();
        Constructor.prototype.constructor = Constructor;
        Constructor.prototype.__reactAutoBindPairs = [];

        injectedMixins.forEach(mixSpecIntoComponent.bind(null, Constructor));

        mixSpecIntoComponent(Constructor, IsMountedPreMixin);
        mixSpecIntoComponent(Constructor, spec);
        mixSpecIntoComponent(Constructor, IsMountedPostMixin);

        // Initialize the defaultProps property after all mixins have been merged.
        if (Constructor.getDefaultProps) {
          Constructor.defaultProps = Constructor.getDefaultProps();
        }

        _invariant(
          Constructor.prototype.render,
          'createClass(...): Class specification must implement a `render` method.'
        );

        for (var methodName in ReactClassInterface) {
          if (!Constructor.prototype[methodName]) {
            Constructor.prototype[methodName] = null;
          }
        }

        return Constructor;
      }

      return createClass;
    }

    var factory_1$2 = factory$3;

    var _require$1 = ReactBaseClasses$1;
    var Component = _require$1.Component;

    var _require2 = ReactElement_1;
    var isValidElement$1 = _require2.isValidElement;

    var ReactNoopUpdateQueue$2 = ReactNoopUpdateQueue_1;
    var factory$2 = factory_1$2;

    var createClass = factory$2(Component, isValidElement$1, ReactNoopUpdateQueue$2);

    var _prodInvariant$5 = reactProdInvariant_1;

    var ReactElement$5 = ReactElement_1;

    /**
     * Returns the first child in a collection of children and verifies that there
     * is only one child in the collection.
     *
     * See https://facebook.github.io/react/docs/top-level-api.html#react.children.only
     *
     * The current implementation of this function assumes that a single child gets
     * passed without a wrapper, but the purpose of this helper function is to
     * abstract away the particular structure of children.
     *
     * @param {?object} children Child collection structure.
     * @return {ReactElement} The first and only `ReactElement` contained in the
     * structure.
     */
    function onlyChild$1(children) {
      !ReactElement$5.isValidElement(children) ? _prodInvariant$5('143') : void 0;
      return children;
    }

    var onlyChild_1 = onlyChild$1;

    var _assign = index$2;

    var ReactBaseClasses = ReactBaseClasses$1;
    var ReactChildren = ReactChildren_1;
    var ReactDOMFactories = ReactDOMFactories_1;
    var ReactElement = ReactElement_1;
    var ReactPropTypes = ReactPropTypes$1;
    var ReactVersion = ReactVersion$1;

    var createReactClass = createClass;
    var onlyChild = onlyChild_1;

    var createElement = ReactElement.createElement;
    var createFactory = ReactElement.createFactory;
    var cloneElement = ReactElement.cloneElement;

    var __spread = _assign;
    var createMixin = function (mixin) {
      return mixin;
    };

    var React = {
      // Modern

      Children: {
        map: ReactChildren.map,
        forEach: ReactChildren.forEach,
        count: ReactChildren.count,
        toArray: ReactChildren.toArray,
        only: onlyChild
      },

      Component: ReactBaseClasses.Component,
      PureComponent: ReactBaseClasses.PureComponent,

      createElement: createElement,
      cloneElement: cloneElement,
      isValidElement: ReactElement.isValidElement,

      // Classic

      PropTypes: ReactPropTypes,
      createClass: createReactClass,
      createFactory: createFactory,
      createMixin: createMixin,

      // This looks DOM specific but these are actually isomorphic helpers
      // since they are just generating DOM strings.
      DOM: ReactDOMFactories,

      version: ReactVersion,

      // Deprecated hook for JSX spread, don't use this for anything.
      __spread: __spread
    };

    var React_1 = React;

    var react = React_1;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     * 
     */

    function makeEmptyFunction$1(arg) {
      return function () {
        return arg;
      };
    }

    /**
     * This function accepts and discards inputs; it has no side effects. This is
     * primarily useful idiomatically for overridable function endpoints which
     * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
     */
    var emptyFunction$5 = function emptyFunction() {};

    emptyFunction$5.thatReturns = makeEmptyFunction$1;
    emptyFunction$5.thatReturnsFalse = makeEmptyFunction$1(false);
    emptyFunction$5.thatReturnsTrue = makeEmptyFunction$1(true);
    emptyFunction$5.thatReturnsNull = makeEmptyFunction$1(null);
    emptyFunction$5.thatReturnsThis = function () {
      return this;
    };
    emptyFunction$5.thatReturnsArgument = function (arg) {
      return arg;
    };

    var emptyFunction_1$2 = emptyFunction$5;

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     *
     */

    /**
     * Use invariant() to assert state which your program assumes to be true.
     *
     * Provide sprintf-style format (only %s is supported) and arguments
     * to provide information about what broke and what you were
     * expecting.
     *
     * The invariant message will be stripped in production, but the invariant
     * will remain to ensure logic does not differ in production.
     */

    var validateFormat$1 = function validateFormat(format) {};

    function invariant$10(condition, format, a, b, c, d, e, f) {
      validateFormat$1(format);

      if (!condition) {
        var error;
        if (format === undefined) {
          error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
        } else {
          var args = [a, b, c, d, e, f];
          var argIndex = 0;
          error = new Error(format.replace(/%s/g, function () {
            return args[argIndex++];
          }));
          error.name = 'Invariant Violation';
        }

        error.framesToPop = 1; // we don't care about invariant's own frame
        throw error;
      }
    }

    var invariant_1$2 = invariant$10;

    /*
    object-assign
    (c) Sindre Sorhus
    @license MIT
    */

    /* eslint-disable no-unused-vars */
    var getOwnPropertySymbols$1 = Object.getOwnPropertySymbols;
    var hasOwnProperty$2 = Object.prototype.hasOwnProperty;
    var propIsEnumerable$1 = Object.prototype.propertyIsEnumerable;

    function toObject$1(val) {
    	if (val === null || val === undefined) {
    		throw new TypeError('Object.assign cannot be called with null or undefined');
    	}

    	return Object(val);
    }

    function shouldUseNative$1() {
    	try {
    		if (!Object.assign) {
    			return false;
    		}

    		// Detect buggy property enumeration order in older V8 versions.

    		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
    		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
    		test1[5] = 'de';
    		if (Object.getOwnPropertyNames(test1)[0] === '5') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test2 = {};
    		for (var i = 0; i < 10; i++) {
    			test2['_' + String.fromCharCode(i)] = i;
    		}
    		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
    			return test2[n];
    		});
    		if (order2.join('') !== '0123456789') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test3 = {};
    		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
    			test3[letter] = letter;
    		});
    		if (Object.keys(Object.assign({}, test3)).join('') !==
    				'abcdefghijklmnopqrst') {
    			return false;
    		}

    		return true;
    	} catch (err) {
    		// We don't expect any of the above to throw, but better to be safe.
    		return false;
    	}
    }

    var index$6 = shouldUseNative$1() ? Object.assign : function (target, source) {
    	var from;
    	var to = toObject$1(target);
    	var symbols;

    	for (var s = 1; s < arguments.length; s++) {
    		from = Object(arguments[s]);

    		for (var key in from) {
    			if (hasOwnProperty$2.call(from, key)) {
    				to[key] = from[key];
    			}
    		}

    		if (getOwnPropertySymbols$1) {
    			symbols = getOwnPropertySymbols$1(from);
    			for (var i = 0; i < symbols.length; i++) {
    				if (propIsEnumerable$1.call(from, symbols[i])) {
    					to[symbols[i]] = from[symbols[i]];
    				}
    			}
    		}
    	}

    	return to;
    };

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var ReactPropTypesSecret$6 = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

    var ReactPropTypesSecret_1$4 = ReactPropTypesSecret$6;

    var emptyFunction$7 = emptyFunction_1$2;
    var invariant$12 = invariant_1$2;
    var ReactPropTypesSecret$8 = ReactPropTypesSecret_1$4;

    var factoryWithThrowingShims = function() {
      function shim(props, propName, componentName, location, propFullName, secret) {
        if (secret === ReactPropTypesSecret$8) {
          // It is still safe when called from React.
          return;
        }
        invariant$12(
          false,
          'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
          'Use PropTypes.checkPropTypes() to call them. ' +
          'Read more at http://fb.me/use-check-prop-types'
        );
      }
      shim.isRequired = shim;
      function getShim() {
        return shim;
      }
      // Important!
      // Keep this list in sync with production version in `./factoryWithTypeCheckers.js`.
      var ReactPropTypes = {
        array: shim,
        bool: shim,
        func: shim,
        number: shim,
        object: shim,
        string: shim,
        symbol: shim,

        any: shim,
        arrayOf: getShim,
        element: shim,
        instanceOf: getShim,
        node: shim,
        objectOf: getShim,
        oneOf: getShim,
        oneOfType: getShim,
        shape: getShim,
        exact: getShim
      };

      ReactPropTypes.checkPropTypes = emptyFunction$7;
      ReactPropTypes.PropTypes = ReactPropTypes;

      return ReactPropTypes;
    };

    var index$4 = createCommonjsModule(function (module) {
    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    {
      // By explicitly using `prop-types` you are opting into new production behavior.
      // http://fb.me/prop-types-in-prod
      module.exports = factoryWithThrowingShims();
    }
    });

    var LayerProvider_1 = createCommonjsModule(function (module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _react = react;

    var _propTypes = index$4;

    var _propTypes2 = _interopRequireDefault(_propTypes);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    /**
     * This class uses React's childContexts to propagate the client property to all
     * subcomponents within this component's subtree.  Subcomponents access
     * the client property via `this.context.client`.
     *
     * This component expects only a single subcomponent, which in turn can have many subcomponents.
     */
    var LayerProvider = function (_Component) {
      _inherits(LayerProvider, _Component);

      function LayerProvider(props, context) {
        _classCallCheck(this, LayerProvider);

        var _this = _possibleConstructorReturn(this, (LayerProvider.__proto__ || Object.getPrototypeOf(LayerProvider)).call(this, props, context));

        _this.client = props.client;
        return _this;
      }

      _createClass(LayerProvider, [{
        key: 'getChildContext',
        value: function getChildContext() {
          return { client: this.client };
        }
      }, {
        key: 'render',
        value: function render() {
          var children = this.props.children;


          if (typeof children === 'function') {
            children = children();
          }

          return _react.Children.only(children);
        }
      }]);

      return LayerProvider;
    }(_react.Component);

    LayerProvider.propTypes = {
      client: _propTypes2.default.object.isRequired,
      children: _propTypes2.default.element
    };
    LayerProvider.childContextTypes = {
      client: _propTypes2.default.object.isRequired
    };
    exports.default = LayerProvider;
    });

    var connectQuery = createCommonjsModule(function (module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _react = react;

    var _react2 = _interopRequireDefault(_react);

    var _propTypes = index$4;

    var _propTypes2 = _interopRequireDefault(_propTypes);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    /**
     * Connects your Queries to your React Component properties.
     * In the example below, a ConversationList is passed in,
     * and a ConversationListContainer that contains a child of ConversationList
     * and which provides ConversationList with properties provided
     * by the queries.
     *
          function getInitialQueryParams (props) {
            return {
              paginationWindow: props.startingPaginationWindow || 100
            };
          }

          function getQueries(props, queryParams) {
            return {
              conversations: QueryBuilder.conversations().paginationWindow(queryParams.paginationWindow)
            };
          }

          var ConversationListContainer = connectQuery(getInitialQueryParams, getQueries)(ConversationList);
     *
     * @method connectQuery
     * @param  {Object|Function} getInitialQueryParams   Initial properties for all queries
     * @param  {Function} getQueries          A function that returns a hash of QueryBuilders
     * @param {Object} getQueries.props       All properties passed in from the parent of this component
     * @param {Object} getQueries.queryParams Initial property values as specified by getInitialQueryParams
     * @param {Object} getQueries.return      A hash of Query instances
     * @return {Function}                     Call this function to create a wrapped component which can be
     *                                        be rendered and which passes query data to your component.
     */
    exports.default = function () {
      var getInitialQueryParams = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var getQueries = arguments[1];
      return (
        /**
         * Takes a Component, and wraps it with a QueryContainer (makes the
         * input Component a child Component of the QueryContainer) and
         * passes in Query data to the wrapped Component in the form of properties.
         * Note that the property names will match the keys returned by getQueries().
         *
         * @method
         * @param  {Component} ComposedComponent   The Component to wrap
         * @return {QueryContainer}                A Component that wraps the specified Component
         */
        function (ComposedComponent) {
          var _class, _temp, _initialiseProps;

          return (
            /**
             * A Component which manages a set of Queries and passes the output
             * of those queries into its child component.
             *
             * @class QueryContainer
             * @extends {react.Component}
             */
            _temp = _class = function (_Component) {
              _inherits(QueryContainer, _Component);

              /**
               * Call getQueries to get our QueryBuilder instances, and populate
               * state with the Query Parameters and Query Results (initially results
               * are all [])
               *
               * @method constructor
               */
              function QueryContainer(props, context) {
                _classCallCheck(this, QueryContainer);

                var _this = _possibleConstructorReturn(this, (QueryContainer.__proto__ || Object.getPrototypeOf(QueryContainer)).call(this, props, context));

                _initialiseProps.call(_this);

                _this.client = props.client || context.client;
                _this.queries = {};
                _this.callbacks = {};

                var queryParams = typeof getInitialQueryParams === 'function' ? getInitialQueryParams(props) : getInitialQueryParams;

                var queryBuilders = getQueries(props, queryParams);

                // Set initial queryResults to empty arrays.
                var queryResults = Object.keys(queryBuilders).reduce(function (obj, key) {
                  return _extends({}, obj, _defineProperty({}, key, []));
                }, {});

                _this.state = {
                  queryResults: queryResults,
                  queryParams: queryParams
                };
                return _this;
              }

              /**
               * On mounting (and once the client is ready) call _updateQueries
               */


              // Necessary in order to grab client out of the context.
              // TODO: May want to rename to layerClient to avoid conflicts.


              _createClass(QueryContainer, [{
                key: 'componentWillMount',
                value: function componentWillMount() {
                  this.client.on('ready', this._onClientReady);

                  if (this.client.isReady) {
                    this._updateQueries(this.props, this.state.queryParams);
                  }
                }
              }, {
                key: 'componentWillReceiveProps',
                value: function componentWillReceiveProps(nextProps) {
                  this._updateQueries(nextProps, this.state.queryParams);
                }

                /**
                 * Generate the this.queries object to contain
                 * layer.Query instances based on the getQueries()
                 * QueryBuilders.  If the query already exists, update
                 * it rather than replace it.
                 *
                 * @method _updateQueries
                 * @private
                 * @param  {Object}   props       Component properties
                 * @param  {Object}   queryParams Query properties
                 * @param  {Function} callback
                 */


                /**
                 * Any time the Query's data changes,
                 * update this.state.queryResults[queryName]
                 * with the new results.  Setting state will cause
                 * the render method to pass the updated query data
                 * to its ComposedComponent.
                 *
                 * @method _onQueryChange
                 * @param  {string} queryName    - Name of the query (name comes from keys returned by getQueries())
                 * @param  {Object[]} newResults - Array of query results
                 */

              }, {
                key: 'render',


                /**
                 * Pass any properties provided to the QueryContainer
                 * to its child container, along with the query results,
                 * query parameters, and a setQueryParams function.
                 *
                 * @method render
                 */
                value: function render() {
                  var _this2 = this;

                  var _state = this.state,
                      queryParams = _state.queryParams,
                      queryResults = _state.queryResults;


                  var queryIds = {};
                  Object.keys(this.queries).forEach(function (key) {
                    queryIds[key] = _this2.queries[key].id;
                  });

                  var passedProps = _extends({}, queryResults, {
                    query: {
                      queryParams: queryParams,
                      setQueryParams: this.setQueryParams,
                      queryIds: queryIds
                    }
                  });

                  return _react2.default.createElement(ComposedComponent, _extends({}, this.props, passedProps));
                }
              }, {
                key: 'componentWillUnmount',
                value: function componentWillUnmount() {
                  var _this3 = this;

                  // When the component unmounts, unsubscribe from all event listeners.
                  Object.keys(this.queries).forEach(function (key) {
                    var query = _this3.queries[key];
                    query.off('change', _this3.callbacks[query.internalId]);
                    _this3.client.off('ready', _this3._onClientReady, _this3);
                  });
                }
              }]);

              return QueryContainer;
            }(_react.Component), _class.propTypes = {
              client: _propTypes2.default.object }, _class.contextTypes = {
              client: _propTypes2.default.object }, _initialiseProps = function _initialiseProps() {
              var _this4 = this;

              this._onClientReady = function () {
                _this4._updateQueries(_this4.props, _this4.state.queryParams);
              };

              this.setQueryParams = function (nextQueryParams, callback) {
                _this4._updateQueries(_this4.props, nextQueryParams, callback);
              };

              this._updateQueries = function (props, queryParams, callback) {
                var queryBuilders = getQueries(props, queryParams);

                // Remove any queries that no longer exist
                Object.keys(_this4.queries).forEach(function (key) {
                  if (!queryBuilders[key]) {
                    var query = _this4.queries[key];
                    query.off('change', _this4.callbacks[query.internalId]);

                    delete _this4.queries[key];
                    delete _this4.callbacks[query.internalId];
                  }
                });

                // Update existing queries / Create new queries
                Object.keys(queryBuilders).forEach(function (key) {
                  var query = _this4.queries[key];
                  var builder = queryBuilders[key];

                  if (query) {
                    query.update(builder.build());
                  } else {
                    var newQuery = _this4.client.createQuery(builder);

                    _this4.queries[key] = newQuery;
                    _this4.callbacks[newQuery.internalId] = function () {
                      _this4._onQueryChange(key, newQuery.data);
                    };

                    newQuery.on('change', _this4.callbacks[newQuery.internalId]);
                  }
                });

                _this4.setState({
                  queryParams: queryParams
                }, callback);
              };

              this._onQueryChange = function (queryName, newResults) {
                _this4.setState({
                  queryResults: _extends({}, _this4.state.queryResults, _defineProperty({}, queryName, newResults))
                });
              };
            }, _temp
          );
        }
      );
    };
    });

    var connectTypingIndicator = createCommonjsModule(function (module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _react = react;

    var _react2 = _interopRequireDefault(_react);

    var _propTypes = index$4;

    var _propTypes2 = _interopRequireDefault(_propTypes);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * The createTypingIndicator module creates a Wrapped Component;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * it takes in a Client (typically via the LayerProvider)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * and a conversationId (the Conversation the user is currently viewing)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * and adds `typing` and `paused` properties to the Wrapped Component
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * allowing for the component to render a typing indicator.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    */


    /**
     * Exports a function that takes as input a Component to wrap and returns a new Component.
     * The new Component takes as input a client and conversationId, and adds `typing` and `paused`
     * properties to the component that was passed as input, allowing for the component to render a typing indicator.
     *
     * @method connectTypingIndicator
     * @return {Function}      Call this function to create a wrapped component which can be
     *                         be rendered and which passes typing indicator data to its child.
     */
    exports.default = function () {
      return (
        /**
         * Takes a Component, and wraps it with a TypingIndicatorContainer (makes the
         * input Component a child Component of the TypingIndicatorContainer) and
         * passes in typing indicator data to the wrapped Component in the form of properties.
         *
         * @method
         * @param  {Component} ComposedComponent   The Component to wrap
         * @return {TypingIndicatorContainer}      A Component that wraps the specified Component
         */
        function (ComposedComponent) {
          var _class, _temp;

          return (
            /**
             * The TypingIndicatorContainer listens for typing indicator events from the client that
             * relate to the current conversation, and passes typing and paused properties into its child
             * component.
             *
             * @class TypingIndicatorContainer
             * @extends {react.Component}
             */
            _temp = _class = function (_Component) {
              _inherits(TypingIndicatorContainer, _Component);

              function TypingIndicatorContainer(props, context) {
                _classCallCheck(this, TypingIndicatorContainer);

                var _this = _possibleConstructorReturn(this, (TypingIndicatorContainer.__proto__ || Object.getPrototypeOf(TypingIndicatorContainer)).call(this, props, context));

                _this.onTypingIndicatorChange = function (_ref) {
                  var conversationId = _ref.conversationId,
                      typing = _ref.typing,
                      paused = _ref.paused;

                  if (conversationId === _this.props.conversationId) {
                    _this.setState({
                      typing: typing,
                      paused: paused
                    });
                  }
                };

                _this.client = props.client || context.client;

                _this.state = {
                  typing: [],
                  paused: []
                };
                return _this;
              }

              // Necessary in order to grab client out of the context.
              // TODO: May want to rename to layerClient to avoid conflicts.


              _createClass(TypingIndicatorContainer, [{
                key: 'componentWillMount',
                value: function componentWillMount() {
                  this.client.on('typing-indicator-change', this.onTypingIndicatorChange);
                }
              }, {
                key: 'componentWillReceiveProps',
                value: function componentWillReceiveProps(nextProps) {
                  if (this.props.conversationId !== nextProps.conversationId) {
                    this.setState({
                      typing: [],
                      paused: []
                    });
                  }
                }
              }, {
                key: 'render',
                value: function render() {
                  return _react2.default.createElement(ComposedComponent, _extends({}, this.props, this.state));
                }
              }, {
                key: 'componentWillUnmount',
                value: function componentWillUnmount() {
                  this.client.off('typing-indicator-change', this.onTypingIndicatorChange);
                }
              }]);

              return TypingIndicatorContainer;
            }(_react.Component), _class.propTypes = {
              client: _propTypes2.default.object,
              conversationId: _propTypes2.default.string }, _class.contextTypes = {
              client: _propTypes2.default.object
            }, _temp
          );
        }
      );
    };
    });

    var index = createCommonjsModule(function (module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _LayerProvider = LayerProvider_1;

    Object.defineProperty(exports, 'LayerProvider', {
      enumerable: true,
      get: function get() {
        return _interopRequireDefault(_LayerProvider).default;
      }
    });

    var _connectQuery = connectQuery;

    Object.defineProperty(exports, 'connectQuery', {
      enumerable: true,
      get: function get() {
        return _interopRequireDefault(_connectQuery).default;
      }
    });

    var _connectTypingIndicator = connectTypingIndicator;

    Object.defineProperty(exports, 'connectTypingIndicator', {
      enumerable: true,
      get: function get() {
        return _interopRequireDefault(_connectTypingIndicator).default;
      }
    });

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
    });

    var LayerProvider = index;

    var layerReact = LayerProvider;

    return layerReact;

})));
