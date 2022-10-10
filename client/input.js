define(function(require, exports, module) {
    var sound = require('./sound');

    var cursorX = 100;
    var cursorY = 100;
    
    var mouseHandler = function(type, button, state, position) {

    };

    var keyHandler = function(key, state, modifiers) {

    };

    function updateCursorPosition(e) {
        cursorX = e.x;
        cursorY = e.y;
    }

    function mouseDown(e) {
        sound.triggerAudio();
        var type = 'touch';
        var button = 'left';
        if (e.pointerType == 'mouse') {
            type = 'mouse';
            switch (e.button) {
                case 1:
                    button = 'middle';
                    break;
                case 2:
                    button = 'right';
                    break;
            }
        }
        mouseHandler(type, button, 'down', { x: e.x, y: e.y });
    }

    function mouseUp(e) {
        var type = 'touch';
        var button = 'left';
        if (e.pointerType == 'mouse') {
            type = 'mouse';
            switch (e.button) {
                case 1:
                    button = 'middle';
                    break;
                case 2:
                    button = 'right';
                    break;
            }
        }
        mouseHandler(type, button, 'up', { x: e.x, y: e.y });
    }

    function keyDown(e) {
        keyHandler(e.key, 'down', {
            shift: e.shiftKey,
            ctrl: e.ctrlKey
        });
    }

    function keyUp(e) {
        keyHandler(e.key, 'up', {
            shift: e.shiftKey,
            ctrl: e.ctrlKey
        });
    }

    document.addEventListener('pointermove', updateCursorPosition, false);
    document.addEventListener('pointerdown', mouseDown, false);
    document.addEventListener('pointerup', mouseUp, false);
    document.addEventListener('keydown', keyDown, false);
    document.addEventListener('keyup', keyUp, false);

    exports.setKeyHandler = function(kh) {
        keyHandler = kh;
    };
    exports.setMouseHandler = function(mh) {
        mouseHandler = mh;
    };
    exports.getMousePosition = function() {
        return {
            x: cursorX,
            y: cursorY
        };
    };
});