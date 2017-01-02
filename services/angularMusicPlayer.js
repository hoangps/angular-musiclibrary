angular.module('angularMusicPlayer', [])

.factory("$musicPlayer",function($interval){

    this.player = {};
    this.player.audio = new Audio();
    this.player.isPlaying = false;
    this.player.currentTime = 0;
    this.player.track = {};
    this.player.playlist = [];
    this.player.trackElapsedPercentage = 0;
    this.player.trackElapsedPercentageStyle = { 'width': 0 };

    this.player.play = function (playlist, track) {
        // check if resume
        if (track.id == this.track.id) {
            // this.player.audio.currentTime = this.player.currentTime;
            // this.player.isPlaying = true;
            // this.player.audio.play();
            // startTrackTick(this.player);
            this.resume();
        } else {
            // this.player.playlist = this.trackList.originalTrackList;
            this.playlist = playlist;
            playTrack(this, track);
        }
    }

    this.player.resume = function(){
        this.audio.currentTime = this.currentTime;
        this.isPlaying = true;
        this.audio.play();
        startTrackTick(this);
    }

    this.player.pause = function () {
        this.currentTime = this.audio.currentTime;
        this.audio.pause();
        this.isPlaying = false;

        stopTrackTick();
    }

    this.player.prev = function () {
        var nextTrackIndex = this.playlist.indexOf(this.track) - 1;
        this.goToTrack(nextTrackIndex);
    }

    this.player.next = function () {
        var nextTrackIndex = this.playlist.indexOf(this.track) + 1;
        this.goToTrack(nextTrackIndex);
    }

    this.player.goToTrack = function (trackIndex) {
        if (trackIndex >= this.playlist.length) trackIndex = 0;
        if (trackIndex < 0) trackIndex = this.playlist.length - 1;

        var nextTrack = this.playlist[trackIndex];

        playTrack(this, nextTrack);
    }

    var getTrackCurrentPercent = function (player) {
        var currentTime = player.audio.currentTime;
        var totalTime = player.audio.duration;

        if(isNaN(totalTime)) {
            player.trackElapsedPercentage = 0;
            player.trackElapsedPercentageStyle = { 'width': 0 };
            return;
        };

        player.trackElapsedPercentage = parseInt(currentTime * 100 / totalTime);
        player.trackElapsedPercentageStyle = {
            "width": (currentTime * 100 / totalTime).toFixed(2) + "%"
        };
    }

    var tick;

    var startTrackTick = function (player) {
        if (angular.isDefined(tick)) return;
        tick = $interval(function () {
            getTrackCurrentPercent(player);
        }, 100);
    }

    var stopTrackTick = function () {
        if (angular.isDefined(tick)) {
            $interval.cancel(tick);
            tick = undefined;
        }
    }

    var playTrack = function (player, track) {
        stopTrackTick();

        player.track = track;

        player.trackElapsedPercentage = 0;
        player.trackElapsedPercentageStyle = getTrackCurrentPercent(player);
        player.audio.src = player.track.stream_url;
        player.audio.play();
        player.isPlaying = true;

        startTrackTick(player);
    }

	return this.player;
});