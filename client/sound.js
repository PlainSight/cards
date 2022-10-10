define(function(require, exports, module) {
    var audioCtx = null;

    var soundOn = false;

    async function loadAudio(src, val) {
        const response = await fetch(resourceaddress+src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        val.sound = audioBuffer;
    }

    var sounds = [];

    var downloadSounds = function() {
        sounds = [
        ].reduce((a, c) => {
            var val = {};
            a[c] = val;
            loadAudio(c, val);
            return a;
        }, {});
    }

    var playTrack = function(name) {
        if (!soundOn || !audioCtx) {
            return;
        }
        const trackSource = audioCtx.createBufferSource();
        if (sounds[name].sound) {
            trackSource.buffer = sounds[name].sound;
            trackSource.connect(audioCtx.destination);
            trackSource.start();
        }
    }

    var triggerAudio = function() {
        if (!audioCtx) {
            audioCtx = new window.AudioContext();
            downloadSounds();
        }
        if (audioCtx.state == 'suspended') {
            audioCtx.resume();
        }
    }

    exports.downloadSounds = downloadSounds;
    exports.playTrack = playTrack;
    exports.triggerAudio = triggerAudio;
});