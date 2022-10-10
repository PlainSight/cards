define(function(require, exports, module) {
    var webaddress = 'ws://localhost:7788';
    //var webaddress = 'wss://plainsightindustries.com/rollbacksocket';
    
    var simulation = require('./simulation');
    var network = require('./network');
    var sound = require('./sound');
    var renderer = require('./renderer');
    var input = require('./input');
    var uiComponents = require('./uicomponents');
    var cardSizeY = 192;
    var cardSizeX = 128;

    // var sim = new simulation();

    // sim.simulateNextTick();

    //console.log(sim);

    var chatlog = [];

    function processMessage(m) {
        var message = JSON.parse(m);
        switch (message.type) {
            case 'text':
                chatlog.push({ message: message.data, age: Date.now() });
                break;
            case 'cookie':
                localStorage.setItem('rollback0.1', message.data.cookie);
                serverOffset = message.data.serverTime - Date.now();
                break;
            case 'nameplease':
                showNamebox = true;
                break;
            case 'codeplease':
                joinCode = '';
                showJoinUI = true;
                break;
            case 'lobby':
                lobbyName = message.data;
                break;
            case 'host':
                showHostUI = true;
                break;
            case 'state':
                
                break;
            case 'command':
                
                break;
            case 'playerlist':
                boards = message.data.players.map(p => NewBoard(p.id, p.name, p.score));
                break;
            case 'playerid':
                playerId = message.data;
                break;
        }
    }

    network.setMessageCallback(processMessage);
    network.setErrorCallback(() => {});
    network.connect(webaddress);

    var initialTextures = [
        { n: 'cards.png', d: 256, options: { noblur: false } }
    ];

    renderer.loadTextures(initialTextures);

    var screen = uiComponents.screen()

    var nameEntry = uiComponents.box(20, 20, 60, 60, 'relative', 'relative');

    var stacks = {};

    var cards = (() => { 
        var res = [];
        for(var i = 0; i < 52; i++) { 
            var card = { location: 'global', x: 128, y: (1+Math.floor(i / 13))*192, type: i, flipped: true, lastFlipped: 0, stack: null };
            if (i % 13 == 0) {
                createNewStack(card);
            } else {
                dropCard(card);
            }
            res.push(card);
        }
        return res;
    })();

    console.log(cards, stacks);

    function generateSnapPoints(c) {
        var snaps = {};
        var nearbyStacks = Object.values(stacks).filter(s => {
            return Math.abs(c.x - s.x) <= cardSizeX*3 && Math.abs(c.y - s.y) <= cardSizeY*3;
        });

        nearbyStacks.forEach(s => {
            snaps[s.x+','+s.y] = {
                x: s.x,
                y: s.y,
                stack: s
            };
            for (var x = s.x - (2*cardSizeX); x <= s.x + (2*cardSizeX); x += cardSizeX/2) {
                for (var y = s.y - cardSizeY; y <= s.y + cardSizeY; y += cardSizeY) {
                    if (Math.abs(x - c.x) > (cardSizeX/2) || Math.abs(y - c.y) > cardSizeY) {
                        continue;
                    }
                    if (Math.abs(x - s.x) < cardSizeX/2 && Math.abs(y - s.y) < cardSizeY/2) {
                        continue;
                    }
                    snaps[x+','+y] = snaps[x+','+y] || {
                        x: x,
                        y: y
                    };
                }
            }
        });
        snaps = Object.values(snaps);
        return snaps.filter(s => {

            if (s.stack) {
                return Math.abs(s.x - c.x) <= cardSizeX && Math.abs(s.y - c.y) <= cardSizeY;
            }
            return nearbyStacks.filter(ns => {
                return (Math.abs(s.x - ns.x) < cardSizeX && Math.abs(s.y - ns.y) < cardSizeY);
            }).length == 0;
        });
    }

    function createNewStack(c) {
        var stack = {
            id: c.x*10000+c.y,
            x: c.x, 
            y: c.y,
            cards: [c]
        };
        c.stack = stack;
        stacks[stack.id] = stack;
    }

    function dropCard(c) {
        var snapPoints = generateSnapPoints(c);
        if (snapPoints.length == 0) {
            createNewStack(c);
        } else {
            var sortedSnapPoints = snapPoints.sort((a, b) => {
                return Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y);
            });
            var closestPoint = sortedSnapPoints[0];

            if (closestPoint.stack) {
                c.x = closestPoint.x;
                c.y = closestPoint.y;
                closestPoint.stack.cards.push(c);
                c.stack = closestPoint.stack;
            } else {
                c.x = closestPoint.x;
                c.y = closestPoint.y;
                createNewStack(c);
            }
        }
    }

    function pickUpCard(c, position) {
        dragging = c;
        if (c.stack.cards.length == 1) {
            delete stacks[c.stack.id];
        } else {
            c.stack.cards.pop();
        }
        c.stack = null;
        setDraggingOffset(c, position);
    }

    function calculateCardZAndOffset(c) {
        if (c.stack) {
            var positionInStack = c.stack.cards.indexOf(c);
            return {
                z : 1-(positionInStack*0.0001),
                dx: positionInStack,
                dy: positionInStack
            };
        }
        if (c == dragging) {
            return {
                z: 1-0.01,
                dx: 0,
                dy: 0
            }
        }
    }

    function appearance(drawSprite, drawText, draw, delta, now) {
        passiveInputProcessing();

        function drawCard(type, flipped, lastFlipped, dx, dy, dz, lux, snaps) {
            var sy = Math.floor(type / 13);
            var sx = type % 13;
            var flipDelta = now - lastFlipped;
            var flipTime = 180;

            var w = cardSizeY;
            if (flipDelta < flipTime) {
                var flipFraction = flipDelta / flipTime;

                if (flipFraction <= 0.5) {
                    if (flipped) {
                        w = Math.abs(cardSizeY*Math.cos(flipFraction*Math.PI));
                    } else {
                        sx = 0;
                        sy = 4;
                        w = Math.abs(cardSizeY*Math.cos(flipFraction*Math.PI))
                    }
                } else {
                    if (flipped) {
                        sx = 0;
                        sy = 4;
                        w = Math.abs(cardSizeY*Math.cos(flipFraction*Math.PI));
                    } else {
                        w = Math.abs(cardSizeY*Math.cos(flipFraction*Math.PI));
                    }
                }
            } else {
                if (flipped) {
                    sx = 0;
                    sy = 4;
                }
            }

            drawSprite('cards', sx, sy, dx, dy, w, cardSizeY, 0, dz, null, lux);
            snaps.forEach(s => {
                drawSprite('cards', sx, sy, s.x, s.y, w, cardSizeY, 0, dz+0.0001, null, 1.0);
            });
        }

        cards.forEach(c => {
            var lux = null;
            var zAndOff = calculateCardZAndOffset(c);
            var snaps = [];
            if (hovered == c) {
                lux = 'white';
            }
            if (dragging == c) {
                lux = 'grey';
                //snaps = generateSnapPoints(c);
            }
            drawCard(c.type, c.flipped, c.lastFlipped, c.x+zAndOff.dx, c.y+zAndOff.dy, zAndOff.z, lux, snaps);
        });
    }

    var hovered = null;
    var dragging = null;
    var draggingOffset = { x: 0, y: 0 };

    function flipCard(c) {
        c.flipped = !c.flipped;
        c.lastFlipped = Date.now();
    }

    function isCursorOverCard(card, cursor) {
        var dx = Math.abs(cursor.x - card.x);
        var dy = Math.abs(cursor.y - card.y);
        return dx < 64 && dy < 96;
    }

    function setDraggingOffset(card, cursor) {
        draggingOffset = {
            x: cursor.x - card.x, 
            y: cursor.y - card.y
        };
    }

    function shuffle(array) {
		let currentIndex = array.length,  randomIndex;
	  
		// While there remain elements to shuffle.
		while (currentIndex != 0) {
	  
		  // Pick a remaining element.
		  randomIndex = Math.floor(Math.random() * currentIndex);
		  currentIndex--;
	  
		  // And swap it with the current element.
		  [array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]];
		}
	  
		return array;
    }

    function passiveInputProcessing() {
        var mousePosition = input.getMousePosition();
        hovered = null;
        // determine hovered
        if (dragging) {
            dragging.x = mousePosition.x - draggingOffset.x;
            dragging.y = mousePosition.y - draggingOffset.y;
            return;
        }

        Object.values(stacks).forEach(st => {
            var topOfTheStack = st.cards[st.cards.length-1];
            if (isCursorOverCard(topOfTheStack, mousePosition)) {
                hovered = topOfTheStack;
            }
        });
    }

    function mouseHandler (type, button, state, position) {
        console.log(type, button, state, position);
        if (state == 'down' && button == 'left') {
            dragging = null;
            Object.values(stacks).forEach(st => {
                var topOfTheStack = st.cards[st.cards.length-1];
                if (isCursorOverCard(topOfTheStack, position)) {
                    pickUpCard(topOfTheStack, position);
                }
            })
        }
        if (state == 'up' && button == 'left') {
            if (dragging) {
                dropCard(dragging);
                dragging = null;    
            }
        }
    };

    function keyHandler(key, state, modifiers) {
        console.log(key, state, modifiers);
        if (key == 'f' && state == 'down') {
            if (dragging) {
                flipCard(dragging);
            } else {
                if (hovered) {
                    flipCard(hovered);
                }
            }
        }
        if (key == 'r' && state == 'down') {
            if (hovered) {
                shuffle(hovered.stack.cards);
            }
        }
    };

    renderer.setSceneDrawer(appearance);

    input.setKeyHandler(keyHandler);
    input.setMouseHandler(mouseHandler);

    // setInterval(() => {
    //     cards.forEach(c => {
    //         if(Math.random() < 0.2) {
    //             flipCard(c);
    //         }
    //     });
    // }, 2500);

    
});