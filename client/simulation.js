define(function(require, exports, module) {
    var maths = require('./maths');
    var state = require('./state');

    return function() {
        var self = this;
    
        /*
            State: 
                objects = an array of objects
    
            Object:
                id = number
                x = number
                y = number
                xIntent = number
                yIntent = number
        */
    
        self.states = {
            0: state.boringState()
        };   
        // dictionary indexed by tick
        self.commands = {};     // dictionary of arrays indexed by tick of exectuion
        self.currentTick = 0;
        self.oldestTick = 0;
        self.oldestUnprocessedCommandTick = Infinity;
    
        /*
            Command:
                id = number provided by server, indicates official order of events
                clientId = number provided by player issuing the command. These start at a range that lies outside the normal range of ids ie. 1,000,000
                tick = tick provided by server, indicates actual time command is processed 
                originalTick = tick the command was original simulated by the player issuing the command 
        */

        self.resetState = function(s) {
            self.states = {
                0: s
            }
            self.commands = {};
            self.currentTick = 0;
            self.oldestTick = 0;
            self.oldestUnprocessedCommandTick = Infinity;
        }
    
        self.setCommand = function(command) {
            self.commands[command.tick] = self.commands[command.tick] || [];
            self.commands[command.tick].push(command);
        }
    
        self.addCommand = function(command) {
            // this handles the situation where a local command was optimistically simulated and should actually be simulated later
            if (command.originalTick != command.tick) {
                self.commands[command.originalTick].filter(c => c.originalId != command.originalId);
                if (command.originalTick < self.oldestUnprocessedCommandTick) {
                    self.oldestUnprocessedCommandTick = command.originalTick;
                }
            }
            // if the command is older than the oldest unprocessed command we must remember this
            if (command.tick < self.oldestUnprocessedCommandTick) {
                self.oldestUnprocessedCommandTick = command.tick;
            }
            self.setCommand(command);
        }
    
        /* 
            Simulates all unprocessed commands
        */
        self.simulateNextTick = function() {
            var endTick = self.currentTick + 1;
            self.simulateToTick(endTick);
        }

        self.simulateToCurrentTick = function() {
            var endTick = self.currentTick;
            self.simulateToTick(endTick);
        }

        self.simulateToTick = function(tick) {
            var endTick = tick;
            var startTick = Math.min(self.currentTick+1, self.oldestUnprocessedCommandTick);
            for(var t = startTick; t <= endTick; t++) {
                self.simulateTick(t);
            }
            self.currentTick++;
            oldestUnprocessedCommandTick = self.currentTick + 1;
        }
    
        self.simulateTick = function(tick) {
            var oldState = self.states[tick-1];

            // apply commands
            var commands = self.commands[tick] || [];
            commands.sort((a, b) => a.id - b.id);

            var newState = state.processState(oldState, commands);
    
            self.states[tick] = newState;
        }

        return self;
    };
});
    
