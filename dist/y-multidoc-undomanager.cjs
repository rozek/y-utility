'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var array = require('lib0/array');
var map = require('lib0/map');
var observable = require('lib0/observable');
var Y = require('yjs');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var array__namespace = /*#__PURE__*/_interopNamespace(array);
var map__namespace = /*#__PURE__*/_interopNamespace(map);
var Y__namespace = /*#__PURE__*/_interopNamespace(Y);

/**
 * @param {YMultiDocUndoManager} mum
 * @param {'undo' | 'redo'} type
 */
const popStackItem = (mum, type) => {
  const stack = type === 'undo' ? mum.undoStack : mum.redoStack;
  while (stack.length > 0) {
    const um = /** @type {Y.UndoManager} */ (stack.pop());
    const prevUmStack = type === 'undo' ? um.undoStack : um.redoStack;
    const stackItem = /** @type {any} */ (prevUmStack.pop());
    let actionPerformed = false;
    if (type === 'undo') {
      um.undoStack = [stackItem];
      actionPerformed = um.undo() !== null;
      um.undoStack = prevUmStack;
    } else {
      um.redoStack = [stackItem];
      actionPerformed = um.redo() !== null;
      um.redoStack = prevUmStack;
    }
    if (actionPerformed) {
      return stackItem
    }
  }
  return null
};

/**
 * @extends Observable<any>
 */
class YMultiDocUndoManager extends observable.Observable {
  /**
   * @param {Y.AbstractType<any>|Array<Y.AbstractType<any>>} typeScope Accepts either a single type, or an array of types
   * @param {ConstructorParameters<typeof Y.UndoManager>[1]} opts
   */
  constructor (typeScope = [], opts = {}) {
    super();
    /**
     * @type {Map<Y.Doc, Y.UndoManager>}
     */
    this.docs = new Map();
    this.trackedOrigins = opts.trackedOrigins || new Set([null]);
    opts.trackedOrigins = this.trackedOrigins;
    this._defaultOpts = opts;
    /**
     * @type {Array<Y.UndoManager>}
     */
    this.undoStack = [];
    /**
     * @type {Array<Y.UndoManager>}
     */
    this.redoStack = [];
    this.addToScope(typeScope);
  }

  /**
   * @param {Array<Y.AbstractType<any>> | Y.AbstractType<any>} ytypes
   */
  addToScope (ytypes) {
    ytypes = array__namespace.isArray(ytypes) ? ytypes : [ytypes];
    ytypes.forEach(ytype => {
      const ydoc = /** @type {Y.Doc} */ (ytype.doc);
      const um = map__namespace.setIfUndefined(this.docs, ydoc, () => {
        const um = new Y__namespace.UndoManager([ytype], this._defaultOpts);
        um.on('stack-cleared', /** @param {any} opts */ ({ undoStackCleared, redoStackCleared }) => {
          this.clear(undoStackCleared, redoStackCleared);
        });
        ydoc.on('destroy', () => {
          this.docs.delete(ydoc);
          this.undoStack = this.undoStack.filter(um => um.doc !== ydoc);
          this.redoStack = this.redoStack.filter(um => um.doc !== ydoc);
        });
        um.on('stack-item-added', /** @param {any} change */ change => {
          const stack = change.type === 'undo' ? this.undoStack : this.redoStack;
          stack.push(um);
          this.emit('stack-item-added', [{ ...change, ydoc: ydoc }, this]);
        });
        um.on('stack-item-updated', /** @param {any} change */ change => {
          this.emit('stack-item-updated', [{ ...change, ydoc }, this]);
        });
        um.on('stack-item-popped', /** @param {any} change */ change => {
          this.emit('stack-item-popped', [{ ...change, ydoc }, this]);
        });
        // if doc is destroyed
        // emit events from um to multium
        return um
      });
      /* c8 ignore next 4 */
      if (um.scope.every(yt => yt !== ytype)) {
        um.scope.push(ytype);
      }
    });
  }

  /**
   * @param {any} origin
   */
  /* c8 ignore next 3 */
  addTrackedOrigin (origin) {
    this.trackedOrigins.add(origin);
  }

  /**
   * @param {any} origin
   */
  /* c8 ignore next 3 */
  removeTrackedOrigin (origin) {
    this.trackedOrigins.delete(origin);
  }

  /**
   * Undo last changes on type.
   *
   * @return {any?} Returns StackItem if a change was applied
   */
  undo () {
    return popStackItem(this, 'undo')
  }

  /**
   * Redo last undo operation.
   *
   * @return {any?} Returns StackItem if a change was applied
   */
  redo () {
    return popStackItem(this, 'redo')
  }

  clear (clearUndoStack = true, clearRedoStack = true) {
    /* c8 ignore next */
    if ((clearUndoStack && this.canUndo()) || (clearRedoStack && this.canRedo())) {
      this.docs.forEach(um => {
        /* c8 ignore next */
        clearUndoStack && (this.undoStack = []);
        /* c8 ignore next */
        clearRedoStack && (this.redoStack = []);
        um.clear(clearUndoStack, clearRedoStack);
      });
      this.emit('stack-cleared', [{ undoStackCleared: clearUndoStack, redoStackCleared: clearRedoStack }]);
    }
  }

  /* c8 ignore next 5 */
  stopCapturing () {
    this.docs.forEach(um => {
      um.stopCapturing();
    });
  }

  /**
   * Are undo steps available?
   *
   * @return {boolean} `true` if undo is possible
   */
  canUndo () {
    return this.undoStack.length > 0
  }

  /**
   * Are redo steps available?
   *
   * @return {boolean} `true` if redo is possible
   */
  canRedo () {
    return this.redoStack.length > 0
  }

  destroy () {
    this.docs.forEach(um => um.destroy());
    super.destroy();
  }
}

/**
 * @todo remove
 * @deprecated Use YMultiDocUndoManager instead
 */
const MultiDocUndoManager = YMultiDocUndoManager;

exports.MultiDocUndoManager = MultiDocUndoManager;
exports.YMultiDocUndoManager = YMultiDocUndoManager;
//# sourceMappingURL=y-multidoc-undomanager.cjs.map
