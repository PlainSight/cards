function Game(name, hostId, broadcast, updateChannelParticipants) {
	this.name = name;
	this.players = [hostId];
	this.hostId = hostId;
	this.started = false;
	this.finished = 0;

	this.lastBroadcast = null;
	this.lastTimerBroadcast = null;

	this.lastBoard = function() {
		return this.history[this.history.length-1] || null;
	}

	this.addPlayer = function(playerId) {
		if (!this.started && this.players.length < 2) {
			this.players.push(playerId);
			updateChannelParticipants([this.name]);
		} else {
			broadcast({
				type: 'notification',
				data: 'Game already has two players'
			}, null, [ playerId ]);
		}
	}

	this.resign = function(playerId) {
		if (!this.started || !this.players.includes(playerId)) {
			return;
		}
		this.finished = Date.now() + 30000;

		// TODO: broadcast winner message
	}

	this.start = function(playerId) {
		if (this.hostId != playerId) {
			return;
		}
		if (this.players.length != 2) {
			return;
		}

		// TODO: broadcast start message
	}

	this.command = function(data, cookie) {

	}

	return this;
}

module.exports = {
    Game
}