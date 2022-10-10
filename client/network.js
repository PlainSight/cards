define(function(require, exports, module) {
    var processMessageHandler = null;
    var errorHandler = null;

    exports.setMessageCallback = function(callback) {
        processMessageHandler = callback;
    }

    exports.setErrorCallback = function(callback) {
        errorHandler = callback;
    }

    exports.connect = function(address) {
        socket = new WebSocket(address);

        socket.onopen = function() {
            sendMessage({
                type: 'connection',
                data: localStorage.getItem('rollback0.1')
            });
        };
    
        socket.onmessage = function(event) {
            if (processMessageHandler) {
                processMessageHandler(event.data);
            }
        };

        socket.onclose = function(event) {
            if (event.wasClean) {
                console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
            } else {
                console.log('[close] Connection died');
            }
        };
    
        socket.onerror = function(error) {
            console.log(`[error] ${error.message}`);
        };
    }

    
    function sendMessage(message) {
        if (socket) {
            socket.send(JSON.stringify(message));
        }
    }

    setInterval(() => {
        network.sendMessage({
            type: 'ping'
        });
    }, 20000);
});