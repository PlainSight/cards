define(function(require, exports, module) {
    exports.blankState = function() {
        return {
            objects: []
        }
    }

    exports.boringState = function() {
        return {
            objects: [
                {
                    id: 1,
                    x: 5, y: 5,
                    xIntent: 5, yIntent: 5,
                    activeIntent: false
                },
                {
                    id: 2,
                    x: 10, y: 5,
                    xIntent: 10, yIntent: 5,
                    activeIntent: false
                },
                {
                    id: 3,
                    x: 15, y: 5,
                    xIntent: 30, yIntent: 5,
                    activeIntent: true
                }
            ]
        };
    }

    exports.processState = function(state, commands) {
        state = JSON.parse(JSON.stringify(state));

        commands.forEach(c => {
            state.objects.forEach(o => {
                if (c.ids.includes(o.id)) {
                    o.xIntent = c.x;
                    o.yIntent = c.y;
                    o.activeIntent = true;
                }
            });
        });
        
        var RADIUS = 5;
        var SPEED = 2;

        // run game logic

        // apply movement
        state.objects.filter(o => o.activeIntent).forEach(o => {
            // move object directly towards destination
            if (Math.hypot(o.x - o.xIntent, o.y - o.yIntent) < SPEED) {
                o.x = o.xIntent;
                o.y = o.yIntent;
                o.activeIntent = false;
                // disable intent once reaching the destination - this should probably also happen when sufficiently close
            } else {
                var angle = 0;
                if (o.xIntent == o.x) {
                    var dy = o.yIntent - o.y;
                    angle = Math.PI * dy / Math.abs(dy);
                } else {
                    angle = Math.atan2((o.yIntent - o.y), (o.xIntent - o.x));
                }
                o.x += Math.cos(angle) * SPEED;
                o.y += Math.sin(angle) * SPEED;
            }
        });

        // calculate collision vectors
        for(var oi = 0; oi < state.objects.length; oi++) {
            var o = state.objects[oi];
            o.cx = 0;
            o.cy = 0;
            for(var ooi = 0; ooi < state.objects.length; ooi++) {
                if (oi == ooi) {
                    continue;
                }
                var collider = state.objects[ooi];
                var ox = o.x - collider.x;
                var oy = o.y - collider.y;
                var overlap = (RADIUS*2 - Math.hypot(ox, oy)) / 2;
                if (overlap > 0) {
                    // move half the overlap directly away from the collider
                    var angle = 0;
                    if (o.x == collider.x) {
                        var dy = o.y - collider.y;
                        angle = Math.PI * dy / Math.abs(dy);
                    } else {
                        angle = Math.atan2((o.y - collider.y), (o.x - collider.x));
                    }
                    o.cx += Math.cos(angle) * overlap;
                    o.cy += Math.sin(angle) * overlap;
                }
            }
        }

        // apply collision vectors
        state.objects.forEach(o => {
            o.x += o.cx;
            o.y += o.cy;
            delete o.cx;
            delete o.cy;
        });

        return state;
    }
});