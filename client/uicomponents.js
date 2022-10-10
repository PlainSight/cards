define(function(require, exports, module) {
    // each ui component has 3 functions
    // addChildren - a function that takes any other ui component
    // draw - a function that takes (drawSprite, drawText, draw, z, px, py, pwidth, pheight)
    // interact - a function that handles any events

    function component(x, y, width, height, dl, ds) {
        var newComponent = {
            children: [],
            x: x,
            y: y,
            width: width,
            height: height,
            displayLocation: dl || 'absolute', // also relative
            displaySize: ds || 'absolute', // also relative
            draw: function(drawSprite, drawText, draw, z, px, py, pwidth, pheight) {},
            interact: function(event) {}
        };
        newComponent.addChildren = function(children) {
            children.forEach(c => {
                newComponent.children.push(c);
            });
        }
        return newComponent;
    }

    function calculateAbsoluteValues(x, y, width, height, px, py, pwidth, pheight, displayLocation, displaySize) {
        var absoluteWidth = width;
        var absoluteHeight = height;
        var absoluteX = px + x;
        var absoluteY = py + y;
        if (displaySize == 'relative') {
            absoluteWidth = pwidth * width / 100;
            absoluteHeight = pheight * height / 100;
        }
        if (displayLocation == 'relative') {
            absoluteX = px + (pwidth * x / 100);
            absoluteY = py + (pheight * y / 100);
        }
        
        return {
            x: absoluteX,
            y: absoluteY,
            width: absoluteWidth,
            height: absoluteHeight
        };
    }

    // for tiling a sprite accross a specified area with sprite sized dim
    function calculateTiledPositions(x, y, width, height, dim) {
        var res = [];

        var horizontal = 'left';
        for(var cx = x; cx < x + width; cx += dim) {
            if (cx > x) {
                horizontal = 'middle';
            }
            if (cx + dim >= x + width) {
                horizontal = 'right';
            }
            var vertical = 'top';
            for(var cy = y; cy < y + height; cy += dim) {
                if (cy > y) {
                    vertical = 'middle';
                }
                if (cy + dim >= y + height) {
                    vertical = 'bottom';
                }
                res.push({
                    x: cx,
                    y: cy,
                    meta: vertical+horizontal
                });
            }  
        }
        
        return res;
    }

    function uiGenericElementDrawer(positions, oneline, dim, z, yOffset, drawSprite) {
        if (oneline) {
            positions.forEach(p => {
                switch (p.meta) {
                    case 'topleft':
                    case 'middleleft':
                    case 'bottomleft':
                        drawSprite('ui', 0, yOffset, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'topmiddle':
                    case 'middlemiddle':
                    case 'bottommiddle':
                        drawSprite('ui', 1, yOffset, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'topright':
                    case 'middleright':
                    case 'bottomright':
                        drawSprite('ui', 2, yOffset, p.x, p.y, dim, dim, 0, z);
                        break;
                }
            });
        } else {
            positions.forEach(p => {
                switch (p.meta) {
                    case 'topleft':
                        drawSprite('ui', 0, yOffset+1, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'topmiddle':
                        drawSprite('ui', 1, yOffset+1, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'topright':
                        drawSprite('ui', 2, yOffset+1, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'middleleft':
                        drawSprite('ui', 0, yOffset+2, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'middlemiddle':
                        drawSprite('ui', 1, yOffset+2, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'middleright':
                        drawSprite('ui', 2, yOffset+2, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'bottomleft':
                        drawSprite('ui', 0, yOffset+3, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'bottomright':
                        drawSprite('ui', 1, yOffset+3, p.x, p.y, dim, dim, 0, z);
                        break;
                    case 'bottommiddle':
                        drawSprite('ui', 2, yOffset+3, p.x, p.y, dim, dim, 0, z);
                        break;
                }
            });
        }
    }

    // leaf
    exports.button = function (x, y, width, height, displayLocation = 'absolute', displaySize = 'absolute', callback) {
        var c = component(x, y, width, height, displayLocation, displaySize);
        c.draw = function(drawSprite, drawText, draw, z, px, py, pwidth, pheight) {
            var absVals = calculateAbsoluteValues(c.x, c.y, c.width, c.height, px, py, pwidth, pheight, c.displayLocation, c.displaySize)

            var positions = calculateTiledPositions(absVals.x, absVals.y, absVals.width, absVals.height, 32);
            
            uiGenericElementDrawer(positions, dim >= absVals.height, dim, z, 8, drawSprite);

            c.children.forEach(c => {
                c.draw(drawSprite, drawText, draw, z-0.01, absVals.x, absVals.y, absVals.width, absVals.height);
            });
        }
        c.interact = function(event) {
            // if event is click and within bound of box then call the callback function
        }
        return c;
    };

    // leaf
    exports.text = function (x, y, width, height, displayLocation = 'absolute', displaySize = 'absolute', text) {
        var c = component(x, y, width, height, displayLocation, displaySize);
        c.textValue = text;
        c.draw = function(drawSprite, drawText, draw, z, px, py, pwidth, pheight) {
            var absVals = calculateAbsoluteValues(c.x, c.y, c.width, c.height, px, py, pwidth, pheight, c.displayLocation, c.displaySize)

            drawText(absVals.x, absVals.y, absVals.width, absVals.width, text, z, false, false);
        }
        return c;
    };

    exports.inputBox = function (x, y, width, height, displayLocation = 'absolute', displaySize = 'absolute', initial, submit) {
        var c = component(x, y, width, height, displayLocation, displaySize);
        c.focus = false;
        c.inputValue = initial;
        c.draw = function(drawSprite, drawText, draw, z, px, py, pwidth, pheight) {
            var absVals = calculateAbsoluteValues(c.x, c.y, c.width, c.height, px, py, pwidth, pheight, c.displayLocation, c.displaySize)

            var positions = calculateTiledPositions(absVals.x, absVals.y, absVals.width, absVals.height, 32);
            
            uiGenericElementDrawer(positions, dim >= absVals.height, dim, z, 4, drawSprite);

            drawText(absVals.x + (dim/2), absVals.y, absVals.width - (dim/2), absVals.width - (dim/2), text, z, true, false);
        }
        c.interact = function(event) {
            // if clicked then get focus -- global focus handler should be consulted

            // if enter is typed then submit is called with the input value
        }
        return c;
    };

    // node
    exports.box = function (x, y, width, height, displayLocation = 'absolute', displaySize = 'absolute') {
        var c = component(x, y, width, height, displayLocation, displaySize);
        c.draw = function(drawSprite, drawText, draw, z, px, py, pwidth, pheight) {
            var absVals = calculateAbsoluteValues(c.x, c.y, c.width, c.height, px, py, pwidth, pheight, c.displayLocation, c.displaySize)

            var positions = calculateTiledPositions(absVals.x, absVals.y, absVals.width, absVals.height, 32);
            
            uiGenericElementDrawer(positions, dim >= absVals.height, dim, z, 0, drawSprite);

            c.children.forEach(c => {
                c.draw(drawSprite, drawText, draw, z-0.01, absVals.x, absVals.y, absVals.width, absVals.height);
            });
        }
        return c;
    };

    // base ui component everything is contained within
    exports.screen = function(z) {
        var c = component();
        c.x = 0;
        c.y = 0;
        c.width = 100;
        c.height = 100;
        c.displayLocation = 'relative';
        c.displayPosition = 'relative';
        c.draw = function(drawSprite, drawText, draw, z, px, py, pwidth, pheight) {
            c.children.forEach(c => {
                c.draw(drawSprite, drawText, draw, z-0.01, px, py, pwidth, pheight);
            });
        }
    };
});