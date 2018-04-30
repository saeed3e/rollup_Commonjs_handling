var specs = (function () {
	'use strict';

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var rng;

	var crypto = commonjsGlobal.crypto || commonjsGlobal.msCrypto; // for IE 11
	if (crypto && crypto.getRandomValues) {
	  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
	  // Moderately fast, high quality
	  var _rnds8 = new Uint8Array(16);
	  rng = function whatwgRNG() {
	    crypto.getRandomValues(_rnds8);
	    return _rnds8;
	  };
	}

	if (!rng) {
	  // Math.random()-based (RNG)
	  //
	  // If all else fails, use Math.random().  It's fast, but is of unspecified
	  // quality.
	  var  _rnds = new Array(16);
	  rng = function() {
	    for (var i = 0, r; i < 16; i++) {
	      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
	      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
	    }

	    return _rnds;
	  };
	}

	var rngBrowser = rng;

	//     uuid.js
	//
	//     Copyright (c) 2010-2012 Robert Kieffer
	//     MIT License - http://opensource.org/licenses/mit-license.php

	// Unique ID creation requires a high quality random # generator.  We feature
	// detect to determine the best RNG source, normalizing to a function that
	// returns 128-bits of randomness, since that's what's usually required
	var _rng = rngBrowser;

	// Maps for number <-> hex string conversion
	var _byteToHex = [];
	var _hexToByte = {};
	for (var i = 0; i < 256; i++) {
	  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
	  _hexToByte[_byteToHex[i]] = i;
	}

	// **`parse()` - Parse a UUID into it's component bytes**
	function parse(s, buf, offset) {
	  var i = (buf && offset) || 0, ii = 0;

	  buf = buf || [];
	  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
	    if (ii < 16) { // Don't overflow!
	      buf[i + ii++] = _hexToByte[oct];
	    }
	  });

	  // Zero out remaining bytes if string was short
	  while (ii < 16) {
	    buf[i + ii++] = 0;
	  }

	  return buf;
	}

	// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
	function unparse(buf, offset) {
	  var i = offset || 0, bth = _byteToHex;
	  return  bth[buf[i++]] + bth[buf[i++]] +
	          bth[buf[i++]] + bth[buf[i++]] + '-' +
	          bth[buf[i++]] + bth[buf[i++]] + '-' +
	          bth[buf[i++]] + bth[buf[i++]] + '-' +
	          bth[buf[i++]] + bth[buf[i++]] + '-' +
	          bth[buf[i++]] + bth[buf[i++]] +
	          bth[buf[i++]] + bth[buf[i++]] +
	          bth[buf[i++]] + bth[buf[i++]];
	}

	// **`v1()` - Generate time-based UUID**
	//
	// Inspired by https://github.com/LiosK/UUID.js
	// and http://docs.python.org/library/uuid.html

	// random #'s we need to init node and clockseq
	var _seedBytes = _rng();

	// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	var _nodeId = [
	  _seedBytes[0] | 0x01,
	  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
	];

	// Per 4.2.2, randomize (14 bit) clockseq
	var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

	// Previous uuid creation time
	var _lastMSecs = 0;
	var _lastNSecs = 0;

	// See https://github.com/broofa/node-uuid for API details
	function v1(options, buf, offset) {
	  var i = buf && offset || 0;
	  var b = buf || [];

	  options = options || {};

	  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

	  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
	  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
	  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
	  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
	  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

	  // Per 4.2.1.2, use count of uuid's generated during the current clock
	  // cycle to simulate higher resolution clock
	  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

	  // Time since last uuid creation (in msecs)
	  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

	  // Per 4.2.1.2, Bump clockseq on clock regression
	  if (dt < 0 && options.clockseq === undefined) {
	    clockseq = clockseq + 1 & 0x3fff;
	  }

	  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
	  // time interval
	  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
	    nsecs = 0;
	  }

	  // Per 4.2.1.2 Throw error if too many uuids are requested
	  if (nsecs >= 10000) {
	    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
	  }

	  _lastMSecs = msecs;
	  _lastNSecs = nsecs;
	  _clockseq = clockseq;

	  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
	  msecs += 12219292800000;

	  // `time_low`
	  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
	  b[i++] = tl >>> 24 & 0xff;
	  b[i++] = tl >>> 16 & 0xff;
	  b[i++] = tl >>> 8 & 0xff;
	  b[i++] = tl & 0xff;

	  // `time_mid`
	  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
	  b[i++] = tmh >>> 8 & 0xff;
	  b[i++] = tmh & 0xff;

	  // `time_high_and_version`
	  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
	  b[i++] = tmh >>> 16 & 0xff;

	  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
	  b[i++] = clockseq >>> 8 | 0x80;

	  // `clock_seq_low`
	  b[i++] = clockseq & 0xff;

	  // `node`
	  var node = options.node || _nodeId;
	  for (var n = 0; n < 6; n++) {
	    b[i + n] = node[n];
	  }

	  return buf ? buf : unparse(b);
	}

	// **`v4()` - Generate random UUID**

	// See https://github.com/broofa/node-uuid for API details
	function v4(options, buf, offset) {
	  // Deprecated - 'format' argument, as supported in v1.2
	  var i = buf && offset || 0;

	  if (typeof(options) == 'string') {
	    buf = options == 'binary' ? new Array(16) : null;
	    options = null;
	  }
	  options = options || {};

	  var rnds = options.random || (options.rng || _rng)();

	  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
	  rnds[6] = (rnds[6] & 0x0f) | 0x40;
	  rnds[8] = (rnds[8] & 0x3f) | 0x80;

	  // Copy bytes to buffer, if provided
	  if (buf) {
	    for (var ii = 0; ii < 16; ii++) {
	      buf[i + ii] = rnds[ii];
	    }
	  }

	  return buf || unparse(rnds);
	}

	// Export public API
	var uuid$1 = v4;
	uuid$1.v1 = v1;
	uuid$1.v4 = v4;
	uuid$1.parse = parse;
	uuid$1.unparse = unparse;

	var uuid_1 = uuid$1;

	var defer$1 = createCommonjsModule(function (module) {
	'use strict';

	/**
	 * Execute this function immediately after current processing is complete (setImmediate replacement).
	 *
	 * A depth of up to 10 is allowed.  That means that functions you schedule using defer
	 * can in turn schedule further actions.  The original actions are depth = 0; the actions scheduled
	 * by your actions are depth = 1.  These new actions may in turn schedule further actions, which happen at depth = 3.
	 * But to avoid infinite loops, if depth reaches 10, it clears the queue and ignores them.
	 *
	 * @method defer
	 * @param {Function} f
	 */
	var setImmediate = commonjsGlobal.getNativeSupport && commonjsGlobal.getNativeSupport('setImmediate');
	if (setImmediate) {
	  module.exports = setImmediate;
	} else {

	  // Process all callbacks in the setImmediateQueue
	  var setImmediateProcessor = function setImmediateProcessor() {
	    // Processing the queue is no longer scheduled; clear any scheduling info.
	    setImmediateIsPending = false;
	    clearTimeout(setImmediateId);
	    setImmediateId = 0;

	    // Our initial depth is depth 0
	    setImmediateDepth = 0;
	    setImmediateQueue.push(setImmediateDepth);

	    // Process all functions and depths in the queue starting always with the item at index 0,
	    // and removing them from the queue before processing them.
	    while (setImmediateQueue.length) {
	      var item = setImmediateQueue.shift();
	      if (typeof item === 'function') {
	        try {
	          item();
	        } catch (err) {
	          console.error(err);
	        }
	      } else if (item >= setImmediateMaxDepth) {
	        setImmediateQueue = [];
	        console.error('Layer Error: setImmediate Max Queue Depth Exceded');
	      }
	    }
	  };
	  // Schedule the function to be called by adding it to the queue, and setting up scheduling if its needed.


	  var setImmediateId = 0,
	      setImmediateDepth = 0,


	  // Have we scheduled the queue to be processed? If not, this is false
	  setImmediateIsPending = false,


	  // Queue of functions to call and depth integers
	  setImmediateQueue = [];

	  // If a setImmediate callback itself calls setImmediate which in turn calls setImmediate, at what point do we suspect we have an infinite loop?
	  // A depth of 10 is currently considered OK, but this may need to be increased.
	  var setImmediateMaxDepth = 10;module.exports = function defer(func) {
	    if (typeof func !== 'function') throw new Error('Function expected in defer');

	    setImmediateQueue.push(func);

	    // If postMessage has not already been called, call it
	    if (!setImmediateIsPending) {
	      setImmediateIsPending = true;
	      if (typeof document !== 'undefined') {
	        window.postMessage({ type: 'layer-set-immediate' }, '*');
	      } else {
	        // React Native reportedly lacks a document, and throws errors on the second parameter
	        window.postMessage({ type: 'layer-set-immediate' });
	      }

	      // Having seen scenarios where postMessage failed to trigger, set a backup using setTimeout that will be canceled
	      // if postMessage is succesfully called.
	      setImmediateId = setTimeout(setImmediateProcessor, 0);
	    }
	  };

	  // For Unit Testing
	  module.exports.flush = function () {
	    return setImmediateProcessor();
	  };
	  module.exports.reset = function () {
	    setImmediateQueue = [];
	  };

	  addEventListener('message', function (event) {
	    if (event.data.type !== 'layer-set-immediate') return;
	    setImmediateProcessor();
	  });
	}

	});

	var index$4 = createCommonjsModule(function (module) {
	/**
	 * The layer.js.LayerPatchParser method will parse
	 *
	 * @method
	 * @param {Boolean}   [camelCase=false]             Set the camel cased version of the name of the input object
	 * @param {Object}    [propertyNameMap]             Maps property names in the operation to property names in the local object schema
	 * @param {Object}    [changeCallbacks]             Callback made any time an object is changed
	 * @param {Object}    [abortCallbacks]              Callback made to verify a change is permitted
	 * @param {Function}  [doesObjectMatchIdCallback]   Callback returns boolean to indicate if a given object matches an ID.
	 * @return {Boolean}                                Returns true if all operations completed successfully, false if some returned errors
	 */

	(function() {
	  var opHandlers = {
	    'set': setProp,
	    'delete': deleteProp,
	    'add': addProp,
	    'remove': removeProp
	  };

	  function Parser(options) {
	    this.camelCase = options.camelCase;
	    this.propertyNameMap = options.propertyNameMap;
	    this.changeCallbacks = options.changeCallbacks;
	    this.abortCallbacks = options.abortCallbacks;
	    this.getObjectCallback = options.getObjectCallback;
	    this.createObjectCallback = options.createObjectCallback;
	    this.doesObjectMatchIdCallback = options.doesObjectMatchIdCallback || function(id, obj) {
	      return obj.id == id;
	    };
	    this.returnIds = options.returnIds;
	    return this;
	  }

	  if (typeof module !== 'undefined') {
	    module.exports = Parser;
	  } else {
	    window.LayerPatchParser = Parser;
	  }

	  Parser.prototype.parse = function(options) {
	    var changes = {};
	    options.operations.forEach(function(op) {
	      var propertyDef = getPropertyDef.apply(this, [op.property, options, changes, op]);
	      opHandlers[op.operation].call(this,
	        propertyDef,
	        getValue.apply(this, [op, options]),
	        op, options, changes);
	    }, this);

	    reportChanges.apply(this, [changes, options.object, options.type]);
	  };

	  function reportChanges(changes, updateObject, objectType) {
	    if (this.changeCallbacks && objectType && this.changeCallbacks[objectType]) {
	      Object.keys(changes).forEach(function(key) {
	        if (this.changeCallbacks[objectType].all) {
	          this.changeCallbacks[objectType].all(updateObject, updateObject[key], changes[key].before, changes[key].paths);
	        }
	        else if (this.changeCallbacks[objectType][key]) {
	          this.changeCallbacks[objectType][key](updateObject, updateObject[key], changes[key].before, changes[key].paths);
	        }
	      }, this);
	    }
	  }

	  function getPropertyDef(property, options, changes, operation) {
	    var obj = options.object;
	    var temporarySeparator = String.fromCharCode(145);
	    property = property.replace(/\\\./g, temporarySeparator);
	    property = property.replace(/\\(.)/g, '$1');
	    var parts = property.split(/\./);
	    var r = new RegExp(temporarySeparator, 'g');
	    parts = parts.map(function(part) {
	      return part.replace(r, '.');
	    });
	    if (this.camelCase) {
	      parts[0] = parts[0].replace(/[-_]./g, function(str) {
	        return str[1].toUpperCase();
	      });
	    }
	    if (this.propertyNameMap) {
	      var typeDef = this.propertyNameMap[options.type];
	      parts[0] = (typeDef && typeDef[parts[0]]) || parts[0];
	    }

	    trackChanges.apply(this, [{
	      baseName: parts[0],
	      fullPath: property,
	      object: options.object,
	      options: options,
	      changes: changes,
	      operation: operation
	    }]);

	    var curObj = obj;
	    for (var i = 0; i < parts.length-1; i++) {
	      var part = parts[i];
	      if (part in curObj) {
	        curObj = curObj[part];
	        if (curObj === null || typeof curObj !== 'object') throw new Error('Can not access property \'' + property + '\'');
	      } else {
	        curObj[part] = {};
	        curObj = curObj[part];
	      }
	    }

	    return {
	      pointer: curObj,
	      lastName: parts[parts.length-1],
	      baseName: parts[0],
	      fullPath: property,
	      abortHandler: this.abortCallbacks && this.abortCallbacks[options.type] && (this.abortCallbacks[options.type].all || this.abortCallbacks[options.type][parts[0]])
	    };
	  }

	  function getValue(op, options) {
	    if (op.id) {
	      if (!this.getObjectCallback) throw new Error('Must provide getObjectCallback in constructor to use ids');
	      var result = this.getObjectCallback(op.id);
	      if (!result && op.value) {
	        result = this.createObjectCallback ? this.createObjectCallback(op.id, op.value) : op.value;
	      }
	      if (result) return result;
	      if (this.returnIds) return op.id;
	      return null;
	    } else {
	      return op.value;
	    }
	  }

	  function cloneObject(obj) {
	    if (Array.isArray(obj)) {
	      return obj.map(function(item) {
	        return cloneObject(item);
	      });
	    } else if (obj instanceof Set) {
	      var newObj = new Set();
	      obj.forEach(function(item) {
	        newObj.add(item);
	      });
	      return newObj;
	    } else if (obj instanceof Date) {
	      return new Date(obj);
	    } else if (obj && typeof obj === 'object') {
	      var keys = Object.keys(obj).filter(function(keyName) {
	        return keyName.indexOf('_') !== 0;
	      });
	      var newObj = {};
	      keys.forEach(function(keyName) {
	        newObj[keyName] = cloneObject(obj[keyName]);
	      });
	      return newObj;
	    } else {
	      return obj;
	    }
	  }

	  function trackChanges(options) {
	    if (!options.changes[options.baseName]) {
	      var initialValue = options.object[options.baseName];
	      if ((options.operation === 'set' || options.operation === 'delete') && 'id' in options.operation && initialValue) {
	        initialValue = initialValue.id;
	      }
	      var change = options.changes[options.baseName] = {paths: []};
	      change.before = (initialValue && typeof initialValue === 'object') ? cloneObject(initialValue) : initialValue;
	    }
	    var paths = options.changes[options.baseName].paths;
	    if (paths.indexOf(options.fullPath) === -1) {
	      paths.push(options.fullPath);
	    }
	  }

	  function setProp(propertyDef, value, op, options, changes) {
	    if (propertyDef.abortHandler) {
	      if (propertyDef.abortHandler(propertyDef.fullPath, 'set', value)) return;
	    }
	    propertyDef.pointer[propertyDef.lastName] = value;

	  }

	  function deleteProp(propertyDef, value, op, options, changes) {
	    if (propertyDef.abortHandler) {
	      if (propertyDef.abortHandler(propertyDef.fullPath, 'delete', value)) return;
	    }
	    delete propertyDef.pointer[propertyDef.lastName];
	  }

	  function addProp(propertyDef, value, op, options, changes) {
	    if (propertyDef.abortHandler) {
	      if (propertyDef.abortHandler(propertyDef.fullPath, 'add', value)) return;
	    }
	    var obj;
	    if (propertyDef.lastName in propertyDef.pointer) {
	      obj = propertyDef.pointer[propertyDef.lastName];
	    } else {
	      obj = propertyDef.pointer[propertyDef.lastName] = [];
	    }
	    if (!Array.isArray(obj) && !(obj instanceof Set)) throw new Error('The add operation requires an array or new structure to add to.');
	    if (Array.isArray(value)) throw new Error('The add operation will not add arrays to sets.');
	    if (!op.id) {
	      if (value && typeof value === 'object') throw new Error('The add operation will not add objects to sets.');
	      if (obj.indexOf(value) === -1) obj.push(value);
	    } else {
	      for (var i = 0; i < obj.length; i++) {
	        if (this.doesObjectMatchIdCallback(op.id, obj[i])) return;
	      }
	      if (obj instanceof Set) {
	        obj.add(value);
	      } else {
	        obj.push(value);
	      }
	    }
	  }

	  function removeProp(propertyDef, value, op, options, changes) {
	    if (propertyDef.abortHandler) {
	      if (propertyDef.abortHandler(propertyDef.fullPath, 'remove', value)) return;
	    }
	    var obj;
	    if (propertyDef.lastName in propertyDef.pointer) {
	      obj = propertyDef.pointer[propertyDef.lastName];
	    } else {
	      obj = propertyDef.pointer[propertyDef.lastName] = [];
	    }
	    if (!Array.isArray(obj) && !(obj instanceof Set)) throw new Error('The remove operation requires an array or new structure to remove from.');

	    if (!op.id) {
	      if (Array.isArray(value)) throw new Error('The remove operation will not remove arrays from sets.');
	      if (value && typeof value === 'object') throw new Error('The remove operation will not remove objects from sets.');

	      if (obj instanceof Set) {
	        obj.remove(value);
	      } else {
	        var index = obj.indexOf(value);
	        if (index !== -1) obj.splice(index, 1);
	      }
	    } else {
	      if (obj instanceof Set) {
	        obj.delete(value);
	      } else {
	        for (var i = 0; i < obj.length; i++) {
	          if (this.doesObjectMatchIdCallback(op.id, obj[i])) {
	            obj.splice(i, 1);
	            break;
	          }
	        }
	      }
	    }
	  }
	})();
	});

	/**
	 * Run the Layer Parser on the request.
	 *
	 * Parameters here
	 * are the parameters specied in [Layer-Patch](https://github.com/layerhq/node-layer-patch), plus
	 * a client object.
	 *
	 *      layerParse({
	 *          object: conversation,
	 *          type: 'Conversation',
	 *          operations: layerPatchOperations,
	 *          client: client
	 *      });
	 *
	 * @method
	 * @param {Object} request - layer-patch parameters
	 * @param {Object} request.object - Object being updated  by the operations
	 * @param {string} request.type - Type of object being updated
	 * @param {Object[]} request.operations - Array of change operations to perform upon the object
	 * @param {layer.Client} request.client
	 */
	var LayerParser = index$4;

	var parser = void 0;

	/**
	 * Creates a LayerParser
	 *
	 * @method
	 * @private
	 * @param {Object} request - see layer.ClientUtils.layerParse
	 */
	function createParser(request) {
	  request.client.once('destroy', function () {
	    return parser = null;
	  });

	  parser = new LayerParser({
	    camelCase: true,
	    getObjectCallback: function getObjectCallback(id) {
	      return request.client.getObject(id);
	    },
	    createObjectCallback: function createObjectCallback(id, obj) {
	      return request.client._createObject(obj);
	    },
	    propertyNameMap: {
	      Conversation: {
	        unreadMessageCount: 'unreadCount'
	      },
	      Identity: {
	        presence: '_presence'
	      }
	    },
	    changeCallbacks: {
	      Message: {
	        all: function all(updateObject, newValue, oldValue, paths) {
	          updateObject._handlePatchEvent(newValue, oldValue, paths);
	        }
	      },
	      Conversation: {
	        all: function all(updateObject, newValue, oldValue, paths) {
	          updateObject._handlePatchEvent(newValue, oldValue, paths);
	        }
	      },
	      Channel: {
	        all: function all(updateObject, newValue, oldValue, paths) {
	          updateObject._handlePatchEvent(newValue, oldValue, paths);
	        }
	      },
	      Identity: {
	        all: function all(updateObject, newValue, oldValue, paths) {
	          updateObject._handlePatchEvent(newValue, oldValue, paths);
	        }
	      }
	    }
	  });
	}

	// Docs in client-utils.js
	var layerParser = function (request) {
	  if (!parser) createParser(request);
	  parser.parse(request);
	};

	var clientUtils = createCommonjsModule(function (module, exports) {
	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/**
	 * Utility methods
	 *
	 * @class layer.ClientUtils
	 */

	var uuid = uuid_1;
	exports.atob = typeof atob === 'undefined' ? commonjsGlobal.getNativeSupport('atob') : atob.bind(window);
	exports.btoa = typeof btoa === 'undefined' ? commonjsGlobal.getNativeSupport('btoa') : btoa.bind(window);
	var LocalFileReader = typeof FileReader === 'undefined' ? commonjsGlobal.getNativeSupport('FileReader') : FileReader;

	/**
	 * Generate a random UUID
	 *
	 * @method
	 * @return {string}
	 */
	exports.generateUUID = uuid.v4;

	/**
	 * Returns the 'type' portion of a Layer ID.
	 *
	 *         switch(Utils.typeFromID(id)) {
	 *             case 'conversations':
	 *                 ...
	 *             case 'message':
	 *                 ...
	 *             case: 'queries':
	 *                 ...
	 *         }
	 *
	 * Does not currently handle Layer App IDs.
	 *
	 * @method
	 * @param  {string} id
	 * @return {string}
	 */
	exports.typeFromID = function (id) {
	  var matches = id.match(/([^/]*)(\/[^/]*)$/);
	  return matches ? matches[1] : '';
	};

	/**
	 * Returns the UUID portion of a Layer ID
	 *
	 * @method
	 * @param  {string} id
	 * @return {string}
	 */
	exports.uuid = function (id) {
	  return (id || '').replace(/^.*\//, '');
	};

	exports.isEmpty = function (obj) {
	  return Object.prototype.toString.apply(obj) === '[object Object]' && Object.keys(obj).length === 0;
	};

	/**
	 * Simplified sort method.
	 *
	 * Provides a function to return the value to compare rather than do the comparison.
	 *
	 *      sortBy([{v: 3}, {v: 1}, v: 33}], function(value) {
	 *          return value.v;
	 *      }, false);
	 *
	 * @method
	 * @param  {Mixed[]}   inArray      Array to sort
	 * @param  {Function} fn            Function that will return a value to compare
	 * @param  {Function} fn.value      Current value from inArray we are comparing, and from which a value should be extracted
	 * @param  {boolean}  [reverse=false] Sort ascending (false) or descending (true)
	 */
	exports.sortBy = function (inArray, fn, reverse) {
	  reverse = reverse ? -1 : 1;
	  return inArray.sort(function (valueA, valueB) {
	    var aa = fn(valueA);
	    var bb = fn(valueB);
	    if (aa === undefined && bb === undefined) return 0;
	    if (aa === undefined && bb !== undefined) return 1;
	    if (aa !== undefined && bb === undefined) return -1;
	    if (aa > bb) return 1 * reverse;
	    if (aa < bb) return -1 * reverse;
	    return 0;
	  });
	};

	/**
	 * Quick and easy clone method.
	 *
	 * Does not work on circular references; should not be used
	 * on objects with event listeners.
	 *
	 *      var newObj = Utils.clone(oldObj);
	 *
	 * @method
	 * @param  {Object}     Object to clone
	 * @return {Object}     New Object
	 */
	exports.clone = function (obj) {
	  return JSON.parse(JSON.stringify(obj));
	};

	/**
	 * Its necessary that the encoding algorithm for creating a URI matches the Layer Server's algorithm.
	 * Failure to do that creates mismatching IDs that will then refer to different objects.
	 *
	 * Derived from https://github.com/kevva/strict-uri-encode
	 *
	 * @method strictEncodeURI
	 * @param {String} str
	 */
	exports.strictEncodeURI = function (str) {
	  return encodeURIComponent(str).replace(/[!~'()]/g, function (x) {
	    return '%' + x.charCodeAt(0).toString(16).toUpperCase();
	  });
	};

	/**
	 * URL Decode a URL Encoded base64 string
	 *
	 * Copied from https://github.com/auth0-blog/angular-token-auth, but
	 * appears in many places on the web.
	 *
	 * @method decode
	 * @param {String} str   base64 string
	 * @return str   Decoded string
	 */
	/* istanbul ignore next */
	exports.decode = function (str) {
	  var reg1 = new RegExp('_', 'g');
	  var reg2 = new RegExp('-', 'g');
	  var output = str.replace(reg2, '+').replace(reg1, '/');
	  switch (output.length % 4) {
	    case 0:
	      break;
	    case 2:
	      output += '==';
	      break;
	    case 3:
	      output += '=';
	      break;
	    default:
	      throw new Error('Illegal base64url string!');
	  }
	  return exports.atob(output);
	};

	/**
	 * Returns a delay in seconds needed to follow an exponential
	 * backoff pattern of delays for retrying a connection.
	 *
	 * Algorithm has two motivations:
	 *
	 * 1. Retry with increasingly long intervals up to some maximum interval
	 * 2. Randomize the retry interval enough so that a thousand clients
	 * all following the same algorithm at the same time will not hit the
	 * server at the exact same times.
	 *
	 * The following are results before jitter for some values of counter:

	      0: 0.1
	      1: 0.2
	      2: 0.4
	      3: 0.8
	      4: 1.6
	      5: 3.2
	      6: 6.4
	      7: 12.8
	      8: 25.6
	      9: 51.2
	      10: 102.4
	      11. 204.8
	      12. 409.6
	      13. 819.2
	      14. 1638.4 (27 minutes)

	 * @method getExponentialBackoffSeconds
	 * @param  {number} maxSeconds - This is not the maximum seconds delay, but rather
	 * the maximum seconds delay BEFORE adding a randomized value.
	 * @param  {number} counter - Current counter to use for calculating the delay; should be incremented up to some reasonable maximum value for each use.
	 * @return {number}     Delay in seconds/fractions of a second
	 */
	exports.getExponentialBackoffSeconds = function getExponentialBackoffSeconds(maxSeconds, counter) {
	  var secondsWaitTime = Math.pow(2, counter) / 10,
	      secondsOffset = Math.random(); // value between 0-1 seconds.
	  if (counter < 2) secondsOffset = secondsOffset / 4; // values less than 0.2 should be offset by 0-0.25 seconds
	  else if (counter < 6) secondsOffset = secondsOffset / 2; // values between 0.2 and 1.0 should be offset by 0-0.5 seconds

	  if (secondsWaitTime >= maxSeconds) secondsWaitTime = maxSeconds;

	  return secondsWaitTime + secondsOffset;
	};

	/**
	 * Is this data a blob?
	 *
	 * @method isBlob
	 * @param {Mixed} value
	 * @returns {Boolean} - True if its a blob, false if not.
	 */
	exports.isBlob = function (value) {
	  return typeof Blob !== 'undefined' && value instanceof Blob;
	};

	/**
	 * Given a blob return a base64 string.
	 *
	 * @method blobToBase64
	 * @param {Blob} blob - data to convert to base64
	 * @param {Function} callback
	 * @param {String} callback.result - Your base64 string result
	 */
	exports.blobToBase64 = function (blob, callback) {
	  var reader = new LocalFileReader();
	  reader.readAsDataURL(blob);
	  reader.onloadend = function () {
	    return callback(reader.result.replace(/^.*?,/, ''));
	  };
	};

	/**
	 * Given a base64 string return a blob.
	 *
	 * @method base64ToBlob
	 * @param {String} b64Data - base64 string data without any type prefixes
	 * @param {String} contentType - mime type of the data
	 * @returns {Blob}
	 */
	exports.base64ToBlob = function (b64Data, contentType) {
	  try {
	    var sliceSize = 512;
	    var byteCharacters = exports.atob(b64Data);
	    var byteArrays = [];
	    var offset = void 0;

	    for (offset = 0; offset < byteCharacters.length; offset += sliceSize) {
	      var i = void 0;
	      var slice = byteCharacters.slice(offset, offset + sliceSize);
	      var byteNumbers = new Array(slice.length);
	      for (i = 0; i < slice.length; i++) {
	        byteNumbers[i] = slice.charCodeAt(i);
	      }

	      var byteArray = new Uint8Array(byteNumbers);

	      byteArrays.push(byteArray);
	    }

	    var blob = new Blob(byteArrays, { type: contentType });
	    return blob;
	  } catch (e) {
	    // noop
	  }
	  return null;
	};

	/**
	 * Does window.btao() in a unicode-safe way
	 *
	 * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_strings
	 *
	 * @method utoa
	 * @param {String} str
	 * @return {String}
	 */
	exports.utoa = function (str) {
	  return exports.btoa(unescape(encodeURIComponent(str)));
	};

	/**
	 * Does window.atob() in a way that can decode data from utoa()
	 *
	 * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_strings
	 *
	 * @method atou
	 * @param {String} str
	 * @return {String}
	 */
	exports.atou = function (str) {
	  return decodeURIComponent(escape(exports.atob(str)));
	};

	/**
	 * Given a File/Blob return a string.
	 *
	 * Assumes blob represents textual data.
	 *
	 * @method fetchTextFromFile
	 * @param {Blob} file
	 * @param {Function} callback
	 * @param {String} callback.result
	 */
	exports.fetchTextFromFile = function (file, callback) {
	  if (typeof file === 'string') return callback(file);
	  var reader = new LocalFileReader();
	  reader.addEventListener('loadend', function () {
	    callback(reader.result);
	  });
	  reader.readAsText(file);
	};

	/**
	 * Execute this function immediately after current processing is complete (setImmediate replacement).
	 *
	 * A depth of up to 10 is allowed.  That means that functions you schedule using defer
	 * can in turn schedule further actions.  The original actions are depth = 0; the actions scheduled
	 * by your actions are depth = 1.  These new actions may in turn schedule further actions, which happen at depth = 3.
	 * But to avoid infinite loops, if depth reaches 10, it clears the queue and ignores them.
	 *
	 * @method defer
	 * @param {Function} f
	 */
	exports.defer = defer$1;

	/**
	 * Run the Layer Parser on the request.
	 *
	 * Parameters here
	 * are the parameters specied in [Layer-Patch](https://github.com/layerhq/node-layer-patch), plus
	 * a client object.
	 *
	 *      Util.layerParse({
	 *          object: conversation,
	 *          type: 'Conversation',
	 *          operations: layerPatchOperations,
	 *          client: client
	 *      });
	 *
	 * @method
	 * @deprecated Use 'utils/layer-parser' instead
	 * @param {Object} request - layer-patch parameters
	 * @param {Object} request.object - Object being updated  by the operations
	 * @param {string} request.type - Type of object being updated
	 * @param {Object[]} request.operations - Array of change operations to perform upon the object
	 * @param {layer.Client} request.client
	 */
	exports.layerParse = layerParser;

	/**
	 * Object comparison.
	 *
	 * Does a recursive traversal of two objects verifying that they are the same.
	 * Is able to make metadata-restricted assumptions such as that
	 * all values are either plain Objects or strings.
	 *
	 *      if (Utils.doesObjectMatch(conv1.metadata, conv2.metadata)) {
	 *          alert('These two metadata objects are the same');
	 *      }
	 *
	 * @method
	 * @param  {Object} requestedData
	 * @param  {Object} actualData
	 * @return {boolean}
	 */
	exports.doesObjectMatch = function (requestedData, actualData) {
	  if (!requestedData && actualData || requestedData && !actualData) return false;
	  var requestedKeys = Object.keys(requestedData).sort();
	  var actualKeys = Object.keys(actualData).sort();

	  // If there are a different number of keys, fail.
	  if (requestedKeys.length !== actualKeys.length) return false;

	  // Compare key name and value at each index
	  for (var index = 0; index < requestedKeys.length; index++) {
	    var k1 = requestedKeys[index];
	    var k2 = actualKeys[index];
	    var v1 = requestedData[k1];
	    var v2 = actualData[k2];
	    if (k1 !== k2) return false;
	    if (v1 && (typeof v1 === 'undefined' ? 'undefined' : _typeof(v1)) === 'object') {
	      // Array comparison is not used by the Web SDK at this time.
	      if (Array.isArray(v1)) {
	        throw new Error('Array comparison not handled yet');
	      } else if (!exports.doesObjectMatch(v1, v2)) {
	        return false;
	      }
	    } else if (v1 !== v2) {
	      return false;
	    }
	  }
	  return true;
	};

	/**
	 * Simple array inclusion test
	 * @method includes
	 * @param {Mixed[]} items
	 * @param {Mixed} value
	 * @returns {boolean}
	 */
	exports.includes = function (items, value) {
	  return items.indexOf(value) !== -1;
	};

	/**
	 * Some ASCII art when client initializes
	 */
	exports.asciiInit = function (version) {
	  if (!version) return 'Missing version';

	  var split = version.split('-');
	  var line1 = split[0] || '',
	      line2 = split[1] || '';

	  line1 += new Array(13 - line1.length).join(' ');
	  line2 += new Array(14 - line2.length).join(' ');

	  return '\n    /hNMMMMMMMMMMMMMMMMMMMms.\n  hMMy+/////////////////omMN-\n  MMN                    oMMo\n  MMN        Layer       oMMo\n  MMN       Web SDK      oMMo\n  MMM-                   oMMo\n  MMMy      v' + line1 + 'oMMo\n  MMMMo     ' + line2 + 'oMMo\n  MMMMMy.                oMMo\n  MMMMMMNy:\'             oMMo\n  NMMMMMMMMmy+:-.\'      \'yMM/\n  :dMMMMMMMMMMMMNNNNNNNNNMNs\n   -/+++++++++++++++++++:\'';
	};

	});





















	var btoa = clientUtils.btoa;
	var atob = clientUtils.atob;

	var _createClass$1 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * This class represents a Layer Event, and is used as the parameter for all event handlers.
	 *
	 * Calls to
	 *
	 *      obj.trigger('eventName2', {hey: 'ho'});
	 *
	 * results in:
	 *
	 *      obj.on('eventName2', function(layerEvent) {
	 *          alert(layerEvent.target.toString() + ' has fired a value of ' + layerEvent.hey);
	 *      });
	 *
	 * Change events (events ending in ':change') get special handling:
	 *
	 *      obj.trigger('obj:change', {
	 *          newValue: 55,
	 *          oldValue: 25,
	 *          property: 'hey'
	 *      });
	 *
	 * results in your event data being wrapped in a `changes` array:
	 *
	 *      obj.on('obj:change', function(layerEvent) {
	 *          layerEvent.changes.forEach(function(change) {
	 *              alert(layerEvent.target.toString() + ' changed ' +
	 *                    change.property + ' from ' + change.oldValue +
	 *                    ' to ' + change.newValue);
	 *          });
	 *      });
	 *
	 * The `layer.LayerEvent.getChangesFor()` and `layer.LayerEvent.hasProperty()` methods
	 * simplify working with xxx:change events so you don't need
	 * to iterate over the `changes` array.
	 *
	 * @class layer.LayerEvent
	 */

	var LayerEvent$1 = function () {
	  /**
	   * Constructor for LayerEvent.
	   *
	   * @method
	   * @param  {Object} args - Properties to mixin to the event
	   * @param  {string} eventName - Name of the event that generated this LayerEvent.
	   * @return {layer.LayerEvent}
	   */
	  function LayerEvent(args, eventName) {
	    var _this = this;

	    _classCallCheck$1(this, LayerEvent);

	    var ptr = this;

	    // Is it a change event?  if so, setup the change properties.
	    if (eventName.match(/:change$/)) {
	      this.changes = [{}];
	      // All args get copied into the changes object instead of this
	      ptr = this.changes[0];
	      this.isChange = true;
	    } else {
	      this.isChange = false;
	    }

	    // Copy the args into either this Event object... or into the change object.
	    // Wouldn't be needed if this inherited from Root.
	    Object.keys(args).forEach(function (name) {
	      // Even if we are copying properties into the change object, target remains
	      // a property of LayerEvent.
	      if (ptr !== _this && name === 'target') {
	        _this.target = args.target;
	      } else {
	        ptr[name] = args[name];
	      }
	    });
	    this.eventName = eventName;
	  }

	  /**
	   * Returns true if the specified property was changed.
	   *
	   * Returns false if this is not a change event.
	   *
	   *      if (layerEvent.hasProperty('age')) {
	   *          handleAgeChange(obj.age);
	   *      }
	   *
	   * @method hasProperty
	   * @param  {string}  name - Name of the property
	   * @return {Boolean}
	   */


	  _createClass$1(LayerEvent, [{
	    key: 'hasProperty',
	    value: function hasProperty(name) {
	      if (!this.isChange) return false;
	      return Boolean(this.changes.filter(function (change) {
	        return change.property === name;
	      }).length);
	    }

	    /**
	     * Get all changes to the property.
	     *
	     * Returns an array of changes.
	     * If this is not a change event, will return []
	     * Changes are typically of the form:
	     *
	     *      layerEvent.getChangesFor('age');
	     *      > [{
	     *          oldValue: 10,
	     *          newValue: 5,
	     *          property: 'age'
	     *      }]
	     *
	     * @method getChangesFor
	     * @param  {string} name - Name of the property whose changes are of interest
	     * @return {Object[]}
	     */

	  }, {
	    key: 'getChangesFor',
	    value: function getChangesFor(name) {
	      if (!this.isChange) return [];
	      return this.changes.filter(function (change) {
	        return change.property === name;
	      });
	    }

	    /**
	     * Merge changes into a single changes array.
	     *
	     * The other event will need to be deleted.
	     *
	     * @method _mergeChanges
	     * @protected
	     * @param  {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_mergeChanges',
	    value: function _mergeChanges(evt) {
	      this.changes = this.changes.concat(evt.changes);
	    }
	  }]);

	  return LayerEvent;
	}();

	/**
	 * Indicates that this is a change event.
	 *
	 * If the event name ends with ':change' then
	 * it is treated as a change event;  such
	 * events are assumed to come with `newValue`, `oldValue` and `property` in the layer.LayerEvent.changes property.
	 * @type {Boolean}
	 */


	LayerEvent$1.prototype.isChange = false;

	/**
	 * Array of changes (Change Events only).
	 *
	 * If its a Change Event, then the changes property contains an array of change objects
	 * which each contain:
	 *
	 * * oldValue
	 * * newValue
	 * * property
	 *
	 * @type {Object[]}
	 */
	LayerEvent$1.prototype.changes = null;

	/**
	 * Component that was the source of the change.
	 *
	 * If one calls
	 *
	 *      obj.trigger('event');
	 *
	 * then obj will be the target.
	 * @type {layer.Root}
	 */
	LayerEvent$1.prototype.target = null;

	/**
	 * The name of the event that created this instance.
	 *
	 * If one calls
	 *
	 *      obj.trigger('myevent');
	 *
	 * then eventName = 'myevent'
	 *
	 * @type {String}
	 */
	LayerEvent$1.prototype.eventName = '';

	var layerEvent = LayerEvent$1;

	/**
	 * Layer Constants are stored in two places:
	 *
	 * 1. As part of the layer.Constants singleton
	 * 2. As static properties on classes.
	 *
	 * Typically the static property constants are designed to be changed by developers to customize behaviors,
	 * and tend to only be used by that single class.
	 *
	 * @class layer.Constants
	 * @singleton
	 */
	var _const = {
	  /**
	   * Is the object synchronized with the server?
	   * @property {Object} [SYNC_STATE=null]
	   * @property {string} SYNC_STATE.NEW      - Object is newly created, was created locally, not from server data, and has not yet been sent to the server.
	   * @property {string} SYNC_STATE.SAVING   - Object is newly created and is being sent to the server.
	   * @property {string} SYNC_STATE.SYNCING  - Object exists both locally and on server but is being synced with changes.
	   * @property {string} SYNC_STATE.SYNCED   - Object exists both locally and on server and at last check was in sync.
	   * @property {string} SYNC_STATE.LOADING  - Object is being loaded from the server and may not have its properties set yet.
	   */
	  SYNC_STATE: {
	    NEW: 'NEW',
	    SAVING: 'SAVING',
	    SYNCING: 'SYNCING',
	    SYNCED: 'SYNCED',
	    LOADING: 'LOADING'
	  },

	  /**
	   * Values for readStatus/deliveryStatus
	   * @property {Object} [RECIPIENT_STATE=]
	   * @property {string} RECIPIENT_STATE.NONE - No users have read (or received) this Message
	   * @property {string} RECIPIENT_STATE.SOME - Some users have read (or received) this Message
	   * @property {string} RECIPIENT_STATE.ALL  - All users have read (or received) this Message
	   */
	  RECIPIENT_STATE: {
	    NONE: 'NONE',
	    SOME: 'SOME',
	    ALL: 'ALL'
	  },

	  /**
	   * Values for recipientStatus
	   * @property {Object} [RECEIPT_STATE=]
	   * @property {string} RECEIPT_STATE.SENT      - The Message has been sent to the specified user but it has not yet been received by their device.
	   * @property {string} RECEIPT_STATE.DELIVERED - The Message has been delivered to the specified use but has not yet been read.
	   * @property {string} RECEIPT_STATE.READ      - The Message has been read by the specified user.
	   * @property {string} RECEIPT_STATE.PENDING   - The request to send this Message to the specified user has not yet been received by the server.
	   */
	  RECEIPT_STATE: {
	    SENT: 'sent',
	    DELIVERED: 'delivered',
	    READ: 'read',
	    PENDING: 'pending'
	  },
	  LOCALSTORAGE_KEYS: {
	    SESSIONDATA: 'layer-session-data-'
	  },
	  ACCEPT: 'application/vnd.layer+json; version=2.0',
	  WEBSOCKET_PROTOCOL: 'layer-2.0',

	  /**
	   * Log levels
	   * @property {Object} [LOG=]
	   * @property {number} LOG.DEBUG     Log detailed information about requests, responses, events, state changes, etc...
	   * @property {number} LOG.INFO      Log sparse information about requests, responses and events
	   * @property {number} LOG.WARN      Log failures that are expected, normal, handled, but suggests that an operation didn't complete as intended
	   * @property {number} LOG.ERROR     Log failures that are not expected or could not be handled
	   * @property {number} LOG.NONE      Logs? Who needs em?
	   */
	  LOG: {
	    DEBUG: 4,
	    INFO: 3,
	    WARN: 2,
	    ERROR: 1,
	    NONE: 0
	  },

	  /**
	   * Deletion Modes
	   * @property {Object} [DELETION_MODE=]
	   * @property {number} DELETION_MODE.ALL          Delete Message/Conversation for All users but remain in the Conversation;
	   *                                               new Messages will restore this Conversation minus any Message History prior to deletion.
	   * @property {number} DELETION_MODE.MY_DEVICES   Delete Message or Conversation; but see layer.Conversation.leave if you want to delete
	   *                                               a Conversation and not have it come back.
	   */
	  DELETION_MODE: {
	    ALL: 'all_participants',
	    MY_DEVICES: 'my_devices'
	  }
	};

	var _typeof$2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$3 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$3(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * @class layer.Logger
	 * @private
	 *
	 */
	var _require$LOG = _const.LOG;
	var DEBUG = _require$LOG.DEBUG;
	var INFO = _require$LOG.INFO;
	var WARN = _require$LOG.WARN;
	var ERROR = _require$LOG.ERROR;
	var NONE = _require$LOG.NONE;

	// Pretty arbitrary test that IE/edge fails and others don't.  Yes I could do a more direct
	// test for IE/edge but its hoped that MS will fix this around the time they cleanup their internal console object.
	// Note that uglifyjs with drop_console=true will throw an error on console.assert.toString().match; so we instead do (console.assert.toString() || "") which drop_console
	// on replacing console.assert.toString() with (void 0) will still work


	var supportsConsoleFormatting = Boolean(console.assert && (console.assert.toString() || "").match(/assert/));
	var LayerCss = 'color: #888; font-weight: bold;';
	var Black = 'color: black';
	/* istanbulify ignore next */

	var Logger$2 = function () {
	  function Logger() {
	    _classCallCheck$3(this, Logger);
	  }

	  _createClass$3(Logger, [{
	    key: 'log',
	    value: function log(msg, obj, type, color) {
	      /* istanbul ignore else */
	      if ((typeof msg === 'undefined' ? 'undefined' : _typeof$2(msg)) === 'object') {
	        obj = msg;
	        msg = '';
	      }
	      var timestamp = new Date().toLocaleTimeString();
	      var op = void 0;
	      switch (type) {
	        case DEBUG:
	          op = 'debug';
	          break;
	        case INFO:
	          op = 'info';
	          break;
	        case WARN:
	          op = 'warn';
	          break;
	        case ERROR:
	          op = 'error';
	          break;
	        default:
	          op = 'log';
	      }
	      if (obj) {
	        if (supportsConsoleFormatting) {
	          console[op]('%cLayer%c ' + op.toUpperCase() + '%c [' + timestamp + ']: ' + msg, LayerCss, 'color: ' + color, Black, obj);
	        } else {
	          console[op]('Layer ' + op.toUpperCase() + ' [' + timestamp + ']: ' + msg, obj);
	        }
	      } else if (supportsConsoleFormatting) {
	        console[op]('%cLayer%c ' + op.toUpperCase() + '%c [' + timestamp + ']: ' + msg, LayerCss, 'color: ' + color, Black);
	      } else {
	        console[op]('Layer ' + op.toUpperCase() + ' [' + timestamp + ']: ' + msg);
	      }
	    }
	  }, {
	    key: 'debug',
	    value: function debug(msg, obj) {
	      /* istanbul ignore next */
	      if (this.level >= DEBUG) this.log(msg, obj, DEBUG, '#888');
	    }
	  }, {
	    key: 'info',
	    value: function info(msg, obj) {
	      /* istanbul ignore next */
	      if (this.level >= INFO) this.log(msg, obj, INFO, 'black');
	    }
	  }, {
	    key: 'warn',
	    value: function warn(msg, obj) {
	      /* istanbul ignore next */
	      if (this.level >= WARN) this.log(msg, obj, WARN, 'orange');
	    }
	  }, {
	    key: 'error',
	    value: function error(msg, obj) {
	      /* istanbul ignore next */
	      if (this.level >= ERROR) this.log(msg, obj, ERROR, 'red');
	    }
	  }]);

	  return Logger;
	}();

	/* istanbul ignore next */


	Logger$2.prototype.level = typeof jasmine === 'undefined' ? ERROR : NONE;

	var logger = new Logger$2();

	var logger_1 = logger;

	var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$2 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * This class represents a Layer Error.
	 *
	 * At this point, a LayerError is only used in response to an error from the server.
	 * It may be extended to report on internal errors... but typically internal errors
	 * are reported via `throw new Error(...);`
	 *
	 * Layer Error is passed as part of the layer.LayerEvent's data property.
	 *
	 * Throw an error:
	 *
	 *     object.trigger('xxx-error', new LayerEvent({
	 *       data: new LayerError()
	 *     }));
	 *
	 *  Receive an Error:
	 *
	 *     conversation.on('loaded-error', function(errEvt) {
	 *        var error = errEvt.data;
	 *        console.error(error.message);
	 *     });
	 *
	 * @class layer.LayerError
	 */
	var Logger$1 = logger_1;

	var LayerError$1 = function () {
	  function LayerError(options) {
	    var _this = this;

	    _classCallCheck$2(this, LayerError);

	    if (options instanceof LayerError) {
	      options = {
	        errType: options.errType,
	        httpStatus: options.httpStatus,
	        message: options.message,
	        code: options.code,
	        url: options.url,
	        data: options.data
	      };
	    } else if (options && (typeof options === 'undefined' ? 'undefined' : _typeof$1(options)) === 'object') {
	      options.errType = options.id;
	    } else {
	      options = {
	        message: options
	      };
	    }

	    Object.keys(options).forEach(function (name) {
	      return _this[name] = options[name];
	    });
	    if (!this.data) this.data = {};
	  }

	  /**
	   * Returns either '' or a nonce.
	   *
	   * If a nonce has been returned
	   * by the server as part of a session-expiration error,
	   * then this method will return that nonce.
	   *
	   * @method getNonce
	   * @return {string} nonce
	   */


	  _createClass$2(LayerError, [{
	    key: 'getNonce',
	    value: function getNonce() {
	      return this.data && this.data.nonce ? this.data.nonce : '';
	    }

	    /**
	     * String representation of the error
	     *
	     * @method toString
	     * @return {string}
	     */

	  }, {
	    key: 'toString',
	    value: function toString() {
	      return this.code + ' (' + this.id + '): ' + this.message + '; (see ' + this.url + ')';
	    }

	    /**
	     * Log the errors
	     *
	     * @method log
	     * @deprecated see layer.Logger
	     */

	  }, {
	    key: 'log',
	    value: function log() {
	      Logger$1.error('Layer-Error: ' + this.toString());
	    }
	  }]);

	  return LayerError;
	}();

	/**
	 * A string name for the event; these names are paired with codes.
	 *
	 * Codes can be looked up at https://github.com/layerhq/docs/blob/web-api/specs/rest-api.md#client-errors
	 * @type {String}
	 */


	LayerError$1.prototype.errType = '';

	/**
	 * Numerical error code.
	 *
	 * https://developer.layer.com/docs/client/rest#full-list
	 * @type {Number}
	 */
	LayerError$1.prototype.code = 0;

	/**
	 * URL to go to for more information on this error.
	 * @type {String}
	 */
	LayerError$1.prototype.url = '';

	/**
	 * Detailed description of the error.
	 * @type {String}
	 */
	LayerError$1.prototype.message = '';

	/**
	 * Http error code; no value if its a websocket response.
	 * @type {Number}
	 */
	LayerError$1.prototype.httpStatus = 0;

	/**
	 * Contains data from the xhr request object.
	 *
	 *  * url: the url to the service endpoint
	 *  * data: xhr.data,
	 *  * xhr: XMLHttpRequest object
	 *
	 * @type {Object}
	 */
	LayerError$1.prototype.request = null;

	/**
	 * Any additional details about the error sent as additional properties.
	 * @type {Object}
	 */
	LayerError$1.prototype.data = null;

	/**
	 * Pointer to the xhr object that fired the actual request and contains the response.
	 * @type {XMLHttpRequest}
	 */
	LayerError$1.prototype.xhr = null;

	/**
	 * Dictionary of error messages
	 * @property {Object} [dictionary={}]
	 */
	LayerError$1.dictionary = {
	  appIdMissing: 'Property missing: appId is required',
	  identityTokenMissing: 'Identity Token missing: answerAuthenticationChallenge requires an identity token',
	  sessionTokenMissing: 'Session Token missing: _authComplete requires a {session_token: value} input',
	  clientMissing: 'Property missing: client is required',
	  conversationMissing: 'Property missing: conversation is required',
	  partsMissing: 'Property missing: parts is required',
	  moreParticipantsRequired: 'Conversation needs participants other than the current user',
	  isDestroyed: 'Object is destroyed',
	  urlRequired: 'Object needs a url property',
	  invalidUrl: 'URL is invalid',
	  invalidId: 'Identifier is invalid',
	  idParamRequired: 'The ID Parameter is required',
	  wrongClass: 'Parameter class error; should be: ',
	  inProgress: 'Operation already in progress',
	  cantChangeIfConnected: 'You can not change value after connecting',
	  cantChangeUserId: 'You can not change the userId property',
	  alreadySent: 'Already sent or sending',
	  contentRequired: 'MessagePart requires rich content for this call',
	  alreadyDestroyed: 'This object has already been destroyed',
	  deletionModeUnsupported: 'Call to deletion was made with an unsupported deletion mode',
	  sessionAndUserRequired: 'connectWithSession requires both a userId and a sessionToken',
	  invalidUserIdChange: 'The prn field in the Identity Token must match the requested UserID',
	  predicateNotSupported: 'The predicate is not supported for this value of model',
	  invalidPredicate: 'The predicate does not match the expected format',
	  appIdImmutable: 'The appId property cannot be changed',
	  clientMustBeReady: 'The Client must have triggered its "ready" event before you can call this',
	  modelImmutable: 'The model property cannot be changed',
	  valueNotSupported: 'The value provided is not a supported value',
	  permissionDenied: 'Operation not allowed on that object'
	};

	var layerError = LayerError$1;

	var backboneEventsStandalone = createCommonjsModule(function (module, exports) {
	/**
	 * Standalone extraction of Backbone.Events, no external dependency required.
	 * Degrades nicely when Backone/underscore are already available in the current
	 * global context.
	 *
	 * Note that docs suggest to use underscore's `_.extend()` method to add Events
	 * support to some given object. A `mixin()` method has been added to the Events
	 * prototype to avoid using underscore for that sole purpose:
	 *
	 *     var myEventEmitter = BackboneEvents.mixin({});
	 *
	 * Or for a function constructor:
	 *
	 *     function MyConstructor(){}
	 *     MyConstructor.prototype.foo = function(){}
	 *     BackboneEvents.mixin(MyConstructor.prototype);
	 *
	 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
	 * (c) 2013 Nicolas Perriault
	 */
	/* global exports:true, define, module */
	(function() {
	  var root = this,
	      nativeForEach = Array.prototype.forEach,
	      hasOwnProperty = Object.prototype.hasOwnProperty,
	      slice = Array.prototype.slice,
	      idCounter = 0;

	  // Returns a partial implementation matching the minimal API subset required
	  // by Backbone.Events
	  function miniscore() {
	    return {
	      keys: Object.keys || function (obj) {
	        if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
	          throw new TypeError("keys() called on a non-object");
	        }
	        var key, keys = [];
	        for (key in obj) {
	          if (obj.hasOwnProperty(key)) {
	            keys[keys.length] = key;
	          }
	        }
	        return keys;
	      },

	      uniqueId: function(prefix) {
	        var id = ++idCounter + '';
	        return prefix ? prefix + id : id;
	      },

	      has: function(obj, key) {
	        return hasOwnProperty.call(obj, key);
	      },

	      each: function(obj, iterator, context) {
	        if (obj == null) return;
	        if (nativeForEach && obj.forEach === nativeForEach) {
	          obj.forEach(iterator, context);
	        } else if (obj.length === +obj.length) {
	          for (var i = 0, l = obj.length; i < l; i++) {
	            iterator.call(context, obj[i], i, obj);
	          }
	        } else {
	          for (var key in obj) {
	            if (this.has(obj, key)) {
	              iterator.call(context, obj[key], key, obj);
	            }
	          }
	        }
	      },

	      once: function(func) {
	        var ran = false, memo;
	        return function() {
	          if (ran) return memo;
	          ran = true;
	          memo = func.apply(this, arguments);
	          func = null;
	          return memo;
	        };
	      }
	    };
	  }

	  var _ = miniscore(), Events;

	  // Backbone.Events
	  // ---------------

	  // A module that can be mixed in to *any object* in order to provide it with
	  // custom events. You may bind with `on` or remove with `off` callback
	  // functions to an event; `trigger`-ing an event fires all callbacks in
	  // succession.
	  //
	  //     var object = {};
	  //     _.extend(object, Backbone.Events);
	  //     object.on('expand', function(){ alert('expanded'); });
	  //     object.trigger('expand');
	  //
	  Events = {

	    // Bind an event to a `callback` function. Passing `"all"` will bind
	    // the callback to all events fired.
	    on: function(name, callback, context) {
	      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
	      this._events || (this._events = {});
	      var events = this._events[name] || (this._events[name] = []);
	      events.push({callback: callback, context: context, ctx: context || this});
	      return this;
	    },

	    // Bind an event to only be triggered a single time. After the first time
	    // the callback is invoked, it will be removed.
	    once: function(name, callback, context) {
	      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
	      var self = this;
	      var once = _.once(function() {
	        self.off(name, once);
	        callback.apply(this, arguments);
	      });
	      once._callback = callback;
	      return this.on(name, once, context);
	    },

	    // Remove one or many callbacks. If `context` is null, removes all
	    // callbacks with that function. If `callback` is null, removes all
	    // callbacks for the event. If `name` is null, removes all bound
	    // callbacks for all events.
	    off: function(name, callback, context) {
	      var retain, ev, events, names, i, l, j, k;
	      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
	      if (!name && !callback && !context) {
	        this._events = {};
	        return this;
	      }

	      names = name ? [name] : _.keys(this._events);
	      for (i = 0, l = names.length; i < l; i++) {
	        name = names[i];
	        if (events = this._events[name]) {
	          this._events[name] = retain = [];
	          if (callback || context) {
	            for (j = 0, k = events.length; j < k; j++) {
	              ev = events[j];
	              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
	                  (context && context !== ev.context)) {
	                retain.push(ev);
	              }
	            }
	          }
	          if (!retain.length) delete this._events[name];
	        }
	      }

	      return this;
	    },

	    // Trigger one or many events, firing all bound callbacks. Callbacks are
	    // passed the same arguments as `trigger` is, apart from the event name
	    // (unless you're listening on `"all"`, which will cause your callback to
	    // receive the true name of the event as the first argument).
	    trigger: function(name) {
	      if (!this._events) return this;
	      var args = slice.call(arguments, 1);
	      if (!eventsApi(this, 'trigger', name, args)) return this;
	      var events = this._events[name];
	      var allEvents = this._events.all;
	      if (events) triggerEvents(events, args);
	      if (allEvents) triggerEvents(allEvents, arguments);
	      return this;
	    },

	    // Tell this object to stop listening to either specific events ... or
	    // to every object it's currently listening to.
	    stopListening: function(obj, name, callback) {
	      var listeners = this._listeners;
	      if (!listeners) return this;
	      var deleteListener = !name && !callback;
	      if (typeof name === 'object') callback = this;
	      if (obj) (listeners = {})[obj._listenerId] = obj;
	      for (var id in listeners) {
	        listeners[id].off(name, callback, this);
	        if (deleteListener) delete this._listeners[id];
	      }
	      return this;
	    }

	  };

	  // Regular expression used to split event strings.
	  var eventSplitter = /\s+/;

	  // Implement fancy features of the Events API such as multiple event
	  // names `"change blur"` and jQuery-style event maps `{change: action}`
	  // in terms of the existing API.
	  var eventsApi = function(obj, action, name, rest) {
	    if (!name) return true;

	    // Handle event maps.
	    if (typeof name === 'object') {
	      for (var key in name) {
	        obj[action].apply(obj, [key, name[key]].concat(rest));
	      }
	      return false;
	    }

	    // Handle space separated event names.
	    if (eventSplitter.test(name)) {
	      var names = name.split(eventSplitter);
	      for (var i = 0, l = names.length; i < l; i++) {
	        obj[action].apply(obj, [names[i]].concat(rest));
	      }
	      return false;
	    }

	    return true;
	  };

	  // A difficult-to-believe, but optimized internal dispatch function for
	  // triggering events. Tries to keep the usual cases speedy (most internal
	  // Backbone events have 3 arguments).
	  var triggerEvents = function(events, args) {
	    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
	    switch (args.length) {
	      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
	      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
	      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
	      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
	      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
	    }
	  };

	  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

	  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
	  // listen to an event in another object ... keeping track of what it's
	  // listening to.
	  _.each(listenMethods, function(implementation, method) {
	    Events[method] = function(obj, name, callback) {
	      var listeners = this._listeners || (this._listeners = {});
	      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
	      listeners[id] = obj;
	      if (typeof name === 'object') callback = this;
	      obj[implementation](name, callback, this);
	      return this;
	    };
	  });

	  // Aliases for backwards compatibility.
	  Events.bind   = Events.on;
	  Events.unbind = Events.off;

	  // Mixin utility
	  Events.mixin = function(proto) {
	    var exports = ['on', 'once', 'off', 'trigger', 'stopListening', 'listenTo',
	                   'listenToOnce', 'bind', 'unbind'];
	    _.each(exports, function(name) {
	      proto[name] = this[name];
	    }, this);
	    return proto;
	  };

	  // Export Events as BackboneEvents depending on current context
	  if (typeof exports !== 'undefined') {
	    if (typeof module !== 'undefined' && module.exports) {
	      exports = module.exports = Events;
	    }
	    exports.BackboneEvents = Events;
	  }else if (typeof define === "function"  && typeof define.amd == "object") {
	    define(function() {
	      return Events;
	    });
	  } else {
	    root.BackboneEvents = Events;
	  }
	})(commonjsGlobal);
	});

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var Utils = clientUtils;
	var LayerEvent = layerEvent;
	var LayerError = layerError;
	var Events = backboneEventsStandalone;
	var Logger = logger_1;

	/*
	 * Provides a system bus that can be accessed by all components of the system.
	 * Currently used to listen to messages sent via postMessage, but envisioned to
	 * do far more.
	 */
	function EventClass() {}
	EventClass.prototype = Events;

	var SystemBus = new EventClass();
	if (typeof postMessage === 'function') {
	  addEventListener('message', function (event) {
	    if (event.data.type === 'layer-delayed-event') {
	      SystemBus.trigger(event.data.internalId + '-delayed-event');
	    }
	  });
	}

	// Used to generate a unique internalId for every Root instance
	var uniqueIds = {};

	// Regex for splitting an event string such as obj.on('evtName1 evtName2 evtName3')
	var eventSplitter = /\s+/;

	/**
	 * The root class of all layer objects. Provides the following utilities
	 *
	 * 1. Mixes in the Backbone event model
	 *
	 *        var person = new Person();
	 *        person.on('destroy', function() {
	 *            console.log('I have been destroyed!');
	 *        });
	 *
	 *        // Fire the console log handler:
	 *        person.trigger('destroy');
	 *
	 *        // Unsubscribe
	 *        person.off('destroy');
	 *
	 * 2. Adds a subscriptions object so that any event handlers on an object can be quickly found and removed
	 *
	 *        var person1 = new Person();
	 *        var person2 = new Person();
	 *        person2.on('destroy', function() {
	 *            console.log('I have been destroyed!');
	 *        }, person1);
	 *
	 *        // Pointers to person1 held onto by person2 are removed
	 *        person1.destroy();
	 *
	 * 3. Adds support for event listeners in the constructor
	 *    Any event handler can be passed into the constructor
	 *    just as though it were a property.
	 *
	 *        var person = new Person({
	 *            age: 150,
	 *            destroy: function() {
	 *                console.log('I have been destroyed!');
	 *            }
	 *        });
	 *
	 * 4. A _disableEvents property
	 *
	 *        myMethod() {
	 *          if (this.isInitializing) {
	 *              this._disableEvents = true;
	 *
	 *              // Event only received if _disableEvents = false
	 *              this.trigger('destroy');
	 *              this._disableEvents = false;
	 *          }
	 *        }
	 *
	 * 5. A _supportedEvents static property for each class
	 *
	 *     This property defines which events can be triggered.
	 *
	 *     * Any attempt to trigger
	 *       an event not in _supportedEvents will log an error.
	 *     * Any attempt to register a listener for an event not in _supportedEvents will
	 *     *throw* an error.
	 *
	 *     This allows us to insure developers only subscribe to valid events.
	 *
	 *     This allows us to control what events can be fired and which ones blocked.
	 *
	 * 6. Adds an internalId property
	 *
	 *        var person = new Person();
	 *        console.log(person.internalId); // -> 'Person1'
	 *
	 * 7. Adds a toObject method to create a simplified Plain Old Javacript Object from your object
	 *
	 *        var person = new Person();
	 *        var simplePerson = person.toObject();
	 *
	 * 8. Provides __adjustProperty method support
	 *
	 *     For any property of a class, an `__adjustProperty` method can be defined.  If its defined,
	 *     it will be called prior to setting that property, allowing:
	 *
	 *     A. Modification of the value that is actually set
	 *     B. Validation of the value; throwing errors if invalid.
	 *
	 * 9. Provides __udpateProperty method support
	 *
	 *     After setting any property for which there is an `__updateProperty` method defined,
	 *     the method will be called, allowing the new property to be applied.
	 *
	 *     Typically used for
	 *
	 *     A. Triggering events
	 *     B. Firing XHR requests
	 *     C. Updating the UI to match the new property value
	 *
	 *
	 * @class layer.Root
	 * @abstract
	 * @author Michael Kantor
	 */

	var Root = function (_EventClass) {
	  _inherits(Root, _EventClass);

	  /**
	   * Superclass constructor handles copying in properties and registering event handlers.
	   *
	   * @method constructor
	   * @param  {Object} options - a hash of properties and event handlers
	   * @return {layer.Root}
	   */
	  function Root() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck(this, Root);

	    var _this = _possibleConstructorReturn(this, (Root.__proto__ || Object.getPrototypeOf(Root)).call(this));

	    _this._layerEventSubscriptions = [];
	    _this._delayedTriggers = [];
	    _this._lastDelayedTrigger = Date.now();
	    _this._events = {};

	    // Generate an internalId
	    var name = _this.constructor.name;
	    if (!uniqueIds[name]) uniqueIds[name] = 0;
	    _this.internalId = name + uniqueIds[name]++;

	    // Every component listens to the SystemBus for postMessage (triggerAsync) events
	    SystemBus.on(_this.internalId + '-delayed-event', _this._processDelayedTriggers, _this);

	    // Generate a temporary id if there isn't an id
	    if (!_this.id && !options.id && _this.constructor.prefixUUID) {
	      _this.id = _this.constructor.prefixUUID + Utils.generateUUID();
	    }

	    // Copy in all properties; setup all event handlers
	    var key = void 0;
	    for (key in options) {
	      if (_this.constructor._supportedEvents.indexOf(key) !== -1) {
	        _this.on(key, options[key]);
	      } else if (key in _this && typeof _this[key] !== 'function') {
	        _this[key] = options[key];
	      }
	    }
	    _this.isInitializing = false;
	    return _this;
	  }

	  /**
	   * Destroys the object.
	   *
	   * Cleans up all events / subscriptions
	   * and marks the object as isDestroyed.
	   *
	   * @method destroy
	   */


	  _createClass(Root, [{
	    key: 'destroy',
	    value: function destroy() {
	      var _this2 = this;

	      if (this.isDestroyed) throw new Error(LayerError.dictionary.alreadyDestroyed);

	      // If anyone is listening, notify them
	      this.trigger('destroy');

	      // Cleanup pointers to SystemBus. Failure to call destroy
	      // will have very serious consequences...
	      SystemBus.off(this.internalId + '-delayed-event', null, this);

	      // Remove all events, and all pointers passed to this object by other objects
	      this.off();

	      // Find all of the objects that this object has passed itself to in the form
	      // of event handlers and remove all references to itself.
	      this._layerEventSubscriptions.forEach(function (item) {
	        return item.off(null, null, _this2);
	      });

	      this._layerEventSubscriptions = null;
	      this._delayedTriggers = null;
	      this.isDestroyed = true;
	    }
	  }, {
	    key: 'toObject',


	    /**
	     * Convert class instance to Plain Javascript Object.
	     *
	     * Strips out all private members, and insures no datastructure loops.
	     * Recursively converting all subobjects using calls to toObject.
	     *
	     *      console.dir(myobj.toObject());
	     *
	     * Note: While it would be tempting to have noChildren default to true,
	     * this would result in Message.toObject() not outputing its MessageParts.
	     *
	     * Private data (_ prefixed properties) will not be output.
	     *
	     * @method toObject
	     * @param  {boolean} [noChildren=false] Don't output sub-components
	     * @return {Object}
	     */
	    value: function toObject() {
	      var _this3 = this;

	      var noChildren = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

	      this.__inToObject = true;
	      var obj = {};

	      // Iterate over all formally defined properties
	      try {
	        var keys = [];
	        var aKey = void 0;
	        for (aKey in this.constructor.prototype) {
	          if (!(aKey in Root.prototype)) keys.push(aKey);
	        }keys.forEach(function (key) {
	          var v = _this3[key];

	          // Ignore private/protected properties and functions
	          if (key.indexOf('_') === 0) return;
	          if (typeof v === 'function') return;

	          // Generate arrays...
	          if (Array.isArray(v)) {
	            obj[key] = [];
	            v.forEach(function (item) {
	              if (item instanceof Root) {
	                if (noChildren) {
	                  delete obj[key];
	                } else if (!item.__inToObject) {
	                  obj[key].push(item.toObject());
	                }
	              } else {
	                obj[key].push(item);
	              }
	            });
	          }

	          // Generate subcomponents
	          else if (v instanceof Root) {
	              if (!v.__inToObject && !noChildren) {
	                obj[key] = v.toObject();
	              }
	            }

	            // Generate dates (creates a copy to separate it from the source object)
	            else if (v instanceof Date) {
	                obj[key] = new Date(v);
	              }

	              // Generate simple properties
	              else {
	                  obj[key] = v;
	                }
	        });
	      } catch (e) {
	        // no-op
	      }
	      this.__inToObject = false;
	      return obj;
	    }

	    /**
	     * Log a warning for attempts to subscribe to unsupported events.
	     *
	     * @method _warnForEvent
	     * @private
	     */

	  }, {
	    key: '_warnForEvent',
	    value: function _warnForEvent(eventName) {
	      if (!Utils.includes(this.constructor._supportedEvents, eventName)) {
	        throw new Error('Event ' + eventName + ' not defined for ' + this.toString());
	      }
	    }

	    /**
	     * Prepare for processing an event subscription call.
	     *
	     * If context is a Root class, add this object to the context's subscriptions.
	     *
	     * @method _prepareOn
	     * @private
	     */

	  }, {
	    key: '_prepareOn',
	    value: function _prepareOn(name, handler, context) {
	      var _this4 = this;

	      if (context) {
	        if (context instanceof Root) {
	          if (context.isDestroyed) {
	            throw new Error(LayerError.dictionary.isDestroyed);
	          }
	        }
	        if (context._layerEventSubscriptions) {
	          context._layerEventSubscriptions.push(this);
	        }
	      }
	      if (typeof name === 'string' && name !== 'all') {
	        if (eventSplitter.test(name)) {
	          var names = name.split(eventSplitter);
	          names.forEach(function (n) {
	            return _this4._warnForEvent(n);
	          });
	        } else {
	          this._warnForEvent(name);
	        }
	      } else if (name && (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
	        Object.keys(name).forEach(function (keyName) {
	          return _this4._warnForEvent(keyName);
	        });
	      }
	    }

	    /**
	     * Subscribe to events.
	     *
	     * Note that the context parameter serves double importance here:
	     *
	     * 1. It determines the context in which to execute the event handler
	     * 2. Create a backlink so that if either subscriber or subscribee is destroyed,
	     *    all pointers between them can be found and removed.
	     *
	     * ```
	     * obj.on('someEventName someOtherEventName', mycallback, mycontext);
	     * ```
	     *
	     * ```
	     * obj.on({
	     *    eventName1: callback1,
	     *    eventName2: callback2
	     * }, mycontext);
	     * ```
	     *
	     * @method on
	     * @param  {String} name - Name of the event
	     * @param  {Function} handler - Event handler
	     * @param  {layer.LayerEvent} handler.event - Event object delivered to the handler
	     * @param  {Object} context - This pointer AND link to help with cleanup
	     * @return {layer.Root} this
	     */

	  }, {
	    key: 'on',
	    value: function on(name, handler, context) {
	      this._prepareOn(name, handler, context);
	      Events.on.apply(this, [name, handler, context]);
	      return this;
	    }

	    /**
	     * Subscribe to the first occurance of the specified event.
	     *
	     * @method once
	     * @return {layer.Root} this
	     */

	  }, {
	    key: 'once',
	    value: function once(name, handler, context) {
	      this._prepareOn(name, handler, context);
	      Events.once.apply(this, [name, handler, context]);
	      return this;
	    }

	    /**
	     * Unsubscribe from events.
	     *
	     * ```
	     * // Removes all event handlers for this event:
	     * obj.off('someEventName');
	     *
	     * // Removes all event handlers using this function pointer as callback
	     * obj.off(null, f, null);
	     *
	     * // Removes all event handlers that `this` has subscribed to; requires
	     * // obj.on to be called with `this` as its `context` parameter.
	     * obj.off(null, null, this);
	     * ```
	     *
	     * @method off
	     * @param  {String} name - Name of the event; null for all event names
	     * @param  {Function} handler - Event handler; null for all functions
	     * @param  {Object} context - The context from the `on()` call to search for; null for all contexts
	     * @return {layer.Root} this
	     */

	    /**
	     * Trigger an event for any event listeners.
	     *
	     * Events triggered this way will be blocked if _disableEvents = true
	     *
	     * @method trigger
	     * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
	     * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
	     * @return {layer.Root} this
	     */

	  }, {
	    key: 'trigger',
	    value: function trigger() {
	      if (this._disableEvents) return this;
	      return this._trigger.apply(this, arguments);
	    }

	    /**
	     * Triggers an event.
	     *
	     * @method trigger
	     * @private
	     * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
	     * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
	     */

	  }, {
	    key: '_trigger',
	    value: function _trigger() {
	      if (!Utils.includes(this.constructor._supportedEvents, arguments.length <= 0 ? undefined : arguments[0])) {
	        if (!Utils.includes(this.constructor._ignoredEvents, arguments.length <= 0 ? undefined : arguments[0])) {
	          Logger.error(this.toString() + ' ignored ' + (arguments.length <= 0 ? undefined : arguments[0]));
	        }
	        return;
	      }

	      var computedArgs = this._getTriggerArgs.apply(this, arguments);

	      Events.trigger.apply(this, computedArgs);

	      var parentProp = this.constructor.bubbleEventParent;
	      if (parentProp && (arguments.length <= 0 ? undefined : arguments[0]) !== 'destroy') {
	        var _parentValue;

	        var parentValue = this[parentProp];
	        parentValue = typeof parentValue === 'function' ? parentValue.apply(this) : parentValue;
	        if (parentValue) (_parentValue = parentValue).trigger.apply(_parentValue, _toConsumableArray(computedArgs));
	      }
	    }

	    /**
	     * Generates a layer.LayerEvent from a trigger call's arguments.
	     *
	     * * If parameter is already a layer.LayerEvent, we're done.
	     * * If parameter is an object, a `target` property is added to that object and its delivered to all subscribers
	     * * If the parameter is non-object value, it is added to an object with a `target` property, and the value is put in
	     *   the `data` property.
	     *
	     * @method _getTriggerArgs
	     * @private
	     * @return {Mixed[]} - First element of array is eventName, second element is layer.LayerEvent.
	     */

	  }, {
	    key: '_getTriggerArgs',
	    value: function _getTriggerArgs() {
	      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
	        args[_key] = arguments[_key];
	      }

	      var computedArgs = Array.prototype.slice.call(args);

	      if (args[1]) {
	        var newArg = { target: this };

	        if (computedArgs[1] instanceof LayerEvent) {
	          // A LayerEvent will be an argument when bubbling events up; these args can be used as-is
	        } else {
	          if (_typeof(computedArgs[1]) === 'object') {
	            Object.keys(computedArgs[1]).forEach(function (name) {
	              return newArg[name] = computedArgs[1][name];
	            });
	          } else {
	            newArg.data = computedArgs[1];
	          }
	          computedArgs[1] = new LayerEvent(newArg, computedArgs[0]);
	        }
	      } else {
	        computedArgs[1] = new LayerEvent({ target: this }, computedArgs[0]);
	      }

	      return computedArgs;
	    }

	    /**
	     * Same as _trigger() method, but delays briefly before firing.
	     *
	     * When would you want to delay an event?
	     *
	     * 1. There is an event rollup that may be needed for the event;
	     *    this requires the framework to be able to see ALL events that have been
	     *    generated, roll them up, and THEN fire them.
	     * 2. The event is intended for UI rendering... which should not hold up the rest of
	     *    this framework's execution.
	     *
	     * When NOT to delay an event?
	     *
	     * 1. Lifecycle events frequently require response at the time the event has fired
	     *
	     * @method _triggerAsync
	     * @private
	     * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
	     * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
	     * @return {layer.Root} this
	     */

	  }, {
	    key: '_triggerAsync',
	    value: function _triggerAsync() {
	      var _this5 = this;

	      var computedArgs = this._getTriggerArgs.apply(this, arguments);
	      this._delayedTriggers.push(computedArgs);

	      // NOTE: It is unclear at this time how it happens, but on very rare occasions, we see processDelayedTriggers
	      // fail to get called when length = 1, and after that length just continuously grows.  So we add
	      // the _lastDelayedTrigger test to insure that it will still run.
	      var shouldScheduleTrigger = this._delayedTriggers.length === 1 || this._delayedTriggers.length && this._lastDelayedTrigger + 500 < Date.now();
	      if (shouldScheduleTrigger) {
	        this._lastDelayedTrigger = Date.now();
	        if (typeof postMessage === 'function' && typeof jasmine === 'undefined') {
	          var messageData = {
	            type: 'layer-delayed-event',
	            internalId: this.internalId
	          };
	          if (typeof document !== 'undefined') {
	            window.postMessage(messageData, '*');
	          } else {
	            // React Native reportedly lacks a document, and throws errors on the second parameter
	            window.postMessage(messageData);
	          }
	        } else {
	          setTimeout(function () {
	            return _this5._processDelayedTriggers();
	          }, 0);
	        }
	      }
	    }

	    /**
	     * Combines a set of events into a single event.
	     *
	     * Given an event structure of
	     * ```
	     *      {
	     *          customName: [value1]
	     *      }
	     *      {
	     *          customName: [value2]
	     *      }
	     *      {
	     *          customName: [value3]
	     *      }
	     * ```
	     *
	     * Merge them into
	     *
	     * ```
	     *      {
	     *          customName: [value1, value2, value3]
	     *      }
	     * ```
	     *
	     * @method _foldEvents
	     * @private
	     * @param  {layer.LayerEvent[]} events
	     * @param  {string} name      Name of the property (i.e. 'customName')
	     * @param  {layer.Root}    newTarget Value of the target for the folded resulting event
	     */

	  }, {
	    key: '_foldEvents',
	    value: function _foldEvents(events, name, newTarget) {
	      var _this6 = this;

	      var firstEvt = events.length ? events[0][1] : null;
	      var firstEvtProp = firstEvt ? firstEvt[name] : null;
	      events.forEach(function (evt, i) {
	        if (i > 0) {
	          firstEvtProp.push(evt[1][name][0]);
	          _this6._delayedTriggers.splice(_this6._delayedTriggers.indexOf(evt), 1);
	        }
	      });
	      if (events.length && newTarget) events[0][1].target = newTarget;
	    }

	    /**
	     * Fold a set of Change events into a single Change event.
	     *
	     * Given a set change events on this component,
	     * fold all change events into a single event via
	     * the layer.LayerEvent's changes array.
	     *
	     * @method _foldChangeEvents
	     * @private
	     */

	  }, {
	    key: '_foldChangeEvents',
	    value: function _foldChangeEvents() {
	      var _this7 = this;

	      var events = this._delayedTriggers.filter(function (evt) {
	        return evt[1].isChange;
	      });
	      events.forEach(function (evt, i) {
	        if (i > 0) {
	          events[0][1]._mergeChanges(evt[1]);
	          _this7._delayedTriggers.splice(_this7._delayedTriggers.indexOf(evt), 1);
	        }
	      });
	    }

	    /**
	     * Execute all delayed events for this compoennt.
	     *
	     * @method _processDelayedTriggers
	     * @private
	     */

	  }, {
	    key: '_processDelayedTriggers',
	    value: function _processDelayedTriggers() {
	      if (this.isDestroyed) return;
	      this._foldChangeEvents();

	      this._delayedTriggers.forEach(function (evt) {
	        this.trigger.apply(this, _toConsumableArray(evt));
	      }, this);
	      this._delayedTriggers = [];
	    }
	  }, {
	    key: '_runMixins',
	    value: function _runMixins(mixinName, argArray) {
	      var _this8 = this;

	      this.constructor.mixins.forEach(function (mixin) {
	        if (mixin.lifecycle[mixinName]) mixin.lifecycle[mixinName].apply(_this8, argArray);
	      });
	    }

	    /**
	     * Returns a string representation of the class that is nicer than `[Object]`.
	     *
	     * @method toString
	     * @return {String}
	     */

	  }, {
	    key: 'toString',
	    value: function toString() {
	      return this.internalId;
	    }
	  }], [{
	    key: 'isValidId',
	    value: function isValidId(id) {
	      return id.indexOf(this.prefixUUID) === 0;
	    }
	  }]);

	  return Root;
	}(EventClass);

	function defineProperty(newClass, propertyName) {
	  var pKey = '__' + propertyName;
	  var camel = propertyName.substring(0, 1).toUpperCase() + propertyName.substring(1);
	  var hasDefinitions = newClass.prototype['__adjust' + camel] || newClass.prototype['__update' + camel] || newClass.prototype['__get' + camel];
	  if (hasDefinitions) {
	    // set default value
	    newClass.prototype[pKey] = newClass.prototype[propertyName];

	    Object.defineProperty(newClass.prototype, propertyName, {
	      enumerable: true,
	      get: function get() {
	        return this['__get' + camel] ? this['__get' + camel](pKey) : this[pKey];
	      },
	      set: function set(inValue) {
	        if (this.isDestroyed) return;
	        var initial = this[pKey];
	        if (inValue !== initial) {
	          if (this['__adjust' + camel]) {
	            var result = this['__adjust' + camel](inValue);
	            if (result !== undefined) inValue = result;
	          }
	          this[pKey] = inValue;
	        }
	        if (inValue !== initial) {
	          if (!this.isInitializing && this['__update' + camel]) {
	            this['__update' + camel](inValue, initial);
	          }
	        }
	      }
	    });
	  }
	}

	function initClass(newClass, className) {
	  // Make sure our new class has a name property
	  if (!newClass.name) newClass.name = className;

	  // Make sure our new class has a _supportedEvents, _ignoredEvents, _inObjectIgnore and EVENTS properties
	  if (!newClass._supportedEvents) newClass._supportedEvents = Root._supportedEvents;
	  if (!newClass._ignoredEvents) newClass._ignoredEvents = Root._ignoredEvents;

	  if (newClass.mixins) {
	    newClass.mixins.forEach(function (mixin) {
	      if (mixin.events) newClass._supportedEvents = newClass._supportedEvents.concat(mixin.events);
	      if (mixin.properties) {
	        Object.keys(mixin.properties).forEach(function (key) {
	          newClass.prototype[key] = mixin.properties[key];
	        });
	      }
	      if (mixin.methods) {
	        Object.keys(mixin.methods).forEach(function (key) {
	          newClass.prototype[key] = mixin.methods[key];
	        });
	      }
	    });
	  }

	  // Generate a list of properties for this class; we don't include any
	  // properties from layer.Root
	  var keys = Object.keys(newClass.prototype).filter(function (key) {
	    return newClass.prototype.hasOwnProperty(key) && !Root.prototype.hasOwnProperty(key) && typeof newClass.prototype[key] !== 'function';
	  });

	  // Define getters/setters for any property that has __adjust or __update methods defined
	  keys.forEach(function (name) {
	    return defineProperty(newClass, name);
	  });
	}

	/**
	 * Set to true once destroy() has been called.
	 *
	 * A destroyed object will likely cause errors in any attempt
	 * to call methods on it, and will no longer trigger events.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	Root.prototype.isDestroyed = false;

	/**
	 * Every instance has its own internal ID.
	 *
	 * This ID is distinct from any IDs assigned by the server.
	 * The internal ID is gaurenteed not to change within the lifetime of the Object/session;
	 * it is possible, on creating a new object, for its `id` property to change.
	 *
	 * @type {string}
	 * @readonly
	 */
	Root.prototype.internalId = '';

	/**
	 * True while we are in the constructor.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	Root.prototype.isInitializing = true;

	/**
	 * Objects that this object is listening for events from.
	 *
	 * @type {layer.Root[]}
	 * @private
	 */
	Root.prototype._layerEventSubscriptions = null;

	/**
	 * Disable all events triggered on this object.
	 * @type {boolean}
	 * @private
	 */
	Root.prototype._disableEvents = false;

	Root._supportedEvents = ['destroy', 'all'];
	Root._ignoredEvents = [];
	var root = Root;
	var initClass_1 = initClass;


	root.initClass = initClass_1;

	var empty = {};


	var empty$1 = Object.freeze({
		default: empty
	});

	var require$$0$3 = ( empty$1 && empty ) || empty$1;

	var xhr$1 = createCommonjsModule(function (module) {
	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/**
	 * Basic XHR Library with some notions hardcoded in
	 * of what the Layer server expects/returns.
	 *
	    layer.xhr({
	      url: 'http://my.com/mydata',
	      data: {hey: 'ho', there: 'folk'},
	      method: 'GET',
	      format: 'json',
	      headers: {'fred': 'Joe'},
	      timeout: 50000
	    }, function(result) {
	      if (!result.success) {
	        errorHandler(result.data, result.headers, result.status);
	      } else {
	        successHandler(result.data, result.headers, result.xhr);
	      }
	    });
	 *
	 * @class layer.xhr
	 * @private
	 */

	/**
	 * Send a Request.
	 *
	 * @method  xhr
	 * @param {Object} options
	 * @param {string} options.url
	 * @param {Mixed} [options.data=null]
	 * @param {string} [options.format=''] - set to 'json' to get result parsed as json (in case there is no obvious Content-Type in the response)
	 * @param {Object} [options.headers={}] - Name value pairs for  headers and their values
	 * @param {number} [options.timeout=0] - When does the request expire/timeout in miliseconds.
	 * @param {Function} callback
	 * @param {Object} callback.result
	 * @param {number} callback.result.status - http status code
	 * @param {boolean} callback.result.success - true if it was a successful response
	 * @param {XMLHttpRequest} callback.result.xhr - The XHR object used for the request
	 * @param {Object} callback.result.data -  The parsed response body
	 *
	 * TODO:
	 *
	 * 1. Make this a subclass of Root and make it a singleton so it can inherit a proper event system
	 * 2. Result should be a layer.ServerResponse instance
	 * 3. Should only access link headers if requested; annoying having it throw errors every other time.
	 */

	// Don't set xhr to window.XMLHttpRequest as it will bypass jasmine's
	// ajax library
	var Xhr = typeof window === 'undefined' ? require$$0$3 : null;

	function parseLinkHeaders(linkHeader) {
	  if (!linkHeader) return {};

	  // Split parts by comma
	  var parts = linkHeader.split(',');
	  var links = {};

	  // Parse each part into a named link
	  parts.forEach(function (part) {
	    var section = part.split(';');
	    if (section.length !== 2) return;
	    var url = section[0].replace(/<(.*)>/, '$1').trim();
	    var name = section[1].replace(/rel='?(.*)'?/, '$1').trim();
	    links[name] = url;
	  });

	  return links;
	}

	module.exports = function (request, callback) {
	  var startTime = Date.now();
	  var req = Xhr ? new Xhr() : new XMLHttpRequest();
	  var method = (request.method || 'GET').toUpperCase();

	  var onload = function onload() {
	    var headers = {
	      'content-type': this.getResponseHeader('content-type')
	    };

	    var result = {
	      status: this.status,
	      success: this.status && this.status < 300,
	      xhr: this
	    };

	    var isJSON = String(headers['content-type']).split(/;/)[0].match(/^application\/json/) || request.format === 'json';

	    if (this.responseType === 'blob' || this.responseType === 'arraybuffer') {
	      if (this.status === 0) {
	        result.data = new Error('Connection Failed');
	      } else {
	        // Damnit, this.response is a function if using jasmine test framework.
	        result.data = typeof this.response === 'function' ? this.responseText : this.response;
	      }
	    } else {
	      if (isJSON && this.responseText) {
	        try {
	          result.data = JSON.parse(this.responseText);
	        } catch (err) {
	          result.data = {
	            code: 999,
	            message: 'Invalid JSON from server',
	            response: this.responseText
	          };
	          result.status = 999;
	        }
	      } else {
	        result.data = this.responseText;
	      }

	      // Note that it is a successful connection if we get back an error from the server,
	      // it may have been a failed request, but the connection was good.
	      module.exports.trigger({
	        target: this,
	        status: !this.responseText && !this.status ? 'connection:error' : 'connection:success',
	        duration: Date.now() - startTime,
	        request: request
	      });

	      if (!this.responseText && !this.status) {
	        result.status = 408;
	        result.data = {
	          id: 'request_timeout',
	          message: 'The server is not responding please try again in a few minutes',
	          url: 'https://docs.layer.com/reference/client_api/errors',
	          code: 0,
	          status: 408,
	          httpStatus: 408
	        };
	      } else if (this.status === 404 && _typeof(result.data) !== 'object') {
	        result.data = {
	          id: 'operation_not_found',
	          message: 'Endpoint ' + (request.method || 'GET') + ' ' + request.url + ' does not exist',
	          status: this.status,
	          httpStatus: 404,
	          code: 106,
	          url: 'https://docs.layer.com/reference/client_api/errors'
	        };
	      } else if (typeof result.data === 'string' && this.status >= 400) {
	        result.data = {
	          id: 'unknown_error',
	          message: result.data,
	          status: this.status,
	          httpStatus: this.status,
	          code: 0,
	          url: 'https://www.google.com/search?q=doh!'
	        };
	      }
	    }

	    if (request.headers && (request.headers.accept || '').match(/application\/vnd.layer\+json/)) {
	      var links = this.getResponseHeader('link');
	      if (links) result.Links = parseLinkHeaders(links);
	    }
	    result.xhr = this;

	    if (callback) callback(result);
	  };

	  req.onload = onload;

	  // UNTESTED!!!
	  req.onerror = req.ontimeout = onload;

	  // Replace all headers in arbitrary case with all lower case
	  // for easy matching.
	  var headersList = Object.keys(request.headers || {});
	  var headers = {};
	  headersList.forEach(function (header) {
	    if (header.toLowerCase() === 'content-type') {
	      headers['content-type'] = request.headers[header];
	    } else {
	      headers[header.toLowerCase()] = request.headers[header];
	    }
	  });
	  request.headers = headers;

	  var data = '';
	  if (request.data) {
	    if (typeof Blob !== 'undefined' && request.data instanceof Blob) {
	      data = request.data;
	    } else if (request.headers && (String(request.headers['content-type']).match(/^application\/json/) || String(request.headers['content-type']) === 'application/vnd.layer-patch+json')) {
	      data = typeof request.data === 'string' ? request.data : JSON.stringify(request.data);
	    } else if (request.data && _typeof(request.data) === 'object') {
	      Object.keys(request.data).forEach(function (name) {
	        if (data) data += '&';
	        data += name + '=' + request.data[name];
	      });
	    } else {
	      data = request.data; // Some form of raw string/data
	    }
	  }
	  if (data) {
	    if (method === 'GET') {
	      request.url += '?' + data;
	    }
	  }

	  req.open(method, request.url, true);
	  if (request.timeout) req.timeout = request.timeout;
	  if (request.withCredentials) req.withCredentials = true;
	  if (request.responseType) req.responseType = request.responseType;

	  if (request.headers) {
	    Object.keys(request.headers).forEach(function (headerName) {
	      return req.setRequestHeader(headerName, request.headers[headerName]);
	    });
	  }

	  try {
	    if (method === 'GET') {
	      req.send();
	    } else {
	      req.send(data);
	    }
	  } catch (e) {
	    // do nothing
	  }
	};

	var listeners = [];
	module.exports.addConnectionListener = function (func) {
	  return listeners.push(func);
	};

	module.exports.trigger = function (evt) {
	  listeners.forEach(function (func) {
	    return func(evt);
	  });
	};

	});

	var _createClass$6 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$1 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$6(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$3(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$3(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * This component manages
	 *
	 * 1. recieving websocket events
	 * 2. Processing them
	 * 3. Triggering events on completing them
	 * 4. Sending them
	 *
	 * Applications typically do not interact with this component, but may subscribe
	 * to the `message` event if they want richer event information than is available
	 * through the layer.Client class.
	 *
	 * @class  layer.Websockets.SocketManager
	 * @extends layer.Root
	 * @private
	 */
	var Root$3 = root;
	var Utils$1 = clientUtils;
	var logger$3 = logger_1;
	var LayerError$3 = layerError;

	var _require$1 = _const;
	var WEBSOCKET_PROTOCOL = _require$1.WEBSOCKET_PROTOCOL;

	var SocketManager$1 = function (_Root) {
	  _inherits$3(SocketManager, _Root);

	  /**
	   * Create a new websocket manager
	   *
	   *      var socketManager = new layer.Websockets.SocketManager({
	   *          client: client,
	   *      });
	   *
	   * @method
	   * @param  {Object} options
	   * @param {layer.Client} client
	   * @return {layer.Websockets.SocketManager}
	   */
	  function SocketManager(options) {
	    _classCallCheck$6(this, SocketManager);

	    var _this = _possibleConstructorReturn$3(this, (SocketManager.__proto__ || Object.getPrototypeOf(SocketManager)).call(this, options));

	    if (!_this.client) throw new Error('SocketManager requires a client');

	    // Insure that on/off methods don't need to call bind, therefore making it easy
	    // to add/remove functions as event listeners.
	    _this._onMessage = _this._onMessage.bind(_this);
	    _this._onOpen = _this._onOpen.bind(_this);
	    _this._onSocketClose = _this._onSocketClose.bind(_this);
	    _this._onError = _this._onError.bind(_this);

	    // If the client is authenticated, start it up.
	    if (_this.client.isAuthenticated && _this.client.onlineManager.isOnline) {
	      _this.connect();
	    }

	    _this.client.on('online', _this._onlineStateChange, _this);

	    // Any time the Client triggers a ready event we need to reconnect.
	    _this.client.on('authenticated', _this.connect, _this);

	    _this._lastTimestamp = Date.now();
	    return _this;
	  }

	  /**
	   * Call this when we want to reset all websocket state; this would be done after a lengthy period
	   * of being disconnected.  This prevents Event.replay from being called on reconnecting.
	   *
	   * @method _reset
	   * @private
	   */


	  _createClass$6(SocketManager, [{
	    key: '_reset',
	    value: function _reset() {
	      this._lastTimestamp = 0;
	      this._lastDataFromServerTimestamp = 0;
	      this._lastCounter = null;
	      this._hasCounter = false;

	      this._needsReplayFrom = null;
	    }

	    /**
	     * Event handler is triggered any time the client's online state changes.
	     * If going online we need to reconnect (i.e. will close any existing websocket connections and then open a new connection)
	     * If going offline, close the websocket as its no longer useful/relevant.
	     * @method _onlineStateChange
	     * @private
	     * @param {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_onlineStateChange',
	    value: function _onlineStateChange(evt) {
	      if (!this.client.isAuthenticated) return;
	      if (evt.isOnline) {
	        this._reconnect(evt.reset);
	      } else {
	        logger$3.info('Websocket closed due to ambigious connection state');
	        this.close();
	      }
	    }

	    /**
	     * Reconnect to the server, optionally resetting all data if needed.
	     * @method _reconnect
	     * @private
	     * @param {boolean} reset
	     */

	  }, {
	    key: '_reconnect',
	    value: function _reconnect(reset) {
	      // The sync manager will reissue any requests once it receives a 'connect' event from the websocket manager.
	      // There is no need to have an error callback at this time.
	      // Note that calls that come from sources other than the sync manager may suffer from this.
	      // Once the websocket implements retry rather than the sync manager, we may need to enable it
	      // to trigger a callback after sufficient time.  Just delete all callbacks.
	      this.close();
	      if (reset) this._reset();
	      this.connect();
	    }

	    /**
	     * Connect to the websocket server
	     *
	     * Note that if you'd like to see how dead websockets are handled, you can try something like this:
	     *
	     * ```
	     * var WS = function WebSocket(url) {
	        this.url = url;
	        this.close = function() {};
	        this.send = function(msg) {console.log("SEND ", msg);};
	        this.addEventListener = function(name, callback) {
	          this["on" + name] = callback;
	        };
	        this.removeEventListener = function() {};
	        this.readyState = 1;
	        setTimeout(function() {this.onopen();}.bind(this), 100);
	      };
	      WS.CONNECTING = 0;
	      WS.OPEN = 1;
	      WS.CLOSING = 2;
	      WS.CLOSED = 3;
	      ```
	     *
	     * @method connect
	     * @param  {layer.SyncEvent} evt - Ignored parameter
	     */

	  }, {
	    key: 'connect',
	    value: function connect(evt) {
	      if (this.client.isDestroyed || !this.client.isOnline) return;
	      if (this._socket) return this._reconnect();

	      this._closing = false;

	      this._lastCounter = -1;

	      // Get the URL and connect to it
	      var url = this.client.websocketUrl + '/?session_token=' + this.client.sessionToken;

	      logger$3.info('Websocket Connecting');

	      // Load up our websocket component or shim
	      /* istanbul ignore next */
	      var WS = typeof WebSocket === 'undefined' ? require$$0$3.w3cwebsocket : WebSocket;

	      this._socket = new WS(url, WEBSOCKET_PROTOCOL);

	      // If its the shim, set the event hanlers
	      /* istanbul ignore if */
	      if (typeof WebSocket === 'undefined') {
	        this._socket.onmessage = this._onMessage;
	        this._socket.onclose = this._onSocketClose;
	        this._socket.onopen = this._onOpen;
	        this._socket.onerror = this._onError;
	      }

	      // If its a real websocket, add the event handlers
	      else {
	          this._socket.addEventListener('message', this._onMessage);
	          this._socket.addEventListener('close', this._onSocketClose);
	          this._socket.addEventListener('open', this._onOpen);
	          this._socket.addEventListener('error', this._onError);
	        }

	      // Trigger a failure if it takes >= 5 seconds to establish a connection
	      this._connectionFailedId = setTimeout(this._connectionFailed.bind(this), 5000);
	    }

	    /**
	     * Clears the scheduled call to _connectionFailed that is used to insure the websocket does not get stuck
	     * in CONNECTING state. This call is used after the call has completed or failed.
	     *
	     * @method _clearConnectionFailed
	     * @private
	     */

	  }, {
	    key: '_clearConnectionFailed',
	    value: function _clearConnectionFailed() {
	      if (this._connectionFailedId) {
	        clearTimeout(this._connectionFailedId);
	        this._connectionFailedId = 0;
	      }
	    }

	    /**
	     * Called after 5 seconds of entering CONNECTING state without getting an error or a connection.
	     * Calls _onError which will cause this attempt to be stopped and another connection attempt to be scheduled.
	     *
	     * @method _connectionFailed
	     * @private
	     */

	  }, {
	    key: '_connectionFailed',
	    value: function _connectionFailed() {
	      this._connectionFailedId = 0;
	      var msg = 'Websocket failed to connect to server';
	      logger$3.warn(msg);

	      // TODO: At this time there is little information on what happens when closing a websocket connection that is stuck in
	      // readyState=CONNECTING.  Does it throw an error?  Does it call the onClose or onError event handlers?
	      // Remove all event handlers so that calling close won't trigger any calls.
	      try {
	        this.isOpen = false;
	        this._removeSocketEvents();
	        if (this._socket) {
	          this._socket.close();
	          this._socket = null;
	        }
	      } catch (e) {}
	      // No-op


	      // Now we can call our error handler.
	      this._onError(new Error(msg));
	    }

	    /**
	     * The websocket connection is reporting that its now open.
	     *
	     * @method _onOpen
	     * @private
	     */

	  }, {
	    key: '_onOpen',
	    value: function _onOpen() {
	      this._clearConnectionFailed();
	      if (this._isOpen()) {
	        this._lostConnectionCount = 0;
	        this.isOpen = true;
	        this.trigger('connected');
	        logger$3.debug('Websocket Connected');
	        if (this._hasCounter && this._lastTimestamp) {
	          this.resync(this._lastTimestamp);
	        } else {
	          this._enablePresence();
	          this._reschedulePing();
	        }
	      }
	    }

	    /**
	     * Tests to see if the websocket connection is open.  Use the isOpen property
	     * for external tests.
	     * @method _isOpen
	     * @private
	     * @returns {Boolean}
	     */

	  }, {
	    key: '_isOpen',
	    value: function _isOpen() {
	      if (!this._socket) return false;
	      /* istanbul ignore if */
	      if (typeof WebSocket === 'undefined') return true;
	      return this._socket && this._socket.readyState === WebSocket.OPEN;
	    }

	    /**
	     * If not isOpen, presumably failed to connect
	     * Any other error can be ignored... if the connection has
	     * failed, onClose will handle it.
	     *
	     * @method _onError
	     * @private
	     * @param  {Error} err - Websocket error
	     */

	  }, {
	    key: '_onError',
	    value: function _onError(err) {
	      if (this._closing) return;
	      this._clearConnectionFailed();
	      logger$3.debug('Websocket Error causing websocket to close', err);
	      if (!this.isOpen) {
	        this._removeSocketEvents();
	        this._lostConnectionCount++;
	        this._scheduleReconnect();
	      } else {
	        this._onSocketClose();
	        this._socket.close();
	        this._socket = null;
	      }
	    }

	    /**
	     * Shortcut method for sending a signal
	     *
	     *    manager.sendSignal({
	            'type': 'typing_indicator',
	            'object': {
	              'id': this.conversation.id
	            },
	            'data': {
	              'action': state
	            }
	          });
	     *
	     * @method sendSignal
	     * @param  {Object} body - Signal body
	     */

	  }, {
	    key: 'sendSignal',
	    value: function sendSignal(body) {
	      if (this._isOpen()) {
	        this._socket.send(JSON.stringify({
	          type: 'signal',
	          body: body
	        }));
	      }
	    }

	    /**
	     * Shortcut to sending a Counter.read request
	     *
	     * @method getCounter
	     * @param  {Function} callback
	     * @param {boolean} callback.success
	     * @param {number} callback.lastCounter
	     * @param {number} callback.newCounter
	     */

	  }, {
	    key: 'getCounter',
	    value: function getCounter(_callback) {
	      var _this2 = this;

	      var tooSoon = Date.now() - this._lastGetCounterRequest < 1000;
	      if (tooSoon) {
	        if (!this._lastGetCounterId) {
	          this._lastGetCounterId = setTimeout(function () {
	            _this2._lastGetCounterId = 0;
	            _this2.getCounter(_callback);
	          }, Date.now() - this._lastGetCounterRequest - 1000);
	        }
	        return;
	      }
	      this._lastGetCounterRequest = Date.now();
	      if (this._lastGetCounterId) {
	        clearTimeout(this._lastGetCounterId);
	        this._lastGetCounterId = 0;
	      }

	      logger$3.debug('Websocket request: getCounter');
	      this.client.socketRequestManager.sendRequest({
	        data: {
	          method: 'Counter.read'
	        },
	        callback: function callback(result) {
	          logger$3.debug('Websocket response: getCounter ' + result.data.counter);
	          if (_callback) {
	            if (result.success) {
	              _callback(true, result.data.counter, result.fullData.counter);
	            } else {
	              _callback(false);
	            }
	          }
	        },
	        isChangesArray: false
	      });
	    }

	    /**
	     * Replays all missed change packets since the specified timestamp
	     *
	     * @method resync
	     * @param  {string|number}   timestamp - Iso formatted date string; if number will be transformed into formatted date string.
	     * @param  {Function} [callback] - Optional callback for completion
	     */

	  }, {
	    key: 'resync',
	    value: function resync(timestamp, callback) {
	      var _this3 = this;

	      if (!timestamp) throw new Error(LayerError$3.dictionary.valueNotSupported);
	      if (typeof timestamp === 'number') timestamp = new Date(timestamp).toISOString();

	      // Cancel any prior operation; presumably we lost connection and they're dead anyways,
	      // but the callback triggering on these could be disruptive.
	      this.client.socketRequestManager.cancelOperation('Event.replay');
	      this.client.socketRequestManager.cancelOperation('Presence.sync');
	      this._replayEvents(timestamp, function () {
	        _this3._enablePresence(timestamp, function () {
	          _this3.trigger('synced');
	          if (callback) callback();
	        });
	      });
	    }

	    /**
	     * Replays all missed change packets since the specified timestamp
	     *
	     * @method _replayEvents
	     * @private
	     * @param  {string|number}   timestamp - Iso formatted date string; if number will be transformed into formatted date string.
	     * @param  {Function} [callback] - Optional callback for completion
	     */

	  }, {
	    key: '_replayEvents',
	    value: function _replayEvents(timestamp, _callback2) {
	      var _this4 = this;

	      // If we are simply unable to replay because we're disconnected, capture the _needsReplayFrom
	      if (!this._isOpen() && !this._needsReplayFrom) {
	        logger$3.debug('Websocket request: _replayEvents updating _needsReplayFrom');
	        this._needsReplayFrom = timestamp;
	      } else {
	        logger$3.info('Websocket request: _replayEvents');
	        this.client.socketRequestManager.sendRequest({
	          data: {
	            method: 'Event.replay',
	            data: {
	              from_timestamp: timestamp
	            }
	          },
	          callback: function callback(result) {
	            return _this4._replayEventsComplete(timestamp, _callback2, result.success);
	          },
	          isChangesArray: false
	        });
	      }
	    }

	    /**
	     * Callback for handling completion of replay.
	     *
	     * @method _replayEventsComplete
	     * @private
	     * @param  {Date}     timestamp
	     * @param  {Function} callback
	     * @param  {Boolean}   success
	     */

	  }, {
	    key: '_replayEventsComplete',
	    value: function _replayEventsComplete(timestamp, callback, success) {
	      var _this5 = this;

	      if (success) {
	        this._replayRetryCount = 0;

	        // If replay was completed, and no other requests for replay, then we're done.
	        if (!this._needsReplayFrom) {
	          logger$3.info('Websocket replay complete');
	          if (callback) callback();
	        }

	        // If replayEvents was called during a replay, then replay
	        // from the given timestamp.  If request failed, then we need to retry from _lastTimestamp
	        else if (this._needsReplayFrom) {
	            logger$3.info('Websocket replay partially complete');
	            var t = this._needsReplayFrom;
	            this._needsReplayFrom = null;
	            this._replayEvents(t);
	          }
	      }

	      // We never got a done event; but either got an error from the server or the request timed out.
	      // Use exponential backoff incremented integers that getExponentialBackoffSeconds mapping to roughly
	      // 0.4 seconds - 12.8 seconds, and then stops retrying.
	      else if (this._replayRetryCount < 8) {
	          var maxDelay = 20;
	          var delay = Utils$1.getExponentialBackoffSeconds(maxDelay, Math.min(15, this._replayRetryCount + 2));
	          logger$3.info('Websocket replay retry in ' + delay + ' seconds');
	          setTimeout(function () {
	            return _this5._replayEvents(timestamp);
	          }, delay * 1000);
	          this._replayRetryCount++;
	        } else {
	          logger$3.error('Websocket Event.replay has failed');
	        }
	    }

	    /**
	     * Resubscribe to presence and replay missed presence changes.
	     *
	     * @method _enablePresence
	     * @private
	     * @param  {Date}     timestamp
	     * @param  {Function} callback
	     */

	  }, {
	    key: '_enablePresence',
	    value: function _enablePresence(timestamp, callback) {
	      this.client.socketRequestManager.sendRequest({
	        data: {
	          method: 'Presence.subscribe'
	        },
	        callback: null,
	        isChangesArray: false
	      });

	      if (this.client.isPresenceEnabled) {
	        this.client.socketRequestManager.sendRequest({
	          data: {
	            method: 'Presence.update',
	            data: [{ operation: 'set', property: 'status', value: 'auto' }]
	          },
	          callback: null,
	          isChangesArray: false
	        });
	      }

	      if (timestamp) {
	        this.syncPresence(timestamp, callback);
	      } else if (callback) {
	        callback({ success: true });
	      }
	    }

	    /**
	     * Synchronize all presence data or catch up on missed presence data.
	     *
	     * Typically this is called by layer.Websockets.SocketManager._enablePresence automatically,
	     * but there may be occasions where an app wants to directly trigger this action.
	     *
	     * @method syncPresence
	     * @param {String} timestamp    `Date.toISOString()` formatted string, returns all presence changes since that timestamp.  Returns all followed presence
	     *       if no timestamp is provided.
	     * @param {Function} [callback]   Function to call when sync is completed.
	     */

	  }, {
	    key: 'syncPresence',
	    value: function syncPresence(timestamp, callback) {
	      if (timestamp) {
	        // Return value for use in unit tests
	        return this.client.socketRequestManager.sendRequest({
	          data: {
	            method: 'Presence.sync',
	            data: {
	              since: timestamp
	            }
	          },
	          isChangesArray: true,
	          callback: callback
	        });
	      }
	    }

	    /**
	     * Handles a new websocket packet from the server
	     *
	     * @method _onMessage
	     * @private
	     * @param  {Object} evt - Message from the server
	     */

	  }, {
	    key: '_onMessage',
	    value: function _onMessage(evt) {
	      this._lostConnectionCount = 0;
	      try {
	        var msg = JSON.parse(evt.data);
	        var skippedCounter = this._lastCounter + 1 !== msg.counter;
	        this._hasCounter = true;
	        this._lastCounter = msg.counter;
	        this._lastDataFromServerTimestamp = Date.now();

	        // If we've missed a counter, replay to get; note that we had to update _lastCounter
	        // for replayEvents to work correctly.
	        if (skippedCounter) {
	          this.resync(this._lastTimestamp);
	        } else {
	          this._lastTimestamp = new Date(msg.timestamp).getTime();
	        }

	        this.trigger('message', {
	          data: msg
	        });

	        this._reschedulePing();
	      } catch (err) {
	        logger$3.error('Layer-Websocket: Failed to handle websocket message: ' + err + '\n', evt.data);
	      }
	    }

	    /**
	     * Reschedule a ping request which helps us verify that the connection is still alive,
	     * and that we haven't missed any events.
	     *
	     * @method _reschedulePing
	     * @private
	     */

	  }, {
	    key: '_reschedulePing',
	    value: function _reschedulePing() {
	      if (this._nextPingId) {
	        clearTimeout(this._nextPingId);
	      }
	      this._nextPingId = setTimeout(this._ping.bind(this), this.pingFrequency);
	    }

	    /**
	     * Send a counter request to the server to verify that we are still connected and
	     * have not missed any events.
	     *
	     * @method _ping
	     * @private
	     */

	  }, {
	    key: '_ping',
	    value: function _ping() {
	      logger$3.debug('Websocket ping');
	      this._nextPingId = 0;
	      if (this._isOpen()) {
	        // NOTE: onMessage will already have called reschedulePing, but if there was no response, then the error handler would NOT have called it.
	        this.getCounter(this._reschedulePing.bind(this));
	      }
	    }

	    /**
	     * Close the websocket.
	     *
	     * @method close
	     */

	  }, {
	    key: 'close',
	    value: function close() {
	      logger$3.debug('Websocket close requested');
	      this._closing = true;
	      this.isOpen = false;
	      if (this._socket) {
	        // Close all event handlers and set socket to null
	        // without waiting for browser event to call
	        // _onSocketClose as the next command after close
	        // might require creating a new socket
	        this._onSocketClose();
	        this._socket.close();
	        this._socket = null;
	      }
	    }

	    /**
	     * Send a packet across the websocket
	     * @method send
	     * @param {Object} obj
	     */

	  }, {
	    key: 'send',
	    value: function send(obj) {
	      this._socket.send(JSON.stringify(obj));
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this.close();
	      if (this._nextPingId) clearTimeout(this._nextPingId);
	      _get$1(SocketManager.prototype.__proto__ || Object.getPrototypeOf(SocketManager.prototype), 'destroy', this).call(this);
	    }

	    /**
	     * If the socket has closed (or if the close method forces it closed)
	     * Remove all event handlers and if appropriate, schedule a retry.
	     *
	     * @method _onSocketClose
	     * @private
	     */

	  }, {
	    key: '_onSocketClose',
	    value: function _onSocketClose() {
	      logger$3.debug('Websocket closed');
	      this.isOpen = false;
	      if (!this._closing) {
	        this._scheduleReconnect();
	      }

	      this._removeSocketEvents();
	      this.trigger('disconnected');
	    }

	    /**
	     * Removes all event handlers on the current socket.
	     *
	     * @method _removeSocketEvents
	     * @private
	     */

	  }, {
	    key: '_removeSocketEvents',
	    value: function _removeSocketEvents() {
	      /* istanbul ignore if */
	      if (typeof WebSocket !== 'undefined' && this._socket) {
	        this._socket.removeEventListener('message', this._onMessage);
	        this._socket.removeEventListener('close', this._onSocketClose);
	        this._socket.removeEventListener('open', this._onOpen);
	        this._socket.removeEventListener('error', this._onError);
	      } else if (this._socket) {
	        this._socket.onmessage = null;
	        this._socket.onclose = null;
	        this._socket.onopen = null;
	        this._socket.onerror = null;
	      }
	      this._clearConnectionFailed();
	    }

	    /**
	     * Schedule an attempt to reconnect to the server.  If the onlineManager
	     * declares us to be offline, don't bother reconnecting.  A reconnect
	     * attempt will be triggered as soon as the online manager reports we are online again.
	     *
	     * Note that the duration of our delay can not excede the onlineManager's ping frequency
	     * or it will declare us to be offline while we attempt a reconnect.
	     *
	     * @method _scheduleReconnect
	     * @private
	     */

	  }, {
	    key: '_scheduleReconnect',
	    value: function _scheduleReconnect() {
	      var _this6 = this;

	      if (this.isDestroyed || !this.client.isOnline || !this.client.isAuthenticated) return;

	      var delay = Utils$1.getExponentialBackoffSeconds(this.maxDelaySecondsBetweenReconnect, Math.min(15, this._lostConnectionCount));
	      logger$3.debug('Websocket Reconnect in ' + delay + ' seconds');
	      if (!this._reconnectId) {
	        this._reconnectId = setTimeout(function () {
	          _this6._reconnectId = 0;
	          _this6._validateSessionBeforeReconnect();
	        }, delay * 1000);
	      }
	    }

	    /**
	     * Before the scheduled reconnect can call `connect()` validate that we didn't lose the websocket
	     * due to loss of authentication.
	     *
	     * @method _validateSessionBeforeReconnect
	     * @private
	     */

	  }, {
	    key: '_validateSessionBeforeReconnect',
	    value: function _validateSessionBeforeReconnect() {
	      var _this7 = this;

	      if (this.isDestroyed || !this.client.isOnline || !this.client.isAuthenticated) return;

	      var maxDelay = this.maxDelaySecondsBetweenReconnect * 1000;
	      var diff = Date.now() - this._lastValidateSessionRequest - maxDelay;
	      if (diff < 0) {
	        // This is identical to whats in _scheduleReconnect and could be cleaner
	        if (!this._reconnectId) {
	          this._reconnectId = setTimeout(function () {
	            _this7._reconnectId = 0;
	            _this7._validateSessionBeforeReconnect();
	          }, Math.abs(diff) + 1000);
	        }
	      } else {
	        this._lastValidateSessionRequest = Date.now();
	        this.client.xhr({
	          url: '/?action=validateConnectionForWebsocket&client=' + this.client.constructor.version,
	          method: 'GET',
	          sync: false
	        }, function (result) {
	          if (result.success) _this7.connect();
	          if (result.status === 401) {
	            // client-authenticator.js captures this state and handles it; `connect()` will be called once reauthentication completes
	          } else {
	            _this7._scheduleReconnect();
	          }
	        });
	      }
	    }
	  }]);

	  return SocketManager;
	}(Root$3);

	/**
	 * Is the websocket connection currently open?
	 * @type {Boolean}
	 */


	SocketManager$1.prototype.isOpen = false;

	/**
	 * setTimeout ID for calling connect()
	 * @private
	 * @type {Number}
	 */
	SocketManager$1.prototype._reconnectId = 0;

	/**
	 * setTimeout ID for calling _connectionFailed()
	 * @private
	 * @type {Number}
	 */
	SocketManager$1.prototype._connectionFailedId = 0;

	SocketManager$1.prototype._lastTimestamp = 0;
	SocketManager$1.prototype._lastDataFromServerTimestamp = 0;
	SocketManager$1.prototype._lastCounter = null;
	SocketManager$1.prototype._hasCounter = false;

	SocketManager$1.prototype._needsReplayFrom = null;

	SocketManager$1.prototype._replayRetryCount = 0;

	SocketManager$1.prototype._lastGetCounterRequest = 0;
	SocketManager$1.prototype._lastGetCounterId = 0;

	/**
	 * Time in miliseconds since the last call to _validateSessionBeforeReconnect
	 * @type {Number}
	 */
	SocketManager$1.prototype._lastValidateSessionRequest = 0;

	/**
	 * Frequency with which the websocket checks to see if any websocket notifications
	 * have been missed.  This test is done by calling `getCounter`
	 *
	 * @type {Number}
	 */
	SocketManager$1.prototype.pingFrequency = 30000;

	/**
	 * Delay between reconnect attempts
	 *
	 * @type {Number}
	 */
	SocketManager$1.prototype.maxDelaySecondsBetweenReconnect = 30;

	/**
	 * The Client that owns this.
	 * @type {layer.Client}
	 */
	SocketManager$1.prototype.client = null;

	/**
	 * The Socket Connection instance
	 * @type {Websocket}
	 */
	SocketManager$1.prototype._socket = null;

	/**
	 * Is the websocket connection being closed by a call to close()?
	 * If so, we can ignore any errors that signal the socket as closing.
	 * @type {Boolean}
	 */
	SocketManager$1.prototype._closing = false;

	/**
	 * Number of failed attempts to reconnect.
	 * @type {Number}
	 */
	SocketManager$1.prototype._lostConnectionCount = 0;

	SocketManager$1._supportedEvents = [
	/**
	 * A data packet has been received from the server.
	 * @event message
	 * @param {layer.LayerEvent} layerEvent
	 * @param {Object} layerEvent.data - The data that was received from the server
	 */
	'message',

	/**
	 * The websocket is now connected.
	 * @event connected
	 * @protected
	 */
	'connected',

	/**
	 * The websocket is no longer connected
	 * @event disconnected
	 * @protected
	 */
	'disconnected',

	/**
	 * Websocket events were missed; we are resyncing with the server
	 * @event replay-begun
	 */
	'syncing',

	/**
	 * Websocket events were missed; we resynced with the server and are now done
	 * @event replay-begun
	 */
	'synced'].concat(Root$3._supportedEvents);
	Root$3.initClass.apply(SocketManager$1, [SocketManager$1, 'SocketManager']);
	var socketManager = SocketManager$1;

	/**
	 * Allows all components to have a clientId instead of a client pointer.
	 * Allows an app to have multiple Clients, each with its own appId.
	 * Provides a global utility that can be required by all modules for accessing
	 * the client.
	 *
	 * @class  layer.ClientRegistry
	 * @private
	 */

	var registry = {};
	var listeners = [];

	var _require$3 = clientUtils;
	var defer$3 = _require$3.defer;
	/**
	 * Register a new Client; will destroy any previous client with the same appId.
	 *
	 * @method register
	 * @param  {layer.Client} client
	 */


	function register(client) {
	  var appId = client.appId;
	  if (registry[appId] && !registry[appId].isDestroyed) {
	    registry[appId].destroy();
	  }
	  registry[appId] = client;

	  defer$3(function () {
	    return listeners.forEach(function (listener) {
	      return listener(client);
	    });
	  });
	}

	/**
	 * Removes a Client.
	 *
	 * @method unregister
	 * @param  {layer.Client} client
	 */
	function unregister(client) {
	  if (registry[client.appId]) delete registry[client.appId];
	}

	/**
	 * Get a Client by appId
	 *
	 * @method get
	 * @param  {string} appId
	 * @return {layer.Client}
	 */
	function get(appId) {
	  return registry[appId] || null;
	}

	function getAll() {
	  return Object.keys(registry).map(function (key) {
	    return registry[key];
	  });
	}

	/**
	 * Register a listener to be called whenever a new client is registered.
	 *
	 * @method addListener
	 * @param {Function} listener
	 * @param {layer.Client} listener.client
	 */
	function addListener(listener) {
	  listeners.push(listener);
	}

	/**
	 * Remove a registered listener or all listeners.
	 *
	 * If called with no arguments or null arguments, removes all listeners.
	 * @method removeListener
	 * @param {Function}
	 */
	function removeListener(listener) {
	  if (listener) {
	    var index = listeners.indexOf(listener);
	    if (index >= 0) listeners.splice(index, 1);
	  } else {
	    listeners.splice(0, listeners.length);
	  }
	}

	var clientRegistry = {
	  get: get,
	  getAll: getAll,
	  register: register,
	  unregister: unregister,
	  addListener: addListener,
	  removeListener: removeListener
	};

	var _createClass$9 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$3 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$9(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$5(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$5(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Syncable abstract clas represents resources that are syncable with the server.
	 * This is currently used for Messages and Conversations.
	 * It represents the state of the object's sync, as one of:
	 *
	 *  * layer.Constants.SYNC_STATE.NEW: Newly created; local only.
	 *  * layer.Constants.SYNC_STATE.SAVING: Newly created; being sent to the server
	 *  * layer.Constants.SYNC_STATE.SYNCING: Exists on both client and server, but changes are being sent to server.
	 *  * layer.Constants.SYNC_STATE.SYNCED: Exists on both client and server and is synced.
	 *  * layer.Constants.SYNC_STATE.LOADING: Exists on server; loading it into client.
	 *
	 * @class layer.Syncable
	 * @extends layer.Root
	 * @abstract
	 */

	var Root$5 = root;

	var _require$2 = _const;
	var SYNC_STATE = _require$2.SYNC_STATE;

	var LayerError$5 = layerError;
	var ClientRegistry$1 = clientRegistry;
	var Constants$1 = _const;

	var Syncable$1 = function (_Root) {
	  _inherits$5(Syncable, _Root);

	  function Syncable() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$9(this, Syncable);

	    var _this = _possibleConstructorReturn$5(this, (Syncable.__proto__ || Object.getPrototypeOf(Syncable)).call(this, options));

	    _this.localCreatedAt = new Date();
	    return _this;
	  }

	  /**
	   * Get the client associated with this Object.
	   *
	   * @method getClient
	   * @return {layer.Client}
	   */


	  _createClass$9(Syncable, [{
	    key: 'getClient',
	    value: function getClient() {
	      return ClientRegistry$1.get(this.clientId);
	    }

	    /**
	     * Fire an XHR request using the URL for this resource.
	     *
	     * For more info on xhr method parameters see {@link layer.ClientAuthenticator#xhr}
	     *
	     * @method _xhr
	     * @protected
	     * @return {layer.Syncable} this
	     */

	  }, {
	    key: '_xhr',
	    value: function _xhr(options, callback) {
	      var _this2 = this;

	      // initialize
	      if (!options.url) options.url = '';
	      if (!options.method) options.method = 'GET';
	      var client = this.getClient();

	      // Validatation
	      if (this.isDestroyed) throw new Error(LayerError$5.dictionary.isDestroyed);
	      if (!client) throw new Error(LayerError$5.dictionary.clientMissing);
	      if (!this.constructor.enableOpsIfNew && options.method !== 'POST' && options.method !== 'GET' && this.syncState === Constants$1.SYNC_STATE.NEW) return this;

	      if (!options.url.match(/^http(s):\/\//)) {
	        if (options.url && !options.url.match(/^(\/|\?)/)) options.url = '/' + options.url;
	        if (!options.sync) options.url = this.url + options.url;
	      }

	      // Setup sync structure
	      options.sync = this._setupSyncObject(options.sync);

	      if (options.method !== 'GET') {
	        this._setSyncing();
	      }

	      client.xhr(options, function (result) {
	        if (result.success && options.method !== 'GET' && !_this2.isDestroyed) {
	          _this2._setSynced();
	        }
	        if (callback) callback(result);
	      });
	      return this;
	    }

	    /**
	     * Setup an object to pass in the `sync` parameter for any sync requests.
	     *
	     * @method _setupSyncObject
	     * @private
	     * @param {Object} sync - Known parameters of the sync object to be returned; or null.
	     * @return {Object} fleshed out sync object
	     */

	  }, {
	    key: '_setupSyncObject',
	    value: function _setupSyncObject(sync) {
	      if (sync !== false) {
	        if (!sync) sync = {};
	        if (!sync.target) sync.target = this.id;
	      }
	      return sync;
	    }

	    /**
	     * A websocket event has been received specifying that this resource
	     * has been deleted.
	     *
	     * @method handleWebsocketDelete
	     * @protected
	     * @param {Object} data
	     */

	  }, {
	    key: '_handleWebsocketDelete',
	    value: function _handleWebsocketDelete(data) {
	      this._deleted();
	      this.destroy();
	    }

	    /**
	     * The Object has been deleted.
	     *
	     * Destroy must be called separately, and handles most cleanup.
	     *
	     * @method _deleted
	     * @protected
	     */

	  }, {
	    key: '_deleted',
	    value: function _deleted() {
	      this.trigger(this.constructor.eventPrefix + ':delete');
	    }

	    /**
	     * Load the resource identified via a Layer ID.
	     *
	     * Will load the requested resource from persistence or server as needed,
	     * and trigger `type-name:loaded` when its loaded.  Instance returned by this
	     * method will have only ID and URL properties, all others are unset until
	     * the `conversations:loaded`, `messages:loaded`, etc... event has fired.
	     *
	     * ```
	     * var message = layer.Message.load(messageId, client);
	     * message.once('messages:loaded', function(evt) {
	     *    alert("Message loaded");
	     * });
	     * ```
	     *
	     * @method load
	     * @static
	     * @param {string} id - `layer:///messages/UUID`
	     * @param {layer.Client} client
	     * @return {layer.Syncable} - Returns an empty object that will be populated once data is loaded.
	     */

	  }, {
	    key: '_load',


	    /**
	     * Load this resource from the server.
	     *
	     * Called from the static layer.Syncable.load() method
	     *
	     * @method _load
	     * @private
	     */
	    value: function _load() {
	      var _this3 = this;

	      this.syncState = SYNC_STATE.LOADING;
	      this._xhr({
	        method: 'GET',
	        sync: false
	      }, function (result) {
	        return _this3._loadResult(result);
	      });
	    }
	  }, {
	    key: '_loadResult',
	    value: function _loadResult(result) {
	      var _this4 = this;

	      if (this.isDestroyed) return;
	      var prefix = this.constructor.eventPrefix;
	      if (!result.success) {
	        this.syncState = SYNC_STATE.NEW;
	        this._triggerAsync(prefix + ':loaded-error', { error: result.data });
	        setTimeout(function () {
	          if (!_this4.isDestroyed) _this4.destroy();
	        }, 100); // Insure destroyed AFTER loaded-error event has triggered
	      } else {
	        this._populateFromServer(result.data);
	        this._loaded(result.data);
	        this.trigger(prefix + ':loaded');
	      }
	    }

	    /**
	     * Processing the result of a _load() call.
	     *
	     * Typically used to register the object and cleanup any properties not handled by _populateFromServer.
	     *
	     * @method _loaded
	     * @private
	     * @param  {Object} data - Response data from server
	     */

	  }, {
	    key: '_loaded',
	    value: function _loaded(data) {}

	    /**
	     * Object is new, and is queued for syncing, but does not yet exist on the server.
	     *
	     * That means it is currently out of sync with the server.
	     *
	     * @method _setSyncing
	     * @private
	     */

	  }, {
	    key: '_setSyncing',
	    value: function _setSyncing() {
	      this._clearObject();
	      switch (this.syncState) {
	        case SYNC_STATE.SYNCED:
	          this.syncState = SYNC_STATE.SYNCING;
	          break;
	        case SYNC_STATE.NEW:
	          this.syncState = SYNC_STATE.SAVING;
	          break;
	      }
	      this._syncCounter++;
	    }

	    /**
	     * Object is synced with the server and up to date.
	     *
	     * @method _setSynced
	     * @private
	     */

	  }, {
	    key: '_setSynced',
	    value: function _setSynced() {
	      this._clearObject();
	      if (this._syncCounter > 0) this._syncCounter--;

	      this.syncState = this._syncCounter === 0 ? SYNC_STATE.SYNCED : SYNC_STATE.SYNCING;
	      this.isSending = false;
	    }

	    /**
	     * Any time the instance changes, we should clear the cached toObject value
	     *
	     * @method _clearObject
	     * @private
	     */

	  }, {
	    key: '_clearObject',
	    value: function _clearObject() {
	      this._toObject = null;
	    }

	    /**
	     * Returns a plain object.
	     *
	     * Object will have all the same public properties as this
	     * Syncable instance.  New object is returned any time
	     * any of this object's properties change.
	     *
	     * @method toObject
	     * @return {Object} POJO version of this object.
	     */

	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      if (!this._toObject) {
	        this._toObject = _get$3(Syncable.prototype.__proto__ || Object.getPrototypeOf(Syncable.prototype), 'toObject', this).call(this);
	        this._toObject.isNew = this.isNew();
	        this._toObject.isSaving = this.isSaving();
	        this._toObject.isSaved = this.isSaved();
	        this._toObject.isSynced = this.isSynced();
	      }
	      return this._toObject;
	    }

	    /**
	     * Object is new, and is not yet queued for syncing
	     *
	     * @method isNew
	     * @returns {boolean}
	     */

	  }, {
	    key: 'isNew',
	    value: function isNew() {
	      return this.syncState === SYNC_STATE.NEW;
	    }

	    /**
	     * Object is new, and is queued for syncing
	     *
	     * @method isSaving
	     * @returns {boolean}
	     */

	  }, {
	    key: 'isSaving',
	    value: function isSaving() {
	      return this.syncState === SYNC_STATE.SAVING;
	    }

	    /**
	     * Object exists on server.
	     *
	     * @method isSaved
	     * @returns {boolean}
	     */

	  }, {
	    key: 'isSaved',
	    value: function isSaved() {
	      return !(this.isNew() || this.isSaving());
	    }

	    /**
	     * Object is fully synced.
	     *
	     * As best we know, server and client have the same values.
	     *
	     * @method isSynced
	     * @returns {boolean}
	     */

	  }, {
	    key: 'isSynced',
	    value: function isSynced() {
	      return this.syncState === SYNC_STATE.SYNCED;
	    }
	  }], [{
	    key: 'load',
	    value: function load(id, client) {
	      if (!client || !(client instanceof Root$5)) throw new Error(LayerError$5.dictionary.clientMissing);

	      var obj = {
	        id: id,
	        url: client.url + id.substring(8),
	        clientId: client.appId
	      };

	      if (!Syncable.sortedSubclasses) {
	        Syncable.sortedSubclasses = Syncable.subclasses.filter(function (item) {
	          return item.prefixUUID;
	        }).sort(function (a, b) {
	          return a.prefixUUID.length - b.prefixUUID.length;
	        });
	      }

	      var ConstructorClass = Syncable.sortedSubclasses.filter(function (aClass) {
	        if (aClass.prefixUUID.indexOf('layer:///') === 0) {
	          return obj.id.indexOf(aClass.prefixUUID) === 0;
	        } else {
	          return obj.id.indexOf(aClass.prefixUUID) !== -1;
	        }
	      })[0];
	      var syncItem = new ConstructorClass(obj);
	      var typeName = ConstructorClass.eventPrefix;

	      if (typeName) {
	        if (!client.dbManager) {
	          syncItem.syncState = SYNC_STATE.LOADING;
	          client.once('ready', function () {
	            return syncItem._load();
	          });
	        } else {
	          client.dbManager.getObject(typeName, id, function (item) {
	            if (syncItem.isDestroyed) return;
	            if (item) {
	              syncItem._populateFromServer(item);
	              syncItem.trigger(typeName + ':loaded');
	            } else if (!client.isReady) {
	              syncItem.syncState = SYNC_STATE.LOADING;
	              client.once('ready', function () {
	                return syncItem._load();
	              });
	            } else {
	              syncItem._load();
	            }
	          });
	        }
	      } else {
	        syncItem._load();
	      }

	      syncItem.syncState = SYNC_STATE.LOADING;
	      return syncItem;
	    }
	  }]);

	  return Syncable;
	}(Root$5);

	/**
	 * Unique identifier.
	 *
	 * @type {string}
	 */


	Syncable$1.prototype.id = '';

	/**
	 * URL to access the object on the server.
	 *
	 * @type {string}
	 * @readonly
	 * @protected
	 */
	Syncable$1.prototype.url = '';

	/**
	 * The time that this client created this instance.
	 *
	 * This value is not tied to when it was first created on the server.  Creating a new instance
	 * based on server data will result in a new `localCreateAt` value.
	 *
	 * @type {Date}
	 */
	Syncable$1.prototype.localCreatedAt = null;

	/**
	 * layer.Client that the object belongs to.
	 *
	 * Actual value of this string matches the appId.
	 * @type {string}
	 * @protected
	 * @readonly
	 */
	Syncable$1.prototype.clientId = '';

	/**
	 * Temporary property indicating that the instance was loaded from local database rather than server.
	 *
	 * @type {boolean}
	 * @private
	 */
	Syncable$1.prototype._fromDB = false;

	/**
	 * The current sync state of this object.
	 *
	 * Possible values are:
	 *
	 *  * layer.Constants.SYNC_STATE.NEW: Newly created; local only.
	 *  * layer.Constants.SYNC_STATE.SAVING: Newly created; being sent to the server
	 *  * layer.Constants.SYNC_STATE.SYNCING: Exists on both client and server, but changes are being sent to server.
	 *  * layer.Constants.SYNC_STATE.SYNCED: Exists on both client and server and is synced.
	 *  * layer.Constants.SYNC_STATE.LOADING: Exists on server; loading it into client.
	 *
	 * @type {string}
	 */
	Syncable$1.prototype.syncState = SYNC_STATE.NEW;

	/**
	 * Number of sync requests that have been requested.
	 *
	 * Counts down to zero; once it reaches zero, all sync
	 * requests have been completed.
	 *
	 * @type {Number}
	 * @private
	 */
	Syncable$1.prototype._syncCounter = 0;

	/**
	 * Prefix to use when triggering events
	 * @private
	 * @static
	 */
	Syncable$1.eventPrefix = '';

	Syncable$1.enableOpsIfNew = false;

	/**
	 * Is the object loading from the server?
	 *
	 * @type {boolean}
	 */
	Object.defineProperty(Syncable$1.prototype, 'isLoading', {
	  enumerable: true,
	  get: function get() {
	    return this.syncState === SYNC_STATE.LOADING;
	  }
	});

	/**
	 * Array of classes that are subclasses of Syncable.
	 *
	 * Used by Factory function.
	 * @private
	 */
	Syncable$1.subclasses = [];

	Syncable$1._supportedEvents = [].concat(Root$5._supportedEvents);
	Syncable$1.inObjectIgnore = Root$5.inObjectIgnore;
	var syncable = Syncable$1;

	var _createClass$11 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$11(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$7(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$7(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Content class represents Rich Content.
	 *
	 * Note that instances of this class will automatically be
	 * generated for developers based on whether their message parts
	 * require it.
	 *
	 * That means for the most part, you should never need to
	 * instantiate one of these directly.
	 *
	 *      var content = new layer.Content({
	 *          id: 'layer:///content/8c839735-5f95-439a-a867-30903c0133f2'
	 *      });
	 *
	 * @class  layer.Content
	 * @private
	 * @extends layer.Root
	 * @author Michael Kantor
	 */

	var Root$7 = root;
	var xhr$4 = xhr$1;

	var Content$1 = function (_Root) {
	  _inherits$7(Content, _Root);

	  /**
	   * Constructor
	   *
	   * @method constructor
	   * @param  {Object} options
	   * @param  {string} options.id - Identifier for the content
	   * @param  {string} [options.downloadUrl=null] - Url to download the content from
	   * @param  {Date} [options.expiration] - Expiration date for the url
	   * @param  {string} [options.refreshUrl] - Url to access to get a new downloadUrl after it has expired
	   *
	   * @return {layer.Content}
	   */
	  function Content(options) {
	    _classCallCheck$11(this, Content);

	    if (typeof options === 'string') {
	      options = { id: options };
	    }
	    return _possibleConstructorReturn$7(this, (Content.__proto__ || Object.getPrototypeOf(Content)).call(this, options));
	  }

	  /**
	   * Loads the data from google's cloud storage.
	   *
	   * Data is provided via callback.
	   *
	   * Note that typically one should use layer.MessagePart.fetchContent() rather than layer.Content.loadContent()
	   *
	   * @method loadContent
	   * @param {string} mimeType - Mime type for the Blob
	   * @param {Function} callback
	   * @param {Blob} callback.data - A Blob instance representing the data downloaded.  If Blob object is not available, then may use other format.
	   */


	  _createClass$11(Content, [{
	    key: 'loadContent',
	    value: function loadContent(mimeType, callback) {
	      xhr$4({
	        url: this.downloadUrl,
	        responseType: 'arraybuffer'
	      }, function (result) {
	        if (result.success) {
	          if (typeof Blob !== 'undefined') {
	            var blob = new Blob([result.data], { type: mimeType });
	            callback(null, blob);
	          } else {
	            // If the blob class isn't defined (nodejs) then just return the result as is
	            callback(null, result.data);
	          }
	        } else {
	          callback(result.data, null);
	        }
	      });
	    }

	    /**
	     * Refreshes the URL, which updates the URL and resets the expiration time for the URL
	     *
	     * @method refreshContent
	     * @param {layer.Client} client
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'refreshContent',
	    value: function refreshContent(client, callback) {
	      var _this2 = this;

	      client.xhr({
	        url: this.refreshUrl,
	        method: 'GET',
	        sync: false
	      }, function (result) {
	        var data = result.data;

	        _this2.expiration = new Date(data.expiration);
	        _this2.downloadUrl = data.download_url;
	        if (callback) callback(_this2.downloadUrl);
	      });
	    }

	    /**
	     * Is the download url expired or about to expire?
	     * We can't be sure of the state of the device's internal clock,
	     * so if its within 10 minutes of expiring, just treat it as expired.
	     *
	     * @method isExpired
	     * @returns {Boolean}
	     */

	  }, {
	    key: 'isExpired',
	    value: function isExpired() {
	      var expirationLeeway = 10 * 60 * 1000;
	      return this.expiration.getTime() - expirationLeeway < Date.now();
	    }

	    /**
	     * Creates a MessagePart from a server representation of the part
	     *
	     * @method _createFromServer
	     * @private
	     * @static
	     * @param  {Object} part - Server representation of a part
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(part) {
	      return new Content({
	        id: part.id,
	        downloadUrl: part.download_url,
	        expiration: new Date(part.expiration),
	        refreshUrl: part.refresh_url
	      });
	    }
	  }]);

	  return Content;
	}(Root$7);

	/**
	 * Server generated identifier
	 * @type {string}
	 */


	Content$1.prototype.id = '';

	Content$1.prototype.blob = null;

	/**
	 * Server generated url for downloading the content
	 * @type {string}
	 */
	Content$1.prototype.downloadUrl = '';

	/**
	 * Url for refreshing the downloadUrl after it has expired
	 * @type {string}
	 */
	Content$1.prototype.refreshUrl = '';

	/**
	 * Size of the content.
	 *
	 * This property only has a value when in the process
	 * of Creating the rich content and sending the Message.
	 *
	 * @type {number}
	 */
	Content$1.prototype.size = 0;

	/**
	 * Expiration date for the downloadUrl
	 * @type {Date}
	 */
	Content$1.prototype.expiration = null;

	Root$7.initClass.apply(Content$1, [Content$1, 'Content']);
	var content = Content$1;

	var _createClass$10 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$4 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$10(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$6(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$6(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The MessagePart class represents an element of a message.
	 *
	 *      // Create a Message Part with any mimeType
	 *      var part = new layer.MessagePart({
	 *          body: "hello",
	 *          mimeType: "text/plain"
	 *      });
	 *
	 *      // Create a text/plain only Message Part
	 *      var part = new layer.MessagePart("Hello I am text/plain");
	 *
	 * You can also create a Message Part from a File Input dom node:
	 *
	 *      var fileInputNode = document.getElementById("myFileInput");
	 *      var part = new layer.MessagePart(fileInputNode.files[0]);
	 *
	 * You can also create Message Parts from a file drag and drop operation:
	 *
	 *      onFileDrop: function(evt) {
	 *           var files = evt.dataTransfer.files;
	 *           var m = conversation.createMessage({
	 *               parts: files.map(function(file) {
	 *                  return new layer.MessagePart({body: file, mimeType: file.type});
	 *               }
	 *           });
	 *      });
	 *
	 * ### Blobs vs Strings
	 *
	 * You should always expect to see the `body` property be a Blob **unless** the mimeType is listed in layer.MessagePart.TextualMimeTypes,
	 * in which case the value will be a String.  You can add mimeTypes to TextualMimeTypes:
	 *
	 * ```
	 * layer.MessagePart.TextualMimeTypes = ['text/plain', 'text/mountain', /^application\/json(\+.+)$/]
	 * ```
	 *
	 * Any mimeType matching the above strings and regular expressions will be transformed to text before being delivered to your app; otherwise it
	 * must be a Blob.  Note that the above snippet sets a static property that is set once, and affects all MessagePart objects for the lifespan of
	 * the app.
	 *
	 * ### Accesing Rich Content
	 *
	 * There are two ways of accessing rich content
	 *
	 * 1. Access the data directly: `part.fetchContent(function(data) {myRenderData(data);})`. This approach downloads the data,
	 *    writes it to the the `body` property, writes a Data URI to the part's `url` property, and then calls your callback.
	 *    By downloading the data and storing it in `body`, the data does not expire.
	 * 2. Access the URL rather than the data.  When you first receive the Message Part it will have a valid `url` property; however, this URL expires.  *    URLs are needed for streaming, and for content that doesn't yet need to be rendered (e.g. hyperlinks to data that will render when clicked).
	 *    The url property will return a string if the url is valid, or '' if its expired.  Call `part.fetchStream(callback)` to get an updated URL.
	 *    The following pattern is recommended:
	 *
	 * ```
	 * if (!part.url) {
	 *   part.fetchStream(function(url) {myRenderUrl(url)});
	 * } else {
	 *   myRenderUrl(part.url);
	 * }
	 * ```
	 *
	 * NOTE: `layer.MessagePart.url` should have a value when the message is first received, and will only fail `if (!part.url)` once the url has expired.
	 *
	 * @class  layer.MessagePart
	 * @extends layer.Root
	 * @author Michael Kantor
	 */

	var Root$6 = root;
	var Content = content;
	var xhr$3 = xhr$1;
	var ClientRegistry$2 = clientRegistry;
	var LayerError$6 = layerError;
	var Util$3 = clientUtils;
	var logger$5 = logger_1;

	var MessagePart$1 = function (_Root) {
	  _inherits$6(MessagePart, _Root);

	  /**
	   * Constructor
	   *
	   * @method constructor
	   * @param  {Object} options - Can be an object with body and mimeType, or it can be a string, or a Blob/File
	   * @param  {string} options.body - Any string larger than 2kb will be sent as Rich Content, meaning it will be uploaded to cloud storage and must be separately downloaded from the Message when its received.
	   * @param  {string} [options.mimeType=text/plain] - Mime type; can be anything; if your client doesn't have a renderer for it, it will be ignored.
	   * @param  {number} [options.size=0] - Size of your part. Will be calculated for you if not provided.
	   *
	   * @return {layer.MessagePart}
	   */
	  function MessagePart(options) {
	    _classCallCheck$10(this, MessagePart);

	    var newOptions = options;
	    if (typeof options === 'string') {
	      newOptions = { body: options };
	      if ((arguments.length <= 1 ? 0 : arguments.length - 1) > 0) {
	        newOptions.mimeType = arguments.length <= 1 ? undefined : arguments[1];
	      } else {
	        newOptions.mimeType = 'text/plain';
	      }
	    } else if (Util$3.isBlob(options) || Util$3.isBlob(options.body)) {
	      var body = options instanceof Blob ? options : options.body;
	      var mimeType = Util$3.isBlob(options.body) ? options.mimeType : body.type;
	      newOptions = {
	        mimeType: mimeType,
	        body: body,
	        size: body.size,
	        hasContent: true
	      };
	    }

	    var _this = _possibleConstructorReturn$6(this, (MessagePart.__proto__ || Object.getPrototypeOf(MessagePart)).call(this, newOptions));

	    if (!_this.size && _this.body) _this.size = _this.body.length;

	    // Don't expose encoding; blobify it if its encoded.
	    if (options.encoding === 'base64') {
	      _this.body = Util$3.base64ToBlob(_this.body);
	    }

	    // Could be a blob because it was read out of indexedDB,
	    // or because it was created locally with a file
	    // Or because of base64 encoded data.
	    var isBlobBody = Util$3.isBlob(_this.body);
	    var textual = _this.isTextualMimeType();

	    // Custom handling for non-textual content
	    if (!textual) {
	      // If the body exists and is a blob, extract the data uri for convenience; only really relevant for image and video HTML tags.
	      if (!isBlobBody && _this.body) _this.body = new Blob([_this.body], { type: _this.mimeType });
	      if (_this.body) _this.url = URL.createObjectURL(_this.body);
	    }

	    // If our textual content is a blob, turning it into text is asychronous, and can't be done in the synchronous constructor
	    // This will only happen when the client is attaching a file.  Conversion for locally created messages is done while calling `Message.send()`
	    return _this;
	  }

	  _createClass$10(MessagePart, [{
	    key: 'destroy',
	    value: function destroy() {
	      if (this.__url) {
	        URL.revokeObjectURL(this.__url);
	        this.__url = null;
	      }
	      this.body = null;
	      _get$4(MessagePart.prototype.__proto__ || Object.getPrototypeOf(MessagePart.prototype), 'destroy', this).call(this);
	    }

	    /**
	     * Get the layer.Client associated with this layer.MessagePart.
	     *
	     * Uses the layer.MessagePart.clientId property.
	     *
	     * @method _getClient
	     * @private
	     * @return {layer.Client}
	     */

	  }, {
	    key: '_getClient',
	    value: function _getClient() {
	      return ClientRegistry$2.get(this.clientId);
	    }

	    /**
	     * Get the layer.Message associated with this layer.MessagePart.
	     *
	     * @method _getMessage
	     * @private
	     * @return {layer.Message}
	     */

	  }, {
	    key: '_getMessage',
	    value: function _getMessage() {
	      return this._getClient().getMessage(this.id.replace(/\/parts.*$/, ''));
	    }

	    /**
	     * Download Rich Content from cloud server.
	     *
	     * For MessageParts with rich content, this method will load the data from google's cloud storage.
	     * The body property of this MessagePart is set to the result.
	     *
	     *      messagepart.fetchContent()
	     *      .on("content-loaded", function() {
	     *          render(messagepart.body);
	     *      });
	     *
	     * Note that a successful call to `fetchContent` will also cause Query change events to fire.
	     * In this example, `render` will be called by the query change event that will occur once the content has downloaded:
	     *
	     * ```
	     *  query.on('change', function(evt) {
	     *    render(query.data);
	     *  });
	     *  messagepart.fetchContent();
	     * ```
	     *
	     *
	     * @method fetchContent
	     * @param {Function} [callback]
	     * @param {Mixed} callback.data - Either a string (mimeType=text/plain) or a Blob (all other mimeTypes)
	     * @return {layer.Content} this
	     */

	  }, {
	    key: 'fetchContent',
	    value: function fetchContent(callback) {
	      var _this2 = this;

	      if (this._content && !this.isFiring) {
	        this.isFiring = true;
	        var type = this.mimeType === 'image/jpeg+preview' ? 'image/jpeg' : this.mimeType;
	        this._content.loadContent(type, function (err, result) {
	          if (!_this2.isDestroyed) _this2._fetchContentCallback(err, result, callback);
	        });
	      }
	      return this;
	    }

	    /**
	     * Callback with result or error from calling fetchContent.
	     *
	     * @private
	     * @method _fetchContentCallback
	     * @param {layer.LayerError} err
	     * @param {Object} result
	     * @param {Function} callback
	     */

	  }, {
	    key: '_fetchContentCallback',
	    value: function _fetchContentCallback(err, result, callback) {
	      var _this3 = this;

	      if (err) {
	        this.trigger('content-loaded-error', err);
	      } else {
	        this.isFiring = false;
	        if (this.isTextualMimeType()) {
	          Util$3.fetchTextFromFile(result, function (text) {
	            return _this3._fetchContentComplete(text, callback);
	          });
	        } else {
	          this.url = URL.createObjectURL(result);
	          this._fetchContentComplete(result, callback);
	        }
	      }
	    }

	    /**
	     * Callback with Part Body from _fetchContentCallback.
	     *
	     * @private
	     * @method _fetchContentComplete
	     * @param {Blob|String} body
	     * @param {Function} callback
	     */

	  }, {
	    key: '_fetchContentComplete',
	    value: function _fetchContentComplete(body, callback) {
	      var message = this._getMessage();
	      if (!message) return;

	      // NOTE: This will trigger a messageparts:change event, and therefore a messages:change event
	      this.body = body;

	      this.trigger('content-loaded');

	      // TODO: This event is now deprecated, and should be removed for WebSDK 4.0
	      message._triggerAsync('messages:change', {
	        oldValue: message.parts,
	        newValue: message.parts,
	        property: 'parts'
	      });

	      if (callback) callback(this.body);
	    }

	    /**
	     * Access the URL to the remote resource.
	     *
	     * Useful for streaming the content so that you don't have to download the entire file before rendering it.
	     * Also useful for content that will be openned in a new window, and does not need to be fetched now.
	     *
	     * For MessageParts with Rich Content, will lookup a URL to your Rich Content.
	     * Useful for streaming and content so that you don't have to download the entire file before rendering it.
	     *
	     * ```
	     * messagepart.fetchStream(function(url) {
	     *     render(url);
	     * });
	     * ```
	     *
	     * Note that a successful call to `fetchStream` will also cause Query change events to fire.
	     * In this example, `render` will be called by the query change event that will occur once the `url` has been refreshed:
	     *
	     * ```
	     *  query.on('change', function(evt) {
	     *      render(query.data);
	     *  });
	     *  messagepart.fetchStream();
	     * ```
	     *
	     * @method fetchStream
	     * @param {Function} [callback]
	     * @param {Mixed} callback.url
	     * @return {layer.Content} this
	     */

	  }, {
	    key: 'fetchStream',
	    value: function fetchStream(callback) {
	      var _this4 = this;

	      if (!this._content) throw new Error(LayerError$6.dictionary.contentRequired);
	      if (this._content.isExpired()) {
	        this._content.refreshContent(this._getClient(), function (url) {
	          return _this4._fetchStreamComplete(url, callback);
	        });
	      } else {
	        this._fetchStreamComplete(this._content.downloadUrl, callback);
	      }
	      return this;
	    }

	    // Does not set this.url; instead relies on fact that this._content.downloadUrl has been updated

	  }, {
	    key: '_fetchStreamComplete',
	    value: function _fetchStreamComplete(url, callback) {
	      var message = this._getMessage();

	      this.trigger('url-loaded');

	      this._triggerAsync('messageparts:change', {
	        oldValue: '',
	        newValue: url,
	        property: 'url'
	      });

	      // TODO: This event is now deprecated, and should be removed for WebSDK 4.0
	      message._triggerAsync('messages:change', {
	        oldValue: message.parts,
	        newValue: message.parts,
	        property: 'parts'
	      });
	      if (callback) callback(url);
	    }

	    /**
	     * Preps a MessagePart for sending.  Normally that is trivial.
	     * But if there is rich content, then the content must be uploaded
	     * and then we can trigger a "parts:send" event indicating that
	     * the part is ready to send.
	     *
	     * @method _send
	     * @protected
	     * @param  {layer.Client} client
	     * @fires parts:send
	     */

	  }, {
	    key: '_send',
	    value: function _send(client) {
	      // There is already a Content object, presumably the developer
	      // already took care of this step for us.
	      if (this._content) {
	        this._sendWithContent();
	      }

	      // If the size is large, Create and upload the Content
	      else if (this.size > 2048) {
	          this._generateContentAndSend(client);
	        }

	        // If the body is a blob, but is not YET Rich Content, do some custom analysis/processing:
	        else if (Util$3.isBlob(this.body)) {
	            this._sendBlob(client);
	          }

	          // Else the message part can be sent as is.
	          else {
	              this._sendBody();
	            }
	    }
	  }, {
	    key: '_sendBody',
	    value: function _sendBody() {
	      if (typeof this.body !== 'string') {
	        var err = 'MessagePart.body must be a string in order to send it';
	        logger$5.error(err, { mimeType: this.mimeType, body: this.body });
	        throw new Error(err);
	      }

	      var obj = {
	        mime_type: this.mimeType,
	        body: this.body
	      };
	      this.trigger('parts:send', obj);
	    }
	  }, {
	    key: '_sendWithContent',
	    value: function _sendWithContent() {
	      this.trigger('parts:send', {
	        mime_type: this.mimeType,
	        content: {
	          size: this.size,
	          id: this._content.id
	        }
	      });
	    }

	    /**
	     * This method is only called if Blob.size < 2048.
	     *
	     * However, conversion to base64 can impact the size, so we must retest the size
	     * after conversion, and then decide to send the original blob or the base64 encoded data.
	     *
	     * @method _sendBlob
	     * @private
	     * @param {layer.Client} client
	     */

	  }, {
	    key: '_sendBlob',
	    value: function _sendBlob(client) {
	      var _this5 = this;

	      /* istanbul ignore else */
	      Util$3.blobToBase64(this.body, function (base64data) {
	        if (base64data.length < 2048) {
	          var body = base64data.substring(base64data.indexOf(',') + 1);
	          var obj = {
	            body: body,
	            mime_type: _this5.mimeType
	          };
	          obj.encoding = 'base64';
	          _this5.trigger('parts:send', obj);
	        } else {
	          _this5._generateContentAndSend(client);
	        }
	      });
	    }

	    /**
	     * Create an rich Content object on the server
	     * and then call _processContentResponse
	     *
	     * @method _generateContentAndSend
	     * @private
	     * @param  {layer.Client} client
	     */

	  }, {
	    key: '_generateContentAndSend',
	    value: function _generateContentAndSend(client) {
	      var _this6 = this;

	      this.hasContent = true;
	      var body = void 0;
	      if (!Util$3.isBlob(this.body)) {
	        body = Util$3.base64ToBlob(Util$3.utoa(this.body), this.mimeType);
	      } else {
	        body = this.body;
	      }
	      client.xhr({
	        url: '/content',
	        method: 'POST',
	        headers: {
	          'Upload-Content-Type': this.mimeType,
	          'Upload-Content-Length': body.size,
	          'Upload-Origin': typeof location !== 'undefined' ? location.origin : ''
	        },
	        sync: {}
	      }, function (result) {
	        return _this6._processContentResponse(result.data, body, client);
	      });
	    }

	    /**
	     * Creates a layer.Content object from the server's
	     * Content object, and then uploads the data to google cloud storage.
	     *
	     * @method _processContentResponse
	     * @private
	     * @param  {Object} response
	     * @param  {Blob} body
	     * @param  {layer.Client} client
	     * @param {Number} [retryCount=0]
	     */

	  }, {
	    key: '_processContentResponse',
	    value: function _processContentResponse(response, body, client) {
	      var _this7 = this;

	      var retryCount = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

	      this._content = new Content(response.id);
	      this.hasContent = true;
	      xhr$3({
	        url: response.upload_url,
	        method: 'PUT',
	        data: body,
	        headers: {
	          'Upload-Content-Length': this.size,
	          'Upload-Content-Type': this.mimeType
	        }
	      }, function (result) {
	        return _this7._processContentUploadResponse(result, response, client, body, retryCount);
	      });
	    }

	    /**
	     * Process the response to uploading the content to google cloud storage.
	     *
	     * Result is either:
	     *
	     * 1. trigger `parts:send` on success
	     * 2. call `_processContentResponse` to retry
	     * 3. trigger `messages:sent-error` if retries have failed
	     *
	     * @method _processContentUploadResponse
	     * @private
	     * @param  {Object} uploadResult    Response from google cloud server; note that the xhr method assumes some layer-like behaviors and may replace non-json responses with js objects.
	     * @param  {Object} contentResponse Response to `POST /content` from before
	     * @param  {layer.Client} client
	     * @param  {Blob} body
	     * @param  {Number} retryCount
	     */

	  }, {
	    key: '_processContentUploadResponse',
	    value: function _processContentUploadResponse(uploadResult, contentResponse, client, body, retryCount) {
	      if (!uploadResult.success) {
	        if (!client.onlineManager.isOnline) {
	          client.onlineManager.once('connected', this._processContentResponse.bind(this, contentResponse, client), this);
	        } else if (retryCount < MessagePart.MaxRichContentRetryCount) {
	          this._processContentResponse(contentResponse, body, client, retryCount + 1);
	        } else {
	          logger$5.error('Failed to upload rich content; triggering message:sent-error event; status of ', uploadResult.status, this);
	          this._getMessage().trigger('messages:sent-error', {
	            error: new LayerError$6({
	              message: 'Upload of rich content failed',
	              httpStatus: uploadResult.status,
	              code: 0,
	              data: uploadResult.xhr
	            }),
	            part: this
	          });
	        }
	      } else {
	        this.trigger('parts:send', {
	          mime_type: this.mimeType,
	          content: {
	            size: this.size,
	            id: this._content.id
	          }
	        });
	      }
	    }

	    /**
	     * Returns the text for any text/plain part.
	     *
	     * Returns '' if its not a text/plain part.
	     *
	     * @method getText
	     * @return {string}
	     */

	  }, {
	    key: 'getText',
	    value: function getText() {
	      if (this.isTextualMimeType()) {
	        return this.body;
	      } else {
	        return '';
	      }
	    }

	    /**
	     * Updates the MessagePart with new data from the server.
	     *
	     * Currently, MessagePart properties do not update... however,
	     * the layer.Content object that Rich Content MessageParts contain
	     * do get updated with refreshed expiring urls.
	     *
	     * @method _populateFromServer
	     * @param  {Object} part - Server representation of a part
	     * @private
	     */

	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(part) {
	      var _this8 = this;

	      if (part.content && this._content) {
	        this._content.downloadUrl = part.content.download_url;
	        this._content.expiration = new Date(part.content.expiration);
	      } else {
	        var textual = this.isTextualMimeType();

	        // Custom handling for non-textual content
	        if (!textual) {

	          // If the body exists and is a blob, extract the data uri for convenience; only really relevant for image and video HTML tags.
	          if (part.body) {
	            Util$3.blobToBase64(this.body, function (inputBase64) {
	              if (inputBase64 !== Util$3.btoa(part.body)) {
	                _this8.body = new Blob([part.body], { type: _this8.mimeType });
	                if (_this8.body) _this8.url = URL.createObjectURL(_this8.body);
	              }
	            });
	          } else {
	            this.body = null;
	            this.url = '';
	          }
	        } else {
	          this.body = part.body;
	        }
	      }
	    }

	    /**
	     * Is the mimeType for this MessagePart defined as textual content?
	     *
	     * If the answer is true, expect a `body` of string, else expect `body` of Blob.
	     *
	     * To change whether a given MIME Type is treated as textual, see layer.MessagePart.TextualMimeTypes.
	     *
	     * @method isTextualMimeType
	     * @returns {Boolean}
	     */

	  }, {
	    key: 'isTextualMimeType',
	    value: function isTextualMimeType() {
	      var i = 0;
	      for (i = 0; i < MessagePart.TextualMimeTypes.length; i++) {
	        var test = MessagePart.TextualMimeTypes[i];
	        if (typeof test === 'string') {
	          if (test === this.mimeType) return true;
	        } else if (test instanceof RegExp) {
	          if (this.mimeType.match(test)) return true;
	        }
	      }
	      return false;
	    }

	    /**
	     * This method is automatically called any time the body is changed.
	     *
	     * Note that it is not called during initialization.  Any developer who does:
	     *
	     * ```
	     * part.body = "Hi";
	     * ```
	     *
	     * can expect this to trigger a change event, which will in turn trigger a `messages:change` event on the layer.Message.
	     *
	     * @method __updateBody
	     * @private
	     * @param {String} newValue
	     * @param {String} oldValue
	     */

	  }, {
	    key: '__updateBody',
	    value: function __updateBody(newValue, oldValue) {
	      this._triggerAsync('messageparts:change', {
	        property: 'body',
	        newValue: newValue,
	        oldValue: oldValue
	      });
	    }

	    /**
	     * This method is automatically called any time the mimeType is changed.
	     *
	     * Note that it is not called during initialization.  Any developer who does:
	     *
	     * ```
	     * part.mimeType = "text/mountain";
	     * ```
	     *
	     * can expect this to trigger a change event, which will in turn trigger a `messages:change` event on the layer.Message.
	     *
	     * @method __updateMimeType
	     * @private
	     * @param {String} newValue
	     * @param {String} oldValue
	     */

	  }, {
	    key: '__updateMimeType',
	    value: function __updateMimeType(newValue, oldValue) {
	      this._triggerAsync('messageparts:change', {
	        property: 'mimeType',
	        newValue: newValue,
	        oldValue: oldValue
	      });
	    }
	  }, {
	    key: '_updateUrl',
	    value: function _updateUrl(newValue, oldValue) {
	      if (oldValue) URL.revokeObjectURL(oldValue);
	    }
	    /**
	     * Creates a MessagePart from a server representation of the part
	     *
	     * @method _createFromServer
	     * @private
	     * @static
	     * @param  {Object} part - Server representation of a part
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(part) {
	      var content$$1 = part.content ? Content._createFromServer(part.content) : null;

	      // Turn base64 data into a Blob
	      if (part.encoding === 'base64') part.body = Util$3.base64ToBlob(part.body, part.mimeType);

	      // Create the MessagePart
	      return new MessagePart({
	        id: part.id,
	        mimeType: part.mime_type,
	        body: part.body || '',
	        _content: content$$1,
	        hasContent: Boolean(content$$1),
	        size: part.size || 0
	      });
	    }
	  }]);

	  return MessagePart;
	}(Root$6);

	/**
	 * layer.Client that the conversation belongs to.
	 *
	 * Actual value of this string matches the appId.
	 * @type {string}
	 */


	MessagePart$1.prototype.clientId = '';

	/**
	 * Server generated identifier for the part
	 * @type {string}
	 */
	MessagePart$1.prototype.id = '';

	/**
	 * Body of your message part.
	 *
	 * This is the core data of your part.
	 *
	 * If this is `null` then most likely layer.Message.hasContent is true, and you
	 * can either use the layer.MessagePart.url property or the layer.MessagePart.fetchContent method.
	 *
	 * @type {string}
	 */
	MessagePart$1.prototype.body = null;

	/**
	 * Rich content object.
	 *
	 * This will be automatically created for you if your layer.MessagePart.body
	 * is large.
	 * @type {layer.Content}
	 * @private
	 */
	MessagePart$1.prototype._content = null;

	/**
	 * The Part has rich content
	 * @type {Boolean}
	 */
	MessagePart$1.prototype.hasContent = false;

	/**
	 * URL to rich content object.
	 *
	 * Parts with rich content will be initialized with this property set.  But its value will expire.
	 *
	 * Will contain an expiring url at initialization time and be refreshed with calls to `layer.MessagePart.fetchStream()`.
	 * Will contain a non-expiring url to a local resource if `layer.MessagePart.fetchContent()` is called.
	 *
	 * @type {layer.Content}
	 */
	Object.defineProperty(MessagePart$1.prototype, 'url', {
	  enumerable: true,
	  get: function get() {
	    // Its possible to have a url and no content if it has been instantiated but not yet sent.
	    // If there is a __url then its a local url generated from the body property and does not expire.
	    if (this.__url) return this.__url;
	    if (this._content) return this._content.isExpired() ? '' : this._content.downloadUrl;
	    return '';
	  },
	  set: function set(inValue) {
	    this.__url = inValue;
	  }
	});

	/**
	 * Mime Type for the data represented by the MessagePart.
	 *
	 * Typically this is the type for the data in layer.MessagePart.body;
	 * if there is Rich Content, then its the type of Content that needs to be
	 * downloaded.
	 *
	 * @type {String}
	 */
	MessagePart$1.prototype.mimeType = 'text/plain';

	/**
	 * Size of the layer.MessagePart.body.
	 *
	 * Will be set for you if not provided.
	 * Only needed for use with rich content.
	 *
	 * @type {number}
	 */
	MessagePart$1.prototype.size = 0;

	/**
	 * Array of mime types that should be treated as text.
	 *
	 * Treating a MessagePart as text means that even if the `body` gets a File or Blob,
	 * it will be transformed to a string before being delivered to your app.
	 *
	 * This value can be customized using strings and regular expressions:
	 *
	 * ```
	 * layer.MessagePart.TextualMimeTypes = ['text/plain', 'text/mountain', /^application\/json(\+.+)$/]
	 * ```
	 *
	 * @static
	 * @type {Mixed[]}
	 */
	MessagePart$1.TextualMimeTypes = [/^text\/.+$/, /^application\/json(\+.+)?$/];

	/**
	 * Number of retry attempts to make before giving up on uploading Rich Content to Google Cloud Storage.
	 *
	 * @type {Number}
	 */
	MessagePart$1.MaxRichContentRetryCount = 3;

	MessagePart$1._supportedEvents = ['parts:send', 'content-loaded', 'url-loaded', 'content-loaded-error', 'messageparts:change'].concat(Root$6._supportedEvents);
	Root$6.initClass.apply(MessagePart$1, [MessagePart$1, 'MessagePart']);

	var messagePart = MessagePart$1;

	var _createClass$12 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$5 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$12(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$8(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$8(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Identity class represents an Identity of a user of your application.
	 *
	 * Identities are created by the System, never directly by apps.
	 *
	 * @class layer.Identity
	 * @extends layer.Syncable
	 */

	/*
	 * How Identities fit into the system:
	 *
	 * 1. As part of initialization, load the authenticated user's full Identity record so that the Client knows more than just the `userId` of its user.
	 *    client.user = <Identity>
	 * 2. Any time we get a Basic Identity via `message.sender` or Conversations, see if we have an Identity for that sender,
	 *    and if not create one using the Basic Identity.  There should never be a duplicate Identity.
	 * 3. Websocket CHANGE events will update Identity objects, as well as add new Full Identities, and downgrade Full Identities to Basic Identities.
	 * 4. The Query API supports querying and paging through Identities
	 * 5. The Query API loads Full Identities; these results will update the client._models.identities;
	 *    upgrading Basic Identities if they match, and adding new Identities if they don't.
	 * 6. DbManager will persist only UserIdentities, and only those that are Full Identities.  Basic Identities will be written
	 *    to the Messages and Conversations tables anyways as part of those larger objects.
	 * 7. API For explicit follows/unfollows
	 */

	var Syncable$2 = syncable;
	var Root$8 = root;

	var _require$4 = _const;
	var SYNC_STATE$1 = _require$4.SYNC_STATE;

	var LayerError$7 = layerError;

	var _require2$1 = clientUtils;
	var strictEncodeURI$1 = _require2$1.strictEncodeURI;

	var Identity$3 = function (_Syncable) {
	  _inherits$8(Identity, _Syncable);

	  function Identity() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$12(this, Identity);

	    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
	    if (options.fromServer) {
	      options.id = options.fromServer.id || '-';
	    } else if (!options.id && options.userId) {
	      options.id = Identity.prefixUUID + strictEncodeURI$1(options.userId);
	    } else if (options.id && !options.userId) {
	      options.userId = decodeURIComponent(options.id.substring(Identity.prefixUUID.length));
	    }

	    // Make sure we have an clientId property
	    if (options.client) options.clientId = options.client.appId;
	    if (!options.clientId) throw new Error(LayerError$7.dictionary.clientMissing);

	    var _this = _possibleConstructorReturn$8(this, (Identity.__proto__ || Object.getPrototypeOf(Identity)).call(this, options));

	    if (!_this.metadata) _this.metadata = {};

	    // The - is here to prevent Root from generating a UUID for an ID.  ID must map to UserID
	    // and can't be randomly generated.  This only occurs from Platform API sending with `sender.name` and no identity.
	    if (_this.id === '-') _this.id = '';

	    _this.isInitializing = true;

	    if (!_this._presence) {
	      _this._presence = {
	        status: null,
	        lastSeenAt: null
	      };
	    }

	    // If the options contains a full server definition of the object,
	    // copy it in with _populateFromServer; this will add the Identity
	    // to the Client as well.
	    if (options && options.fromServer) {
	      _this._populateFromServer(options.fromServer);
	    }

	    if (!_this.url && _this.id) {
	      _this.url = _this.getClient().url + '/' + _this.id.substring(9);
	    } else if (!_this.url) {
	      _this.url = '';
	    }
	    _this.getClient()._addIdentity(_this);

	    _this.getClient().on('online', function (evt) {
	      if (!evt.isOnline) _this._updateValue(['_presence', 'status'], Identity.STATUS.OFFLINE);
	    }, _this);

	    _this.isInitializing = false;
	    return _this;
	  }

	  _createClass$12(Identity, [{
	    key: 'destroy',
	    value: function destroy() {
	      var client = this.getClient();
	      if (client) client._removeIdentity(this);
	      _get$5(Identity.prototype.__proto__ || Object.getPrototypeOf(Identity.prototype), 'destroy', this).call(this);
	    }
	  }, {
	    key: '_triggerAsync',
	    value: function _triggerAsync(evtName, args) {
	      this._clearObject();
	      _get$5(Identity.prototype.__proto__ || Object.getPrototypeOf(Identity.prototype), '_triggerAsync', this).call(this, evtName, args);
	    }
	  }, {
	    key: 'trigger',
	    value: function trigger(evtName, args) {
	      this._clearObject();
	      _get$5(Identity.prototype.__proto__ || Object.getPrototypeOf(Identity.prototype), 'trigger', this).call(this, evtName, args);
	    }

	    /**
	     * Populates this instance using server-data.
	     *
	     * Side effects add this to the Client.
	     *
	     * @method _populateFromServer
	     * @private
	     * @param  {Object} identity - Server representation of the identity
	     */

	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(identity) {
	      var _this2 = this;

	      var client = this.getClient();

	      // Disable events if creating a new Identity
	      // We still want property change events for anything that DOES change
	      this._disableEvents = this.syncState === SYNC_STATE$1.NEW;

	      this._setSynced();

	      this.userId = identity.user_id || '';

	      this._updateValue(['avatarUrl'], identity.avatar_url);
	      this._updateValue(['displayName'], identity.display_name);

	      var isFullIdentity = 'metadata' in identity;

	      // Handle Full Identity vs Basic Identity
	      if (isFullIdentity) {
	        this.url = identity.url;
	        this.type = identity.type;

	        this._updateValue(['emailAddress'], identity.email_address);
	        this._updateValue(['lastName'], identity.last_name);
	        this._updateValue(['firstName'], identity.first_name);
	        this._updateValue(['metadata'], identity.metadata || {});
	        this._updateValue(['publicKey'], identity.public_key);
	        this._updateValue(['phoneNumber'], identity.phone_number);
	        this.isFullIdentity = true;
	      }

	      if (!this.url && this.id) {
	        this.url = this.getClient().url + this.id.substring(8);
	      }

	      this._disableEvents = false;

	      // See if we have the Full Identity Object in database
	      if (!this.isFullIdentity && client.isAuthenticated) {
	        client.dbManager.getObjects('identities', [this.id], function (result) {
	          if (result.length) _this2._populateFromServer(result[0]);
	        });
	      }
	    }

	    /**
	     * Update the property; trigger a change event, IF the value has changed.
	     *
	     * @method _updateValue
	     * @private
	     * @param {string[]} keys - Property name parts
	     * @param {Mixed} value - Property value
	     */

	  }, {
	    key: '_updateValue',
	    value: function _updateValue(keys, value) {
	      if (value === null || value === undefined) value = '';
	      var pointer = this;
	      for (var i = 0; i < keys.length - 1; i++) {
	        pointer = pointer[keys[i]];
	      }
	      var lastKey = keys[keys.length - 1];

	      if (pointer[lastKey] !== value) {
	        if (!this.isInitializing) {
	          if (keys[0] === '_presence') keys = [keys[1]];
	          this._triggerAsync('identities:change', {
	            property: keys.join('.'),
	            oldValue: pointer[lastKey],
	            newValue: value
	          });
	        }
	        pointer[lastKey] = value;
	      }
	    }

	    /**
	     * Accepts json-patch operations for modifying recipientStatus.
	     *
	     * Note that except for a camelcase error in last_seen_at,
	     * all properties are set prior to calling this method.
	     *
	     * @method _handlePatchEvent
	     * @private
	     * @param  {Object[]} data - Array of operations
	     */

	  }, {
	    key: '_handlePatchEvent',
	    value: function _handlePatchEvent(newValueIn, oldValueIn, paths) {
	      var _this3 = this;

	      var changes = [];
	      paths.forEach(function (path) {
	        var newValue = newValueIn,
	            oldValue = oldValueIn;
	        if (path === 'presence.last_seen_at') {
	          _this3._presence.lastSeenAt = new Date(newValue.last_seen_at);
	          newValue = _this3._presence.lastSeenAt;
	          oldValue = oldValue.lastSeenAt;
	          delete _this3._presence.last_seen_at; // Flaw in layer-patch assumes that subproperties don't get camel cased (correct assumption for `recipient_status` and `metadata`)
	        } else if (path === 'presence.status') {
	          newValue = _this3._presence.status;
	          oldValue = oldValue.status;

	          //We receive a huge number of presence.status change events from the websocket that do not represent
	          // an actual change in value. Insure we do not trigger events announcing such a change.
	          if (newValue === oldValue) return;
	        }
	        var property = path.replace(/_(.)/g, function (match, value) {
	          return value.toUpperCase();
	        }).replace(/^presence\./, '');
	        changes.push({ property: property, oldValue: oldValue, newValue: newValue });
	      });

	      // Don't trigger changes if the only thing to change was lastSeenAt; lastSeenAt only changes if your online,
	      // and if your online, lastSeenAt isn't all that significant.
	      // The only time changes to `lastSeenAt` should be triggered as an event is when status changes to offline
	      if (changes.length !== 1 || changes[0].property !== 'lastSeenAt') {
	        changes.forEach(function (change) {
	          return _this3._triggerAsync('identities:change', change);
	        });
	      }
	    }

	    /**
	     * Follow this User.
	     *
	     * Following a user grants access to their Full Identity,
	     * as well as websocket events that update the Identity.
	     * @method follow
	     */

	  }, {
	    key: 'follow',
	    value: function follow() {
	      var _this4 = this;

	      if (this.isFullIdentity) return;
	      this._xhr({
	        method: 'PUT',
	        url: this.url.replace(/identities/, 'following/users'),
	        syncable: {}
	      }, function (result) {
	        if (result.success) _this4._load();
	      });
	      this.syncState = SYNC_STATE$1.LOADING;
	    }

	    /**
	     * Unfollow this User.
	     *
	     * Unfollowing the user will reduce your access to only having their Basic Identity,
	     * and this Basic Identity will only show up when a relevant Message or Conversation has been loaded.
	     *
	     * Websocket change notifications for this user will not arrive.
	     *
	     * @method unfollow
	     */

	  }, {
	    key: 'unfollow',
	    value: function unfollow() {
	      this._xhr({
	        url: this.url.replace(/identities/, 'following/users'),
	        method: 'DELETE',
	        syncable: {}
	      });
	    }

	    /**
	     * Set the status of the current user.
	     *
	     * @method setStatus
	     * @param {String} status    One of layer.Identity.STATUS.AVAILABLE, layer.Identity.STATUS.AWAY,
	     *        layer.Identity.STATUS.BUSY, layer.Identity.STATUS.OFLINE
	     */

	  }, {
	    key: 'setStatus',
	    value: function setStatus(status) {
	      var _this5 = this;

	      status = (status || '').toLowerCase();
	      if (!Identity.STATUS[status.toUpperCase()]) throw new Error(LayerError$7.dictionary.valueNotSupported);
	      if (this !== this.getClient().user) throw new Error(LayerError$7.dictionary.permissionDenied);
	      if (status === Identity.STATUS.INVISIBLE) status = Identity.STATUS.OFFLINE; // these are equivalent; only one supported by server

	      var oldValue = this._presence.status;
	      this.getClient().sendSocketRequest({
	        method: 'PATCH',
	        body: {
	          method: 'Presence.update',
	          data: [{ operation: 'set', property: 'status', value: status }]
	        },
	        sync: {
	          depends: [this.id],
	          target: this.id
	        }
	      }, function (result) {
	        if (!result.success && result.data.id !== 'authentication_required') _this5._updateValue(['_presence', 'status'], oldValue);
	      });

	      // these are equivalent; only one is useful for understanding your state given that your still connected/online.
	      if (status === Identity.STATUS.OFFLINE) status = Identity.STATUS.INVISIBLE;

	      this._updateValue(['_presence', 'status'], status);
	    }

	    /**
	     * Update the UserID.
	     *
	     * This will not only update the User ID, but also the ID,
	     * URL, and reregister it with the Client.
	     *
	     * @method _setUserId
	     * @private
	     * @param {string} userId
	     */

	  }, {
	    key: '_setUserId',
	    value: function _setUserId(userId) {
	      var client = this.getClient();
	      client._removeIdentity(this);
	      this.__userId = userId;
	      var encoded = strictEncodeURI$1(userId);
	      this.id = Identity.prefixUUID + encoded;
	      this.url = this.getClient().url + '/identities/' + encoded;
	      client._addIdentity(this);
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any attempt to execute `this.userId = 'xxx'` will cause an error to be thrown.
	     * These are not intended to be writable properties
	     *
	     * @private
	     * @method __adjustUserId
	     * @param {string} value - New appId value
	     */

	  }, {
	    key: '__adjustUserId',
	    value: function __adjustUserId(userId) {
	      if (this.__userId) {
	        throw new Error(LayerError$7.dictionary.cantChangeUserId);
	      }
	    }

	    /**
	     * Handle a Websocket DELETE event received from the server.
	     *
	     * A DELETE event means we have unfollowed this user; and should downgrade to a Basic Identity.
	     *
	     * @method _handleWebsocketDelete
	     * @protected
	     * @param {Object} data - Deletion parameters; typically null in this case.
	    */
	    // Turn a Full Identity into a Basic Identity and delete the Full Identity from the database

	  }, {
	    key: '_handleWebsocketDelete',
	    value: function _handleWebsocketDelete(data) {
	      var _this6 = this;

	      this.getClient().dbManager.deleteObjects('identities', [this]);
	      ['firstName', 'lastName', 'emailAddress', 'phoneNumber', 'metadata', 'publicKey', 'isFullIdentity', 'type'].forEach(function (key) {
	        return delete _this6[key];
	      });
	      this._triggerAsync('identities:unfollow');
	    }

	    /**
	     * Create a new Identity based on a Server description of the user.
	     *
	     * @method _createFromServer
	     * @static
	     * @param {Object} identity - Server Identity Object
	     * @param {layer.Client} client
	     * @returns {layer.Identity}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(identity, client) {
	      return new Identity({
	        client: client,
	        fromServer: identity,
	        _fromDB: identity._fromDB
	      });
	    }
	  }]);

	  return Identity;
	}(Syncable$2);

	/**
	 * Display name for the User or System Identity.
	 * @type {string}
	 */


	Identity$3.prototype.displayName = '';

	/**
	 * The Identity matching `layer.Client.user` will have this be true.
	 *
	 * All other Identities will have this as false.
	 * @type {boolean}
	 */
	Identity$3.prototype.sessionOwner = false;

	/**
	 * ID of the Client this Identity is associated with.
	 * @type {string}
	 */
	Identity$3.prototype.clientId = '';

	/**
	 * Is this a Full Identity or Basic Identity?
	 *
	 * Note that Service Identities are always considered to be Basic.
	 * @type {boolean}
	 */
	Identity$3.prototype.isFullIdentity = false;

	/**
	 * Unique ID for this User.
	 * @type {string}
	 */
	Identity$3.prototype.userId = '';

	/**
	 * Optional URL for the user's icon.
	 * @type {string}
	 */
	Identity$3.prototype.avatarUrl = '';

	/**
	 * Optional first name for this user.
	 *
	 * Full Identities Only.
	 *
	 * @type {string}
	 */
	Identity$3.prototype.firstName = '';

	/**
	 * Optional last name for this user.
	 *
	 * Full Identities Only.
	 *
	 * @type {string}
	 */
	Identity$3.prototype.lastName = '';

	/**
	 * Optional email address for this user.
	 *
	 * Full Identities Only.
	 *
	 * @type {string}
	 */
	Identity$3.prototype.emailAddress = '';

	/**
	 * Optional phone number for this user.
	 *
	 * Full Identities Only.
	 *
	 * @type {string}
	 */
	Identity$3.prototype.phoneNumber = '';

	/**
	 * Optional metadata for this user.
	 *
	 * Full Identities Only.
	 *
	 * @type {Object}
	 */
	Identity$3.prototype.metadata = null;

	/**
	 * Optional public key for encrypting message text for this user.
	 *
	 * Full Identities Only.
	 *
	 * @type {string}
	 */
	Identity$3.prototype.publicKey = '';

	/**
	 * @static
	 * @type {string} The Identity represents a user.  Value used in the layer.Identity.type field.
	 */
	Identity$3.UserType = 'user';

	/**
	 * @static
	 * @type {string} The Identity represents a bot.  Value used in the layer.Identity.type field.
	 */
	Identity$3.BotType = 'bot';

	/**
	 * What type of Identity does this represent?
	 *
	 * * A bot? Use layer.Identity.BotType
	 * * A User? Use layer.Identity.UserType
	 * @type {string}
	 */
	Identity$3.prototype.type = Identity$3.UserType;

	/**
	 * Presence object contains presence information for this user.
	 *
	 * Properties of the sub-object are:
	 *
	 * * `status`: has the following possible values:
	 * ** `available`: User has set their status to `available`.  This is the default initial state
	 * ** `away`: App or User has changed their status to `away`
	 * ** `busy`: App or User has changed their status to `busy`
	 * ** `offline`: User is not connected or has set their status to `offline`
	 * ** `invisible`: When a user has set their status to `offline` they instead see a status of `invisible` so that they know
	 *    that they have deliberately set their status to `offline` but are still connected.
	 * * `lastSeenAt`: Approximate time that the user was last known to be connected (and not `invisible`)
	 *
	 * @property {Object} _presence
	 * @property {String} _presence.status
	 * @property {Date} _presence.lastSeenAt
	 * @private
	 */
	Identity$3.prototype._presence = null;

	/**
	 * The user's current status or availability.
	 *
	 * Value is one of:
	 *
	 * * `layer.Identity.STATUS.AVAILABLE`: User has set their status to `available`.  This is the default initial state
	 * * `layer.Identity.STATUS.AWAY`: App or User has changed their status to `away`
	 * * `layer.Identity.STATUS.BUSY`: App or User has changed their status to `busy`
	 * * `layer.Identity.STATUS.OFFLINE`: User is not connected or has set their status to `offline`
	 * * `layer.Identity.STATUS.INVISIBLE`: When a user has set their status to `offline` they instead see a status of `invisible` so that they know
	 *    that they have deliberately set their status to `offline` but are still connected.
	 *
	 * This property can only be set on the session owner's identity, not on other identities via:
	 *
	 * ```
	 * client.user.setStatus(layer.Identity.STATUS.AVAILABLE);
	 * ```
	 *
	 * @property {String} status
	 * @readonly
	 */
	Object.defineProperty(Identity$3.prototype, 'status', {
	  enumerable: true,
	  get: function get() {
	    return this._presence && this._presence.status || Identity$3.STATUS.OFFLINE;
	  }
	});

	/**
	 * Time that the user was last known to be online.
	 *
	 * Accurate to within about 15 minutes.  User's who are online, but set their status
	 * to `layer.Identity.STATUS.INVISIBLE` will not have their `lastSeenAt` value updated.
	 *
	 * @property {Date} lastSeenAt
	 * @readonly
	 */
	Object.defineProperty(Identity$3.prototype, 'lastSeenAt', {
	  enumerable: true,
	  get: function get() {
	    return this._presence && this._presence.lastSeenAt;
	  }
	});

	/**
	 * Is this Identity a bot?
	 *
	 * If the layer.Identity.type field is equal to layer.Identity.BotType then this will return true.
	 * @property {boolean} isBot
	 */
	Object.defineProperty(Identity$3.prototype, 'isBot', {
	  enumerable: true,
	  get: function get() {
	    return this.type === Identity$3.BotType;
	  }
	});

	/**
	 * Possible values for layer.Identity.status field to be used in `setStatus()`
	 *
	 * @property {Object} STATUS
	 * @property {String} STATUS.AVAILABLE   User has set their status to `available`.  This is the default initial state
	 * @property {String} STATUS.AWAY        App or User has changed their status to `away`
	 * @property {String} STATUS.BUSY     App or User has changed their status to `busy`
	 * @property {String} STATUS.OFFLINE  User is not connected or has set their status to `offline`
	 * @property {String} STATUS.INVISIBLE  When a user has set their status to `offline` they instead see a status of `invisible` so that they know
	 *    that they have deliberately set their status to `offline` but are still connected.
	 * @static
	 */
	Identity$3.STATUS = {
	  AVAILABLE: 'available',
	  AWAY: 'away',
	  OFFLINE: 'offline',
	  BUSY: 'busy',
	  INVISIBLE: 'invisible'
	};

	Identity$3.inObjectIgnore = Root$8.inObjectIgnore;

	Identity$3.bubbleEventParent = 'getClient';

	Identity$3._supportedEvents = ['identities:change', 'identities:loaded', 'identities:loaded-error', 'identities:unfollow'].concat(Syncable$2._supportedEvents);

	Identity$3.eventPrefix = 'identities';
	Identity$3.prefixUUID = 'layer:///identities/';
	Identity$3.enableOpsIfNew = true;

	Root$8.initClass.apply(Identity$3, [Identity$3, 'Identity']);
	Syncable$2.subclasses.push(Identity$3);

	var identity = Identity$3;

	var _typeof$5 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$8 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$2 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$8(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$4(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$4(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Message Class represents Messages sent amongst participants
	 * of of a Conversation.
	 *
	 * The simplest way to create and send a message is:
	 *
	 *      var m = conversation.createMessage('Hello there').send();
	 *      var m = channel.createMessage('Hello there').send();
	 *
	 * For conversations that involve notifications (primarily for Android and IOS), the more common pattern is:
	 *
	 *      var m = conversation.createMessage('Hello there').send({text: "Message from Fred: Hello there"});
	 *
	 * Channels do not at this time support notifications.
	 *
	 * Typically, rendering would be done as follows:
	 *
	 *      // Create a layer.Query that loads Messages for the
	 *      // specified Conversation.
	 *      var query = client.createQuery({
	 *        model: Query.Message,
	 *        predicate: 'conversation = "' + conversation.id + '"'
	 *      });
	 *
	 *      // Any time the Query's data changes the 'change'
	 *      // event will fire.
	 *      query.on('change', function(layerEvt) {
	 *        renderNewMessages(query.data);
	 *      });
	 *
	 *      // This will call will cause the above event handler to receive
	 *      // a change event, and will update query.data.
	 *      conversation.createMessage('Hello there').send();
	 *
	 * The above code will trigger the following events:
	 *
	 *  * Message Instance fires
	 *    * messages:sending: An event that lets you modify the message prior to sending
	 *    * messages:sent: The message was received by the server
	 *  * Query Instance fires
	 *    * change: The query has received a new Message
	 *    * change:add: Same as the change event but does not receive other types of change events
	 *
	 * When creating a Message there are a number of ways to structure it.
	 * All of these are valid and create the same exact Message:
	 *
	 *      // Full API style:
	 *      var m = conversation.createMessage({
	 *          parts: [new layer.MessagePart({
	 *              body: 'Hello there',
	 *              mimeType: 'text/plain'
	 *          })]
	 *      });
	 *
	 *      // Option 1: Pass in an Object instead of an array of layer.MessageParts
	 *      var m = conversation.createMessage({
	 *          parts: {
	 *              body: 'Hello there',
	 *              mimeType: 'text/plain'
	 *          }
	 *      });
	 *
	 *      // Option 2: Pass in an array of Objects instead of an array of layer.MessageParts
	 *      var m = conversation.createMessage({
	 *          parts: [{
	 *              body: 'Hello there',
	 *              mimeType: 'text/plain'
	 *          }]
	 *      });
	 *
	 *      // Option 3: Pass in a string (automatically assumes mimeType is text/plain)
	 *      // instead of an array of objects.
	 *      var m = conversation.createMessage({
	 *          parts: 'Hello'
	 *      });
	 *
	 *      // Option 4: Pass in an array of strings (automatically assumes mimeType is text/plain)
	 *      var m = conversation.createMessage({
	 *          parts: ['Hello']
	 *      });
	 *
	 *      // Option 5: Pass in just a string and nothing else
	 *      var m = conversation.createMessage('Hello');
	 *
	 *      // Option 6: Use addPart.
	 *      var m = converseation.createMessage();
	 *      m.addPart({body: "hello", mimeType: "text/plain"});
	 *
	 * Key methods, events and properties for getting started:
	 *
	 * Properties:
	 *
	 * * layer.Message.id: this property is worth being familiar with; it identifies the
	 *   Message and can be used in `client.getMessage(id)` to retrieve it
	 *   at any time.
	 * * layer.Message.internalId: This property makes for a handy unique ID for use in dom nodes.
	 *   It is gaurenteed not to change during this session.
	 * * layer.Message.isRead: Indicates if the Message has been read yet; set `m.isRead = true`
	 *   to tell the client and server that the message has been read.
	 * * layer.Message.parts: An array of layer.MessagePart classes representing the contents of the Message.
	 * * layer.Message.sentAt: Date the message was sent
	 * * layer.Message.sender `userId`: Conversation participant who sent the Message. You may
	 *   need to do a lookup on this id in your own servers to find a
	 *   displayable name for it.
	 *
	 * Methods:
	 *
	 * * layer.Message.send(): Sends the message to the server and the other participants.
	 * * layer.Message.on() and layer.Message.off(); event listeners built on top of the `backbone-events-standalone` npm project
	 *
	 * Events:
	 *
	 * * `messages:sent`: The message has been received by the server. Can also subscribe to
	 *   this event from the layer.Client which is usually simpler.
	 *
	 * @class  layer.Message
	 * @extends layer.Syncable
	 */

	var Root$4 = root;
	var Syncable = syncable;
	var MessagePart = messagePart;
	var LayerError$4 = layerError;
	var Constants = _const;
	var Util$2 = clientUtils;
	var Identity$2 = identity;

	var Message$1 = function (_Syncable) {
	  _inherits$4(Message, _Syncable);

	  /**
	   * See layer.Conversation.createMessage()
	   *
	   * @method constructor
	   * @return {layer.Message}
	   */
	  function Message() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$8(this, Message);

	    // Unless this is a server representation, this is a developer's shorthand;
	    // fill in the missing properties around isRead/isUnread before initializing.
	    if (!options.fromServer) {
	      if ('isUnread' in options) {
	        options.isRead = !options.isUnread && !options.is_unread;
	        delete options.isUnread;
	      } else {
	        options.isRead = true;
	      }
	    } else {
	      options.id = options.fromServer.id;
	    }

	    if (options.client) options.clientId = options.client.appId;
	    if (!options.clientId) throw new Error(LayerError$4.dictionary.clientMissing);

	    // Insure __adjustParts is set AFTER clientId is set.
	    var parts = options.parts;
	    options.parts = null;

	    var _this = _possibleConstructorReturn$4(this, (Message.__proto__ || Object.getPrototypeOf(Message)).call(this, options));

	    _this.parts = parts;

	    var client = _this.getClient();
	    _this.isInitializing = true;
	    if (options && options.fromServer) {
	      _this._populateFromServer(options.fromServer);
	    } else {
	      if (client) _this.sender = client.user;
	      _this.sentAt = new Date();
	    }

	    if (!_this.parts) _this.parts = [];
	    return _this;
	  }

	  /**
	   * Turn input into valid layer.MessageParts.
	   *
	   * This method is automatically called any time the parts
	   * property is set (including during intialization).  This
	   * is where we convert strings into MessageParts, and instances
	   * into arrays.
	   *
	   * @method __adjustParts
	   * @private
	   * @param  {Mixed} parts -- Could be a string, array, object or MessagePart instance
	   * @return {layer.MessagePart[]}
	   */


	  _createClass$8(Message, [{
	    key: '__adjustParts',
	    value: function __adjustParts(parts) {
	      var _this2 = this;

	      var adjustedParts = void 0;
	      if (typeof parts === 'string') {
	        adjustedParts = [new MessagePart({
	          body: parts,
	          mimeType: 'text/plain',
	          clientId: this.clientId
	        })];
	      } else if (Array.isArray(parts)) {
	        adjustedParts = parts.map(function (part) {
	          var result = void 0;
	          if (part instanceof MessagePart) {
	            result = part;
	          } else {
	            result = new MessagePart(part);
	          }
	          result.clientId = _this2.clientId;
	          return result;
	        });
	      } else if (parts && (typeof parts === 'undefined' ? 'undefined' : _typeof$5(parts)) === 'object') {
	        parts.clientId = this.clientId;
	        adjustedParts = [new MessagePart(parts)];
	      }
	      this._setupPartIds(adjustedParts);
	      if (adjustedParts) {
	        adjustedParts.forEach(function (part) {
	          part.off('messageparts:change', _this2._onMessagePartChange, _this2); // if we already subscribed, don't create a redundant subscription
	          part.on('messageparts:change', _this2._onMessagePartChange, _this2);
	        });
	      }
	      return adjustedParts;
	    }

	    /**
	     * Add a layer.MessagePart to this Message.
	     *
	     * Should only be called on an unsent Message.
	     *
	     * ```
	     * message.addPart({mimeType: 'text/plain', body: 'Frodo really is a Dodo'});
	     *
	     * // OR
	     * message.addPart(new layer.MessagePart({mimeType: 'text/plain', body: 'Frodo really is a Dodo'}));
	     * ```
	     *
	     * @method addPart
	     * @param  {layer.MessagePart/Object} part - A layer.MessagePart instance or a `{mimeType: 'text/plain', body: 'Hello'}` formatted Object.
	     * @returns {layer.Message} this
	     */

	  }, {
	    key: 'addPart',
	    value: function addPart(part) {
	      if (part) {
	        part.clientId = this.clientId;
	        if (part instanceof MessagePart) {
	          this.parts.push(part);
	        } else if ((typeof part === 'undefined' ? 'undefined' : _typeof$5(part)) === 'object') {
	          this.parts.push(new MessagePart(part));
	        }
	        var index = this.parts.length - 1;
	        var thePart = this.parts[index];

	        thePart.off('messageparts:change', this._onMessagePartChange, this); // if we already subscribed, don't create a redundant subscription
	        thePart.on('messageparts:change', this._onMessagePartChange, this);
	        if (!part.id) part.id = this.id + '/parts/' + index;
	      }
	      return this;
	    }

	    /**
	     * Any time a Part changes, the Message has changed; trigger the `messages:change` event.
	     *
	     * Currently, this only looks at changes to body or mimeType, and does not handle changes to url/rich content.
	     *
	     * @method _onMessagePartChange
	     * @private
	     * @param {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_onMessagePartChange',
	    value: function _onMessagePartChange(evt) {
	      var _this3 = this;

	      evt.changes.forEach(function (change) {
	        _this3._triggerAsync('messages:change', {
	          property: 'parts.' + change.property,
	          oldValue: change.oldValue,
	          newValue: change.newValue,
	          part: evt.target
	        });
	      });
	    }

	    /**
	     * Your unsent Message will show up in Query results and be rendered in Message Lists.
	     *
	     * This method is only needed for Messages that should show up in a Message List Widget that
	     * is driven by Query data, but where the layer.Message.send method has not yet been called.
	     *
	     * Once you have called `presend` your message should show up in your Message List.  However,
	     * typically you want to be able to edit and rerender that Message. After making changes to the Message,
	     * you can trigger change events:
	     *
	     * ```
	     * var message = conversation.createMessage({parts: [{mimeType: 'custom/card', body: null}]});
	     * message.presend();
	     *
	     * message.parts[0].body = 'Frodo is a Dodo';
	     * message.trigger('messages:change');
	     * ```
	     *
	     * Note that if using Layer UI for Web, the `messages:change` event will trigger an `onRerender` call,
	     * not an `onRender` call, so the capacity to handle editing of messages will require the ability to render
	     * all possible edits within `onRerender`.
	     *
	     * It is assumed that at some point either `send()` or `destroy()` will be called on this message
	     * to complete or cancel this process.
	     *
	     * @method presend
	     * @return this
	     */

	  }, {
	    key: 'presend',
	    value: function presend() {
	      var _this4 = this;

	      var client = this.getClient();
	      if (!client) {
	        throw new Error(LayerError$4.dictionary.clientMissing);
	      }

	      var conversation = this.getConversation(false);

	      if (!conversation) {
	        throw new Error(LayerError$4.dictionary.conversationMissing);
	      }

	      if (this.syncState !== Constants.SYNC_STATE.NEW) {
	        throw new Error(LayerError$4.dictionary.alreadySent);
	      }
	      conversation._setupMessage(this);

	      // Make sure all data is in the right format for being rendered
	      this._readAllBlobs(function () {
	        client._addMessage(_this4);
	      });
	      return this;
	    }

	    /**
	     * Send the message to all participants of the Conversation.
	     *
	     * Message must have parts and a valid conversation to send successfully.
	     *
	     * The send method takes a `notification` object. In normal use, it provides the same notification to ALL
	     * recipients, but you can customize notifications on a per recipient basis, as well as embed actions into the notification.
	     * For the Full API, see https://developer.layer.com/docs/platform/messages#notification-customization.
	     *
	     * For the Full API, see [Server Docs](https://developer.layer.com/docs/platform/messages#notification-customization).
	     *
	     * ```
	     * message.send({
	     *    title: "New Hobbit Message",
	     *    text: "Frodo-the-Dodo: Hello Sam, what say we waltz into Mordor like we own the place?",
	     *    sound: "whinyhobbit.aiff"
	     * });
	     * ```
	     *
	     * @method send
	     * @param {Object} [notification] - Parameters for controling how the phones manage notifications of the new Message.
	     *                          See IOS and Android docs for details.
	     * @param {string} [notification.title] - Title to show on lock screen and notification bar
	     * @param {string} [notification.text] - Text of your notification
	     * @param {string} [notification.sound] - Name of an audio file or other sound-related hint
	     * @return {layer.Message} this
	     */

	  }, {
	    key: 'send',
	    value: function send(notification) {
	      var _this5 = this;

	      var client = this.getClient();
	      if (!client) {
	        throw new Error(LayerError$4.dictionary.clientMissing);
	      }

	      var conversation = this.getConversation(true);

	      if (!conversation) {
	        throw new Error(LayerError$4.dictionary.conversationMissing);
	      }

	      if (this.syncState !== Constants.SYNC_STATE.NEW) {
	        throw new Error(LayerError$4.dictionary.alreadySent);
	      }

	      if (conversation.isLoading) {
	        conversation.once(conversation.constructor.eventPrefix + ':loaded', function () {
	          return _this5.send(notification);
	        });
	        conversation._setupMessage(this);
	        return this;
	      }

	      if (!this.parts || !this.parts.length) {
	        throw new Error(LayerError$4.dictionary.partsMissing);
	      }

	      this._setSyncing();

	      // Make sure that the Conversation has been created on the server
	      // and update the lastMessage property
	      conversation.send(this);

	      // If we are sending any File/Blob objects, and their Mime Types match our test,
	      // wait until the body is updated to be a string rather than File before calling _addMessage
	      // which will add it to the Query Results and pass this on to a renderer that expects "text/plain" to be a string
	      // rather than a blob.
	      this._readAllBlobs(function () {
	        // Calling this will add this to any listening Queries... so position needs to have been set first;
	        // handled in conversation.send(this)
	        client._addMessage(_this5);

	        // allow for modification of message before sending
	        _this5.trigger('messages:sending');

	        var data = {
	          parts: new Array(_this5.parts.length),
	          id: _this5.id
	        };
	        if (notification && _this5.conversationId) data.notification = notification;

	        _this5._preparePartsForSending(data);
	      });
	      return this;
	    }

	    /**
	     * Any MessagePart that contains a textual blob should contain a string before we send.
	     *
	     * If a MessagePart with a Blob or File as its body were to be added to the Client,
	     * The Query would receive this, deliver it to apps and the app would crash.
	     * Most rendering code expecting text/plain would expect a string not a File.
	     *
	     * When this user is sending a file, and that file is textual, make sure
	     * its actual text delivered to the UI.
	     *
	     * @method _readAllBlobs
	     * @private
	     */

	  }, {
	    key: '_readAllBlobs',
	    value: function _readAllBlobs(callback) {
	      var count = 0;
	      var parts = this.parts.filter(function (part) {
	        return Util$2.isBlob(part.body) && part.isTextualMimeType();
	      });
	      parts.forEach(function (part) {
	        Util$2.fetchTextFromFile(part.body, function (text) {
	          part.body = text;
	          count++;
	          if (count === parts.length) callback();
	        });
	      });
	      if (!parts.length) callback();
	    }

	    /**
	     * Insures that each part is ready to send before actually sending the Message.
	     *
	     * @method _preparePartsForSending
	     * @private
	     * @param  {Object} structure to be sent to the server
	     */

	  }, {
	    key: '_preparePartsForSending',
	    value: function _preparePartsForSending(data) {
	      var _this6 = this;

	      var client = this.getClient();
	      var count = 0;
	      this.parts.forEach(function (part, index) {
	        part.once('parts:send', function (evt) {
	          data.parts[index] = {
	            mime_type: evt.mime_type
	          };
	          if (evt.content) data.parts[index].content = evt.content;
	          if (evt.body) data.parts[index].body = evt.body;
	          if (evt.encoding) data.parts[index].encoding = evt.encoding;

	          count++;
	          if (count === _this6.parts.length) {
	            _this6._send(data);
	          }
	        }, _this6);
	        part._send(client);
	      });
	    }

	    /**
	     * Handle the actual sending.
	     *
	     * layer.Message.send has some potentially asynchronous
	     * preprocessing to do before sending (Rich Content); actual sending
	     * is done here.
	     *
	     * @method _send
	     * @private
	     */

	  }, {
	    key: '_send',
	    value: function _send(data) {
	      var _this7 = this;

	      var client = this.getClient();
	      var conversation = this.getConversation(false);

	      this.getClient()._triggerAsync('state-change', {
	        started: true,
	        type: 'send_' + Util$2.typeFromID(this.id),
	        telemetryId: 'send_' + Util$2.typeFromID(this.id) + '_time',
	        id: this.id
	      });
	      this.sentAt = new Date();
	      client.sendSocketRequest({
	        method: 'POST',
	        body: {
	          method: 'Message.create',
	          object_id: conversation.id,
	          data: data
	        },
	        sync: {
	          depends: [this.conversationId, this.id],
	          target: this.id
	        }
	      }, function (success, socketData) {
	        return _this7._sendResult(success, socketData);
	      });
	    }
	  }, {
	    key: '_getSendData',
	    value: function _getSendData(data) {
	      data.object_id = this.conversationId;
	      return data;
	    }

	    /**
	      * layer.Message.send() Success Callback.
	      *
	      * If successfully sending the message; triggers a 'sent' event,
	      * and updates the message.id/url
	      *
	      * @method _sendResult
	      * @private
	      * @param {Object} messageData - Server description of the message
	      */

	  }, {
	    key: '_sendResult',
	    value: function _sendResult(_ref) {
	      var success = _ref.success,
	          data = _ref.data;

	      this.getClient()._triggerAsync('state-change', {
	        ended: true,
	        type: 'send_' + Util$2.typeFromID(this.id),
	        telemetryId: 'send_' + Util$2.typeFromID(this.id) + '_time',
	        result: success,
	        id: this.id
	      });
	      if (this.isDestroyed) return;

	      if (success) {
	        this._populateFromServer(data);
	        this._triggerAsync('messages:sent');
	        this._triggerAsync('messages:change', {
	          property: 'syncState',
	          oldValue: Constants.SYNC_STATE.SAVING,
	          newValue: Constants.SYNC_STATE.SYNCED
	        });
	      } else {
	        this.trigger('messages:sent-error', { error: data });
	        this.destroy();
	      }
	      this._setSynced();
	    }

	    /* NOT FOR JSDUCK
	     * Standard `on()` provided by layer.Root.
	     *
	     * Adds some special handling of 'messages:loaded' so that calls such as
	     *
	     *      var m = client.getMessage('layer:///messages/123', true)
	     *      .on('messages:loaded', function() {
	     *          myrerender(m);
	     *      });
	     *      myrender(m); // render a placeholder for m until the details of m have loaded
	     *
	     * can fire their callback regardless of whether the client loads or has
	     * already loaded the Message.
	     *
	     * @method on
	     * @param  {string} eventName
	     * @param  {Function} eventHandler
	     * @param  {Object} context
	     * @return {layer.Message} this
	     */

	  }, {
	    key: 'on',
	    value: function on(name, callback, context) {
	      var hasLoadedEvt = name === 'messages:loaded' || name && (typeof name === 'undefined' ? 'undefined' : _typeof$5(name)) === 'object' && name['messages:loaded'];

	      if (hasLoadedEvt && !this.isLoading) {
	        var callNow = name === 'messages:loaded' ? callback : name['messages:loaded'];
	        Util$2.defer(function () {
	          return callNow.apply(context);
	        });
	      }
	      _get$2(Message.prototype.__proto__ || Object.getPrototypeOf(Message.prototype), 'on', this).call(this, name, callback, context);
	      return this;
	    }

	    /**
	     * Remove this Message from the system.
	     *
	     * This will deregister the Message, remove all events
	     * and allow garbage collection.
	     *
	     * @method destroy
	     */

	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      var client = this.getClient();
	      if (client) client._removeMessage(this);
	      this.parts.forEach(function (part) {
	        return part.destroy();
	      });
	      this.__parts = null;

	      _get$2(Message.prototype.__proto__ || Object.getPrototypeOf(Message.prototype), 'destroy', this).call(this);
	    }

	    /**
	     * Setup message-part ids for parts that lack that id; for locally created parts.
	     *
	     * @private
	     * @method
	     * @param {layer.MessagePart[]} parts
	     */

	  }, {
	    key: '_setupPartIds',
	    value: function _setupPartIds(parts) {
	      var _this8 = this;

	      // Assign IDs to preexisting Parts so that we can call getPartById()
	      if (parts) {
	        parts.forEach(function (part, index) {
	          if (!part.id) part.id = _this8.id + '/parts/' + index;
	        });
	      }
	    }

	    /**
	     * Populates this instance with the description from the server.
	     *
	     * Can be used for creating or for updating the instance.
	     *
	     * @method _populateFromServer
	     * @protected
	     * @param  {Object} m - Server description of the message
	     */

	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(message) {
	      var _this9 = this;

	      this._inPopulateFromServer = true;
	      var client = this.getClient();

	      this.id = message.id;
	      this.url = message.url;
	      var oldPosition = this.position;
	      this.position = message.position;
	      this._setupPartIds(message.parts);
	      this.parts = message.parts.map(function (part) {
	        var existingPart = _this9.getPartById(part.id);
	        if (existingPart) {
	          existingPart._populateFromServer(part);
	          return existingPart;
	        } else {
	          return MessagePart._createFromServer(part);
	        }
	      });

	      this.recipientStatus = message.recipient_status || {};

	      this.isRead = 'is_unread' in message ? !message.is_unread : true;

	      this.sentAt = new Date(message.sent_at);
	      this.receivedAt = message.received_at ? new Date(message.received_at) : undefined;

	      var sender = void 0;
	      if (message.sender.id) {
	        sender = client.getIdentity(message.sender.id);
	      }

	      // Because there may be no ID, we have to bypass client._createObject and its switch statement.
	      if (!sender) {
	        sender = Identity$2._createFromServer(message.sender, client);
	      }
	      this.sender = sender;

	      this._setSynced();

	      if (oldPosition && oldPosition !== this.position) {
	        this._triggerAsync('messages:change', {
	          oldValue: oldPosition,
	          newValue: this.position,
	          property: 'position'
	        });
	      }
	      this._inPopulateFromServer = false;
	    }

	    /**
	     * Returns the Message's layer.MessagePart with the specified the part ID.
	     *
	     * ```
	     * var part = client.getMessagePart('layer:///messages/6f08acfa-3268-4ae5-83d9-6ca00000000/parts/0');
	     * ```
	     *
	     * @method getPartById
	     * @param {string} partId
	     * @return {layer.MessagePart}
	     */

	  }, {
	    key: 'getPartById',
	    value: function getPartById(partId) {
	      var part = this.parts ? this.parts.filter(function (aPart) {
	        return aPart.id === partId;
	      })[0] : null;
	      return part || null;
	    }

	    /**
	     * Accepts json-patch operations for modifying recipientStatus.
	     *
	     * @method _handlePatchEvent
	     * @private
	     * @param  {Object[]} data - Array of operations
	     */

	  }, {
	    key: '_handlePatchEvent',
	    value: function _handlePatchEvent(newValue, oldValue, paths) {
	      this._inLayerParser = false;
	      if (paths[0].indexOf('recipient_status') === 0) {
	        this.__updateRecipientStatus(this.recipientStatus, oldValue);
	      }
	      this._inLayerParser = true;
	    }

	    /**
	     * Returns absolute URL for this resource.
	     * Used by sync manager because the url may not be known
	     * at the time the sync request is enqueued.
	     *
	     * @method _getUrl
	     * @param {String} url - relative url and query string parameters
	     * @return {String} full url
	     * @private
	     */

	  }, {
	    key: '_getUrl',
	    value: function _getUrl(url) {
	      return this.url + (url || '');
	    }
	  }, {
	    key: '_setupSyncObject',
	    value: function _setupSyncObject(sync) {
	      if (sync !== false) {
	        sync = _get$2(Message.prototype.__proto__ || Object.getPrototypeOf(Message.prototype), '_setupSyncObject', this).call(this, sync);
	        if (!sync.depends) {
	          sync.depends = [this.conversationId];
	        } else if (sync.depends.indexOf(this.id) === -1) {
	          sync.depends.push(this.conversationId);
	        }
	      }
	      return sync;
	    }

	    /**
	     * Get all text parts of the Message.
	     *
	     * Utility method for extracting all of the text/plain parts
	     * and concatenating all of their bodys together into a single string.
	     *
	     * @method getText
	     * @param {string} [joinStr='.  '] If multiple message parts of type text/plain, how do you want them joined together?
	     * @return {string}
	     */

	  }, {
	    key: 'getText',
	    value: function getText() {
	      var joinStr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '. ';

	      var textArray = this.parts.filter(function (part) {
	        return part.mimeType === 'text/plain';
	      }).map(function (part) {
	        return part.body;
	      });
	      textArray = textArray.filter(function (data) {
	        return data;
	      });
	      return textArray.join(joinStr);
	    }

	    /**
	     * Returns a plain object.
	     *
	     * Object will have all the same public properties as this
	     * Message instance.  New object is returned any time
	     * any of this object's properties change.
	     *
	     * @method toObject
	     * @return {Object} POJO version of this object.
	     */

	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      if (!this._toObject) {
	        this._toObject = _get$2(Message.prototype.__proto__ || Object.getPrototypeOf(Message.prototype), 'toObject', this).call(this);
	      }
	      return this._toObject;
	    }
	  }, {
	    key: '_triggerAsync',
	    value: function _triggerAsync(evtName, args) {
	      this._clearObject();
	      _get$2(Message.prototype.__proto__ || Object.getPrototypeOf(Message.prototype), '_triggerAsync', this).call(this, evtName, args);
	    }
	  }, {
	    key: 'trigger',
	    value: function trigger(evtName, args) {
	      this._clearObject();
	      _get$2(Message.prototype.__proto__ || Object.getPrototypeOf(Message.prototype), 'trigger', this).call(this, evtName, args);
	    }

	    /**
	     * Identifies whether a Message receiving the specified patch data should be loaded from the server.
	     *
	     * Applies only to Messages that aren't already loaded; used to indicate if a change event is
	     * significant enough to load the Message and trigger change events on that Message.
	     *
	     * At this time there are no properties that are patched on Messages via websockets
	     * that would justify loading the Message from the server so as to notify the app.
	     *
	     * Only recipient status changes and maybe is_unread changes are sent;
	     * neither of which are relevant to an app that isn't rendering that message.
	     *
	     * @method _loadResourceForPatch
	     * @static
	     * @private
	     */

	  }], [{
	    key: '_loadResourceForPatch',
	    value: function _loadResourceForPatch(patchData) {
	      return false;
	    }
	  }]);

	  return Message;
	}(Syncable);

	/**
	 * Client that the Message belongs to.
	 *
	 * Actual value of this string matches the appId.
	 * @type {string}
	 * @readonly
	 */


	Message$1.prototype.clientId = '';

	/**
	 * Conversation ID or Channel ID that this Message belongs to.
	 *
	 * @type {string}
	 * @readonly
	 */
	Message$1.prototype.conversationId = '';

	/**
	 * Array of layer.MessagePart objects.
	 *
	 * Use layer.Message.addPart to modify this array.
	 *
	 * @type {layer.MessagePart[]}
	 * @readonly
	 */
	Message$1.prototype.parts = null;

	/**
	 * Time that the message was sent.
	 *
	 *  Note that a locally created layer.Message will have a `sentAt` value even
	 * though its not yet sent; this is so that any rendering code doesn't need
	 * to account for `null` values.  Sending the Message may cause a slight change
	 * in the `sentAt` value.
	 *
	 * @type {Date}
	 * @readonly
	 */
	Message$1.prototype.sentAt = null;

	/**
	 * Time that the first delivery receipt was sent by your
	 * user acknowledging receipt of the message.
	 * @type {Date}
	 * @readonly
	 */
	Message$1.prototype.receivedAt = null;

	/**
	 * Identity object representing the sender of the Message.
	 *
	 * Most commonly used properties of Identity are:
	 * * displayName: A name for your UI
	 * * userId: Name for the user as represented on your system
	 * * name: Represents the name of a service if the sender was an automated system.
	 *
	 *      <span class='sent-by'>
	 *        {message.sender.displayName || message.sender.name}
	 *      </span>
	 *
	 * @type {layer.Identity}
	 * @readonly
	 */
	Message$1.prototype.sender = null;

	/**
	 * Position of this message within the conversation.
	 *
	 * NOTES:
	 *
	 * 1. Deleting a message does not affect position of other Messages.
	 * 2. A position is not gaurenteed to be unique (multiple messages sent at the same time could
	 * all claim the same position)
	 * 3. Each successive message within a conversation should expect a higher position.
	 *
	 * @type {Number}
	 * @readonly
	 */
	Message$1.prototype.position = 0;

	/**
	 * Hint used by layer.Client on whether to trigger a messages:notify event.
	 *
	 * @type {boolean}
	 * @private
	 */
	Message$1.prototype._notify = false;

	/**
	 * This property is here for convenience only; it will always be the opposite of isRead.
	 * @type {Boolean}
	 * @readonly
	 */
	Object.defineProperty(Message$1.prototype, 'isUnread', {
	  enumerable: true,
	  get: function get() {
	    return !this.isRead;
	  }
	});

	Message$1.prototype._toObject = null;

	Message$1.prototype._inPopulateFromServer = false;

	Message$1.eventPrefix = 'messages';

	Message$1.eventPrefix = 'messages';

	Message$1.prefixUUID = 'layer:///messages/';

	Message$1.inObjectIgnore = Syncable.inObjectIgnore;

	Message$1.bubbleEventParent = 'getClient';

	Message$1.imageTypes = ['image/gif', 'image/png', 'image/jpeg', 'image/jpg'];

	Message$1._supportedEvents = [

	/**
	 * Message has been loaded from the server.
	 *
	 * Note that this is only used in response to the layer.Message.load() method.
	 *
	 * ```
	 * var m = client.getMessage('layer:///messages/123', true)
	 *    .on('messages:loaded', function() {
	 *        myrerender(m);
	 *    });
	 * myrender(m); // render a placeholder for m until the details of m have loaded
	 * ```
	 *
	 * @event
	 * @param {layer.LayerEvent} evt
	 */
	'messages:loaded',

	/**
	 * The load method failed to load the message from the server.
	 *
	 * Note that this is only used in response to the layer.Message.load() method.
	 * @event
	 * @param {layer.LayerEvent} evt
	 */
	'messages:loaded-error',

	/**
	 * Message deleted from the server.
	 *
	 * Caused by a call to layer.Message.delete() or a websocket event.
	 * @param {layer.LayerEvent} evt
	 * @event
	 */
	'messages:delete',

	/**
	 * Message is about to be sent.
	 *
	 * Last chance to modify or validate the message prior to sending.
	 *
	 *     message.on('messages:sending', function(evt) {
	 *        message.addPart({mimeType: 'application/location', body: JSON.stringify(getGPSLocation())});
	 *     });
	 *
	 * Typically, you would listen to this event more broadly using `client.on('messages:sending')`
	 * which would trigger before sending ANY Messages.
	 *
	 * @event
	 * @param {layer.LayerEvent} evt
	 */
	'messages:sending',

	/**
	 * Message has been received by the server.
	 *
	 * It does NOT indicate delivery to other users.
	 *
	 * It does NOT indicate messages sent by other users.
	 *
	 * @event
	 * @param {layer.LayerEvent} evt
	 */
	'messages:sent',

	/**
	 * Server failed to receive the Message.
	 *
	 * Message will be deleted immediately after firing this event.
	 *
	 * @event
	 * @param {layer.LayerEvent} evt
	 * @param {layer.LayerError} evt.error
	 */
	'messages:sent-error',

	/**
	 * The recipientStatus property has changed.
	 *
	 * This happens in response to an update
	 * from the server... but is also caused by marking the current user as having read
	 * or received the message.
	 * @event
	 * @param {layer.LayerEvent} evt
	 */
	'messages:change'].concat(Syncable._supportedEvents);

	Root$4.initClass.apply(Message$1, [Message$1, 'Message']);
	Syncable.subclasses.push(Message$1);
	var message = Message$1;

	var _typeof$6 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$14 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$7 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$14(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$10(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$10(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * A Container is a parent class representing a container that manages a set of Messages.
	 *
	 * @class  layer.Container
	 * @abstract
	 * @extends layer.Syncable
	 * @author  Michael Kantor
	 */
	var Syncable$4 = syncable;
	var LayerError$9 = layerError;
	var Util$5 = clientUtils;
	var Constants$3 = _const;
	var Root$10 = root;

	var Container$1 = function (_Syncable) {
	  _inherits$10(Container, _Syncable);

	  /**
	   * Create a new conversation.
	   *
	   * The static `layer.Conversation.create()` method
	   * will correctly lookup distinct Conversations and
	   * return them; `new layer.Conversation()` will not.
	   *
	   * Developers should use `layer.Conversation.create()`.
	   *
	   * @method constructor
	   * @protected
	   * @param  {Object} options
	   * @param {string[]/layer.Identity[]} options.participants - Array of Participant IDs or layer.Identity instances
	   * @param {boolean} [options.distinct=true] - Is the conversation distinct
	   * @param {Object} [options.metadata] - An object containing Conversation Metadata.
	   * @return {layer.Conversation}
	   */
	  function Container() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$14(this, Container);

	    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
	    if (options.fromServer) options.id = options.fromServer.id;

	    // Make sure we have an clientId property
	    if (options.client) options.clientId = options.client.appId;
	    if (!options.metadata) options.metadata = {};

	    var _this = _possibleConstructorReturn$10(this, (Container.__proto__ || Object.getPrototypeOf(Container)).call(this, options));

	    if (!_this.clientId) throw new Error(LayerError$9.dictionary.clientMissing);
	    _this.isInitializing = true;

	    // If the options contains a full server definition of the object,
	    // copy it in with _populateFromServer; this will add the Conversation
	    // to the Client as well.
	    if (options && options.fromServer) {
	      _this._populateFromServer(options.fromServer);
	    }

	    if (!_this.metadata) _this.metadata = {};

	    if (!_this.createdAt) {
	      _this.createdAt = new Date();
	    }
	    _this.isInitializing = false;
	    return _this;
	  }

	  _createClass$14(Container, [{
	    key: 'send',
	    value: function send(message) {
	      var _this2 = this;

	      if (this.isNew()) {
	        this.createdAt = new Date();

	        // Update the syncState
	        this._setSyncing();

	        this.getClient()._triggerAsync('state-change', {
	          started: true,
	          type: 'send_' + Util$5.typeFromID(this.id),
	          telemetryId: 'send_' + Util$5.typeFromID(this.id) + '_time',
	          id: this.id
	        });
	        this.getClient().sendSocketRequest({
	          method: 'POST',
	          body: {}, // see _getSendData
	          sync: {
	            depends: this.id,
	            target: this.id
	          }
	        }, function (result) {
	          return _this2._createResult(result);
	        });
	      }
	      if (message) this._setupMessage(message);
	      return this;
	    }

	    /**
	     * Populates this instance using server-data.
	     *
	     * Side effects add this to the Client.
	     *
	     * @method _populateFromServer
	     * @private
	     * @param  {Object} container - Server representation of the container
	     */

	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(container) {
	      var client = this.getClient();

	      this._setSynced();

	      var id = this.id;
	      this.id = container.id;

	      // IDs change if the server returns a matching Container
	      if (id !== this.id) {
	        client._updateContainerId(this, id);
	        this._triggerAsync(this.constructor.eventPrefix + ':change', {
	          oldValue: id,
	          newValue: this.id,
	          property: 'id'
	        });
	      }

	      this.url = container.url;
	      this.createdAt = new Date(container.created_at);
	      this.metadata = container.metadata;
	    }

	    /**
	     * Process result of send method.
	     *
	     * Note that we use _triggerAsync so that
	     * events reporting changes to the layer.Conversation.id can
	     * be applied before reporting on it being sent.
	     *
	     * Example: Query will now have the resolved Distinct IDs rather than the proposed ID
	     * when this event is triggered.
	     *
	     * @method _createResult
	     * @private
	     * @param  {Object} result
	     */

	  }, {
	    key: '_createResult',
	    value: function _createResult(_ref) {
	      var success = _ref.success,
	          data = _ref.data;

	      this.getClient()._triggerAsync('state-change', {
	        ended: true,
	        type: 'send_' + Util$5.typeFromID(this.id),
	        telemetryId: 'send_' + Util$5.typeFromID(this.id) + '_time',
	        id: this.id
	      });
	      if (this.isDestroyed) return;
	      if (success) {
	        this._createSuccess(data);
	      } else if (data.id === 'conflict') {
	        this._createResultConflict(data);
	      } else {
	        this.trigger(this.constructor.eventPrefix + ':sent-error', { error: data });
	        this.destroy();
	      }
	    }

	    /**
	     * Process the successful result of a create call
	     *
	     * @method _createSuccess
	     * @private
	     * @param  {Object} data Server description of Conversation/Channel
	     */

	  }, {
	    key: '_createSuccess',
	    value: function _createSuccess(data) {
	      var id = this.id;
	      this._populateFromServer(data);
	      this._triggerAsync(this.constructor.eventPrefix + ':sent', {
	        result: id === this.id ? Container.CREATED : Container.FOUND
	      });
	    }

	    /**
	     * Updates specified metadata keys.
	     *
	     * Updates the local object's metadata and syncs the change to the server.
	     *
	     *      conversation.setMetadataProperties({
	     *          'title': 'I am a title',
	     *          'colors.background': 'red',
	     *          'colors.text': {
	     *              'fill': 'blue',
	     *              'shadow': 'black'
	     *           },
	     *           'colors.title.fill': 'red'
	     *      });
	     *
	     * Use setMetadataProperties to specify the path to a property, and a new value for that property.
	     * Multiple properties can be changed this way.  Whatever value was there before is
	     * replaced with the new value; so in the above example, whatever other keys may have
	     * existed under `colors.text` have been replaced by the new object `{fill: 'blue', shadow: 'black'}`.
	     *
	     * Note also that only string and subobjects are accepted as values.
	     *
	     * Keys with '.' will update a field of an object (and create an object if it wasn't there):
	     *
	     * Initial metadata: {}
	     *
	     *      conversation.setMetadataProperties({
	     *          'colors.background': 'red',
	     *      });
	     *
	     * Metadata is now: `{colors: {background: 'red'}}`
	     *
	     *      conversation.setMetadataProperties({
	     *          'colors.foreground': 'black',
	     *      });
	     *
	     * Metadata is now: `{colors: {background: 'red', foreground: 'black'}}`
	     *
	     * Executes as follows:
	     *
	     * 1. Updates the metadata property of the local object
	     * 2. Triggers a conversations:change event
	     * 3. Submits a request to be sent to the server to update the server's object
	     * 4. If there is an error, no errors are fired except by layer.SyncManager, but another
	     *    conversations:change event is fired as the change is rolled back.
	     *
	     * @method setMetadataProperties
	     * @param  {Object} properties
	     * @return {layer.Conversation} this
	     *
	     */

	  }, {
	    key: 'setMetadataProperties',
	    value: function setMetadataProperties(props) {
	      var _this3 = this;

	      var layerPatchOperations = [];
	      Object.keys(props).forEach(function (name) {
	        var fullName = name;
	        if (name) {
	          if (name !== 'metadata' && name.indexOf('metadata.') !== 0) {
	            fullName = 'metadata.' + name;
	          }
	          layerPatchOperations.push({
	            operation: 'set',
	            property: fullName,
	            value: props[name]
	          });
	        }
	      });

	      this._inLayerParser = true;

	      // Do this before setSyncing as if there are any errors, we should never even
	      // start setting up a request.
	      Util$5.layerParse({
	        object: this,
	        type: 'Conversation',
	        operations: layerPatchOperations,
	        client: this.getClient()
	      });
	      this._inLayerParser = false;

	      this._xhr({
	        url: '',
	        method: 'PATCH',
	        data: JSON.stringify(layerPatchOperations),
	        headers: {
	          'content-type': 'application/vnd.layer-patch+json'
	        }
	      }, function (result) {
	        if (!result.success && !_this3.isDestroyed && result.data.id !== 'authentication_required') _this3._load();
	      });

	      return this;
	    }

	    /**
	     * Deletes specified metadata keys.
	     *
	     * Updates the local object's metadata and syncs the change to the server.
	     *
	     *      conversation.deleteMetadataProperties(
	     *          ['title', 'colors.background', 'colors.title.fill']
	     *      );
	     *
	     * Use deleteMetadataProperties to specify paths to properties to be deleted.
	     * Multiple properties can be deleted.
	     *
	     * Executes as follows:
	     *
	     * 1. Updates the metadata property of the local object
	     * 2. Triggers a conversations:change event
	     * 3. Submits a request to be sent to the server to update the server's object
	     * 4. If there is an error, no errors are fired except by layer.SyncManager, but another
	     *    conversations:change event is fired as the change is rolled back.
	     *
	     * @method deleteMetadataProperties
	     * @param  {string[]} properties
	     * @return {layer.Conversation} this
	     */

	  }, {
	    key: 'deleteMetadataProperties',
	    value: function deleteMetadataProperties(props) {
	      var _this4 = this;

	      var layerPatchOperations = [];
	      props.forEach(function (property) {
	        if (property !== 'metadata' && property.indexOf('metadata.') !== 0) {
	          property = 'metadata.' + property;
	        }
	        layerPatchOperations.push({
	          operation: 'delete',
	          property: property
	        });
	      }, this);

	      this._inLayerParser = true;

	      // Do this before setSyncing as if there are any errors, we should never even
	      // start setting up a request.
	      Util$5.layerParse({
	        object: this,
	        type: 'Conversation',
	        operations: layerPatchOperations,
	        client: this.getClient()
	      });
	      this._inLayerParser = false;

	      this._xhr({
	        url: '',
	        method: 'PATCH',
	        data: JSON.stringify(layerPatchOperations),
	        headers: {
	          'content-type': 'application/vnd.layer-patch+json'
	        }
	      }, function (result) {
	        if (!result.success && result.data.id !== 'authentication_required') _this4._load();
	      });

	      return this;
	    }

	    /**
	     * Delete the Conversation from the server (internal version).
	     *
	     * This version of Delete takes a Query String that is packaged up by
	     * layer.Conversation.delete and layer.Conversation.leave.
	     *
	     * @method _delete
	     * @private
	     * @param {string} queryStr - Query string for the DELETE request
	     */

	  }, {
	    key: '_delete',
	    value: function _delete(queryStr) {
	      var _this5 = this;

	      var id = this.id;
	      this._xhr({
	        method: 'DELETE',
	        url: '?' + queryStr
	      }, function (result) {
	        return _this5._deleteResult(result, id);
	      });

	      this._deleted();
	      this.destroy();
	    }
	  }, {
	    key: '_handleWebsocketDelete',
	    value: function _handleWebsocketDelete(data) {
	      if (data.mode === Constants$3.DELETION_MODE.MY_DEVICES && data.from_position) {
	        this.getClient()._purgeMessagesByPosition(this.id, data.from_position);
	      } else {
	        _get$7(Container.prototype.__proto__ || Object.getPrototypeOf(Container.prototype), '_handleWebsocketDelete', this).call(this);
	      }
	    }
	  }, {
	    key: '_getUrl',
	    value: function _getUrl(url) {
	      return this.url + (url || '');
	    }
	  }, {
	    key: '_loaded',
	    value: function _loaded(data) {
	      this._register(this);
	    }

	    /**
	     * Standard `on()` provided by layer.Root.
	     *
	     * Adds some special handling of 'conversations:loaded' so that calls such as
	     *
	     *      var c = client.getConversation('layer:///conversations/123', true)
	     *      .on('conversations:loaded', function() {
	     *          myrerender(c);
	     *      });
	     *      myrender(c); // render a placeholder for c until the details of c have loaded
	     *
	     * can fire their callback regardless of whether the client loads or has
	     * already loaded the Conversation.
	     *
	     * @method on
	     * @param  {string} eventName
	     * @param  {Function} callback
	     * @param  {Object} context
	     * @return {layer.Conversation} this
	     */

	  }, {
	    key: 'on',
	    value: function on(name, callback, context) {
	      var evtName = this.constructor.eventPrefix + ':loaded';
	      var hasLoadedEvt = name === evtName || name && (typeof name === 'undefined' ? 'undefined' : _typeof$6(name)) === 'object' && name[evtName];

	      if (hasLoadedEvt && !this.isLoading) {
	        var callNow = name === evtName ? callback : name[evtName];
	        Util$5.defer(function () {
	          return callNow.apply(context);
	        });
	      }
	      _get$7(Container.prototype.__proto__ || Object.getPrototypeOf(Container.prototype), 'on', this).call(this, name, callback, context);

	      return this;
	    }
	  }, {
	    key: '_triggerAsync',
	    value: function _triggerAsync(evtName, args) {
	      this._clearObject();
	      _get$7(Container.prototype.__proto__ || Object.getPrototypeOf(Container.prototype), '_triggerAsync', this).call(this, evtName, args);
	    }
	  }, {
	    key: 'trigger',
	    value: function trigger(evtName, args) {
	      this._clearObject();
	      _get$7(Container.prototype.__proto__ || Object.getPrototypeOf(Container.prototype), 'trigger', this).call(this, evtName, args);
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any change in the metadata property will call this method and fire a
	     * change event.  Changes to the metadata object that don't replace the object
	     * with a new object will require directly calling this method.
	     *
	     * @method __updateMetadata
	     * @private
	     * @param  {Object} newValue
	     * @param  {Object} oldValue
	     */

	  }, {
	    key: '__updateMetadata',
	    value: function __updateMetadata(newValue, oldValue, paths) {
	      if (this._inLayerParser) return;
	      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
	        this._triggerAsync(this.constructor.eventPrefix + ':change', {
	          property: 'metadata',
	          newValue: newValue,
	          oldValue: oldValue,
	          paths: paths
	        });
	      }
	    }
	  }, {
	    key: '_handlePatchEvent',
	    value: function _handlePatchEvent(newValue, oldValue, paths) {
	      if (paths[0].indexOf('metadata') === 0) {
	        this.__updateMetadata(newValue, oldValue, paths);
	      }
	    }

	    /**
	     * Returns a plain object.
	     *
	     * Object will have all the same public properties as this
	     * Conversation instance.  New object is returned any time
	     * any of this object's properties change.
	     *
	     * @method toObject
	     * @return {Object} POJO version of this.
	     */

	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      if (!this._toObject) {
	        this._toObject = _get$7(Container.prototype.__proto__ || Object.getPrototypeOf(Container.prototype), 'toObject', this).call(this);
	        this._toObject.metadata = Util$5.clone(this.metadata);
	      }
	      return this._toObject;
	    }

	    /**
	     * Identifies whether a Conversation receiving the specified patch data should be loaded from the server.
	     *
	     * Any change to a Conversation indicates that the Conversation is active and of potential interest; go ahead and load that
	     * Conversation in case the app has need of it.  In the future we may ignore changes to unread count.  Only relevant
	     * when we get Websocket events for a Conversation that has not been loaded/cached on Client.
	     *
	     * @method _loadResourceForPatch
	     * @static
	     * @private
	     */

	  }], [{
	    key: '_loadResourceForPatch',
	    value: function _loadResourceForPatch(patchData) {
	      return true;
	    }
	  }]);

	  return Container;
	}(Syncable$4);

	/**
	 * Time that the conversation was created on the server.
	 *
	 * @type {Date}
	 */


	Container$1.prototype.createdAt = null;

	/**
	 * Metadata for the conversation.
	 *
	 * Metadata values can be plain objects and strings, but
	 * no arrays, numbers, booleans or dates.
	 * @type {Object}
	 */
	Container$1.prototype.metadata = null;

	/**
	 * The authenticated user is a current participant in this Conversation.
	 *
	 * Set to false if the authenticated user has been removed from this conversation.
	 *
	 * A removed user can see messages up to the time they were removed,
	 * but can no longer interact with the conversation.
	 *
	 * A removed user can no longer see the participant list.
	 *
	 * Read and Delivery receipts will fail on any Message in such a Conversation.
	 *
	 * @type {Boolean}
	 */
	Container$1.prototype.isCurrentParticipant = true;

	/**
	 * Cache's a Distinct Event.
	 *
	 * On creating a Channel or Conversation that already exists,
	 * when the send() method is called, we should trigger
	 * specific events detailing the results.  Results
	 * may be determined locally or on the server, but same Event may be needed.
	 *
	 * @type {layer.LayerEvent}
	 * @private
	 */
	Container$1.prototype._sendDistinctEvent = null;

	/**
	 * Caches last result of toObject()
	 * @type {Object}
	 * @private
	 */
	Container$1.prototype._toObject = null;

	/**
	 * Property to look for when bubbling up events.
	 * @type {String}
	 * @static
	 * @private
	 */
	Container$1.bubbleEventParent = 'getClient';

	/**
	 * The Conversation/Channel that was requested has been created.
	 *
	 * Used in `conversations:sent` events.
	 * @type {String}
	 * @static
	 */
	Container$1.CREATED = 'Created';

	/**
	 * The Conversation/Channel that was requested has been found.
	 *
	 * This means that it did not need to be created.
	 *
	 * Used in `conversations:sent` events.
	 * @type {String}
	 * @static
	 */
	Container$1.FOUND = 'Found';

	/**
	 * The Conversation/Channel that was requested has been found, but there was a mismatch in metadata.
	 *
	 * If the createConversation request contained metadata and it did not match the Distinct Conversation
	 * that matched the requested participants, then this value is passed to notify your app that the Conversation
	 * was returned but does not exactly match your request.
	 *
	 * Used in `conversations:sent` events.
	 * @type {String}
	 * @static
	 */
	Container$1.FOUND_WITHOUT_REQUESTED_METADATA = 'FoundMismatch';

	Root$10.initClass.apply(Container$1, [Container$1, 'Container']);
	Syncable$4.subclasses.push(Container$1);
	var container = Container$1;

	var _createClass$15 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$8 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$15(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$11(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$11(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * A layer.Message instance for use within layer.Conversation.
	 *
	 * @class layer.Message.ConversationMessage
	 * @extends layer.Message
	 */
	var Root$11 = root;
	var Message$2 = message;
	var ClientRegistry$3 = clientRegistry;
	var LayerError$10 = layerError;
	var Constants$4 = _const;
	var Util$6 = clientUtils;

	var ConversationMessage$2 = function (_Message) {
	  _inherits$11(ConversationMessage, _Message);

	  function ConversationMessage(options) {
	    _classCallCheck$15(this, ConversationMessage);

	    if (options.conversation) options.conversationId = options.conversation.id;

	    var _this = _possibleConstructorReturn$11(this, (ConversationMessage.__proto__ || Object.getPrototypeOf(ConversationMessage)).call(this, options));

	    _this._disableEvents = true;
	    if (!options.fromServer) _this.recipientStatus = {};else _this.__updateRecipientStatus(_this.recipientStatus);
	    _this._disableEvents = false;

	    var client = _this.getClient();
	    _this.isInitializing = false;
	    if (options && options.fromServer) {
	      client._addMessage(_this);
	      var status = _this.recipientStatus[client.user.id];
	      if (status && status !== Constants$4.RECEIPT_STATE.READ && status !== Constants$4.RECEIPT_STATE.DELIVERED) {
	        Util$6.defer(function () {
	          return _this._sendReceipt('delivery');
	        });
	      }
	    }
	    return _this;
	  }

	  /**
	   * Get the layer.Conversation associated with this layer.Message.ConversationMessage.
	   *
	   * @method getConversation
	   * @param {Boolean} load       Pass in true if the layer.Conversation should be loaded if not found locally
	   * @return {layer.Conversation}
	   */


	  _createClass$15(ConversationMessage, [{
	    key: 'getConversation',
	    value: function getConversation(load) {
	      if (this.conversationId) {
	        return ClientRegistry$3.get(this.clientId).getConversation(this.conversationId, load);
	      }
	      return null;
	    }

	    /**
	     * On loading this one item from the server, after _populateFromServer has been called, due final setup.
	     *
	     * @method _loaded
	     * @private
	     * @param {Object} data  Data from server
	     */

	  }, {
	    key: '_loaded',
	    value: function _loaded(data) {
	      this.conversationId = data.conversation.id;
	      this.getClient()._addMessage(this);
	    }

	    /**
	     * Accessor called whenever the app accesses `message.recipientStatus`.
	     *
	     * Insures that participants who haven't yet been sent the Message are marked as layer.Constants.RECEIPT_STATE.PENDING
	     *
	     * @method __getRecipientStatus
	     * @param {string} pKey - The actual property key where the value is stored
	     * @private
	     * @return {Object}
	     */

	  }, {
	    key: '__getRecipientStatus',
	    value: function __getRecipientStatus(pKey) {
	      var value = this[pKey] || {};
	      var client = this.getClient();
	      if (client) {
	        var id = client.user.id;
	        var conversation = this.getConversation(false);
	        if (conversation) {
	          conversation.participants.forEach(function (participant) {
	            if (!value[participant.id]) {
	              value[participant.id] = participant.id === id ? Constants$4.RECEIPT_STATE.READ : Constants$4.RECEIPT_STATE.PENDING;
	            }
	          });
	        }
	      }
	      return value;
	    }

	    /**
	     * Handle changes to the recipientStatus property.
	     *
	     * Any time the recipientStatus property is set,
	     * Recalculate all of the receipt related properties:
	     *
	     * 1. isRead
	     * 2. readStatus
	     * 3. deliveryStatus
	     *
	     * @method __updateRecipientStatus
	     * @private
	     * @param  {Object} status - Object describing the delivered/read/sent value for each participant
	     *
	     */

	  }, {
	    key: '__updateRecipientStatus',
	    value: function __updateRecipientStatus(status, oldStatus) {
	      var conversation = this.getConversation(false);
	      var client = this.getClient();

	      if (!conversation || Util$6.doesObjectMatch(status, oldStatus)) return;

	      var id = client.user.id;
	      var isSender = this.sender.sessionOwner;
	      var userHasRead = status[id] === Constants$4.RECEIPT_STATE.READ;

	      try {
	        // -1 so we don't count this user
	        var userCount = conversation.participants.length - 1;

	        // If sent by this user or read by this user, update isRead/unread
	        if (!this.__isRead && (isSender || userHasRead)) {
	          this.__isRead = true; // no __updateIsRead event fired
	        }

	        // Update the readStatus/deliveryStatus properties

	        var _getReceiptStatus2 = this._getReceiptStatus(status, id),
	            readCount = _getReceiptStatus2.readCount,
	            deliveredCount = _getReceiptStatus2.deliveredCount;

	        this._setReceiptStatus(readCount, deliveredCount, userCount);
	      } catch (error) {}
	      // Do nothing


	      // Only trigger an event
	      // 1. we're not initializing a new Message
	      // 2. the user's state has been updated to read; we don't care about updates from other users if we aren't the sender.
	      //    We also don't care about state changes to delivered; these do not inform rendering as the fact we are processing it
	      //    proves its delivered.
	      // 3. The user is the sender; in that case we do care about rendering receipts from other users
	      if (!this.isInitializing && oldStatus) {
	        var usersStateUpdatedToRead = userHasRead && oldStatus[id] !== Constants$4.RECEIPT_STATE.READ;
	        if (usersStateUpdatedToRead || isSender) {
	          this._triggerAsync('messages:change', {
	            oldValue: oldStatus,
	            newValue: status,
	            property: 'recipientStatus'
	          });
	        }
	      }
	    }

	    /**
	     * Get the number of participants who have read and been delivered
	     * this Message
	     *
	     * @method _getReceiptStatus
	     * @private
	     * @param  {Object} status - Object describing the delivered/read/sent value for each participant
	     * @param  {string} id - Identity ID for this user; not counted when reporting on how many people have read/received.
	     * @return {Object} result
	     * @return {number} result.readCount
	     * @return {number} result.deliveredCount
	     */

	  }, {
	    key: '_getReceiptStatus',
	    value: function _getReceiptStatus(status, id) {
	      var readCount = 0,
	          deliveredCount = 0;
	      Object.keys(status).filter(function (participant) {
	        return participant !== id;
	      }).forEach(function (participant) {
	        if (status[participant] === Constants$4.RECEIPT_STATE.READ) {
	          readCount++;
	          deliveredCount++;
	        } else if (status[participant] === Constants$4.RECEIPT_STATE.DELIVERED) {
	          deliveredCount++;
	        }
	      });

	      return {
	        readCount: readCount,
	        deliveredCount: deliveredCount
	      };
	    }

	    /**
	     * Sets the layer.Message.ConversationMessage.readStatus and layer.Message.ConversationMessage.deliveryStatus properties.
	     *
	     * @method _setReceiptStatus
	     * @private
	     * @param  {number} readCount
	     * @param  {number} deliveredCount
	     * @param  {number} userCount
	     */

	  }, {
	    key: '_setReceiptStatus',
	    value: function _setReceiptStatus(readCount, deliveredCount, userCount) {
	      if (readCount === userCount) {
	        this.readStatus = Constants$4.RECIPIENT_STATE.ALL;
	      } else if (readCount > 0) {
	        this.readStatus = Constants$4.RECIPIENT_STATE.SOME;
	      } else {
	        this.readStatus = Constants$4.RECIPIENT_STATE.NONE;
	      }
	      if (deliveredCount === userCount) {
	        this.deliveryStatus = Constants$4.RECIPIENT_STATE.ALL;
	      } else if (deliveredCount > 0) {
	        this.deliveryStatus = Constants$4.RECIPIENT_STATE.SOME;
	      } else {
	        this.deliveryStatus = Constants$4.RECIPIENT_STATE.NONE;
	      }
	    }

	    /**
	     * Handle changes to the isRead property.
	     *
	     * If someone called m.isRead = true, AND
	     * if it was previously false, AND
	     * if the call didn't come from layer.Message.ConversationMessage.__updateRecipientStatus,
	     * Then notify the server that the message has been read.
	     *
	     *
	     * @method __updateIsRead
	     * @private
	     * @param  {boolean} value - True if isRead is true.
	     */

	  }, {
	    key: '__updateIsRead',
	    value: function __updateIsRead(value) {
	      if (value) {
	        if (!this._inPopulateFromServer && !this.getConversation()._inMarkAllAsRead) {
	          this._sendReceipt(Constants$4.RECEIPT_STATE.READ);
	        }
	        this._triggerMessageRead();
	        var conversation = this.getConversation(false);
	        if (conversation) conversation.unreadCount--;
	      }
	    }

	    /**
	     * Trigger events indicating changes to the isRead/isUnread properties.
	     *
	     * @method _triggerMessageRead
	     * @private
	     */

	  }, {
	    key: '_triggerMessageRead',
	    value: function _triggerMessageRead() {
	      var value = this.isRead;
	      this._triggerAsync('messages:change', {
	        property: 'isRead',
	        oldValue: !value,
	        newValue: value
	      });
	      this._triggerAsync('messages:change', {
	        property: 'isUnread',
	        oldValue: value,
	        newValue: !value
	      });
	    }

	    /**
	     * Send a Read or Delivery Receipt to the server.
	     *
	     * For Read Receipt, you can also just write:
	     *
	     * ```
	     * message.isRead = true;
	     * ```
	     *
	     * You can retract a Delivery or Read Receipt; once marked as Delivered or Read, it can't go back.
	     *
	     * ```
	     * messsage.sendReceipt(layer.Constants.RECEIPT_STATE.READ);
	     * ```
	     *
	     * @method sendReceipt
	     * @param {string} [type=layer.Constants.RECEIPT_STATE.READ] - One of layer.Constants.RECEIPT_STATE.READ or layer.Constants.RECEIPT_STATE.DELIVERY
	     * @return {layer.Message.ConversationMessage} this
	     */

	  }, {
	    key: 'sendReceipt',
	    value: function sendReceipt() {
	      var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : Constants$4.RECEIPT_STATE.READ;

	      if (type === Constants$4.RECEIPT_STATE.READ) {
	        if (this.isRead) {
	          return this;
	        } else {
	          // Without triggering the event, clearObject isn't called,
	          // which means those using the toObject() data will have an isRead that doesn't match
	          // this instance.  Which typically leads to lots of extra attempts
	          // to mark the message as read.
	          this.__isRead = true;
	          this._triggerMessageRead();
	          var conversation = this.getConversation(false);
	          if (conversation) conversation.unreadCount--;
	        }
	      }
	      this._sendReceipt(type);
	      return this;
	    }

	    /**
	     * Send a Read or Delivery Receipt to the server.
	     *
	     * This bypasses any validation and goes direct to sending to the server.
	     *
	     * NOTE: Server errors are not handled; the local receipt state is suitable even
	     * if out of sync with the server.
	     *
	     * @method _sendReceipt
	     * @private
	     * @param {string} [type=read] - One of layer.Constants.RECEIPT_STATE.READ or layer.Constants.RECEIPT_STATE.DELIVERY
	     */

	  }, {
	    key: '_sendReceipt',
	    value: function _sendReceipt(type) {
	      var _this2 = this;

	      // This little test exists so that we don't send receipts on Conversations we are no longer
	      // participants in (participants = [] if we are not a participant)
	      var conversation = this.getConversation(false);
	      if (conversation && conversation.participants.length === 0) return;

	      this._setSyncing();
	      this._xhr({
	        url: '/receipts',
	        method: 'POST',
	        data: {
	          type: type
	        },
	        sync: {
	          // This should not be treated as a POST/CREATE request on the Message
	          operation: 'RECEIPT'
	        }
	      }, function () {
	        return _this2._setSynced();
	      });
	    }

	    /**
	     * Delete the Message from the server.
	     *
	     * This call will support various deletion modes.  Calling without a deletion mode is deprecated.
	     *
	     * Deletion Modes:
	     *
	     * * layer.Constants.DELETION_MODE.ALL: This deletes the local copy immediately, and attempts to also
	     *   delete the server's copy.
	     * * layer.Constants.DELETION_MODE.MY_DEVICES: Deletes this Message from all of my devices; no effect on other users.
	     *
	     * @method delete
	     * @param {String} deletionMode
	     */
	    // Abstract Method

	  }, {
	    key: 'delete',
	    value: function _delete(mode) {
	      if (this.isDestroyed) throw new Error(LayerError$10.dictionary.isDestroyed);
	      var queryStr = void 0;
	      switch (mode) {
	        case Constants$4.DELETION_MODE.ALL:
	        case true:
	          queryStr = 'mode=all_participants';
	          break;
	        case Constants$4.DELETION_MODE.MY_DEVICES:
	          queryStr = 'mode=my_devices';
	          break;
	        default:
	          throw new Error(LayerError$10.dictionary.deletionModeUnsupported);
	      }

	      var id = this.id;
	      var client = this.getClient();
	      this._xhr({
	        url: '?' + queryStr,
	        method: 'DELETE'
	      }, function (result) {
	        if (!result.success && (!result.data || result.data.id !== 'not_found' && result.data.id !== 'authentication_required')) {
	          Message$2.load(id, client);
	        }
	      });

	      this._deleted();
	      this.destroy();
	    }
	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      if (!this._toObject) {
	        this._toObject = _get$8(ConversationMessage.prototype.__proto__ || Object.getPrototypeOf(ConversationMessage.prototype), 'toObject', this).call(this);
	        this._toObject.recipientStatus = Util$6.clone(this.recipientStatus);
	      }
	      return this._toObject;
	    }

	    /*
	     * Creates a message from the server's representation of a message.
	     *
	     * Similar to _populateFromServer, however, this method takes a
	     * message description and returns a new message instance using _populateFromServer
	     * to setup the values.
	     *
	     * @method _createFromServer
	     * @protected
	     * @static
	     * @param  {Object} message - Server's representation of the message
	     * @param  {layer.Client} client
	     * @return {layer.Message.ConversationMessage}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(message$$1, client) {
	      var fromWebsocket = message$$1.fromWebsocket;
	      var conversationId = void 0;
	      if (message$$1.conversation) {
	        conversationId = message$$1.conversation.id;
	      } else {
	        conversationId = message$$1.conversationId;
	      }

	      return new ConversationMessage({
	        conversationId: conversationId,
	        fromServer: message$$1,
	        clientId: client.appId,
	        _fromDB: message$$1._fromDB,
	        _notify: fromWebsocket && message$$1.is_unread && message$$1.sender.user_id !== client.user.userId
	      });
	    }
	  }]);

	  return ConversationMessage;
	}(Message$2);

	/**
	 * True if this Message has been read by this user.
	 *
	 * You can change isRead programatically
	 *
	 *      m.isRead = true;
	 *
	 * This will automatically notify the server that the message was read by your user.
	 * @type {Boolean}
	 */


	ConversationMessage$2.prototype.isRead = false;

	/**
	 * Read/delivery State of all participants.
	 *
	 * This is an object containing keys for each participant,
	 * and a value of:
	 *
	 * * layer.RECEIPT_STATE.SENT
	 * * layer.RECEIPT_STATE.DELIVERED
	 * * layer.RECEIPT_STATE.READ
	 * * layer.RECEIPT_STATE.PENDING
	 *
	 * @type {Object}
	 */
	ConversationMessage$2.prototype.recipientStatus = null;

	/**
	 * Have the other participants read this Message yet.
	 *
	 * This value is one of:
	 *
	 *  * layer.Constants.RECIPIENT_STATE.ALL
	 *  * layer.Constants.RECIPIENT_STATE.SOME
	 *  * layer.Constants.RECIPIENT_STATE.NONE
	 *
	 *  This value is updated any time recipientStatus changes.
	 *
	 * See layer.Message.ConversationMessage.recipientStatus for a more detailed report.
	 *
	 * @type {String}
	 */
	ConversationMessage$2.prototype.readStatus = Constants$4.RECIPIENT_STATE.NONE;

	/**
	 * Have the other participants received this Message yet.
	 *
	  * This value is one of:
	 *
	 *  * layer.Constants.RECIPIENT_STATE.ALL
	 *  * layer.Constants.RECIPIENT_STATE.SOME
	 *  * layer.Constants.RECIPIENT_STATE.NONE
	 *
	 *  This value is updated any time recipientStatus changes.
	 *
	 * See layer.Message.ConversationMessage.recipientStatus for a more detailed report.
	 *
	 *
	 * @type {String}
	 */
	ConversationMessage$2.prototype.deliveryStatus = Constants$4.RECIPIENT_STATE.NONE;

	ConversationMessage$2.inObjectIgnore = Message$2.inObjectIgnore;
	ConversationMessage$2._supportedEvents = [].concat(Message$2._supportedEvents);
	Root$11.initClass.apply(ConversationMessage$2, [ConversationMessage$2, 'ConversationMessage']);
	var conversationMessage = ConversationMessage$2;

	var _createClass$13 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$6 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$13(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$9(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$9(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * A Conversation object represents a dialog amongst a small set
	 * of participants.
	 *
	 * Create a Conversation using the client:
	 *
	 *      var conversation = client.createConversation({
	 *          participants: ['a','b'],
	 *          distinct: true
	 *      });
	 *
	 * NOTE:   Do not create a conversation with new layer.Conversation(...),
	 *         This will fail to handle the distinct property short of going to the server for evaluation.
	 *
	 * NOTE:   Creating a Conversation is a local action.  A Conversation will not be
	 *         sent to the server until either:
	 *
	 * 1. A message is sent on that Conversation
	 * 2. `Conversation.send()` is called (not recommended as mobile clients
	 *    expect at least one layer.Message.ConversationMessage in a Conversation)
	 *
	 * Key methods, events and properties for getting started:
	 *
	 * Properties:
	 *
	 * * layer.Conversation.id: this property is worth being familiar with; it identifies the
	 *   Conversation and can be used in `client.getConversation(id)` to retrieve it.
	 * * layer.Conversation.lastMessage: This property makes it easy to show info about the most recent Message
	 *    when rendering a list of Conversations.
	 * * layer.Conversation.metadata: Custom data for your Conversation; commonly used to store a 'title' property
	 *    to name your Conversation.
	 *
	 * Methods:
	 *
	 * * layer.Conversation.addParticipants and layer.Conversation.removeParticipants: Change the participants of the Conversation
	 * * layer.Conversation.setMetadataProperties: Set metadata.title to 'My Conversation with Layer Support' (uh oh)
	 * * layer.Conversation.on() and layer.Conversation.off(): event listeners built on top of the `backbone-events-standalone` npm project
	 * * layer.Conversation.leave() to leave the Conversation
	 * * layer.Conversation.delete() to delete the Conversation for all users (or for just this user)
	 *
	 * Events:
	 *
	 * * `conversations:change`: Useful for observing changes to participants and metadata
	 *   and updating rendering of your open Conversation
	 *
	 * Finally, to access a list of Messages in a Conversation, see layer.Query.
	 *
	 * @class  layer.Conversation
	 * @extends layer.Container
	 * @author  Michael Kantor
	 */

	var Root$9 = root;
	var Syncable$3 = syncable;
	var Container = container;
	var ConversationMessage$1 = conversationMessage;
	var LayerError$8 = layerError;
	var Util$4 = clientUtils;
	var Constants$2 = _const;
	var LayerEvent$2 = layerEvent;
	var logger$6 = logger_1;

	var Conversation$2 = function (_Container) {
	  _inherits$9(Conversation, _Container);

	  /**
	   * Create a new conversation.
	   *
	   * The static `layer.Conversation.create()` method
	   * will correctly lookup distinct Conversations and
	   * return them; `new layer.Conversation()` will not.
	   *
	   * Developers should use `layer.Conversation.create()`.
	   *
	   * @method constructor
	   * @protected
	   * @param  {Object} options
	   * @param {string[]/layer.Identity[]} [options.participants] - Array of Participant IDs or layer.Identity instances
	   * @param {boolean} [options.distinct=true] - Is the conversation distinct
	   * @param {Object} [options.metadata] - An object containing Conversation Metadata.
	   * @return {layer.Conversation}
	   */
	  function Conversation() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$13(this, Conversation);

	    // Setup default values
	    if (!options.participants) options.participants = [];

	    var _this = _possibleConstructorReturn$9(this, (Conversation.__proto__ || Object.getPrototypeOf(Conversation)).call(this, options));

	    _this.isInitializing = true;
	    var client = _this.getClient();

	    // If the options doesn't contain server object, setup participants.
	    if (!options || !options.fromServer) {
	      _this.participants = client._fixIdentities(_this.participants);
	      if (_this.participants.indexOf(client.user) === -1) {
	        _this.participants.push(client.user);
	      }
	    }
	    _this._register();
	    _this.isInitializing = false;
	    return _this;
	  }

	  /**
	   * Destroy the local copy of this Conversation, cleaning up all resources
	   * it consumes.
	   *
	   * @method destroy
	   */


	  _createClass$13(Conversation, [{
	    key: 'destroy',
	    value: function destroy() {
	      this.lastMessage = null;

	      // Client fires 'conversations:remove' and then removes the Conversation.
	      if (this.clientId) this.getClient()._removeConversation(this);

	      _get$6(Conversation.prototype.__proto__ || Object.getPrototypeOf(Conversation.prototype), 'destroy', this).call(this);

	      this.participants = null;
	      this.metadata = null;
	    }

	    /**
	     * Create a new layer.Message.ConversationMessage instance within this conversation
	     *
	     *      var message = conversation.createMessage('hello');
	     *
	     *      var message = conversation.createMessage({
	     *          parts: [new layer.MessagePart({
	     *                      body: 'hello',
	     *                      mimeType: 'text/plain'
	     *                  })]
	     *      });
	     *
	     * See layer.Message.ConversationMessage for more options for creating the message.
	     *
	     * @method createMessage
	     * @param  {String|Object} options - If its a string, a MessagePart is created around that string.
	     * @param {layer.MessagePart[]} options.parts - An array of MessageParts.  There is some tolerance for
	     *                                               it not being an array, or for it being a string to be turned
	     *                                               into a MessagePart.
	     * @return {layer.Message.ConversationMessage}
	     */

	  }, {
	    key: 'createMessage',
	    value: function createMessage() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      var messageConfig = typeof options === 'string' ? {
	        parts: [{ body: options, mimeType: 'text/plain' }]
	      } : options;
	      messageConfig.clientId = this.clientId;
	      messageConfig.conversationId = this.id;

	      return new ConversationMessage$1(messageConfig);
	    }
	  }, {
	    key: '_setupMessage',
	    value: function _setupMessage(message) {
	      // Setting a position is required if its going to get sorted correctly by query.
	      // The correct position will be written by _populateFromServer when the object
	      // is returned from the server.
	      // NOTE: We have a special case where messages are sent from multiple tabs, written to indexedDB, but not yet sent,
	      // they will have conflicting positions.
	      // Attempts to fix this by offsetting the position by time resulted in unexpected behaviors
	      // as multiple messages end up with positions greater than returned by the server.
	      var position = void 0;
	      if (this.lastMessage) {
	        position = this.lastMessage.position + 1;
	      } else if (this._lastMessagePosition) {
	        position = this._lastMessagePosition + 1;
	        this._lastMessagePosition = 0;
	      } else {
	        position = 0;
	      }
	      message.position = position;
	      this.lastMessage = message;
	    }

	    /**
	     * Create this Conversation on the server.
	     *
	     * On completion, this instance will receive
	     * an id, url and createdAt.  It may also receive metadata
	     * if there was a FOUND_WITHOUT_REQUESTED_METADATA result.
	     *
	     * Note that the optional Message parameter should NOT be used except
	     * by the layer.Message.ConversationMessage class itself.
	     *
	     * Note that recommended practice is to send the Conversation by sending a Message in the Conversation,
	     * and NOT by calling Conversation.send.
	     *
	     *      client.createConversation({
	     *          participants: ['a', 'b'],
	     *          distinct: false
	     *      })
	     *      .send()
	     *      .on('conversations:sent', function(evt) {
	     *          alert('Done');
	     *      });
	     *
	     * @method send
	     * @param {layer.Message.ConversationMessage} [message] Tells the Conversation what its last_message will be
	     * @return {layer.Conversation} this
	     */

	  }, {
	    key: 'send',
	    value: function send(message) {
	      var client = this.getClient();
	      if (!client) throw new Error(LayerError$8.dictionary.clientMissing);

	      // If this is part of a create({distinct:true}).send() call where
	      // the distinct conversation was found, just trigger the cached event and exit
	      var wasLocalDistinct = Boolean(this._sendDistinctEvent);
	      if (this._sendDistinctEvent) this._handleLocalDistinctConversation();

	      // If the Conversation is already on the server, don't send.
	      if (wasLocalDistinct || this.syncState !== Constants$2.SYNC_STATE.NEW) {
	        if (message) this._setupMessage(message);
	        return this;
	      }

	      // Make sure this user is a participant (server does this for us, but
	      // this insures the local copy is correct until we get a response from
	      // the server
	      if (this.participants.indexOf(client.user) === -1) {
	        this.participants.push(client.user);
	      }

	      return _get$6(Conversation.prototype.__proto__ || Object.getPrototypeOf(Conversation.prototype), 'send', this).call(this, message);
	    }

	    /**
	     * Handles the case where a Distinct Create Conversation found a local match.
	     *
	     * When an app calls client.createConversation([...])
	     * and requests a Distinct Conversation (default setting),
	     * and the Conversation already exists, what do we do to help
	     * them access it?
	     *
	     *      client.createConversation(["fred"]).on("conversations:sent", function(evt) {
	     *        render();
	     *      });
	     *
	     * Under normal conditions, calling `c.send()` on a matching distinct Conversation
	     * would either throw an error or just be a no-op.  We use this method to trigger
	     * the expected "conversations:sent" event even though its already been sent and
	     * we did nothing.  Use the evt.result property if you want to know whether the
	     * result was a new conversation or matching one.
	     *
	     * @method _handleLocalDistinctConversation
	     * @private
	     */

	  }, {
	    key: '_handleLocalDistinctConversation',
	    value: function _handleLocalDistinctConversation() {
	      var evt = this._sendDistinctEvent;
	      this._sendDistinctEvent = null;

	      // delay so there is time to setup an event listener on this conversation
	      this._triggerAsync('conversations:sent', evt);
	      return this;
	    }

	    /**
	     * Gets the data for a Create request.
	     *
	     * The layer.SyncManager needs a callback to create the Conversation as it
	     * looks NOW, not back when `send()` was called.  This method is called
	     * by the layer.SyncManager to populate the POST data of the call.
	     *
	     * @method _getSendData
	     * @private
	     * @return {Object} Websocket data for the request
	     */

	  }, {
	    key: '_getSendData',
	    value: function _getSendData(data) {
	      var isMetadataEmpty = Util$4.isEmpty(this.metadata);
	      return {
	        method: 'Conversation.create',
	        data: {
	          participants: this.participants.map(function (identity) {
	            return identity.id;
	          }),
	          distinct: this.distinct,
	          metadata: isMetadataEmpty ? null : this.metadata,
	          id: this.id
	        }
	      };
	    }

	    /**
	     * Mark all messages in the conversation as read.
	     *
	     * Optionally provide a Message object to mark all messages up to and including
	     * the specified message as read.
	     *
	     * Will not update `message.isRead` nor `conversation.unreadCount` until after
	     * server has responded to the request.
	     *
	     * ```
	     * conversation.markAllMessagesAsRead();
	     * ```
	     *
	     * @method markAllMessagesAsRead
	     * @param {layer.Message} [message=conversation.lastMessage]
	     * @return this
	     */

	  }, {
	    key: 'markAllMessagesAsRead',
	    value: function markAllMessagesAsRead(message) {
	      if (!this.isSaved()) return this;
	      if (!message) message = this.lastMessage;
	      var position = !message || !message.isSaved() ? null : message.position;
	      this._xhr({
	        method: 'POST',
	        url: '/mark_all_read',
	        data: { position: position },
	        sync: {
	          operation: 'RECEIPT'
	        }
	      }, function (result) {
	        if (!result.success) {
	          logger$6.error('Mark all as read failed; currently this error is not handled by Layer WebSDK');
	        }
	      });
	      return this;
	    }
	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(conversation) {
	      var _this2 = this;

	      var client = this.getClient();

	      // Disable events if creating a new Conversation
	      // We still want property change events for anything that DOES change
	      this._disableEvents = this.syncState === Constants$2.SYNC_STATE.NEW;

	      this.participants = client._fixIdentities(conversation.participants);
	      this.participants.forEach(function (identity) {
	        return identity.on('identities:change', _this2._handleParticipantChangeEvent, _this2);
	      });
	      this.distinct = conversation.distinct;
	      this.unreadCount = conversation.unread_message_count;
	      this.totalMessageCount = conversation.total_message_count;
	      this.isCurrentParticipant = this.participants.indexOf(client.user) !== -1;
	      _get$6(Conversation.prototype.__proto__ || Object.getPrototypeOf(Conversation.prototype), '_populateFromServer', this).call(this, conversation);

	      if (typeof conversation.last_message === 'string') {
	        this.lastMessage = client.getMessage(conversation.last_message);
	      } else if (conversation.last_message) {
	        this.lastMessage = client._createObject(conversation.last_message);
	      }
	      this._register();

	      this._disableEvents = false;
	    }
	  }, {
	    key: '_createResultConflict',
	    value: function _createResultConflict(data) {
	      this._populateFromServer(data.data);
	      this._triggerAsync(this.constructor.eventPrefix + ':sent', {
	        result: Conversation.FOUND_WITHOUT_REQUESTED_METADATA
	      });
	    }

	    /**
	     * Add an array of participant ids to the conversation.
	     *
	     *      conversation.addParticipants(['a', 'b']);
	     *
	     * New participants will immediately show up in the Conversation,
	     * but may not have synced with the server yet.
	     *
	     * TODO WEB-967: Roll participants back on getting a server error
	     *
	     * @method addParticipants
	     * @param  {string[]/layer.Identity[]} participants - Array of Participant IDs or Identity objects
	     * @returns {layer.Conversation} this
	     */

	  }, {
	    key: 'addParticipants',
	    value: function addParticipants(participants) {
	      var _this3 = this;

	      // Only add those that aren't already in the list.
	      var client = this.getClient();
	      var identities = client._fixIdentities(participants);
	      var adding = identities.filter(function (identity) {
	        return _this3.participants.indexOf(identity) === -1;
	      });
	      this._patchParticipants({ add: adding, remove: [] });
	      return this;
	    }

	    /**
	     * Removes an array of participant ids from the conversation.
	     *
	     *      conversation.removeParticipants(['a', 'b']);
	     *
	     * Removed participants will immediately be removed from this Conversation,
	     * but may not have synced with the server yet.
	     *
	     * Throws error if you attempt to remove ALL participants.
	     *
	     * TODO  WEB-967: Roll participants back on getting a server error
	     *
	     * @method removeParticipants
	     * @param  {string[]/layer.Identity[]} participants - Array of Participant IDs or Identity objects
	     * @returns {layer.Conversation} this
	     */

	  }, {
	    key: 'removeParticipants',
	    value: function removeParticipants(participants) {
	      var currentParticipants = {};
	      this.participants.forEach(function (participant) {
	        return currentParticipants[participant.id] = true;
	      });
	      var client = this.getClient();
	      var identities = client._fixIdentities(participants);

	      var removing = identities.filter(function (participant) {
	        return currentParticipants[participant.id];
	      });
	      if (removing.length === 0) return this;
	      if (removing.length === this.participants.length) {
	        throw new Error(LayerError$8.dictionary.moreParticipantsRequired);
	      }
	      this._patchParticipants({ add: [], remove: removing });
	      return this;
	    }

	    /**
	     * Replaces all participants with a new array of of participant ids.
	     *
	     *      conversation.replaceParticipants(['a', 'b']);
	     *
	     * Changed participants will immediately show up in the Conversation,
	     * but may not have synced with the server yet.
	     *
	     * TODO WEB-967: Roll participants back on getting a server error
	     *
	     * @method replaceParticipants
	     * @param  {string[]/layer.Identity[]} participants - Array of Participant IDs or Identity objects
	     * @returns {layer.Conversation} this
	     */

	  }, {
	    key: 'replaceParticipants',
	    value: function replaceParticipants(participants) {
	      if (!participants || !participants.length) {
	        throw new Error(LayerError$8.dictionary.moreParticipantsRequired);
	      }

	      var client = this.getClient();
	      var identities = client._fixIdentities(participants);

	      var change = this._getParticipantChange(identities, this.participants);
	      this._patchParticipants(change);
	      return this;
	    }

	    /**
	     * Update the server with the new participant list.
	     *
	     * Executes as follows:
	     *
	     * 1. Updates the participants property of the local object
	     * 2. Triggers a conversations:change event
	     * 3. Submits a request to be sent to the server to update the server's object
	     * 4. If there is an error, no errors are fired except by layer.SyncManager, but another
	     *    conversations:change event is fired as the change is rolled back.
	     *
	     * @method _patchParticipants
	     * @private
	     * @param  {Object[]} operations - Array of JSON patch operation
	     * @param  {Object} eventData - Data describing the change for use in an event
	     */

	  }, {
	    key: '_patchParticipants',
	    value: function _patchParticipants(change) {
	      var _this4 = this;

	      this._applyParticipantChange(change);
	      this.isCurrentParticipant = this.participants.indexOf(this.getClient().user) !== -1;

	      var ops = [];
	      change.remove.forEach(function (participant) {
	        ops.push({
	          operation: 'remove',
	          property: 'participants',
	          id: participant.id
	        });
	      });

	      change.add.forEach(function (participant) {
	        ops.push({
	          operation: 'add',
	          property: 'participants',
	          id: participant.id
	        });
	      });

	      this._xhr({
	        url: '',
	        method: 'PATCH',
	        data: JSON.stringify(ops),
	        headers: {
	          'content-type': 'application/vnd.layer-patch+json'
	        }
	      }, function (result) {
	        if (!result.success && result.data.id !== 'authentication_required') _this4._load();
	      });
	    }

	    /**
	     * Internally we use `{add: [], remove: []}` instead of LayerOperations.
	     *
	     * So control is handed off to this method to actually apply the changes
	     * to the participants array.
	     *
	     * @method _applyParticipantChange
	     * @private
	     * @param  {Object} change
	     * @param  {layer.Identity[]} change.add - Array of userids to add
	     * @param  {layer.Identity[]} change.remove - Array of userids to remove
	     */

	  }, {
	    key: '_applyParticipantChange',
	    value: function _applyParticipantChange(change) {
	      var participants = [].concat(this.participants);
	      change.add.forEach(function (participant) {
	        if (participants.indexOf(participant) === -1) participants.push(participant);
	      });
	      change.remove.forEach(function (participant) {
	        var index = participants.indexOf(participant);
	        if (index !== -1) participants.splice(index, 1);
	      });
	      this.participants = participants;
	    }

	    /**
	     * Delete the Conversation from the server and removes this user as a participant.
	     *
	     * @method leave
	     */

	  }, {
	    key: 'leave',
	    value: function leave() {
	      if (this.isDestroyed) throw new Error(LayerError$8.dictionary.isDestroyed);
	      this._delete('mode=' + Constants$2.DELETION_MODE.MY_DEVICES + '&leave=true');
	    }

	    /**
	     * Delete the Conversation from the server, but deletion mode may cause user to remain a participant.
	     *
	     * This call will support various deletion modes.
	     *
	     * Deletion Modes:
	     *
	     * * layer.Constants.DELETION_MODE.ALL: This deletes the local copy immediately, and attempts to also
	     *   delete the server's copy.
	     * * layer.Constants.DELETION_MODE.MY_DEVICES: Deletes the local copy immediately, and attempts to delete it from all
	     *   of my devices.  Other users retain access.
	     * * true: For backwards compatibility thi is the same as ALL.
	     *
	     * MY_DEVICES does not remove this user as a participant.  That means a new Message on this Conversation will recreate the
	     * Conversation for this user.  See layer.Conversation.leave() instead.
	     *
	     * Executes as follows:
	     *
	     * 1. Submits a request to be sent to the server to delete the server's object
	     * 2. Delete's the local object
	     * 3. If there is an error, no errors are fired except by layer.SyncManager, but the Conversation will be reloaded from the server,
	     *    triggering a conversations:add event.
	     *
	     * @method delete
	     * @param {String} deletionMode
	     */

	  }, {
	    key: 'delete',
	    value: function _delete(mode) {
	      if (this.isDestroyed) throw new Error(LayerError$8.dictionary.isDestroyed);

	      var queryStr = void 0;
	      switch (mode) {
	        case Constants$2.DELETION_MODE.ALL:
	        case true:
	          queryStr = 'mode=' + Constants$2.DELETION_MODE.ALL;
	          break;
	        case Constants$2.DELETION_MODE.MY_DEVICES:
	          queryStr = 'mode=' + Constants$2.DELETION_MODE.MY_DEVICES + '&leave=false';
	          break;
	        default:
	          throw new Error(LayerError$8.dictionary.deletionModeUnsupported);
	      }

	      this._delete(queryStr);
	    }

	    /**
	     * LayerPatch will call this after changing any properties.
	     *
	     * Trigger any cleanup or events needed after these changes.
	     *
	     * @method _handlePatchEvent
	     * @private
	     * @param  {Mixed} newValue - New value of the property
	     * @param  {Mixed} oldValue - Prior value of the property
	     * @param  {string[]} paths - Array of paths specifically modified: ['participants'], ['metadata.keyA', 'metadata.keyB']
	     */

	  }, {
	    key: '_handlePatchEvent',
	    value: function _handlePatchEvent(newValue, oldValue, paths) {
	      // Certain types of __update handlers are disabled while values are being set by
	      // layer patch parser because the difference between setting a value (triggers an event)
	      // and change a property of a value (triggers only this callback) result in inconsistent
	      // behaviors.  Enable them long enough to allow __update calls to be made
	      this._inLayerParser = false;
	      try {
	        var events = this._disableEvents;
	        this._disableEvents = false;
	        if (paths[0] === 'participants') {
	          var client = this.getClient();
	          // oldValue/newValue come as a Basic Identity POJO; lets deliver events with actual instances
	          oldValue = oldValue.map(function (identity) {
	            return client.getIdentity(identity.id);
	          });
	          newValue = newValue.map(function (identity) {
	            return client.getIdentity(identity.id);
	          });
	          this.__updateParticipants(newValue, oldValue);
	        } else {
	          _get$6(Conversation.prototype.__proto__ || Object.getPrototypeOf(Conversation.prototype), '_handlePatchEvent', this).call(this, newValue, oldValue, paths);
	        }
	        this._disableEvents = events;
	      } catch (err) {
	        // do nothing
	      }
	      this._inLayerParser = true;
	    }

	    /**
	     * Given the oldValue and newValue for participants,
	     * generate a list of whom was added and whom was removed.
	     *
	     * @method _getParticipantChange
	     * @private
	     * @param  {layer.Identity[]} newValue
	     * @param  {layer.Identity[]} oldValue
	     * @return {Object} Returns changes in the form of `{add: [...], remove: [...]}`
	     */

	  }, {
	    key: '_getParticipantChange',
	    value: function _getParticipantChange(newValue, oldValue) {
	      var change = {};
	      change.add = newValue.filter(function (participant) {
	        return oldValue.indexOf(participant) === -1;
	      });
	      change.remove = oldValue.filter(function (participant) {
	        return newValue.indexOf(participant) === -1;
	      });
	      return change;
	    }
	  }, {
	    key: '_deleteResult',
	    value: function _deleteResult(result, id) {
	      var client = this.getClient();
	      if (!result.success && (!result.data || result.data.id !== 'not_found' && result.data.id !== 'authentication_required')) {
	        Conversation.load(id, client);
	      }
	    }
	  }, {
	    key: '_register',
	    value: function _register() {
	      var client = this.getClient();
	      if (client) client._addConversation(this);
	    }

	    /*
	     * Insure that conversation.unreadCount-- can never reduce the value to negative values.
	     */

	  }, {
	    key: '__adjustUnreadCount',
	    value: function __adjustUnreadCount(newValue) {
	      if (newValue < 0) return 0;
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any change in the unreadCount property will call this method and fire a
	     * change event.
	     *
	     * Any triggering of this from a websocket patch unread_message_count should wait a second before firing any events
	     * so that if there are a series of these updates, we don't see a lot of jitter.
	     *
	     * NOTE: _oldUnreadCount is used to pass data to _updateUnreadCountEvent because this method can be called many times
	     * a second, and we only want to trigger this with a summary of changes rather than each individual change.
	     *
	     * @method __updateUnreadCount
	     * @private
	     * @param  {number} newValue
	     * @param  {number} oldValue
	     */

	  }, {
	    key: '__updateUnreadCount',
	    value: function __updateUnreadCount(newValue, oldValue) {
	      var _this5 = this;

	      if (this._inLayerParser) {
	        if (this._oldUnreadCount === undefined) this._oldUnreadCount = oldValue;
	        if (this._updateUnreadCountTimeout) clearTimeout(this._updateUnreadCountTimeout);
	        this._updateUnreadCountTimeout = setTimeout(function () {
	          return _this5._updateUnreadCountEvent();
	        }, 1000);
	      } else {
	        this._updateUnreadCountEvent();
	      }
	    }

	    /**
	     * Fire events related to changes to unreadCount
	     *
	     * @method _updateUnreadCountEvent
	     * @private
	     */

	  }, {
	    key: '_updateUnreadCountEvent',
	    value: function _updateUnreadCountEvent() {
	      if (this.isDestroyed) return;
	      var oldValue = this._oldUnreadCount;
	      var newValue = this.__unreadCount;
	      this._oldUnreadCount = undefined;

	      if (newValue === oldValue) return;
	      this._triggerAsync('conversations:change', {
	        newValue: newValue,
	        oldValue: oldValue,
	        property: 'unreadCount'
	      });
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any change in the lastMessage pointer will call this method and fire a
	     * change event.  Changes to properties within the lastMessage object will
	     * not trigger this call.
	     *
	     * @method __updateLastMessage
	     * @private
	     * @param  {layer.Message.ConversationMessage} newValue
	     * @param  {layer.Message.ConversationMessage} oldValue
	     */

	  }, {
	    key: '__updateLastMessage',
	    value: function __updateLastMessage(newValue, oldValue) {
	      if (newValue && oldValue && newValue.id === oldValue.id) return;
	      this._triggerAsync('conversations:change', {
	        property: 'lastMessage',
	        newValue: newValue,
	        oldValue: oldValue
	      });
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any change in the participants property will call this method and fire a
	     * change event.  Changes to the participants array that don't replace the array
	     * with a new array will require directly calling this method.
	     *
	     * @method __updateParticipants
	     * @private
	     * @param  {string[]} newValue
	     * @param  {string[]} oldValue
	     */

	  }, {
	    key: '__updateParticipants',
	    value: function __updateParticipants(newValue, oldValue) {
	      var _this6 = this;

	      if (this._inLayerParser) return;
	      var change = this._getParticipantChange(newValue, oldValue);
	      change.add.forEach(function (identity) {
	        return identity.on('identities:change', _this6._handleParticipantChangeEvent, _this6);
	      });
	      change.remove.forEach(function (identity) {
	        return identity.off('identities:change', _this6._handleParticipantChangeEvent, _this6);
	      });
	      if (change.add.length || change.remove.length) {
	        change.property = 'participants';
	        change.oldValue = oldValue;
	        change.newValue = newValue;
	        this._triggerAsync('conversations:change', change);
	      }
	    }
	  }, {
	    key: '_handleParticipantChangeEvent',
	    value: function _handleParticipantChangeEvent(evt) {
	      var _this7 = this;

	      evt.changes.forEach(function (change) {
	        _this7._triggerAsync('conversations:change', {
	          property: 'participants.' + change.property,
	          identity: evt.target,
	          oldValue: change.oldValue,
	          newValue: change.newValue
	        });
	      });
	    }

	    /**
	     * Create a conversation instance from a server representation of the conversation.
	     *
	     * If the Conversation already exists, will update the existing copy with
	     * presumably newer values.
	     *
	     * @method _createFromServer
	     * @protected
	     * @static
	     * @param  {Object} conversation - Server representation of a Conversation
	     * @param  {layer.Client} client
	     * @return {layer.Conversation}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(conversation, client) {
	      return new Conversation({
	        client: client,
	        fromServer: conversation,
	        _fromDB: conversation._fromDB
	      });
	    }

	    /**
	     * Find or create a new conversation.
	     *
	     *      var conversation = layer.Conversation.create({
	     *          participants: ['a', 'b'],
	     *          distinct: true,
	     *          metadata: {
	     *              title: 'I am not a title!'
	     *          },
	     *          client: client,
	     *          'conversations:loaded': function(evt) {
	     *
	     *          }
	     *      });
	     *
	     * Only tries to find a Conversation if its a Distinct Conversation.
	     * Distinct defaults to true.
	     *
	     * Recommend using `client.createConversation({...})`
	     * instead of `Conversation.create({...})`.
	     *
	     * @method create
	     * @static
	     * @protected
	     * @param  {Object} options
	     * @param  {layer.Client} options.client
	     * @param  {string[]/layer.Identity[]} options.participants - Array of Participant IDs or layer.Identity objects to create a conversation with.
	     * @param {boolean} [options.distinct=true] - Create a distinct conversation
	     * @param {Object} [options.metadata={}] - Initial metadata for Conversation
	     * @return {layer.Conversation}
	     */

	  }, {
	    key: 'create',
	    value: function create(options) {
	      if (!options.client) throw new Error(LayerError$8.dictionary.clientMissing);
	      var newOptions = {
	        distinct: options.distinct,
	        participants: options.client._fixIdentities(options.participants),
	        metadata: options.metadata,
	        client: options.client
	      };
	      if (newOptions.distinct) {
	        var conv = this._createDistinct(newOptions);
	        if (conv) return conv;
	      }
	      return new Conversation(newOptions);
	    }

	    /**
	     * Create or Find a Distinct Conversation.
	     *
	     * If the static Conversation.create method gets a request for a Distinct Conversation,
	     * see if we have one cached.
	     *
	     * Will fire the 'conversations:loaded' event if one is provided in this call,
	     * and a Conversation is found.
	     *
	     * @method _createDistinct
	     * @static
	     * @private
	     * @param  {Object} options - See layer.Conversation.create options; participants must be layer.Identity[]
	     * @return {layer.Conversation}
	     */

	  }, {
	    key: '_createDistinct',
	    value: function _createDistinct(options) {
	      if (options.participants.indexOf(options.client.user) === -1) {
	        options.participants.push(options.client.user);
	      }

	      var participantsHash = {};
	      options.participants.forEach(function (participant) {
	        participantsHash[participant.id] = participant;
	      });

	      var conv = options.client.findCachedConversation(function (aConv) {
	        if (aConv.distinct && aConv.participants.length === options.participants.length) {
	          for (var index = 0; index < aConv.participants.length; index++) {
	            if (!participantsHash[aConv.participants[index].id]) return false;
	          }
	          return true;
	        }
	      });

	      if (conv) {
	        conv._sendDistinctEvent = new LayerEvent$2({
	          target: conv,
	          result: !options.metadata || Util$4.doesObjectMatch(options.metadata, conv.metadata) ? Conversation.FOUND : Conversation.FOUND_WITHOUT_REQUESTED_METADATA
	        }, 'conversations:sent');
	        return conv;
	      }
	    }
	  }]);

	  return Conversation;
	}(Container);

	/**
	 * Array of participant ids.
	 *
	 * Do not directly manipulate;
	 * use addParticipants, removeParticipants and replaceParticipants
	 * to manipulate the array.
	 *
	 * @type {layer.Identity[]}
	 */


	Conversation$2.prototype.participants = null;

	/**
	 * Number of unread messages in the conversation.
	 *
	 * @type {number}
	 */
	Conversation$2.prototype.unreadCount = 0;

	/**
	 * This is a Distinct Conversation.
	 *
	 * You can have 1 distinct conversation among a set of participants.
	 * There are no limits to how many non-distinct Conversations you have have
	 * among a set of participants.
	 *
	 * @type {boolean}
	 */
	Conversation$2.prototype.distinct = true;

	/**
	 * The last layer.Message.ConversationMessage to be sent/received for this Conversation.
	 *
	 * Value may be a Message that has been locally created but not yet received by server.
	 * @type {layer.Message.ConversationMessage}
	 */
	Conversation$2.prototype.lastMessage = null;

	/**
	 * The position of the last known message.
	 *
	 * Used in the event that lastMessage has been deleted.
	 *
	 * @private
	 * @property {Number}
	 */
	Conversation$2.prototype._lastMessagePosition = 0;

	/**
	 * Indicates if we are currently processing a markAllAsRead operation
	 *
	 * @private
	 * @property {Boolean}
	 */
	Conversation$2.prototype._inMarkAllAsRead = false;

	Conversation$2.eventPrefix = 'conversations';

	/**
	 * The Conversation that was requested has been found, but there was a mismatch in metadata.
	 *
	 * If the createConversation request contained metadata and it did not match the Distinct Conversation
	 * that matched the requested participants, then this value is passed to notify your app that the Conversation
	 * was returned but does not exactly match your request.
	 *
	 * Used in `conversations:sent` events.
	 * @type {String}
	 * @static
	 */
	Conversation$2.FOUND_WITHOUT_REQUESTED_METADATA = 'FoundMismatch';

	/**
	 * Prefix to use when generating an ID for instances of this class
	 * @type {String}
	 * @static
	 * @private
	 */
	Conversation$2.prefixUUID = 'layer:///conversations/';

	Conversation$2._supportedEvents = [
	/**
	 * The conversation is now on the server.
	 *
	 * Called after successfully creating the conversation
	 * on the server.  The Result property is one of:
	 *
	 * * Conversation.CREATED: A new Conversation has been created
	 * * Conversation.FOUND: A matching Distinct Conversation has been found
	 * * Conversation.FOUND_WITHOUT_REQUESTED_METADATA: A matching Distinct Conversation has been found
	 *                       but note that the metadata is NOT what you requested.
	 *
	 * All of these results will also mean that the updated property values have been
	 * copied into your Conversation object.  That means your metadata property may no
	 * longer be its initial value; it may be the value found on the server.
	 *
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {string} event.result
	 */
	'conversations:sent',

	/**
	 * An attempt to send this conversation to the server has failed.
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {layer.LayerError} event.error
	 */
	'conversations:sent-error',

	/**
	 * The conversation is now loaded from the server.
	 *
	 * Note that this is only used in response to the layer.Conversation.load() method.
	 * from the server.
	 * @event
	 * @param {layer.LayerEvent} event
	 */
	'conversations:loaded',

	/**
	 * An attempt to load this conversation from the server has failed.
	 *
	 * Note that this is only used in response to the layer.Conversation.load() method.
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {layer.LayerError} event.error
	 */
	'conversations:loaded-error',

	/**
	 * The conversation has been deleted from the server.
	 *
	 * Caused by either a successful call to delete() on this instance
	 * or by a remote user.
	 * @event
	 * @param {layer.LayerEvent} event
	 */
	'conversations:delete',

	/**
	 * This conversation has changed.
	 *
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {Object[]} event.changes - Array of changes reported by this event
	 * @param {Mixed} event.changes.newValue
	 * @param {Mixed} event.changes.oldValue
	 * @param {string} event.changes.property - Name of the property that changed
	 * @param {layer.Conversation} event.target
	 */
	'conversations:change'].concat(Syncable$3._supportedEvents);

	Root$9.initClass.apply(Conversation$2, [Conversation$2, 'Conversation']);
	Syncable$3.subclasses.push(Conversation$2);
	var conversation = Conversation$2;

	var _createClass$17 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$17(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$13(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$13(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * For purposes of API consistency across SDKs, this class is not exposed.
	 * Instead, customers will see only the layer.Message class.
	 *
	 * @class layer.Message.ChannelMessage
	 * @extends layer.Message
	 */
	var Root$13 = root;
	var Message$3 = message;
	var ClientRegistry$4 = clientRegistry;
	var LayerError$12 = layerError;
	var Constants$6 = _const;
	var logger$7 = logger_1;

	var ChannelMessage$2 = function (_Message) {
	  _inherits$13(ChannelMessage, _Message);

	  function ChannelMessage(options) {
	    _classCallCheck$17(this, ChannelMessage);

	    if (options.channel) options.conversationId = options.channel.id;

	    var _this = _possibleConstructorReturn$13(this, (ChannelMessage.__proto__ || Object.getPrototypeOf(ChannelMessage)).call(this, options));

	    var client = _this.getClient();
	    _this.isInitializing = false;
	    if (options && options.fromServer) {
	      client._addMessage(_this);
	    }
	    return _this;
	  }

	  /**
	   * Get the layer.Channel associated with this layer.Message.ChannelMessage.
	   *
	   * @method getConversation
	   * @param {Boolean} load       Pass in true if the layer.Channel should be loaded if not found locally
	   * @return {layer.Channel}
	   */


	  _createClass$17(ChannelMessage, [{
	    key: 'getConversation',
	    value: function getConversation(load) {
	      if (this.conversationId) {
	        return ClientRegistry$4.get(this.clientId).getChannel(this.conversationId, load);
	      }
	      return null;
	    }

	    /**
	     * Send a Read or Delivery Receipt to the server; not supported yet.
	     *
	     * @method sendReceipt
	     * @param {string} [type=layer.Constants.RECEIPT_STATE.READ] - One of layer.Constants.RECEIPT_STATE.READ or layer.Constants.RECEIPT_STATE.DELIVERY
	     * @return {layer.Message.ChannelMessage} this
	     */

	  }, {
	    key: 'sendReceipt',
	    value: function sendReceipt() {
	      var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : Constants$6.RECEIPT_STATE.READ;

	      logger$7.warn('Receipts not supported for Channel Messages yet');
	      return this;
	    }

	    /**
	     * Delete the Message from the server.
	     *
	     * ```
	     * message.delete();
	     * ```
	     *
	     * @method delete
	     */

	  }, {
	    key: 'delete',
	    value: function _delete() {
	      if (this.isDestroyed) throw new Error(LayerError$12.dictionary.isDestroyed);

	      var id = this.id;
	      var client = this.getClient();
	      this._xhr({
	        url: '',
	        method: 'DELETE'
	      }, function (result) {
	        if (!result.success && (!result.data || result.data.id !== 'not_found' && result.data.id !== 'authentication_required')) {
	          Message$3.load(id, client);
	        }
	      });

	      this._deleted();
	      this.destroy();
	    }

	    /**
	     * On loading this one item from the server, after _populateFromServer has been called, due final setup.
	     *
	     * @method _loaded
	     * @private
	     * @param {Object} data  Data from server
	     */

	  }, {
	    key: '_loaded',
	    value: function _loaded(data) {
	      this.conversationId = data.channel.id;
	      this.getClient()._addMessage(this);
	    }

	    /**
	     * Creates a message from the server's representation of a message.
	     *
	     * Similar to _populateFromServer, however, this method takes a
	     * message description and returns a new message instance using _populateFromServer
	     * to setup the values.
	     *
	     * @method _createFromServer
	     * @protected
	     * @static
	     * @param  {Object} message - Server's representation of the message
	     * @param  {layer.Client} client
	     * @return {layer.Message.ChannelMessage}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(message$$2, client) {
	      var fromWebsocket = message$$2.fromWebsocket;
	      var conversationId = void 0;
	      if (message$$2.channel) {
	        conversationId = message$$2.channel.id;
	      } else {
	        conversationId = message$$2.conversationId;
	      }

	      return new ChannelMessage({
	        conversationId: conversationId,
	        fromServer: message$$2,
	        clientId: client.appId,
	        _fromDB: message$$2._fromDB,
	        _notify: fromWebsocket && message$$2.is_unread && message$$2.sender.user_id !== client.user.userId
	      });
	    }
	  }]);

	  return ChannelMessage;
	}(Message$3);

	/*
	 * True if this Message has been read by this user.
	 *
	 * You can change isRead programatically
	 *
	 *      m.isRead = true;
	 *
	 * This will automatically notify the server that the message was read by your user.
	 * @type {Boolean}
	 */


	ChannelMessage$2.prototype.isRead = false;

	ChannelMessage$2.inObjectIgnore = Message$3.inObjectIgnore;
	ChannelMessage$2._supportedEvents = [].concat(Message$3._supportedEvents);
	Root$13.initClass.apply(ChannelMessage$2, [ChannelMessage$2, 'ChannelMessage']);
	var channelMessage = ChannelMessage$2;

	var _createClass$16 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$9 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$16(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$12(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$12(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * A Channel object represents a dialog amongst a large set
	 * of participants.
	 *
	 * ```
	 * var channel = client.createChannel({
	 *   name: "frodo-the-dodo",
	 *   members: ["layer:///identities/samwise", "layer:///identities/orc-army"],
	 *   metadata: {
	 *     subtopic: "Sauruman is the man.  And a Saurian",
	 *     tooMuchInfo: {
	 *       nose: "stuffed"
	 *     }
	 *   }
	 * });
	 *
	 * channel.createMessage("Please don't eat me").send();
	 * ```
	 * NOTE: Sending a Message creates the Channel; this avoids having lots of unused channels being created.
	 *
	 * Key methods, events and properties for getting started:
	 *
	 * Properties:
	 *
	 * * layer.Channel.id: this property is worth being familiar with; it identifies the
	 *   Channel and can be used in `client.getChannel(id)` to retrieve it.
	 * * layer.Channel.name: this property names the channel; this may be human readable, though for localization purposes,
	 *   you may instead want to use a common name that is distinct from your displayed name.  There can only be a single
	 *   channel with a given name per app.
	 * * layer.Channel.membership: Contains status information about your user's role in this Channel.
	 * * layer.Channel.isCurrentParticipant: Shorthand for determining if your user is a member of the Channel.
	 *
	 * Methods:
	 *
	 * * layer.Channel.join() to join the Channel
	 * * layer.Channel.leave() to leave the Channel
	 * * layer.Channel.on() and layer.Channel.off(): event listeners built on top of the `backbone-events-standalone` npm project
	 * * layer.Channel.createMessage() to send a message on the Channel.
	 *
	 * Events:
	 *
	 * * `channels:change`: Useful for observing changes to Channel name
	 *   and updating rendering of your Channel
	 *
	 * Finally, to access a list of Messages in a Channel, see layer.Query.
	 *
	 * @class  layer.Channel
	 * @experimental This feature is incomplete, and available as Preview only.
	 * @extends layer.Container
	 * @author  Michael Kantor
	 */
	var Root$12 = root;
	var Syncable$5 = syncable;
	var Container$2 = container;
	var ChannelMessage$1 = channelMessage;
	var LayerError$11 = layerError;
	var LayerEvent$3 = layerEvent;
	var Util$7 = clientUtils;
	var Constants$5 = _const;

	var Channel$2 = function (_Container) {
	  _inherits$12(Channel, _Container);

	  function Channel() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$16(this, Channel);

	    // Setup default values
	    if (!options.membership) options.membership = {};

	    var _this = _possibleConstructorReturn$12(this, (Channel.__proto__ || Object.getPrototypeOf(Channel)).call(this, options));

	    _this._members = _this.getClient()._fixIdentities(options.members || []).map(function (item) {
	      return item.id;
	    });
	    _this._register();
	    return _this;
	  }

	  /**
	   * Destroy the local copy of this Channel, cleaning up all resources
	   * it consumes.
	   *
	   * @method destroy
	   */


	  _createClass$16(Channel, [{
	    key: 'destroy',
	    value: function destroy() {
	      this.lastMessage = null;
	      this.getClient()._removeChannel(this);
	      _get$9(Channel.prototype.__proto__ || Object.getPrototypeOf(Channel.prototype), 'destroy', this).call(this);
	      this.membership = null;
	    }

	    /**
	     * Create a new layer.Message.ChannelMessage instance within this conversation
	     *
	     *      var message = channel.createMessage('hello');
	     *
	     *      var message = channel.createMessage({
	     *          parts: [new layer.MessagePart({
	     *                      body: 'hello',
	     *                      mimeType: 'text/plain'
	     *                  })]
	     *      });
	     *
	     * See layer.Message.ChannelMessage for more options for creating the message.
	     *
	     * @method createMessage
	     * @param  {String|Object} options - If its a string, a MessagePart is created around that string.
	     * @param {layer.MessagePart[]} options.parts - An array of MessageParts.  There is some tolerance for
	     *                                               it not being an array, or for it being a string to be turned
	     *                                               into a MessagePart.
	     * @return {layer.Message.ChannelMessage}
	     */

	  }, {
	    key: 'createMessage',
	    value: function createMessage() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      var messageConfig = typeof options === 'string' ? {
	        parts: [{ body: options, mimeType: 'text/plain' }]
	      } : options;
	      messageConfig.clientId = this.clientId;
	      messageConfig.conversationId = this.id;

	      return new ChannelMessage$1(messageConfig);
	    }
	  }, {
	    key: '_setupMessage',
	    value: function _setupMessage(message) {
	      message.position = Channel.nextPosition;
	      Channel.nextPosition += 8192;
	    }

	    /**
	     * Gets the data for a Create request.
	     *
	     * The layer.SyncManager needs a callback to create the Conversation as it
	     * looks NOW, not back when `send()` was called.  This method is called
	     * by the layer.SyncManager to populate the POST data of the call.
	     *
	     * @method _getSendData
	     * @private
	     * @return {Object} Websocket data for the request
	     */

	  }, {
	    key: '_getSendData',
	    value: function _getSendData(data) {
	      var isMetadataEmpty = Util$7.isEmpty(this.metadata);
	      var members = this._members || [];
	      if (members.indexOf(this.getClient().user.id) === -1) members.push(this.getClient().user.id);
	      return {
	        method: 'Channel.create',
	        data: {
	          name: this.name,
	          metadata: isMetadataEmpty ? null : this.metadata,
	          id: this.id,
	          members: members
	        }
	      };
	    }
	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(channel) {
	      this._inPopulateFromServer = true;

	      // Disable events if creating a new Conversation
	      // We still want property change events for anything that DOES change
	      this._disableEvents = this.syncState === Constants$5.SYNC_STATE.NEW;
	      this.name = channel.name;

	      this.isCurrentParticipant = Boolean(channel.membership);
	      this.membership = !channel.membership || !channel.membership.id ? null : this.getClient()._createObject(channel.membership);

	      _get$9(Channel.prototype.__proto__ || Object.getPrototypeOf(Channel.prototype), '_populateFromServer', this).call(this, channel);
	      this._register();

	      this._disableEvents = false;
	    }
	  }, {
	    key: '_createResultConflict',
	    value: function _createResultConflict(data) {
	      var channel = data.data;
	      if (channel) {
	        this._createSuccess(channel);
	      } else {
	        this.syncState = Constants$5.SYNC_STATE.NEW;
	        this._syncCounter = 0;
	        this.trigger('channels:sent-error', { error: data });
	      }

	      this._inPopulateFromServer = false;
	    }
	  }, {
	    key: '__adjustName',
	    value: function __adjustName(newValue) {
	      if (this._inPopulateFromServer || this._inLayerParser || this.isNew() || this.isLoading) return;
	      throw new Error(LayerError$11.dictionary.permissionDenied);
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any change in the name property will call this method and fire a
	     * change event.
	     *
	     * @method __updateName
	     * @private
	     * @param  {string} newValue
	     * @param  {string} oldValue
	     */

	  }, {
	    key: '__updateName',
	    value: function __updateName(newValue, oldValue) {
	      this._triggerAsync('channels:change', {
	        property: 'name',
	        oldValue: oldValue,
	        newValue: newValue
	      });
	    }

	    /**
	     * Add the following members to the Channel.
	     *
	     * Unlike Conversations, Channels do not maintain state information about their members.
	     * As such, if the operation fails there is no actual state change
	     * for the channel.  Currently the only errors exposed are from the layer.Client.SyncManager.
	     *
	     * @method addMembers
	     * @param {String[]} members   Identity IDs of users to add to this Channel
	     * @return {layer.Channel} this
	     *
	     *
	     *
	     *
	     *
	     * @ignore until server supports it
	     */

	  }, {
	    key: 'addMembers',
	    value: function addMembers(members) {
	      var _this2 = this;

	      members = this.getClient()._fixIdentities(members).map(function (item) {
	        return item.id;
	      });
	      if (this.syncState === Constants$5.SYNC_STATE.NEW) {
	        this._members = this._members.concat(members);
	        return this;
	      }

	      // TODO: Should use the bulk operation when it becomes available.
	      members.forEach(function (identityId) {
	        _this2._xhr({
	          url: '/members/' + identityId.replace(/^layer:\/\/\/identities\//, ''),
	          method: 'PUT'
	        });
	      });
	      return this;
	    }

	    /**
	     * Remove the following members from the Channel.
	     *
	     * Not yet supported.
	     *
	     * @method removeMembers
	     * @param {String[]} members   Identity IDs of users to remove from this Channel
	     * @return {layer.Channel} this
	     *
	     *
	     *
	     *
	     *
	     * @ignore until server supports it
	     */

	  }, {
	    key: 'removeMembers',
	    value: function removeMembers(members) {
	      var _this3 = this;

	      members = this.getClient()._fixIdentities(members).map(function (item) {
	        return item.id;
	      });

	      if (this.syncState === Constants$5.SYNC_STATE.NEW) {
	        members.forEach(function (id) {
	          var index = _this3._members.indexOf(id);
	          if (index !== -1) _this3._members.splice(index, 1);
	        });
	        return this;
	      }

	      // TODO: Should use the bulk operation when it becomes available.
	      members.forEach(function (identityId) {
	        _this3._xhr({
	          url: '/members/' + identityId.replace(/^layer:\/\/\/identities\//, ''),
	          method: 'DELETE'
	        });
	      });
	      return this;
	    }

	    /**
	     * Add the current user to this channel.
	     *
	     * @method join
	     * @return {layer.Channel} this
	     *
	     *
	     *
	     *
	     *
	     * @ignore until server supports it
	     */

	  }, {
	    key: 'join',
	    value: function join() {
	      return this.addMembers([this.getClient().user.id]);
	    }

	    /**
	     * remove the current user from this channel.
	     *
	     * @method leave
	     * @return {layer.Channel} this
	     *
	     *
	     *
	     *
	     * @ignore until server supports it
	     */

	  }, {
	    key: 'leave',
	    value: function leave() {
	      return this.removeMembers([this.getClient().user.id]);
	    }

	    /**
	     * Return a Membership object for the specified Identity ID.
	     *
	     * If `members:loaded` is triggered, then your membership object
	     * has been populated with data.
	     *
	     * If `members:loaded-error` is triggered, then your membership object
	     * could not be loaded, either you have a connection error, or the user is not a member.
	     *
	     * ```
	     * var membership = channel.getMember('FrodoTheDodo');
	     * membership.on('membership:loaded', function(evt) {
	     *    alert('He IS a member, quick, kick him out!');
	     * });
	     * membership.on('membership:loaded-error', function(evt) {
	     *    if (evt.error.id === 'not_found') {
	     *      alert('Sauruman, he is with the Elves!');
	     *    } else {
	     *      alert('Sauruman, would you please pick up your Palantir already? I can't connect!');
	     *    }
	     * });
	     * ```
	     * @method getMember
	     * @param {String} identityId
	     * @returns {layer.Membership}
	     */

	  }, {
	    key: 'getMember',
	    value: function getMember(identityId) {
	      identityId = this.getClient()._fixIdentities([identityId])[0].id;
	      var membershipId = this.id + '/members/' + identityId.replace(/layer:\/\/\/identities\//, '');
	      return this.getClient().getMember(membershipId, true);
	    }

	    /**
	     * Delete the channel; not currently supported.
	     *
	     * @method delete
	     */

	  }, {
	    key: 'delete',
	    value: function _delete() {
	      this._delete('');
	    }

	    /**
	     * LayerPatch will call this after changing any properties.
	     *
	     * Trigger any cleanup or events needed after these changes.
	     *
	     * TODO: Move this to layer.Container
	     *
	     * @method _handlePatchEvent
	     * @private
	     * @param  {Mixed} newValue - New value of the property
	     * @param  {Mixed} oldValue - Prior value of the property
	     * @param  {string[]} paths - Array of paths specifically modified: ['participants'], ['metadata.keyA', 'metadata.keyB']
	     */

	  }, {
	    key: '_handlePatchEvent',
	    value: function _handlePatchEvent(newValue, oldValue, paths) {
	      // Certain types of __update handlers are disabled while values are being set by
	      // layer patch parser because the difference between setting a value (triggers an event)
	      // and change a property of a value (triggers only this callback) result in inconsistent
	      // behaviors.  Enable them long enough to allow __update calls to be made
	      this._inLayerParser = false;
	      try {
	        var events = this._disableEvents;
	        this._disableEvents = false;
	        _get$9(Channel.prototype.__proto__ || Object.getPrototypeOf(Channel.prototype), '_handlePatchEvent', this).call(this, newValue, oldValue, paths);
	        this._disableEvents = events;
	      } catch (err) {
	        // do nothing
	      }
	      this._inLayerParser = true;
	    }

	    /**
	     * Register this Channel with the Client
	     *
	     * @method _register
	     * @private
	     */

	  }, {
	    key: '_register',
	    value: function _register() {
	      var client = this.getClient();
	      client._addChannel(this);
	    }
	  }, {
	    key: '_deleteResult',
	    value: function _deleteResult(result, id) {
	      var client = this.getClient();
	      if (!result.success && (!result.data || result.data.id !== 'not_found' && result.data.id !== 'authentication_required')) {
	        Channel.load(id, client);
	      }
	    }

	    /**
	     * Returns a plain object.
	     *
	     * Object will have all the same public properties as this
	     * Conversation instance.  New object is returned any time
	     * any of this object's properties change.
	     *
	     * @method toObject
	     * @return {Object} POJO version of this.
	     */

	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      if (!this._toObject) {
	        this._toObject = _get$9(Channel.prototype.__proto__ || Object.getPrototypeOf(Channel.prototype), 'toObject', this).call(this);
	        this._toObject.membership = Util$7.clone(this.membership);
	      }
	      return this._toObject;
	    }

	    /**
	     * Create a channel instance from a server representation of the channel.
	     *
	     * If the Channel already exists, will update the existing copy with
	     * presumably newer values.
	     *
	     * @method _createFromServer
	     * @protected
	     * @static
	     * @param  {Object} channel - Server representation of a Channel
	     * @param  {layer.Client} client
	     * @return {layer.Channel}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(channel, client) {
	      return new Channel({
	        client: client,
	        fromServer: channel,
	        _fromDB: channel._fromDB
	      });
	    }

	    /**
	     * Find or create a new Channel.
	     *
	     *      var channel = layer.Channel.create({
	     *          members: ['a', 'b'],
	     *          private: true,
	     *          metadata: {
	     *              titleDetails: 'I am not a detail!'
	     *          },
	     *          client: client,
	     *          'channels:loaded': function(evt) {
	     *
	     *          }
	     *      });
	     *
	     * Recommend using `client.createChannel({...})`
	     * instead of `Channel.create({...})`.
	     *
	     * @method create
	     * @static
	     * @protected
	     * @param  {Object} options
	     * @param  {layer.Client} options.client
	     * @param  {string[]/layer.Identity[]} options.members - Array of Participant IDs or layer.Identity objects to create a channel with.
	     * @param {boolean} [options.private=false] - Create a private channel
	     * @param {Object} [options.metadata={}] - Initial metadata for Channel
	     * @return {layer.Channel}
	     */

	  }, {
	    key: 'create',
	    value: function create(options) {
	      if (!options.client) throw new Error(LayerError$11.dictionary.clientMissing);
	      if (!options.name) options.name = 'channel-' + String(Math.random()).replace(/\./, '');
	      var newOptions = {
	        name: options.name,
	        private: options.private,
	        members: options.members ? options.client._fixIdentities(options.members).map(function (item) {
	          return item.id;
	        }) : [],
	        metadata: options.metadata,
	        client: options.client
	      };

	      var channel = options.client.findCachedChannel(function (aChannel) {
	        return aChannel.name === newOptions.name;
	      });

	      if (channel) {
	        channel._sendDistinctEvent = new LayerEvent$3({
	          target: channel,
	          result: !options.metadata || Util$7.doesObjectMatch(options.metadata, channel.metadata) ? Channel.FOUND : Channel.FOUND_WITHOUT_REQUESTED_METADATA
	        }, 'channels:sent');
	      }

	      return channel || new Channel(newOptions);
	    }
	  }]);

	  return Channel;
	}(Container$2);

	/**
	 * The Channel's name; this must be unique.
	 *
	 * Note that while you can use a displayable human readable name, you may also choose to use this
	 * as an ID that you can easily localize to different languages.
	 *
	 * Must not be a UUID.
	 *
	 * @property {String} name
	 */


	Channel$2.prototype.name = '';

	/**
	 * The `membership` object contains details of this user's membership within this channel.
	 *
	 * NOTE: Initially, only `isMember` will be available.
	 *
	 * ```
	 * {
	 *     "isMember": true,
	 *     "role": "user",
	 *     "lastUnreadMessageId: "layer:///messages/UUID"
	 * }
	 * ```
	 * @property {Object}
	 */
	Channel$2.prototype.membership = null;

	Channel$2.prototype._members = null;

	Channel$2.eventPrefix = 'channels';

	// Math.pow(2, 64); a number larger than Number.MAX_SAFE_INTEGER, and larger than Java's Max Unsigned Long. And an easy to work with
	// factor of 2
	Channel$2.nextPosition = 18446744073709552000;

	/**
	 * Prefix to use when generating an ID for instances of this class
	 * @type {String}
	 * @static
	 * @private
	 */
	Channel$2.prefixUUID = 'layer:///channels/';

	Channel$2._supportedEvents = [

	/**
	 * The conversation is now on the server.
	 *
	 * Called after successfully creating the conversation
	 * on the server.  The Result property is one of:
	 *
	 * * Channel.CREATED: A new Channel has been created
	 * * Channel.FOUND: A matching named Channel has been found
	 *
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {string} event.result
	 */
	'channels:sent',

	/**
	 * An attempt to send this channel to the server has failed.
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {layer.LayerError} event.error
	 */
	'channels:sent-error',

	/**
	 * The conversation is now loaded from the server.
	 *
	 * Note that this is only used in response to the layer.Channel.load() method.
	 * from the server.
	 * @event
	 * @param {layer.LayerEvent} event
	 */
	'channels:loaded',

	/**
	 * An attempt to load this conversation from the server has failed.
	 *
	 * Note that this is only used in response to the layer.Channel.load() method.
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {layer.LayerError} event.error
	 */
	'channels:loaded-error',

	/**
	 * The conversation has been deleted from the server.
	 *
	 * Caused by either a successful call to delete() on this instance
	 * or by a remote user.
	 * @event
	 * @param {layer.LayerEvent} event
	 */
	'channels:delete',

	/**
	 * This channel has changed.
	 *
	 * @event
	 * @param {layer.LayerEvent} event
	 * @param {Object[]} event.changes - Array of changes reported by this event
	 * @param {Mixed} event.changes.newValue
	 * @param {Mixed} event.changes.oldValue
	 * @param {string} event.changes.property - Name of the property that changed
	 * @param {layer.Conversation} event.target
	 */
	'channels:change'].concat(Syncable$5._supportedEvents);

	Root$12.initClass.apply(Channel$2, [Channel$2, 'Channel']);
	Syncable$5.subclasses.push(Channel$2);
	var channel = Channel$2;

	var _createClass$7 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$7(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * @class  layer.Websockets.ChangeManager
	 * @private
	 *
	 * This class listens for `change` events from the websocket server,
	 * and processes them.
	 */
	var Utils$2 = clientUtils;
	var logger$4 = logger_1;
	var Message = message;
	var Conversation$1 = conversation;
	var Channel$1 = channel;

	var WebsocketChangeManager$1 = function () {
	  /**
	   * Create a new websocket change manager
	   *
	   *      var websocketChangeManager = new layer.Websockets.ChangeManager({
	   *          client: client,
	   *          socketManager: client.Websockets.SocketManager
	   *      });
	   *
	   * @method
	   * @param  {Object} options
	   * @param {layer.Client} client
	   * @param {layer.Websockets.SocketManager} socketManager
	   * @returns {layer.Websockets.ChangeManager}
	   */
	  function WebsocketChangeManager(options) {
	    _classCallCheck$7(this, WebsocketChangeManager);

	    this.client = options.client;
	    options.socketManager.on('message', this._handleChange, this);
	  }

	  /**
	   * Handles a Change packet from the server.
	   *
	   * @method _handleChange
	   * @private
	   * @param  {layer.LayerEvent} evt
	   */


	  _createClass$7(WebsocketChangeManager, [{
	    key: '_handleChange',
	    value: function _handleChange(evt) {
	      if (evt.data.type === 'change') {
	        this._processChange(evt.data.body);
	      } else if (evt.data.type === 'operation') {
	        this.client.trigger('websocket:operation', { data: evt.data.body });
	      }
	    }

	    /**
	     * Process changes from a change packet.
	     *
	     * Called both by _handleChange, and by the requestManager on getting a changes array.
	     *
	     * @method _processChanage
	     * @private
	     * @param {Object} msg
	     */

	  }, {
	    key: '_processChange',
	    value: function _processChange(msg) {
	      switch (msg.operation) {
	        case 'create':
	          logger$4.info('Websocket Change Event: Create ' + msg.object.type + ' ' + msg.object.id);
	          logger$4.debug(msg.data);
	          this._handleCreate(msg);
	          break;
	        case 'delete':
	          logger$4.info('Websocket Change Event: Delete ' + msg.object.type + ' ' + msg.object.id);
	          logger$4.debug(msg.data);
	          this._handleDelete(msg);
	          break;
	        case 'update':
	          logger$4.info('Websocket Change Event: Patch ' + msg.object.type + ' ' + msg.object.id + ': ' + msg.data.map(function (op) {
	            return op.property;
	          }).join(', '));
	          logger$4.debug(msg.data);
	          this._handlePatch(msg);
	          break;
	      }
	    }

	    /**
	     * Process a create object message from the server
	     *
	     * @method _handleCreate
	     * @private
	     * @param  {Object} msg
	     */

	  }, {
	    key: '_handleCreate',
	    value: function _handleCreate(msg) {
	      msg.data.fromWebsocket = true;
	      this.client._createObject(msg.data);
	    }

	    /**
	     * Handles delete object messages from the server.
	     * All objects that can be deleted from the server should
	     * provide a _deleted() method to be called prior to destroy().
	     *
	     * @method _handleDelete
	     * @private
	     * @param  {Object} msg
	     */

	  }, {
	    key: '_handleDelete',
	    value: function _handleDelete(msg) {
	      var entity = this.getObject(msg);
	      if (entity) {
	        entity._handleWebsocketDelete(msg.data);
	      }
	    }

	    /**
	     * On receiving an update/patch message from the server
	     * run the LayerParser on the data.
	     *
	     * @method _handlePatch
	     * @private
	     * @param  {Object} msg
	     */

	  }, {
	    key: '_handlePatch',
	    value: function _handlePatch(msg) {
	      // Can only patch a cached object
	      var entity = this.getObject(msg);
	      if (entity) {
	        try {
	          entity._inLayerParser = true;
	          Utils$2.layerParse({
	            object: entity,
	            type: msg.object.type,
	            operations: msg.data,
	            client: this.client
	          });
	          entity._inLayerParser = false;
	        } catch (err) {
	          logger$4.error('websocket-manager: Failed to handle event', msg.data);
	        }
	      } else {
	        switch (Utils$2.typeFromID(msg.object.id)) {
	          case 'channels':
	            if (Channel$1._loadResourceForPatch(msg.data)) this.client.getObject(msg.object.id, true);
	            break;
	          case 'conversations':
	            if (Conversation$1._loadResourceForPatch(msg.data)) this.client.getObject(msg.object.id, true);
	            break;
	          case 'messages':
	            if (Message._loadResourceForPatch(msg.data)) this.client.getMessage(msg.object.id, true);
	            break;
	          case 'announcements':
	            break;
	        }
	      }
	    }

	    /**
	     * Get the object specified by the `object` property of the websocket packet.
	     *
	     * @method getObject
	     * @private
	     * @param  {Object} msg
	     * @return {layer.Root}
	     */

	  }, {
	    key: 'getObject',
	    value: function getObject(msg) {
	      return this.client.getObject(msg.object.id);
	    }

	    /**
	     * Not required, but destroy is best practice
	     * @method destroy
	     */

	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this.client = null;
	    }
	  }]);

	  return WebsocketChangeManager;
	}();

	/**
	 * The Client that owns this.
	 * @type {layer.Client}
	 */


	WebsocketChangeManager$1.prototype.client = null;

	var changeManager = WebsocketChangeManager$1;

	var _createClass$18 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$18(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * @class  layer.Websockets.RequestManager
	 * @private
	 *
	 * This class allows one to send requests to the websocket server, and provide a callback,
	 * And have that callback either called by the correct websocket server response, or
	 * be called with a timeout.
	 */
	var Utils$3 = clientUtils;
	var logger$8 = logger_1;
	var LayerError$13 = layerError;

	// Wait 15 seconds for a response and then give up
	var DELAY_UNTIL_TIMEOUT = 15 * 1000;

	var WebsocketRequestManager$1 = function () {
	  /**
	   * Create a new websocket change manager
	   *
	   *      var websocketRequestManager = new layer.Websockets.RequestManager({
	   *          client: client,
	   *          socketManager: client.Websockets.SocketManager
	   *      });
	   *
	   * @method
	   * @param  {Object} options
	   * @param {layer.Client} client
	   * @param {layer.Websockets.SocketManager} socketManager
	   * @returns {layer.Websockets.RequestManager}
	   */
	  function WebsocketRequestManager(options) {
	    _classCallCheck$18(this, WebsocketRequestManager);

	    this.client = options.client;
	    this.socketManager = options.socketManager;
	    this.socketManager.on({
	      message: this._handleResponse,
	      disconnected: this._reset
	    }, this);

	    this._requestCallbacks = {};
	  }

	  _createClass$18(WebsocketRequestManager, [{
	    key: '_reset',
	    value: function _reset() {
	      this._requestCallbacks = {};
	    }

	    /**
	     * This is an imprecise method; it will cancel ALL requests of a given type.
	     *
	     * @method cancelOperation
	     * @param {String} methodName    `Message.create`, `Event.sync`, etc...
	     */

	  }, {
	    key: 'cancelOperation',
	    value: function cancelOperation(methodName) {
	      var _this = this;

	      Object.keys(this._requestCallbacks).forEach(function (key) {
	        var requestConfig = _this._requestCallbacks[key];
	        if (requestConfig.method === methodName) delete _this._requestCallbacks[key];
	      });
	    }

	    /**
	     * Handle a response to a request.
	     *
	     * @method _handleResponse
	     * @private
	     * @param  {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_handleResponse',
	    value: function _handleResponse(evt) {
	      if (evt.data.type === 'response') {
	        var msg = evt.data.body;
	        var requestId = msg.request_id;
	        logger$8.debug('Websocket response ' + requestId + ' ' + (msg.success ? 'Successful' : 'Failed'));

	        if (requestId && this._requestCallbacks[requestId]) {
	          this._processResponse(requestId, evt);
	        }
	      }
	    }

	    /**
	     * Process a response to a request; used by _handleResponse.
	     *
	     * Refactored out of _handleResponse so that unit tests can easily
	     * use it to trigger completion of a request.
	     *
	     * @method _processResponse
	     * @private
	     * @param {String} requestId
	     * @param {Object} evt   Data from the server
	     */

	  }, {
	    key: '_processResponse',
	    value: function _processResponse(requestId, evt) {
	      var request = this._requestCallbacks[requestId];
	      var msg = evt.data.body;
	      var data = (msg.success ? msg.data : new LayerError$13(msg.data)) || {};

	      if (msg.success) {
	        if (request.isChangesArray) {
	          this._handleChangesArray(data.changes);
	        }
	        if ('batch' in data) {
	          request.batchTotal = data.batch.count;
	          request.batchIndex = data.batch.index;
	          if (request.isChangesArray) {
	            request.results = request.results.concat(data.changes);
	          } else if ('results' in data && Array.isArray(data.results)) {
	            request.results = request.results.concat(data.results);
	          }
	          if (data.batch.index < data.batch.count - 1) return;
	        }
	      }
	      request.callback({
	        success: msg.success,
	        fullData: 'batch' in data ? request.results : evt.data,
	        data: data
	      });
	      delete this._requestCallbacks[requestId];
	    }

	    /**
	     * Any request that contains an array of changes should deliver each change
	     * to the socketChangeManager.
	     *
	     * @method _handleChangesArray
	     * @private
	     * @param {Object[]} changes   "create", "update", and "delete" requests from server.
	     */

	  }, {
	    key: '_handleChangesArray',
	    value: function _handleChangesArray(changes) {
	      var _this2 = this;

	      changes.forEach(function (change) {
	        return _this2.client.socketChangeManager._processChange(change);
	      });
	    }

	    /**
	     * Shortcut for sending a request; builds in handling for callbacks
	     *
	     *    manager.sendRequest({
	     *      data: {
	     *        operation: "delete",
	     *        object: {id: "layer:///conversations/uuid"},
	     *        data: {deletion_mode: "all_participants"}
	     *      },
	     *      callback: function(result) {
	     *        alert(result.success ? "Yay" : "Boo");
	     *      },
	     *      isChangesArray: false
	     *    });
	     *
	     * @method sendRequest
	     * @param  {Object} options
	     * @param  {Object} otions.data                     Data to send to the server
	     * @param  {Function} [options.callback=null]       Handler for success/failure callback
	     * @param  {Boolean} [options.isChangesArray=false] Response contains a changes array that can be fed directly to change-manager.
	     * @returns the request callback object if there is one; primarily for use in testing.
	     */

	  }, {
	    key: 'sendRequest',
	    value: function sendRequest(_ref) {
	      var data = _ref.data,
	          callback = _ref.callback,
	          _ref$isChangesArray = _ref.isChangesArray,
	          isChangesArray = _ref$isChangesArray === undefined ? false : _ref$isChangesArray;

	      if (!this._isOpen()) {
	        return !callback ? undefined : callback(new LayerError$13({
	          success: false,
	          data: { id: 'not_connected', code: 0, message: 'WebSocket not connected' }
	        }));
	      }
	      var body = Utils$3.clone(data);
	      body.request_id = 'r' + this._nextRequestId++;
	      logger$8.debug('Request ' + body.request_id + ' is sending');
	      if (callback) {
	        this._requestCallbacks[body.request_id] = {
	          request_id: body.request_id,
	          date: Date.now(),
	          callback: callback,
	          isChangesArray: isChangesArray,
	          method: data.method,
	          batchIndex: -1,
	          batchTotal: -1,
	          results: []
	        };
	      }

	      this.socketManager.send({
	        type: 'request',
	        body: body
	      });
	      this._scheduleCallbackCleanup();
	      if (body.request_id) return this._requestCallbacks[body.request_id];
	    }

	    /**
	     * Flags a request as having failed if no response within 2 minutes
	     *
	     * @method _scheduleCallbackCleanup
	     * @private
	     */

	  }, {
	    key: '_scheduleCallbackCleanup',
	    value: function _scheduleCallbackCleanup() {
	      if (!this._callbackCleanupId) {
	        this._callbackCleanupId = setTimeout(this._runCallbackCleanup.bind(this), DELAY_UNTIL_TIMEOUT + 50);
	      }
	    }

	    /**
	     * Calls callback with an error.
	     *
	     * NOTE: Because we call requests that expect responses serially instead of in parallel,
	     * currently there should only ever be a single entry in _requestCallbacks.  This may change in the future.
	     *
	     * @method _runCallbackCleanup
	     * @private
	     */

	  }, {
	    key: '_runCallbackCleanup',
	    value: function _runCallbackCleanup() {
	      var _this3 = this;

	      this._callbackCleanupId = 0;
	      // If the websocket is closed, ignore all callbacks.  The Sync Manager will reissue these requests as soon as it gets
	      // a 'connected' event... they have not failed.  May need to rethink this for cases where third parties are directly
	      // calling the websocket manager bypassing the sync manager.
	      if (this.isDestroyed || !this._isOpen()) return;
	      var count = 0,
	          abort = false;
	      var now = Date.now();
	      Object.keys(this._requestCallbacks).forEach(function (requestId) {
	        var callbackConfig = _this3._requestCallbacks[requestId];
	        if (abort) return;

	        // If the request hasn't expired, we'll need to reschedule callback cleanup; else if its expired...
	        if (callbackConfig && now < callbackConfig.date + DELAY_UNTIL_TIMEOUT) {
	          count++;
	        }

	        // If there has been no data from the server, there's probably a problem with the websocket; reconnect.
	        else if (now > _this3.socketManager._lastDataFromServerTimestamp + DELAY_UNTIL_TIMEOUT) {
	            // Retrying isn't currently handled here; its handled by the caller (typically sync-manager); so clear out all requests,
	            // notifying the callers that they have failed.
	            abort = true;
	            _this3._failAll();
	            _this3.socketManager._reconnect(false);
	          } else {
	            // The request isn't responding and the socket is good; fail the request.
	            _this3._timeoutRequest(requestId);
	          }
	      });
	      if (count) this._scheduleCallbackCleanup();
	    }

	    /**
	     * Any requests that have not had responses are considered as failed if we disconnect without a response.
	     *
	     * Call all callbacks with a `server_unavailable` error.  The caller may retry,
	     * but this component does not have built-in retry.
	     *
	     * @method
	     * @private
	     */

	  }, {
	    key: '_failAll',
	    value: function _failAll() {
	      var _this4 = this;

	      Object.keys(this._requestCallbacks).forEach(function (requestId) {
	        try {
	          logger$8.warn('Websocket request aborted due to reconnect');
	          _this4._requestCallbacks[requestId].callback({
	            success: false,
	            status: 503,
	            data: new LayerError$13({
	              id: 'socket_dead',
	              message: 'Websocket appears to be dead. Reconnecting.',
	              url: 'https:/developer.layer.com/docs/websdk',
	              code: 0,
	              status: 503,
	              httpStatus: 503
	            })
	          });
	        } catch (err) {
	          // Do nothing
	        }
	        delete _this4._requestCallbacks[requestId];
	      });
	    }
	  }, {
	    key: '_timeoutRequest',
	    value: function _timeoutRequest(requestId) {
	      try {
	        logger$8.warn('Websocket request timeout');
	        this._requestCallbacks[requestId].callback({
	          success: false,
	          data: new LayerError$13({
	            id: 'request_timeout',
	            message: 'The server is not responding. We know how much that sucks.',
	            url: 'https:/developer.layer.com/docs/websdk',
	            code: 0,
	            status: 408,
	            httpStatus: 408
	          })
	        });
	      } catch (err) {
	        // Do nothing
	      }
	      delete this._requestCallbacks[requestId];
	    }
	  }, {
	    key: '_isOpen',
	    value: function _isOpen() {
	      return this.socketManager._isOpen();
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this.isDestroyed = true;
	      if (this._callbackCleanupId) clearTimeout(this._callbackCleanupId);
	      this._requestCallbacks = null;
	    }
	  }]);

	  return WebsocketRequestManager;
	}();

	WebsocketRequestManager$1.prototype._nextRequestId = 1;

	/**
	 * The Client that owns this.
	 * @type {layer.Client}
	 */
	WebsocketRequestManager$1.prototype.client = null;

	WebsocketRequestManager$1.prototype._requestCallbacks = null;

	WebsocketRequestManager$1.prototype._callbackCleanupId = 0;

	WebsocketRequestManager$1.prototype.socketManager = null;

	var requestManager = WebsocketRequestManager$1;

	var _createClass$19 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$10 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$19(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$14(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$14(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * This class manages a state variable for whether we are online/offline, triggers events
	 * when the state changes, and determines when to perform tests to validate our online status.
	 *
	 * It performs the following tasks:
	 *
	 * 1. Any time we go more than this.pingFrequency (100 seconds) without any data from the server, flag us as being offline.
	 *    Rationale: The websocket manager is calling `getCounter` every 30 seconds; so it would have had to fail to get any response
	 *    3 times before we give up.
	 * 2. While we are offline, ping the server until we determine we are in fact able to connect to the server
	 * 3. Any time there is a browser `online` or `offline` event, check to see if we can in fact reach the server.  Do not trust either event to be wholly accurate.
	 *    We may be online, but still unable to reach any services.  And Chrome tabs in our tests have shown `navigator.onLine` to sometimes be `false` even while connected.
	 * 4. Trigger events `connected` and `disconnected` to let the rest of the system know when we are/are not connected.
	 *    NOTE: The Websocket manager will use that to reconnect its websocket, and resume its `getCounter` call every 30 seconds.
	 *
	 * NOTE: Apps that want to be notified of changes to online/offline state should see layer.Client's `online` event.
	 *
	 * NOTE: One iteration of this class treated navigator.onLine = false as fact.  If onLine is false, then we don't need to test
	 * anything.  If its true, then this class verifies it can reach layer's servers.  However, https://code.google.com/p/chromium/issues/detail?id=277372 has replicated multiple times in chrome; this bug causes one tab of chrome to have navigator.onLine=false while all other tabs
	 * correctly report navigator.onLine=true.  As a result, we can't rely on this value and this class must continue to poll the server while
	 * offline and to ignore values from navigator.onLine.  Future Work: Allow non-chrome browsers to use navigator.onLine.
	 *
	 * @class  layer.OnlineStateManager
	 * @private
	 * @extends layer.Root
	 *
	 */
	var Root$14 = root;
	var xhr$5 = xhr$1;
	var logger$9 = logger_1;
	var Utils$4 = clientUtils;

	var _require$5 = _const;
	var ACCEPT$1 = _require$5.ACCEPT;

	var OnlineStateManager = function (_Root) {
	  _inherits$14(OnlineStateManager, _Root);

	  /**
	   * Creates a new OnlineStateManager.
	   *
	   * An Application is expected to only have one of these.
	   *
	   *      var onlineStateManager = new layer.OnlineStateManager({
	   *          socketManager: socketManager,
	   *      });
	   *
	   * @method constructor
	   * @param  {Object} options
	   * @param  {layer.Websockets.SocketManager} options.socketManager - A websocket manager to monitor for messages
	   */
	  function OnlineStateManager(options) {
	    _classCallCheck$19(this, OnlineStateManager);

	    // Listen to all xhr events and websocket messages for online-status info
	    var _this = _possibleConstructorReturn$14(this, (OnlineStateManager.__proto__ || Object.getPrototypeOf(OnlineStateManager)).call(this, options));

	    xhr$5.addConnectionListener(function (evt) {
	      return _this._connectionListener(evt);
	    });
	    _this.socketManager.on('message', function () {
	      return _this._connectionListener({ status: 'connection:success' });
	    }, _this);

	    // Any change in online status reported by the browser should result in
	    // an immediate update to our online/offline state
	    /* istanbul ignore else */
	    if (typeof window !== 'undefined' && window.addEventListener) {
	      window.addEventListener('online', _this._handleOnlineEvent.bind(_this));
	      window.addEventListener('offline', _this._handleOnlineEvent.bind(_this));
	    } else {
	      var OnlineEvents = commonjsGlobal.getNativeSupport('OnlineEvents');
	      if (OnlineEvents) {
	        OnlineEvents.addEventListener('change', _this._handleOnlineEvent.bind(_this));
	      }
	    }
	    return _this;
	  }

	  /**
	   * We don't actually start managing our online state until after the client has authenticated.
	   * Call start() when we are ready for the client to start managing our state.
	   *
	   * The client won't call start() without first validating that we have a valid session, so by definition,
	   * calling start means we are online.
	   *
	   * @method start
	   */


	  _createClass$19(OnlineStateManager, [{
	    key: 'start',
	    value: function start() {
	      logger$9.info('OnlineStateManager: start');
	      this.isClientReady = true;
	      this.isOnline = true;

	      this.checkOnlineStatus();
	    }

	    /**
	     * If the client becomes unauthenticated, stop checking if we are online, and announce that we are offline.
	     *
	     * @method stop
	     */

	  }, {
	    key: 'stop',
	    value: function stop() {
	      logger$9.info('OnlineStateManager: stop');
	      this.isClientReady = false;
	      this._clearCheck();
	      this._changeToOffline();
	    }

	    /**
	     * Schedules our next call to _onlineExpired if online or checkOnlineStatus if offline.
	     *
	     * @method _scheduleNextOnlineCheck
	     * @private
	     */

	  }, {
	    key: '_scheduleNextOnlineCheck',
	    value: function _scheduleNextOnlineCheck(connectionFailure, callback) {
	      logger$9.debug('OnlineStateManager: skip schedule');
	      if (this.isDestroyed || !this.isClientReady) return;

	      // Replace any scheduled calls with the newly scheduled call:
	      this._clearCheck();

	      // If this is called while we are online, then we are using this to detect when we've gone without data for more than pingFrequency.
	      // Call this._onlineExpired after pingFrequency of no server responses.
	      if (!connectionFailure && this.isOnline) {
	        logger$9.debug('OnlineStateManager: Scheduled onlineExpired');
	        this.onlineCheckId = setTimeout(this._onlineExpired.bind(this), this.pingFrequency);
	      }

	      // If this is called while we are offline, we're doing exponential backoff pinging the server to see if we've come back online.
	      else {
	          logger$9.info('OnlineStateManager: Scheduled checkOnlineStatus');
	          var duration = Utils$4.getExponentialBackoffSeconds(this.maxOfflineWait, Math.min(10, this.offlineCounter++));
	          this.onlineCheckId = setTimeout(this.checkOnlineStatus.bind(this, callback), Math.floor(duration * 1000));
	        }
	    }

	    /**
	     * Cancels any upcoming calls to checkOnlineStatus
	     *
	     * @method _clearCheck
	     * @private
	     */

	  }, {
	    key: '_clearCheck',
	    value: function _clearCheck() {
	      if (this.onlineCheckId) {
	        clearTimeout(this.onlineCheckId);
	        this.onlineCheckId = 0;
	      }
	    }

	    /**
	     * Respond to the browser's online/offline events.
	     *
	     * Our response is not to trust them, but to use them as
	     * a trigger to indicate we should immediately do our own
	     * validation.
	     *
	     * @method _handleOnlineEvent
	     * @private
	     * @param  {Event} evt - Browser online/offline event object
	     */

	  }, {
	    key: '_handleOnlineEvent',
	    value: function _handleOnlineEvent(evt) {
	      // Reset the counter because our first request may fail as they may not be
	      // fully connected yet
	      this.offlineCounter = 0;
	      this.checkOnlineStatus();
	    }

	    /**
	     * Our online state has expired; we are now offline.
	     *
	     * If this method gets called, it means that our connection has gone too long without any data
	     * and is now considered to be disconnected.  Start scheduling tests to see when we are back online.
	     *
	     * @method _onlineExpired
	     * @private
	     */

	  }, {
	    key: '_onlineExpired',
	    value: function _onlineExpired() {
	      this._clearCheck();
	      this._changeToOffline();
	      this._scheduleNextOnlineCheck();
	    }

	    /**
	     * Get a nonce to see if we can reach the server.
	     *
	     * We don't care about the result,
	     * we just care about triggering a 'connection:success' or 'connection:error' event
	     * which connectionListener will respond to.
	     *
	     *      client.onlineManager.checkOnlineStatus(function(result) {
	     *          alert(result ? 'We're online!' : 'Doh!');
	     *      });
	     *
	     * @method checkOnlineStatus
	     * @param {Function} callback
	     * @param {boolean} callback.isOnline - Callback is called with true if online, false if not
	     */

	  }, {
	    key: 'checkOnlineStatus',
	    value: function checkOnlineStatus(callback) {
	      this._clearCheck();
	      var client = this.socketManager.client;

	      logger$9.info('OnlineStateManager: Firing XHR for online check');
	      this._lastCheckOnlineStatus = new Date();
	      // Ping the server and see if we're connected.
	      xhr$5({
	        url: client.url + '/ping?client=' + client.constructor.version,
	        method: 'HEAD',
	        headers: {
	          accept: ACCEPT$1
	        }
	      }, function (_ref) {
	        var status = _ref.status;

	        // this.isOnline will be updated via _connectionListener prior to this line executing
	        if (callback) callback(status !== 408);
	      });
	    }

	    /**
	     * On determining that we are offline, handles the state transition and logging.
	     *
	     * @method _changeToOffline
	     * @private
	     */

	  }, {
	    key: '_changeToOffline',
	    value: function _changeToOffline() {
	      if (this.isOnline) {
	        this.isOnline = false;
	        this.trigger('disconnected');
	        logger$9.info('OnlineStateManager: Connection lost');
	      }
	    }

	    /**
	     * Called whenever a websocket event arrives, or an xhr call completes; updates our isOnline state.
	     *
	     * Any call to this method will reschedule our next is-online test
	     *
	     * @method _connectionListener
	     * @private
	     * @param  {string} evt - Name of the event; either 'connection:success' or 'connection:error'
	     */

	  }, {
	    key: '_connectionListener',
	    value: function _connectionListener(evt) {
	      var _this2 = this;

	      // If event is a success, change us to online
	      var failed = evt.status !== 'connection:success';
	      if (!failed) {
	        var lastTime = this.lastMessageTime;
	        this.lastMessageTime = new Date();
	        if (!this.isOnline) {
	          this.isOnline = true;
	          this.offlineCounter = 0;
	          this.trigger('connected', { offlineDuration: lastTime ? Date.now() - lastTime : 0 });
	          if (this.connectedCounter === undefined) this.connectedCounter = 0;
	          this.connectedCounter++;
	          logger$9.info('OnlineStateManager: Connected restored');
	        }
	      }

	      this._scheduleNextOnlineCheck(failed, function (result) {
	        if (!result) _this2._changeToOffline();
	      });
	    }

	    /**
	     * Cleanup/shutdown
	     *
	     * @method destroy
	     */

	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this._clearCheck();
	      this.socketManager = null;
	      _get$10(OnlineStateManager.prototype.__proto__ || Object.getPrototypeOf(OnlineStateManager.prototype), 'destroy', this).call(this);
	    }
	  }]);

	  return OnlineStateManager;
	}(Root$14);

	OnlineStateManager.prototype.isClientReady = false;

	/**
	 * A Websocket manager whose 'message' event we will listen to
	 * in order to know that we are still online.
	 * @type {layer.Websockets.SocketManager}
	 */
	OnlineStateManager.prototype.socketManager = null;

	/**
	 * Number of test requests we've been offline for.
	 *
	 * Will stop growing once the number is suitably large (10-20).
	 * @type {Number}
	 */
	OnlineStateManager.prototype.offlineCounter = 0;

	/**
	 * Maximum wait during exponential backoff while offline.
	 *
	 * While offline, exponential backoff is used to calculate how long to wait between checking with the server
	 * to see if we are online again. This value determines the maximum wait; any higher value returned by exponential backoff
	 * are ignored and this value used instead.
	 * Value is measured in seconds.
	 * @type {Number}
	 */
	OnlineStateManager.prototype.maxOfflineWait = 60;

	/**
	 * Minimum wait between tries in ms.
	 * @type {Number}
	 */
	OnlineStateManager.prototype.minBackoffWait = 100;

	/**
	 * Time that the last successful message was observed.
	 * @type {Date}
	 */
	OnlineStateManager.prototype.lastMessageTime = null;

	/**
	 * For debugging, tracks the last time we checked if we are online.
	 * @type {Date}
	 */
	OnlineStateManager.prototype._lastCheckOnlineStatus = null;

	/**
	 * Are we currently online?
	 * @type {Boolean}
	 */
	OnlineStateManager.prototype.isOnline = false;

	/**
	 * setTimeoutId for the next checkOnlineStatus() call.
	 * @type {Number}
	 */
	OnlineStateManager.prototype.onlineCheckId = 0;

	/**
	 * If we are online, how often do we need to ping to verify we are still online.
	 *
	 * Value is reset any time we observe any messages from the server.
	 * Measured in miliseconds. NOTE: Websocket has a separate ping which mostly makes
	 * this one unnecessary.  May end up removing this one... though we'd keep the
	 * ping for when our state is offline.
	 * @type {Number}
	 */
	OnlineStateManager.prototype.pingFrequency = 100 * 1000;

	OnlineStateManager._supportedEvents = [
	/**
	 * We appear to be online and able to send and receive
	 * @event connected
	 * @param {number} onlineDuration - Number of miliseconds since we were last known to be online
	 */
	'connected',

	/**
	 * We appear to be offline and unable to send or receive
	 * @event disconnected
	 */
	'disconnected'].concat(Root$14._supportedEvents);
	Root$14.initClass.apply(OnlineStateManager, [OnlineStateManager, 'OnlineStateManager']);
	var onlineStateManager = OnlineStateManager;

	var _createClass$21 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _possibleConstructorReturn$16(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$16(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	function _classCallCheck$21(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * A Sync Event represents a request to the server.
	 * A Sync Event may fire immediately, or may wait in the layer.SyncManager's
	 * queue for a long duration before firing.
	 *
	 * DO NOT confuse this with layer.LayerEvent which represents a change notification
	 * to your application.  layer.SyncEvent represents a request to the server that
	 * is either in progress or in queue.
	 *
	 * GET requests are typically NOT done via a SyncEvent as these are typically
	 * needed to render a UI and should either fail or succeed promptly.
	 *
	 * Applications typically do not interact with these objects.
	 *
	 * @class  layer.SyncEvent
	 * @extends layer.Root
	 */
	var Utils$6 = clientUtils;

	var SyncEvent = function () {
	  /**
	   * Create a layer.SyncEvent.  See layer.ClientAuthenticator for examples of usage.
	   *
	   * @method  constructor
	   * @private
	   * @return {layer.SyncEvent}
	   */
	  function SyncEvent(options) {
	    _classCallCheck$21(this, SyncEvent);

	    var key = void 0;
	    for (key in options) {
	      if (key in this) {
	        this[key] = options[key];
	      }
	    }
	    if (!this.depends) this.depends = [];
	    if (!this.id) this.id = 'layer:///syncevents/' + Utils$6.generateUUID();
	    if (!this.createdAt) this.createdAt = Date.now();
	  }

	  /**
	   * Not strictly required, but nice to clean things up.
	   *
	   * @method destroy
	   */


	  _createClass$21(SyncEvent, [{
	    key: 'destroy',
	    value: function destroy() {
	      this.target = null;
	      this.depends = null;
	      this.callback = null;
	      this.data = null;
	    }

	    /**
	     * Get the Real parameters for the request.
	     *
	     * @method _updateData
	     * @private
	     */

	  }, {
	    key: '_updateData',
	    value: function _updateData(client) {
	      if (!this.target) return;
	      var target = client.getObject(this.target);
	      if (target && this.operation === 'POST' && target._getSendData) {
	        this.data = target._getSendData(this.data);
	      }
	    }

	    /**
	     * Returns a POJO version of this object suitable for serializing for the network
	     * @method toObject
	     * @returns {Object}
	     */

	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      return { data: this.data };
	    }
	  }]);

	  return SyncEvent;
	}();

	/**
	 * The type of operation being performed.
	 *
	 * Either GET, PATCH, DELETE, POST or PUT
	 *
	 * @property {String}
	 */


	SyncEvent.prototype.operation = '';

	SyncEvent.prototype.fromDB = false;

	SyncEvent.prototype.createdAt = 0;

	/**
	 * Indicates whether this request currently in-flight.
	 *
	 * * Set to true by _xhr() method,
	 * * set to false on completion by layer.SyncManager.
	 * * set to false automatically after 2 minutes
	 *
	 * @property {Boolean}
	 */
	Object.defineProperty(SyncEvent.prototype, 'isFiring', {
	  enumerable: true,
	  set: function set(value) {
	    this.__isFiring = value;
	    if (value) this.__firedAt = Date.now();
	  },
	  get: function get() {
	    return Boolean(this.__isFiring && Date.now() - this.__firedAt < SyncEvent.FIRING_EXPIRATION);
	  }
	});

	/**
	 * Indicates whether this request currently being validated to insure it wasn't read
	 * from IndexedDB and fired by another tab.
	 *
	 * @property {Boolean}
	 */
	Object.defineProperty(SyncEvent.prototype, '_isValidating', {
	  enumerable: true,
	  set: function set(value) {
	    this.__isValidating = value;
	    if (value) this.__validatedAt = Date.now();
	  },
	  get: function get() {
	    return Boolean(this.__isValidating && Date.now() - this.__validatedAt < SyncEvent.VALIDATION_EXPIRATION);
	  }
	});

	SyncEvent.prototype.id = '';

	/**
	 * Indicates whether the request completed successfully.
	 *
	 * Set by layer.SyncManager.
	 * @type {Boolean}
	 */
	SyncEvent.prototype.success = null;

	/**
	 * Callback to fire on completing this sync event.
	 *
	 * WARNING: The nature of this callback may change;
	 * a persistence layer that persists the SyncManager's queue
	 * must have serializable callbacks (object id + method name; not a function)
	 * or must accept that callbacks are not always fired.
	 * @type {Function}
	 */
	SyncEvent.prototype.callback = null;

	/**
	 * Number of retries on this request.
	 *
	 * Retries are only counted if its a 502 or 503
	 * error.  Set and managed by layer.SyncManager.
	 * @type {Number}
	 */
	SyncEvent.prototype.retryCount = 0;

	/**
	 * The target of the request.
	 *
	 * Any Component; typically a Conversation or Message.
	 * @type {layer.Root}
	 */
	SyncEvent.prototype.target = null;

	/**
	 * Components that this request depends upon.
	 *
	 * A message cannot be sent if its
	 * Conversation fails to get created.
	 *
	 * NOTE: May prove redundant with the target property and needs further review.
	 * @type {layer.Root[]}
	 */
	SyncEvent.prototype.depends = null;

	/**
	 * Data field of the xhr call; can be an Object or string (including JSON string)
	 * @type {Object}
	 */
	SyncEvent.prototype.data = null;

	/**
	 * After firing a request, if that firing state fails to clear after this number of miliseconds,
	 * consider it to no longer be firing.  Under normal conditions, firing will be set to false explicitly.
	 * This check insures that any failure of that process does not leave us stuck with a firing request
	 * blocking the queue.
	 * @type {number}
	 * @static
	 */
	SyncEvent.FIRING_EXPIRATION = 1000 * 15;

	/**
	 * After checking the database to see if this event has been claimed by another browser tab,
	 * how long to wait before flagging it as failed, in the event of no-response.  Measured in ms.
	 * @type {number}
	 * @static
	 */
	SyncEvent.VALIDATION_EXPIRATION = 500;

	/**
	 * A layer.SyncEvent intended to be fired as an XHR request.
	 *
	 * @class layer.SyncEvent.XHRSyncEvent
	 * @extends layer.SyncEvent
	 */

	var XHRSyncEvent$1 = function (_SyncEvent) {
	  _inherits$16(XHRSyncEvent, _SyncEvent);

	  function XHRSyncEvent() {
	    _classCallCheck$21(this, XHRSyncEvent);

	    return _possibleConstructorReturn$16(this, (XHRSyncEvent.__proto__ || Object.getPrototypeOf(XHRSyncEvent)).apply(this, arguments));
	  }

	  _createClass$21(XHRSyncEvent, [{
	    key: '_getRequestData',


	    /**
	     * Fire the request associated with this instance.
	     *
	     * Actually it just returns the parameters needed to make the xhr call:
	     *
	     *      var xhr = require('./xhr');
	     *      xhr(event._getRequestData(client));
	     *
	     * @method _getRequestData
	     * @param {layer.Client} client
	     * @protected
	     * @returns {Object}
	     */
	    value: function _getRequestData(client) {
	      this._updateUrl(client);
	      this._updateData(client);
	      return {
	        url: this.url,
	        method: this.method,
	        headers: this.headers,
	        data: this.data,
	        telemetry: this.telemetry
	      };
	    }

	    /**
	     * Get the Real URL.
	     *
	     * If the url property is a function, call it to set the actual url.
	     * Used when the URL is unknown until a prior SyncEvent has completed.
	     *
	     * @method _updateUrl
	     * @private
	     */

	  }, {
	    key: '_updateUrl',
	    value: function _updateUrl(client) {
	      if (!this.target) return;
	      var target = client.getObject(this.target);
	      if (target && !this.url.match(/^http(s):\/\//)) {
	        this.url = target._getUrl(this.url);
	      }
	    }
	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      return {
	        data: this.data,
	        url: this.url,
	        method: this.method
	      };
	    }
	  }, {
	    key: '_getCreateId',
	    value: function _getCreateId() {
	      return this.operation === 'POST' && this.data ? this.data.id : '';
	    }
	  }]);

	  return XHRSyncEvent;
	}(SyncEvent);

	/**
	 * How long before the request times out?
	 * @type {Number} [timeout=15000]
	 */


	XHRSyncEvent$1.prototype.timeout = 15000;

	/**
	 * URL to send the request to
	 */
	XHRSyncEvent$1.prototype.url = '';

	/**
	 * Counts number of online state changes.
	 *
	 * If this number becomes high in a short time period, its probably
	 * failing due to a CORS error.
	 */
	XHRSyncEvent$1.prototype.returnToOnlineCount = 0;

	/**
	 * Headers for the request
	 */
	XHRSyncEvent$1.prototype.headers = null;

	/**
	 * Request method.
	 */
	XHRSyncEvent$1.prototype.method = 'GET';

	/**
	 * Telemetry data to go with the request.
	 */
	XHRSyncEvent$1.prototype.telemetry = null;

	/**
	 * A layer.SyncEvent intended to be fired as a websocket request.
	 *
	 * @class layer.SyncEvent.WebsocketSyncEvent
	 * @extends layer.SyncEvent
	 */

	var WebsocketSyncEvent$2 = function (_SyncEvent2) {
	  _inherits$16(WebsocketSyncEvent, _SyncEvent2);

	  function WebsocketSyncEvent() {
	    _classCallCheck$21(this, WebsocketSyncEvent);

	    return _possibleConstructorReturn$16(this, (WebsocketSyncEvent.__proto__ || Object.getPrototypeOf(WebsocketSyncEvent)).apply(this, arguments));
	  }

	  _createClass$21(WebsocketSyncEvent, [{
	    key: '_getRequestData',


	    /**
	     * Get the websocket request object.
	     *
	     * @method _getRequestData
	     * @private
	     * @param {layer.Client} client
	     * @return {Object}
	     */
	    value: function _getRequestData(client) {
	      this._updateData(client);
	      return this.data;
	    }
	  }, {
	    key: 'toObject',
	    value: function toObject() {
	      return this.data;
	    }
	  }, {
	    key: '_getCreateId',
	    value: function _getCreateId() {
	      return this.operation === 'POST' && this.data.data ? this.data.data.id : '';
	    }
	  }]);

	  return WebsocketSyncEvent;
	}(SyncEvent);

	/**
	 * Does this websocket request return a changes array to be processed by the request-manager?
	 */


	WebsocketSyncEvent$2.prototype.returnChangesArray = false;

	var syncEvent = { SyncEvent: SyncEvent, XHRSyncEvent: XHRSyncEvent$1, WebsocketSyncEvent: WebsocketSyncEvent$2 };

	var _createClass$20 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$11 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$20(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$15(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$15(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * @class  layer.SyncManager
	 * @extends layer.Root
	 * @protected
	 *
	 * This class manages
	 *
	 * 1. a queue of requests that need to be made
	 * 2. when a request should be fired, based on authentication state, online state, websocket connection state, and position in the queue
	 * 3. when a request should be aborted
	 * 4. triggering any request callbacks
	 *
	 * TODO: In the event of a DNS error, we may have a valid websocket receiving events and telling us we are online,
	 * and be unable to create a REST call.  This will be handled wrong because evidence will suggest that we are online.
	 * This issue goes away when we use bidirectional websockets for all requests.
	 *
	 * Applications do not typically interact with this class, but may subscribe to its events
	 * to get richer detailed information than is available from the layer.Client instance.
	 */
	var Root$15 = root;

	var _require$6 = syncEvent;
	var WebsocketSyncEvent$1 = _require$6.WebsocketSyncEvent;

	var xhr$6 = xhr$1;
	var logger$10 = logger_1;
	var Utils$5 = clientUtils;

	var MAX_RECEIPT_CONNECTIONS = 4;

	var SyncManager$1 = function (_Root) {
	  _inherits$15(SyncManager, _Root);

	  /**
	   * Creates a new SyncManager.
	   *
	   * An Application is expected to only have one SyncManager.
	   *
	   *      var socketManager = new layer.Websockets.SocketManager({client: client});
	   *      var requestManager = new layer.Websockets.RequestManager({client: client, socketManager: socketManager});
	   *
	   *      var onlineManager = new layer.OnlineManager({
	   *          socketManager: socketManager
	   *      });
	   *
	   *      // Now we can instantiate this thing...
	   *      var SyncManager = new layer.SyncManager({
	   *          client: client,
	   *          onlineManager: onlineManager,
	   *          socketManager: socketManager,
	   *          requestManager: requestManager
	   *      });
	   *
	   * @method constructor
	   * @param  {Object} options
	   * @param {layer.OnlineStateManager} options.onlineManager
	   * @param {layer.Websockets.RequestManager} options.requestManager
	   * @param {layer.Client} options.client
	   */
	  function SyncManager(options) {
	    _classCallCheck$20(this, SyncManager);

	    var _this = _possibleConstructorReturn$15(this, (SyncManager.__proto__ || Object.getPrototypeOf(SyncManager)).call(this, options));

	    _this.client = options.client;

	    // Note we do not store a pointer to client... it is not needed.
	    if (_this.client) {
	      _this.client.on('ready', function () {
	        _this._processNextRequest();
	        _this._loadPersistedQueue();
	      }, _this);
	    }
	    _this.queue = [];
	    _this.receiptQueue = [];

	    // Rather than listen for onlineManager 'connected', let the socketManager listen for that, connect, and the syncManager
	    // waits until its actually connected
	    _this.onlineManager.on('disconnected', _this._onlineStateChange, _this);
	    _this.socketManager.on('connected disconnected', _this._onlineStateChange, _this);
	    return _this;
	  }

	  /**
	   * Returns whether the Client is online/offline.
	   *
	   * For internal use; applications should use layer.Client.isOnline.
	   *
	   * @method isOnline
	   * @returns {Boolean}
	   */


	  _createClass$20(SyncManager, [{
	    key: 'isOnline',
	    value: function isOnline() {
	      return this.onlineManager.isOnline;
	    }

	    /**
	     * Process sync request when connection is restored.
	     *
	     * Any time we go back online (as signaled by the onlineStateManager),
	     * Process the next Sync Event (will do nothing if one is already firing)
	     *
	     * @method _onlineStateChange
	     * @private
	     * @param  {string} evtName - 'connected' or 'disconnected'
	     * @param  {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_onlineStateChange',
	    value: function _onlineStateChange(evt) {
	      var _this2 = this;

	      if (evt.eventName === 'connected') {
	        if (this.queue.length) this.queue[0].returnToOnlineCount++;
	        setTimeout(function () {
	          return _this2._processNextRequest();
	        }, 100);
	      } else if (evt.eventName === 'disconnected') {
	        if (this.queue.length) {
	          this.queue[0].isFiring = false;
	        }
	        if (this.receiptQueue.length) {
	          this.receiptQueue.forEach(function (syncEvt) {
	            return syncEvt.isFiring = false;
	          });
	        }
	      }
	    }

	    /**
	     * Adds a new xhr request to the queue.
	     *
	     * If the queue is empty, this will be fired immediately; else it will be added to the queue and wait its turn.
	     *
	     * If its a read/delivery receipt request, it will typically be fired immediately unless there are many receipt
	     * requests already in-flight.
	     *
	     * @method request
	     * @param  {layer.SyncEvent} requestEvt - A SyncEvent specifying the request to be made
	     */

	  }, {
	    key: 'request',
	    value: function request(requestEvt) {
	      // If its a PATCH request on an object that isn't yet created,
	      // do not add it to the queue.
	      if (requestEvt.operation !== 'PATCH' || !this._findUnfiredCreate(requestEvt)) {
	        logger$10.info('Sync Manager Request ' + requestEvt.operation + ' on target ' + requestEvt.target, requestEvt.toObject());
	        if (requestEvt.operation === 'RECEIPT') {
	          this.receiptQueue.push(requestEvt);
	        } else {
	          this.queue.push(requestEvt);
	        }
	        this.trigger('sync:add', {
	          request: requestEvt,
	          target: requestEvt.target
	        });
	      } else {
	        logger$10.info('Sync Manager Request PATCH ' + requestEvt.target + ' request ignored; create request still enqueued', requestEvt.toObject());
	      }

	      // If its a DELETE request, purge all other requests on that target.
	      if (requestEvt.operation === 'DELETE') {
	        this._purgeOnDelete(requestEvt);
	      }

	      this._processNextRequest(requestEvt);
	    }
	  }, {
	    key: '_processNextRequest',
	    value: function _processNextRequest(requestEvt) {
	      var _this3 = this;

	      // Fire the request if there aren't any existing requests already firing
	      if (this.queue.length && !this.queue[0].isFiring) {
	        if (requestEvt) {
	          this.client.dbManager.writeSyncEvents([requestEvt], function () {
	            return _this3._processNextStandardRequest();
	          });
	        } else {
	          this._processNextStandardRequest();
	        }
	      }

	      // If we have anything in the receipts queue, fire it
	      if (this.receiptQueue.length) {
	        this._processNextReceiptRequest();
	      }
	    }

	    /**
	     * Find create request for this resource.
	     *
	     * Determine if the given target has a POST request waiting to create
	     * the resource, and return any matching requests. Used
	     * for folding PATCH requests into an unfired CREATE/POST request.
	     *
	     * @method _findUnfiredCreate
	     * @private
	     * @param  {layer.SyncEvent} requestEvt
	     * @return {Boolean}
	     */

	  }, {
	    key: '_findUnfiredCreate',
	    value: function _findUnfiredCreate(requestEvt) {
	      return Boolean(this.queue.filter(function (evt) {
	        return evt.target === requestEvt.target && evt.operation === 'POST' && !evt.isFiring;
	      }).length);
	    }

	    /**
	     * Process the next request in the queue.
	     *
	     * Request is dequeued on completing the process.
	     * If the first request in the queue is firing, do nothing.
	     *
	     * @method _processNextRequest
	     * @private
	     */

	  }, {
	    key: '_processNextStandardRequest',
	    value: function _processNextStandardRequest() {
	      var _this4 = this;

	      if (this.isDestroyed || !this.client.isAuthenticated) return;
	      var requestEvt = this.queue[0];
	      if (this.isOnline() && requestEvt && !requestEvt.isFiring && !requestEvt._isValidating) {
	        requestEvt._isValidating = true;
	        this._validateRequest(requestEvt, function (isValid) {
	          requestEvt._isValidating = false;
	          if (!isValid) {
	            _this4._removeRequest(requestEvt, false);
	            return _this4._processNextStandardRequest();
	          } else {
	            _this4._fireRequest(requestEvt);
	          }
	        });
	      }
	    }

	    /**
	     * Process up to MAX_RECEIPT_CONNECTIONS worth of receipts.
	     *
	     * These requests have no interdependencies. Just fire them all
	     * as fast as we can, in parallel.
	     *
	     * @method _processNextReceiptRequest
	     * @private
	     */

	  }, {
	    key: '_processNextReceiptRequest',
	    value: function _processNextReceiptRequest() {
	      var _this5 = this;

	      var firingReceipts = 0;
	      this.receiptQueue.forEach(function (receiptEvt) {
	        if (_this5.isOnline() && receiptEvt) {
	          if (receiptEvt.isFiring || receiptEvt._isValidating) {
	            firingReceipts++;
	          } else if (firingReceipts < MAX_RECEIPT_CONNECTIONS) {
	            firingReceipts++;
	            _this5._fireRequest(receiptEvt);
	          }
	        }
	      });
	    }

	    /**
	     * Directly fire this sync request.
	     *
	     * This is intended to be called only after careful analysis of our state to make sure its safe to send the request.
	     * See `_processNextRequest()`
	     *
	     * @method _fireRequest
	     * @private
	     * @param {layer.SyncEvent} requestEvt
	     */

	  }, {
	    key: '_fireRequest',
	    value: function _fireRequest(requestEvt) {
	      if (requestEvt instanceof WebsocketSyncEvent$1) {
	        this._fireRequestWebsocket(requestEvt);
	      } else {
	        this._fireRequestXHR(requestEvt);
	      }
	    }

	    /**
	     * Directly fire this XHR Sync request.
	     *
	     * @method _fireRequestXHR
	     * @private
	     * @param {layer.SyncEvent.XHRSyncEvent} requestEvt
	     */

	  }, {
	    key: '_fireRequestXHR',
	    value: function _fireRequestXHR(requestEvt) {
	      var _this6 = this;

	      requestEvt.isFiring = true;
	      if (!requestEvt.headers) requestEvt.headers = {};
	      requestEvt.headers.authorization = 'Layer session-token="' + this.client.sessionToken + '"';
	      logger$10.info('Sync Manager XHR Request Firing ' + requestEvt.operation + ' ' + requestEvt.target + ' at ' + new Date().toISOString(), requestEvt.toObject());
	      xhr$6(requestEvt._getRequestData(this.client), function (result) {
	        return _this6._xhrResult(result, requestEvt);
	      });
	    }

	    /**
	     * Directly fire this Websocket Sync request.
	     *
	     * @method _fireRequestWebsocket
	     * @private
	     * @param {layer.SyncEvent.WebsocketSyncEvent} requestEvt
	     */

	  }, {
	    key: '_fireRequestWebsocket',
	    value: function _fireRequestWebsocket(requestEvt) {
	      var _this7 = this;

	      if (this.socketManager && this.socketManager._isOpen()) {
	        logger$10.debug('Sync Manager Websocket Request Firing ' + requestEvt.operation + ' on target ' + requestEvt.target, requestEvt.toObject());
	        requestEvt.isFiring = true;
	        this.requestManager.sendRequest({
	          data: requestEvt._getRequestData(this.client),
	          callback: function callback(result) {
	            return _this7._xhrResult(result, requestEvt);
	          },
	          isChangesArray: requestEvt.returnChangesArray
	        });
	      } else {
	        logger$10.debug('Sync Manager Websocket Request skipped; socket closed');
	      }
	    }

	    /**
	     * Is the syncEvent still valid?
	     *
	     * This method specifically tests to see if some other tab has already sent this request.
	     * If persistence of the syncQueue is not enabled, then the callback is immediately called with true.
	     * If another tab has already sent the request, then the entry will no longer be in indexedDB and the callback
	     * will call false.
	     *
	     * @method _validateRequest
	     * @param {layer.SyncEvent} syncEvent
	     * @param {Function} callback
	     * @param {Function} callback.isValid - The request is still valid
	     * @private
	     */

	  }, {
	    key: '_validateRequest',
	    value: function _validateRequest(syncEvent$$1, callback) {
	      this.client.dbManager.claimSyncEvent(syncEvent$$1, function (isFound) {
	        return callback(isFound);
	      });
	    }

	    /**
	     * Turn deduplication errors into success messages.
	     *
	     * If this request has already been made but we failed to get a response the first time and we retried the request,
	     * we will reissue the request.  If the prior request was successful we'll get back a deduplication error
	     * with the created object. As far as the WebSDK is concerned, this is a success.
	     *
	     * @method _handleDeduplicationErrors
	     * @private
	     */

	  }, {
	    key: '_handleDeduplicationErrors',
	    value: function _handleDeduplicationErrors(result) {
	      if (result.data && result.data.id === 'id_in_use' && result.data.data && result.data.data.id === result.request._getCreateId()) {
	        result.success = true;
	        result.data = result.data.data;
	      }
	    }

	    /**
	     * Process the result of an xhr call, routing it to the appropriate handler.
	     *
	     * @method _xhrResult
	     * @private
	     * @param  {Object} result  - Response object returned by xhr call
	     * @param  {layer.SyncEvent} requestEvt - Request object
	     */

	  }, {
	    key: '_xhrResult',
	    value: function _xhrResult(result, requestEvt) {
	      if (this.isDestroyed) return;
	      result.request = requestEvt;
	      requestEvt.isFiring = false;
	      this._handleDeduplicationErrors(result);
	      if (!result.success) {
	        this._xhrError(result);
	      } else {
	        this._xhrSuccess(result);
	      }
	    }

	    /**
	     * Categorize the error for handling.
	     *
	     * @method _getErrorState
	     * @private
	     * @param  {Object} result  - Response object returned by xhr call
	     * @param  {layer.SyncEvent} requestEvt - Request object
	     * @param  {boolean} isOnline - Is our app state set to online
	     * @returns {String}
	     */

	  }, {
	    key: '_getErrorState',
	    value: function _getErrorState(result, requestEvt, isOnline) {
	      var errId = result.data ? result.data.id : '';
	      if (!isOnline) {
	        // CORS errors look identical to offline; but if our online state has transitioned from false to true repeatedly while processing this request,
	        // thats a hint that that its a CORS error
	        if (requestEvt.returnToOnlineCount >= SyncManager.MAX_RETRIES_BEFORE_CORS_ERROR) {
	          return 'CORS';
	        } else {
	          return 'offline';
	        }
	      } else if (errId === 'not_found') {
	        return 'notFound';
	      } else if (errId === 'id_in_use') {
	        return 'invalidId'; // This only fires if we get `id_in_use` but no Resource, which means the UUID was used by another user/app.
	      } else if (result.status === 408 || errId === 'request_timeout') {
	        if (requestEvt.retryCount >= SyncManager.MAX_RETRIES) {
	          return 'tooManyFailuresWhileOnline';
	        } else {
	          return 'validateOnlineAndRetry';
	        }
	      } else if ([502, 503, 504].indexOf(result.status) !== -1) {
	        if (requestEvt.retryCount >= SyncManager.MAX_RETRIES) {
	          return 'tooManyFailuresWhileOnline';
	        } else {
	          return 'serverUnavailable';
	        }
	      } else if (errId === 'authentication_required' && result.data.data && result.data.data.nonce) {
	        return 'reauthorize';
	      } else {
	        return 'serverRejectedRequest';
	      }
	    }

	    /**
	     * Handle failed requests.
	     *
	     * 1. If there was an error from the server, then the request has problems
	     * 2. If we determine we are not in fact online, call the connectionError handler
	     * 3. If we think we are online, verify we are online and then determine how to handle it.
	     *
	     * @method _xhrError
	     * @private
	     * @param  {Object} result  - Response object returned by xhr call
	     * @param  {layer.SyncEvent} requestEvt - Request object
	     */

	  }, {
	    key: '_xhrError',
	    value: function _xhrError(result) {
	      var requestEvt = result.request;

	      logger$10.warn('Sync Manager ' + (requestEvt instanceof WebsocketSyncEvent$1 ? 'Websocket' : 'XHR') + ' ' + (requestEvt.operation + ' Request on target ' + requestEvt.target + ' has Failed'), requestEvt.toObject());

	      var errState = this._getErrorState(result, requestEvt, this.isOnline());
	      logger$10.warn('Sync Manager Error State: ' + errState);
	      switch (errState) {
	        case 'tooManyFailuresWhileOnline':
	          this._xhrHandleServerError(result, 'Sync Manager Server Unavailable Too Long; removing request', false);
	          break;
	        case 'notFound':
	          this._xhrHandleServerError(result, 'Resource not found; presumably deleted', false);
	          break;
	        case 'invalidId':
	          this._xhrHandleServerError(result, 'ID was not unique; request failed', false);
	          break;
	        case 'validateOnlineAndRetry':
	          // Server appears to be hung but will eventually recover.
	          // Retry a few times and then error out.
	          // this._xhrValidateIsOnline(requestEvt);
	          this._xhrHandleServerUnavailableError(result);
	          break;
	        case 'serverUnavailable':
	          // Server is in a bad state but will eventually recover;
	          // keep retrying.
	          this._xhrHandleServerUnavailableError(result);
	          break;
	        case 'reauthorize':
	          // sessionToken appears to no longer be valid; forward response
	          // on to client-authenticator to process.
	          // Do not retry nor advance to next request.
	          if (requestEvt.callback) requestEvt.callback(result);

	          break;
	        case 'serverRejectedRequest':
	          // Server presumably did not like the arguments to this call
	          // or the url was invalid.  Do not retry; trigger the callback
	          // and let the caller handle it.
	          this._xhrHandleServerError(result, 'Sync Manager Server Rejects Request; removing request', true);
	          break;
	        case 'CORS':
	          // A pattern of offline-like failures that suggests its actually a CORs error
	          this._xhrHandleServerError(result, 'Sync Manager Server detects CORS-like errors; removing request', false);
	          break;
	        case 'offline':
	          this._xhrHandleConnectionError();
	          break;
	      }

	      // Write the sync event back to the database if we haven't completed processing it
	      if (this.queue.indexOf(requestEvt) !== -1 || this.receiptQueue.indexOf(requestEvt) !== -1) {
	        this.client.dbManager.writeSyncEvents([requestEvt]);
	      }
	    }

	    /**
	     * Handle a server unavailable error.
	     *
	     * In the event of a 502 (Bad Gateway), 503 (service unavailable)
	     * or 504 (gateway timeout) error from the server
	     * assume we have an error that is self correcting on the server.
	     * Use exponential backoff to retry the request.
	     *
	     * Note that each call will increment retryCount; there is a maximum
	     * of MAX_RETRIES before it is treated as an error
	     *
	     * @method  _xhrHandleServerUnavailableError
	     * @private
	     * @param  {Object} result             Response object returned by xhr call
	     */

	  }, {
	    key: '_xhrHandleServerUnavailableError',
	    value: function _xhrHandleServerUnavailableError(result) {
	      var request = result.request;
	      this.trigger('sync:error-will-retry', {
	        target: request.target,
	        request: request,
	        error: result.data,
	        retryCount: request.retryCount
	      });
	      var maxDelay = SyncManager.MAX_UNAVAILABLE_RETRY_WAIT;
	      var delay = Utils$5.getExponentialBackoffSeconds(maxDelay, Math.min(15, request.retryCount++));
	      logger$10.warn('Sync Manager Server Unavailable; retry count ' + request.retryCount + '; retrying in ' + delay + ' seconds');
	      setTimeout(this._processNextRequest.bind(this), delay * 1000);
	    }

	    /**
	     * Handle a server error in response to firing sync event.
	     *
	     * If there is a server error, its presumably non-recoverable/non-retryable error, so
	     * we're going to abort this request.
	     *
	     * 1. If a callback was provided, call it to handle the error
	     * 2. If a rollback call is provided, call it to undo any patch/delete/etc... changes
	     * 3. If the request was to create a resource, remove from the queue all requests
	     *    that depended upon that resource.
	     * 4. Advance to next request
	     *
	     * @method _xhrHandleServerError
	     * @private
	     * @param  {Object} result  - Response object returned by xhr call
	     * @param  {string} logMsg - Message to display in console
	     * @param  {boolean} stringify - log object for quick debugging
	     *
	     */

	  }, {
	    key: '_xhrHandleServerError',
	    value: function _xhrHandleServerError(result, logMsg, stringify) {
	      // Execute all callbacks provided by the request
	      if (result.request.callback) result.request.callback(result);
	      if (stringify) {
	        logger$10.error(logMsg + '\nREQUEST: ' + JSON.stringify(result.request.toObject(), null, 4) + '\nRESPONSE: ' + JSON.stringify(result.data, null, 4));
	      } else {
	        logger$10.error(logMsg, result);
	      }
	      this.trigger('sync:error', {
	        target: result.request.target,
	        request: result.request,
	        error: result.data
	      });

	      result.request.success = false;

	      // If a POST request fails, all requests that depend upon this object
	      // must be purged
	      if (result.request.operation === 'POST') {
	        this._purgeDependentRequests(result.request);
	      }

	      // Remove this request as well (side-effect: rolls back the operation)
	      this._removeRequest(result.request, true);

	      // And finally, we are ready to try the next request
	      this._processNextRequest();
	    }

	    /**
	     * If there is a connection error, wait for retry.
	     *
	     * In the event of what appears to be a connection error,
	     * Wait until a 'connected' event before processing the next request (actually reprocessing the current event)
	     *
	     * @method _xhrHandleConnectionError
	     * @private
	     */

	  }, {
	    key: '_xhrHandleConnectionError',
	    value: function _xhrHandleConnectionError() {}
	    // Nothing to be done; we already have the below event handler setup
	    // this.onlineManager.once('connected', () => this._processNextRequest());


	    /**
	     * Verify that we are online and retry request.
	     *
	     * This method is called when we think we're online, but
	     * have determined we need to validate that assumption.
	     *
	     * Test that we have a connection; if we do,
	     * retry the request once, and if it fails again,
	     * _xhrError() will determine it to have failed and remove it from the queue.
	     *
	     * If we are offline, then let _xhrHandleConnectionError handle it.
	     *
	     * @method _xhrValidateIsOnline
	     * @private
	     */

	  }, {
	    key: '_xhrValidateIsOnline',
	    value: function _xhrValidateIsOnline(requestEvt) {
	      var _this8 = this;

	      logger$10.debug('Sync Manager verifying online state');
	      this.onlineManager.checkOnlineStatus(function (isOnline) {
	        return _this8._xhrValidateIsOnlineCallback(isOnline, requestEvt);
	      });
	    }

	    /**
	     * If we have verified we are online, retry request.
	     *
	     * We should have received a response to our /nonces call
	     * which assuming the server is actually alive,
	     * will tell us if the connection is working.
	     *
	     * If we are offline, flag us as offline and let the ConnectionError handler handle this
	     * If we are online, give the request a single retry (there is never more than one retry)
	     *
	     * @method _xhrValidateIsOnlineCallback
	     * @private
	     * @param  {boolean} isOnline  - Response object returned by xhr call
	     * @param {layer.SyncEvent} requestEvt - The request that failed triggering this call
	     */

	  }, {
	    key: '_xhrValidateIsOnlineCallback',
	    value: function _xhrValidateIsOnlineCallback(isOnline, requestEvt) {
	      logger$10.debug('Sync Manager online check result is ' + isOnline);
	      if (!isOnline) {
	        // Treat this as a Connection Error
	        this._xhrHandleConnectionError();
	      } else {
	        // Retry the request in case we were offline, but are now online.
	        // Of course, if this fails, give it up entirely.
	        requestEvt.retryCount++;
	        this._processNextRequest();
	      }
	    }

	    /**
	     * The XHR request was successful.
	     *
	     * Any xhr request that actually succedes:
	     *
	     * 1. Remove it from the queue
	     * 2. Call any callbacks
	     * 3. Advance to next request
	     *
	     * @method _xhrSuccess
	     * @private
	     * @param  {Object} result  - Response object returned by xhr call
	     * @param  {layer.SyncEvent} requestEvt - Request object
	     */

	  }, {
	    key: '_xhrSuccess',
	    value: function _xhrSuccess(result) {
	      var requestEvt = result.request;
	      logger$10.debug('Sync Manager ' + (requestEvt instanceof WebsocketSyncEvent$1 ? 'Websocket' : 'XHR') + ' ' + (requestEvt.operation + ' Request on target ' + requestEvt.target + ' has Succeeded'), requestEvt.toObject());
	      if (result.data) logger$10.debug(result.data);
	      requestEvt.success = true;
	      this._removeRequest(requestEvt, true);
	      if (requestEvt.callback) requestEvt.callback(result);
	      this._processNextRequest();

	      this.trigger('sync:success', {
	        target: requestEvt.target,
	        request: requestEvt,
	        response: result.data
	      });
	    }

	    /**
	     * Remove the SyncEvent request from the queue.
	     *
	     * @method _removeRequest
	     * @private
	     * @param  {layer.SyncEvent} requestEvt - SyncEvent Request to remove
	     * @param {Boolean} deleteDB - Delete from indexedDB
	     */

	  }, {
	    key: '_removeRequest',
	    value: function _removeRequest(requestEvt, deleteDB) {
	      var queue = requestEvt.operation === 'RECEIPT' ? this.receiptQueue : this.queue;
	      var index = queue.indexOf(requestEvt);
	      if (index !== -1) queue.splice(index, 1);
	      if (deleteDB) this.client.dbManager.deleteObjects('syncQueue', [requestEvt]);
	    }

	    /**
	     * Remove requests from queue that depend on specified resource.
	     *
	     * If there is a POST request to create a new resource, and there are PATCH, DELETE, etc...
	     * requests on that resource, if the POST request fails, then all PATCH, DELETE, etc
	     * requests must be removed from the queue.
	     *
	     * Note that we do not call the rollback on these dependent requests because the expected
	     * rollback is to destroy the thing that was created, which means any other rollback has no effect.
	     *
	     * @method _purgeDependentRequests
	     * @private
	     * @param  {layer.SyncEvent} request - Request whose target is no longer valid
	     */

	  }, {
	    key: '_purgeDependentRequests',
	    value: function _purgeDependentRequests(request) {
	      this.queue = this.queue.filter(function (evt) {
	        return evt.depends.indexOf(request.target) === -1 || evt === request;
	      });
	      this.receiptQueue = this.receiptQueue.filter(function (evt) {
	        return evt.depends.indexOf(request.target) === -1 || evt === request;
	      });
	    }

	    /**
	     * Remove from queue all events that operate upon the deleted object.
	     *
	     * @method _purgeOnDelete
	     * @private
	     * @param  {layer.SyncEvent} evt - Delete event that requires removal of other events
	     */

	  }, {
	    key: '_purgeOnDelete',
	    value: function _purgeOnDelete(evt) {
	      var _this9 = this;

	      this.queue.filter(function (request) {
	        return request.depends.indexOf(evt.target) !== -1 && evt !== request;
	      }).forEach(function (requestEvt) {
	        _this9.trigger('sync:abort', {
	          target: requestEvt.target,
	          request: requestEvt
	        });
	        _this9._removeRequest(requestEvt, true);
	      });
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this.queue.forEach(function (evt) {
	        return evt.destroy();
	      });
	      this.queue = null;
	      this.receiptQueue.forEach(function (evt) {
	        return evt.destroy();
	      });
	      this.receiptQueue = null;
	      _get$11(SyncManager.prototype.__proto__ || Object.getPrototypeOf(SyncManager.prototype), 'destroy', this).call(this);
	    }

	    /**
	     * Load any unsent requests from indexedDB.
	     *
	     * If persistence is disabled, nothing will happen;
	     * else all requests found in the database will be added to the queue.
	     * @method _loadPersistedQueue
	     * @private
	     */

	  }, {
	    key: '_loadPersistedQueue',
	    value: function _loadPersistedQueue() {
	      var _this10 = this;

	      this.client.dbManager.loadSyncQueue(function (data) {
	        if (data.length) {
	          _this10.queue = _this10.queue.concat(data);
	          _this10._processNextRequest();
	        }
	      });
	    }
	  }]);

	  return SyncManager;
	}(Root$15);

	/**
	 * Websocket Manager for getting socket state.
	 * @type {layer.Websockets.SocketManager}
	 */


	SyncManager$1.prototype.socketManager = null;

	/**
	 * Websocket Request Manager for sending requests.
	 * @type {layer.Websockets.RequestManager}
	 */
	SyncManager$1.prototype.requestManager = null;

	/**
	 * Reference to the Online State Manager.
	 *
	 * Sync Manager uses online status to determine if it can fire sync-requests.
	 * @private
	 * @type {layer.OnlineStateManager}
	 */
	SyncManager$1.prototype.onlineManager = null;

	/**
	 * The array of layer.SyncEvent instances awaiting to be fired.
	 * @type {layer.SyncEvent[]}
	 */
	SyncManager$1.prototype.queue = null;

	/**
	 * The array of layer.SyncEvent instances awaiting to be fired.
	 *
	 * Receipts can generally just be fired off all at once without much fretting about ordering or dependencies.
	 * @type {layer.SyncEvent[]}
	 */
	SyncManager$1.prototype.receiptQueue = null;

	/**
	 * Reference to the Client so that we can pass it to SyncEvents  which may need to lookup their targets
	 */
	SyncManager$1.prototype.client = null;

	/**
	 * Maximum exponential backoff wait.
	 *
	 * If the server is returning 502, 503 or 504 errors, exponential backoff
	 * should never wait longer than this number of seconds (60 seconds)
	 * @type {Number}
	 * @static
	 */
	SyncManager$1.MAX_UNAVAILABLE_RETRY_WAIT = 60;

	/**
	 * Retries before suspect CORS error.
	 *
	 * How many times can we transition from offline to online state
	 * with this request at the front of the queue before we conclude
	 * that the reason we keep thinking we're going offline is
	 * a CORS error returning a status of 0.  If that pattern
	 * shows 3 times in a row, there is likely a CORS error.
	 * Note that CORS errors appear to javascript as a status=0 error,
	 * which is the same as if the client were offline.
	 * @type {number}
	 * @static
	 */
	SyncManager$1.MAX_RETRIES_BEFORE_CORS_ERROR = 3;

	/**
	 * Abort request after this number of retries.
	 *
	 * @type {number}
	 * @static
	 */
	SyncManager$1.MAX_RETRIES = 20;

	SyncManager$1._supportedEvents = [
	/**
	 * A sync request has failed.
	 *
	 * ```
	 * client.syncManager.on('sync:error', function(evt) {
	 *    console.error(evt.target + ' failed to send changes to server: ', evt.error.message);
	 *    console.log('Request Event:', evt.request);
	 * });
	 * ```
	 *
	 * @event
	 * @param {layer.LayerEvent} evt          Standard Layer Event object generated by all calls to `trigger`
	 * @param {layer.LayerError} evt.error    An error object representing the server's response
	 * @param {String} evt.target             ID of the message/conversation/etc. being operated upon
	 * @param {layer.SyncEvent} evt.request  The original request object
	 */
	'sync:error',

	/**
	 * A sync request has but will be retried soon.
	 *
	 * ```
	 * client.syncManager.on('sync:error-will-retry', function(evt) {
	 *    console.error(evt.target + ' failed to send changes to server: ', evt.error.message);
	 *    console.log('Request Event:', evt.request);
	 *    console.log('Number of retries:', evt.retryCount);
	 * });
	 * ```
	 *
	 * @event
	 * @param {layer.LayerEvent} evt          Standard Layer Event object generated by all calls to `trigger`
	 * @param {layer.LayerError} evt.error    An error object representing the server's response
	 * @param {String} evt.target             ID of the message/conversation/etc. being operated upon
	 * @param {layer.SyncEvent} evt.request   The original request object
	 * @param {Number} evt.retryCount         Number of retries performed on this request; for the first event this will be 0
	 */
	'sync:error-will-retry',

	/**
	 * A sync layer request has completed successfully.
	 *
	 * ```
	 * client.syncManager.on('sync:success', function(evt) {
	 *    console.log(evt.target + ' changes sent to server successfully');
	 *    console.log('Request Event:', evt.request);
	 *    console.log('Server Response:', evt.response);
	 * });
	 * ```
	 *
	 * @event
	 * @param {layer.LayerEvent} evt          Standard Layer Event object generated by all calls to `trigger`
	 * @param {String} evt.target             ID of the message/conversation/etc. being operated upon
	 * @param {layer.SyncEvent} evt.request   The original request
	 * @param {Object} evt.response           null or any data returned by the call
	 */
	'sync:success',

	/**
	 * A new sync request has been added.
	 *
	 * ```
	 * client.syncManager.on('sync:add', function(evt) {
	 *    console.log(evt.target + ' has changes queued for the server');
	 *    console.log('Request Event:', evt.request);
	 * });
	 * ```
	 *
	 * @event
	 * @param {layer.LayerEvent} evt          Standard Layer Event object generated by all calls to `trigger`
	 * @param {String} evt.target             ID of the message/conversation/etc. being operated upon
	 * @param {layer.SyncEvent} evt.request   The original request
	 */
	'sync:add',

	/**
	 * A sync request has been canceled.
	 *
	 * Typically caused by a new SyncEvent that deletes the target of this SyncEvent
	 *
	 * @event
	 * @param {layer.LayerEvent} evt          Standard Layer Event object generated by all calls to `trigger`
	 * @param {String} evt.target             ID of the message/conversation/etc. being operated upon
	 * @param {layer.SyncEvent} evt.request   The original request
	 */
	'sync:abort'].concat(Root$15._supportedEvents);

	Root$15.initClass(SyncManager$1);
	var syncManager = SyncManager$1;

	var _createClass$23 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$23(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$18(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$18(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Announcement class represents a type of Message sent by a server.
	 *
	 * Announcements can not be sent using the WebSDK, only received.
	 *
	 * You should never need to instantiate an Announcement; they should only be
	 * delivered via `messages:add` events when an Announcement is provided via
	 * websocket to the client, and `change` events on an Announcements Query.
	 *
	 * @class  layer.Announcement
	 * @extends layer.Message.ConversationMessage
	 */

	var ConversationMessage$3 = conversationMessage;
	var Syncable$6 = syncable;
	var Root$17 = root;
	var LayerError$14 = layerError;

	var Announcement$2 = function (_ConversationMessage) {
	  _inherits$18(Announcement, _ConversationMessage);

	  function Announcement() {
	    _classCallCheck$23(this, Announcement);

	    return _possibleConstructorReturn$18(this, (Announcement.__proto__ || Object.getPrototypeOf(Announcement)).apply(this, arguments));
	  }

	  _createClass$23(Announcement, [{
	    key: 'send',


	    /**
	     * @method send
	     * @hide
	     */
	    value: function send() {}

	    /**
	     * @method _send
	     * @hide
	     */

	  }, {
	    key: '_send',
	    value: function _send() {}

	    /**
	     * @method getConversation
	     * @hide
	     */

	  }, {
	    key: 'getConversation',
	    value: function getConversation() {}
	  }, {
	    key: '_loaded',
	    value: function _loaded(data) {
	      this.getClient()._addMessage(this);
	    }

	    /**
	     * Delete the Announcement from the server.
	     *
	     * @method delete
	     */

	  }, {
	    key: 'delete',
	    value: function _delete() {
	      if (this.isDestroyed) throw new Error(LayerError$14.dictionary.isDestroyed);

	      var id = this.id;
	      var client = this.getClient();
	      this._xhr({
	        url: '',
	        method: 'DELETE'
	      }, function (result) {
	        if (!result.success && (!result.data || result.data.id !== 'not_found' && result.data.id !== 'authentication_required')) {
	          Syncable$6.load(id, client);
	        }
	      });

	      this._deleted();
	      this.destroy();
	    }

	    /**
	     * Creates an Announcement from the server's representation of an Announcement.
	     *
	     * Similar to _populateFromServer, however, this method takes a
	     * message description and returns a new message instance using _populateFromServer
	     * to setup the values.
	     *
	     * @method _createFromServer
	     * @protected
	     * @static
	     * @param  {Object} message - Server's representation of the announcement
	     * @return {layer.Announcement}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(message, client) {
	      var fromWebsocket = message.fromWebsocket;
	      return new Announcement({
	        fromServer: message,
	        clientId: client.appId,
	        _notify: fromWebsocket && message.is_unread
	      });
	    }
	  }]);

	  return Announcement;
	}(ConversationMessage$3);

	/**
	 * @property {String} conversationId
	 * @hide
	 */

	/**
	 * @property {Object} deliveryStatus
	 * @hide
	 */

	/**
	 * @property {Object} readStatus
	 * @hide
	 */

	/**
	 * @property {Object} recipientStatus
	 * @hide
	 */

	/**
	 * @method addPart
	 * @hide
	 */

	/**
	 * @method send
	 * @hide
	 */

	/**
	 * @method isSaved
	 * @hide
	 */

	/**
	 * @method isSaving
	 * @hide
	 */

	Announcement$2.prefixUUID = 'layer:///announcements/';

	Announcement$2.bubbleEventParent = 'getClient';

	Announcement$2._supportedEvents = [].concat(ConversationMessage$3._supportedEvents);

	Announcement$2.inObjectIgnore = ConversationMessage$3.inObjectIgnore;
	Root$17.initClass.apply(Announcement$2, [Announcement$2, 'Announcement']);
	Syncable$6.subclasses.push(Announcement$2);
	var announcement = Announcement$2;

	var _createClass$22 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$22(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$17(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$17(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Persistence manager.
	 *
	 * This class manages all indexedDB access.  It is not responsible for any localStorage access, though it may
	 * receive configurations related to data stored in localStorage.  It will simply ignore those configurations.
	 *
	 * Rich Content will be written to IndexedDB as long as its small; see layer.DbManager.MaxPartSize for more info.
	 *
	 * TODO:
	 * 0. Redesign this so that knowledge of the data is not hard-coded in
	 * @class layer.DbManager
	 * @protected
	 */

	var Root$16 = root;
	var logger$11 = logger_1;
	var SyncEvent$1 = syncEvent;
	var Constants$7 = _const;
	var Util$8 = clientUtils;
	var Announcement$1 = announcement;

	var DB_VERSION = 5;
	var MAX_SAFE_INTEGER = 9007199254740991;
	var SYNC_NEW = Constants$7.SYNC_STATE.NEW;

	function getDate(inDate) {
	  return inDate ? inDate.toISOString() : null;
	}

	var TABLES = [{
	  name: 'conversations',
	  indexes: {
	    created_at: ['created_at'],
	    last_message_sent: ['last_message_sent']
	  }
	}, {
	  name: 'channels',
	  indexes: {
	    created_at: ['created_at']
	  }
	}, {
	  name: 'messages',
	  indexes: {
	    conversationId: ['conversationId', 'position']
	  }
	}, {
	  name: 'identities',
	  indexes: {}
	}, {
	  name: 'syncQueue',
	  indexes: {}
	}];

	var DbManager$1 = function (_Root) {
	  _inherits$17(DbManager, _Root);

	  /**
	   * Create the DB Manager
	   *
	   * Key configuration is the layer.DbManager.persistenceFeatures property.
	   *
	   * @method constructor
	   * @param {Object} options
	   * @param {layer.Client} options.client
	   * @param {Object} options.persistenceFeatures
	   * @return {layer.DbManager} this
	   */
	  function DbManager(options) {
	    _classCallCheck$22(this, DbManager);

	    // If no indexedDB, treat everything as disabled.
	    var _this = _possibleConstructorReturn$17(this, (DbManager.__proto__ || Object.getPrototypeOf(DbManager)).call(this, options));

	    if (!window.indexedDB || !options.enabled) {
	      options.tables = {};
	    } else {
	      // Test if Arrays as keys supported, disable persistence if not
	      var enabled = true;

	      /* istanbul ignore next */
	      try {
	        window.IDBKeyRange.bound(['announcement', 0], ['announcement', MAX_SAFE_INTEGER]);
	      } catch (e) {
	        options.tables = {};
	        enabled = false;
	      }

	      // If Client is a layer.ClientAuthenticator, it won't support these events; this affects Unit Tests
	      if (enabled && _this.client.constructor._supportedEvents.indexOf('conversations:add') !== -1) {
	        _this.client.on('conversations:add', function (evt) {
	          return _this.writeConversations(evt.conversations);
	        }, _this);
	        _this.client.on('conversations:change', function (evt) {
	          return _this._updateConversation(evt.target, evt.changes);
	        }, _this);
	        _this.client.on('conversations:delete conversations:sent-error', function (evt) {
	          return _this.deleteObjects('conversations', [evt.target]);
	        }, _this);

	        _this.client.on('channels:add', function (evt) {
	          return _this.writeChannels(evt.channels);
	        }, _this);
	        _this.client.on('channels:change', function (evt) {
	          return _this._updateChannel(evt.target, evt.changes);
	        }, _this);
	        _this.client.on('channels:delete channels:sent-error', function (evt) {
	          return _this.deleteObjects('channels', [evt.target]);
	        }, _this);

	        _this.client.on('messages:add', function (evt) {
	          return _this.writeMessages(evt.messages);
	        }, _this);
	        _this.client.on('messages:change', function (evt) {
	          return _this.writeMessages([evt.target]);
	        }, _this);
	        _this.client.on('messages:delete messages:sent-error', function (evt) {
	          return _this.deleteObjects('messages', [evt.target]);
	        }, _this);

	        _this.client.on('identities:add', function (evt) {
	          return _this.writeIdentities(evt.identities);
	        }, _this);
	        _this.client.on('identities:change', function (evt) {
	          return _this.writeIdentities([evt.target]);
	        }, _this);
	        _this.client.on('identities:unfollow', function (evt) {
	          return _this.deleteObjects('identities', [evt.target]);
	        }, _this);
	      }

	      // Sync Queue only really works properly if we have the Messages and Conversations written to the DB; turn it off
	      // if that won't be the case.
	      if (!options.tables.conversations && !options.tables.channels || !options.tables.messages) {
	        options.tables.syncQueue = false;
	      }
	    }

	    TABLES.forEach(function (tableDef) {
	      _this['_permission_' + tableDef.name] = Boolean(options.tables[tableDef.name]);
	    });
	    _this._open(false);
	    return _this;
	  }

	  _createClass$22(DbManager, [{
	    key: '_getDbName',
	    value: function _getDbName() {
	      return 'LayerWebSDK_' + this.client.appId;
	    }

	    /**
	     * Open the Database Connection.
	     *
	     * This is only called by the constructor.
	     * @method _open
	     * @param {Boolean} retry
	     * @private
	     */

	  }, {
	    key: '_open',
	    value: function _open(retry) {
	      var _this2 = this;

	      if (this.db) {
	        this.db.close();
	        delete this.db;
	      }

	      // Abort if all tables are disabled
	      var enabledTables = TABLES.filter(function (tableDef) {
	        return _this2['_permission_' + tableDef.name];
	      });
	      if (enabledTables.length === 0) {
	        this._isOpenError = true;
	        this.trigger('error', { error: 'Persistence is disabled by application' });
	        return;
	      }

	      // Open the database
	      var request = window.indexedDB.open(this._getDbName(), DB_VERSION);

	      try {
	        /* istanbul ignore next */
	        request.onerror = function (evt) {
	          if (!retry) {
	            _this2.deleteTables(function () {
	              return _this2._open(true);
	            });
	          }

	          // Triggered by Firefox private browsing window
	          else {
	              _this2._isOpenError = true;
	              logger$11.warn('Database Unable to Open (common cause: private browsing window)', evt.target.error);
	              _this2.trigger('error', { error: evt });
	            }
	        };

	        request.onupgradeneeded = function (evt) {
	          return _this2._onUpgradeNeeded(evt);
	        };
	        request.onsuccess = function (evt) {
	          _this2.db = evt.target.result;
	          _this2.isOpen = true;
	          _this2.trigger('open');

	          _this2.db.onversionchange = function () {
	            _this2.db.close();
	            _this2.isOpen = false;
	          };

	          _this2.db.onerror = function (err) {
	            return logger$11.error('db-manager Error: ', err);
	          };
	        };
	      }

	      /* istanbul ignore next */
	      catch (err) {
	        // Safari Private Browsing window will fail on request.onerror
	        this._isOpenError = true;
	        logger$11.error('Database Unable to Open: ', err);
	        this.trigger('error', { error: err });
	      }
	    }

	    /**
	     * Use this to setup a call to happen as soon as the database is open.
	     *
	     * Typically, this call will immediately, synchronously call your callback.
	     * But if the DB is not open yet, your callback will be called once its open.
	     * @method onOpen
	     * @param {Function} callback
	     */

	  }, {
	    key: 'onOpen',
	    value: function onOpen(callback) {
	      if (this.isOpen || this._isOpenError) callback();else this.once('open error', callback);
	    }

	    /**
	     * The onUpgradeNeeded function is called by IndexedDB any time DB_VERSION is incremented.
	     *
	     * This invocation is part of the built-in lifecycle of IndexedDB.
	     *
	     * @method _onUpgradeNeeded
	     * @param {IDBVersionChangeEvent} event
	     * @private
	     */
	    /* istanbul ignore next */

	  }, {
	    key: '_onUpgradeNeeded',
	    value: function _onUpgradeNeeded(event) {
	      var _this3 = this;

	      var db = event.target.result;
	      var isComplete = false;

	      // This appears to only get called once; its presumed this is because we're creating but not using a lot of transactions.
	      var onComplete = function onComplete(evt) {
	        if (!isComplete) {
	          _this3.db = db;
	          _this3.isComplete = true;
	          _this3.isOpen = true;
	          _this3.trigger('open');
	        }
	      };

	      var currentTables = Array.prototype.slice.call(db.objectStoreNames);
	      TABLES.forEach(function (tableDef) {
	        try {
	          if (currentTables.indexOf(tableDef.name) !== -1) db.deleteObjectStore(tableDef.name);
	        } catch (e) {
	          // Noop
	        }
	        try {
	          var store = db.createObjectStore(tableDef.name, { keyPath: 'id' });
	          Object.keys(tableDef.indexes).forEach(function (indexName) {
	            return store.createIndex(indexName, tableDef.indexes[indexName], { unique: false });
	          });
	          store.transaction.oncomplete = onComplete;
	        } catch (e) {
	          // Noop
	          /* istanbul ignore next */
	          logger$11.error('Failed to create object store ' + tableDef.name, e);
	        }
	      });
	    }

	    /**
	     * Convert array of Conversation instances into Conversation DB Entries.
	     *
	     * A Conversation DB entry looks a lot like the server representation, but
	     * includes a sync_state property, and `last_message` contains a message ID not
	     * a Message object.
	     *
	     * @method _getConversationData
	     * @private
	     * @param {layer.Conversation[]} conversations
	     * @return {Object[]} conversations
	     */

	  }, {
	    key: '_getConversationData',
	    value: function _getConversationData(conversations) {
	      var _this4 = this;

	      return conversations.filter(function (conversation) {
	        if (conversation._fromDB) {
	          conversation._fromDB = false;
	          return false;
	        } else if (conversation.isLoading || conversation.syncState === SYNC_NEW) {
	          return false;
	        } else {
	          return true;
	        }
	      }).map(function (conversation) {
	        var item = {
	          id: conversation.id,
	          url: conversation.url,
	          participants: _this4._getIdentityData(conversation.participants, true),
	          distinct: conversation.distinct,
	          created_at: getDate(conversation.createdAt),
	          metadata: conversation.metadata,
	          unread_message_count: conversation.unreadCount,
	          last_message: conversation.lastMessage ? conversation.lastMessage.id : '',
	          last_message_sent: conversation.lastMessage ? getDate(conversation.lastMessage.sentAt) : getDate(conversation.createdAt),
	          sync_state: conversation.syncState
	        };
	        return item;
	      });
	    }
	  }, {
	    key: '_updateConversation',
	    value: function _updateConversation(conversation, changes) {
	      var _this5 = this;

	      var idChanges = changes.filter(function (item) {
	        return item.property === 'id';
	      });
	      if (idChanges.length) {
	        this.deleteObjects('conversations', [{ id: idChanges[0].oldValue }], function () {
	          _this5.writeConversations([conversation]);
	        });
	      } else {
	        this.writeConversations([conversation]);
	      }
	    }

	    /**
	     * Writes an array of Conversations to the Database.
	     *
	     * @method writeConversations
	     * @param {layer.Conversation[]} conversations - Array of Conversations to write
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'writeConversations',
	    value: function writeConversations(conversations, callback) {
	      this._writeObjects('conversations', this._getConversationData(conversations.filter(function (conversation) {
	        return !conversation.isDestroyed;
	      })), callback);
	    }

	    /**
	     * Convert array of Channel instances into Channel DB Entries.
	     *
	     * A Channel DB entry looks a lot like the server representation, but
	     * includes a sync_state property, and `last_message` contains a message ID not
	     * a Message object.
	     *
	     * @method _getChannelData
	     * @private
	     * @param {layer.Channel[]} channels
	     * @return {Object[]} channels
	     */

	  }, {
	    key: '_getChannelData',
	    value: function _getChannelData(channels) {
	      return channels.filter(function (channel) {
	        if (channel._fromDB) {
	          channel._fromDB = false;
	          return false;
	        } else if (channel.isLoading || channel.syncState === SYNC_NEW) {
	          return false;
	        } else {
	          return true;
	        }
	      }).map(function (channel) {
	        var item = {
	          id: channel.id,
	          url: channel.url,
	          created_at: getDate(channel.createdAt),
	          sync_state: channel.syncState,
	          // TODO: membership object should be written... but spec incomplete
	          membership: null,
	          name: channel.name,
	          metadata: channel.metadata
	        };
	        return item;
	      });
	    }
	  }, {
	    key: '_updateChannel',
	    value: function _updateChannel(channel, changes) {
	      var _this6 = this;

	      var idChanges = changes.filter(function (item) {
	        return item.property === 'id';
	      });
	      if (idChanges.length) {
	        this.deleteObjects('channels', [{ id: idChanges[0].oldValue }], function () {
	          _this6.writeChannels([channel]);
	        });
	      } else {
	        this.writeChannels([channel]);
	      }
	    }

	    /**
	     * Writes an array of Conversations to the Database.
	     *
	     * @method writeChannels
	     * @param {layer.Channel[]} channels - Array of Channels to write
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'writeChannels',
	    value: function writeChannels(channels, callback) {
	      this._writeObjects('channels', this._getChannelData(channels.filter(function (channel) {
	        return !channel.isDestroyed;
	      })), callback);
	    }

	    /**
	     * Convert array of Identity instances into Identity DB Entries.
	     *
	     * @method _getIdentityData
	     * @private
	     * @param {layer.Identity[]} identities
	     * @param {boolean} writeBasicIdentity - Forces output as a Basic Identity
	     * @return {Object[]} identities
	     */

	  }, {
	    key: '_getIdentityData',
	    value: function _getIdentityData(identities, writeBasicIdentity) {
	      return identities.filter(function (identity) {
	        if (identity.isDestroyed || !identity.isFullIdentity && !writeBasicIdentity) return false;

	        if (identity._fromDB) {
	          identity._fromDB = false;
	          return false;
	        } else if (identity.isLoading) {
	          return false;
	        } else {
	          return true;
	        }
	      }).map(function (identity) {
	        if (identity.isFullIdentity && !writeBasicIdentity) {
	          return {
	            id: identity.id,
	            url: identity.url,
	            user_id: identity.userId,
	            first_name: identity.firstName,
	            last_name: identity.lastName,
	            display_name: identity.displayName,
	            avatar_url: identity.avatarUrl,
	            metadata: identity.metadata,
	            public_key: identity.publicKey,
	            phone_number: identity.phoneNumber,
	            email_address: identity.emailAddress,
	            sync_state: identity.syncState,
	            type: identity.type
	          };
	        } else {
	          return {
	            id: identity.id,
	            url: identity.url,
	            user_id: identity.userId,
	            display_name: identity.displayName,
	            avatar_url: identity.avatarUrl
	          };
	        }
	      });
	    }

	    /**
	     * Writes an array of Identities to the Database.
	     *
	     * @method writeIdentities
	     * @param {layer.Identity[]} identities - Array of Identities to write
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'writeIdentities',
	    value: function writeIdentities(identities, callback) {
	      this._writeObjects('identities', this._getIdentityData(identities), callback);
	    }

	    /**
	     * Convert array of Message instances into Message DB Entries.
	     *
	     * A Message DB entry looks a lot like the server representation, but
	     * includes a sync_state property.
	     *
	     * @method _getMessageData
	     * @private
	     * @param {layer.Message[]} messages
	     * @param {Function} callback
	     * @return {Object[]} messages
	     */

	  }, {
	    key: '_getMessageData',
	    value: function _getMessageData(messages, callback) {
	      var _this7 = this;

	      var dbMessages = messages.filter(function (message) {
	        if (message._fromDB) {
	          message._fromDB = false;
	          return false;
	        } else if (message.syncState === Constants$7.SYNC_STATE.LOADING) {
	          return false;
	        } else {
	          return true;
	        }
	      }).map(function (message) {
	        return {
	          id: message.id,
	          url: message.url,
	          parts: message.parts.map(function (part) {
	            var body = Util$8.isBlob(part.body) && part.body.size > DbManager.MaxPartSize ? null : part.body;
	            return {
	              body: body,
	              id: part.id,
	              encoding: part.encoding,
	              mime_type: part.mimeType,
	              content: !part._content ? null : {
	                id: part._content.id,
	                download_url: part._content.downloadUrl,
	                expiration: part._content.expiration,
	                refresh_url: part._content.refreshUrl,
	                size: part._content.size
	              }
	            };
	          }),
	          position: message.position,
	          sender: _this7._getIdentityData([message.sender], true)[0],
	          recipient_status: message.recipientStatus,
	          sent_at: getDate(message.sentAt),
	          received_at: getDate(message.receivedAt),
	          conversationId: message instanceof Announcement$1 ? 'announcement' : message.conversationId,
	          sync_state: message.syncState,
	          is_unread: message.isUnread
	        };
	      });

	      // Find all blobs and convert them to base64... because Safari 9.1 doesn't support writing blobs those Frelling Smurfs.
	      var count = 0;
	      var parts = [];
	      dbMessages.forEach(function (message) {
	        message.parts.forEach(function (part) {
	          if (Util$8.isBlob(part.body)) parts.push(part);
	        });
	      });
	      if (parts.length === 0) {
	        callback(dbMessages);
	      } else {
	        parts.forEach(function (part) {
	          Util$8.blobToBase64(part.body, function (base64) {
	            part.body = base64;
	            part.useBlob = true;
	            count++;
	            if (count === parts.length) callback(dbMessages);
	          });
	        });
	      }
	    }

	    /**
	     * Writes an array of Messages to the Database.
	     *
	     * @method writeMessages
	     * @param {layer.Message[]} messages - Array of Messages to write
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'writeMessages',
	    value: function writeMessages(messages, callback) {
	      var _this8 = this;

	      this._getMessageData(messages.filter(function (message) {
	        return !message.isDestroyed;
	      }), function (dbMessageData) {
	        return _this8._writeObjects('messages', dbMessageData, callback);
	      });
	    }

	    /**
	     * Convert array of SyncEvent instances into SyncEvent DB Entries.
	     *
	     * @method _getSyncEventData
	     * @param {layer.SyncEvent[]} syncEvents
	     * @return {Object[]} syncEvents
	     * @private
	     */

	  }, {
	    key: '_getSyncEventData',
	    value: function _getSyncEventData(syncEvents) {
	      return syncEvents.filter(function (syncEvt) {
	        if (syncEvt.fromDB) {
	          syncEvt.fromDB = false;
	          return false;
	        } else {
	          return true;
	        }
	      }).map(function (syncEvent$$2) {
	        var item = {
	          id: syncEvent$$2.id,
	          target: syncEvent$$2.target,
	          depends: syncEvent$$2.depends,
	          isWebsocket: syncEvent$$2 instanceof SyncEvent$1.WebsocketSyncEvent,
	          operation: syncEvent$$2.operation,
	          data: syncEvent$$2.data,
	          url: syncEvent$$2.url || '',
	          headers: syncEvent$$2.headers || null,
	          method: syncEvent$$2.method || null,
	          created_at: syncEvent$$2.createdAt
	        };
	        return item;
	      });
	    }

	    /**
	     * Writes an array of SyncEvent to the Database.
	     *
	     * @method writeSyncEvents
	     * @param {layer.SyncEvent[]} syncEvents - Array of Sync Events to write
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'writeSyncEvents',
	    value: function writeSyncEvents(syncEvents, callback) {
	      this._writeObjects('syncQueue', this._getSyncEventData(syncEvents), callback);
	    }

	    /**
	     * Write an array of data to the specified Database table.
	     *
	     * @method _writeObjects
	     * @param {string} tableName - The name of the table to write to
	     * @param {Object[]} data - Array of POJO data to write
	     * @param {Function} [callback] - Called when all data is written
	     * @protected
	     */

	  }, {
	    key: '_writeObjects',
	    value: function _writeObjects(tableName, data, callback) {
	      var _this9 = this;

	      if (!this['_permission_' + tableName] || this._isOpenError) return callback ? callback() : null;

	      // Just quit if no data to write
	      if (!data.length) {
	        if (callback) callback();
	        return;
	      }

	      // PUT (udpate) or ADD (insert) each item of data one at a time, but all as part of one large transaction.
	      this.onOpen(function () {
	        _this9.getObjects(tableName, data.map(function (item) {
	          return item.id;
	        }), function (foundItems) {
	          var updateIds = {};
	          foundItems.forEach(function (item) {
	            updateIds[item.id] = item;
	          });

	          var transaction = _this9.db.transaction([tableName], 'readwrite');
	          var store = transaction.objectStore(tableName);
	          transaction.oncomplete = transaction.onerror = callback;

	          data.forEach(function (item) {
	            try {
	              if (updateIds[item.id]) {
	                store.put(item);
	              } else {
	                store.add(item);
	              }
	            } catch (e) {
	              /* istanbul ignore next */
	              // Safari throws an error rather than use the onerror event.
	              logger$11.error(e);
	            }
	          });
	        });
	      });
	    }

	    /**
	     * Load all conversations from the database.
	     *
	     * @method loadConversations
	     * @param {string} sortBy       - One of 'last_message' or 'created_at'; always sorts in DESC order
	     * @param {string} [fromId=]    - For pagination, provide the conversationId to get Conversations after
	     * @param {number} [pageSize=]  - To limit the number of results, provide a number for how many results to return.
	     * @param {Function} [callback]  - Callback for getting results
	     * @param {layer.Conversation[]} callback.result
	     */

	  }, {
	    key: 'loadConversations',
	    value: function loadConversations(sortBy, fromId, pageSize, callback) {
	      var _this10 = this;

	      try {
	        var sortIndex = void 0,
	            range = null;
	        var fromConversation = fromId ? this.client.getConversation(fromId) : null;
	        if (sortBy === 'last_message') {
	          sortIndex = 'last_message_sent';
	          if (fromConversation) {
	            range = window.IDBKeyRange.upperBound([fromConversation.lastMessage ? getDate(fromConversation.lastMessage.sentAt) : getDate(fromConversation.createdAt)]);
	          }
	        } else {
	          sortIndex = 'created_at';
	          if (fromConversation) {
	            range = window.IDBKeyRange.upperBound([getDate(fromConversation.createdAt)]);
	          }
	        }

	        // Step 1: Get all Conversations
	        this._loadByIndex('conversations', sortIndex, range, Boolean(fromId), pageSize, function (data) {
	          // Step 2: Gather all Message IDs needed to initialize these Conversation's lastMessage properties.
	          var messagesToLoad = data.map(function (item) {
	            return item.last_message;
	          }).filter(function (messageId) {
	            return messageId && !_this10.client.getMessage(messageId);
	          });

	          // Step 3: Load all Messages needed to initialize these Conversation's lastMessage properties.
	          _this10.getObjects('messages', messagesToLoad, function (messages) {
	            _this10._loadConversationsResult(data, messages, callback);
	          });
	        });
	      } catch (e) {
	        // Noop -- handle browsers like IE that don't like these IDBKeyRanges
	      }
	    }

	    /**
	     * Assemble all LastMessages and Conversation POJOs into layer.Message and layer.Conversation instances.
	     *
	     * @method _loadConversationsResult
	     * @private
	     * @param {Object[]} conversations
	     * @param {Object[]} messages
	     * @param {Function} callback
	     * @param {layer.Conversation[]} callback.result
	     */

	  }, {
	    key: '_loadConversationsResult',
	    value: function _loadConversationsResult(conversations, messages, callback) {
	      var _this11 = this;

	      // Instantiate and Register each Message
	      messages.forEach(function (message) {
	        return _this11._createMessage(message);
	      });

	      // Instantiate and Register each Conversation; will find any lastMessage that was registered.
	      var newData = conversations.map(function (conversation) {
	        return _this11._createConversation(conversation) || _this11.client.getConversation(conversation.id);
	      }).filter(function (conversation) {
	        return conversation;
	      });

	      // Return the data
	      if (callback) callback(newData);
	    }

	    /**
	     * Load all channels from the database.
	     *
	     * @method loadChannels
	     * @param {string} sortBy       - One of 'last_message' or 'created_at'; always sorts in DESC order
	     * @param {string} [fromId=]    - For pagination, provide the channelId to get Channel after
	     * @param {number} [pageSize=]  - To limit the number of results, provide a number for how many results to return.
	     * @param {Function} [callback]  - Callback for getting results
	     * @param {layer.Channel[]} callback.result
	     */

	  }, {
	    key: 'loadChannels',
	    value: function loadChannels(fromId, pageSize, callback) {
	      var _this12 = this;

	      try {
	        var sortIndex = 'created_at';
	        var range = null;
	        var fromChannel = fromId ? this.client.getChannel(fromId) : null;
	        if (fromChannel) {
	          range = window.IDBKeyRange.upperBound([getDate(fromChannel.createdAt)]);
	        }

	        this._loadByIndex('channels', sortIndex, range, Boolean(fromId), pageSize, function (data) {
	          _this12._loadChannelsResult(data, callback);
	        });
	      } catch (e) {
	        // Noop -- handle browsers like IE that don't like these IDBKeyRanges
	      }
	    }

	    /**
	     * Assemble all LastMessages and Conversation POJOs into layer.Message and layer.Conversation instances.
	     *
	     * @method _loadChannelsResult
	     * @private
	     * @param {Object[]} channels
	     * @param {Function} callback
	     * @param {layer.Channel[]} callback.result
	     */

	  }, {
	    key: '_loadChannelsResult',
	    value: function _loadChannelsResult(channels, callback) {
	      var _this13 = this;

	      // Instantiate and Register each Conversation; will find any lastMessage that was registered.
	      var newData = channels.map(function (channel) {
	        return _this13._createChannel(channel) || _this13.client.getChannel(channel.id);
	      }).filter(function (conversation) {
	        return conversation;
	      });

	      // Return the data
	      if (callback) callback(newData);
	    }

	    /**
	     * Load all messages for a given Conversation ID from the database.
	     *
	     * Use _loadAll if loading All Messages rather than all Messages for a Conversation.
	     *
	     * @method loadMessages
	     * @param {string} conversationId - ID of the Conversation whose Messages are of interest.
	     * @param {string} [fromId=]    - For pagination, provide the messageId to get Messages after
	     * @param {number} [pageSize=]  - To limit the number of results, provide a number for how many results to return.
	     * @param {Function} [callback]   - Callback for getting results
	     * @param {layer.Message[]} callback.result
	     */

	  }, {
	    key: 'loadMessages',
	    value: function loadMessages(conversationId, fromId, pageSize, callback) {
	      var _this14 = this;

	      if (!this['_permission_messages'] || this._isOpenError) return callback([]);
	      try {
	        var fromMessage = fromId ? this.client.getMessage(fromId) : null;
	        var query = window.IDBKeyRange.bound([conversationId, 0], [conversationId, fromMessage ? fromMessage.position : MAX_SAFE_INTEGER]);
	        this._loadByIndex('messages', 'conversationId', query, Boolean(fromId), pageSize, function (data) {
	          _this14._loadMessagesResult(data, callback);
	        });
	      } catch (e) {
	        // Noop -- handle browsers like IE that don't like these IDBKeyRanges
	      }
	    }

	    /**
	     * Load all Announcements from the database.
	     *
	     * @method loadAnnouncements
	     * @param {string} [fromId=]    - For pagination, provide the messageId to get Announcements after
	     * @param {number} [pageSize=]  - To limit the number of results, provide a number for how many results to return.
	     * @param {Function} [callback]
	     * @param {layer.Announcement[]} callback.result
	     */

	  }, {
	    key: 'loadAnnouncements',
	    value: function loadAnnouncements(fromId, pageSize, callback) {
	      var _this15 = this;

	      if (!this['_permission_messages'] || this._isOpenError) return callback([]);
	      try {
	        var fromMessage = fromId ? this.client.getMessage(fromId) : null;
	        var query = window.IDBKeyRange.bound(['announcement', 0], ['announcement', fromMessage ? fromMessage.position : MAX_SAFE_INTEGER]);
	        this._loadByIndex('messages', 'conversationId', query, Boolean(fromId), pageSize, function (data) {
	          _this15._loadMessagesResult(data, callback);
	        });
	      } catch (e) {
	        // Noop -- handle browsers like IE that don't like these IDBKeyRanges
	      }
	    }
	  }, {
	    key: '_blobifyPart',
	    value: function _blobifyPart(part) {
	      if (part.useBlob) {
	        part.body = Util$8.base64ToBlob(part.body);
	        delete part.useBlob;
	        part.encoding = null;
	      }
	    }

	    /**
	     * Registers and sorts the message objects from the database.
	     *
	     * TODO: Encode limits on this, else we are sorting tens of thousands
	     * of messages in javascript.
	     *
	     * @method _loadMessagesResult
	     * @private
	     * @param {Object[]} Message objects from the database.
	     * @param {Function} callback
	     * @param {layer.Message} callback.result - Message instances created from the database
	     */

	  }, {
	    key: '_loadMessagesResult',
	    value: function _loadMessagesResult(messages, callback) {
	      var _this16 = this;

	      // Convert base64 to blob before sending it along...
	      messages.forEach(function (message) {
	        return message.parts.forEach(function (part) {
	          return _this16._blobifyPart(part);
	        });
	      });

	      // Instantiate and Register each Message
	      var newData = messages.map(function (message) {
	        return _this16._createMessage(message) || _this16.client.getMessage(message.id);
	      }).filter(function (message) {
	        return message;
	      });

	      // Return the results
	      if (callback) callback(newData);
	    }

	    /**
	     * Load all Identities from the database.
	     *
	     * @method loadIdentities
	     * @param {Function} callback
	     * @param {layer.Identity[]} callback.result
	     */

	  }, {
	    key: 'loadIdentities',
	    value: function loadIdentities(callback) {
	      var _this17 = this;

	      this._loadAll('identities', function (data) {
	        _this17._loadIdentitiesResult(data, callback);
	      });
	    }

	    /**
	     * Assemble all LastMessages and Identityy POJOs into layer.Message and layer.Identityy instances.
	     *
	     * @method _loadIdentitiesResult
	     * @private
	     * @param {Object[]} identities
	     * @param {Function} callback
	     * @param {layer.Identity[]} callback.result
	     */

	  }, {
	    key: '_loadIdentitiesResult',
	    value: function _loadIdentitiesResult(identities, callback) {
	      var _this18 = this;

	      // Instantiate and Register each Identity.
	      var newData = identities.map(function (identity) {
	        return _this18._createIdentity(identity) || _this18.client.getIdentity(identity.id);
	      }).filter(function (identity) {
	        return identity;
	      });

	      // Return the data
	      if (callback) callback(newData);
	    }

	    /**
	     * Instantiate and Register the Conversation from a conversation DB Entry.
	     *
	     * If the layer.Conversation already exists, then its presumed that whatever is in
	     * javascript cache is more up to date than whats in IndexedDB cache.
	     *
	     * Attempts to assign the lastMessage property to refer to appropriate Message.  If it fails,
	     * it will be set to null.
	     *
	     * @method _createConversation
	     * @private
	     * @param {Object} conversation
	     * @returns {layer.Conversation}
	     */

	  }, {
	    key: '_createConversation',
	    value: function _createConversation(conversation) {
	      if (!this.client.getConversation(conversation.id)) {
	        conversation._fromDB = true;
	        var newConversation = this.client._createObject(conversation);
	        newConversation.syncState = conversation.sync_state;
	        return newConversation;
	      }
	    }

	    /**
	     * Instantiate and Register the Channel from a Channel DB Entry.
	     *
	     * If the layer.Channel already exists, then its presumed that whatever is in
	     * javascript cache is more up to date than whats in IndexedDB cache.
	     *
	     * Attempts to assign the lastMessage property to refer to appropriate Message.  If it fails,
	     * it will be set to null.
	     *
	     * @method _createChannel
	     * @private
	     * @param {Object} channel
	     * @returns {layer.Channel}
	     */

	  }, {
	    key: '_createChannel',
	    value: function _createChannel(channel) {
	      if (!this.client.getChannel(channel.id)) {
	        channel._fromDB = true;
	        var newChannel = this.client._createObject(channel);
	        newChannel.syncState = channel.sync_state;
	        return newChannel;
	      }
	    }

	    /**
	     * Instantiate and Register the Message from a message DB Entry.
	     *
	     * If the layer.Message already exists, then its presumed that whatever is in
	     * javascript cache is more up to date than whats in IndexedDB cache.
	     *
	     * @method _createMessage
	     * @private
	     * @param {Object} message
	     * @returns {layer.Message}
	     */

	  }, {
	    key: '_createMessage',
	    value: function _createMessage(message) {
	      if (!this.client.getMessage(message.id)) {
	        message._fromDB = true;
	        if (message.conversationId.indexOf('layer:///conversations')) {
	          message.conversation = {
	            id: message.conversationId
	          };
	        } else if (message.conversationId.indexOf('layer:///channels')) {
	          message.channel = {
	            id: message.conversationId
	          };
	        }
	        delete message.conversationId;
	        var newMessage = this.client._createObject(message);
	        newMessage.syncState = message.sync_state;
	        return newMessage;
	      }
	    }

	    /**
	     * Instantiate and Register the Identity from an identities DB Entry.
	     *
	     * If the layer.Identity already exists, then its presumed that whatever is in
	     * javascript cache is more up to date than whats in IndexedDB cache.
	     *
	     * @method _createIdentity
	     * @param {Object} identity
	     * @returns {layer.Identity}
	     */

	  }, {
	    key: '_createIdentity',
	    value: function _createIdentity(identity) {
	      if (!this.client.getIdentity(identity.id)) {
	        identity._fromDB = true;
	        var newidentity = this.client._createObject(identity);
	        newidentity.syncState = identity.sync_state;
	        return newidentity;
	      }
	    }

	    /**
	     * Load all Sync Events from the database.
	     *
	     * @method loadSyncQueue
	     * @param {Function} callback
	     * @param {layer.SyncEvent[]} callback.result
	     */

	  }, {
	    key: 'loadSyncQueue',
	    value: function loadSyncQueue(callback) {
	      var _this19 = this;

	      this._loadAll('syncQueue', function (syncEvents) {
	        return _this19._loadSyncEventRelatedData(syncEvents, callback);
	      });
	    }

	    /**
	     * Validate that we have appropriate data for each SyncEvent and instantiate it.
	     *
	     * Any operation that is not a DELETE must have a valid target found in the database or javascript cache,
	     * otherwise it can not be executed.
	     *
	     * TODO: Need to cleanup sync entries that have invalid targets
	     *
	     * @method _loadSyncEventRelatedData
	     * @private
	     * @param {Object[]} syncEvents
	     * @param {Function} callback
	     * @param {layer.SyncEvent[]} callback.result
	     */

	  }, {
	    key: '_loadSyncEventRelatedData',
	    value: function _loadSyncEventRelatedData(syncEvents, callback) {
	      var _this20 = this;

	      // Gather all Message IDs that are targets of operations.
	      var messageIds = syncEvents.filter(function (item) {
	        return item.operation !== 'DELETE' && item.target && item.target.match(/messages/);
	      }).map(function (item) {
	        return item.target;
	      });

	      // Gather all Conversation IDs that are targets of operations.
	      var conversationIds = syncEvents.filter(function (item) {
	        return item.operation !== 'DELETE' && item.target && item.target.match(/conversations/);
	      }).map(function (item) {
	        return item.target;
	      });

	      var identityIds = syncEvents.filter(function (item) {
	        return item.operation !== 'DELETE' && item.target && item.target.match(/identities/);
	      }).map(function (item) {
	        return item.target;
	      });

	      // Load any Messages/Conversations that are targets of operations.
	      // Call _createMessage or _createConversation on all targets found.
	      var counter = 0;
	      var maxCounter = 3;
	      this.getObjects('messages', messageIds, function (messages) {
	        messages.forEach(function (message) {
	          return _this20._createMessage(message);
	        });
	        counter++;
	        if (counter === maxCounter) _this20._loadSyncEventResults(syncEvents, callback);
	      });
	      this.getObjects('conversations', conversationIds, function (conversations) {
	        conversations.forEach(function (conversation) {
	          return _this20._createConversation(conversation);
	        });
	        counter++;
	        if (counter === maxCounter) _this20._loadSyncEventResults(syncEvents, callback);
	      });
	      this.getObjects('identities', identityIds, function (identities) {
	        identities.forEach(function (identity) {
	          return _this20._createIdentity(identity);
	        });
	        counter++;
	        if (counter === maxCounter) _this20._loadSyncEventResults(syncEvents, callback);
	      });
	    }

	    /**
	     * Turn an array of Sync Event DB Entries into an array of layer.SyncEvent.
	     *
	     * @method _loadSyncEventResults
	     * @private
	     * @param {Object[]} syncEvents
	     * @param {Function} callback
	     * @param {layer.SyncEvent[]} callback.result
	     */

	  }, {
	    key: '_loadSyncEventResults',
	    value: function _loadSyncEventResults(syncEvents, callback) {
	      var _this21 = this;

	      // If the target is present in the sync event, but does not exist in the system,
	      // do NOT attempt to instantiate this event... unless its a DELETE operation.
	      var newData = syncEvents.filter(function (syncEvent$$2) {
	        var hasTarget = Boolean(syncEvent$$2.target && _this21.client.getObject(syncEvent$$2.target));
	        return syncEvent$$2.operation === 'DELETE' || hasTarget;
	      }).map(function (syncEvent$$2) {
	        if (syncEvent$$2.isWebsocket) {
	          return new SyncEvent$1.WebsocketSyncEvent({
	            target: syncEvent$$2.target,
	            depends: syncEvent$$2.depends,
	            operation: syncEvent$$2.operation,
	            id: syncEvent$$2.id,
	            data: syncEvent$$2.data,
	            fromDB: true,
	            createdAt: syncEvent$$2.created_at
	          });
	        } else {
	          return new SyncEvent$1.XHRSyncEvent({
	            target: syncEvent$$2.target,
	            depends: syncEvent$$2.depends,
	            operation: syncEvent$$2.operation,
	            id: syncEvent$$2.id,
	            data: syncEvent$$2.data,
	            method: syncEvent$$2.method,
	            headers: syncEvent$$2.headers,
	            url: syncEvent$$2.url,
	            fromDB: true,
	            createdAt: syncEvent$$2.created_at
	          });
	        }
	      });

	      // Sort the results and then return them.
	      // TODO: Query results should come back sorted by database with proper Index
	      Util$8.sortBy(newData, function (item) {
	        return item.createdAt;
	      });
	      callback(newData);
	    }

	    /**
	     * Load all data from the specified table.
	     *
	     * @method _loadAll
	     * @protected
	     * @param {String} tableName
	     * @param {Function} callback
	     * @param {Object[]} callback.result
	     */

	  }, {
	    key: '_loadAll',
	    value: function _loadAll(tableName, callback) {
	      var _this22 = this;

	      if (!this['_permission_' + tableName] || this._isOpenError) return callback([]);
	      this.onOpen(function () {
	        var data = [];
	        _this22.db.transaction([tableName], 'readonly').objectStore(tableName).openCursor().onsuccess = function (evt) {
	          /* istanbul ignore next */
	          if (_this22.isDestroyed) return;
	          var cursor = evt.target.result;
	          if (cursor) {
	            data.push(cursor.value);
	            cursor.continue();
	          } else if (!_this22.isDestroyed) {
	            /* istanbul ignore next */
	            callback(data);
	          }
	        };
	      });
	    }

	    /**
	     * Load all data from the specified table and with the specified index value.
	     *
	     * Results are always sorted in DESC order at this time.
	     *
	     * @method _loadByIndex
	     * @protected
	     * @param {String} tableName - 'messages', 'conversations', 'identities'
	     * @param {String} indexName - Name of the index to query on
	     * @param {IDBKeyRange} range - Range to Query for (null ok)
	     * @param {Boolean} isFromId - If querying for results after a specified ID, then we want to skip the first result (which will be that ID) ("" is OK)
	     * @param {number} pageSize - If a value is provided, return at most that number of results; else return all results.
	     * @param {Function} callback
	     * @param {Object[]} callback.result
	     */

	  }, {
	    key: '_loadByIndex',
	    value: function _loadByIndex(tableName, indexName, range, isFromId, pageSize, callback) {
	      var _this23 = this;

	      if (!this['_permission_' + tableName] || this._isOpenError) return callback([]);
	      var shouldSkipNext = isFromId;
	      this.onOpen(function () {
	        var data = [];
	        _this23.db.transaction([tableName], 'readonly').objectStore(tableName).index(indexName).openCursor(range, 'prev').onsuccess = function (evt) {
	          /* istanbul ignore next */
	          if (_this23.isDestroyed) return;
	          var cursor = evt.target.result;
	          if (cursor) {
	            if (shouldSkipNext) {
	              shouldSkipNext = false;
	            } else {
	              data.push(cursor.value);
	            }
	            if (pageSize && data.length >= pageSize) {
	              callback(data);
	            } else {
	              cursor.continue();
	            }
	          } else {
	            callback(data);
	          }
	        };
	      });
	    }

	    /**
	     * Deletes the specified objects from the specified table.
	     *
	     * Currently takes an array of data to delete rather than an array of IDs;
	     * If you only have an ID, [{id: myId}] should work.
	     *
	     * @method deleteObjects
	     * @param {String} tableName
	     * @param {Object[]} data
	     * @param {Function} [callback]
	     */

	  }, {
	    key: 'deleteObjects',
	    value: function deleteObjects(tableName, data, callback) {
	      var _this24 = this;

	      if (!this['_permission_' + tableName] || this._isOpenError) return callback ? callback() : null;
	      this.onOpen(function () {
	        var transaction = _this24.db.transaction([tableName], 'readwrite');
	        var store = transaction.objectStore(tableName);
	        transaction.oncomplete = callback;
	        data.forEach(function (item) {
	          return store.delete(item.id);
	        });
	      });
	    }

	    /**
	     * Retrieve the identified objects from the specified database table.
	     *
	     * Turning these into instances is the responsibility of the caller.
	     *
	     * Inspired by http://www.codeproject.com/Articles/744986/How-to-do-some-magic-with-indexedDB
	     *
	     * @method getObjects
	     * @param {String} tableName
	     * @param {String[]} ids
	     * @param {Function} callback
	     * @param {Object[]} callback.result
	     */

	  }, {
	    key: 'getObjects',
	    value: function getObjects(tableName, ids, callback) {
	      var _this25 = this;

	      if (!this['_permission_' + tableName] || this._isOpenError) return callback([]);
	      var data = [];

	      // Gather, sort, and filter replica IDs
	      var sortedIds = ids.sort();
	      for (var i = sortedIds.length - 1; i > 0; i--) {
	        if (sortedIds[i] === sortedIds[i - 1]) sortedIds.splice(i, 1);
	      }
	      var index = 0;

	      // Iterate over the table searching for the specified IDs
	      this.onOpen(function () {
	        _this25.db.transaction([tableName], 'readonly').objectStore(tableName).openCursor().onsuccess = function (evt) {
	          /* istanbul ignore next */
	          if (_this25.isDestroyed) return;
	          var cursor = evt.target.result;
	          if (!cursor) {
	            callback(data);
	            return;
	          }
	          var key = cursor.key;

	          // The cursor has passed beyond this key. Check next.
	          while (key > sortedIds[index]) {
	            index++;
	          } // The cursor is pointing at one of our IDs, get it and check next.
	          if (key === sortedIds[index]) {
	            data.push(cursor.value);
	            index++;
	          }

	          // Done or check next
	          if (index === sortedIds.length) {
	            /* istanbul ignore else */
	            if (!_this25.isDestroyed) callback(data);
	          } else {
	            cursor.continue(sortedIds[index]);
	          }
	        };
	      });
	    }

	    /**
	     * A simplified getObjects() method that gets a single object, and also gets its related objects.
	     *
	     * @method getObject
	     * @param {string} tableName
	     * @param {string} id
	     * @param {Function} callback
	     * @param {Object} callback.data
	     */

	  }, {
	    key: 'getObject',
	    value: function getObject(tableName, id, callback) {
	      var _this26 = this;

	      if (!this['_permission_' + tableName] || this._isOpenError) return callback();

	      this.onOpen(function () {
	        _this26.db.transaction([tableName], 'readonly').objectStore(tableName).openCursor(window.IDBKeyRange.only(id)).onsuccess = function (evt) {
	          var cursor = evt.target.result;
	          if (!cursor) return callback(null);

	          switch (tableName) {
	            case 'messages':
	              // Convert base64 to blob before sending it along...
	              cursor.value.parts.forEach(function (part) {
	                return _this26._blobifyPart(part);
	              });
	              return callback(cursor.value);
	            case 'identities':
	            case 'channels':
	              return callback(cursor.value);
	            case 'conversations':
	              if (cursor.value.last_message) {
	                var lastMessage = _this26.client.getMessage(cursor.value.last_message);
	                if (lastMessage) {
	                  return _this26._getMessageData([lastMessage], function (messages) {
	                    cursor.value.last_message = messages[0];
	                    callback(cursor.value);
	                  });
	                } else {
	                  return _this26.getObject('messages', cursor.value.last_message, function (message) {
	                    cursor.value.last_message = message;
	                    callback(cursor.value);
	                  });
	                }
	              } else {
	                return callback(cursor.value);
	              }
	          }
	        };
	      });
	    }

	    /**
	     * Claim a Sync Event.
	     *
	     * A sync event is claimed by locking the table,  validating that it is still in the table... and then deleting it from the table.
	     *
	     * @method claimSyncEvent
	     * @param {layer.SyncEvent} syncEvent
	     * @param {Function} callback
	     * @param {Boolean} callback.result
	     */

	  }, {
	    key: 'claimSyncEvent',
	    value: function claimSyncEvent(syncEvent$$2, callback) {
	      var _this27 = this;

	      if (!this._permission_syncQueue || this._isOpenError) return callback(true);
	      this.onOpen(function () {
	        var transaction = _this27.db.transaction(['syncQueue'], 'readwrite');
	        var store = transaction.objectStore('syncQueue');
	        store.get(syncEvent$$2.id).onsuccess = function (evt) {
	          return callback(Boolean(evt.target.result));
	        };
	        store.delete(syncEvent$$2.id);
	      });
	    }

	    /**
	     * Delete all data from all tables.
	     *
	     * This should be called from layer.Client.logout()
	     *
	     * @method deleteTables
	     * @param {Function} [calllback]
	     */

	  }, {
	    key: 'deleteTables',
	    value: function deleteTables() {
	      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

	      try {
	        var request = window.indexedDB.deleteDatabase(this._getDbName());
	        request.onsuccess = request.onerror = callback;
	        delete this.db;
	      } catch (e) {
	        logger$11.error('Failed to delete database', e);
	        if (callback) callback(e);
	      }
	    }
	  }]);

	  return DbManager;
	}(Root$16);

	/**
	 * @type {layer.Client} Layer Client instance
	 */


	DbManager$1.prototype.client = null;

	/**
	 * @type {boolean} is the db connection open
	 */
	DbManager$1.prototype.isOpen = false;

	/**
	 * @type {boolean} is the db connection will not open
	 * @private
	 */
	DbManager$1.prototype._isOpenError = false;

	/**
	 * @type {boolean} Is reading/writing messages allowed?
	 * @private
	 */
	DbManager$1.prototype._permission_messages = false;

	/**
	 * @type {boolean} Is reading/writing conversations allowed?
	 * @private
	 */
	DbManager$1.prototype._permission_conversations = false;

	/**
	 * @type {boolean} Is reading/writing channels allowed?
	 * @private
	 */
	DbManager$1.prototype._permission_channels = false;

	/**
	 * @type {boolean} Is reading/writing identities allowed?
	 * @private
	 */
	DbManager$1.prototype._permission_identities = false;

	/**
	 * @type {boolean} Is reading/writing unsent server requests allowed?
	 * @private
	 */
	DbManager$1.prototype._permission_syncQueue = false;

	/**
	 * @type IDBDatabase
	 */
	DbManager$1.prototype.db = null;

	/**
	 * Rich Content may be written to indexeddb and persisted... if its size is less than this number of bytes.
	 *
	 * This value can be customized; this example only writes Rich Content that is less than 5000 bytes
	 *
	 *    layer.DbManager.MaxPartSize = 5000;
	 *
	 * @static
	 * @type {Number}
	 */
	DbManager$1.MaxPartSize = 250000;

	DbManager$1._supportedEvents = ['open', 'error'].concat(Root$16._supportedEvents);

	Root$16.initClass.apply(DbManager$1, [DbManager$1, 'DbManager']);
	var dbManager = DbManager$1;

	var _typeof$4 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$5 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$5(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$2(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$2(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Layer Client.  Access the layer by calling create and receiving it
	 * from the "ready" callback.

	  var client = new layer.Client({
	    appId: "layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff",
	    isTrustedDevice: false,
	    challenge: function(evt) {
	      myAuthenticator({
	        nonce: evt.nonce,
	        onSuccess: evt.callback
	      });
	    },
	    ready: function(client) {
	      alert("Yay, I finally got my client!");
	    }
	  }).connect("sampleuserId");

	 * The Layer Client/ClientAuthenticator classes have been divided into:
	 *
	 * 1. ClientAuthenticator: Manages all authentication and connectivity related issues
	 * 2. Client: Manages access to Conversations, Queries, Messages, Events, etc...
	 *
	 * @class layer.ClientAuthenticator
	 * @private
	 * @extends layer.Root
	 * @author Michael Kantor
	 *
	 */

	var xhr = xhr$1;
	var Root$2 = root;
	var SocketManager = socketManager;
	var WebsocketChangeManager = changeManager;
	var WebsocketRequestManager = requestManager;
	var LayerError$2 = layerError;
	var OnlineManager = onlineStateManager;
	var SyncManager = syncManager;
	var DbManager = dbManager;
	var Identity$1 = identity;

	var _require = syncEvent;
	var XHRSyncEvent = _require.XHRSyncEvent;
	var WebsocketSyncEvent = _require.WebsocketSyncEvent;

	var _require2 = _const;
	var ACCEPT = _require2.ACCEPT;
	var LOCALSTORAGE_KEYS = _require2.LOCALSTORAGE_KEYS;

	var logger$2 = logger_1;
	var Util$1 = clientUtils;

	var MAX_XHR_RETRIES = 3;

	var ClientAuthenticator = function (_Root) {
	  _inherits$2(ClientAuthenticator, _Root);

	  /**
	   * Create a new Client.
	   *
	   * The appId is the only required parameter:
	   *
	   *      var client = new Client({
	   *          appId: "layer:///apps/staging/uuid"
	   *      });
	   *
	   * For trusted devices, you can enable storage of data to indexedDB and localStorage with the `isTrustedDevice` and `isPersistenceEnabled` property:
	   *
	   *      var client = new Client({
	   *          appId: "layer:///apps/staging/uuid",
	   *          isTrustedDevice: true,
	   *          isPersistenceEnabled: true
	   *      });
	   *
	   * @method constructor
	   * @param  {Object} options
	   * @param  {string} options.appId           - "layer:///apps/production/uuid"; Identifies what
	   *                                            application we are connecting to.
	   * @param  {string} [options.url=https://api.layer.com] - URL to log into a different REST server
	   * @param {number} [options.logLevel=ERROR] - Provide a log level that is one of layer.Constants.LOG.NONE, layer.Constants.LOG.ERROR,
	   *                                            layer.Constants.LOG.WARN, layer.Constants.LOG.INFO, layer.Constants.LOG.DEBUG
	   * @param {boolean} [options.isTrustedDevice=false] - If this is not a trusted device, no data will be written to indexedDB nor localStorage,
	   *                                            regardless of any values in layer.Client.persistenceFeatures.
	   * @param {Object} [options.isPersistenceEnabled=false] If layer.Client.isPersistenceEnabled is true, then indexedDB will be used to manage a cache
	   *                                            allowing Query results, messages sent, and all local modifications to be persisted between page reloads.
	   */
	  function ClientAuthenticator(options) {
	    _classCallCheck$5(this, ClientAuthenticator);

	    // Validate required parameters
	    if (!options.appId) throw new Error(LayerError$2.dictionary.appIdMissing);

	    return _possibleConstructorReturn$2(this, (ClientAuthenticator.__proto__ || Object.getPrototypeOf(ClientAuthenticator)).call(this, options));
	  }

	  /**
	   * Initialize the subcomponents of the ClientAuthenticator
	   *
	   * @method _initComponents
	   * @private
	   */


	  _createClass$5(ClientAuthenticator, [{
	    key: '_initComponents',
	    value: function _initComponents() {
	      // Setup the websocket manager; won't connect until we trigger an authenticated event
	      this.socketManager = new SocketManager({
	        client: this
	      });

	      this.socketChangeManager = new WebsocketChangeManager({
	        client: this,
	        socketManager: this.socketManager
	      });

	      this.socketRequestManager = new WebsocketRequestManager({
	        client: this,
	        socketManager: this.socketManager
	      });

	      this.onlineManager = new OnlineManager({
	        socketManager: this.socketManager
	      });

	      this.onlineManager.on('connected', this._handleOnlineChange, this);
	      this.onlineManager.on('disconnected', this._handleOnlineChange, this);

	      this.syncManager = new SyncManager({
	        onlineManager: this.onlineManager,
	        socketManager: this.socketManager,
	        requestManager: this.socketRequestManager,
	        client: this
	      });
	    }

	    /**
	     * Destroy the subcomponents of the ClientAuthenticator
	     *
	     * @method _destroyComponents
	     * @private
	     */

	  }, {
	    key: '_destroyComponents',
	    value: function _destroyComponents() {
	      this.syncManager.destroy();
	      this.onlineManager.destroy();
	      this.socketManager.destroy();
	      this.socketChangeManager.destroy();
	      this.socketRequestManager.destroy();
	      if (this.dbManager) this.dbManager.destroy();
	    }

	    /**
	     * Is Persisted Session Tokens disabled?
	     *
	     * @method _isPersistedSessionsDisabled
	     * @returns {Boolean}
	     * @private
	     */

	  }, {
	    key: '_isPersistedSessionsDisabled',
	    value: function _isPersistedSessionsDisabled() {
	      return !commonjsGlobal.localStorage || this.persistenceFeatures && !this.persistenceFeatures.sessionToken;
	    }

	    /**
	     * Restore the sessionToken from localStorage.
	     *
	     * This sets the sessionToken rather than returning the token.
	     *
	     * @method _restoreLastSession
	     * @private
	     */

	  }, {
	    key: '_restoreLastSession',
	    value: function _restoreLastSession() {
	      if (this._isPersistedSessionsDisabled()) return;
	      try {
	        var sessionData = commonjsGlobal.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId];
	        if (!sessionData) return;
	        var parsedData = JSON.parse(sessionData);
	        if (parsedData.expires < Date.now()) {
	          commonjsGlobal.localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
	        } else {
	          this.sessionToken = parsedData.sessionToken;
	        }
	      } catch (error) {
	        // No-op
	      }
	    }

	    /**
	     * Restore the Identity for the session owner from localStorage.
	     *
	     * @method _restoreLastSession
	     * @private
	     * @return {layer.Identity}
	     */

	  }, {
	    key: '_restoreLastUser',
	    value: function _restoreLastUser() {
	      try {
	        var sessionData = commonjsGlobal.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId];
	        if (!sessionData) return null;
	        var userObj = JSON.parse(sessionData).user;
	        return new Identity$1({
	          clientId: this.appId,
	          sessionOwner: true,
	          fromServer: userObj
	        });
	      } catch (error) {
	        return null;
	      }
	    }

	    /**
	     * Has the userID changed since the last login?
	     *
	     * @method _hasUserIdChanged
	     * @param {string} userId
	     * @returns {boolean}
	     * @private
	     */

	  }, {
	    key: '_hasUserIdChanged',
	    value: function _hasUserIdChanged(userId) {
	      try {
	        var sessionData = commonjsGlobal.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId];
	        if (!sessionData) return true;
	        return JSON.parse(sessionData).user.user_id !== userId;
	      } catch (error) {
	        return true;
	      }
	    }

	    /**
	     * Get a nonce and start the authentication process
	     *
	     * @method
	     * @private
	     */

	  }, {
	    key: '_connect',
	    value: function _connect() {
	      var _this2 = this;

	      this._triggerAsync('state-change', {
	        started: true,
	        type: 'authentication',
	        telemetryId: 'auth_time',
	        id: null
	      });
	      this.xhr({
	        url: '/nonces',
	        method: 'POST',
	        sync: false
	      }, function (result) {
	        return _this2._connectionResponse(result);
	      });
	    }

	    /**
	     * Initiates the connection.
	     *
	     * Called by constructor().
	     *
	     * Will either attempt to validate the cached sessionToken by getting conversations,
	     * or if no sessionToken, will call /nonces to start process of getting a new one.
	     *
	     * ```javascript
	     * var client = new layer.Client({appId: myAppId});
	     * client.connect('Frodo-the-Dodo');
	     * ```
	     *
	     * @method connect
	     * @param {string} userId - User ID of the user you are logging in as
	     * @returns {layer.ClientAuthenticator} this
	     */

	  }, {
	    key: 'connect',
	    value: function connect() {
	      var userId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

	      if (this.isAuthenticated) return this;

	      var user = void 0;
	      this.isConnected = false;
	      this._lastChallengeTime = 0;
	      this._wantsToBeAuthenticated = true;
	      this.user = null;
	      this.onlineManager.start();
	      if (!this.isTrustedDevice || !userId || this._isPersistedSessionsDisabled() || this._hasUserIdChanged(userId)) {
	        this._clearStoredData();
	      }

	      if (this.isTrustedDevice && userId) {
	        this._restoreLastSession(userId);
	        user = this._restoreLastUser();
	        if (user) this.user = user;
	      }

	      if (!this.user) {
	        this.user = new Identity$1({
	          userId: userId,
	          sessionOwner: true,
	          clientId: this.appId,
	          id: userId ? Identity$1.prefixUUID + encodeURIComponent(userId) : ''
	        });
	      }

	      if (this.sessionToken && this.user.userId) {
	        this._sessionTokenRestored();
	      } else {
	        this._connect();
	      }
	      return this;
	    }

	    /**
	     * Initiates the connection with a session token.
	     *
	     * This call is for use when you have received a Session Token from some other source; such as your server,
	     * and wish to use that instead of doing a full auth process.
	     *
	     * The Client will presume the token to be valid, and will asynchronously trigger the `ready` event.
	     * If the token provided is NOT valid, this won't be detected until a request is made using this token,
	     * at which point the `challenge` method will trigger.
	     *
	     * NOTE: The `connected` event will not be triggered on this path.
	     *
	     * ```javascript
	     * var client = new layer.Client({appId: myAppId});
	     * client.connectWithSession('Frodo-the-Dodo', mySessionToken);
	     * ```
	     *
	     * @method connectWithSession
	     * @param {String} userId
	     * @param {String} sessionToken
	     * @returns {layer.ClientAuthenticator} this
	     */

	  }, {
	    key: 'connectWithSession',
	    value: function connectWithSession(userId, sessionToken) {
	      var _this3 = this;

	      if (this.isAuthenticated) return this;

	      var user = void 0;
	      this.isConnected = false;
	      this.user = null;
	      this._lastChallengeTime = 0;
	      this._wantsToBeAuthenticated = true;
	      if (!userId || !sessionToken) throw new Error(LayerError$2.dictionary.sessionAndUserRequired);
	      if (!this.isTrustedDevice || this._isPersistedSessionsDisabled() || this._hasUserIdChanged(userId)) {
	        this._clearStoredData();
	      }
	      if (this.isTrustedDevice) {
	        user = this._restoreLastUser();
	        if (user) this.user = user;
	      }

	      this.onlineManager.start();

	      if (!this.user) {
	        this.user = new Identity$1({
	          userId: userId,
	          sessionOwner: true,
	          clientId: this.appId
	        });
	      }

	      this.isConnected = true;
	      setTimeout(function () {
	        if (!_this3.isAuthenticated) {
	          _this3._authComplete({ session_token: sessionToken }, false);
	        }
	      }, 1);
	      return this;
	    }

	    /**
	     * Called when our request for a nonce gets a response.
	     *
	     * If there is an error, calls _connectionError.
	     *
	     * If there is nonce, calls _connectionComplete.
	     *
	     * @method _connectionResponse
	     * @private
	     * @param  {Object} result
	     */

	  }, {
	    key: '_connectionResponse',
	    value: function _connectionResponse(result) {
	      if (!result.success) {
	        this._connectionError(result.data);
	      } else {
	        this._connectionComplete(result.data);
	      }
	    }

	    /**
	     * We are now connected (we have a nonce).
	     *
	     * If we have successfully retrieved a nonce, then
	     * we have entered a "connected" but not "authenticated" state.
	     * Set the state, trigger any events, and then start authentication.
	     *
	     * @method _connectionComplete
	     * @private
	     * @param  {Object} result
	     * @param  {string} result.nonce - The nonce provided by the server
	     *
	     * @fires connected
	     */

	  }, {
	    key: '_connectionComplete',
	    value: function _connectionComplete(result) {
	      this.isConnected = true;
	      this.trigger('connected');
	      this._authenticate(result.nonce);
	    }

	    /**
	     * Called when we fail to get a nonce.
	     *
	     * @method _connectionError
	     * @private
	     * @param  {layer.LayerError} err
	     *
	     * @fires connected-error
	     */

	  }, {
	    key: '_connectionError',
	    value: function _connectionError(error) {
	      this.trigger('connected-error', { error: error });
	    }

	    /* CONNECT METHODS END */

	    /* AUTHENTICATE METHODS BEGIN */

	    /**
	     * Start the authentication step.
	     *
	     * We start authentication by triggering a "challenge" event that
	     * tells the app to use the nonce to obtain an identity_token.
	     *
	     * @method _authenticate
	     * @private
	     * @param  {string} nonce - The nonce to provide your identity provider service
	     *
	     * @fires challenge
	     */

	  }, {
	    key: '_authenticate',
	    value: function _authenticate(nonce) {
	      this._lastChallengeTime = Date.now();
	      if (nonce) {
	        this.trigger('challenge', {
	          nonce: nonce,
	          callback: this.answerAuthenticationChallenge.bind(this)
	        });
	      }
	    }

	    /**
	     * Accept an identityToken and use it to create a session.
	     *
	     * Typically, this method is called using the function pointer provided by
	     * the challenge event, but it can also be called directly.
	     *
	     *      getIdentityToken(nonce, function(identityToken) {
	     *          client.answerAuthenticationChallenge(identityToken);
	     *      });
	     *
	     * @method answerAuthenticationChallenge
	     * @param  {string} identityToken - Identity token provided by your identity provider service
	     */

	  }, {
	    key: 'answerAuthenticationChallenge',
	    value: function answerAuthenticationChallenge(identityToken) {
	      var _this4 = this;

	      // Report an error if no identityToken provided
	      if (!identityToken) {
	        throw new Error(LayerError$2.dictionary.identityTokenMissing);
	      } else {
	        var userData = Util$1.decode(identityToken.split('.')[1]);
	        var identityObj = JSON.parse(userData);

	        if (!identityObj.prn) {
	          throw new Error('Your identity token prn (user id) is empty');
	        }

	        if (this.user.userId && this.user.userId !== identityObj.prn) {
	          throw new Error(LayerError$2.dictionary.invalidUserIdChange);
	        }

	        this.user._setUserId(identityObj.prn);

	        if (identityObj.display_name) this.user.displayName = identityObj.display_name;
	        if (identityObj.avatar_url) this.user.avatarUrl = identityObj.avatar_url;

	        this.xhr({
	          url: '/sessions',
	          method: 'POST',
	          sync: false,
	          data: {
	            identity_token: identityToken,
	            app_id: this.appId
	          }
	        }, function (result) {
	          return _this4._authResponse(result, identityToken);
	        });
	      }
	    }

	    /**
	     * Called when our request for a sessionToken receives a response.
	     *
	     * @private
	     * @method _authResponse
	     * @param  {Object} result
	     * @param  {string} identityToken
	     */

	  }, {
	    key: '_authResponse',
	    value: function _authResponse(result, identityToken) {
	      this._triggerAsync('state-change', {
	        ended: true,
	        type: 'authentication',
	        telemetryId: 'auth_time',
	        result: result.success
	      });
	      if (!result.success) {
	        this._authError(result.data, identityToken);
	      } else {
	        this._authComplete(result.data, false);
	      }
	    }

	    /**
	     * Authentication is completed, update state and trigger events.
	     *
	     * @method _authComplete
	     * @private
	     * @param  {Object} result
	     * @param  {Boolean} fromPersistence
	     * @param  {string} result.session_token - Session token received from the server
	     *
	     * @fires authenticated
	     */

	  }, {
	    key: '_authComplete',
	    value: function _authComplete(result, fromPersistence) {
	      if (!result || !result.session_token) {
	        throw new Error(LayerError$2.dictionary.sessionTokenMissing);
	      }
	      this.sessionToken = result.session_token;

	      // If _authComplete was called because we accepted an auth loaded from storage
	      // we don't need to update storage.
	      if (!this._isPersistedSessionsDisabled() && !fromPersistence) {
	        try {
	          commonjsGlobal.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId] = JSON.stringify({
	            sessionToken: this.sessionToken || '',
	            user: DbManager.prototype._getIdentityData([this.user], true)[0],
	            expires: Date.now() + 30 * 60 * 60 * 24 * 1000
	          });
	        } catch (e) {
	          // Do nothing
	        }
	      }

	      this._clientAuthenticated();
	    }

	    /**
	     * Authentication has failed.
	     *
	     * @method _authError
	     * @private
	     * @param  {layer.LayerError} result
	     * @param  {string} identityToken Not currently used
	     *
	     * @fires authenticated-error
	     */

	  }, {
	    key: '_authError',
	    value: function _authError(error, identityToken) {
	      this.trigger('authenticated-error', { error: error });
	    }

	    /**
	     * Sets state and triggers events for both connected and authenticated.
	     *
	     * If reusing a sessionToken cached in localStorage,
	     * use this method rather than _authComplete.
	     *
	     * @method _sessionTokenRestored
	     * @private
	     *
	     * @fires connected, authenticated
	     */

	  }, {
	    key: '_sessionTokenRestored',
	    value: function _sessionTokenRestored() {
	      this.isConnected = true;
	      this.trigger('connected');
	      this._clientAuthenticated();
	    }

	    /**
	     * The client is now authenticated, and doing some setup
	     * before calling _clientReady.
	     *
	     * @method _clientAuthenticated
	     * @private
	     */

	  }, {
	    key: '_clientAuthenticated',
	    value: function _clientAuthenticated() {
	      var _this5 = this;

	      // Update state and trigger the event
	      this.isAuthenticated = true;
	      this.trigger('authenticated');

	      if (!this.isTrustedDevice) this.isPersistenceEnabled = false;

	      // If no persistenceFeatures are specified, set them all
	      // to true or false to match isTrustedDevice.
	      if (!this.persistenceFeatures || !this.isPersistenceEnabled) {
	        var sessionToken = void 0;
	        if (this.persistenceFeatures && 'sessionToken' in this.persistenceFeatures) {
	          sessionToken = Boolean(this.persistenceFeatures.sessionToken);
	        } else {
	          sessionToken = this.isTrustedDevice;
	        }
	        this.persistenceFeatures = {
	          conversations: this.isPersistenceEnabled,
	          channels: this.isPersistenceEnabled,
	          messages: this.isPersistenceEnabled,
	          identities: this.isPersistenceEnabled,
	          syncQueue: this.isPersistenceEnabled,
	          sessionToken: sessionToken
	        };
	      }

	      // Setup the Database Manager
	      if (!this.dbManager) {
	        this.dbManager = new DbManager({
	          client: this,
	          tables: this.persistenceFeatures,
	          enabled: this.isPersistenceEnabled
	        });
	      }

	      // Before calling _clientReady, load the session owner's full Identity.
	      if (this.isPersistenceEnabled) {
	        this.dbManager.onOpen(function () {
	          return _this5._loadUser();
	        });
	      } else {
	        this._loadUser();
	      }
	    }

	    /**
	     * Load the session owner's full identity.
	     *
	     * Note that failure to load the identity will not prevent
	     * _clientReady, but is certainly not a desired outcome.
	     *
	     * @method _loadUser
	     */

	  }, {
	    key: '_loadUser',
	    value: function _loadUser() {
	      var _this6 = this;

	      // We're done if we got the full identity from localStorage.
	      if (this.user.isFullIdentity) {
	        this._clientReady();
	      } else {
	        // load the user's full Identity so we have presence;
	        this.user._load();
	        this.user.once('identities:loaded', function () {
	          if (!_this6._isPersistedSessionsDisabled()) {
	            _this6._writeSessionOwner();
	            _this6.user.on('identities:change', _this6._writeSessionOwner, _this6);
	          }
	          _this6._clientReady();
	        }).once('identities:loaded-error', function () {
	          if (!_this6.user.displayName) _this6.user.displayName = _this6.defaultOwnerDisplayName;
	          _this6._clientReady();
	        });
	      }
	    }

	    /**
	     * Write the latest state of the Session's Identity object to localStorage
	     *
	     * @method _writeSessionOwner
	     * @private
	     */

	  }, {
	    key: '_writeSessionOwner',
	    value: function _writeSessionOwner() {
	      try {
	        // Update the session data in localStorage with our full Identity.
	        var sessionData = JSON.parse(commonjsGlobal.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId]);
	        sessionData.user = DbManager.prototype._getIdentityData([this.user])[0];
	        commonjsGlobal.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId] = JSON.stringify(sessionData);
	      } catch (e) {
	        // no-op
	      }
	    }

	    /**
	     * Called to flag the client as ready for action.
	     *
	     * This method is called after authenication AND
	     * after initial conversations have been loaded.
	     *
	     * @method _clientReady
	     * @private
	     * @fires ready
	     */

	  }, {
	    key: '_clientReady',
	    value: function _clientReady() {
	      if (!this.isReady) {
	        this.isReady = true;
	        this.trigger('ready');
	      }
	    }

	    /* CONNECT METHODS END */

	    /* START SESSION MANAGEMENT METHODS */

	    /**
	     * Deletes your sessionToken from the server, and removes all user data from the Client.
	     * Call `client.connect()` to restart the authentication process.
	     *
	     * This call is asynchronous; some browsers (ahem, safari...) may not have completed the deletion of
	     * persisted data if you
	     * navigate away from the page.  Use the callback to determine when all necessary cleanup has completed
	     * prior to navigating away.
	     *
	     * Note that while all data should be purged from the browser/device, if you are offline when this is called,
	     * your session token will NOT be deleted from the web server.  Why not? Because it would involve retaining the
	     * request after all of the user's data has been deleted, or NOT deleting the user's data until we are online.
	     *
	     * @method logout
	     * @param {Function} callback
	     * @return {layer.ClientAuthenticator} this
	     */

	  }, {
	    key: 'logout',
	    value: function logout(callback) {
	      this._wantsToBeAuthenticated = false;
	      var callbackCount = 1,
	          counter = 0;
	      if (this.isAuthenticated) {
	        callbackCount++;
	        this.xhr({
	          method: 'DELETE',
	          url: '/sessions/' + escape(this.sessionToken),
	          sync: false
	        }, function () {
	          counter++;
	          if (counter === callbackCount && callback) callback();
	        });
	      }

	      // Clear data even if isAuthenticated is false
	      // Session may have expired, but data still cached.
	      this._clearStoredData(function () {
	        counter++;
	        if (counter === callbackCount && callback) callback();
	      });

	      this._resetSession();
	      return this;
	    }
	  }, {
	    key: '_clearStoredData',
	    value: function _clearStoredData(callback) {
	      if (commonjsGlobal.localStorage) localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
	      if (this.dbManager) {
	        this.dbManager.deleteTables(callback);
	      } else if (callback) {
	        callback();
	      }
	    }

	    /**
	     * Log out/clear session information.
	     *
	     * Use this to clear the sessionToken and all information from this session.
	     *
	     * @method _resetSession
	     * @private
	     */

	  }, {
	    key: '_resetSession',
	    value: function _resetSession() {
	      this.isReady = false;
	      this.isConnected = false;
	      this.isAuthenticated = false;

	      if (this.sessionToken) {
	        this.sessionToken = '';
	        if (commonjsGlobal.localStorage) {
	          localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
	        }
	      }

	      this.trigger('deauthenticated');
	      this.onlineManager.stop();
	    }

	    /**
	     * Register your IOS device to receive notifications.
	     * For use with native code only (Cordova, React Native, Titanium, etc...)
	     *
	     * @method registerIOSPushToken
	     * @param {Object} options
	     * @param {string} options.deviceId - Your IOS device's device ID
	     * @param {string} options.iosVersion - Your IOS device's version number
	     * @param {string} options.token - Your Apple APNS Token
	     * @param {string} [options.bundleId] - Your Apple APNS Bundle ID ("com.layer.bundleid")
	     * @param {Function} [callback=null] - Optional callback
	     * @param {layer.LayerError} callback.error - LayerError if there was an error; null if successful
	     */

	  }, {
	    key: 'registerIOSPushToken',
	    value: function registerIOSPushToken(options, callback) {
	      this.xhr({
	        url: 'push_tokens',
	        method: 'POST',
	        sync: false,
	        data: {
	          token: options.token,
	          type: 'apns',
	          device_id: options.deviceId,
	          ios_version: options.iosVersion,
	          apns_bundle_id: options.bundleId
	        }
	      }, function (result) {
	        return callback(result.data);
	      });
	    }

	    /**
	     * Register your Android device to receive notifications.
	     * For use with native code only (Cordova, React Native, Titanium, etc...)
	     *
	     * @method registerAndroidPushToken
	     * @param {Object} options
	     * @param {string} options.deviceId - Your IOS device's device ID
	     * @param {string} options.token - Your GCM push Token
	     * @param {string} options.senderId - Your GCM Sender ID/Project Number
	     * @param {Function} [callback=null] - Optional callback
	     * @param {layer.LayerError} callback.error - LayerError if there was an error; null if successful
	     */

	  }, {
	    key: 'registerAndroidPushToken',
	    value: function registerAndroidPushToken(options, callback) {
	      this.xhr({
	        url: 'push_tokens',
	        method: 'POST',
	        sync: false,
	        data: {
	          token: options.token,
	          type: 'gcm',
	          device_id: options.deviceId,
	          gcm_sender_id: options.senderId
	        }
	      }, function (result) {
	        return callback(result.data);
	      });
	    }

	    /**
	     * Register your Android device to receive notifications.
	     * For use with native code only (Cordova, React Native, Titanium, etc...)
	     *
	     * @method unregisterPushToken
	     * @param {string} deviceId - Your IOS device's device ID
	     * @param {Function} [callback=null] - Optional callback
	     * @param {layer.LayerError} callback.error - LayerError if there was an error; null if successful
	     */

	  }, {
	    key: 'unregisterPushToken',
	    value: function unregisterPushToken(deviceId, callback) {
	      this.xhr({
	        url: 'push_tokens/' + deviceId,
	        method: 'DELETE'
	      }, function (result) {
	        return callback(result.data);
	      });
	    }

	    /* SESSION MANAGEMENT METHODS END */

	    /* ACCESSOR METHODS BEGIN */

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any attempt to execute `this.userAppId = 'xxx'` will cause an error to be thrown
	     * if the client is already connected.
	     *
	     * @private
	     * @method __adjustAppId
	     * @param {string} value - New appId value
	     */

	  }, {
	    key: '__adjustAppId',
	    value: function __adjustAppId() {
	      if (this.isConnected) throw new Error(LayerError$2.dictionary.cantChangeIfConnected);
	    }

	    /**
	     * __ Methods are automatically called by property setters.
	     *
	     * Any attempt to execute `this.user = userIdentity` will cause an error to be thrown
	     * if the client is already connected.
	     *
	     * @private
	     * @method __adjustUser
	     * @param {string} user - new Identity object
	     */

	  }, {
	    key: '__adjustUser',
	    value: function __adjustUser(user) {
	      if (this.isConnected) {
	        throw new Error(LayerError$2.dictionary.cantChangeIfConnected);
	      }
	    }

	    // Virtual methods

	  }, {
	    key: '_addIdentity',
	    value: function _addIdentity(identity$$1) {}
	  }, {
	    key: '_removeIdentity',
	    value: function _removeIdentity(identity$$1) {}

	    /* ACCESSOR METHODS END */

	    /* COMMUNICATIONS METHODS BEGIN */

	  }, {
	    key: 'sendSocketRequest',
	    value: function sendSocketRequest(data, callback) {
	      var isChangesArray = Boolean(data.isChangesArray);
	      if (this._wantsToBeAuthenticated && !this.isAuthenticated) this._connect();

	      if (data.sync) {
	        var target = data.sync.target;
	        var depends = data.sync.depends;
	        if (target && !depends) depends = [target];

	        this.syncManager.request(new WebsocketSyncEvent({
	          data: data.body,
	          operation: data.method,
	          returnChangesArray: isChangesArray,
	          target: target,
	          depends: depends,
	          callback: callback
	        }));
	      } else {
	        if (typeof data.data === 'function') data.data = data.data();
	        this.socketRequestManager.sendRequest({ data: data, isChangesArray: isChangesArray, callback: callback });
	      }
	    }

	    /**
	     * This event handler receives events from the Online State Manager and generates an event for those subscribed
	     * to client.on('online')
	     *
	     * @method _handleOnlineChange
	     * @private
	     * @param {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_handleOnlineChange',
	    value: function _handleOnlineChange(evt) {
	      if (!this._wantsToBeAuthenticated) return;
	      var duration = evt.offlineDuration;
	      var isOnline = evt.eventName === 'connected';
	      var obj = { isOnline: isOnline };
	      if (isOnline) {
	        obj.reset = duration > ClientAuthenticator.ResetAfterOfflineDuration;

	        // TODO: Use a cached nonce if it hasn't expired
	        if (!this.isAuthenticated) this._connect();
	      }
	      this.trigger('online', obj);
	    }

	    /**
	     * Main entry point for sending xhr requests or for queing them in the syncManager.
	     *
	     * This call adjust arguments for our REST server.
	     *
	     * @method xhr
	     * @protected
	     * @param  {Object}   options
	     * @param  {string}   options.url - URL relative client's url: "/conversations"
	     * @param  {Function} callback
	     * @param  {Object}   callback.result
	     * @param  {Mixed}    callback.result.data - If an error occurred, this is a layer.LayerError;
	     *                                          If the response was application/json, this will be an object
	     *                                          If the response was text/empty, this will be text/empty
	     * @param  {XMLHttpRequest} callback.result.xhr - Native xhr request object for detailed analysis
	     * @param  {Object}         callback.result.Links - Hash of Link headers
	     * @return {layer.ClientAuthenticator} this
	     */

	  }, {
	    key: 'xhr',
	    value: function xhr(options, callback) {
	      if (!options.sync || !options.sync.target) {
	        options.url = this._xhrFixRelativeUrls(options.url || '');
	      }

	      options.withCredentials = true;
	      if (!options.method) options.method = 'GET';
	      if (!options.headers) options.headers = {};
	      this._xhrFixHeaders(options.headers);
	      this._xhrFixAuth(options.headers);

	      // Note: this is not sync vs async; this is syncManager vs fire it now
	      if (options.sync === false) {
	        this._nonsyncXhr(options, callback, 0);
	      } else {
	        this._syncXhr(options, callback);
	      }
	      return this;
	    }

	    /**
	     * For xhr calls that go through the sync manager, queue it up.
	     *
	     * @method _syncXhr
	     * @private
	     * @param  {Object}   options
	     * @param  {Function} callback
	     */

	  }, {
	    key: '_syncXhr',
	    value: function _syncXhr(options, callback) {
	      var _this7 = this;

	      if (!options.sync) options.sync = {};
	      if (this._wantsToBeAuthenticated && !this.isAuthenticated) this._connect();

	      var innerCallback = function innerCallback(result) {
	        _this7._xhrResult(result, callback);
	      };
	      var target = options.sync.target;
	      var depends = options.sync.depends;
	      if (target && !depends) depends = [target];

	      this.syncManager.request(new XHRSyncEvent({
	        url: options.url,
	        data: options.data,
	        telemetry: options.telemetry,
	        method: options.method,
	        operation: options.sync.operation || options.method,
	        headers: options.headers,
	        callback: innerCallback,
	        target: target,
	        depends: depends
	      }));
	    }

	    /**
	     * For xhr calls that don't go through the sync manager,
	     * fire the request, and if it fails, refire it up to 3 tries
	     * before reporting an error.  1 second delay between requests
	     * so whatever issue is occuring is a tiny bit more likely to resolve,
	     * and so we don't hammer the server every time there's a problem.
	     *
	     * @method _nonsyncXhr
	     * @private
	     * @param  {Object}   options
	     * @param  {Function} callback
	     * @param  {number}   retryCount
	     */

	  }, {
	    key: '_nonsyncXhr',
	    value: function _nonsyncXhr(options, callback, retryCount) {
	      var _this8 = this;

	      xhr(options, function (result) {
	        if ([502, 503, 504].indexOf(result.status) !== -1 && retryCount < MAX_XHR_RETRIES) {
	          setTimeout(function () {
	            return _this8._nonsyncXhr(options, callback, retryCount + 1);
	          }, 1000);
	        } else {
	          _this8._xhrResult(result, callback);
	        }
	      });
	    }

	    /**
	     * Fix authentication header for an xhr request
	     *
	     * @method _xhrFixAuth
	     * @private
	     * @param  {Object} headers
	     */

	  }, {
	    key: '_xhrFixAuth',
	    value: function _xhrFixAuth(headers) {
	      if (this.sessionToken && !headers.Authorization) {
	        headers.authorization = 'Layer session-token="' + this.sessionToken + '"'; // eslint-disable-line
	      }
	    }

	    /**
	     * Fix relative URLs to create absolute URLs needed for CORS requests.
	     *
	     * @method _xhrFixRelativeUrls
	     * @private
	     * @param  {string} relative or absolute url
	     * @return {string} absolute url
	     */

	  }, {
	    key: '_xhrFixRelativeUrls',
	    value: function _xhrFixRelativeUrls(url) {
	      var result = url;
	      if (url.indexOf('https://') === -1) {
	        if (url[0] === '/') {
	          result = this.url + url;
	        } else {
	          result = this.url + '/' + url;
	        }
	      }
	      return result;
	    }

	    /**
	     * Fixup all headers in preparation for an xhr call.
	     *
	     * 1. All headers use lower case names for standard/easy lookup
	     * 2. Set the accept header
	     * 3. If needed, set the content-type header
	     *
	     * @method _xhrFixHeaders
	     * @private
	     * @param  {Object} headers
	     */

	  }, {
	    key: '_xhrFixHeaders',
	    value: function _xhrFixHeaders(headers) {
	      // Replace all headers in arbitrary case with all lower case
	      // for easy matching.
	      var headerNameList = Object.keys(headers);
	      headerNameList.forEach(function (headerName) {
	        if (headerName !== headerName.toLowerCase()) {
	          headers[headerName.toLowerCase()] = headers[headerName];
	          delete headers[headerName];
	        }
	      });

	      if (!headers.accept) headers.accept = ACCEPT;

	      if (!headers['content-type']) headers['content-type'] = 'application/json';
	    }

	    /**
	     * Handle the result of an xhr call
	     *
	     * @method _xhrResult
	     * @private
	     * @param  {Object}   result     Standard xhr response object from the xhr lib
	     * @param  {Function} [callback] Callback on completion
	     */

	  }, {
	    key: '_xhrResult',
	    value: function _xhrResult(result, callback) {
	      if (this.isDestroyed) return;

	      if (!result.success) {
	        // Replace the response with a LayerError instance
	        if (result.data && _typeof$4(result.data) === 'object') {
	          this._generateError(result);
	        }

	        // If its an authentication error, reauthenticate
	        // don't call _resetSession as that wipes all data and screws with UIs, and the user
	        // is still authenticated on the customer's app even if not on Layer.
	        if (result.status === 401 && this._wantsToBeAuthenticated) {
	          if (this.isAuthenticated) {
	            logger$2.warn('SESSION EXPIRED!');
	            this.isAuthenticated = false;
	            this.isReady = false;
	            if (commonjsGlobal.localStorage) localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
	            this.trigger('deauthenticated');
	            this._authenticate(result.data.getNonce());
	          } else if (this._lastChallengeTime > Date.now() + ClientAuthenticator.TimeBetweenReauths) {
	            this._authenticate(result.data.getNonce());
	          }
	        }
	      }
	      if (callback) callback(result);
	    }

	    /**
	     * Transforms xhr error response into a layer.LayerError instance.
	     *
	     * Adds additional information to the result object including
	     *
	     * * url
	     * * data
	     *
	     * @method _generateError
	     * @private
	     * @param  {Object} result - Result of the xhr call
	     */

	  }, {
	    key: '_generateError',
	    value: function _generateError(result) {
	      result.data = new LayerError$2(result.data);
	      if (!result.data.httpStatus) result.data.httpStatus = result.status;
	      result.data.log();
	    }

	    /* END COMMUNICATIONS METHODS */

	  }]);

	  return ClientAuthenticator;
	}(Root$2);

	/**
	 * State variable; indicates that client is currently authenticated by the server.
	 * Should never be true if isConnected is false.
	 * @type {Boolean}
	 * @readonly
	 */


	ClientAuthenticator.prototype.isAuthenticated = false;

	/**
	 * State variable; indicates that client is currently connected to server
	 * (may not be authenticated yet)
	 * @type {Boolean}
	 * @readonly
	 */
	ClientAuthenticator.prototype.isConnected = false;

	/**
	 * State variable; indicates that client is ready for the app to use.
	 * Use the 'ready' event to be notified when this value changes to true.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	ClientAuthenticator.prototype.isReady = false;

	/**
	 * State variable; indicates if the WebSDK thinks that the app WANTS to be connected.
	 *
	 * An app wants to be connected if it has called `connect()` or `connectWithSession()`
	 * and has not called `logout()`.  A client that is connected will receive reauthentication
	 * events in the form of `challenge` events.
	 *
	 * @type {boolean}
	 * @readonly
	 */
	ClientAuthenticator.prototype._wantsToBeAuthenticated = false;

	/**
	 * If presence is enabled, then your presence can be set/restored.
	 *
	 * @type {Boolean} [isPresenceEnabled=true]
	 */
	ClientAuthenticator.prototype.isPresenceEnabled = true;

	/**
	 * Your Layer Application ID. Can not be changed once connected.
	 *
	 * To find your Layer Application ID, see your Layer Developer Dashboard.
	 *
	 * @type {String}
	 */
	ClientAuthenticator.prototype.appId = '';

	/**
	 * Identity information about the authenticated user.
	 *
	 * @type {layer.Identity}
	 */
	ClientAuthenticator.prototype.user = null;

	/**
	 * Your current session token that authenticates your requests.
	 *
	 * @type {String}
	 * @readonly
	 */
	ClientAuthenticator.prototype.sessionToken = '';

	/**
	 * Time that the last challenge was issued
	 *
	 * @type {Number}
	 * @private
	 */
	ClientAuthenticator.prototype._lastChallengeTime = 0;

	/**
	 * URL to Layer's Web API server.
	 *
	 * Only muck with this if told to by Layer Staff.
	 * @type {String}
	 */
	ClientAuthenticator.prototype.url = 'https://api.layer.com';

	/**
	 * URL to Layer's Websocket server.
	 *
	 * Only muck with this if told to by Layer Staff.
	 * @type {String}
	 */
	ClientAuthenticator.prototype.websocketUrl = 'wss://websockets.layer.com';

	/**
	 * Web Socket Manager
	 * @type {layer.Websockets.SocketManager}
	 */
	ClientAuthenticator.prototype.socketManager = null;

	/**
	 * Web Socket Request Manager
	 * @type {layer.Websockets.RequestManager}
	 */
	ClientAuthenticator.prototype.socketRequestManager = null;

	/**
	 * Web Socket Manager
	 * @type {layer.Websockets.ChangeManager}
	 */
	ClientAuthenticator.prototype.socketChangeManager = null;

	/**
	 * Service for managing online as well as offline server requests
	 * @type {layer.SyncManager}
	 */
	ClientAuthenticator.prototype.syncManager = null;

	/**
	 * Service for managing online/offline state and events
	 * @type {layer.OnlineStateManager}
	 */
	ClientAuthenticator.prototype.onlineManager = null;

	/**
	 * If this is a trusted device, then we can write personal data to persistent memory.
	 * @type {boolean}
	 */
	ClientAuthenticator.prototype.isTrustedDevice = false;

	/**
	 * To enable indexedDB storage of query data, set this true.  Experimental.
	 *
	 * @property {boolean}
	 */
	ClientAuthenticator.prototype.isPersistenceEnabled = false;

	/**
	 * If this layer.Client.isTrustedDevice is true, then you can control which types of data are persisted.
	 *
	 * Note that values here are ignored if `isPersistenceEnabled` hasn't been set to `true`.
	 *
	 * Properties of this Object can be:
	 *
	 * * identities: Write identities to indexedDB? This allows for faster initialization.
	 * * conversations: Write conversations to indexedDB? This allows for faster rendering
	 *                  of a Conversation List
	 * * messages: Write messages to indexedDB? This allows for full offline access
	 * * syncQueue: Write requests made while offline to indexedDB?  This allows the app
	 *              to complete sending messages after being relaunched.
	 * * sessionToken: Write the session token to localStorage for quick reauthentication on relaunching the app.
	 *
	 *      new layer.Client({
	 *        isTrustedDevice: true,
	 *        persistenceFeatures: {
	 *          conversations: true,
	 *          identities: true,
	 *          messages: false,
	 *          syncQueue: false,
	 *          sessionToken: true
	 *        }
	 *      });
	 *
	 * @type {Object}
	 */
	ClientAuthenticator.prototype.persistenceFeatures = null;

	/**
	 * Database Manager for read/write to IndexedDB
	 * @type {layer.DbManager}
	 */
	ClientAuthenticator.prototype.dbManager = null;

	/**
	 * If a display name is not loaded for the session owner, use this name.
	 *
	 * @type {string}
	 */
	ClientAuthenticator.prototype.defaultOwnerDisplayName = 'You';

	/**
	 * Is true if the client is authenticated and connected to the server;
	 *
	 * Typically used to determine if there is a connection to the server.
	 *
	 * Typically used in conjunction with the `online` event.
	 *
	 * @type {boolean}
	 */
	Object.defineProperty(ClientAuthenticator.prototype, 'isOnline', {
	  enumerable: true,
	  get: function get() {
	    return this.onlineManager && this.onlineManager.isOnline;
	  }
	});

	/**
	 * Log levels; one of:
	 *
	 *    * layer.Constants.LOG.NONE
	 *    * layer.Constants.LOG.ERROR
	 *    * layer.Constants.LOG.WARN
	 *    * layer.Constants.LOG.INFO
	 *    * layer.Constants.LOG.DEBUG
	 *
	 * @type {number}
	 */
	Object.defineProperty(ClientAuthenticator.prototype, 'logLevel', {
	  enumerable: false,
	  get: function get() {
	    return logger$2.level;
	  },
	  set: function set(value) {
	    logger$2.level = value;
	  }
	});

	/**
	 * Short hand for getting the userId of the authenticated user.
	 *
	 * Could also just use client.user.userId
	 *
	 * @type {string} userId
	 */
	Object.defineProperty(ClientAuthenticator.prototype, 'userId', {
	  enumerable: true,
	  get: function get() {
	    return this.user ? this.user.userId : '';
	  },
	  set: function set() {}
	});

	/**
	 * Time to be offline after which we don't do a WebSocket Events.replay,
	 * but instead just refresh all our Query data.  Defaults to 30 hours.
	 *
	 * @type {number}
	 * @static
	 */
	ClientAuthenticator.ResetAfterOfflineDuration = 1000 * 60 * 60 * 30;

	/**
	 * Number of miliseconds delay must pass before a subsequent challenge is issued.
	 *
	 * This value is here to insure apps don't get challenge requests while they are
	 * still processing the last challenge event.
	 *
	 * @property {Number}
	 * @static
	 */
	ClientAuthenticator.TimeBetweenReauths = 30 * 1000;

	/**
	 * List of events supported by this class
	 * @static
	 * @protected
	 * @type {string[]}
	 */
	ClientAuthenticator._supportedEvents = [
	/**
	 * The client is ready for action
	 *
	 *      client.on('ready', function(evt) {
	 *          renderMyUI();
	 *      });
	 *
	 * @event
	 */
	'ready',

	/**
	 * Fired when connected to the server.
	 * Currently just means we have a nonce.
	 * Not recommended for typical applications.
	 * @event connected
	 */
	'connected',

	/**
	 * Fired when unsuccessful in obtaining a nonce.
	 *
	 * Not recommended for typical applications.
	 * @event connected-error
	 * @param {Object} event
	 * @param {layer.LayerError} event.error
	 */
	'connected-error',

	/**
	 * We now have a session and any requests we send aught to work.
	 * Typically you should use the ready event instead of the authenticated event.
	 * @event authenticated
	 */
	'authenticated',

	/**
	 * Failed to authenticate your client.
	 *
	 * Either your identity-token was invalid, or something went wrong
	 * using your identity-token.
	 *
	 * @event authenticated-error
	 * @param {Object} event
	 * @param {layer.LayerError} event.error
	 */
	'authenticated-error',

	/**
	 * This event fires when a session has expired or when `layer.Client.logout` is called.
	 * Typically, it is enough to subscribe to the challenge event
	 * which will let you reauthenticate; typical applications do not need
	 * to subscribe to this.
	 *
	 * @event deauthenticated
	 */
	'deauthenticated',

	/**
	 * @event challenge
	 * Verify the user's identity.
	 *
	 * This event is where you verify that the user is who we all think the user is,
	 * and provide an identity token to validate that.
	 *
	 * ```javascript
	 * client.on('challenge', function(evt) {
	 *    myGetIdentityForNonce(evt.nonce, function(identityToken) {
	 *      evt.callback(identityToken);
	 *    });
	 * });
	 * ```
	 *
	 * @param {Object} event
	 * @param {string} event.nonce - A nonce for you to provide to your identity provider
	 * @param {Function} event.callback - Call this once you have an identity-token
	 * @param {string} event.callback.identityToken - Identity token provided by your identity provider service
	 */
	'challenge',

	/**
	 * @event session-terminated
	 * If your session has been terminated in such a way as to prevent automatic reconnect,
	 *
	 * this event will fire.  Common scenario: user has two tabs open;
	 * one tab the user logs out (or you call client.logout()).
	 * The other tab will detect that the sessionToken has been removed,
	 * and will terminate its session as well.  In this scenario we do not want
	 * to automatically trigger a challenge and restart the login process.
	 */
	'session-terminated',

	/**
	 * @event online
	 *
	 * This event is used to detect when the client is online (connected to the server)
	 * or offline (still able to accept API calls but no longer able to sync to the server).
	 *
	 *      client.on('online', function(evt) {
	 *         if (evt.isOnline) {
	 *             statusDiv.style.backgroundColor = 'green';
	 *         } else {
	 *             statusDiv.style.backgroundColor = 'red';
	 *         }
	 *      });
	 *
	 * @param {Object} event
	 * @param {boolean} event.isOnline
	 */
	'online',

	/**
	 * State change events are used for internal communications.
	 *
	 * Primarily used so that the Telemetry component can monitor and report on
	 * system activity.
	 *
	 * @event
	 * @private
	 */
	'state-change',

	/**
	 * An operation has been received via the websocket.
	 *
	 * Used for custom/complex operations that cannot be handled via `udpate` requests.
	 *
	 * @event
	 * @private
	 */
	'websocket:operation'].concat(Root$2._supportedEvents);

	Root$2.initClass.apply(ClientAuthenticator, [ClientAuthenticator, 'ClientAuthenticator']);

	var clientAuthenticator = ClientAuthenticator;

	var _createClass$24 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$12 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$24(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$19(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$19(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Membership class represents an Membership of a user within a channel.
	 *
	 * Identities are created by the System, never directly by apps.
	 *
	 * @class layer.Membership
	 * @experimental This feature is incomplete, and available as Preview only.
	 * @extends layer.Syncable
	 */

	var Syncable$7 = syncable;
	var Root$18 = root;
	var Constants$8 = _const;
	var LayerError$15 = layerError;

	var Membership$1 = function (_Syncable) {
	  _inherits$19(Membership, _Syncable);

	  function Membership() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck$24(this, Membership);

	    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
	    if (options.fromServer) {
	      options.id = options.fromServer.id;
	    } else if (options.id && !options.userId) {
	      options.userId = options.id.replace(/^.*\//, '');
	    }

	    // Make sure we have an clientId property
	    if (options.client) options.clientId = options.client.appId;
	    if (!options.clientId) throw new Error(LayerError$15.dictionary.clientMissing);

	    var _this = _possibleConstructorReturn$19(this, (Membership.__proto__ || Object.getPrototypeOf(Membership)).call(this, options));

	    _this.isInitializing = true;

	    // If the options contains a full server definition of the object,
	    // copy it in with _populateFromServer; this will add the Membership
	    // to the Client as well.
	    if (options && options.fromServer) {
	      _this._populateFromServer(options.fromServer);
	    }

	    if (!_this.url && _this.id) {
	      _this.url = _this.getClient().url + '/' + _this.id.substring(9);
	    } else if (!_this.url) {
	      _this.url = '';
	    }
	    _this.getClient()._addMembership(_this);

	    _this.isInitializing = false;
	    return _this;
	  }

	  _createClass$24(Membership, [{
	    key: 'destroy',
	    value: function destroy() {
	      var client = this.getClient();
	      if (client) client._removeMembership(this);
	      _get$12(Membership.prototype.__proto__ || Object.getPrototypeOf(Membership.prototype), 'destroy', this).call(this);
	    }
	  }, {
	    key: '_triggerAsync',
	    value: function _triggerAsync(evtName, args) {
	      this._clearObject();
	      _get$12(Membership.prototype.__proto__ || Object.getPrototypeOf(Membership.prototype), '_triggerAsync', this).call(this, evtName, args);
	    }
	  }, {
	    key: 'trigger',
	    value: function trigger(evtName, args) {
	      this._clearObject();
	      _get$12(Membership.prototype.__proto__ || Object.getPrototypeOf(Membership.prototype), 'trigger', this).call(this, evtName, args);
	    }

	    /**
	     * Populates this instance using server-data.
	     *
	     * Side effects add this to the Client.
	     *
	     * @method _populateFromServer
	     * @private
	     * @param  {Object} membership - Server representation of the membership
	     */

	  }, {
	    key: '_populateFromServer',
	    value: function _populateFromServer(membership) {
	      var _this2 = this;

	      var client = this.getClient();

	      // Disable events if creating a new Membership
	      // We still want property change events for anything that DOES change
	      this._disableEvents = this.syncState === Constants$8.SYNC_STATE.NEW;

	      this._setSynced();

	      this.userId = membership.identity ? membership.identity.user_id || '' : client.user.userId;
	      this.channelId = membership.channel.id;

	      // this.role = client._createObject(membership.role);

	      this.identity = membership.identity ? client._createObject(membership.identity) : client.user;
	      this.identity.on('identities:change', function (evt) {
	        _this2.trigger('members:change', {
	          property: 'identity'
	        });
	      }, this);

	      if (!this.url && this.id) {
	        this.url = this.getClient().url + this.id.substring(8);
	      }

	      this._disableEvents = false;
	    }

	    /**
	     * Update the property; trigger a change event, IF the value has changed.
	     *
	     * @method _updateValue
	     * @private
	     * @param {string} key - Property name
	     * @param {Mixed} value - Property value
	     */

	  }, {
	    key: '_updateValue',
	    value: function _updateValue(key, value) {
	      if (value === null || value === undefined) value = '';
	      if (this[key] !== value) {
	        if (!this.isInitializing) {
	          this._triggerAsync('members:change', {
	            property: key,
	            oldValue: this[key],
	            newValue: value
	          });
	        }
	        this[key] = value;
	      }
	    }
	  }, {
	    key: '__getUserId',
	    value: function __getUserId() {
	      return this.identity ? this.identity.userId : '';
	    }
	  }, {
	    key: '__updateIdentity',
	    value: function __updateIdentity(newIdentity, oldIdentity) {
	      if (oldIdentity) oldIdentity.off(null, null, this);
	    }

	    /**
	     * Create a new Membership based on a Server description of the user.
	     *
	     * @method _createFromServer
	     * @static
	     * @param {Object} membership - Server Membership Object
	     * @param {layer.Client} client
	     * @returns {layer.Membership}
	     */

	  }], [{
	    key: '_createFromServer',
	    value: function _createFromServer(membership, client) {
	      return new Membership({
	        client: client,
	        fromServer: membership,
	        _fromDB: membership._fromDB
	      });
	    }
	  }]);

	  return Membership;
	}(Syncable$7);

	/**
	 * User ID that the Membership describes.
	 *
	 * @type {string}
	 */


	Membership$1.prototype.userId = '';

	/**
	 * Channel ID that the membership describes.
	 *
	 * @type {string}
	 */
	Membership$1.prototype.channelId = '';

	/**
	 * The user's role within the channel
	 *
	 * @ignore
	 * @type {layer.Role}
	 */
	Membership$1.prototype.role = null;

	/**
	 * Identity associated with the membership
	 *
	 * @type {layer.Identity}
	 */
	Membership$1.prototype.identity = '';

	Membership$1.inObjectIgnore = Root$18.inObjectIgnore;

	Membership$1.bubbleEventParent = 'getClient';

	Membership$1._supportedEvents = ['members:change', 'members:loaded', 'members:loaded-error'].concat(Syncable$7._supportedEvents);

	Membership$1.eventPrefix = 'members';
	Membership$1.prefixUUID = '/members/';

	Root$18.initClass.apply(Membership$1, [Membership$1, 'Membership']);
	Syncable$7.subclasses.push(Membership$1);

	var membership = Membership$1;

	/**
	 * Static properties here only needed if your directly using
	 * the layer.TypingIndicators.TypingPublisher (not needed if
	 * you are using the layer.TypingIndicators.TypingListener).
	 *
	 *      typingPublisher.setState(layer.TypingIndicators.STARTED);
	 *
	 * @class  layer.TypingIndicators
	 * @static
	 */
	var typingIndicators = {
	  /**
	   * Typing has started/resumed
	   * @type {String}
	   * @static
	   */
	  STARTED: 'started',

	  /**
	   * Typing has paused
	   * @type {String}
	   * @static
	   */
	  PAUSED: 'paused',

	  /**
	   * Typing has finished
	   * @type {String}
	   * @static
	   */
	  FINISHED: 'finished'
	};

	var _createClass$25 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _toConsumableArray$1(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck$25(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$20(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$20(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The TypingIndicatorListener receives Typing Indicator state
	 * for other users via a websocket, and notifies
	 * the client of the updated state.  Typical applications
	 * do not access this component directly, but DO subscribe
	 * to events produced by this component:
	 *
	 *      client.on('typing-indicator-change', function(evt) {
	 *        if (evt.conversationId == conversationICareAbout) {
	 *          console.log('The following users are typing: ' + evt.typing.join(', '));
	 *          console.log('The following users are paused: ' + evt.paused.join(', '));
	 *        }
	 *      });
	 *
	 * @class layer.TypingIndicators.TypingIndicatorListener
	 * @extends {layer.Root}
	 */

	var Root$19 = root;
	var ClientRegistry$5 = clientRegistry;

	var _require$7 = typingIndicators;
	var STARTED = _require$7.STARTED;
	var PAUSED = _require$7.PAUSED;
	var FINISHED = _require$7.FINISHED;

	var TypingIndicatorListener$1 = function (_Root) {
	  _inherits$20(TypingIndicatorListener, _Root);

	  /**
	   * Creates a Typing Indicator Listener for this Client.
	   *
	   * @method constructor
	   * @protected
	   * @param  {Object} args
	   * @param {string} args.clientId - ID of the client this belongs to
	   */
	  function TypingIndicatorListener(args) {
	    _classCallCheck$25(this, TypingIndicatorListener);

	    /**
	     * Stores the state of all Conversations, indicating who is typing and who is paused.
	     *
	     * People who are stopped are removed from this state.
	     * @property {Object} state
	     */
	    var _this = _possibleConstructorReturn$20(this, (TypingIndicatorListener.__proto__ || Object.getPrototypeOf(TypingIndicatorListener)).call(this, args));

	    _this.state = {};
	    _this._pollId = 0;
	    var client = _this._getClient();
	    client.on('ready', function () {
	      return _this._clientReady();
	    });
	    return _this;
	  }

	  /**
	   * Called when the client is ready
	   *
	   * @method _clientReady
	   * @private
	   */


	  _createClass$25(TypingIndicatorListener, [{
	    key: '_clientReady',
	    value: function _clientReady() {
	      var client = this._getClient();
	      this.user = client.user;
	      var ws = client.socketManager;
	      ws.on('message', this._handleSocketEvent, this);
	      this._startPolling();
	    }

	    /**
	     * Determines if this event is relevant to report on.
	     * Must be a typing indicator signal that is reporting on
	     * someone other than this user.
	     *
	     * @method _isRelevantEvent
	     * @private
	     * @param  {Object}  Websocket event data
	     * @return {Boolean}
	     */

	  }, {
	    key: '_isRelevantEvent',
	    value: function _isRelevantEvent(evt) {
	      return evt.type === 'signal' && evt.body.type === 'typing_indicator' && evt.body.data.sender.id !== this.user.id;
	    }

	    /**
	     * This method receives websocket events and
	     * if they are typing indicator events, updates its state.
	     *
	     * @method _handleSocketEvent
	     * @private
	     * @param {layer.LayerEvent} evtIn - All websocket events
	     */

	  }, {
	    key: '_handleSocketEvent',
	    value: function _handleSocketEvent(evtIn) {
	      var evt = evtIn.data;

	      if (this._isRelevantEvent(evt)) {
	        // Could just do _createObject() but for ephemeral events, going through _createObject and updating
	        // objects for every typing indicator seems a bit much.  Try getIdentity and only create if needed.
	        var identity = this._getClient().getIdentity(evt.body.data.sender.id) || this._getClient()._createObject(evt.body.data.sender);
	        var state = evt.body.data.action;
	        var conversationId = evt.body.object.id;
	        var stateEntry = this.state[conversationId];
	        if (!stateEntry) {
	          stateEntry = this.state[conversationId] = {
	            users: {},
	            typing: [],
	            paused: []
	          };
	        }
	        stateEntry.users[identity.id] = {
	          startTime: Date.now(),
	          state: state,
	          identity: identity
	        };
	        if (stateEntry.users[identity.id].state === FINISHED) {
	          delete stateEntry.users[identity.id];
	        }

	        this._updateState(stateEntry, state, identity.id);

	        this.trigger('typing-indicator-change', {
	          conversationId: conversationId,
	          typing: stateEntry.typing.map(function (id) {
	            return stateEntry.users[id].identity.toObject();
	          }),
	          paused: stateEntry.paused.map(function (id) {
	            return stateEntry.users[id].identity.toObject();
	          })
	        });
	      }
	    }

	    /**
	     * Get the current typing indicator state of a specified Conversation.
	     *
	     * Typically used to see if anyone is currently typing when first opening a Conversation.
	     * Typically accessed via `client.getTypingState(conversationId)`
	     *
	     * @method getState
	     * @param {String} conversationId
	     */

	  }, {
	    key: 'getState',
	    value: function getState(conversationId) {
	      var stateEntry = this.state[conversationId];
	      if (stateEntry) {
	        return {
	          typing: stateEntry.typing.map(function (id) {
	            return stateEntry.users[id].identity.toObject();
	          }),
	          paused: stateEntry.paused.map(function (id) {
	            return stateEntry.users[id].identity.toObject();
	          })
	        };
	      } else {
	        return {
	          typing: [],
	          paused: []
	        };
	      }
	    }

	    /**
	     * Updates the state of a single stateEntry; a stateEntry
	     * represents a single Conversation's typing indicator data.
	     *
	     * Updates typing and paused arrays following immutable strategies
	     * in hope that this will help Flex based architectures.
	     *
	     * @method _updateState
	     * @private
	     * @param  {Object} stateEntry - A Conversation's typing indicator state
	     * @param  {string} newState   - started, paused or finished
	     * @param  {string} identityId     - ID of the user whose state has changed
	     */

	  }, {
	    key: '_updateState',
	    value: function _updateState(stateEntry, newState, identityId) {
	      var typingIndex = stateEntry.typing.indexOf(identityId);
	      if (newState !== STARTED && typingIndex !== -1) {
	        stateEntry.typing = [].concat(_toConsumableArray$1(stateEntry.typing.slice(0, typingIndex)), _toConsumableArray$1(stateEntry.typing.slice(typingIndex + 1)));
	      }
	      var pausedIndex = stateEntry.paused.indexOf(identityId);
	      if (newState !== PAUSED && pausedIndex !== -1) {
	        stateEntry.paused = [].concat(_toConsumableArray$1(stateEntry.paused.slice(0, pausedIndex)), _toConsumableArray$1(stateEntry.paused.slice(pausedIndex + 1)));
	      }

	      if (newState === STARTED && typingIndex === -1) {
	        stateEntry.typing = [].concat(_toConsumableArray$1(stateEntry.typing), [identityId]);
	      } else if (newState === PAUSED && pausedIndex === -1) {
	        stateEntry.paused = [].concat(_toConsumableArray$1(stateEntry.paused), [identityId]);
	      }
	    }

	    /**
	     * Any time a state change becomes more than 6 seconds stale,
	     * assume that the user is 'finished'.
	     *
	     * In theory, we should
	     * receive a new event every 2.5 seconds.  If the current user
	     * has gone offline, lack of this code would cause the people
	     * currently flagged as typing as still typing hours from now.
	     *
	     * For this first pass, we just mark the user as 'finished'
	     * but a future pass may move from 'started' to 'paused'
	     * and 'paused to 'finished'
	     *
	     * @method _startPolling
	     * @private
	     */

	  }, {
	    key: '_startPolling',
	    value: function _startPolling() {
	      var _this2 = this;

	      if (this._pollId) return;
	      this._pollId = setInterval(function () {
	        return _this2._poll();
	      }, 5000);
	    }
	  }, {
	    key: '_poll',
	    value: function _poll() {
	      var _this3 = this;

	      var conversationIds = Object.keys(this.state);

	      conversationIds.forEach(function (id) {
	        var state = _this3.state[id];
	        Object.keys(state.users).forEach(function (identityId) {
	          if (Date.now() >= state.users[identityId].startTime + 6000) {
	            _this3._updateState(state, FINISHED, identityId);
	            delete state.users[identityId];
	            _this3.trigger('typing-indicator-change', {
	              conversationId: id,
	              typing: state.typing.map(function (aIdentityId) {
	                return state.users[aIdentityId].identity.toObject();
	              }),
	              paused: state.paused.map(function (aIdentityId) {
	                return state.users[aIdentityId].identity.toObject();
	              })
	            });
	          }
	        });
	      });
	    }

	    /**
	     * Get the Client associated with this class.  Uses the clientId
	     * property.
	     *
	     * @method _getClient
	     * @protected
	     * @return {layer.Client}
	     */

	  }, {
	    key: '_getClient',
	    value: function _getClient() {
	      return ClientRegistry$5.get(this.clientId);
	    }
	  }]);

	  return TypingIndicatorListener;
	}(Root$19);

	/**
	 * setTimeout ID for polling for states to transition
	 * @type {Number}
	 * @private
	 */


	TypingIndicatorListener$1.prototype._pollId = 0;

	/**
	 * ID of the client this instance is associated with
	 * @type {String}
	 */
	TypingIndicatorListener$1.prototype.clientId = '';

	TypingIndicatorListener$1.bubbleEventParent = '_getClient';

	TypingIndicatorListener$1._supportedEvents = [
	/**
	 * There has been a change in typing indicator state of other users.
	 * @event change
	 * @param {layer.LayerEvent} evt
	 * @param {layer.Identity[]} evt.typing - Array of Identities of people who are typing
	 * @param {layer.Identity[]} evt.paused - Array of Identities of people who are paused
	 * @param {string} evt.conversationId - ID of the Conversation that has changed typing indicator state
	 */
	'typing-indicator-change'].concat(Root$19._supportedEvents);

	Root$19.initClass.apply(TypingIndicatorListener$1, [TypingIndicatorListener$1, 'TypingIndicatorListener']);
	var typingIndicatorListener = TypingIndicatorListener$1;

	var _createClass$27 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$27(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * The TypingPublisher's job is:
	 *
	 *  1. Send state changes to the server
	 *  2. Insure that the server is not flooded with repeated state changes of the same value
	 *  3. Automatically transition states when no new states or old states are requested.
	 *
	 * Who is the Typing Publisher for?  Its used by the layer.TypingIndicators.TypingListener; if your using
	 * the TypingListener, you don't need this.  If you want to provide your own logic for when to send typing
	 * states, then you need the TypingPublisher.
	 *
	 * Create an instance using:
	 *
	 *        var publisher = client.createTypingPublisher();
	 *
	 * To tell the Publisher which Conversation its reporting activity on, use:
	 *
	 *        publisher.setConversation(mySelectedConversation);
	 *
	 * To then use the instance:
	 *
	 *        publisher.setState(layer.TypingIndicators.STARTED);
	 *        publisher.setState(layer.TypingIndicators.PAUSED);
	 *        publisher.setState(layer.TypingIndicators.FINISHED);
	 *
	 * Note that the `STARTED` state only lasts for 2.5 seconds, so you
	 * must repeatedly call setState for as long as this state should continue.
	 * This is typically done by simply calling `setState(STARTED)` every time a user hits
	 * a key.
	 *
	 * A few rules for how the *publisher* works internally:
	 *
	 *  - it maintains an indicator state for the current conversation
	 *  - if app calls  `setState(layer.TypingIndicators.STARTED);` publisher sends the event immediately
	 *  - if app calls the same method under _2.5 seconds_ with the same typing indicator state (`started`), publisher waits
	 *    for those 2.5 seconds to pass and then publishes the ephemeral event
	 *  - if app calls the same methods multiple times within _2.5 seconds_ with the same value,
	 *    publisher waits until end of 2.5 second period and sends the state only once.
	 *  - if app calls the same method under _2.5 seconds_ with a different typing indicator state (say `paused`),
	 *    publisher immediately sends the event
	 *  - if 2.5 seconds passes without any events, state transitions from 'started' to 'paused'
	 *  - if 2.5 seconds passes without any events, state transitions from 'paused' to 'finished'
	 *
	 * @class layer.TypingIndicators.TypingPublisher
	 * @protected
	 */

	var INTERVAL = 2500;

	var _require$9 = typingIndicators;
	var STARTED$2 = _require$9.STARTED;
	var PAUSED$2 = _require$9.PAUSED;
	var FINISHED$2 = _require$9.FINISHED;

	var ClientRegistry$6 = clientRegistry;

	var TypingPublisher$2 = function () {

	  /**
	   * Create a Typing Publisher.  See layer.Client.createTypingPublisher.
	   *
	   * The TypingPublisher needs
	   * to know what Conversation its publishing changes for...
	   * but it does not require that parameter during initialization.
	   *
	   * @method constructor
	   * @param {Object} args
	   * @param {string} clientId - The ID for the client from which we will get access to the websocket
	   * @param {Object} [conversation=null] - The Conversation Object or Instance that messages are being typed to.
	   */
	  function TypingPublisher(args) {
	    _classCallCheck$27(this, TypingPublisher);

	    this.clientId = args.clientId;
	    if (args.conversation) this.conversation = this._getClient().getObject(args.conversation.id);
	    this.state = FINISHED$2;
	    this._lastMessageTime = 0;
	  }

	  /**
	   * Set which Conversation we are reporting on state changes for.
	   *
	   * If this instance managed a previous Conversation,
	   * its state is immediately transitioned to "finished".
	   *
	   * @method setConversation
	   * @param  {Object} conv - Conversation Object or Instance
	   */


	  _createClass$27(TypingPublisher, [{
	    key: 'setConversation',
	    value: function setConversation(conv) {
	      this.setState(FINISHED$2);
	      this.conversation = conv ? this._getClient().getObject(conv.id) : null;
	      this.state = FINISHED$2;
	    }

	    /**
	     * Sets the state and either sends the state to the server or schedules it to be sent.
	     *
	     * @method setState
	     * @param  {string} state - One of
	     * * layer.TypingIndicators.STARTED
	     * * layer.TypingIndicators.PAUSED
	     * * layer.TypingIndicators.FINISHED
	     */

	  }, {
	    key: 'setState',
	    value: function setState(state) {
	      // We have a fresh state; whatever our pauseLoop was doing
	      // can be canceled... and restarted later.
	      if (this._pauseLoopId) {
	        clearInterval(this._pauseLoopId);
	        this._pauseLoopId = 0;
	      }
	      if (!this.conversation) return;

	      // If its a new state, send it immediately.
	      if (this.state !== state) {
	        this.state = state;
	        this._send(state);
	      }

	      // No need to resend 'finished' state
	      else if (state === FINISHED$2) {
	          return;
	        }

	        // If its an existing state that hasn't been sent in the
	        // last 2.5 seconds, send it immediately.
	        else if (Date.now() > this._lastMessageTime + INTERVAL) {
	            this._send(state);
	          }

	          // Else schedule it to be sent.
	          else {
	              this._scheduleNextMessage(state);
	            }

	      // Start test to automatically transition if 2.5 seconds without any setState calls
	      if (this.state !== FINISHED$2) this._startPauseLoop();
	    }

	    /**
	     * Start loop to automatically change to next state.
	     *
	     * Any time we are set to 'started' or 'paused' we should transition
	     * to the next state after 2.5 seconds of no setState calls.
	     *
	     * The 2.5 second setTimeout is canceled/restarted every call to setState()
	     *
	     * @method _startPauseLoop
	     * @private
	     */

	  }, {
	    key: '_startPauseLoop',
	    value: function _startPauseLoop() {
	      var _this = this;

	      if (this._pauseLoopId) return;

	      // Note that this interval is canceled every call to setState.
	      this._pauseLoopId = window.setInterval(function () {
	        if (_this.state === PAUSED$2) {
	          _this.setState(FINISHED$2);
	        } else if (_this.state === STARTED$2) {
	          _this.setState(PAUSED$2);
	        }
	      }, INTERVAL);
	    }

	    /**
	     * Schedule the next state refresh message.
	     *
	     * It should be at least INTERVAL ms after
	     * the last state message of the same state
	     *
	     * @method _scheduleNextMessage
	     * @private
	     * @param  {string} state - One of
	     * * layer.TypingIndicators.STARTED
	     * * layer.TypingIndicators.PAUSED
	     * * layer.TypingIndicators.FINISHED
	     */

	  }, {
	    key: '_scheduleNextMessage',
	    value: function _scheduleNextMessage(state) {
	      var _this2 = this;

	      if (this._scheduleId) clearTimeout(this._scheduleId);
	      var delay = INTERVAL - Math.min(Date.now() - this._lastMessageTime, INTERVAL);
	      this._scheduleId = setTimeout(function () {
	        _this2._scheduleId = 0;
	        // If the state didn't change while waiting...
	        if (_this2.state === state) _this2._send(state);
	      }, delay);
	    }

	    /**
	     * Send a state change to the server.
	     *
	     * @method send
	     * @private
	     * @param  {string} state - One of
	     * * layer.TypingIndicators.STARTED
	     * * layer.TypingIndicators.PAUSED
	     * * layer.TypingIndicators.FINISHED
	     */

	  }, {
	    key: '_send',
	    value: function _send(state) {
	      if (!this.conversation.isSaved()) return;
	      this._lastMessageTime = Date.now();
	      var ws = this._getClient().socketManager;
	      ws.sendSignal({
	        type: 'typing_indicator',
	        object: {
	          id: this.conversation.id
	        },
	        data: {
	          action: state
	        }
	      });
	    }

	    /**
	     * Get the Client associated with this layer.Message.
	     *
	     * Uses the clientId property.
	     *
	     * @method getClient
	     * @return {layer.Client}
	     */

	  }, {
	    key: '_getClient',
	    value: function _getClient() {
	      return ClientRegistry$6.get(this.clientId);
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      delete this.conversation;
	      this.isDestroyed = true;
	      clearTimeout(this._scheduleId);
	      clearInterval(this._pauseLoopId);
	    }
	  }]);

	  return TypingPublisher;
	}();

	var typingPublisher = TypingPublisher$2;

	var _createClass$26 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$26(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var TypingPublisher$1 = typingPublisher;

	var _require$8 = typingIndicators;
	var STARTED$1 = _require$8.STARTED;
	var FINISHED$1 = _require$8.FINISHED;

	/**
	 * The Typing Listener Class listens to keyboard events on
	 * your text field, and uses the layer.TypingPublisher to
	 * send state based on keyboard behavior.
	 *
	 *      var typingListener = client.createTypingListener(document.getElementById('mytextarea'));
	 *
	 *  You change what Conversation
	 *  the typing indicator reports your user to be typing
	 *  in by calling:
	 *
	 *      typingListener.setConversation(mySelectedConversation);
	 *
	 * There are two ways of cleaning up all pointers to your input so it can be garbage collected:
	 *
	 * 1. Destroy the listener:
	 *
	 *        typingListener.destroy();
	 *
	 * 2. Remove or replace the input:
	 *
	 *        typingListener.setInput(null);
	 *        typingListener.setInput(newInput);
	 *
	 * @class  layer.TypingIndicators.TypingListener
	 */


	var TypingListener$1 = function () {

	  /**
	   * Create a TypingListener that listens for the user's typing.
	   *
	   * The TypingListener needs
	   * to know what Conversation the user is typing into... but it does not require that parameter during initialization.
	   *
	   * @method constructor
	   * @param  {Object} args
	   * @param {string} args.clientId - The ID of the client; used so that the TypingPublisher can access its websocket manager*
	   * @param {HTMLElement} [args.input=null] - A Text editor dom node that will have typing indicators
	   * @param {Object} [args.conversation=null] - The Conversation Object or Instance that the input will send messages to
	   */
	  function TypingListener(args) {
	    _classCallCheck$26(this, TypingListener);

	    this.clientId = args.clientId;
	    this.conversation = args.conversation;
	    this.publisher = new TypingPublisher$1({
	      clientId: this.clientId,
	      conversation: this.conversation
	    });

	    this.intervalId = 0;
	    this.lastKeyId = 0;

	    this._handleKeyPress = this._handleKeyPress.bind(this);
	    this._handleKeyDown = this._handleKeyDown.bind(this);
	    this.setInput(args.input);
	  }

	  _createClass$26(TypingListener, [{
	    key: 'destroy',
	    value: function destroy() {
	      this._removeInput(this.input);
	      this.publisher.destroy();
	    }

	    /**
	     * Change the input being tracked by your TypingListener.
	     *
	     * If you are removing your input from the DOM, you can simply call
	     *
	     *     typingListener.setInput(null);
	     *
	     * And all event handlers will be removed, allowing for garbage collection
	     * to cleanup your input.
	     *
	     * You can also call setInput with a newly created input:
	     *
	     *     var input = document.createElement('input');
	     *     typingListener.setInput(input);
	     *
	     * @method setInput
	     * @param {HTMLElement} input - Textarea or text input
	     */

	  }, {
	    key: 'setInput',
	    value: function setInput(input) {
	      if (input !== this.input) {
	        this._removeInput(this.input);
	        this.input = input;

	        // Use keypress rather than keydown because the user hitting alt-tab to change
	        // windows, and other meta keys should not result in typing indicators
	        this.input.addEventListener('keypress', this._handleKeyPress);
	        this.input.addEventListener('keydown', this._handleKeyDown);
	      }
	    }

	    /**
	     * Cleanup and remove all links and callbacks keeping input from being garbage collected.
	     *
	     * @method _removeInput
	     * @private
	     * @param {HTMLElement} input - Textarea or text input
	     */

	  }, {
	    key: '_removeInput',
	    value: function _removeInput(input) {
	      if (input) {
	        input.removeEventListener('keypress', this._handleKeyPress);
	        input.removeEventListener('keydown', this._handleKeyDown);
	        this.input = null;
	      }
	    }

	    /**
	     * Change the Conversation; this should set the state of the old Conversation to "finished".
	     *
	     * Use this when the user has changed Conversations and you want to report on typing to a new
	     * Conversation.
	     *
	     * @method setConversation
	     * @param  {Object} conv - The new Conversation Object or Instance
	     */

	  }, {
	    key: 'setConversation',
	    value: function setConversation(conv) {
	      if (conv !== this.conversation) {
	        this.conversation = conv;
	        this.publisher.setConversation(conv);
	      }
	    }

	    /**
	     * Whenever the key is pressed, send a "started" or "finished" event.
	     *
	     * @method _handleKeyPress
	     * @private
	     * @param  {KeyboardEvent} evt
	     */

	  }, {
	    key: '_handleKeyPress',
	    value: function _handleKeyPress(evt) {
	      var _this = this;

	      if (this.lastKeyId) window.clearTimeout(this.lastKeyId);
	      this.lastKeyId = window.setTimeout(function () {
	        _this.lastKeyId = 0;
	        var isEmpty = !_this.input.value;
	        _this.send(isEmpty ? FINISHED$1 : STARTED$1);
	      }, 50);
	    }

	    /**
	     * Handles keyboard keys not reported by on by keypress events.
	     *
	     * These keys can be detected with keyDown event handlers. The ones
	     * currently handled here are backspace, delete and enter.
	     * We may add more later.
	     *
	     * @method _handleKeyDown
	     * @private
	     * @param  {KeyboardEvent} evt
	     */

	  }, {
	    key: '_handleKeyDown',
	    value: function _handleKeyDown(evt) {
	      if ([8, 46, 13].indexOf(evt.keyCode) !== -1) this._handleKeyPress();
	    }

	    /**
	     * Send the state to the publisher.
	     *
	     * If your application requires
	     * you to directly control the state, you can call this method;
	     * however, as long as you use this TypingListener, keyboard
	     * events will overwrite any state changes you send.
	     *
	     * Common use case for this: After a message is sent, you want to clear any typing indicators:
	     *
	     *      function send() {
	     *        message.send();
	     *        typingIndicators.send(layer.TypingIndicators.FINISHED);
	     *      }
	     *
	     * @method send
	     * @param  {string} state - One of "started", "paused", "finished"
	     */

	  }, {
	    key: 'send',
	    value: function send(state) {
	      this.publisher.setState(state);
	    }
	  }]);

	  return TypingListener;
	}();

	var typingListener = TypingListener$1;

	var _typeof$7 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$28 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$28(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$21(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$21(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Metrics gathering component.
	 *
	 * 1. Should never broadcast any personally identifiable information
	 * 2. Should never broadcast any values actually sent/received by users
	 * 3. It can send how long any type of operation took to perform
	 * 4. It can send how many times an operation was performed
	 *
	 * This is currently setup to run once per hour, sending hourly updates to the server.
	 *
	 * @class layer.TelemetryMonitor
	 * @extends layer.Root
	 * @private
	 */

	var Root$20 = root;
	var Xhr = xhr$1;
	var Util$9 = clientUtils;

	var TelemetryMonitor$1 = function (_Root) {
	  _inherits$21(TelemetryMonitor, _Root);

	  /**
	   * Creates a new Monitor.
	   *
	   * An Application is expected to only have one Monitor.
	   *
	   * @method constructor
	   * @param {Object} options
	   * @param {layer.Client} options.client
	   * @param {Boolean} [options.enabled=true]   Set to false to disable telemetry reporting
	   * @param {Number} [options.reportingInterval=1000 * 3600]   Defaults to 1 hour, but can be set to other intervals
	   */
	  function TelemetryMonitor(options) {
	    _classCallCheck$28(this, TelemetryMonitor);

	    var _this = _possibleConstructorReturn$21(this, (TelemetryMonitor.__proto__ || Object.getPrototypeOf(TelemetryMonitor)).call(this, options));

	    _this.client = options.client;
	    _this.state = {
	      id: _this.id,
	      records: []
	    };
	    _this.tempState = {};
	    _this.storageKey = 'layer-telemetry-' + _this.client.appId;

	    if (!commonjsGlobal.localStorage) {
	      _this.enabled = false;
	    } else {
	      try {
	        var oldState = localStorage[_this.storageKey];
	        if (!oldState) {
	          localStorage.setItem(_this.storageKey, JSON.stringify(_this.state));
	        } else {
	          _this.state = JSON.parse(oldState);
	        }
	      } catch (e) {
	        _this.enabled = false;
	      }
	    }

	    _this.client.on('state-change', _this.trackEvent, _this);
	    Xhr.addConnectionListener(_this.trackRestPerformance.bind(_this));
	    _this.setupReportingInterval();
	    return _this;
	  }

	  /**
	   * Given a `telemetryId` and an optional `id`, and a `started` or `ended` key,
	   * track performance of the given telemetry statistic.
	   *
	   * @method
	   */


	  _createClass$28(TelemetryMonitor, [{
	    key: 'trackEvent',
	    value: function trackEvent(evt) {
	      if (!this.enabled) return;
	      var eventId = evt.telemetryId + '-' + (evt.id || 'noid');

	      if (evt.started) {
	        this.tempState[eventId] = Date.now();
	      } else if (evt.ended) {
	        var started = this.tempState[eventId];
	        if (started) {
	          delete this.tempState[eventId];
	          var duration = Date.now() - started;
	          this.writePerformance(evt.telemetryId, duration);
	        }
	      }
	    }

	    /**
	     * Clear out any requests that were never completed.
	     *
	     * Currently we only track an id and a start time, so we don't know much about these events.
	     *
	     * @method clearEvents
	     */

	  }, {
	    key: 'clearEvents',
	    value: function clearEvents() {
	      var _this2 = this;

	      var now = Date.now();
	      Object.keys(this.tempState).forEach(function (key) {
	        if (_this2.tempState[key] + _this2.reportingInterval < now) delete _this2.tempState[key];
	      });
	    }

	    /**
	     * Any xhr request that was called with a `telemetry` key contains metrics to be logged.
	     *
	     * The `telemetry` object should contain `name` and `duration` keys
	     *
	     * @method
	     */

	  }, {
	    key: 'trackRestPerformance',
	    value: function trackRestPerformance(evt) {
	      if (this.enabled && evt.request.telemetry) {
	        this.writePerformance(evt.request.telemetry.name, evt.duration);
	      }
	    }

	    /**
	     * When writing performance, there are three inputs used:
	     *
	     * 1. The name of the metric being tracked
	     * 2. The duration it took for the operation
	     * 3. The current time (this is not a function input, but is still a dependency)
	     *
	     * Results of writing performance are to increment count, and total time for the operation.
	     *
	     * @method
	     */

	  }, {
	    key: 'writePerformance',
	    value: function writePerformance(name, timing) {
	      var performance = this.getCurrentStateObject().performance;
	      if (!performance[name]) {
	        performance[name] = {
	          count: 0,
	          time: 0,
	          max: 0
	        };
	      }
	      performance[name].count++;
	      performance[name].time += timing;
	      if (timing > performance[name].max) performance[name].max = timing;
	      this.writeState();
	    }

	    /**
	     * When writing usage, we are simply incrementing the usage counter for the metric.
	     *
	     * @method
	     */

	  }, {
	    key: 'writeUsage',
	    value: function writeUsage(name) {
	      var usage = this.getCurrentStateObject().usage;
	      if (!usage[name]) usage[name] = 0;
	      usage[name]++;
	      this.writeState();
	    }

	    /**
	     * Grab some environmental data to attach to the report.
	     *
	     * note that environmental data may change from hour to hour,
	     * so we regather this information for each record we send to the server.
	     *
	     * @method
	     */

	  }, {
	    key: 'getEnvironment',
	    value: function getEnvironment() {
	      var environment = {
	        platform: 'web',
	        locale: (navigator.language || '').replace(/-/g, '_'), // should match the en_us format that mobile devices are using rather than the much nicer en-us
	        layer_sdk_version: this.client.constructor.version,
	        domain: location.hostname
	      };

	      // This event allows other libraries to add information to the environment object; specifically: Layer UI
	      this.trigger('telemetry-environment', {
	        environment: environment
	      });
	      return environment;
	    }

	    /**
	     * Grab some device data to attach to the report.
	     *
	     * note that device data may change from hour to hour,
	     * so we regather this information for each record we send to the server.
	     *
	     * @method
	     */

	  }, {
	    key: 'getDevice',
	    value: function getDevice() {
	      return {
	        user_agent: navigator.userAgent,
	        screen: {
	          width: (typeof screen === 'undefined' ? 'undefined' : _typeof$7(screen)) === undefined ? 0 : screen.width,
	          height: (typeof screen === 'undefined' ? 'undefined' : _typeof$7(screen)) === undefined ? 0 : screen.height
	        },
	        window: {
	          width: window.innerWidth,
	          height: window.innerHeight
	        }
	      };
	    }

	    /**
	     * Return the state object used to track performance for the current time slot
	     *
	     * @method
	     */

	  }, {
	    key: 'getCurrentStateObject',
	    value: function getCurrentStateObject(doNotCreate) {
	      var today = new Date();
	      today.setUTCHours(0, 0, 0, 0);
	      var currentDate = new Date(today);

	      var now = Date.now();

	      // If the reporting interval is less than 24 hours, iterate until we find the current time slice within our day
	      if (this.reportingInterval < 60 * 60 * 1000 * 24) {
	        while (currentDate.getTime() < now) {
	          currentDate.setMilliseconds(currentDate.getMilliseconds() + this.reportingInterval);
	        }
	      }

	      var currentStart = currentDate.toISOString();
	      var currentEndDate = new Date(currentDate);
	      currentEndDate.setMilliseconds(currentEndDate.getMilliseconds() + this.reportingInterval);
	      var todayObj = this.state.records.filter(function (set) {
	        return set.period.start === currentStart;
	      })[0];

	      if (!todayObj && !doNotCreate) {
	        todayObj = {
	          period: {
	            start: currentStart,
	            end: currentEndDate.toISOString()
	          },
	          environment: this.getEnvironment(),
	          device: this.getDevice(),
	          usage: {},
	          performance: {},
	          errors: {}
	        };
	        this.state.records.push(todayObj);
	      }

	      return todayObj;
	    }

	    /**
	     * Write state to localStorage.
	     *
	     * Writing the state is an expensive operation that should be done less often,
	     * and containing more changes rather than done immediatley and repeated with each change.
	     *
	     * @method
	     */

	  }, {
	    key: 'writeState',
	    value: function writeState() {
	      var _this3 = this;

	      if (this.enabled && !this._writeTimeoutId) {
	        this._writeTimeoutId = setTimeout(function () {
	          localStorage.setItem(_this3.storageKey, JSON.stringify(_this3.state));
	          _this3._writeTimeoutId = 0;
	        }, 1000);
	      }
	    }

	    /**
	     * Given a time slot's data, convert its data to what the server expects.
	     *
	     * @method
	     */

	  }, {
	    key: 'convertRecord',
	    value: function convertRecord(record) {
	      var result = {
	        period: record.period,
	        device: record.device,
	        environment: record.environment,
	        usage: record.usage,
	        performance: {}
	      };

	      Object.keys(record.performance).forEach(function (performanceKey) {
	        var item = record.performance[performanceKey];
	        result.performance[performanceKey] = {
	          max: Math.round(item.max),
	          count: item.count,
	          mean: Math.round(item.time / item.count) // convert to mean in miliseconds from total time in nanoseconds
	        };
	      });
	      return result;
	    }

	    /**
	     * Send data to the server; do not send any data from the current hour.
	     *
	     * Remove any data successfully sent from our records.
	     *
	     * @method
	     */

	  }, {
	    key: 'sendData',
	    value: function sendData() {
	      var _this4 = this;

	      var doNotSendCurrentRecord = this.getCurrentStateObject(true);
	      var records = this.state.records.filter(function (record) {
	        return record !== doNotSendCurrentRecord;
	      });
	      if (records.length) {
	        Xhr({
	          sync: false,
	          method: 'POST',
	          url: this.telemetryUrl,
	          headers: {
	            'content-type': 'application/json'
	          },
	          data: {
	            id: Util$9.uuid(this.state.id),
	            layer_app_id: this.client.appId,
	            records: records.map(function (record) {
	              return _this4.convertRecord(record);
	            })
	          }
	        }, function (result) {
	          if (result.success) {
	            // Remove any records that were sent from our state
	            _this4.state.records = _this4.state.records.filter(function (record) {
	              return records.indexOf(record) === -1;
	            });
	            _this4.writeState();
	          }
	        });
	      }
	      this.clearEvents();
	    }

	    /**
	     * Periodicalily call sendData to send updates to the server.
	     *
	     * @method
	     */

	  }, {
	    key: 'setupReportingInterval',
	    value: function setupReportingInterval() {
	      if (this.enabled) {
	        // Send any stale data
	        this.sendData();
	        this._intervalId = setInterval(this.sendData.bind(this), this.reportingInterval);
	      }
	    }

	    /**
	     * If the enabled property is set, automatically clear or start the interval.
	     *
	     * ```
	     * telemetryMonitor.enabled = false;
	     * ```
	     *
	     * The above code will stop the telemetryMonitor from sending data.
	     *
	     * @method
	     */

	  }, {
	    key: '__updateEnabled',
	    value: function __updateEnabled() {
	      if (this._intervalId) {
	        clearInterval(this._intervalId);
	        this._intervalId = 0;
	      }
	      if (this.enabled) this.setupReportingInterval();
	    }
	  }]);

	  return TelemetryMonitor;
	}(Root$20);

	/**
	 * The URL to `POST` telemetry data to.
	 *
	 * @property {String}
	 */


	TelemetryMonitor$1.prototype.telemetryUrl = 'https://telemetry.layer.com';

	/**
	 * ID for the `window.setInterval` operation
	 *
	 * @property {Number}
	 */
	TelemetryMonitor$1.prototype._intervalId = 0;

	/**
	 * The reporting interval controls how frequently the module tries to report on usage data.
	 *
	 * It also is used to determine how to segment data into time slices.
	 *
	 * Value should not excede 1 day.
	 *
	 * @property {Number} [reportingInterval=3,600,000]  Number of miliseconds between submitting usage reports; defaults to once per hour
	 */
	TelemetryMonitor$1.prototype.reportingInterval = 1000 * 60 * 60;

	/**
	 * To avoid performance issues, we only write changes asynchronously; this timeoutId tracks that this has been scheduled.
	 *
	 * @property {Number}
	 */
	TelemetryMonitor$1.prototype._writeTimeoutId = 0;

	/**
	 * Constructor sets this to be the key within localStorage for accessing the cached telemetry data.
	 *
	 * @property {String}
	 */
	TelemetryMonitor$1.prototype.storageKey = '';

	/**
	 * Current state object.
	 *
	 * Initialized with data from localStorage, and any changes to it are written
	 * back to localStorage.
	 *
	 * Sending records causes them to be removed from the state.
	 *
	 * @property {Object}
	 */
	TelemetryMonitor$1.prototype.state = null;

	/**
	 * Cache of in-progress performance events.
	 *
	 * Each key has a value representing a timestamp.  Events are removed once they are completed.
	 *
	 * @property {Object}
	 */
	TelemetryMonitor$1.prototype.tempState = null;

	/**
	 * Telemetry defaults to enabled, but can be disabled by setting this to `false`
	 *
	 * @property {Boolean}
	 */
	TelemetryMonitor$1.prototype.enabled = true;

	/**
	 * Pointer to the layer.Client
	 *
	 * @property {layer.Client}
	 */
	TelemetryMonitor$1.prototype.client = null;

	/**
	 * The presence of this causes layer.Root to automatically generate an id if one isn't present.
	 *
	 * This id is written to localStorage so that it can persist across sessions.
	 *
	 * @static
	 * @property {String}
	 */
	TelemetryMonitor$1.prefixUUID = 'layer:///telemetry/';

	TelemetryMonitor$1._supportedEvents = Root$20._supportedEvents.concat(['telemetry-environment']);

	Root$20.initClass.apply(TelemetryMonitor$1, [TelemetryMonitor$1, 'TelemetryMonitor']);
	var telemetryMonitor = TelemetryMonitor$1;

	var _createClass$29 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$13 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _toConsumableArray$2(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck$29(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$22(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$22(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * There are two ways to instantiate this class:
	 *
	 *      // 1. Using a Query Builder
	 *      var conversationQueryBuilder = QueryBuilder.conversations().sortBy('lastMessage');
	 *      var conversationQuery = client.createQuery(queryBuilder);
	 *      var channelQueryBuilder = QueryBuilder.channels();
	 *      var channelQuery = client.createQuery(queryBuilder);
	 *
	 *      // 2. Passing properties directly
	 *      var conversationQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Conversation,
	 *        sortBy: [{'createdAt': 'desc'}]
	 *      });
	 *      var channelQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Channel
	 *      });
	 *
	 * You can change the data selected by your query any time you want using:
	 *
	 *      query.update({
	 *        paginationWindow: 200
	 *      });
	 *
	 *      query.update({
	 *        predicate: 'conversation.id = "' + conv.id + "'"
	 *      });
	 *
	 *     // Or use the Query Builder:
	 *     queryBuilder.paginationWindow(200);
	 *     query.update(queryBuilder);
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * #### Query Types
	 *
	 * For documentation on creating each of these types of queries, see the specified Query Subclass:
	 *
	 * * layer.ConversationsQuery
	 * * layer.ChannelsQuery
	 * * layer.MessagesQuery
	 * * layer.IdentitiesQuery
	 * * layer.MembersQuery
	 *
	 * #### dataType
	 *
	 * The layer.Query.dataType property lets you specify what type of data shows up in your results:
	 *
	 * ```javascript
	 * var query = client.createQuery({
	 *     model: layer.Query.Message,
	 *     predicate: "conversation.id = 'layer:///conversations/uuid'",
	 *     dataType: layer.Query.InstanceDataType
	 * })
	 *
	 * var query = client.createQuery({
	 *     model: layer.Query.Message,
	 *     predicate: "conversation.id = 'layer:///conversations/uuid'",
	 *     dataType: layer.Query.ObjectDataType
	 * })
	 * ```
	 *
	 * The property defaults to layer.Query.InstanceDataType.  Instances support methods and let you subscribe to events for direct notification
	 * of changes to any of the results of your query:
	 *
	* ```javascript
	 * query.data[0].on('messages:change', function(evt) {
	 *     alert('The first message has had a property change; probably isRead or recipient_status!');
	 * });
	 * ```
	 *
	 * A value of layer.Query.ObjectDataType will cause the data to be an array of immutable objects rather than instances.  One can still get an instance from the POJO:
	 *
	 * ```javascript
	 * var m = client.getMessage(query.data[0].id);
	 * m.on('messages:change', function(evt) {
	 *     alert('The first message has had a property change; probably isRead or recipient_status!');
	 * });
	 * ```
	 *
	 * ## Query Events
	 *
	 * Queries fire events whenever their data changes.  There are 5 types of events;
	 * all events are received by subscribing to the `change` event.
	 *
	 * ### 1. Data Events
	 *
	 * The Data event is fired whenever a request is sent to the server for new query results.  This could happen when first creating the query, when paging for more data, or when changing the query's properties, resulting in a new request to the server.
	 *
	 * The Event object will have an `evt.data` array of all newly added results.  But frequently you may just want to use the `query.data` array and get ALL results.
	 *
	 * ```javascript
	 * query.on('change', function(evt) {
	 *   if (evt.type === 'data') {
	 *      var newData = evt.data;
	 *      var allData = query.data;
	 *   }
	 * });
	 * ```
	 *
	 * Note that `query.on('change:data', function(evt) {}` is also supported.
	 *
	 * ### 2. Insert Events
	 *
	 * A new Conversation or Message was created. It may have been created locally by your user, or it may have been remotely created, received via websocket, and added to the Query's results.
	 *
	 * The layer.LayerEvent.target property contains the newly inserted object.
	 *
	 * ```javascript
	 *  query.on('change', function(evt) {
	 *    if (evt.type === 'insert') {
	 *       var newItem = evt.target;
	 *       var allData = query.data;
	 *    }
	 *  });
	 * ```
	 *
	 * Note that `query.on('change:insert', function(evt) {}` is also supported.
	 *
	 * ### 3. Remove Events
	 *
	 * A Conversation or Message was deleted. This may have been deleted locally by your user, or it may have been remotely deleted, a notification received via websocket, and removed from the Query results.
	 *
	 * The layer.LayerEvent.target property contains the removed object.
	 *
	 * ```javascript
	 * query.on('change', function(evt) {
	 *   if (evt.type === 'remove') {
	 *       var removedItem = evt.target;
	 *       var allData = query.data;
	 *   }
	 * });
	 * ```
	 *
	 * Note that `query.on('change:remove', function(evt) {}` is also supported.
	 *
	 * ### 4. Reset Events
	 *
	 * Any time your query's model or predicate properties have been changed
	 * the query is reset, and a new request is sent to the server.  The reset event informs your UI that the current result set is empty, and that the reason its empty is that it was `reset`.  This helps differentiate it from a `data` event that returns an empty array.
	 *
	 * ```javascript
	 * query.on('change', function(evt) {
	 *   if (evt.type === 'reset') {
	 *       var allData = query.data; // []
	 *   }
	 * });
	 * ```
	 *
	 * Note that `query.on('change:reset', function(evt) {}` is also supported.
	 *
	 * ### 5. Property Events
	 *
	 * If any properties change in any of the objects listed in your layer.Query.data property, a `property` event will be fired.
	 *
	 * The layer.LayerEvent.target property contains object that was modified.
	 *
	 * See layer.LayerEvent.changes for details on how changes are reported.
	 *
	 * ```javascript
	 * query.on('change', function(evt) {
	 *   if (evt.type === 'property') {
	 *       var changedItem = evt.target;
	 *       var isReadChanges = evt.getChangesFor('isRead');
	 *       var recipientStatusChanges = evt.getChangesFor('recipientStatus');
	 *       if (isReadChanges.length) {
	 *           ...
	 *       }
	 *
	 *       if (recipientStatusChanges.length) {
	 *           ...
	 *       }
	 *   }
	 * });
	 *```
	 * Note that `query.on('change:property', function(evt) {}` is also supported.
	 *
	 * ### 6. Move Events
	 *
	 * Occasionally, a property change will cause an item to be sorted differently, causing a Move event.
	 * The event will tell you what index the item was at, and where it has moved to in the Query results.
	 * This is currently only supported for Conversations.
	 *
	 * ```javascript
	 * query.on('change', function(evt) {
	 *   if (evt.type === 'move') {
	 *       var changedItem = evt.target;
	 *       var oldIndex = evt.fromIndex;
	 *       var newIndex = evt.newIndex;
	 *       var moveNode = list.childNodes[oldIndex];
	 *       list.removeChild(moveNode);
	 *       list.insertBefore(moveNode, list.childNodes[newIndex]);
	 *   }
	 * });
	 *```
	 * Note that `query.on('change:move', function(evt) {}` is also supported.
	 *
	 * @class  layer.Query
	 * @extends layer.Root
	 *
	 */
	var Root$21 = root;
	var LayerError$16 = layerError;
	var Logger$3 = logger_1;
	var Query$1 = function (_Root) {
	  _inherits$22(Query, _Root);

	  function Query() {
	    _classCallCheck$29(this, Query);

	    var options = void 0;

	    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
	      args[_key] = arguments[_key];
	    }

	    if (args.length === 2) {
	      options = args[1].build();
	      options.client = args[0];
	    } else {
	      options = args[0];
	    }

	    var _this = _possibleConstructorReturn$22(this, (Query.__proto__ || Object.getPrototypeOf(Query)).call(this, options));

	    _this.predicate = _this._fixPredicate(options.predicate || '');

	    if ('paginationWindow' in options) {
	      var paginationWindow = options.paginationWindow;
	      _this.paginationWindow = Math.min(_this._getMaxPageSize(), options.paginationWindow);
	      if (options.paginationWindow !== paginationWindow) {
	        Logger$3.warn('paginationWindow value ' + paginationWindow + ' in Query constructor ' + ('excedes Query.MaxPageSize of ' + _this._getMaxPageSize()));
	      }
	    }

	    _this.data = [];
	    _this._initialPaginationWindow = _this.paginationWindow;
	    if (!_this.client) throw new Error(LayerError$16.dictionary.clientMissing);
	    _this.client.on('all', _this._handleEvents, _this);

	    if (!_this.client.isReady) {
	      _this.client.once('ready', function () {
	        return _this._run();
	      }, _this);
	    } else {
	      _this._run();
	    }
	    return _this;
	  }

	  /**
	   * Cleanup and remove this Query, its subscriptions and data.
	   *
	   * @method destroy
	   */


	  _createClass$29(Query, [{
	    key: 'destroy',
	    value: function destroy() {
	      this.data = [];
	      this._triggerChange({
	        data: [],
	        type: 'reset'
	      });
	      this.client.off(null, null, this);
	      this.client._removeQuery(this);
	      this.data = null;
	      _get$13(Query.prototype.__proto__ || Object.getPrototypeOf(Query.prototype), 'destroy', this).call(this);
	    }

	    /**
	     * Get the maximum number of items allowed in a page
	     *
	     * @method _getMaxPageSize
	     * @private
	     * @returns {number}
	     */

	  }, {
	    key: '_getMaxPageSize',
	    value: function _getMaxPageSize() {
	      return this.constructor.MaxPageSize;
	    }

	    /**
	     * Updates properties of the Query.
	     *
	     * Currently supports updating:
	     *
	     * * paginationWindow
	     * * predicate
	     * * sortBy
	     *
	     * Any change to predicate or model results in clearing all data from the
	     * query's results and triggering a change event with [] as the new data.
	     *
	     * ```
	     * query.update({
	     *    paginationWindow: 200
	     * });
	     * ```
	     *
	     * ```
	     * query.update({
	     *    paginationWindow: 100,
	     *    predicate: 'conversation.id = "layer:///conversations/UUID"'
	     * });
	     * ```
	     *
	     * ```
	     * query.update({
	     *    sortBy: [{"lastMessage.sentAt": "desc"}]
	     * });
	     * ```
	     *
	     * @method update
	     * @param  {Object} options
	     * @param {string} [options.predicate] - A new predicate for the query
	     * @param {string} [options.model] - A new model for the Query
	     * @param {number} [paginationWindow] - Increase/decrease our result size to match this pagination window.
	     * @return {layer.Query} this
	     */

	  }, {
	    key: 'update',
	    value: function update() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      var needsRefresh = void 0,
	          needsRecreate = void 0;

	      var optionsBuilt = typeof options.build === 'function' ? options.build() : options;

	      if ('paginationWindow' in optionsBuilt && this.paginationWindow !== optionsBuilt.paginationWindow) {
	        this.paginationWindow = Math.min(this._getMaxPageSize() + this.size, optionsBuilt.paginationWindow);
	        if (this.paginationWindow < optionsBuilt.paginationWindow) {
	          Logger$3.warn('paginationWindow value ' + optionsBuilt.paginationWindow + ' in Query.update() ' + ('increases size greater than Query.MaxPageSize of ' + this._getMaxPageSize()));
	        }
	        needsRefresh = true;
	      }
	      if ('model' in optionsBuilt && this.model !== optionsBuilt.model) {
	        throw new Error(LayerError$16.dictionary.modelImmutable);
	      }

	      if ('predicate' in optionsBuilt) {
	        var predicate = this._fixPredicate(optionsBuilt.predicate || '');
	        if (this.predicate !== predicate) {
	          this.predicate = predicate;
	          needsRecreate = true;
	        }
	      }
	      if ('sortBy' in optionsBuilt && JSON.stringify(this.sortBy) !== JSON.stringify(optionsBuilt.sortBy)) {
	        this.sortBy = optionsBuilt.sortBy;
	        needsRecreate = true;
	      }
	      if (needsRecreate) {
	        this._reset();
	      }
	      if (needsRecreate || needsRefresh) this._run();
	      return this;
	    }

	    /**
	     * Normalizes the predicate.
	     *
	     * @method _fixPredicate
	     * @param {String} inValue
	     * @private
	     */

	  }, {
	    key: '_fixPredicate',
	    value: function _fixPredicate(inValue) {
	      if (inValue) throw new Error(LayerError$16.dictionary.predicateNotSupported);
	      return '';
	    }

	    /**
	     * After redefining the query, reset it: remove all data/reset all state.
	     *
	     * @method _reset
	     * @private
	     */

	  }, {
	    key: '_reset',
	    value: function _reset() {
	      this.totalSize = 0;
	      var data = this.data;
	      this.data = [];
	      this.client._checkAndPurgeCache(data);
	      this.isFiring = false;
	      this._predicate = null;
	      this._nextDBFromId = '';
	      this._nextServerFromId = '';
	      this.pagedToEnd = false;
	      this.paginationWindow = this._initialPaginationWindow;
	      this._triggerChange({
	        data: [],
	        type: 'reset'
	      });
	    }

	    /**
	     * Reset your query to its initial state and then rerun it.
	     *
	     * @method reset
	     */

	  }, {
	    key: 'reset',
	    value: function reset() {
	      this._reset();
	      this._run();
	    }

	    /**
	     * Execute the query.
	     *
	     * No, don't murder it, just fire it.  No, don't make it unemployed,
	     * just connect to the server and get the results.
	     *
	     * @method _run
	     * @private
	     */

	  }, {
	    key: '_run',
	    value: function _run() {
	      // Find the number of items we need to request.
	      var pageSize = Math.min(this.paginationWindow - this.size, this._getMaxPageSize());

	      // If there is a reduction in pagination window, then this variable will be negative, and we can shrink
	      // the data.
	      if (pageSize < 0) {
	        var removedData = this.data.slice(this.paginationWindow);
	        this.data = this.data.slice(0, this.paginationWindow);
	        this.client._checkAndPurgeCache(removedData);
	        this.pagedToEnd = false;
	        this._triggerAsync('change', { data: [] });
	      } else if (pageSize === 0 || this.pagedToEnd) {
	        // No need to load 0 results.
	      } else {
	        this._fetchData(pageSize);
	      }
	    }
	  }, {
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {}
	    // Noop


	    /**
	     * Returns the sort field for the query.
	     *
	     * Returns One of:
	     *
	     * * 'position' (Messages only)
	     * * 'last_message' (Conversations only)
	     * * 'created_at' (Conversations only)
	     * @method _getSortField
	     * @private
	     * @return {String} sort key used by server
	     */

	  }, {
	    key: '_getSortField',
	    value: function _getSortField() {}
	    // Noop


	    /**
	     * Process the results of the `_run` method; calls __appendResults.
	     *
	     * @method _processRunResults
	     * @private
	     * @param  {Object} results - Full xhr response object with server results
	     * @param {Number} pageSize - Number of entries that were requested
	     */

	  }, {
	    key: '_processRunResults',
	    value: function _processRunResults(results, requestUrl, pageSize) {
	      var _this2 = this;

	      if (requestUrl !== this._firingRequest || this.isDestroyed) return;

	      // isFiring is false... unless we are still syncing
	      this.isFiring = false;
	      this._firingRequest = '';
	      if (results.success) {
	        this.totalSize = Number(results.xhr.getResponseHeader('Layer-Count'));
	        if (results.data.length < pageSize || results.data.length === this.totalSize) this.pagedToEnd = true;
	        this._appendResults(results, false);
	      } else if (results.data.getNonce()) {
	        this.client.once('ready', function () {
	          _this2._run();
	        });
	      } else {
	        this.trigger('error', { error: results.data });
	      }
	    }

	    /**
	     * Appends arrays of data to the Query results.
	     *
	     * @method  _appendResults
	     * @private
	     */

	  }, {
	    key: '_appendResults',
	    value: function _appendResults(results, fromDb) {
	      var _this3 = this;

	      // For all results, register them with the client
	      // If already registered with the client, properties will be updated as needed
	      // Database results rather than server results will arrive already registered.
	      results.data.forEach(function (item) {
	        if (!(item instanceof Root$21)) _this3.client._createObject(item);
	      });

	      // Filter results to just the new results
	      var newResults = results.data.filter(function (item) {
	        return _this3._getIndex(item.id) === -1;
	      });

	      // Update the next ID to use in pagination
	      var resultLength = results.data.length;
	      if (resultLength) {
	        if (fromDb) {
	          this._nextDBFromId = results.data[resultLength - 1].id;
	        } else {
	          this._nextServerFromId = results.data[resultLength - 1].id;
	        }
	      }

	      // Update this.data
	      if (this.dataType === Query.ObjectDataType) {
	        this.data = [].concat(this.data);
	      }

	      // Insert the results... if the results are a match
	      newResults.forEach(function (itemIn) {
	        var item = _this3.client.getObject(itemIn.id);
	        if (item) _this3._appendResultsSplice(item);
	      });

	      // Trigger the change event
	      this._triggerChange({
	        type: 'data',
	        data: newResults.map(function (item) {
	          return _this3._getData(_this3.client.getObject(item.id));
	        }),
	        query: this,
	        target: this.client
	      });
	    }
	  }, {
	    key: '_appendResultsSplice',
	    value: function _appendResultsSplice(item) {}
	    // Noop


	    /**
	     * Returns a correctly formatted object representing a result.
	     *
	     * Format is specified by the `dataType` property.
	     *
	     * @method _getData
	     * @private
	     * @param  {layer.Root} item - Conversation, Message, etc... instance
	     * @return {Object} - Conversation, Message, etc... instance or Object
	     */

	  }, {
	    key: '_getData',
	    value: function _getData(item) {
	      if (this.dataType === Query.ObjectDataType) {
	        return item.toObject();
	      }
	      return item;
	    }

	    /**
	     * Returns an instance regardless of whether the input is instance or object
	     * @method _getInstance
	     * @private
	     * @param {layer.Root|Object} item - Conversation, Message, etc... object/instance
	     * @return {layer.Root}
	     */

	  }, {
	    key: '_getInstance',
	    value: function _getInstance(item) {
	      if (item instanceof Root$21) return item;
	      return this.client.getObject(item.id);
	    }

	    /**
	     * Ask the query for the item matching the ID.
	     *
	     * Returns undefined if the ID is not found.
	     *
	     * @method _getItem
	     * @private
	     * @param  {string} id
	     * @return {Object} Conversation, Message, etc... object or instance
	     */

	  }, {
	    key: '_getItem',
	    value: function _getItem(id) {
	      var index = this._getIndex(id);
	      return index === -1 ? null : this.data[index];
	    }

	    /**
	     * Get the index of the item represented by the specified ID; or return -1.
	     *
	     * @method _getIndex
	     * @private
	     * @param  {string} id
	     * @return {number}
	     */

	  }, {
	    key: '_getIndex',
	    value: function _getIndex(id) {
	      for (var index = 0; index < this.data.length; index++) {
	        if (this.data[index].id === id) return index;
	      }
	      return -1;
	    }

	    /**
	     * Handle any change event received from the layer.Client.
	     *
	     * These can be caused by websocket events, as well as local
	     * requests to create/delete/modify Conversations and Messages.
	     *
	     * The event does not necessarily apply to this Query, but the Query
	     * must examine it to determine if it applies.
	     *
	     * @method _handleEvents
	     * @private
	     * @param {string} eventName - "messages:add", "conversations:change"
	     * @param {layer.LayerEvent} evt
	     */

	  }, {
	    key: '_handleEvents',
	    value: function _handleEvents(eventName, evt) {}
	    // Noop


	    /**
	     * Handle a change event... for models that don't require custom handling
	     *
	     * @method _handleChangeEvent
	     * @param {layer.LayerEvent} evt
	     * @private
	     */

	  }, {
	    key: '_handleChangeEvent',
	    value: function _handleChangeEvent(name, evt) {
	      var index = this._getIndex(evt.target.id);

	      if (index !== -1) {
	        if (this.dataType === Query.ObjectDataType) {
	          this.data = [].concat(_toConsumableArray$2(this.data.slice(0, index)), [evt.target.toObject()], _toConsumableArray$2(this.data.slice(index + 1)));
	        }
	        this._triggerChange({
	          type: 'property',
	          target: this._getData(evt.target),
	          query: this,
	          isChange: true,
	          changes: evt.changes
	        });
	      }
	    }
	  }, {
	    key: '_handleAddEvent',
	    value: function _handleAddEvent(name, evt) {
	      var _this4 = this;

	      var list = evt[name].filter(function (obj) {
	        return _this4._getIndex(obj.id) === -1;
	      }).map(function (obj) {
	        return _this4._getData(obj);
	      });

	      // Add them to our result set and trigger an event for each one
	      if (list.length) {
	        var data = this.data = this.dataType === Query.ObjectDataType ? [].concat(this.data) : this.data;
	        list.forEach(function (item) {
	          data.push(item);
	          _this4.totalSize += 1;

	          _this4._triggerChange({
	            type: 'insert',
	            index: data.length - 1,
	            target: item,
	            query: _this4
	          });
	        });
	      }
	    }
	  }, {
	    key: '_handleRemoveEvent',
	    value: function _handleRemoveEvent(name, evt) {
	      var _this5 = this;

	      var removed = [];
	      evt[name].forEach(function (obj) {
	        var index = _this5._getIndex(obj.id);

	        if (index !== -1) {
	          if (obj.id === _this5._nextDBFromId) _this5._nextDBFromId = _this5._updateNextFromId(index);
	          if (obj.id === _this5._nextServerFromId) _this5._nextServerFromId = _this5._updateNextFromId(index);
	          removed.push({
	            data: obj,
	            index: index
	          });
	          if (_this5.dataType === Query.ObjectDataType) {
	            _this5.data = [].concat(_toConsumableArray$2(_this5.data.slice(0, index)), _toConsumableArray$2(_this5.data.slice(index + 1)));
	          } else {
	            _this5.data.splice(index, 1);
	          }
	        }
	      });

	      this.totalSize -= removed.length;
	      removed.forEach(function (removedObj) {
	        _this5._triggerChange({
	          type: 'remove',
	          target: _this5._getData(removedObj.data),
	          index: removedObj.index,
	          query: _this5
	        });
	      });
	    }

	    /**
	     * If the current next-id is removed from the list, get a new nextId.
	     *
	     * If the index is greater than 0, whatever is after that index may have come from
	     * websockets or other sources, so decrement the index to get the next safe paging id.
	     *
	     * If the index if 0, even if there is data, that data did not come from paging and
	     * can not be used safely as a paging id; return '';
	     *
	     * @method _updateNextFromId
	     * @private
	     * @param {number} index - Current index of the nextFromId
	     * @returns {string} - Next ID or empty string
	     */

	  }, {
	    key: '_updateNextFromId',
	    value: function _updateNextFromId(index) {
	      if (index > 0) return this.data[index - 1].id;else return '';
	    }

	    /*
	     * If this is ever changed to be async, make sure that destroy() still triggers synchronous events
	     */

	  }, {
	    key: '_triggerChange',
	    value: function _triggerChange(evt) {
	      if (this.isDestroyed || this.client._inCleanup) return;
	      this.trigger('change', evt);
	      this.trigger('change:' + evt.type, evt);
	    }
	  }, {
	    key: 'toString',
	    value: function toString() {
	      return this.id;
	    }
	  }]);

	  return Query;
	}(Root$21);

	Query$1.prefixUUID = 'layer:///queries/';

	/**
	 * Query for Conversations.
	 *
	 * Use this value in the layer.Query.model property.
	 * @type {string}
	 * @static
	 */
	Query$1.Conversation = 'Conversation';

	/**
	 * Query for Channels.
	 *
	 * Use this value in the layer.Query.model property.
	 * @type {string}
	 * @static
	 */
	Query$1.Channel = 'Channel';

	/**
	 * Query for Messages.
	 *
	 * Use this value in the layer.Query.model property.
	 * @type {string}
	 * @static
	 */
	Query$1.Message = 'Message';

	/**
	 * Query for Announcements.
	 *
	 * Use this value in the layer.Query.model property.
	 * @type {string}
	 * @static
	 */
	Query$1.Announcement = 'Announcement';

	/**
	 * Query for Identities.
	 *
	 * Use this value in the layer.Query.model property.
	 * @type {string}
	 * @static
	 */
	Query$1.Identity = 'Identity';

	/**
	 * Query for Members of a Channel.
	 *
	 * Use this value in the layer.Query.model property.
	 * @type {string}
	 * @static
	 */
	Query$1.Membership = 'Membership';

	/**
	 * Get data as POJOs/immutable objects.
	 *
	 * This value of layer.Query.dataType will cause your Query data and events to provide Messages/Conversations as immutable objects.
	 *
	 * @type {string}
	 * @static
	 */
	Query$1.ObjectDataType = 'object';

	/**
	 * Get data as instances of layer.Message and layer.Conversation.
	 *
	 * This value of layer.Query.dataType will cause your Query data and events to provide Messages/Conversations as instances.
	 *
	 * @type {string}
	 * @static
	 */
	Query$1.InstanceDataType = 'instance';

	/**
	 * Set the maximum page size for queries.
	 *
	 * @type {number}
	 * @static
	 */
	Query$1.MaxPageSize = 100;

	/**
	 * Access the number of results currently loaded.
	 *
	 * @type {Number}
	 * @readonly
	 */
	Object.defineProperty(Query$1.prototype, 'size', {
	  enumerable: true,
	  get: function get() {
	    return !this.data ? 0 : this.data.length;
	  }
	});

	/** Access the total number of results on the server.
	 *
	 * Will be 0 until the first query has successfully loaded results.
	 *
	 * @type {Number}
	 * @readonly
	 */
	Query$1.prototype.totalSize = 0;

	/**
	 * Access to the client so it can listen to websocket and local events.
	 *
	 * @type {layer.Client}
	 * @protected
	 * @readonly
	 */
	Query$1.prototype.client = null;

	/**
	 * Query results.
	 *
	 * Array of data resulting from the Query; either a layer.Root subclass.
	 *
	 * or plain Objects
	 * @type {Object[]}
	 * @readonly
	 */
	Query$1.prototype.data = null;

	/**
	 * Specifies the type of data being queried for.
	 *
	 * Model is one of
	 *
	 * * layer.Query.Conversation
	 * * layer.Query.Channel
	 * * layer.Query.Message
	 * * layer.Query.Announcement
	 * * layer.Query.Identity
	 *
	 * Value can be set via constructor and layer.Query.update().
	 *
	 * @type {String}
	 * @readonly
	 */
	Query$1.prototype.model = '';

	/**
	 * What type of results to request of the server.
	 *
	 * Not yet supported; returnType is one of
	 *
	 * * object
	 * * id
	 * * count
	 *
	 *  Value set via constructor.
	 + *
	 * This Query API is designed only for use with 'object' at this time; waiting for updates to server for
	 * this functionality.
	 *
	 * @type {String}
	 * @readonly
	 */
	Query$1.prototype.returnType = 'object';

	/**
	 * Specify what kind of data array your application requires.
	 *
	 * Used to specify query dataType.  One of
	 * * Query.ObjectDataType
	 * * Query.InstanceDataType
	 *
	 * @type {String}
	 * @readonly
	 */
	Query$1.prototype.dataType = Query$1.InstanceDataType;

	/**
	 * Number of results from the server to request/cache.
	 *
	 * The pagination window can be increased to download additional items, or decreased to purge results
	 * from the data property.
	 *
	 *     query.update({
	 *       paginationWindow: 150
	 *     })
	 *
	 * This call will aim to achieve 150 results.  If it previously had 100,
	 * then it will load 50 more. If it previously had 200, it will drop 50.
	 *
	 * Note that the server will only permit 100 at a time.
	 *
	 * @type {Number}
	 * @readonly
	 */
	Query$1.prototype.paginationWindow = 100;

	/**
	 * Sorting criteria for Conversation Queries.
	 *
	 * Only supports an array of one field/element.
	 * Only supports the following options:
	 *
	 * ```
	 * query.update({sortBy: [{'createdAt': 'desc'}]})
	 * query.update({sortBy: [{'lastMessage.sentAt': 'desc'}]
	 *
	 * client.createQuery({
	 *   sortBy: [{'lastMessage.sentAt': 'desc'}]
	 * });
	 * client.createQuery({
	 *   sortBy: [{'lastMessage.sentAt': 'desc'}]
	 * });
	 * ```
	 *
	 * Why such limitations? Why this structure?  The server will be exposing a Query API at which point the
	 * above sort options will make a lot more sense, and full sorting will be provided.
	 *
	 * @type {String}
	 * @readonly
	 */
	Query$1.prototype.sortBy = null;

	/**
	 * This value tells us what to reset the paginationWindow to when the query is redefined.
	 *
	 * @type {Number}
	 * @private
	 */
	Query$1.prototype._initialPaginationWindow = 100;

	/**
	 * Your Query's WHERE clause.
	 *
	 * Currently, the only queries supported are:
	 *
	 * ```
	 *  "conversation.id = 'layer:///conversations/uuid'"
	 *  "channel.id = 'layer:///channels/uuid"
	 * ```
	 *
	 * Note that both ' and " are supported.
	 *
	 * @type {string}
	 * @readonly
	 */
	Query$1.prototype.predicate = null;

	/**
	 * True if the Query is connecting to the server.
	 *
	 * It is not gaurenteed that every `update()` will fire a request to the server.
	 * For example, updating a paginationWindow to be smaller,
	 * Or changing a value to the existing value would cause the request not to fire.
	 *
	 * Recommended pattern is:
	 *
	 *      query.update({paginationWindow: 50});
	 *      if (!query.isFiring) {
	 *        alert("Done");
	 *      } else {
	 *          query.once("change", function(evt) {
	 *            if (evt.type == "data") alert("Done");
	 *          });
	 *      }
	 *
	 * @type {Boolean}
	 * @readonly
	 */
	Query$1.prototype.isFiring = false;

	/**
	 * True if we have reached the last result, and further paging will just return []
	 *
	 * @type {Boolean}
	 * @readonly
	 */
	Query$1.prototype.pagedToEnd = false;

	/**
	 * The last request fired.
	 *
	 * If multiple requests are inflight, the response
	 * matching this request is the ONLY response we will process.
	 * @type {String}
	 * @private
	 */
	Query$1.prototype._firingRequest = '';

	/**
	 * The ID to use in paging the server.
	 *
	 * Why not just use the ID of the last item in our result set?
	 * Because as we receive websocket events, we insert and append items to our data.
	 * That websocket event may not in fact deliver the NEXT item in our data, but simply an item, that sequentially
	 * belongs at the end despite skipping over other items of data.  Paging should not be from this new item, but
	 * only the last item pulled via this query from the server.
	 *
	 * @type {string}
	 */
	Query$1.prototype._nextServerFromId = '';

	/**
	 * The ID to use in paging the database.
	 *
	 * Why not just use the ID of the last item in our result set?
	 * Because as we receive websocket events, we insert and append items to our data.
	 * That websocket event may not in fact deliver the NEXT item in our data, but simply an item, that sequentially
	 * belongs at the end despite skipping over other items of data.  Paging should not be from this new item, but
	 * only the last item pulled via this query from the database.
	 *
	 * @type {string}
	 */
	Query$1.prototype._nextDBFromId = '';

	Query$1._supportedEvents = [
	/**
	 * The query data has changed; any change event will cause this event to trigger.
	 * @event change
	 */
	'change',

	/**
	 * A new page of data has been loaded from the server
	 * @event 'change:data'
	 */
	'change:data',

	/**
	 * All data for this query has been reset due to a change in the Query predicate.
	 * @event 'change:reset'
	 */
	'change:reset',

	/**
	 * An item of data within this Query has had a property change its value.
	 * @event 'change:property'
	 */
	'change:property',

	/**
	 * A new item of data has been inserted into the Query. Not triggered by loading
	 * a new page of data from the server, but is triggered by locally creating a matching
	 * item of data, or receiving a new item of data via websocket.
	 * @event 'change:insert'
	 */
	'change:insert',

	/**
	 * An item of data has been removed from the Query. Not triggered for every removal, but
	 * is triggered by locally deleting a result, or receiving a report of deletion via websocket.
	 * @event 'change:remove'
	 */
	'change:remove',

	/**
	 * An item of data has been moved to a new index in the Query results.
	 * @event 'change:move'
	 */
	'change:move',

	/**
	 * The query data failed to load from the server.
	 * @event error
	 */
	'error'].concat(Root$21._supportedEvents);

	Root$21.initClass.apply(Query$1, [Query$1, 'Query']);

	var query = Query$1;

	var _createClass$30 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$30(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$23(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$23(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Query class for running a Query on Identities
	 *
	 *      var identityQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Identity
	 *      });
	 *
	 *
	 * You can change the `paginationWindow` property at any time using:
	 *
	 *      query.update({
	 *        paginationWindow: 200
	 *      });
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * @class  layer.IdentitiesQuery
	 * @extends layer.Query
	 */
	var Root$22 = root;
	var Query$2 = query;

	var IdentitiesQuery$1 = function (_Query) {
	  _inherits$23(IdentitiesQuery, _Query);

	  function IdentitiesQuery() {
	    _classCallCheck$30(this, IdentitiesQuery);

	    return _possibleConstructorReturn$23(this, (IdentitiesQuery.__proto__ || Object.getPrototypeOf(IdentitiesQuery)).apply(this, arguments));
	  }

	  _createClass$30(IdentitiesQuery, [{
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {
	      var _this2 = this;

	      // There is not yet support for paging Identities;  as all identities are loaded,
	      // if there is a _nextDBFromId, we no longer need to get any more from the database
	      if (!this._nextDBFromId) {
	        this.client.dbManager.loadIdentities(function (identities) {
	          if (identities.length) _this2._appendResults({ data: identities }, true);
	        });
	      }

	      var newRequest = 'identities?page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      // Don't repeat still firing queries
	      if (newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          telemetry: {
	            name: 'identity_query_time'
	          },
	          url: newRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this2._processRunResults(results, newRequest, pageSize);
	        });
	      }
	    }
	  }, {
	    key: '_appendResultsSplice',
	    value: function _appendResultsSplice(item) {
	      this.data.push(this._getData(item));
	    }
	  }, {
	    key: '_handleEvents',
	    value: function _handleEvents(eventName, evt) {
	      switch (eventName) {

	        // If a Identity has changed and its in our result set, replace
	        // it with a new immutable object
	        case 'identities:change':
	          this._handleChangeEvent('identities', evt);
	          break;

	        // If Identities are added, and they aren't already in our result set
	        // add them.
	        case 'identities:add':
	          this._handleAddEvent('identities', evt);
	          break;

	        // If a Identity is deleted and its in our result set, remove it
	        // and trigger an event
	        case 'identities:remove':
	          this._handleRemoveEvent('identities', evt);
	          break;
	      }
	    }
	  }]);

	  return IdentitiesQuery;
	}(Query$2);

	IdentitiesQuery$1._supportedEvents = [].concat(Query$2._supportedEvents);

	IdentitiesQuery$1.MaxPageSize = 500;

	IdentitiesQuery$1.prototype.model = Query$2.Identity;

	Root$22.initClass.apply(IdentitiesQuery$1, [IdentitiesQuery$1, 'IdentitiesQuery']);

	var identitiesQuery = IdentitiesQuery$1;

	var _createClass$31 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get$14 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _toConsumableArray$3(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck$31(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$24(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$24(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Query class for running a Query on Conversations.
	 *
	 *
	 *      var conversationQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Conversation,
	 *        sortBy: [{'createdAt': 'desc'}]
	 *      });
	 *
	 *
	 * You can change the `paginationWindow` and `sortBy` properties at any time using:
	 *
	 *      query.update({
	 *        paginationWindow: 200
	 *      });
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * #### sortBy
	 *
	 * Note that the `sortBy` property is only supported for Conversations at this time and only
	 * supports "createdAt" and "lastMessage.sentAt" as sort fields, and only supports `desc` sort direction.
	 *
	 *      query.update({
	 *        sortBy: [{'lastMessage.sentAt': 'desc'}]
	 *      });
	 *
	 *
	 * @class  layer.ConversationsQuery
	 * @extends layer.Query
	 */
	var Root$23 = root;
	var Util$10 = clientUtils;

	var _require$10 = _const;
	var SYNC_STATE$2 = _require$10.SYNC_STATE;

	var Query$3 = query;

	var ConversationsQuery$1 = function (_Query) {
	  _inherits$24(ConversationsQuery, _Query);

	  function ConversationsQuery() {
	    _classCallCheck$31(this, ConversationsQuery);

	    return _possibleConstructorReturn$24(this, (ConversationsQuery.__proto__ || Object.getPrototypeOf(ConversationsQuery)).apply(this, arguments));
	  }

	  _createClass$31(ConversationsQuery, [{
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {
	      var _this2 = this;

	      var sortBy = this._getSortField();

	      this.client.dbManager.loadConversations(sortBy, this._nextDBFromId, pageSize, function (conversations) {
	        if (conversations.length) _this2._appendResults({ data: conversations }, true);
	      });

	      var newRequest = 'conversations?sort_by=' + sortBy + '&page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      if (newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          telemetry: {
	            name: 'conversation_query_time'
	          },
	          url: this._firingRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this2._processRunResults(results, newRequest, pageSize);
	        });
	      }
	    }
	  }, {
	    key: '_getSortField',
	    value: function _getSortField() {
	      if (this.sortBy && this.sortBy[0] && this.sortBy[0]['lastMessage.sentAt']) {
	        return 'last_message';
	      } else {
	        return 'created_at';
	      }
	    }
	  }, {
	    key: '_getItem',
	    value: function _getItem(id) {
	      switch (Util$10.typeFromID(id)) {
	        case 'messages':
	          for (var index = 0; index < this.data.length; index++) {
	            var conversation = this.data[index];
	            if (conversation.lastMessage && conversation.lastMessage.id === id) return conversation.lastMessage;
	          }
	          return null;
	        case 'conversations':
	          return _get$14(ConversationsQuery.prototype.__proto__ || Object.getPrototypeOf(ConversationsQuery.prototype), '_getItem', this).call(this, id);
	      }
	    }
	  }, {
	    key: '_appendResultsSplice',
	    value: function _appendResultsSplice(item) {
	      var data = this.data;
	      var index = this._getInsertIndex(item, data);
	      data.splice(index, 0, this._getData(item));
	    }
	  }, {
	    key: '_handleEvents',
	    value: function _handleEvents(eventName, evt) {
	      switch (eventName) {

	        // If a Conversation's property has changed, and the Conversation is in this
	        // Query's data, then update it.
	        case 'conversations:change':
	          this._handleChangeEvent('conversations', evt);
	          break;

	        // If a Conversation is added, and it isn't already in the Query,
	        // add it and trigger an event
	        case 'conversations:add':
	          this._handleAddEvent('conversations', evt);
	          break;

	        // If a Conversation is deleted, and its still in our data,
	        // remove it and trigger an event.
	        case 'conversations:remove':
	          this._handleRemoveEvent('conversations', evt);
	          break;
	      }
	    }

	    // TODO WEB-968: Refactor this into functions for instance, object, sortBy createdAt, sortBy lastMessage

	  }, {
	    key: '_handleChangeEvent',
	    value: function _handleChangeEvent(name, evt) {
	      var index = this._getIndex(evt.target.id);

	      // If its an ID change (matching Distinct Conversation returned by server) make sure to update our data.
	      // If dataType is an instance, its been updated for us.
	      if (this.dataType === Query$3.ObjectDataType) {
	        var idChanges = evt.getChangesFor('id');
	        if (idChanges.length) {
	          index = this._getIndex(idChanges[0].oldValue);
	        }
	      }

	      // If dataType is "object" then update the object and our array;
	      // else the object is already updated.
	      // Ignore results that aren't already in our data; Results are added via
	      // conversations:add events.  Websocket Manager automatically loads anything that receives an event
	      // for which we have no object, so we'll get the add event at that time.
	      if (index !== -1) {
	        var sortField = this._getSortField();
	        var reorder = evt.hasProperty('lastMessage') && sortField === 'last_message';
	        var newIndex = void 0;

	        if (this.dataType === Query$3.ObjectDataType) {
	          if (!reorder) {
	            // Replace the changed Conversation with a new immutable object
	            this.data = [].concat(_toConsumableArray$3(this.data.slice(0, index)), [evt.target.toObject()], _toConsumableArray$3(this.data.slice(index + 1)));
	          } else {
	            newIndex = this._getInsertIndex(evt.target, this.data);
	            this.data.splice(index, 1);
	            this.data.splice(newIndex, 0, this._getData(evt.target));
	            this.data = this.data.concat([]);
	          }
	        }

	        // Else dataType is instance not object
	        else if (reorder) {
	            newIndex = this._getInsertIndex(evt.target, this.data);
	            if (newIndex !== index) {
	              this.data.splice(index, 1);
	              this.data.splice(newIndex, 0, evt.target);
	            }
	          }

	        // Trigger a 'property' event
	        this._triggerChange({
	          type: 'property',
	          target: this._getData(evt.target),
	          query: this,
	          isChange: true,
	          changes: evt.changes
	        });

	        if (reorder && newIndex !== index) {
	          this._triggerChange({
	            type: 'move',
	            target: this._getData(evt.target),
	            query: this,
	            isChange: false,
	            fromIndex: index,
	            toIndex: newIndex
	          });
	        }
	      }
	    }
	  }, {
	    key: '_getInsertIndex',
	    value: function _getInsertIndex(conversation, data) {
	      if (!conversation.isSaved()) return 0;
	      var sortField = this._getSortField();
	      var index = void 0;
	      if (sortField === 'created_at') {
	        for (index = 0; index < data.length; index++) {
	          var item = data[index];
	          if (item.syncState === SYNC_STATE$2.NEW || item.syncState === SYNC_STATE$2.SAVING) {
	            // No-op do not insert server data before new and unsaved data
	          } else if (conversation.createdAt >= item.createdAt) {
	            break;
	          }
	        }
	        return index;
	      } else {
	        var oldIndex = -1;
	        var d1 = conversation.lastMessage ? conversation.lastMessage.sentAt : conversation.createdAt;
	        for (index = 0; index < data.length; index++) {
	          var _item = data[index];
	          if (_item.id === conversation.id) {
	            oldIndex = index;
	          } else if (_item.syncState === SYNC_STATE$2.NEW || _item.syncState === SYNC_STATE$2.SAVING) {
	            // No-op do not insert server data before new and unsaved data
	          } else {
	            var d2 = _item.lastMessage ? _item.lastMessage.sentAt : _item.createdAt;
	            if (d1 >= d2) break;
	          }
	        }
	        return oldIndex === -1 || oldIndex > index ? index : index - 1;
	      }
	    }
	  }, {
	    key: '_handleAddEvent',
	    value: function _handleAddEvent(name, evt) {
	      var _this3 = this;

	      // Filter out any Conversations already in our data
	      var list = evt[name].filter(function (conversation) {
	        return _this3._getIndex(conversation.id) === -1;
	      });

	      if (list.length) {
	        var data = this.data;

	        // typically bulk inserts happen via _appendResults(); so this array typically iterates over an array of length 1
	        list.forEach(function (conversation) {
	          var newIndex = _this3._getInsertIndex(conversation, data);
	          data.splice(newIndex, 0, _this3._getData(conversation));

	          if (_this3.dataType === Query$3.ObjectDataType) {
	            _this3.data = [].concat(data);
	          }
	          _this3.totalSize += 1;

	          var item = _this3._getData(conversation);
	          _this3._triggerChange({
	            type: 'insert',
	            index: newIndex,
	            target: item,
	            query: _this3
	          });
	        });
	      }
	    }
	  }, {
	    key: '_handleRemoveEvent',
	    value: function _handleRemoveEvent(name, evt) {
	      var _this4 = this;

	      var removed = [];
	      evt[name].forEach(function (conversation) {
	        var index = _this4._getIndex(conversation.id);
	        if (index !== -1) {
	          if (conversation.id === _this4._nextDBFromId) _this4._nextDBFromId = _this4._updateNextFromId(index);
	          if (conversation.id === _this4._nextServerFromId) _this4._nextServerFromId = _this4._updateNextFromId(index);
	          removed.push({
	            data: conversation,
	            index: index
	          });
	          if (_this4.dataType === Query$3.ObjectDataType) {
	            _this4.data = [].concat(_toConsumableArray$3(_this4.data.slice(0, index)), _toConsumableArray$3(_this4.data.slice(index + 1)));
	          } else {
	            _this4.data.splice(index, 1);
	          }
	        }
	      });

	      this.totalSize -= removed.length;
	      removed.forEach(function (removedObj) {
	        _this4._triggerChange({
	          type: 'remove',
	          index: removedObj.index,
	          target: _this4._getData(removedObj.data),
	          query: _this4
	        });
	      });
	    }
	  }]);

	  return ConversationsQuery;
	}(Query$3);

	ConversationsQuery$1._supportedEvents = [].concat(Query$3._supportedEvents);

	ConversationsQuery$1.MaxPageSize = 100;

	ConversationsQuery$1.prototype.model = Query$3.Conversation;

	Root$23.initClass.apply(ConversationsQuery$1, [ConversationsQuery$1, 'ConversationsQuery']);

	var conversationsQuery = ConversationsQuery$1;

	var _createClass$32 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _toConsumableArray$4(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck$32(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$25(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$25(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Query class for running a Query on Channels
	 *
	 *      var channelQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Channel
	 *      });
	 *
	 *
	 * You can change the `paginationWindow` property at any time using:
	 *
	 *      query.update({
	 *        paginationWindow: 200
	 *      });
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * @class  layer.ChannelsQuery
	 * @extends layer.Query
	 */
	var Root$24 = root;

	var _require$11 = _const;
	var SYNC_STATE$3 = _require$11.SYNC_STATE;

	var Query$4 = query;
	var ConversationsQuery$2 = conversationsQuery;

	var ChannelsQuery$1 = function (_ConversationsQuery) {
	  _inherits$25(ChannelsQuery, _ConversationsQuery);

	  function ChannelsQuery() {
	    _classCallCheck$32(this, ChannelsQuery);

	    return _possibleConstructorReturn$25(this, (ChannelsQuery.__proto__ || Object.getPrototypeOf(ChannelsQuery)).apply(this, arguments));
	  }

	  _createClass$32(ChannelsQuery, [{
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {
	      var _this2 = this;

	      this.client.dbManager.loadChannels(this._nextDBFromId, pageSize, function (channels) {
	        if (channels.length) _this2._appendResults({ data: channels }, true);
	      });

	      var newRequest = 'channels?page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      if (newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          telemetry: {
	            name: 'channel_query_time'
	          },
	          url: this._firingRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this2._processRunResults(results, _this2._firingRequest, pageSize);
	        });
	      }
	    }
	  }, {
	    key: '_getSortField',
	    value: function _getSortField() {
	      return 'created_at';
	    }
	  }, {
	    key: '_getItem',
	    value: function _getItem(id) {
	      return Query$4.prototype._getItem.apply(this, [id]);
	    }
	  }, {
	    key: '_handleEvents',
	    value: function _handleEvents(eventName, evt) {
	      switch (eventName) {

	        // If a Conversation's property has changed, and the Conversation is in this
	        // Query's data, then update it.
	        case 'channels:change':
	          this._handleChangeEvent('channels', evt);
	          break;

	        // If a Conversation is added, and it isn't already in the Query,
	        // add it and trigger an event
	        case 'channels:add':
	          this._handleAddEvent('channels', evt);
	          break;

	        // If a Conversation is deleted, and its still in our data,
	        // remove it and trigger an event.
	        case 'channels:remove':
	          this._handleRemoveEvent('channels', evt);
	          break;
	      }
	    }
	  }, {
	    key: '_appendResultsSplice',
	    value: function _appendResultsSplice(item) {
	      this.data.unshift(this._getData(item));
	    }
	  }, {
	    key: '_handleChangeEvent',
	    value: function _handleChangeEvent(name, evt) {
	      var index = this._getIndex(evt.target.id);

	      // If its an ID change (matching named channel returned by server) make sure to update our data.
	      // If dataType is an instance, its been updated for us.
	      if (this.dataType === Query$4.ObjectDataType) {
	        var idChanges = evt.getChangesFor('id');
	        if (idChanges.length) {
	          index = this._getIndex(idChanges[0].oldValue);
	        }
	      }

	      // If dataType is "object" then update the object and our array;
	      // else the object is already updated.
	      // Ignore results that aren't already in our data; Results are added via
	      // channels:add events.  Websocket Manager automatically loads anything that receives an event
	      // for which we have no object, so we'll get the add event at that time.
	      if (index !== -1) {
	        var sortField = this._getSortField();
	        var reorder = evt.hasProperty('lastMessage') && sortField === 'last_message';
	        var newIndex = void 0;

	        if (this.dataType === Query$4.ObjectDataType) {
	          if (!reorder) {
	            // Replace the changed Channel with a new immutable object
	            this.data = [].concat(_toConsumableArray$4(this.data.slice(0, index)), [evt.target.toObject()], _toConsumableArray$4(this.data.slice(index + 1)));
	          } else {
	            newIndex = this._getInsertIndex(evt.target, this.data);
	            this.data.splice(index, 1);
	            this.data.splice(newIndex, 0, this._getData(evt.target));
	            this.data = this.data.concat([]);
	          }
	        }

	        // Else dataType is instance not object
	        else if (reorder) {
	            newIndex = this._getInsertIndex(evt.target, this.data);
	            if (newIndex !== index) {
	              this.data.splice(index, 1);
	              this.data.splice(newIndex, 0, evt.target);
	            }
	          }

	        // Trigger a 'property' event
	        this._triggerChange({
	          type: 'property',
	          target: this._getData(evt.target),
	          query: this,
	          isChange: true,
	          changes: evt.changes
	        });

	        if (reorder && newIndex !== index) {
	          this._triggerChange({
	            type: 'move',
	            target: this._getData(evt.target),
	            query: this,
	            isChange: false,
	            fromIndex: index,
	            toIndex: newIndex
	          });
	        }
	      }
	    }
	  }, {
	    key: '_getInsertIndex',
	    value: function _getInsertIndex(channel, data) {
	      if (!channel.isSaved()) return 0;
	      var sortField = this._getSortField();
	      var index = void 0;
	      if (sortField === 'created_at') {
	        for (index = 0; index < data.length; index++) {
	          var item = data[index];
	          if (item.syncState === SYNC_STATE$3.NEW || item.syncState === SYNC_STATE$3.SAVING) {
	            // No-op do not insert server data before new and unsaved data
	          } else if (channel.createdAt >= item.createdAt) {
	            break;
	          }
	        }
	        return index;
	      } else {
	        var oldIndex = -1;
	        var d1 = channel.lastMessage ? channel.lastMessage.sentAt : channel.createdAt;
	        for (index = 0; index < data.length; index++) {
	          var _item = data[index];
	          if (_item.id === channel.id) {
	            oldIndex = index;
	          } else if (_item.syncState === SYNC_STATE$3.NEW || _item.syncState === SYNC_STATE$3.SAVING) {
	            // No-op do not insert server data before new and unsaved data
	          } else {
	            var d2 = _item.lastMessage ? _item.lastMessage.sentAt : _item.createdAt;
	            if (d1 >= d2) break;
	          }
	        }
	        return oldIndex === -1 || oldIndex > index ? index : index - 1;
	      }
	    }
	  }, {
	    key: '_handleAddEvent',
	    value: function _handleAddEvent(name, evt) {
	      var _this3 = this;

	      // Filter out any Channels already in our data
	      var list = evt[name].filter(function (channel) {
	        return _this3._getIndex(channel.id) === -1;
	      });

	      if (list.length) {
	        var data = this.data;

	        // typically bulk inserts happen via _appendResults(); so this array typically iterates over an array of length 1
	        list.forEach(function (channel) {
	          var newIndex = _this3._getInsertIndex(channel, data);
	          data.splice(newIndex, 0, _this3._getData(channel));

	          // Typically this loop only iterates once; but each iteration is gaurenteed a unique object if needed
	          if (_this3.dataType === Query$4.ObjectDataType) {
	            _this3.data = [].concat(data);
	          }
	          _this3.totalSize += 1;

	          var item = _this3._getData(channel);
	          _this3._triggerChange({
	            type: 'insert',
	            index: newIndex,
	            target: item,
	            query: _this3
	          });
	        });
	      }
	    }
	  }, {
	    key: '_handleRemoveEvent',
	    value: function _handleRemoveEvent(name, evt) {
	      var _this4 = this;

	      var removed = [];
	      evt[name].forEach(function (channel) {
	        var index = _this4._getIndex(channel.id);
	        if (index !== -1) {
	          if (channel.id === _this4._nextDBFromId) _this4._nextDBFromId = _this4._updateNextFromId(index);
	          if (channel.id === _this4._nextServerFromId) _this4._nextServerFromId = _this4._updateNextFromId(index);
	          removed.push({
	            data: channel,
	            index: index
	          });
	          if (_this4.dataType === Query$4.ObjectDataType) {
	            _this4.data = [].concat(_toConsumableArray$4(_this4.data.slice(0, index)), _toConsumableArray$4(_this4.data.slice(index + 1)));
	          } else {
	            _this4.data.splice(index, 1);
	          }
	        }
	      });

	      this.totalSize -= removed.length;
	      removed.forEach(function (removedObj) {
	        _this4._triggerChange({
	          type: 'remove',
	          index: removedObj.index,
	          target: _this4._getData(removedObj.data),
	          query: _this4
	        });
	      });
	    }
	  }]);

	  return ChannelsQuery;
	}(ConversationsQuery$2);

	ChannelsQuery$1._supportedEvents = [].concat(ConversationsQuery$2._supportedEvents);

	ChannelsQuery$1.MaxPageSize = 100;

	ChannelsQuery$1.prototype.model = Query$4.Channel;

	Root$24.initClass.apply(ChannelsQuery$1, [ChannelsQuery$1, 'ChannelsQuery']);

	var channelsQuery = ChannelsQuery$1;

	var _createClass$33 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$33(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$26(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$26(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Query class for running a Query on Channel Members
	 *
	 *      var membersQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Membership,
	 *        predicate: 'channel.id = "layer:///channels/UUID"'
	 *      });
	 *
	 * You can change the data selected by your query any time you want using:
	 *
	 *      query.update({
	 *        predicate: 'channel.id = "layer:///channels/UUID2"'
	 *      });
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * #### predicate
	 *
	 * Note that the `predicate` property is only supported for Messages and Membership, and only supports
	 * querying by Channel.
	 *
	 * @class  layer.MembersQuery
	 * @extends layer.Query
	 */
	var Root$25 = root;
	var LayerError$17 = layerError;
	var Logger$4 = logger_1;
	var Query$5 = query;

	var findChannelIdRegex = new RegExp(/^channel.id\s*=\s*['"]((layer:\/\/\/channels\/)?.{8}-.{4}-.{4}-.{4}-.{12})['"]$/);

	var MembersQuery$1 = function (_Query) {
	  _inherits$26(MembersQuery, _Query);

	  function MembersQuery() {
	    _classCallCheck$33(this, MembersQuery);

	    return _possibleConstructorReturn$26(this, (MembersQuery.__proto__ || Object.getPrototypeOf(MembersQuery)).apply(this, arguments));
	  }

	  _createClass$33(MembersQuery, [{
	    key: '_fixPredicate',
	    value: function _fixPredicate(inValue) {
	      if (inValue === '') return '';
	      if (inValue.indexOf('channel.id') !== -1) {
	        var channelId = inValue.match(findChannelIdRegex) ? inValue.replace(findChannelIdRegex, '$1') : null;
	        if (!channelId) throw new Error(LayerError$17.dictionary.invalidPredicate);
	        if (channelId.indexOf('layer:///channels/') !== 0) channelId = 'layer:///channels/' + channelId;
	        return 'channel.id = \'' + channelId + '\'';
	      } else {
	        throw new Error(LayerError$17.dictionary.invalidPredicate);
	      }
	    }

	    /**
	     * Get the Channel UUID from the predicate property.
	     *
	     * Extract the Channel's UUID from the predicate... or returned the cached value.
	     *
	     * @method _getChannelPredicateIds
	     * @private
	     */

	  }, {
	    key: '_getChannelPredicateIds',
	    value: function _getChannelPredicateIds() {
	      if (this.predicate.match(findChannelIdRegex)) {
	        var channelId = this.predicate.replace(findChannelIdRegex, '$1');

	        // We will already have a this._predicate if we are paging; else we need to extract the UUID from
	        // the channelId.
	        var uuid = (this._predicate || channelId).replace(/^layer:\/\/\/channels\//, '');
	        if (uuid) {
	          return {
	            uuid: uuid,
	            id: channelId,
	            type: Query$5.Channel
	          };
	        }
	      }
	    }
	  }, {
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {
	      var _this2 = this;

	      var predicateIds = this._getChannelPredicateIds();

	      // Do nothing if we don't have a conversation to query on
	      if (!predicateIds) {
	        if (this.predicate && !this.predicate.match(/['"]/)) {
	          Logger$4.error('This query may need to quote its value');
	        }
	        return;
	      }

	      var channelId = 'layer:///channels/' + predicateIds.uuid;
	      if (!this._predicate) this._predicate = predicateIds.id;
	      var channel = this.client.getChannel(channelId);

	      var newRequest = 'channels/' + predicateIds.uuid + '/members?page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      // Don't query on unsaved channels, nor repeat still firing queries
	      if ((!channel || channel.isSaved()) && newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          telemetry: {
	            name: 'member_query_time'
	          },
	          url: newRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this2._processRunResults(results, newRequest, pageSize);
	        });
	      }
	    }
	  }, {
	    key: '_appendResultsSplice',
	    value: function _appendResultsSplice(item) {
	      this.data.push(this._getData(item));
	    }
	  }, {
	    key: '_handleEvents',
	    value: function _handleEvents(eventName, evt) {
	      switch (eventName) {

	        // If a member has changed and its in our result set, replace
	        // it with a new immutable object
	        case 'members:change':
	          this._handleChangeEvent('members', evt);
	          break;

	        // If members are added, and they aren't already in our result set
	        // add them.
	        case 'members:add':
	          this._handleAddEvent('members', evt);
	          break;

	        // If a Identity is deleted and its in our result set, remove it
	        // and trigger an event
	        case 'members:remove':
	          this._handleRemoveEvent('members', evt);
	          break;
	      }
	    }
	  }]);

	  return MembersQuery;
	}(Query$5);

	MembersQuery$1._supportedEvents = [].concat(Query$5._supportedEvents);

	MembersQuery$1.MaxPageSize = 500;

	MembersQuery$1.prototype.model = Query$5.Membership;

	Root$25.initClass.apply(MembersQuery$1, [MembersQuery$1, 'MembersQuery']);

	var membersQuery = MembersQuery$1;

	var _createClass$34 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _toConsumableArray$5(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck$34(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$27(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$27(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Query class for running a Query on Messages
	 *
	 *      var messageQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Message,
	 *        predicate: 'conversation.id = "layer:///conversations/UUID"'
	 *      });
	 *
	 * You can change the data selected by your query any time you want using:
	 *
	 *      query.update({
	 *        predicate: 'channel.id = "layer:///channels/UUID2"'
	 *      });
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * #### predicate
	 *
	 * Note that the `predicate` property is only supported for Messages and layer.Membership, and only supports
	 * querying by Conversation or Channel:
	 *
	 * * `conversation.id = 'layer:///conversations/UUIUD'`
	 * * `channel.id = 'layer:///channels/UUIUD'`
	 *
	 * @class  layer.MessagesQuery
	 * @extends layer.Query
	 */
	var Root$26 = root;
	var LayerError$18 = layerError;
	var Util$11 = clientUtils;
	var Logger$5 = logger_1;
	var Query$6 = query;

	var findConvIdRegex = new RegExp(/^conversation.id\s*=\s*['"]((layer:\/\/\/conversations\/)?.{8}-.{4}-.{4}-.{4}-.{12})['"]$/);
	var findChannelIdRegex$1 = new RegExp(/^channel.id\s*=\s*['"]((layer:\/\/\/channels\/)?.{8}-.{4}-.{4}-.{4}-.{12})['"]$/);

	var MessagesQuery$1 = function (_Query) {
	  _inherits$27(MessagesQuery, _Query);

	  function MessagesQuery() {
	    _classCallCheck$34(this, MessagesQuery);

	    return _possibleConstructorReturn$27(this, (MessagesQuery.__proto__ || Object.getPrototypeOf(MessagesQuery)).apply(this, arguments));
	  }

	  _createClass$34(MessagesQuery, [{
	    key: '_fixPredicate',
	    value: function _fixPredicate(inValue) {
	      if (inValue === '') return '';
	      if (inValue.indexOf('conversation.id') !== -1) {
	        var conversationId = inValue.match(findConvIdRegex) ? inValue.replace(findConvIdRegex, '$1') : null;
	        if (!conversationId) throw new Error(LayerError$18.dictionary.invalidPredicate);
	        if (conversationId.indexOf('layer:///conversations/') !== 0) conversationId = 'layer:///conversations/' + conversationId;
	        return 'conversation.id = \'' + conversationId + '\'';
	      } else if (inValue.indexOf('channel.id') !== -1) {
	        var channelId = inValue.match(findChannelIdRegex$1) ? inValue.replace(findChannelIdRegex$1, '$1') : null;
	        if (!channelId) throw new Error(LayerError$18.dictionary.invalidPredicate);
	        if (channelId.indexOf('layer:///channels/') !== 0) channelId = 'layer:///channels/' + channelId;
	        return 'channel.id = \'' + channelId + '\'';
	      } else {
	        throw new Error(LayerError$18.dictionary.invalidPredicate);
	      }
	    }
	  }, {
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {
	      var predicateIds = this._getConversationPredicateIds();

	      // Do nothing if we don't have a conversation to query on
	      if (!predicateIds) {
	        if (this.predicate && !this.predicate.match(/['"]/)) {
	          Logger$5.error('This query may need to quote its value');
	        }
	        return;
	      }

	      switch (predicateIds.type) {
	        case Query$6.Conversation:
	          this._fetchConversationMessages(pageSize, predicateIds);
	          break;
	        case Query$6.Channel:
	          this._fetchChannelMessages(pageSize, predicateIds);
	          break;
	      }
	    }
	  }, {
	    key: '_getSortField',
	    value: function _getSortField() {
	      return 'position';
	    }

	    /**
	     * Get the Conversation UUID from the predicate property.
	     *
	     * Extract the Conversation's UUID from the predicate... or returned the cached value.
	     *
	     * @method _getConversationPredicateIds
	     * @private
	     */

	  }, {
	    key: '_getConversationPredicateIds',
	    value: function _getConversationPredicateIds() {
	      if (this.predicate.indexOf('conversation.id') !== -1) {
	        if (this.predicate.match(findConvIdRegex)) {
	          var conversationId = this.predicate.replace(findConvIdRegex, '$1');

	          // We will already have a this._predicate if we are paging; else we need to extract the UUID from
	          // the conversationId.
	          var uuid = (this._predicate || conversationId).replace(/^layer:\/\/\/conversations\//, '');
	          if (uuid) {
	            return {
	              uuid: uuid,
	              id: conversationId,
	              type: Query$6.Conversation
	            };
	          }
	        }
	      } else if (this.predicate.indexOf('channel.id') !== -1) {
	        if (this.predicate.match(findChannelIdRegex$1)) {
	          var channelId = this.predicate.replace(findChannelIdRegex$1, '$1');

	          // We will already have a this._predicate if we are paging; else we need to extract the UUID from
	          // the channelId.
	          var _uuid = (this._predicate || channelId).replace(/^layer:\/\/\/channels\//, '');
	          if (_uuid) {
	            return {
	              uuid: _uuid,
	              id: channelId,
	              type: Query$6.Channel
	            };
	          }
	        }
	      }
	    }
	  }, {
	    key: '_fetchConversationMessages',
	    value: function _fetchConversationMessages(pageSize, predicateIds) {
	      var _this2 = this;

	      var conversationId = 'layer:///conversations/' + predicateIds.uuid;
	      if (!this._predicate) this._predicate = predicateIds.id;
	      var conversation = this.client.getConversation(conversationId);

	      // Retrieve data from db cache in parallel with loading data from server
	      this.client.dbManager.loadMessages(conversationId, this._nextDBFromId, pageSize, function (messages) {
	        if (messages.length) _this2._appendResults({ data: messages }, true);
	      });

	      var newRequest = 'conversations/' + predicateIds.uuid + '/messages?page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      // Don't query on unsaved conversations, nor repeat still firing queries
	      // If we have a conversation ID but no conversation object, try the query anyways.
	      if ((!conversation || conversation.isSaved()) && newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          telemetry: {
	            name: 'message_query_time'
	          },
	          url: newRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this2._processRunResults(results, newRequest, pageSize);
	        });
	      }

	      if (conversation && !conversation.isSaved()) {
	        this.pagedToEnd = true;
	      }

	      // If there are no results, then its a new query; automatically populate it with the Conversation's lastMessage.
	      if (this.data.length === 0) {
	        if (conversation && conversation.lastMessage) {
	          this.data = [this._getData(conversation.lastMessage)];
	          // Trigger the change event
	          this._triggerChange({
	            type: 'data',
	            data: [this._getData(conversation.lastMessage)],
	            query: this,
	            target: this.client
	          });
	        }
	      }
	    }
	  }, {
	    key: '_fetchChannelMessages',
	    value: function _fetchChannelMessages(pageSize, predicateIds) {
	      var _this3 = this;

	      var channelId = 'layer:///channels/' + predicateIds.uuid;
	      if (!this._predicate) this._predicate = predicateIds.id;
	      var channel = this.client.getChannel(channelId);

	      // Retrieve data from db cache in parallel with loading data from server
	      this.client.dbManager.loadMessages(channelId, this._nextDBFromId, pageSize, function (messages) {
	        if (messages.length) _this3._appendResults({ data: messages }, true);
	      });

	      var newRequest = 'channels/' + predicateIds.uuid + '/messages?page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      // Don't query on unsaved channels, nor repeat still firing queries
	      if ((!channel || channel.isSaved()) && newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          url: newRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this3._processRunResults(results, newRequest, pageSize);
	        });
	      }

	      if (channel && !channel.isSaved()) {
	        this.pagedToEnd = true;
	      }
	    }
	  }, {
	    key: '_appendResultsSplice',
	    value: function _appendResultsSplice(item) {
	      var data = this.data;
	      var index = this._getInsertIndex(item, data);
	      data.splice(index, 0, this._getData(item));
	    }
	  }, {
	    key: '_getInsertIndex',
	    value: function _getInsertIndex(message, data) {
	      var index = void 0;
	      for (index = 0; index < data.length; index++) {
	        if (message.position > data[index].position) {
	          break;
	        }
	      }
	      return index;
	    }
	  }, {
	    key: '_handleEvents',
	    value: function _handleEvents(eventName, evt) {
	      switch (eventName) {

	        // If a Conversation's ID has changed, check our predicate, and update it automatically if needed.
	        case 'conversations:change':
	          this._handleConvIdChangeEvent(evt);
	          break;

	        // If a Message has changed and its in our result set, replace
	        // it with a new immutable object
	        case 'messages:change':
	        case 'messages:read':
	          this._handleChangeEvent('messages', evt);
	          break;

	        // If Messages are added, and they aren't already in our result set
	        // add them.
	        case 'messages:add':
	          this._handleAddEvent('messages', evt);
	          break;

	        // If a Message is deleted and its in our result set, remove it
	        // and trigger an event
	        case 'messages:remove':
	          this._handleRemoveEvent('messages', evt);
	          break;
	      }
	    }

	    /**
	     * A Conversation or Channel ID changes if a matching Distinct Conversation or named Channel was found on the server.
	     *
	     * If this Query's Conversation's ID has changed, update the predicate.
	     *
	     * @method _handleConvIdChangeEvent
	     * @param {layer.LayerEvent} evt - A Message Change Event
	     * @private
	     */

	  }, {
	    key: '_handleConvIdChangeEvent',
	    value: function _handleConvIdChangeEvent(evt) {
	      var cidChanges = evt.getChangesFor('id');
	      if (cidChanges.length) {
	        if (this._predicate === cidChanges[0].oldValue) {
	          this._predicate = cidChanges[0].newValue;
	          this.predicate = "conversation.id = '" + this._predicate + "'";
	          this._run();
	        }
	      }
	    }

	    /**
	     * If the ID of the message has changed, then the position property has likely changed as well.
	     *
	     * This method tests to see if changes to the position property have impacted the message's position in the
	     * data array... and updates the array if it has.
	     *
	     * @method _handlePositionChange
	     * @private
	     * @param {layer.LayerEvent} evt  A Message Change event
	     * @param {number} index  Index of the message in the current data array
	     * @return {boolean} True if a data was changed and a change event was emitted
	     */

	  }, {
	    key: '_handlePositionChange',
	    value: function _handlePositionChange(evt, index) {
	      // If the message is not in the current data, then there is no change to our query results.
	      if (index === -1) return false;

	      // Create an array without our data item and then find out where the data item Should be inserted.
	      // Note: we could just lookup the position in our current data array, but its too easy to introduce
	      // errors where comparing this message to itself may yield index or index + 1.
	      var newData = [].concat(_toConsumableArray$5(this.data.slice(0, index)), _toConsumableArray$5(this.data.slice(index + 1)));
	      var newIndex = this._getInsertIndex(evt.target, newData);

	      // If the data item goes in the same index as before, then there is no change to be handled here;
	      // else insert the item at the right index, update this.data and fire a change event
	      if (newIndex !== index) {
	        newData.splice(newIndex, 0, this._getData(evt.target));
	        this.data = newData;
	        this._triggerChange({
	          type: 'property',
	          target: this._getData(evt.target),
	          query: this,
	          isChange: true,
	          changes: evt.changes
	        });
	        return true;
	      }
	      return false;
	    }
	  }, {
	    key: '_handleChangeEvent',
	    value: function _handleChangeEvent(name, evt) {
	      var index = this._getIndex(evt.target.id);
	      var positionChanges = evt.getChangesFor('position');

	      // If there are position changes, handle them.  If all the changes are position changes,
	      // exit when done.
	      if (positionChanges.length) {
	        if (this._handlePositionChange(evt, index)) {
	          if (positionChanges.length === evt.changes.length) return;
	          index = this._getIndex(evt.target.id); // Get the updated position
	        }
	      }

	      if (index !== -1) {
	        if (this.dataType === Query$6.ObjectDataType) {
	          this.data = [].concat(_toConsumableArray$5(this.data.slice(0, index)), [evt.target.toObject()], _toConsumableArray$5(this.data.slice(index + 1)));
	        }
	        this._triggerChange({
	          type: 'property',
	          target: this._getData(evt.target),
	          query: this,
	          isChange: true,
	          changes: evt.changes
	        });
	      }
	    }

	    /*
	     * Note: Earlier versions of this iterated over each item, inserted it and when all items were inserted,
	     * triggered events indicating the index at which they were inserted.
	     *
	     * This caused the following problem:
	     *
	     * 1. Insert messages newest message at position 0 and second newest message at position 1
	     * 2. Trigger events in the order they arrive: second newest gets inserted at index 1, newest gets inserted at index 0
	     * 3. UI on receiving the second newest event does yet have the newest event, and on inserting it at position 1
	     *    is actually inserting it at the wrong place because position 0 is occupied by an older message at this time.
	     *
	     * Solution: We must iterate over all items, and process them entirely one at a time.
	     * Drawback: After an Event.replay we may get a lot of add events, we may need a way to do an event that inserts a set of messages
	     * instead of triggering lots of individual rendering-causing events
	     */

	  }, {
	    key: '_handleAddEvent',
	    value: function _handleAddEvent(name, evt) {
	      var _this4 = this;

	      // Only use added messages that are part of this Conversation
	      // and not already in our result set
	      var list = evt[name]
	      // Filter so that we only see Messages if doing a Messages query or Announcements if doing an Announcements Query.
	      .filter(function (message) {
	        var type = Util$11.typeFromID(message.id);
	        return type === 'messages' && _this4.model === Query$6.Message || type === 'announcements' && _this4.model === Query$6.Announcement;
	      })
	      // Filter out Messages that aren't part of this Conversation
	      .filter(function (message) {
	        var type = Util$11.typeFromID(message.id);
	        return type === 'announcements' || message.conversationId === _this4._predicate;
	      })
	      // Filter out Messages that are already in our data set
	      .filter(function (message) {
	        return _this4._getIndex(message.id) === -1;
	      }).map(function (message) {
	        return _this4._getData(message);
	      });

	      // Add them to our result set and trigger an event for each one
	      if (list.length) {
	        var data = this.data = this.dataType === Query$6.ObjectDataType ? [].concat(this.data) : this.data;
	        list.forEach(function (item) {
	          var index = _this4._getInsertIndex(item, data);
	          data.splice(index, 0, item);
	          if (index !== 0) Logger$5.warn('Index of ' + item.id + ' is ' + index + '; position is ' + item.position + '; compared to ' + data[0].position);

	          _this4.totalSize += 1;

	          _this4._triggerChange({
	            type: 'insert',
	            target: item,
	            query: _this4,
	            index: index
	          });
	        });
	      }
	    }
	  }, {
	    key: '_handleRemoveEvent',
	    value: function _handleRemoveEvent(name, evt) {
	      var _this5 = this;

	      var removed = [];
	      evt[name].forEach(function (message) {
	        var index = _this5._getIndex(message.id);
	        if (index !== -1) {
	          if (message.id === _this5._nextDBFromId) _this5._nextDBFromId = _this5._updateNextFromId(index);
	          if (message.id === _this5._nextServerFromId) _this5._nextServerFromId = _this5._updateNextFromId(index);
	          removed.push({
	            data: message,
	            index: index
	          });
	          if (_this5.dataType === Query$6.ObjectDataType) {
	            _this5.data = [].concat(_toConsumableArray$5(_this5.data.slice(0, index)), _toConsumableArray$5(_this5.data.slice(index + 1)));
	          } else {
	            _this5.data.splice(index, 1);
	          }
	        }
	      });

	      this.totalSize -= removed.length;
	      removed.forEach(function (removedObj) {
	        _this5._triggerChange({
	          type: 'remove',
	          target: _this5._getData(removedObj.data),
	          index: removedObj.index,
	          query: _this5
	        });
	      });
	    }
	  }]);

	  return MessagesQuery;
	}(Query$6);

	MessagesQuery$1._supportedEvents = [].concat(Query$6._supportedEvents);

	MessagesQuery$1.MaxPageSize = 100;

	MessagesQuery$1.prototype.model = Query$6.Message;

	Root$26.initClass.apply(MessagesQuery$1, [MessagesQuery$1, 'MessagesQuery']);

	var messagesQuery = MessagesQuery$1;

	var _createClass$35 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck$35(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$28(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$28(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * Query class for running a Query on Announcements
	 *
	 *      var announcementQuery = client.createQuery({
	 *        client: client,
	 *        model: layer.Query.Announcement
	 *      });
	 *
	 *
	 * You can change the `paginationWindow` property at any time using:
	 *
	 *      query.update({
	 *        paginationWindow: 200
	 *      });
	 *
	 * You can release data held in memory by your queries when done with them:
	 *
	 *      query.destroy();
	 *
	 * @class  layer.AnnouncementsQuery
	 * @extends layer.Query
	 */
	var Root$27 = root;
	var Query$7 = query;
	var MessagesQuery$2 = messagesQuery;

	var AnnouncementsQuery$1 = function (_MessagesQuery) {
	  _inherits$28(AnnouncementsQuery, _MessagesQuery);

	  function AnnouncementsQuery() {
	    _classCallCheck$35(this, AnnouncementsQuery);

	    return _possibleConstructorReturn$28(this, (AnnouncementsQuery.__proto__ || Object.getPrototypeOf(AnnouncementsQuery)).apply(this, arguments));
	  }

	  _createClass$35(AnnouncementsQuery, [{
	    key: '_fixPredicate',
	    value: function _fixPredicate(inValue) {
	      return Query$7.prototype._fixPredicate.apply(this, [inValue]);
	    }
	  }, {
	    key: '_fetchData',
	    value: function _fetchData(pageSize) {
	      var _this2 = this;

	      // Retrieve data from db cache in parallel with loading data from server
	      this.client.dbManager.loadAnnouncements(this._nextDBFromId, pageSize, function (messages) {
	        if (messages.length) _this2._appendResults({ data: messages }, true);
	      });

	      var newRequest = 'announcements?page_size=' + pageSize + (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

	      // Don't repeat still firing queries
	      if (newRequest !== this._firingRequest) {
	        this.isFiring = true;
	        this._firingRequest = newRequest;
	        this.client.xhr({
	          telemetry: {
	            name: 'announcement_query_time'
	          },
	          url: newRequest,
	          method: 'GET',
	          sync: false
	        }, function (results) {
	          return _this2._processRunResults(results, newRequest, pageSize);
	        });
	      }
	    }
	  }]);

	  return AnnouncementsQuery;
	}(MessagesQuery$2);

	AnnouncementsQuery$1._supportedEvents = [].concat(MessagesQuery$2._supportedEvents);

	AnnouncementsQuery$1.MaxPageSize = 100;

	AnnouncementsQuery$1.prototype.model = Query$7.Announcement;

	Root$27.initClass.apply(AnnouncementsQuery$1, [AnnouncementsQuery$1, 'AnnouncementsQuery']);

	var announcementsQuery = AnnouncementsQuery$1;

	/**
	 *
	 * Adds Query handling to the layer.Client.
	 *
	 * @class layer.mixins.ClientQueries
	 */

	var Query = query;
	var IdentitiesQuery = identitiesQuery;
	var ConversationsQuery = conversationsQuery;
	var ChannelsQuery = channelsQuery;
	var MembersQuery = membersQuery;
	var MessagesQuery = messagesQuery;
	var AnnouncementsQuery = announcementsQuery;
	var ErrorDictionary$1 = layerError.dictionary;

	var clientQueries = {
	  events: [],
	  lifecycle: {
	    constructor: function constructor(options) {
	      this._models.queries = {};
	    },
	    cleanup: function cleanup() {
	      var _this = this;

	      Object.keys(this._models.queries).forEach(function (id) {
	        var query$$1 = _this._models.queries[id];
	        if (query$$1 && !query$$1.isDestroyed) {
	          query$$1.destroy();
	        }
	      });
	      this._models.queries = null;
	    },
	    reset: function reset() {
	      this._models.queries = {};
	    }
	  },
	  methods: {
	    /**
	     * Retrieve the query by query id.
	     *
	     * Useful for finding a Query when you only have the ID
	     *
	     * @method getQuery
	     * @param  {string} id              - layer:///queries/uuid
	     * @return {layer.Query}
	     */
	    getQuery: function getQuery(id) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$1.idParamRequired);
	      return this._models.queries[id] || null;
	    },


	    /**
	     * There are two options to create a new layer.Query instance.
	     *
	     * The direct way:
	     *
	     *     var query = client.createQuery({
	     *         model: layer.Query.Message,
	     *         predicate: 'conversation.id = '' + conv.id + ''',
	     *         paginationWindow: 50
	     *     });
	     *
	     * A Builder approach that allows for a simpler syntax:
	     *
	     *     var qBuilder = QueryBuilder
	     *      .messages()
	     *      .forConversation('layer:///conversations/ffffffff-ffff-ffff-ffff-ffffffffffff')
	     *      .paginationWindow(100);
	     *     var query = client.createQuery(qBuilder);
	     *
	     * @method createQuery
	     * @param  {layer.QueryBuilder|Object} options - Either a layer.QueryBuilder instance, or parameters for the layer.Query constructor
	     * @return {layer.Query}
	     */
	    createQuery: function createQuery(options) {
	      var query$$1 = void 0;

	      if (typeof options.build === 'function') {
	        options = options.build();
	      }
	      options.client = this;
	      switch (options.model) {
	        case Query.Identity:
	          query$$1 = new IdentitiesQuery(options);
	          break;
	        case Query.Conversation:
	          query$$1 = new ConversationsQuery(options);
	          break;
	        case Query.Channel:
	          query$$1 = new ChannelsQuery(options);
	          break;
	        case Query.Membership:
	          query$$1 = new MembersQuery(options);
	          break;
	        case Query.Message:
	          query$$1 = new MessagesQuery(options);
	          break;
	        case Query.Announcement:
	          query$$1 = new AnnouncementsQuery(options);
	          break;

	        default:
	          query$$1 = new Query(options);
	      }
	      this._addQuery(query$$1);
	      return query$$1;
	    },


	    /**
	     * Register the layer.Query.
	     *
	     * @method _addQuery
	     * @private
	     * @param  {layer.Query} query
	     */
	    _addQuery: function _addQuery(query$$1) {
	      this._models.queries[query$$1.id] = query$$1;
	    },


	    /**
	     * Deregister the layer.Query.
	     *
	     * @method _removeQuery
	     * @private
	     * @param  {layer.Query} query [description]
	     */
	    _removeQuery: function _removeQuery(query$$1) {
	      var _this2 = this;

	      if (query$$1) {
	        delete this._models.queries[query$$1.id];
	        if (!this._inCleanup) {
	          var data = query$$1.data.map(function (obj) {
	            return _this2.getObject(obj.id);
	          }).filter(function (obj) {
	            return obj;
	          });
	          this._checkAndPurgeCache(data);
	        }
	        this.off(null, null, query$$1);
	      }
	    }
	  }
	};

	/**
	 * Adds Identity handling to the layer.Client.
	 *
	 * @class layer.mixins.ClientIdentities
	 */

	var Identity$4 = identity;
	var ErrorDictionary$2 = layerError.dictionary;
	var _require$12 = syncEvent;
	var WebsocketSyncEvent$3 = _require$12.WebsocketSyncEvent;

	var clientIdentities = {
	  events: [
	  /**
	   * A call to layer.Identity.load has completed successfully
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Identity} evt.target
	   */
	  'identities:loaded',

	  /**
	   * A call to layer.Identity.load has failed
	   *
	   * @event
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.LayerError} evt.error
	   */
	  'identities:loaded-error',

	  /**
	   * An Identity has had a change in its properties.
	   *
	   * Changes occur when new data arrives from the server.
	   *
	   *      client.on('identities:change', function(evt) {
	   *          var displayNameChanges = evt.getChangesFor('displayName');
	   *          if (displayNameChanges.length) {
	   *              myView.renderStatus(evt.target);
	   *          }
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Identity} evt.target
	   * @param {Object[]} evt.changes
	   * @param {Mixed} evt.changes.newValue
	   * @param {Mixed} evt.changes.oldValue
	   * @param {string} evt.changes.property - Name of the property that has changed
	   */
	  'identities:change',

	  /**
	   * Identities have been added to the Client.
	   *
	   * This event is triggered whenever a new layer.Identity (Full identity or not)
	   * has been received by the Client.
	   *
	          client.on('identities:add', function(evt) {
	              evt.identities.forEach(function(identity) {
	                  myView.addIdentity(identity);
	              });
	          });
	  *
	  * @event
	  * @param {layer.LayerEvent} evt
	  * @param {layer.Identity[]} evt.identities
	  */
	  'identities:add',

	  /**
	   * Identities have been removed from the Client.
	   *
	   * This does not typically occur.
	   *
	          client.on('identities:remove', function(evt) {
	              evt.identities.forEach(function(identity) {
	                  myView.addIdentity(identity);
	              });
	          });
	  *
	  * @event
	  * @param {layer.LayerEvent} evt
	  * @param {layer.Identity[]} evt.identities
	  */
	  'identities:remove',

	  /**
	   * An Identity has been unfollowed or deleted.
	   *
	   * We do not delete such Identities entirely from the Client as
	   * there are still Messages from these Identities to be rendered,
	   * but we do downgrade them from Full Identity to Basic Identity.
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Identity} evt.target
	   */
	  'identities:unfollow'],
	  lifecycle: {
	    constructor: function constructor(options) {
	      this._models.identities = {};
	      this._loadPresenceIds = [];
	    },
	    cleanup: function cleanup() {
	      var _this = this;

	      Object.keys(this._models.identities).forEach(function (id) {
	        var identity$$2 = _this._models.identities[id];
	        if (identity$$2 && !identity$$2.isDestroyed) {
	          identity$$2.destroy();
	        }
	      });
	      this._models.identities = null;
	    },
	    reset: function reset() {
	      this._models.identities = {};
	    }
	  },
	  methods: {
	    /**
	     * Retrieve a identity by Identifier.
	     *
	     *      var identity = client.getIdentity('layer:///identities/user_id');
	     *
	     * If there is not an Identity with that id, it will return null.
	     *
	     * If you want it to load it from cache and then from server if not in cache, use the `canLoad` parameter.
	     * This is only supported for User Identities, not Service Identities.
	     *
	     * If loading from the server, the method will return
	     * a layer.Identity instance that has no data; the identities:loaded/identities:loaded-error events
	     * will let you know when the identity has finished/failed loading from the server.
	     *
	     *      var user = client.getIdentity('layer:///identities/123', true)
	     *      .on('identities:loaded', function() {
	     *          // Render the user list with all of its details loaded
	     *          myrerender(user);
	     *      });
	     *      // Render a placeholder for user until the details of user have loaded
	     *      myrender(user);
	     *
	     * @method getIdentity
	     * @param  {string} id - Accepts full Layer ID (layer:///identities/frodo-the-dodo) or just the UserID (frodo-the-dodo).
	     * @param  {boolean} [canLoad=false] - Pass true to allow loading an identity from
	     *                                    the server if not found
	     * @return {layer.Identity}
	     */
	    getIdentity: function getIdentity(id, canLoad) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$2.idParamRequired);
	      if (!Identity$4.isValidId(id)) {
	        id = Identity$4.prefixUUID + encodeURIComponent(id);
	      }

	      if (this._models.identities[id]) {
	        return this._models.identities[id];
	      } else if (canLoad) {
	        return Identity$4.load(id, this);
	      }
	      return null;
	    },


	    /**
	     * Adds an identity to the client.
	     *
	     * Typically, you do not need to call this; the Identity constructor will call this.
	     *
	     * @method _addIdentity
	     * @protected
	     * @param  {layer.Identity} identity
	     *
	     * TODO: It should be possible to add an Identity whose userId is populated, but
	     * other values are not yet loaded from the server.  Should add to _models.identities now
	     * but trigger `identities:add` only when its got enough data to be renderable.
	     */
	    _addIdentity: function _addIdentity(identity$$2) {
	      var _this2 = this;

	      var id = identity$$2.id;
	      if (id && !this._models.identities[id]) {
	        // Register the Identity
	        this._models.identities[id] = identity$$2;
	        this._triggerAsync('identities:add', { identities: [identity$$2] });

	        /* Bot messages from SAPI 1.0 generate an Identity that has no `id` */
	        if (identity$$2.id && identity$$2._presence.status === null && !identity$$2.sessionOwner) {
	          this._loadPresenceIds.push(id);
	          if (this._loadPresenceIds.length === 1) {
	            setTimeout(function () {
	              if (!_this2.isDestroyed) _this2._loadPresence();
	            }, 150);
	          }
	        }
	      }
	    },


	    /**
	     * Removes an identity from the client.
	     *
	     * Typically, you do not need to call this; the following code
	     * automatically calls _removeIdentity for you:
	     *
	     *      identity.destroy();
	     *
	     * @method _removeIdentity
	     * @protected
	     * @param  {layer.Identity} identity
	     */
	    _removeIdentity: function _removeIdentity(identity$$2) {
	      // Insure we do not get any events, such as message:remove
	      identity$$2.off(null, null, this);

	      var id = identity$$2.id;
	      if (this._models.identities[id]) {
	        delete this._models.identities[id];
	        this._triggerAsync('identities:remove', { identities: [identity$$2] });
	      }
	    },


	    /**
	     * Follow this user and get Full Identity, and websocket changes on Identity.
	     *
	     * @method followIdentity
	     * @param  {string} id - Accepts full Layer ID (layer:///identities/frodo-the-dodo) or just the UserID (frodo-the-dodo).
	     * @returns {layer.Identity}
	     */
	    followIdentity: function followIdentity(id) {
	      if (!Identity$4.isValidId(id)) {
	        id = Identity$4.prefixUUID + encodeURIComponent(id);
	      }
	      var identity$$2 = this.getIdentity(id);
	      if (!identity$$2) {
	        identity$$2 = new Identity$4({
	          id: id,
	          clientId: this.appId,
	          userId: id.substring(20)
	        });
	      }
	      identity$$2.follow();
	      return identity$$2;
	    },


	    /**
	     * Unfollow this user and get only Basic Identity, and no websocket changes on Identity.
	     *
	     * @method unfollowIdentity
	     * @param  {string} id - Accepts full Layer ID (layer:///identities/frodo-the-dodo) or just the UserID (frodo-the-dodo).
	     * @returns {layer.Identity}
	     */
	    unfollowIdentity: function unfollowIdentity(id) {
	      if (!Identity$4.isValidId(id)) {
	        id = Identity$4.prefixUUID + encodeURIComponent(id);
	      }
	      var identity$$2 = this.getIdentity(id);
	      if (!identity$$2) {
	        identity$$2 = new Identity$4({
	          id: id,
	          clientId: this.appId,
	          userId: id.substring(20)
	        });
	      }
	      identity$$2.unfollow();
	      return identity$$2;
	    },


	    /**
	     * Load presence data for a batch of Idenity IDs.
	     *
	     * TODO: This uses the syncManager to request presence because the syncManager
	     *   knows how to wait until the websocket is connected, and retry until the request completes.
	     *   BUT: this is not ideal, because it must wait if there are any other requests already queued;
	     *   this is a READ not a WRITE and should not have to wait.
	     *
	     * @method _loadPresence
	     * @private
	     */
	    _loadPresence: function _loadPresence() {
	      var ids = this._loadPresenceIds;
	      this._loadPresenceIds = [];
	      this.syncManager.request(new WebsocketSyncEvent$3({
	        data: {
	          method: 'Presence.sync',
	          data: { ids: ids }
	        },
	        returnChangesArray: true,
	        operation: 'READ',
	        target: null,
	        depends: []
	      }));
	    }
	  }
	};

	/**
	 * Adds Channel Membership handling to the layer.Client.
	 *
	 * @class layer.mixins.ClientMembership
	 */

	var Syncable$8 = syncable;
	var ErrorDictionary$3 = layerError.dictionary;

	var clientMembers = {
	  events: [
	  /**
	   * A call to layer.Membership.load has completed successfully
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Membership} evt.target
	   */
	  'members:loaded',

	  /**
	   * An Identity has had a change in its properties.
	   *
	   * Changes occur when new data arrives from the server.
	   *
	   *      client.on('members:change', function(evt) {
	   *          var displayNameChanges = evt.getChangesFor('displayName');
	   *          if (displayNameChanges.length) {
	   *              myView.renderStatus(evt.target);
	   *          }
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Membership} evt.target
	   * @param {Object[]} evt.changes
	   * @param {Mixed} evt.changes.newValue
	   * @param {Mixed} evt.changes.oldValue
	   * @param {string} evt.changes.property - Name of the property that has changed
	   */
	  'members:change',

	  /**
	   * A new Member has been added to the Client.
	   *
	   * This event is triggered whenever a new layer.Membership
	   * has been received by the Client.
	   *
	          client.on('members:add', function(evt) {
	              evt.membership.forEach(function(member) {
	                  myView.addMember(member);
	              });
	          });
	  *
	  * @event
	  * @param {layer.LayerEvent} evt
	  * @param {layer.Membership[]} evt.membership
	  */
	  'members:add',

	  /**
	   * A Member has been removed from the Client.
	   *
	   * This does not typically occur.
	   *
	          client.on('members:remove', function(evt) {
	              evt.membership.forEach(function(member) {
	                  myView.addMember(member);
	              });
	          });
	  *
	  * @event
	  * @param {layer.LayerEvent} evt
	  * @param {layer.Membership[]} evt.membership
	  */
	  'members:remove'],
	  lifecycle: {
	    constructor: function constructor(options) {
	      this._models.members = {};
	    },
	    cleanup: function cleanup() {
	      var _this = this;

	      Object.keys(this._models.members).forEach(function (id) {
	        var member = _this._models.members[id];
	        if (member && !member.isDestroyed) {
	          member.destroy();
	        }
	      });
	      this._models.members = null;
	    },
	    reset: function reset() {
	      this._models.members = {};
	    }
	  },
	  methods: {
	    /**
	     * Retrieve the membership info by ID.
	     *
	     * Not for use in typical apps.
	     *
	     * @method getMember
	     * @param  {string} id               - layer:///channels/uuid/members/user_id
	     * @param  {boolean} [canLoad=false] - Pass true to allow loading a member from the server if not found
	     * @return {layer.Membership}
	     */
	    getMember: function getMember(id, canLoad) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$3.idParamRequired);

	      if (this._models.members[id]) {
	        return this._models.members[id];
	      } else if (canLoad) {
	        return Syncable$8.load(id, this);
	      }
	      return null;
	    },


	    /**
	     * Report that a new Membership has been added.
	     *
	     * @method _addMembership
	     * @protected
	     * @param  {layer.Membership} member
	     *
	     */
	    _addMembership: function _addMembership(member) {
	      if (!this._models.members[member.id]) {
	        this._models.members[member.id] = member;
	        this._triggerAsync('members:add', { members: [member] });
	        this._scheduleCheckAndPurgeCache(member);
	      }
	    },


	    /**
	     * Report that a member has been removed from the client.
	     *
	     * @method _removeMembership
	     * @protected
	     * @param  {layer.Membership} member
	     */
	    _removeMembership: function _removeMembership(member) {
	      var id = typeof member === 'string' ? member : member.id;
	      member = this._models.members[id];
	      if (member) {
	        delete this._models.members[id];
	        if (!this._inCleanup) {
	          member.off(null, null, this);
	          this._triggerAsync('members:remove', { members: [member] });
	        }
	      }
	    }
	  }
	};

	/**
	 * Adds Conversation handling to the layer.Client.
	 *
	 * @class layer.mixins.ClientConversations
	 */

	var Conversation$3 = conversation;
	var ErrorDictionary$4 = layerError.dictionary;

	var clientConversations = {
	  events: [
	  /**
	   * One or more layer.Conversation objects have been added to the client.
	   *
	   * They may have been added via the websocket, or via the user creating
	   * a new Conversation locally.
	   *
	   *      client.on('conversations:add', function(evt) {
	   *          evt.conversations.forEach(function(conversation) {
	   *              myView.addConversation(conversation);
	   *          });
	   *      });
	   *
	   * @event conversations_add
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Conversation[]} evt.conversations - Array of conversations added
	   */
	  'conversations:add',

	  /**
	   * One or more layer.Conversation objects have been removed.
	   *
	   * A removed Conversation is not necessarily deleted, its just
	   * no longer being held in local memory.
	   *
	   * Note that typically you will want the conversations:delete event
	   * rather than conversations:remove.
	   *
	   *      client.on('conversations:remove', function(evt) {
	   *          evt.conversations.forEach(function(conversation) {
	   *              myView.removeConversation(conversation);
	   *          });
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Conversation[]} evt.conversations - Array of conversations removed
	   */
	  'conversations:remove',

	  /**
	   * The conversation is now on the server.
	   *
	   * Called after creating the conversation
	   * on the server.  The Result property is one of:
	   *
	   * * layer.Conversation.CREATED: A new Conversation has been created
	   * * layer.Conversation.FOUND: A matching Distinct Conversation has been found
	   * * layer.Conversation.FOUND_WITHOUT_REQUESTED_METADATA: A matching Distinct Conversation has been found
	   *                       but note that the metadata is NOT what you requested.
	   *
	   * All of these results will also mean that the updated property values have been
	   * copied into your Conversation object.  That means your metadata property may no
	   * longer be its initial value; it will be the value found on the server.
	   *
	   *      client.on('conversations:sent', function(evt) {
	   *          switch(evt.result) {
	   *              case Conversation.CREATED:
	   *                  alert(evt.target.id + ' Created!');
	   *                  break;
	   *              case Conversation.FOUND:
	   *                  alert(evt.target.id + ' Found!');
	   *                  break;
	   *              case Conversation.FOUND_WITHOUT_REQUESTED_METADATA:
	   *                  alert(evt.target.id + ' Found, but does not have the requested metadata!');
	   *                  break;
	   *          }
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} event
	   * @param {string} event.result
	   * @param {layer.Conversation} target
	   */
	  'conversations:sent',

	  /**
	   * A conversation failed to load or create on the server.
	   *
	   *      client.on('conversations:sent-error', function(evt) {
	   *          alert(evt.data.message);
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.LayerError} evt.data
	   * @param {layer.Conversation} target
	   */
	  'conversations:sent-error',

	  /**
	   * A conversation had a change in its properties.
	   *
	   * This change may have been delivered from a remote user
	   * or as a result of a local operation.
	   *
	   *      client.on('conversations:change', function(evt) {
	   *          var metadataChanges = evt.getChangesFor('metadata');
	   *          var participantChanges = evt.getChangesFor('participants');
	   *          if (metadataChanges.length) {
	   *              myView.renderTitle(evt.target.metadata.title);
	   *          }
	   *          if (participantChanges.length) {
	   *              myView.renderParticipants(evt.target.participants);
	   *          }
	   *      });
	   *
	   * NOTE: Typically such rendering is done using Events on layer.Query.
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Conversation} evt.target
	   * @param {Object[]} evt.changes
	   * @param {Mixed} evt.changes.newValue
	   * @param {Mixed} evt.changes.oldValue
	   * @param {string} evt.changes.property - Name of the property that has changed
	   */
	  'conversations:change',

	  /**
	   * A call to layer.Conversation.load has completed successfully
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Conversation} evt.target
	   */
	  'conversations:loaded',

	  /**
	   * A Conversation has been deleted from the server.
	   *
	   * Caused by either a successful call to layer.Conversation.delete() on the Conversation
	   * or by a remote user.
	   *
	   *      client.on('conversations:delete', function(evt) {
	   *          myView.removeConversation(evt.target);
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Conversation} evt.target
	   */
	  'conversations:delete'],
	  lifecycle: {
	    constructor: function constructor(options) {
	      this._models.conversations = {};
	    },
	    cleanup: function cleanup() {
	      var _this = this;

	      Object.keys(this._models.conversations).forEach(function (id) {
	        var conversation$$2 = _this._models.conversations[id];
	        if (conversation$$2 && !conversation$$2.isDestroyed) {
	          conversation$$2.destroy();
	        }
	      });
	      this._models.conversations = null;
	    },
	    reset: function reset() {
	      this._models.conversations = {};
	    }
	  },
	  methods: {
	    /**
	     * Retrieve a conversation by Identifier.
	     *
	     *      var c = client.getConversation('layer:///conversations/uuid');
	     *
	     * If there is not a conversation with that id, it will return null.
	     *
	     * If you want it to load it from cache and then from server if not in cache, use the `canLoad` parameter.
	     * If loading from the server, the method will return
	     * a layer.Conversation instance that has no data; the `conversations:loaded` / `conversations:loaded-error` events
	     * will let you know when the conversation has finished/failed loading from the server.
	     *
	     *      var c = client.getConversation('layer:///conversations/123', true)
	     *      .on('conversations:loaded', function() {
	     *          // Render the Conversation with all of its details loaded
	     *          myrerender(c);
	     *      });
	     *      // Render a placeholder for c until the details of c have loaded
	     *      myrender(c);
	     *
	     * Note in the above example that the `conversations:loaded` event will trigger even if the Conversation has previously loaded.
	     *
	     * @method getConversation
	     * @param  {string} id
	     * @param  {boolean} [canLoad=false] - Pass true to allow loading a conversation from
	     *                                    the server if not found
	     * @return {layer.Conversation}
	     */
	    getConversation: function getConversation(id, canLoad) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$4.idParamRequired);
	      if (!Conversation$3.isValidId(id)) {
	        id = Conversation$3.prefixUUID + id;
	      }
	      if (this._models.conversations[id]) {
	        return this._models.conversations[id];
	      } else if (canLoad) {
	        return Conversation$3.load(id, this);
	      }
	      return null;
	    },


	    /**
	     * Adds a conversation to the client.
	     *
	     * Typically, you do not need to call this; the following code
	     * automatically calls _addConversation for you:
	     *
	     *      var conv = new layer.Conversation({
	     *          client: client,
	     *          participants: ['a', 'b']
	     *      });
	     *
	     *      // OR:
	     *      var conv = client.createConversation(['a', 'b']);
	     *
	     * @method _addConversation
	     * @protected
	     * @param  {layer.Conversation} c
	     */
	    _addConversation: function _addConversation(conversation$$2) {
	      var id = conversation$$2.id;
	      if (!this._models.conversations[id]) {
	        // Register the Conversation
	        this._models.conversations[id] = conversation$$2;

	        // Make sure the client is set so that the next event bubbles up
	        if (conversation$$2.clientId !== this.appId) conversation$$2.clientId = this.appId;
	        this._triggerAsync('conversations:add', { conversations: [conversation$$2] });
	      }
	    },


	    /**
	     * Removes a conversation from the client.
	     *
	     * Typically, you do not need to call this; the following code
	     * automatically calls _removeConversation for you:
	     *
	     *      conversation.destroy();
	     *
	     * @method _removeConversation
	     * @protected
	     * @param  {layer.Conversation} c
	     */
	    _removeConversation: function _removeConversation(conversation$$2) {
	      var _this2 = this;

	      // Insure we do not get any events, such as message:remove
	      conversation$$2.off(null, null, this);

	      if (this._models.conversations[conversation$$2.id]) {
	        delete this._models.conversations[conversation$$2.id];
	        this._triggerAsync('conversations:remove', { conversations: [conversation$$2] });
	      }

	      // Remove any Message associated with this Conversation
	      Object.keys(this._models.messages).forEach(function (id) {
	        if (_this2._models.messages[id].conversationId === conversation$$2.id) {
	          _this2._models.messages[id].destroy();
	        }
	      });
	    },


	    /**
	     * If the Conversation ID changes, we need to reregister the Conversation
	     *
	     * @method _updateConversationId
	     * @protected
	     * @param  {layer.Conversation} conversation - Conversation whose ID has changed
	     * @param  {string} oldId - Previous ID
	     */
	    _updateConversationId: function _updateConversationId(conversation$$2, oldId) {
	      var _this3 = this;

	      if (this._models.conversations[oldId]) {
	        this._models.conversations[conversation$$2.id] = conversation$$2;
	        delete this._models.conversations[oldId];

	        // This is a nasty way to work... but need to find and update all
	        // conversationId properties of all Messages or the Query's won't
	        // see these as matching the query.
	        Object.keys(this._models.messages).filter(function (id) {
	          return _this3._models.messages[id].conversationId === oldId;
	        }).forEach(function (id) {
	          return _this3._models.messages[id].conversationId = conversation$$2.id;
	        });
	      }
	    },


	    /**
	     * Searches locally cached conversations for a matching conversation.
	     *
	     * Iterates over conversations calling a matching function until
	     * the conversation is found or all conversations tested.
	     *
	     *      var c = client.findCachedConversation(function(conversation) {
	     *          if (conversation.participants.indexOf('a') != -1) return true;
	     *      });
	     *
	     * @method findCachedConversation
	     * @param  {Function} f - Function to call until we find a match
	     * @param  {layer.Conversation} f.conversation - A conversation to test
	     * @param  {boolean} f.return - Return true if the conversation is a match
	     * @param  {Object} [context] - Optional context for the *this* object
	     * @return {layer.Conversation}
	     *
	     * @deprecated
	     * This should be replaced by iterating over your layer.Query data.
	     */
	    findCachedConversation: function findCachedConversation(func, context) {
	      var test = context ? func.bind(context) : func;
	      var list = Object.keys(this._models.conversations);
	      var len = list.length;
	      for (var index = 0; index < len; index++) {
	        var key = list[index];
	        var conversation$$2 = this._models.conversations[key];
	        if (test(conversation$$2, index)) return conversation$$2;
	      }
	      return null;
	    },


	    /**
	     * This method is recommended way to create a Conversation.
	     *
	     * There are a few ways to invoke it; note that the default behavior is to create a Distinct Conversation
	     * unless otherwise stated via the layer.Conversation.distinct property.
	     *
	     *         client.createConversation({participants: ['a', 'b']});
	     *         client.createConversation({participants: [userIdentityA, userIdentityB]});
	     *
	     *         client.createConversation({
	     *             participants: ['a', 'b'],
	     *             distinct: false
	     *         });
	     *
	     *         client.createConversation({
	     *             participants: ['a', 'b'],
	     *             metadata: {
	     *                 title: 'I am a title'
	     *             }
	     *         });
	     *
	     * If you try to create a Distinct Conversation that already exists,
	     * you will get back an existing Conversation, and any requested metadata
	     * will NOT be set; you will get whatever metadata the matching Conversation
	     * already had.
	     *
	     * The default value for distinct is `true`.
	     *
	     * Whether the Conversation already exists or not, a 'conversations:sent' event
	     * will be triggered asynchronously and the Conversation object will be ready
	     * at that time.  Further, the event will provide details on the result:
	     *
	     *       var conversation = client.createConversation({
	     *          participants: ['a', 'b'],
	     *          metadata: {
	     *            title: 'I am a title'
	     *          }
	     *       });
	     *       conversation.on('conversations:sent', function(evt) {
	     *           switch(evt.result) {
	     *               case Conversation.CREATED:
	     *                   alert(conversation.id + ' was created');
	     *                   break;
	     *               case Conversation.FOUND:
	     *                   alert(conversation.id + ' was found');
	     *                   break;
	     *               case Conversation.FOUND_WITHOUT_REQUESTED_METADATA:
	     *                   alert(conversation.id + ' was found but it already has a title so your requested title was not set');
	     *                   break;
	     *            }
	     *       });
	     *
	     * Warning: This method will throw an error if called when you are not (or are no longer) an authenticated user.
	     * That means if authentication has expired, and you have not yet reauthenticated the user, this will throw an error.
	     *
	     *
	     * @method createConversation
	     * @param  {Object} options
	     * @param {string[]/layer.Identity[]} participants - Array of UserIDs or UserIdentities
	     * @param {Boolean} [options.distinct=true] Is this a distinct Conversation?
	     * @param {Object} [options.metadata={}] Metadata for your Conversation
	     * @return {layer.Conversation}
	     */
	    createConversation: function createConversation(options) {
	      // If we aren't authenticated, then we don't yet have a UserID, and won't create the correct Conversation
	      if (!this.isAuthenticated) throw new Error(ErrorDictionary$4.clientMustBeReady);
	      if (!('distinct' in options)) options.distinct = true;
	      options.client = this;
	      return Conversation$3.create(options);
	    }
	  }
	};

	/**
	 * Adds Channel handling to the layer.Client.
	 *
	 * @class layer.mixins.ClientChannels
	 */

	var Channel$3 = channel;
	var ErrorDictionary$5 = layerError.dictionary;

	var clientChannels = {
	  events: [
	  /**
	   * One or more layer.Channel objects have been added to the client.
	   *
	   * They may have been added via the websocket, or via the user creating
	   * a new Channel locally.
	   *
	   *      client.on('channels:add', function(evt) {
	   *          evt.channels.forEach(function(channel) {
	   *              myView.addChannel(channel);
	   *          });
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Channel[]} evt.channels - Array of channels added
	   */
	  'channels:add',

	  /**
	   * One or more layer.Channel objects have been removed.
	   *
	   * A removed Channel is not necessarily deleted, its just
	   * no longer being held in local memory.
	   *
	   * Note that typically you will want the channels:delete event
	   * rather than channels:remove.
	   *
	   *      client.on('channels:remove', function(evt) {
	   *          evt.channels.forEach(function(channel) {
	   *              myView.removeChannel(channel);
	   *          });
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Channel[]} evt.channels - Array of channels removed
	   */
	  'channels:remove',

	  /**
	   * A channel had a change in its properties.
	   *
	   * This change may have been delivered from a remote user
	   * or as a result of a local operation.
	   *
	   *      client.on('channels:change', function(evt) {
	   *          var metadataChanges = evt.getChangesFor('metadata');
	   *          var participantChanges = evt.getChangesFor('members');
	   *          if (metadataChanges.length) {
	   *              myView.renderTitle(evt.target.metadata.title);
	   *          }
	   *          if (participantChanges.length) {
	   *              myView.rendermembers(evt.target.members);
	   *          }
	   *      });
	   *
	   * NOTE: Typically such rendering is done using Events on layer.Query.
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Channel} evt.target
	   * @param {Object[]} evt.changes
	   * @param {Mixed} evt.changes.newValue
	   * @param {Mixed} evt.changes.oldValue
	   * @param {string} evt.changes.property - Name of the property that has changed
	   */
	  'channels:change',

	  /**
	   * A call to layer.Channel.load has completed successfully
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Channel} evt.target
	   */
	  'channels:loaded',

	  /**
	   * A Channel has been deleted from the server.
	   *
	   * Caused by either a successful call to layer.Channel.delete() on the Channel
	   * or by a remote user.
	   *
	   *      client.on('channels:delete', function(evt) {
	   *          myView.removeChannel(evt.target);
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Channel} evt.target
	   */
	  'channels:delete',

	  /**
	   * The channel is now on the server.
	   *
	   * Called after creating the channel
	   * on the server.  The Result property is one of:
	   *
	   * * layer.Channel.CREATED: A new Channel has been created
	   * * layer.Channel.FOUND: A matching Channel has been found
	   *
	   * All of these results will also mean that the updated property values have been
	   * copied into your Channel object.  That means your metadata property may no
	   * longer be its initial value; it will be the value found on the server.
	   *
	   *      client.on('channels:sent', function(evt) {
	   *          switch(evt.result) {
	   *              case Channel.CREATED:
	   *                  alert(evt.target.id + ' Created!');
	   *                  break;
	   *              case Channel.FOUND:
	   *                  alert(evt.target.id + ' Found!');
	   *                  break;
	   *          }
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} event
	   * @param {string} event.result
	   * @param {layer.Channel} target
	   */
	  'channels:sent',

	  /**
	   * A channel failed to load or create on the server.
	   *
	   *      client.on('channels:sent-error', function(evt) {
	   *          alert(evt.data.message);
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.LayerError} evt.data
	   * @param {layer.Channel} target
	   */
	  'channels:sent-error'],
	  lifecycle: {
	    constructor: function constructor(options) {
	      this._models.channels = {};
	    },
	    cleanup: function cleanup() {
	      var _this = this;

	      Object.keys(this._models.channels).forEach(function (id) {
	        var channel$$2 = _this._models.channels[id];
	        if (channel$$2 && !channel$$2.isDestroyed) {
	          channel$$2.destroy();
	        }
	      });
	      this._models.channels = null;
	    },
	    reset: function reset() {
	      this._models.channels = {};
	    }
	  },
	  methods: {
	    /**
	     * Retrieve a channel by Identifier.
	     *
	     *      var c = client.getChannel('layer:///channels/uuid');
	     *
	     * If there is not a channel with that id, it will return null.
	     *
	     * If you want it to load it from cache and then from server if not in cache, use the `canLoad` parameter.
	     * If loading from the server, the method will return
	     * a layer.Channel instance that has no data; the `channels:loaded` / `channels:loaded-error` events
	     * will let you know when the channel has finished/failed loading from the server.
	     *
	     *      var c = client.getChannel('layer:///channels/123', true)
	     *      .on('channels:loaded', function() {
	     *          // Render the Channel with all of its details loaded
	     *          myrerender(c);
	     *      });
	     *      // Render a placeholder for c until the details of c have loaded
	     *      myrender(c);
	     *
	     * Note in the above example that the `channels:loaded` event will trigger even if the Channel has previously loaded.
	     *
	     * @method getChannel
	     * @param  {string} id
	     * @param  {boolean} [canLoad=false] - Pass true to allow loading a channel from
	     *                                    the server if not found
	     * @return {layer.Channel}
	     */
	    getChannel: function getChannel(id, canLoad) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$5.idParamRequired);
	      if (!Channel$3.isValidId(id)) {
	        id = Channel$3.prefixUUID + id;
	      }
	      if (this._models.channels[id]) {
	        return this._models.channels[id];
	      } else if (canLoad) {
	        return Channel$3.load(id, this);
	      }
	      return null;
	    },


	    /**
	     * Adds a channel to the client.
	     *
	     * Typically, you do not need to call this; the following code
	     * automatically calls _addChannel for you:
	     *
	     *      var conv = new layer.Channel({
	     *          client: client,
	     *          members: ['a', 'b']
	     *      });
	     *
	     *      // OR:
	     *      var conv = client.createChannel(['a', 'b']);
	     *
	     * @method _addChannel
	     * @protected
	     * @param  {layer.Channel} c
	     */
	    _addChannel: function _addChannel(channel$$2) {
	      var id = channel$$2.id;
	      if (!this._models.channels[id]) {
	        // Register the Channel
	        this._models.channels[id] = channel$$2;

	        // Make sure the client is set so that the next event bubbles up
	        if (channel$$2.clientId !== this.appId) channel$$2.clientId = this.appId;
	        this._triggerAsync('channels:add', { channels: [channel$$2] });

	        this._scheduleCheckAndPurgeCache(channel$$2);
	      }
	    },


	    /**
	     * Removes a channel from the client.
	     *
	     * Typically, you do not need to call this; the following code
	     * automatically calls _removeChannel for you:
	     *
	     *      channel.destroy();
	     *
	     * @method _removeChannel
	     * @protected
	     * @param  {layer.Channel} c
	     */
	    _removeChannel: function _removeChannel(channel$$2) {
	      var _this2 = this;

	      // Insure we do not get any events, such as message:remove
	      channel$$2.off(null, null, this);

	      if (this._models.channels[channel$$2.id]) {
	        delete this._models.channels[channel$$2.id];
	        this._triggerAsync('channels:remove', { channels: [channel$$2] });
	      }

	      // Remove any Message associated with this Channel
	      Object.keys(this._models.messages).forEach(function (id) {
	        if (_this2._models.messages[id].channelId === channel$$2.id) {
	          _this2._models.messages[id].destroy();
	        }
	      });
	    },


	    /**
	     * If the Channel ID changes, we need to reregister the Channel
	     *
	     * @method _updateChannelId
	     * @protected
	     * @param  {layer.Channel} channel - Channel whose ID has changed
	     * @param  {string} oldId - Previous ID
	     */
	    _updateChannelId: function _updateChannelId(channel$$2, oldId) {
	      var _this3 = this;

	      if (this._models.channels[oldId]) {
	        this._models.channels[channel$$2.id] = channel$$2;
	        delete this._models.channels[oldId];

	        // This is a nasty way to work... but need to find and update all
	        // channelId properties of all Messages or the Query's won't
	        // see these as matching the query.
	        Object.keys(this._models.messages).filter(function (id) {
	          return _this3._models.messages[id].conversationId === oldId;
	        }).forEach(function (id) {
	          return _this3._models.messages[id].conversationId = channel$$2.id;
	        });
	      }
	    },


	    /**
	     * Searches locally cached channels for a matching channel.
	     *
	     * Iterates over channels calling a matching function until
	     * the channel is found or all channels tested.
	     *
	     *      var c = client.findCachedChannel(function(channel) {
	     *          if (channel.participants.indexOf('a') != -1) return true;
	     *      });
	     *
	     * @method findCachedChannel
	     * @param  {Function} f - Function to call until we find a match
	     * @param  {layer.Channel} f.channel - A channel to test
	     * @param  {boolean} f.return - Return true if the channel is a match
	     * @param  {Object} [context] - Optional context for the *this* object
	     * @return {layer.Channel}
	     *
	     * @deprecated
	     * This should be replaced by iterating over your layer.Query data.
	     */
	    findCachedChannel: function findCachedChannel(func, context) {
	      var test = context ? func.bind(context) : func;
	      var list = Object.keys(this._models.channels);
	      var len = list.length;
	      for (var index = 0; index < len; index++) {
	        var key = list[index];
	        var channel$$2 = this._models.channels[key];
	        if (test(channel$$2, index)) return channel$$2;
	      }
	      return null;
	    },


	    /**
	     * This method is recommended way to create a Channel.
	     *
	     * ```
	     *         client.createChannel({
	     *             members: ['layer:///identities/a', 'layer:///identities/b'],
	     *             name: 'a-channel'
	     *         });
	     *         client.createChannel({
	     *             members: [userIdentityObjectA, userIdentityObjectB],
	     *             name: 'another-channel'
	     *         });
	     *
	     *         client.createChannel({
	     *             members: ['layer:///identities/a', 'layer:///identities/b'],
	     *             name: 'a-channel-with-metadata',
	     *             metadata: {
	     *                 topicDetails: 'I am a detail'
	     *             }
	     *         });
	     * ```
	     *
	     * If you try to create a Channel with a name that already exists,
	     * you will get back an existing Channel, and any requested metadata and members
	     * will NOT be set; you will get whatever metadata the matching Conversation
	     * already had, and no members will be added/removed.
	     *
	     * Whether the Channel already exists or not, a 'channels:sent' event
	     * will be triggered asynchronously and the Channel object will be ready
	     * at that time.  Further, the event will provide details on the result:
	     *
	     * ```
	     *       var channel = client.createChannel({
	     *          members: ['a', 'b'],
	     *          name: 'yet-another-channel-with-metadata',
	     *          metadata: {
	     *                 topicDetails: 'I am a detail'
	     *          }
	     *       });
	     *       channel.on('channels:sent', function(evt) {
	     *           switch(evt.result) {
	     *               case Channel.CREATED:
	     *                   alert(channel.id + ' was created');
	     *                   break;
	     *               case Channel.FOUND:
	     *                   alert(channel.id + ' was found');
	     *                   break;
	     *               case Channel.FOUND_WITHOUT_REQUESTED_METADATA:
	     *                   alert(channel.id + ' was found but it already has a topicDetails so your requested detail was not set');
	     *                   break;
	     *            }
	     *       });
	     * ```
	     *
	     * Warning: This method will throw an error if called when you are not (or are no longer) an authenticated user.
	     * That means if authentication has expired, and you have not yet reauthenticated the user, this will throw an error.
	     *
	     *
	     * @method createChannel
	     * @param  {Object} options
	     * @param {string[]/layer.Identity[]} options.members - Array of UserIDs or UserIdentities
	     * @param {String} options.name - The unique name for this Channel
	     * @param {Object} [options.metadata={}] Metadata for your Channel
	     * @return {layer.Channel}
	     */
	    createChannel: function createChannel(options) {
	      // If we aren't authenticated, then we don't yet have a UserID, and won't create the correct Channel
	      if (!this.isAuthenticated) throw new Error(ErrorDictionary$5.clientMustBeReady);
	      if (!('private' in options)) options.private = false;
	      options.client = this;
	      return Channel$3.create(options);
	    }
	  }
	};

	/**
	 * Adds Message handling to the layer.Client.
	 *
	 * @class layer.mixins.ClientMessages
	 */

	var Syncable$9 = syncable;
	var Message$4 = message;
	var ErrorDictionary$6 = layerError.dictionary;

	var clientMessages = {
	  events: [
	  /**
	   * A new message has been received for which a notification may be suitable.
	   *
	   * This event is triggered for messages that are:
	   *
	   * 1. Added via websocket rather than other IO
	   * 2. Not yet been marked as read
	   * 3. Not sent by this user
	   *
	          client.on('messages:notify', function(evt) {
	              myNotify(evt.message);
	          })
	  *
	  * @event
	  * @param {layer.LayerEvent} evt
	  * @param {layer.Message} evt.Message
	  */
	  'messages:notify',

	  /**
	   * Messages have been added to a conversation.
	   *
	   * May also fire when new Announcements are received.
	   *
	   * This event is triggered on
	   *
	   * * creating/sending a new message
	   * * Receiving a new layer.Message or layer.Announcement via websocket
	   * * Querying/downloading a set of Messages
	   *
	          client.on('messages:add', function(evt) {
	              evt.messages.forEach(function(message) {
	                  myView.addMessage(message);
	              });
	          });
	  *
	  * NOTE: Such rendering would typically be done using events on layer.Query.
	  *
	  * @event
	  * @param {layer.LayerEvent} evt
	  * @param {layer.Message[]} evt.messages
	  */
	  'messages:add',

	  /**
	   * A message has been removed from a conversation.
	   *
	   * A removed Message is not necessarily deleted,
	   * just no longer being held in memory.
	   *
	   * Note that typically you will want the messages:delete event
	   * rather than messages:remove.
	   *
	   *      client.on('messages:remove', function(evt) {
	   *          evt.messages.forEach(function(message) {
	   *              myView.removeMessage(message);
	   *          });
	   *      });
	   *
	   * NOTE: Such rendering would typically be done using events on layer.Query.
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Message} evt.message
	   */
	  'messages:remove',

	  /**
	   * A message has been sent.
	   *
	   *      client.on('messages:sent', function(evt) {
	   *          alert(evt.target.getText() + ' has been sent');
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Message} evt.target
	   */
	  'messages:sent',

	  /**
	   * A message is about to be sent.
	   *
	   * Useful if you want to
	   * add parts to the message before it goes out.
	   *
	   *      client.on('messages:sending', function(evt) {
	   *          evt.target.addPart({
	   *              mimeType: 'text/plain',
	   *              body: 'this is just a test'
	   *          });
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Message} evt.target
	   */
	  'messages:sending',

	  /**
	   * Server failed to receive a Message.
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.LayerError} evt.error
	   */
	  'messages:sent-error',

	  /**
	   * A message has had a change in its properties.
	   *
	   * This change may have been delivered from a remote user
	   * or as a result of a local operation.
	   *
	   *      client.on('messages:change', function(evt) {
	   *          var recpientStatusChanges = evt.getChangesFor('recipientStatus');
	   *          if (recpientStatusChanges.length) {
	   *              myView.renderStatus(evt.target);
	   *          }
	   *      });
	   *
	   * NOTE: Such rendering would typically be done using events on layer.Query.
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Message} evt.target
	   * @param {Object[]} evt.changes
	   * @param {Mixed} evt.changes.newValue
	   * @param {Mixed} evt.changes.oldValue
	   * @param {string} evt.changes.property - Name of the property that has changed
	   */
	  'messages:change',

	  /**
	   * A call to layer.Message.load has completed successfully
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Message} evt.target
	   */
	  'messages:loaded',

	  /**
	   * A Message has been deleted from the server.
	   *
	   * Caused by either a successful call to layer.Message.delete() on the Message
	   * or by a remote user.
	   *
	   *      client.on('messages:delete', function(evt) {
	   *          myView.removeMessage(evt.target);
	   *      });
	   *
	   * @event
	   * @param {layer.LayerEvent} evt
	   * @param {layer.Message} evt.target
	   */
	  'messages:delete'],
	  lifecycle: {
	    constructor: function constructor(options) {
	      this._models.messages = {};
	    },
	    cleanup: function cleanup() {
	      var _this = this;

	      Object.keys(this._models.messages).forEach(function (id) {
	        var message$$2 = _this._models.messages[id];
	        if (message$$2 && !message$$2.isDestroyed) {
	          message$$2.destroy();
	        }
	      });
	      this._models.messages = null;
	    },
	    reset: function reset() {
	      this._models.messages = {};
	    }
	  },
	  methods: {
	    /**
	     * Retrieve the message or announcement by ID.
	     *
	     * Useful for finding a message when you have only the ID.
	     *
	     * If the message is not found, it will return null.
	     *
	     * If you want it to load it from cache and then from server if not in cache, use the `canLoad` parameter.
	     * If loading from the server, the method will return
	     * a layer.Message instance that has no data; the messages:loaded/messages:loaded-error events
	     * will let you know when the message has finished/failed loading from the server.
	     *
	     *      var m = client.getMessage('layer:///messages/123', true)
	     *      .on('messages:loaded', function() {
	     *          // Render the Message with all of its details loaded
	     *          myrerender(m);
	     *      });
	     *      // Render a placeholder for m until the details of m have loaded
	     *      myrender(m);
	     *
	     *
	     * @method getMessage
	     * @param  {string} id              - layer:///messages/uuid
	     * @param  {boolean} [canLoad=false] - Pass true to allow loading a message from the server if not found
	     * @return {layer.Message}
	     */
	    getMessage: function getMessage(id, canLoad) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$6.idParamRequired);

	      // NOTE: This could be an announcement
	      if (id.indexOf('layer:///') !== 0) {
	        id = Message$4.prefixUUID + id;
	      }

	      if (this._models.messages[id]) {
	        return this._models.messages[id];
	      } else if (canLoad) {
	        return Syncable$9.load(id, this);
	      }
	      return null;
	    },


	    /**
	     * Get a MessagePart by ID
	     *
	     * ```
	     * var part = client.getMessagePart('layer:///messages/6f08acfa-3268-4ae5-83d9-6ca00000000/parts/0');
	     * ```
	     *
	     * @method getMessagePart
	     * @param {String} id - ID of the Message Part; layer:///messages/uuid/parts/5
	     */
	    getMessagePart: function getMessagePart(id) {
	      if (typeof id !== 'string') throw new Error(ErrorDictionary$6.idParamRequired);

	      var messageId = id.replace(/\/parts.*$/, '');
	      var message$$2 = this.getMessage(messageId);
	      if (message$$2) return message$$2.getPartById(id);
	      return null;
	    },


	    /**
	     * Registers a message in _models.messages and triggers events.
	     *
	     * May also update Conversation.lastMessage.
	     *
	     * @method _addMessage
	     * @protected
	     * @param  {layer.Message} message
	     */
	    _addMessage: function _addMessage(message$$2) {
	      if (!this._models.messages[message$$2.id]) {
	        this._models.messages[message$$2.id] = message$$2;
	        this._triggerAsync('messages:add', { messages: [message$$2] });
	        if (message$$2._notify) {
	          this._triggerAsync('messages:notify', { message: message$$2 });
	          message$$2._notify = false;
	        }

	        var conversation = message$$2.getConversation(false);
	        if (conversation && (!conversation.lastMessage || conversation.lastMessage.position < message$$2.position)) {
	          var lastMessageWas = conversation.lastMessage;
	          conversation.lastMessage = message$$2;
	          if (lastMessageWas) this._scheduleCheckAndPurgeCache(lastMessageWas);
	        } else {
	          this._scheduleCheckAndPurgeCache(message$$2);
	        }
	      }
	    },


	    /**
	     * Removes message from _models.messages.
	     *
	     * Accepts IDs or Message instances
	     *
	     * TODO: Remove support for remove by ID
	     *
	     * @method _removeMessage
	     * @private
	     * @param  {layer.Message|string} message or Message ID
	     */
	    _removeMessage: function _removeMessage(message$$2) {
	      var id = typeof message$$2 === 'string' ? message$$2 : message$$2.id;
	      message$$2 = this._models.messages[id];
	      if (message$$2) {
	        delete this._models.messages[id];
	        if (!this._inCleanup) {
	          this._triggerAsync('messages:remove', { messages: [message$$2] });
	          var conv = message$$2.getConversation(false);

	          // Websocket will eventually deliver an update to the latest lastMessage;
	          // until then, use the old lastMessage's position as a placeholder
	          if (!this._inCheckAndPurgeCache && conv && conv.lastMessage === message$$2) {
	            conv.lastMessage = null;
	            conv._lastMessagePosition = message$$2.position;
	          }
	        }
	      }
	    },


	    /**
	     * Handles delete from position event from Websocket.
	     *
	     * A WebSocket may deliver a `delete` Conversation event with a
	     * from_position field indicating that all Messages at the specified position
	     * and earlier should be deleted.
	     *
	     * @method _purgeMessagesByPosition
	     * @private
	     * @param {string} conversationId
	     * @param {number} fromPosition
	     */
	    _purgeMessagesByPosition: function _purgeMessagesByPosition(conversationId, fromPosition) {
	      var _this2 = this;

	      Object.keys(this._models.messages).forEach(function (id) {
	        var message$$2 = _this2._models.messages[id];
	        if (message$$2.conversationId === conversationId && message$$2.position <= fromPosition) {
	          message$$2.destroy();
	        }
	      });
	    },


	    /**
	     * Iterate over every locally cached Message, calling your function.
	     *
	     * @param {Function} fn
	     * @param {layer.Message} fn.message
	     */
	    forEachMessage: function forEachMessage(fn) {
	      var _this3 = this;

	      Object.keys(this._models.messages).forEach(function (id) {
	        return fn(_this3._models.messages[id]);
	      });
	    }
	  }
	};

	var Util$13 = clientUtils;

	var _require$13 = _const;
	var RECEIPT_STATE = _require$13.RECEIPT_STATE;

	var websocketOperations = {
	  lifecycle: {

	    // Listen for any websocket operations and call our handler
	    constructor: function constructor(options) {
	      this.on('websocket:operation', this._handleWebsocketOperation, this);
	    }
	  },
	  methods: {

	    /**
	     * Enourmous switch statement for handling our immense library of operations.
	     *
	     * Any time we have a Websocket Operation, this switch statement routes the event to the
	     * appropriate handler.
	     *
	     * @param {Object} evt
	     */
	    _handleWebsocketOperation: function _handleWebsocketOperation(evt) {
	      switch (evt.data.method) {
	        case 'Conversation.mark_all_read':
	          return this._handleMarkAllReadOperation(evt.data);
	      }
	    },


	    /**
	     * Process a mark_all_read websocket operation.
	     *
	     * This will update recipientStatus and isRead for all impacted messages.
	     * Note that we don't have a good mechanism of organizing all messages and simply
	     * iterate over all messages in the message cache checking if they are affected by the request.
	     *
	     * Future optimizations could:
	     *
	     * 1. Get the conversation if its cached, and update its lastMessage
	     * 2. Iterate over all queries to see if a query is for messages in this conversation
	     *
	     * That would still miss messages created via websocket `create` events but not referenced
	     * by any query or last message.
	     *
	     * @param {Object} body
	     */
	    _handleMarkAllReadOperation: function _handleMarkAllReadOperation(body) {
	      var position = body.data.position;
	      var conversation = this.getObject(body.object.id);
	      if (!conversation) return;
	      var identityId = body.data.identity.id;
	      var isOwner = this.user.id === identityId;

	      // Prevent read receipts from being sent when we set isRead=true
	      conversation._inMarkAllAsRead = true;

	      // Iterate over all messages, and operate on any message with the proper converation ID and position
	      this.forEachMessage(function (m) {
	        if (m.conversationId === conversation.id && m.position <= position) {

	          // NOTE: We may want to trigger "messages:change" on recipientStatus if isOwner, but
	          // don't have a strong use case for that event.
	          if (isOwner) {
	            m.recipientStatus[identityId] = RECEIPT_STATE.READ;
	            m.isRead = true;
	          } else if (m.recipientStatus[identityId] !== RECEIPT_STATE.READ) {
	            var newRecipientStatus = Util$13.clone(m.recipientStatus);

	            newRecipientStatus[identityId] = RECEIPT_STATE.READ;
	            m.recipientStatus = newRecipientStatus;
	          }
	        }
	      });
	      conversation._inMarkAllAsRead = false;
	    }
	  }
	};

	var _typeof$3 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass$4 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	function _classCallCheck$4(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn$1(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$1(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/**
	 * The Layer Client; this is the top level component for any Layer based application.

	    var client = new layer.Client({
	      appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
	      challenge: function(evt) {
	        myAuthenticator({
	          nonce: evt.nonce,
	          onSuccess: evt.callback
	        });
	      },
	      ready: function(client) {
	        alert('I am Client; Server: Serve me!');
	      }
	    }).connect('Fred')
	 *
	 * You can also initialize this as

	    var client = new layer.Client({
	      appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff'
	    });

	    client.on('challenge', function(evt) {
	      myAuthenticator({
	        nonce: evt.nonce,
	        onSuccess: evt.callback
	      });
	    });

	    client.on('ready', function(client) {
	      alert('I am Client; Server: Serve me!');
	    });

	    client.connect('Fred');
	 *
	 * ## API Synopsis:
	 *
	 * The following Properties, Methods and Events are the most commonly used ones.  See the full API below
	 * for the rest of the API.
	 *
	 * ### Properties:
	 *
	 * * layer.Client.userId: User ID of the authenticated user
	 * * layer.Client.appId: The ID for your application
	 *
	 *
	 * ### Methods:
	 *
	 * * layer.Client.createConversation(): Create a new layer.Conversation.
	 * * layer.Client.createQuery(): Create a new layer.Query.
	 * * layer.Client.getMessage(): Input a Message ID, and output a layer.Message or layer.Announcement from cache.
	 * * layer.Client.getConversation(): Input a Conversation ID, and output a layer.Conversation from cache.
	 * * layer.Client.on() and layer.Conversation.off(): event listeners
	 * * layer.Client.destroy(): Cleanup all resources used by this client, including all Messages and Conversations.
	 *
	 * ### Events:
	 *
	 * * `challenge`: Provides a nonce and a callback; you call the callback once you have an Identity Token.
	 * * `ready`: Your application can now start using the Layer services
	 * * `messages:notify`: Used to notify your application of new messages for which a local notification may be suitable.
	 *
	 * ## Logging:
	 *
	 * There are two ways to change the log level for Layer's logger:
	 *
	 *     layer.Client.prototype.logLevel = layer.Constants.LOG.INFO;
	 *
	 * or
	 *
	 *     var client = new layer.Client({
	 *        appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
	 *        logLevel: layer.Constants.LOG.INFO
	 *     });
	 *
	 * @class  layer.Client
	 * @extends layer.ClientAuthenticator
	 * @mixin layer.mixins.ClientIdentities
	 * //@ mixin layer.mixins.ClientMembership
	 * @mixin layer.mixins.ClientConversations
	 * //@ mixin layer.mixins.ClientChannels
	 * @mixin layer.mixins.ClientMessages
	 * @mixin layer.mixins.ClientQueries
	 * @mixin layer.mixin.WebsocketOperations
	 */

	var ClientAuth = clientAuthenticator;
	var Conversation = conversation;
	var Channel = channel;
	var ErrorDictionary = layerError.dictionary;
	var ConversationMessage = conversationMessage;
	var ChannelMessage = channelMessage;
	var Announcement = announcement;
	var Identity = identity;
	var Membership = membership;
	var TypingIndicatorListener = typingIndicatorListener;
	var Util = clientUtils;
	var Root$1 = root;
	var ClientRegistry = clientRegistry;
	var logger$1 = logger_1;
	var TypingListener = typingListener;
	var TypingPublisher = typingPublisher;
	var TelemetryMonitor = telemetryMonitor;

	var Client = function (_ClientAuth) {
	  _inherits$1(Client, _ClientAuth);

	  /*
	   * Adds conversations, messages and websockets on top of the authentication client.
	   * jsdocs on parent class constructor.
	   */
	  function Client(options) {
	    _classCallCheck$4(this, Client);

	    var _this = _possibleConstructorReturn$1(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this, options));

	    ClientRegistry.register(_this);
	    _this._models = {};
	    _this._runMixins('constructor', [options]);

	    // Initialize Properties
	    _this._scheduleCheckAndPurgeCacheItems = [];

	    _this._initComponents();

	    _this.on('online', _this._connectionRestored.bind(_this));

	    logger$1.info(Util.asciiInit(Client.version));
	    return _this;
	  }

	  /* See parent method docs */


	  _createClass$4(Client, [{
	    key: '_initComponents',
	    value: function _initComponents() {
	      _get(Client.prototype.__proto__ || Object.getPrototypeOf(Client.prototype), '_initComponents', this).call(this);

	      this._typingIndicators = new TypingIndicatorListener({
	        clientId: this.appId
	      });
	      this.telemetryMonitor = new TelemetryMonitor({
	        client: this,
	        enabled: this.telemetryEnabled
	      });
	    }

	    /**
	     * Cleanup all resources (Conversations, Messages, etc...) prior to destroy or reauthentication.
	     *
	     * @method _cleanup
	     * @private
	     */

	  }, {
	    key: '_cleanup',
	    value: function _cleanup() {
	      if (this.isDestroyed) return;
	      this._inCleanup = true;

	      try {
	        this._runMixins('cleanup', []);
	      } catch (e) {
	        logger$1.error(e);
	      }

	      if (this.socketManager) this.socketManager.close();
	      this._inCleanup = false;
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      // Cleanup all resources (Conversations, Messages, etc...)
	      this._cleanup();

	      this._destroyComponents();

	      ClientRegistry.unregister(this);

	      _get(Client.prototype.__proto__ || Object.getPrototypeOf(Client.prototype), 'destroy', this).call(this);
	      this._inCleanup = false;
	    }
	  }, {
	    key: '__adjustAppId',
	    value: function __adjustAppId() {
	      if (this.appId) throw new Error(ErrorDictionary.appIdImmutable);
	    }

	    /**
	     * Takes an array of Identity instances, User IDs, Identity IDs, Identity objects,
	     * or Server formatted Identity Objects and returns an array of Identity instances.
	     *
	     * @method _fixIdentities
	     * @private
	     * @param {Mixed[]} identities - Something that tells us what Identity to return
	     * @return {layer.Identity[]}
	     */

	  }, {
	    key: '_fixIdentities',
	    value: function _fixIdentities(identities) {
	      var _this2 = this;

	      return identities.map(function (identity$$1) {
	        if (identity$$1 instanceof Identity) return identity$$1;
	        if (typeof identity$$1 === 'string') {
	          return _this2.getIdentity(identity$$1, true);
	        } else if (identity$$1 && (typeof identity$$1 === 'undefined' ? 'undefined' : _typeof$3(identity$$1)) === 'object') {
	          if ('userId' in identity$$1) {
	            return _this2.getIdentity(identity$$1.id || identity$$1.userId);
	          } else if ('user_id' in identity$$1) {
	            return _this2._createObject(identity$$1);
	          }
	        }
	        return null;
	      });
	    }

	    /**
	     * Takes as input an object id, and either calls getConversation() or getMessage() as needed.
	     *
	     * Will only get cached objects, will not get objects from the server.
	     *
	     * This is not a public method mostly so there's no ambiguity over using getXXX
	     * or getObject.  getXXX typically has an option to load the resource, which this
	     * does not.
	     *
	     * @method getObject
	     * @param  {string} id - Message, Conversation or Query id
	     * @param  {boolean} [canLoad=false] - Pass true to allow loading a object from
	     *                                     the server if not found (not supported for all objects)
	     * @return {layer.Message|layer.Conversation|layer.Query}
	     */

	  }, {
	    key: 'getObject',
	    value: function getObject(id) {
	      var canLoad = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	      switch (Util.typeFromID(id)) {
	        case 'messages':
	        case 'announcements':
	          return this.getMessage(id, canLoad);
	        case 'conversations':
	          return this.getConversation(id, canLoad);
	        case 'channels':
	          return this.getChannel(id, canLoad);
	        case 'queries':
	          return this.getQuery(id);
	        case 'identities':
	          return this.getIdentity(id, canLoad);
	        case 'members':
	          return this.getMember(id, canLoad);
	      }
	      return null;
	    }

	    /**
	     * Takes an object description from the server and either updates it (if cached)
	     * or creates and caches it .
	     *
	     * @method _createObject
	     * @protected
	     * @param  {Object} obj - Plain javascript object representing a Message or Conversation
	     */

	  }, {
	    key: '_createObject',
	    value: function _createObject(obj) {
	      var item = this.getObject(obj.id);
	      if (item) {
	        item._populateFromServer(obj);
	        return item;
	      } else {
	        switch (Util.typeFromID(obj.id)) {
	          case 'messages':
	            if (obj.conversation) {
	              return ConversationMessage._createFromServer(obj, this);
	            } else if (obj.channel) {
	              return ChannelMessage._createFromServer(obj, this);
	            }
	            break;
	          case 'announcements':
	            return Announcement._createFromServer(obj, this);
	          case 'conversations':
	            return Conversation._createFromServer(obj, this);
	          case 'channels':
	            return Channel._createFromServer(obj, this);
	          case 'identities':
	            return Identity._createFromServer(obj, this);
	          case 'members':
	            return Membership._createFromServer(obj, this);
	        }
	      }
	      return null;
	    }

	    /**
	     * When a layer.Container's ID changes, we need to update
	     * a variety of things and trigger events.
	     *
	     * @method _updateContainerId
	     * @param {layer.Container} container
	     * @param {String} oldId
	     */

	  }, {
	    key: '_updateContainerId',
	    value: function _updateContainerId(container, oldId) {
	      if (container instanceof Conversation) {
	        this._updateConversationId(container, oldId);
	      } else {
	        this._updateChannelId(container, oldId);
	      }
	    }

	    /**
	     * Merge events into smaller numbers of more complete events.
	     *
	     * Before any delayed triggers are fired, fold together all of the conversations:add
	     * and conversations:remove events so that 100 conversations:add events can be fired as
	     * a single event.
	     *
	     * @method _processDelayedTriggers
	     * @private
	     */

	  }, {
	    key: '_processDelayedTriggers',
	    value: function _processDelayedTriggers() {
	      if (this.isDestroyed) return;

	      var addConversations = this._delayedTriggers.filter(function (evt) {
	        return evt[0] === 'conversations:add';
	      });
	      var removeConversations = this._delayedTriggers.filter(function (evt) {
	        return evt[0] === 'conversations:remove';
	      });
	      this._foldEvents(addConversations, 'conversations', this);
	      this._foldEvents(removeConversations, 'conversations', this);

	      var addMessages = this._delayedTriggers.filter(function (evt) {
	        return evt[0] === 'messages:add';
	      });
	      var removeMessages = this._delayedTriggers.filter(function (evt) {
	        return evt[0] === 'messages:remove';
	      });

	      this._foldEvents(addMessages, 'messages', this);
	      this._foldEvents(removeMessages, 'messages', this);

	      var addIdentities = this._delayedTriggers.filter(function (evt) {
	        return evt[0] === 'identities:add';
	      });
	      var removeIdentities = this._delayedTriggers.filter(function (evt) {
	        return evt[0] === 'identities:remove';
	      });

	      this._foldEvents(addIdentities, 'identities', this);
	      this._foldEvents(removeIdentities, 'identities', this);

	      _get(Client.prototype.__proto__ || Object.getPrototypeOf(Client.prototype), '_processDelayedTriggers', this).call(this);
	    }
	  }, {
	    key: 'trigger',
	    value: function trigger(eventName, evt) {
	      this._triggerLogger(eventName, evt);
	      _get(Client.prototype.__proto__ || Object.getPrototypeOf(Client.prototype), 'trigger', this).call(this, eventName, evt);
	    }

	    /**
	     * Does logging on all triggered events.
	     *
	     * All logging is done at `debug` or `info` levels.
	     *
	     * @method _triggerLogger
	     * @private
	     */

	  }, {
	    key: '_triggerLogger',
	    value: function _triggerLogger(eventName, evt) {
	      var infoEvents = ['conversations:add', 'conversations:remove', 'conversations:change', 'messages:add', 'messages:remove', 'messages:change', 'identities:add', 'identities:remove', 'identities:change', 'challenge', 'ready'];
	      if (infoEvents.indexOf(eventName) !== -1) {
	        if (evt && evt.isChange) {
	          logger$1.info('Client Event: ' + eventName + ' ' + evt.changes.map(function (change) {
	            return change.property;
	          }).join(', '));
	        } else {
	          var text = '';
	          if (evt) {
	            // If the triggered event has these messages, use a simpler way of rendering info about them
	            if (evt.message) text = evt.message.id;
	            if (evt.messages) text = evt.messages.length + ' messages';
	            if (evt.conversation) text = evt.conversation.id;
	            if (evt.conversations) text = evt.conversations.length + ' conversations';
	            if (evt.channel) text = evt.channel.id;
	            if (evt.channels) text = evt.channels.length + ' channels';
	          }
	          logger$1.info('Client Event: ' + eventName + ' ' + text);
	        }
	        if (evt) logger$1.debug(evt);
	      } else {
	        logger$1.debug(eventName, evt);
	      }
	    }

	    /**
	     * If the session has been reset, dump all data.
	     *
	     * @method _resetSession
	     * @private
	     */

	  }, {
	    key: '_resetSession',
	    value: function _resetSession() {
	      this._cleanup();
	      this._runMixins('reset', []);
	      return _get(Client.prototype.__proto__ || Object.getPrototypeOf(Client.prototype), '_resetSession', this).call(this);
	    }

	    /**
	     * Check to see if the specified objects can safely be removed from cache.
	     *
	     * Removes from cache if an object is not part of any Query's result set.
	     *
	     * @method _checkAndPurgeCache
	     * @private
	     * @param  {layer.Root[]} objects - Array of Messages or Conversations
	     */

	  }, {
	    key: '_checkAndPurgeCache',
	    value: function _checkAndPurgeCache(objects) {
	      var _this3 = this;

	      this._inCheckAndPurgeCache = true;
	      objects.forEach(function (obj) {
	        if (!obj.isDestroyed && !_this3._isCachedObject(obj)) {
	          if (obj instanceof Root$1 === false) obj = _this3.getObject(obj.id);
	          if (obj) obj.destroy();
	        }
	      });
	      this._inCheckAndPurgeCache = false;
	    }

	    /**
	     * Schedules _runScheduledCheckAndPurgeCache if needed, and adds this object
	     * to the list of objects it will validate for uncaching.
	     *
	     * Note that any object that does not exist on the server (!isSaved()) is an object that the
	     * app created and can only be purged by the app and not by the SDK.  Once its been
	     * saved, and can be reloaded from the server when needed, its subject to standard caching.
	     *
	     * @method _scheduleCheckAndPurgeCache
	     * @private
	     * @param {layer.Root} object
	     */

	  }, {
	    key: '_scheduleCheckAndPurgeCache',
	    value: function _scheduleCheckAndPurgeCache(object) {
	      var _this4 = this;

	      if (object.isSaved()) {
	        if (this._scheduleCheckAndPurgeCacheAt < Date.now()) {
	          this._scheduleCheckAndPurgeCacheAt = Date.now() + Client.CACHE_PURGE_INTERVAL;
	          setTimeout(function () {
	            return _this4._runScheduledCheckAndPurgeCache();
	          }, Client.CACHE_PURGE_INTERVAL);
	        }
	        this._scheduleCheckAndPurgeCacheItems.push(object);
	      }
	    }

	    /**
	     * Calls _checkAndPurgeCache on accumulated objects and resets its state.
	     *
	     * @method _runScheduledCheckAndPurgeCache
	     * @private
	     */

	  }, {
	    key: '_runScheduledCheckAndPurgeCache',
	    value: function _runScheduledCheckAndPurgeCache() {
	      var list = this._scheduleCheckAndPurgeCacheItems;
	      this._scheduleCheckAndPurgeCacheItems = [];
	      this._checkAndPurgeCache(list);
	      this._scheduleCheckAndPurgeCacheAt = 0;
	    }

	    /**
	     * Returns true if the specified object should continue to be part of the cache.
	     *
	     * Result is based on whether the object is part of the data for a Query.
	     *
	     * @method _isCachedObject
	     * @private
	     * @param  {layer.Root} obj - A Message or Conversation Instance
	     * @return {Boolean}
	     */

	  }, {
	    key: '_isCachedObject',
	    value: function _isCachedObject(obj) {
	      var list = Object.keys(this._models.queries);
	      for (var i = 0; i < list.length; i++) {
	        var query = this._models.queries[list[i]];
	        if (query._getItem(obj.id)) return true;
	      }
	      return false;
	    }

	    /**
	     * On restoring a connection, determine what steps need to be taken to update our data.
	     *
	     * A reset boolean property is passed; set based on  layer.ClientAuthenticator.ResetAfterOfflineDuration.
	     *
	     * Note it is possible for an application to have logic that causes queries to be created/destroyed
	     * as a side-effect of layer.Query.reset destroying all data. So we must test to see if queries exist.
	     *
	     * @method _connectionRestored
	     * @private
	     * @param {boolean} reset - Should the session reset/reload all data or attempt to resume where it left off?
	     */

	  }, {
	    key: '_connectionRestored',
	    value: function _connectionRestored(evt) {
	      var _this5 = this;

	      if (evt.reset) {
	        logger$1.debug('Client Connection Restored; Resetting all Queries');
	        this.dbManager.deleteTables(function () {
	          _this5.dbManager._open();
	          Object.keys(_this5._models.queries).forEach(function (id) {
	            var query = _this5._models.queries[id];
	            if (query) query.reset();
	          });
	        });
	      }
	    }

	    /**
	     * Creates a layer.TypingIndicators.TypingListener instance
	     * bound to the specified dom node.
	     *
	     *      var typingListener = client.createTypingListener(document.getElementById('myTextBox'));
	     *      typingListener.setConversation(mySelectedConversation);
	     *
	     * Use this method to instantiate a listener, and call
	     * layer.TypingIndicators.TypingListener.setConversation every time you want to change which Conversation
	     * it reports your user is typing into.
	     *
	     * @method createTypingListener
	     * @param  {HTMLElement} inputNode - Text input to watch for keystrokes
	     * @return {layer.TypingIndicators.TypingListener}
	     */

	  }, {
	    key: 'createTypingListener',
	    value: function createTypingListener(inputNode) {
	      return new TypingListener({
	        clientId: this.appId,
	        input: inputNode
	      });
	    }

	    /**
	     * Creates a layer.TypingIndicators.TypingPublisher.
	     *
	     * The TypingPublisher lets you manage your Typing Indicators without using
	     * the layer.TypingIndicators.TypingListener.
	     *
	     *      var typingPublisher = client.createTypingPublisher();
	     *      typingPublisher.setConversation(mySelectedConversation);
	     *      typingPublisher.setState(layer.TypingIndicators.STARTED);
	     *
	     * Use this method to instantiate a listener, and call
	     * layer.TypingIndicators.TypingPublisher.setConversation every time you want to change which Conversation
	     * it reports your user is typing into.
	     *
	     * Use layer.TypingIndicators.TypingPublisher.setState to inform other users of your current state.
	     * Note that the `STARTED` state only lasts for 2.5 seconds, so you
	     * must repeatedly call setState for as long as this state should continue.
	     * This is typically done by simply calling it every time a user hits
	     * a key.
	     *
	     * @method createTypingPublisher
	     * @return {layer.TypingIndicators.TypingPublisher}
	     */

	  }, {
	    key: 'createTypingPublisher',
	    value: function createTypingPublisher() {
	      return new TypingPublisher({
	        clientId: this.appId
	      });
	    }

	    /**
	     * Get the current typing indicator state of a specified Conversation.
	     *
	     * Typically used to see if anyone is currently typing when first opening a Conversation.
	     *
	     * @method getTypingState
	     * @param {String} conversationId
	     */

	  }, {
	    key: 'getTypingState',
	    value: function getTypingState(conversationId) {
	      return this._typingIndicators.getState(conversationId);
	    }

	    /**
	     * Accessor for getting a Client by appId.
	     *
	     * Most apps will only have one client,
	     * and will not need this method.
	     *
	     * @method getClient
	     * @static
	     * @param  {string} appId
	     * @return {layer.Client}
	     */

	  }], [{
	    key: 'getClient',
	    value: function getClient(appId) {
	      return ClientRegistry.get(appId);
	    }
	  }, {
	    key: 'destroyAllClients',
	    value: function destroyAllClients() {
	      ClientRegistry.getAll().forEach(function (client) {
	        return client.destroy();
	      });
	    }

	    /**
	     * Listen for a new Client to be registered.
	     *
	     * If your code needs a client, and it doesn't yet exist, you
	     * can use this to get called when the client exists.
	     *
	     * ```
	     * layer.Client.addListenerForNewClient(function(client) {
	     *    mycomponent.setClient(client);
	     * });
	     * ```
	     *
	     * @method addListenerForNewClient
	     * @static
	     * @param {Function} listener
	     * @param {layer.Client} listener.client
	     */

	  }, {
	    key: 'addListenerForNewClient',
	    value: function addListenerForNewClient(listener) {
	      ClientRegistry.addListener(listener);
	    }

	    /**
	     * Remove listener for a new Client.
	     *
	     *
	     * ```
	     * var f = function(client) {
	     *    mycomponent.setClient(client);
	     *    layer.Client.removeListenerForNewClient(f);
	     * };
	     *
	     * layer.Client.addListenerForNewClient(f);
	     * ```
	     *
	     * Calling with null will remove all listeners.
	     *
	     * @method removeListenerForNewClient
	     * @static
	     * @param {Function} listener
	     */

	  }, {
	    key: 'removeListenerForNewClient',
	    value: function removeListenerForNewClient(listener) {
	      ClientRegistry.removeListener(listener);
	    }
	  }]);

	  return Client;
	}(ClientAuth);

	/**
	 * Array of items to be checked to see if they can be uncached.
	 *
	 * @private
	 * @type {layer.Root[]}
	 */


	Client.prototype._scheduleCheckAndPurgeCacheItems = null;

	/**
	 * Time that the next call to _runCheckAndPurgeCache() is scheduled for in ms since 1970.
	 *
	 * @private
	 * @type {number}
	 */
	Client.prototype._scheduleCheckAndPurgeCacheAt = 0;

	/**
	 * Set to false to disable telemetry gathering.
	 *
	 * No content nor identifiable information is gathered, only
	 * usage and performance metrics.
	 *
	 * @type {Boolean}
	 */
	Client.prototype.telemetryEnabled = true;

	/**
	 * Gather usage and responsiveness statistics
	 *
	 * @private
	 */
	Client.prototype.telemetryMonitor = null;

	/**
	 * Get the version of the Client library.
	 *
	 * @static
	 * @type {String}
	 */
	Client.version = '3.4.6';

	/**
	 * Any  Message that is part of a Query's results are kept in memory for as long as it
	 * remains in that Query.  However, when a websocket event delivers new Messages  that
	 * are NOT part of a Query, how long should they stick around in memory?  Why have them stick around?
	 * Perhaps an app wants to post a notification of a new Message or Conversation... and wants to keep
	 * the object local for a little while.  Default is 2 hours before checking to see if
	 * the object is part of a Query or can be uncached.  Value is in miliseconds.
	 * @static
	 * @type {number}
	 */
	Client.CACHE_PURGE_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours * 60 minutes per hour * 60 seconds per minute * 1000 miliseconds/second

	Client._ignoredEvents = ['conversations:loaded', 'conversations:loaded-error'];

	Client._supportedEvents = [
	/**
	 * A Typing Indicator state has changed.
	 *
	 * Either a change has been received
	 * from the server, or a typing indicator state has expired.
	 *
	 *      client.on('typing-indicator-change', function(evt) {
	 *          if (evt.conversationId === myConversationId) {
	 *              alert(evt.typing.join(', ') + ' are typing');
	 *              alert(evt.paused.join(', ') + ' are paused');
	 *          }
	 *      });
	 *
	 * @event
	 * @param {layer.LayerEvent} evt
	 * @param {string} conversationId - ID of the Conversation users are typing into
	 * @param {string[]} typing - Array of user IDs who are currently typing
	 * @param {string[]} paused - Array of user IDs who are currently paused;
	 *                            A paused user still has text in their text box.
	 */
	'typing-indicator-change'].concat(ClientAuth._supportedEvents);

	Client.mixins = [clientQueries, clientIdentities, clientMembers, clientConversations, clientChannels, clientMessages, websocketOperations];
	Root$1.initClass.apply(Client, [Client, 'Client']);
	var client$1 = Client;

	var _createClass$36 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _possibleConstructorReturn$29(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits$29(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	function _classCallCheck$36(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Query$8 = query;

	/**
	 * Query builder class generating queries for a set of messages.
	 * Used in Creating and Updating layer.Query instances.
	 *
	 * Using the Query Builder, we should be able to instantiate a Query
	 *
	 *      var qBuilder = QueryBuilder
	 *       .messages()
	 *       .forConversation('layer:///conversations/ffffffff-ffff-ffff-ffff-ffffffffffff')
	 *       .paginationWindow(100);
	 *      var query = client.createQuery(qBuilder);
	 *
	 *
	 * You can then create additional builders and update the query:
	 *
	 *      var qBuilder2 = QueryBuilder
	 *       .messages()
	 *       .forConversation('layer:///conversations/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
	 *       .paginationWindow(200);
	 *      query.update(qBuilder);
	 *
	 * @class layer.QueryBuilder.MessagesQuery
	 */

	var MessagesQuery$3 = function () {

	  /**
	   * Creates a new query builder for a set of messages.
	   *
	   * Standard use is without any arguments.
	   *
	   * @method constructor
	   * @param  {Object} [query=null]
	   */
	  function MessagesQuery(query$$2) {
	    _classCallCheck$36(this, MessagesQuery);

	    if (query$$2) {
	      this._query = {
	        model: query$$2.model,
	        returnType: query$$2.returnType,
	        dataType: query$$2.dataType,
	        paginationWindow: query$$2.paginationWindow
	      };
	    } else {
	      this._query = {
	        model: Query$8.Message,
	        returnType: 'object',
	        dataType: 'object',
	        paginationWindow: Query$8.prototype.paginationWindow
	      };
	    }

	    // TODO remove when messages can be fetched via query API rather than `GET /messages`
	    this._conversationIdSet = false;
	  }

	  /**
	   * Query for messages in this Conversation or Channel.
	   *
	   * @method forConversation
	   * @param  {String} conversationId  Accepts a Conversation ID or Channel ID
	   */


	  _createClass$36(MessagesQuery, [{
	    key: 'forConversation',
	    value: function forConversation(conversationId) {
	      if (conversationId.indexOf('layer:///channels/') === 0) {
	        this._query.predicate = 'channel.id = \'' + conversationId + '\'';
	        this._conversationIdSet = true;
	      } else if (conversationId.indexOf('layer:///conversations/') === 0) {
	        this._query.predicate = 'conversation.id = \'' + conversationId + '\'';
	        this._conversationIdSet = true;
	      } else {
	        this._query.predicate = '';
	        this._conversationIdSet = false;
	      }
	      return this;
	    }

	    /**
	     * Sets the pagination window/number of messages to fetch from the local cache or server.
	     *
	     * Currently only positive integers are supported.
	     *
	     * @method paginationWindow
	     * @param  {number} win
	     */

	  }, {
	    key: 'paginationWindow',
	    value: function paginationWindow(win) {
	      this._query.paginationWindow = win;
	      return this;
	    }

	    /**
	     * Returns the built query object to send to the server.
	     *
	     * Called by layer.QueryBuilder. You should not need to call this.
	     *
	     * @method build
	     */

	  }, {
	    key: 'build',
	    value: function build() {
	      return this._query;
	    }
	  }]);

	  return MessagesQuery;
	}();

	/**
	 * Query builder class generating queries for a set of Announcements.
	 *
	 * To get started:
	 *
	 *      var qBuilder = QueryBuilder
	 *       .announcements()
	 *       .paginationWindow(100);
	 *      var query = client.createQuery(qBuilder);
	 *
	 * @class layer.QueryBuilder.AnnouncementsQuery
	 * @extends layer.QueryBuilder.MessagesQuery
	 */


	var AnnouncementsQuery$2 = function (_MessagesQuery) {
	  _inherits$29(AnnouncementsQuery, _MessagesQuery);

	  function AnnouncementsQuery(options) {
	    _classCallCheck$36(this, AnnouncementsQuery);

	    var _this = _possibleConstructorReturn$29(this, (AnnouncementsQuery.__proto__ || Object.getPrototypeOf(AnnouncementsQuery)).call(this, options));

	    _this._query.model = Query$8.Announcement;
	    return _this;
	  }

	  _createClass$36(AnnouncementsQuery, [{
	    key: 'build',
	    value: function build() {
	      return this._query;
	    }
	  }]);

	  return AnnouncementsQuery;
	}(MessagesQuery$3);

	/**
	 * Query builder class generating queries for a set of Conversations.
	 *
	 * Used in Creating and Updating layer.Query instances.
	 *
	 * To get started:
	 *
	 *      var qBuilder = QueryBuilder
	 *       .conversations()
	 *       .paginationWindow(100);
	 *      var query = client.createQuery(qBuilder);
	 *
	 * You can then create additional builders and update the query:
	 *
	 *      var qBuilder2 = QueryBuilder
	 *       .conversations()
	 *       .paginationWindow(200);
	 *      query.update(qBuilder);
	 *
	 * @class layer.QueryBuilder.ConversationsQuery
	 */


	var ConversationsQuery$3 = function () {

	  /**
	   * Creates a new query builder for a set of conversations.
	   *
	   * Standard use is without any arguments.
	   *
	   * @method constructor
	   * @param  {Object} [query=null]
	   */
	  function ConversationsQuery(query$$2) {
	    _classCallCheck$36(this, ConversationsQuery);

	    if (query$$2) {
	      this._query = {
	        model: query$$2.model,
	        returnType: query$$2.returnType,
	        dataType: query$$2.dataType,
	        paginationWindow: query$$2.paginationWindow,
	        sortBy: query$$2.sortBy
	      };
	    } else {
	      this._query = {
	        model: Query$8.Conversation,
	        returnType: 'object',
	        dataType: 'object',
	        paginationWindow: Query$8.prototype.paginationWindow,
	        sortBy: null
	      };
	    }
	  }

	  /**
	   * Sets the pagination window/number of messages to fetch from the local cache or server.
	   *
	   * Currently only positive integers are supported.
	   *
	   * @method paginationWindow
	   * @param  {number} win
	   * @return {layer.QueryBuilder} this
	   */


	  _createClass$36(ConversationsQuery, [{
	    key: 'paginationWindow',
	    value: function paginationWindow(win) {
	      this._query.paginationWindow = win;
	      return this;
	    }

	    /**
	     * Sets the sorting options for the Conversation.
	     *
	     * Currently only supports descending order
	     * Currently only supports fieldNames of "createdAt" and "lastMessage.sentAt"
	     *
	     * @method sortBy
	     * @param  {string} fieldName  - field to sort by
	     * @param  {boolean} asc - Is an ascending sort?
	     * @return {layer.QueryBuilder} this
	     */

	  }, {
	    key: 'sortBy',
	    value: function sortBy(fieldName) {
	      var asc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	      this._query.sortBy = [_defineProperty({}, fieldName, asc ? 'asc' : 'desc')];
	      return this;
	    }

	    /**
	     * Returns the built query object to send to the server.
	     *
	     * Called by layer.QueryBuilder. You should not need to call this.
	     *
	     * @method build
	     */

	  }, {
	    key: 'build',
	    value: function build() {
	      return this._query;
	    }
	  }]);

	  return ConversationsQuery;
	}();

	/**
	 * Query builder class generating queries for a set of Channels.
	 *
	 * Used in Creating and Updating layer.Query instances.
	 *
	 * To get started:
	 *
	 *      var qBuilder = QueryBuilder
	 *       .channels()
	 *       .paginationWindow(100);
	 *      var query = client.createQuery(qBuilder);
	 *
	 * You can then create additional builders and update the query:
	 *
	 *      var qBuilder2 = QueryBuilder
	 *       .conversations()
	 *       .paginationWindow(200);
	 *      query.update(qBuilder);
	 *
	 * @class layer.QueryBuilder.ChannelsQuery
	 */


	var ChannelsQuery$2 = function () {

	  /**
	   * Creates a new query builder for a set of conversations.
	   *
	   * Standard use is without any arguments.
	   *
	   * @method constructor
	   * @param  {Object} [query=null]
	   */
	  function ChannelsQuery(query$$2) {
	    _classCallCheck$36(this, ChannelsQuery);

	    if (query$$2) {
	      this._query = {
	        model: query$$2.model,
	        returnType: query$$2.returnType,
	        dataType: query$$2.dataType,
	        paginationWindow: query$$2.paginationWindow,
	        sortBy: null
	      };
	    } else {
	      this._query = {
	        model: Query$8.Channel,
	        returnType: 'object',
	        dataType: 'object',
	        paginationWindow: Query$8.prototype.paginationWindow,
	        sortBy: null
	      };
	    }
	  }

	  /**
	   * Sets the pagination window/number of messages to fetch from the local cache or server.
	   *
	   * Currently only positive integers are supported.
	   *
	   * @method paginationWindow
	   * @param  {number} win
	   * @return {layer.QueryBuilder} this
	   */


	  _createClass$36(ChannelsQuery, [{
	    key: 'paginationWindow',
	    value: function paginationWindow(win) {
	      this._query.paginationWindow = win;
	      return this;
	    }

	    /**
	     * Returns the built query object to send to the server.
	     *
	     * Called by layer.QueryBuilder. You should not need to call this.
	     *
	     * @method build
	     */

	  }, {
	    key: 'build',
	    value: function build() {
	      return this._query;
	    }
	  }]);

	  return ChannelsQuery;
	}();

	/**
	 * Query builder class generating queries for getting members of a Channel.
	 *
	 * Used in Creating and Updating layer.Query instances.
	 *
	 * To get started:
	 *
	 *      var qBuilder = QueryBuilder
	 *       .members()
	 *       .forChannel(channelId)
	 *       .paginationWindow(100);
	 *      var query = client.createQuery(qBuilder);
	 *
	 * You can then create additional builders and update the query:
	 *
	 *      var qBuilder2 = QueryBuilder
	 *       .members()
	 *       .forChannel(channelId)
	 *       .paginationWindow(200);
	 *      query.update(qBuilder);
	 *
	 * @class layer.QueryBuilder.MembersQuery
	 */


	var MembersQuery$2 = function () {

	  /**
	   * Creates a new query builder for a set of conversations.
	   *
	   * Standard use is without any arguments.
	   *
	   * @method constructor
	   * @param  {Object} [query=null]
	   */
	  function MembersQuery(query$$2) {
	    _classCallCheck$36(this, MembersQuery);

	    if (query$$2) {
	      this._query = {
	        model: query$$2.model,
	        returnType: query$$2.returnType,
	        dataType: query$$2.dataType,
	        paginationWindow: query$$2.paginationWindow,
	        sortBy: null
	      };
	    } else {
	      this._query = {
	        model: Query$8.Membership,
	        returnType: 'object',
	        dataType: 'object',
	        paginationWindow: Query$8.prototype.paginationWindow,
	        sortBy: null
	      };
	    }
	  }

	  /**
	   * Sets the pagination window/number of messages to fetch from the local cache or server.
	   *
	   * Currently only positive integers are supported.
	   *
	   * @method paginationWindow
	   * @param  {number} win
	   * @return {layer.QueryBuilder} this
	   */


	  _createClass$36(MembersQuery, [{
	    key: 'paginationWindow',
	    value: function paginationWindow(win) {
	      this._query.paginationWindow = win;
	      return this;
	    }

	    /**
	     * Query for members in this Channel.
	     *
	     * @method forChannel
	     * @param  {String} channelId
	     */

	  }, {
	    key: 'forChannel',
	    value: function forChannel(channelId) {
	      if (channelId.indexOf('layer:///channels/') === 0) {
	        this._query.predicate = 'channel.id = \'' + channelId + '\'';
	      } else {
	        this._query.predicate = '';
	      }
	      return this;
	    }

	    /**
	     * Returns the built query object to send to the server.
	     *
	     * Called by layer.QueryBuilder. You should not need to call this.
	     *
	     * @method build
	     */

	  }, {
	    key: 'build',
	    value: function build() {
	      return this._query;
	    }
	  }]);

	  return MembersQuery;
	}();

	/**
	 * Query builder class generating queries for a set of Identities followed by this user.
	 *
	 * Used in Creating and Updating layer.Query instances.
	 *
	 * To get started:
	 *
	 *      var qBuilder = QueryBuilder
	 *       .identities()
	 *       .paginationWindow(100);
	 *      var query = client.createQuery(qBuilder);
	 *
	 * @class layer.QueryBuilder.IdentitiesQuery
	 */


	var IdentitiesQuery$2 = function () {

	  /**
	   * Creates a new query builder for a set of conversations.
	   *
	   * Standard use is without any arguments.
	   *
	   * @method constructor
	   * @param  {Object} [query=null]
	   */
	  function IdentitiesQuery(query$$2) {
	    _classCallCheck$36(this, IdentitiesQuery);

	    if (query$$2) {
	      this._query = {
	        model: query$$2.model,
	        returnType: query$$2.returnType,
	        dataType: query$$2.dataType,
	        paginationWindow: query$$2.paginationWindow
	      };
	    } else {
	      this._query = {
	        model: Query$8.Identity,
	        returnType: 'object',
	        dataType: 'object',
	        paginationWindow: Query$8.prototype.paginationWindow
	      };
	    }
	  }

	  /**
	   * Sets the pagination window/number of messages to fetch from the local cache or server.
	   *
	   * Currently only positive integers are supported.
	   *
	   * @method paginationWindow
	   * @param  {number} win
	   * @return {layer.QueryBuilder} this
	   */


	  _createClass$36(IdentitiesQuery, [{
	    key: 'paginationWindow',
	    value: function paginationWindow(win) {
	      this._query.paginationWindow = win;
	      return this;
	    }

	    /**
	     * Returns the built query object to send to the server.
	     *
	     * Called by layer.QueryBuilder. You should not need to call this.
	     *
	     * @method build
	     */

	  }, {
	    key: 'build',
	    value: function build() {
	      return this._query;
	    }
	  }]);

	  return IdentitiesQuery;
	}();

	/**
	 * Query builder class. Used with layer.Query to specify what local/remote
	 * data changes to subscribe to.  For examples, see layer.QueryBuilder.MessagesQuery
	 * and layer.QueryBuilder.ConversationsQuery.  This static class is used to instantiate
	 * MessagesQuery and ConversationsQuery Builder instances:
	 *
	 *      var conversationsQueryBuilder = QueryBuilder.conversations();
	 *      var messagesQueryBuidler = QueryBuilder.messages();
	 *
	 * Should you use these instead of directly using the layer.Query class?
	 * That is a matter of programming style and preference, there is no
	 * correct answer.
	 *
	 * @class layer.QueryBuilder
	 */


	var QueryBuilder = {

	  /**
	   * Create a new layer.MessagesQuery instance.
	   *
	   * @method messages
	   * @static
	   * @returns {layer.QueryBuilder.MessagesQuery}
	   */
	  messages: function messages() {
	    return new MessagesQuery$3();
	  },


	  /**
	   * Create a new layer.AnnouncementsQuery instance.
	   *
	   * @method announcements
	   * @static
	   * @returns {layer.QueryBuilder.AnnouncementsQuery}
	   */
	  announcements: function announcements() {
	    return new AnnouncementsQuery$2();
	  },


	  /**
	   * Create a new layer.ConversationsQuery instance.
	   *
	   * @method conversations
	   * @static
	   * @returns {layer.QueryBuilder.ConversationsQuery}
	   */
	  conversations: function conversations() {
	    return new ConversationsQuery$3();
	  },


	  /**
	   * Create a new layer.ChannelsQuery instance.
	   *
	   * @method channels
	   * @static
	   * @returns {layer.QueryBuilder.ChannelsQuery}
	   */
	  channels: function channels() {
	    return new ChannelsQuery$2();
	  },


	  /**
	   * Create a new layer.MembersQuery instance.
	   *
	   * @method members
	   * @static
	   * @returns {layer.QueryBuilder.MembersQuery}
	   */
	  members: function members() {
	    return new MembersQuery$2();
	  },


	  /**
	   * Create a new layer.IdentitiesQuery instance.
	   *
	   * @method identities
	   * @static
	   * @returns {layer.QueryBuilder.IdentitiesQuery}
	   */
	  identities: function identities() {
	    return new IdentitiesQuery$2();
	  },


	  /**
	   * Takes the return value of QueryBuilder.prototype.build and creates a
	   * new QueryBuilder.
	   *
	   * Used within layer.Query.prototype.toBuilder.
	   *
	   * @method fromQueryObject
	   * @private
	   * @param {Object} obj
	   * @static
	   */
	  fromQueryObject: function fromQueryObject(obj) {
	    switch (obj.model) {
	      case Query$8.Message:
	        return new MessagesQuery$3(obj);
	      case Query$8.Announcement:
	        return new AnnouncementsQuery$2(obj);
	      case Query$8.Conversation:
	        return new ConversationsQuery$3(obj);
	      case Query$8.Channel:
	        return new ChannelsQuery$2(obj);
	      case Query$8.Identity:
	        return new IdentitiesQuery$2(obj);
	      case Query$8.Membership:
	        return new MembersQuery$2(obj);
	      default:
	        return null;
	    }
	  }
	};

	var queryBuilder = QueryBuilder;

	var layer$1 = {};
	var layer_1 = layer$1;

	layer$1.Root = root;
	layer$1.Client = client$1;
	layer$1.ClientAuthenticator = clientAuthenticator;
	layer$1.Syncable = syncable;
	layer$1.Conversation = conversation;
	layer$1.Channel = channel;
	layer$1.Container = container;
	layer$1.Message = message;
	layer$1.Message.ConversationMessage = conversationMessage;
	layer$1.Message.ChannelMessage = channelMessage;
	layer$1.Announcement = announcement;
	layer$1.MessagePart = messagePart;
	layer$1.Content = content;
	layer$1.Query = query;
	layer$1.QueryBuilder = queryBuilder;
	layer$1.xhr = xhr$1;
	layer$1.Identity = identity;
	layer$1.Membership = membership;
	layer$1.LayerError = layerError;
	layer$1.LayerEvent = layerEvent;
	layer$1.SyncManager = syncManager;
	layer$1.SyncEvent = syncEvent.SyncEvent;
	layer$1.XHRSyncEvent = syncEvent.XHRSyncEvent;
	layer$1.WebsocketSyncEvent = syncEvent.WebsocketSyncEvent;
	layer$1.Websockets = {
	  SocketManager: socketManager,
	  RequestManager: requestManager,
	  ChangeManager: changeManager
	};
	layer$1.OnlineStateManager = onlineStateManager;
	layer$1.DbManager = dbManager;
	layer$1.Constants = _const;
	layer$1.Util = clientUtils;
	layer$1.TypingIndicators = typingIndicators;
	layer$1.TypingIndicators.TypingListener = typingListener;
	layer$1.TypingIndicators.TypingPublisher = typingPublisher;

	/* istanbul ignore next */
	if (commonjsGlobal.layer && commonjsGlobal.layer.Client) {
	  console.error('ERROR: It appears that you have multiple copies of the Layer WebSDK in your build!');
	} else {
	  commonjsGlobal.layer = layer_1;
	}
	var index$2 = commonjsGlobal.layer;

	var layer = index$2;

	var client = new layer.Client({
	    appId: "layer:///apps/staging/YOUR-APP-ID"
	});

	console.log(client);

	var index = {

	};

	return index;

}());
