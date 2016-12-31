var myApp = angular.module('myApp', ['ngStorage']);

myApp.controller('mainController', function ($scope, $http, $location, anchorSmoothScroll, $interval, $localStorage) {

    var CLIENT_ID = "024ef57272dc29f756343109fc30c1a5";
    var PAGE_SIZE = 10;

    $scope.player = {};
    $scope.player.audio = new Audio();
    $scope.player.isPlaying = false;
    $scope.player.currentTime = 0;
    $scope.player.track = {};
    $scope.player.playlist = [];
    $scope.player.trackElapsedPercentage = 0;
    $scope.player.trackElapsedPercentageStyle = { 'width': 0 };

    $scope.showLibrary = true;
    $scope.library = {};
    $scope.library.playlists = [];

    $scope.search = {};
    $scope.search.resource = "track";
    $scope.search.keywords = "";
    $scope.search.result = [];

    $scope.profileSelected = false;
    $scope.userProfile = "";

    $scope.trackList = {};
    $scope.trackList.listName = "";
    $scope.trackList.originalTrackList = [];
    $scope.trackList.tracks = [];
    $scope.trackList.pageIndex = 0;
    $scope.trackList.pageCount = 0;

    // Module Event Handlers
    $scope.search = function (resource) {
        $scope.search.resource = resource;
        if ($scope.search.keywords && $scope.search.keywords.length > 3)
            search(resource, $scope.search.keywords);
    };

    $scope.selectProfile = function (user) {

        getUserProfile(user.id);
        $scope.profileSelected = true;
    }

    $scope.selectTrack = function (track) {

        track.stream_url = track.stream_url + "?client_id=" + CLIENT_ID;

        $scope.profileSelected = true;
        getUserProfile(track.user.id);
        initPlayList([track], "Track");
    }

    $scope.showList = function (listType, listName) {

        $http({
            method: 'GET',
            url: 'http://api.soundcloud.com/users/' + $scope.userProfile.id + '/' + listType + '?client_id=' + CLIENT_ID + "&limit=200"
        }).then(function (res) {

            for (var i = 0; i < res.data.length; i++) {
                if (res.data[i].kind == "playlist") {
                    for (var j = 0; j < res.data[i].tracks.length; j++)
                        res.data[i].tracks[j].stream_url = res.data[i].tracks[j].stream_url + "?client_id=" + CLIENT_ID;
                } else
                    res.data[i].stream_url = res.data[i].stream_url + "?client_id=" + CLIENT_ID;
            }

            initPlayList(res.data, listName);
        });

        anchorSmoothScroll.scrollTo("track-list");

    }

    $scope.player.play = function (track) {
        // check if resume
        if (track.id == $scope.player.track.id) {
            $scope.player.audio.currentTime = $scope.player.currentTime;
            $scope.player.isPlaying = true;
            $scope.player.audio.play();
            startTrackTick();
        } else {
            $scope.player.playlist = $scope.trackList.originalTrackList;
            playTrack(track);
        }
    }

    $scope.player.pause = function () {
        $scope.player.currentTime = $scope.player.audio.currentTime;
        $scope.player.audio.pause();
        $scope.player.isPlaying = false;

        stopTrackTick();
    }

    $scope.player.prev = function () {
        var nextTrackIndex = $scope.player.playlist.indexOf($scope.player.track) - 1;
        goToTrack(nextTrackIndex);
    }

    $scope.player.next = function () {
        var nextTrackIndex = $scope.player.playlist.indexOf($scope.player.track) + 1;
        goToTrack(nextTrackIndex);
    }

    $scope.player.audio.addEventListener('ended', function () {
        var nextTrackIndex = $scope.player.playlist.indexOf($scope.player.track) + 1;
        goToTrack(nextTrackIndex);
        $scope.$apply();
    });

    $scope.getTrackCurrentPercent = function () {
        var currentTime = $scope.player.audio.currentTime;
        var totalTime = $scope.player.audio.duration;

        $scope.player.trackElapsedPercentage = parseInt(currentTime * 100 / totalTime);
        $scope.player.trackElapsedPercentageStyle = {
            "width": (currentTime * 100 / totalTime).toFixed(2) + "%"
        };
    }

    var tick;

    var startTrackTick = function () {
        if (angular.isDefined(tick)) return;
        tick = $interval(function () {
            $scope.getTrackCurrentPercent();
        }, 100);
    }

    var stopTrackTick = function () {
        if (angular.isDefined(tick)) {
            $interval.cancel(tick);
            tick = undefined;
        }
    }

    var goToTrack = function (trackIndex) {
        if (trackIndex >= $scope.player.playlist.length) trackIndex = 0;
        if (trackIndex < 0) trackIndex = $scope.player.playlist.length - 1;

        var nextTrack = $scope.player.playlist[trackIndex];

        playTrack(nextTrack);
    }

    var playTrack = function (track) {
        stopTrackTick();

        if (track.kind == "playlist") {
            $scope.player.playlist = track.tracks;
            $scope.player.track = track.tracks[0];
        } else {
            $scope.player.track = track;
        }

        if (!$scope.player.track.streamable) {
            if ($scope.player.playlist.length > 1)
                $scope.player.next();
        } else {
            $scope.player.audio.src = $scope.player.track.stream_url;
            $scope.player.audio.play();
            $scope.player.isPlaying = true;

            startTrackTick();
        }
    }

    $scope.goPage = function (pageIndex) {
        pageIndex = parseInt(pageIndex);
        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex > $scope.trackList.pageCount - 1) pageIndex = $scope.trackList.pageCount - 1;

        $scope.trackList.tracks = $scope.trackList.originalTrackList.slice(PAGE_SIZE * pageIndex, PAGE_SIZE * pageIndex + PAGE_SIZE);
        $scope.trackList.pageIndex = pageIndex;
    }

    $scope.getTrackDuration = function (time) {

        var totalSeconds = parseInt(time / 1000);
        var hours = parseInt(totalSeconds / 3600);
        var minutes = parseInt((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        return hours > 0 ? hours + ":" + ('0' + minutes).slice(-2) + ":" + ('0' + seconds).slice(-2) : ('0' + minutes).slice(-2) + ":" + ('0' + seconds).slice(-2);

    }

    // Module Methods
    var search = function (resource, keywords) {

        $http({
            method: 'GET',
            url: 'http://api.soundcloud.com/' + resource + '?q=' + keywords.replace(' ', '%20') + '&limit=10&client_id=' + CLIENT_ID
        }).then(function (res) {

            $scope.search.result = res.data;
        });
    }

    var getUserProfile = function (userId) {
        $http({
            method: 'GET',
            url: 'http://api.soundcloud.com/users/' + userId + '?client_id=' + CLIENT_ID
        }).then(function (res) {
            $scope.userProfile = res.data;
        });
    }

    var initPlayList = function (fullTrackList, listName) {
        $scope.trackList.listName = listName;
        $scope.trackList.originalTrackList = fullTrackList;

        if (fullTrackList.length > PAGE_SIZE)
            $scope.trackList.tracks = fullTrackList.slice(0, PAGE_SIZE);
        else
            $scope.trackList.tracks = fullTrackList;

        getPagination(PAGE_SIZE, fullTrackList.length);
    }

    var getPagination = function (pageSize, dataLength) {
        $scope.trackList.pageCount = dataLength % pageSize == 0 ? dataLength / pageSize : parseInt(dataLength / pageSize) + 1;
    }

    $scope.addToPlaylist = function (track) {
        if ($scope.library.playlists[0] == undefined) {
            $scope.library.playlists[0] = [];
        }

        $scope.library.playlists[0].push(track);
        $localStorage.library = $scope.library;
    }

    $scope.displayLibrary = function(){
        $scope.showLibrary = true;
    }
    $scope.hideLibrary = function(){
        $scope.showLibrary = false;
    }

    var initLibrary = function () {
        $scope.library = $localStorage.library || {};
        $scope.library.playlists = $scope.library.playlists || [];
    }

    initLibrary();

    // $scope.showAdvanced = function (ev) {
    //     $mdDialog.show({
    //             locals: { data: $scope.library.playlists },
    //             controller: DialogController,
    //             templateUrl: 'dialog1.tmpl.html',
    //             parent: angular.element(document.body),
    //             targetEvent: ev,
    //             clickOutsideToClose: true,
    //             fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
    //         })
    //         .then(function (answer) {
    //             $scope.status = 'You said the information was "' + answer + '".';
    //         }, function () {
    //             $scope.status = 'You cancelled the dialog.';
    //         });
    // };

    // function DialogController($scope, $mdDialog, data) {
    //     $scope.playlists = data;

    //     $scope.hide = function () {
    //         $mdDialog.hide();
    //     };

    //     $scope.cancel = function () {
    //         $mdDialog.cancel();
    //     };

    //     $scope.answer = function (answer) {
    //         $mdDialog.hide(answer);
    //     };
    // }
});

myApp.directive('search', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/search.html'
        };
    })
    .directive('userProfile', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/user-profile.html'
        };
    })
    .directive('trackList', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/track-list.html'
        };
    })
    .directive('pagination', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/pagination.html'
        };
    })
    .directive('footerMusicPlayer', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/footer-music-player.html'
        };
    });