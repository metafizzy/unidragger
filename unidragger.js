/*!
 * Unidragger v2.4.0
 * Draggable base class
 * MIT license
 */

( function( window, factory ) {
  // universal module definition
  if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        require('ev-emitter'),
    );
  } else {
    // browser global
    window.Unidragger = factory(
        window,
        window.EvEmitter,
    );
  }

}( window, function factory( window, EvEmitter ) {

let startEvent;
if ( 'ontouchstart' in window ) {
  // HACK prefer Touch Events as you can preventDefault on touchstart to
  // disable scroll in iOS & mobile Chrome metafizzy/flickity#1177
  startEvent = 'touchstart';
} else if ( window.PointerEvent ) {
  // Pointer Events
  startEvent = 'pointerdown';
} else {
  // fallback to mouse events
  startEvent = 'mousedown';
}

// hash of events to be bound after start event
const postStartEvents = {
  mousedown: [ 'mousemove', 'mouseup' ],
  touchstart: [ 'touchmove', 'touchend', 'touchcancel' ],
  pointerdown: [ 'pointermove', 'pointerup', 'pointercancel' ],
}[ startEvent ];

// -------------------------- Unidragger -------------------------- //

function Unidragger() {}

// inherit EvEmitter
let proto = Unidragger.prototype = Object.create( EvEmitter.prototype );

proto.bindStartEvent = function( elem ) {
  elem.addEventListener( startEvent, this );
};

proto.unbindStartEvent = function( elem ) {
  elem.removeEventListener( startEvent, this );
};

// trigger handler methods for events
proto.handleEvent = function( event ) {
  let method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

// returns the touch that we're keeping track of
proto.getTouch = function( touches ) {
  for ( let touch of touches ) {
    if ( touch.identifier == this.pointerIdentifier ) return touch;
  }
};

// ----- start event ----- //

proto.onmousedown = function( event ) {
  // dismiss clicks from right or middle buttons
  let button = event.button;
  if ( button && ( button !== 0 && button !== 1 ) ) {
    return;
  }
  this.pointerDown( event, event );
};

proto.ontouchstart = function( event ) {
  this.pointerDown( event, event.changedTouches[0] );
};

proto.onpointerdown = function( event ) {
  this.pointerDown( event, event );
};

/**
 * pointer start
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerDown = function( event, pointer ) {
  // dismiss right click and other pointers. button = 0 is okay, 1-4 not
  if ( event.button || this.isPointerDown ) {
    return;
  }

  this.isPointerDown = true;
  // save pointer identifier to match up touch events
  this.pointerIdentifier = pointer.pointerId !== undefined ?
    // pointerId for pointer events, touch.indentifier for touch events
    pointer.pointerId : pointer.identifier;

  this.emitEvent( 'pointerDown', [ event, pointer ] );
};

proto.bindPostStartEvents = function() {
  postStartEvents.forEach( ( eventName ) => {
    window.addEventListener( eventName, this );
  } );
};

proto.unbindPostStartEvents = function() {
  postStartEvents.forEach( ( eventName ) => {
    window.removeEventListener( eventName, this );
  } );
};

// ----- move event ----- //

proto.onmousemove = function( event ) {
  this.pointerMove( event, event );
};

proto.onpointermove = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this.pointerMove( event, event );
  }
};

proto.ontouchmove = function( event ) {
  let touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this.pointerMove( event, touch );
  }
};

/**
 * pointer move
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerMove = function( event, pointer ) {
  this.emitEvent( 'pointerMove', [ event, pointer ] );
};

// ----- end event ----- //

proto.onmouseup = function( event ) {
  this.pointerUp( event, event );
};

proto.onpointerup = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this.pointerUp( event, event );
  }
};

proto.ontouchend = function( event ) {
  let touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this.pointerUp( event, touch );
  }
};

/**
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerUp = function( event, pointer ) {
  this.pointerDone();
  this.emitEvent( 'pointerUp', [ event, pointer ] );
};

// ----- pointer done ----- //

// triggered on pointer up & pointer cancel
proto.pointerDone = function() {
  this.pointerReset();
  this.unbindPostStartEvents();
  this.emitEvent('pointerDone');
};

proto.pointerReset = function() {
  // reset properties
  this.isPointerDown = false;
  delete this.pointerIdentifier;
};

// ----- pointer cancel ----- //

proto.onpointercancel = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this.pointerCancel( event, event );
  }
};

proto.ontouchcancel = function( event ) {
  let touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this.pointerCancel( event, touch );
  }
};

/**
 * pointer cancel
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerCancel = function( event, pointer ) {
  this.pointerDone();
  this.emitEvent( 'pointerCancel', [ event, pointer ] );
};


// -----  ----- //

// utility function for getting x/y coords from event
Unidragger.getPointerPoint = function( pointer ) {
  return {
    x: pointer.pageX,
    y: pointer.pageY,
  };
};

// ----- bind start ----- //

proto.bindHandles = function() {
  this._bindHandles( true );
};

proto.unbindHandles = function() {
  this._bindHandles( false );
};

/**
 * Add or remove start event
 * @param {Boolean} isAdd
 */
proto._bindHandles = function( isAdd ) {
  // munge isAdd, default to true
  isAdd = isAdd === undefined ? true : isAdd;
  // bind each handle
  let bindMethod = isAdd ? 'addEventListener' : 'removeEventListener';
  let touchAction = isAdd ? this._touchActionValue : '';
  for ( let i = 0; i < this.handles.length; i++ ) {
    let handle = this.handles[i];
    this._bindStartEvent( handle, isAdd );
    handle[ bindMethod ]( 'click', this );
    // touch-action: none to override browser touch gestures. metafizzy/flickity#540
    if ( window.PointerEvent ) {
      handle.style.touchAction = touchAction;
    }
  }
};

// prototype so it can be overwriteable by Flickity
proto._touchActionValue = 'none';

// ----- start event ----- //

/**
 * pointer start
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerDown = function( event, pointer ) {
  let isOkay = this.okayPointerDown( event );
  if ( !isOkay ) {
    return;
  }
  // track start event position
  // Safari 9 overrides pageX and pageY. These values needs to be copied. flickity#842
  this.pointerDownPointer = {
    pageX: pointer.pageX,
    pageY: pointer.pageY,
  };

  event.preventDefault();
  this.pointerDownBlur();
  // bind move and end events
  this.bindPostStartEvents( event );
  this.emitEvent( 'pointerDown', [ event, pointer ] );
};

// nodes that have text fields
let cursorNodes = {
  TEXTAREA: true,
  INPUT: true,
  SELECT: true,
  OPTION: true,
};

// input types that do not have text fields
let clickTypes = {
  radio: true,
  checkbox: true,
  button: true,
  submit: true,
  image: true,
  file: true,
};

// dismiss inputs with text fields. flickity#403, flickity#404
proto.okayPointerDown = function( event ) {
  let isCursorNode = cursorNodes[ event.target.nodeName ];
  let isClickType = clickTypes[ event.target.type ];
  let isOkay = !isCursorNode || isClickType;
  if ( !isOkay ) {
    this._pointerReset();
  }
  return isOkay;
};

// kludge to blur previously focused input
proto.pointerDownBlur = function() {
  let focused = document.activeElement;
  // do not blur body for IE10, metafizzy/flickity#117
  let canBlur = focused && focused.blur && focused != document.body;
  if ( canBlur ) {
    focused.blur();
  }
};

// ----- move event ----- //

/**
 * drag move
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerMove = function( event, pointer ) {
  let moveVector = this._dragPointerMove( event, pointer );
  this.emitEvent( 'pointerMove', [ event, pointer, moveVector ] );
  this._dragMove( event, pointer, moveVector );
};

// base pointer move logic
proto._dragPointerMove = function( event, pointer ) {
  let moveVector = {
    x: pointer.pageX - this.pointerDownPointer.pageX,
    y: pointer.pageY - this.pointerDownPointer.pageY,
  };
  // start drag if pointer has moved far enough to start drag
  if ( !this.isDragging && this.hasDragStarted( moveVector ) ) {
    this._dragStart( event, pointer );
  }
  return moveVector;
};

// condition if pointer has moved far enough to start drag
proto.hasDragStarted = function( moveVector ) {
  return Math.abs( moveVector.x ) > 3 || Math.abs( moveVector.y ) > 3;
};

// ----- end event ----- //

/**
 * pointer up
 * @param {Event} event
 * @param {Event | Touch} pointer
 */
proto.pointerUp = function( event, pointer ) {
  this.emitEvent( 'pointerUp', [ event, pointer ] );
  this._dragPointerUp( event, pointer );
};

proto._dragPointerUp = function( event, pointer ) {
  if ( this.isDragging ) {
    this._dragEnd( event, pointer );
  } else {
    // pointer didn't move enough for drag to start
    this._staticClick( event, pointer );
  }
};

// -------------------------- drag -------------------------- //

// dragStart
proto._dragStart = function( event, pointer ) {
  this.isDragging = true;
  // prevent clicks
  this.isPreventingClicks = true;
  this.dragStart( event, pointer );
};

proto.dragStart = function( event, pointer ) {
  this.emitEvent( 'dragStart', [ event, pointer ] );
};

// dragMove
proto._dragMove = function( event, pointer, moveVector ) {
  // do not drag if not dragging yet
  if ( !this.isDragging ) {
    return;
  }

  this.dragMove( event, pointer, moveVector );
};

proto.dragMove = function( event, pointer, moveVector ) {
  event.preventDefault();
  this.emitEvent( 'dragMove', [ event, pointer, moveVector ] );
};

// dragEnd
proto._dragEnd = function( event, pointer ) {
  // set flags
  this.isDragging = false;
  // re-enable clicking async
  setTimeout( function() {
    delete this.isPreventingClicks;
  }.bind( this ) );

  this.dragEnd( event, pointer );
};

proto.dragEnd = function( event, pointer ) {
  this.emitEvent( 'dragEnd', [ event, pointer ] );
};

// ----- onclick ----- //

// handle all clicks and prevent clicks when dragging
proto.onclick = function( event ) {
  if ( this.isPreventingClicks ) {
    event.preventDefault();
  }
};

// ----- staticClick ----- //

// triggered after pointer down & up with no/tiny movement
proto._staticClick = function( event, pointer ) {
  // ignore emulated mouse up clicks
  if ( this.isIgnoringMouseUp && event.type == 'mouseup' ) {
    return;
  }

  this.staticClick( event, pointer );

  // set flag for emulated clicks 300ms after touchend
  if ( event.type != 'mouseup' ) {
    this.isIgnoringMouseUp = true;
    // reset flag after 300ms
    setTimeout( function() {
      delete this.isIgnoringMouseUp;
    }.bind( this ), 400 );
  }
};

proto.staticClick = function( event, pointer ) {
  this.emitEvent( 'staticClick', [ event, pointer ] );
};

// ----- utils ----- //

// utility function for getting x/y coords from event
Unidragger.getPointerPoint = function( pointer ) {
  return {
    x: pointer.pageX,
    y: pointer.pageY,
  };
};

// -----  ----- //

return Unidragger;

} ) );
