var myApp = angular.module('myApp', ['ngStorage','ui.bootstrap', 'angularMusicPlayer']);

myApp.controller('mainController', function ($scope, $http, $location, anchorSmoothScroll, $interval, $localStorage, $musicPlayer) {


    var CLIENT_ID = "024ef57272dc29f756343109fc30c1a5";
    var PAGE_SIZE = 10;

    $scope.alerts = [];

    $scope.player = $musicPlayer;

    $scope.showLibrary = true;
    $scope.library = {};

    $scope.search = {};
    $scope.search.resource = "track";
    $scope.search.keywords = "";
    $scope.search.result = [];

    $scope.profileSelected = false;
    $scope.userProfile = "";

    $scope.playlists = [];
    $scope.trackList = {};
    $scope.trackList.originalTrackList = [];
    $scope.trackList.tracks = [];
    $scope.trackList.pageIndex = 0;
    $scope.trackList.pageCount = 0;

    $scope.showTrackList = false;
    $scope.selectedListType = "";
    $scope.selectedListName = "";
    $scope.selectedPlaylistId = "";

    // Module Event Handlers
    $scope.search = function (resource) {
        $scope.search.resource = resource;
        if ($scope.search.keywords && $scope.search.keywords.length > 3)
            search(resource, $scope.search.keywords);
    };

    $scope.selectProfile = function (user) {

        getUserProfile(user.id);
        $scope.profileSelected = true;

        $scope.hideLibrary();
    }

    $scope.selectTrack = function (track) {

        track.stream_url = track.stream_url + "?client_id=" + CLIENT_ID;

        $scope.profileSelected = true;
        getUserProfile(track.user.id);
        initPlayList([track], "Track");
    }

    $scope.selectPlaylist = function(playlist){
        if($scope.selectedPlaylistId == playlist.id) { // check if resume
            $scope.player.resume();
            return;
        }

        $scope.selectedPlaylistId = playlist.id;
        $scope.showTrackList = true;

        initPlayList(playlist.tracks, playlist.title);
    }

    $scope.showList = function (listType, listName) {

        $scope.selectedListType = listType;
        $scope.selectedListName = listName;

        $http({
            method: 'GET',
            url: 'http://api.soundcloud.com/users/' + $scope.userProfile.id + '/' + listType + '?client_id=' + CLIENT_ID + "&limit=200"
        }).then(function (res) {

            for (var i = 0; i < res.data.length; i++) {
                if (res.data[i].kind == "playlist") {
                    for (var j = 0; j < res.data[i].tracks.length; j++){
                        res.data[i].tracks[j].stream_url = res.data[i].tracks[j].stream_url + "?client_id=" + CLIENT_ID;
                        if(!res.data[i].tracks[j].artwork_url)
                            res.data[i].tracks[j].artwork_url = "img/default-artwork.png";
                    }
                } else{
                    res.data[i].stream_url = res.data[i].stream_url + "?client_id=" + CLIENT_ID;
                }

                if(!res.data[i].artwork_url)
                    res.data[i].artwork_url = "img/default-artwork.png";
            }

            //$scope.trackList.listType = listType;
            if($scope.selectedListType == 'playlists'){
                $scope.playlists = res.data;
            } else {
                $scope.showTrackList = true;
                initPlayList(res.data, listName);
                anchorSmoothScroll.scrollTo("track-list");
            }
        });
    }

    $scope.goPage = function (pageIndex, playlist) {
        pageIndex = parseInt(pageIndex);
        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex > playlist.pageCount - 1) pageIndex = playlist.pageCount - 1;

        playlist.tracks = playlist.originalTrackList.slice(PAGE_SIZE * pageIndex, PAGE_SIZE * pageIndex + PAGE_SIZE);
        playlist.pageIndex = pageIndex;
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

    $scope.player.audio.addEventListener('ended', function () {
        var nextTrackIndex = $scope.player.playlist.indexOf($scope.player.track) + 1;
        $scope.player.goToTrack(nextTrackIndex);
        $scope.$apply();
    });

    var initPlayList = function (fullTrackList, listName) {
        $scope.trackList.listName = listName;
        $scope.trackList.originalTrackList = fullTrackList;

        if (fullTrackList.length > PAGE_SIZE)
            $scope.trackList.tracks = fullTrackList.slice(0, PAGE_SIZE);
        else
            $scope.trackList.tracks = fullTrackList;

        // getPagination(PAGE_SIZE, fullTrackList.length);
        $scope.trackList.pageCount = getPageCount(PAGE_SIZE, fullTrackList.length);
    }

    var getPageCount = function (pageSize, dataLength) {
        return dataLength % pageSize == 0 ? dataLength / pageSize : parseInt(dataLength / pageSize) + 1;
    }

    $scope.addToPlaylist = function (track) {
        var playlist = $scope.library.playlists[0]; // default playlist for now

        isDuplicated = false;
        for(var i=0; i<playlist.originalTrackList.length; i++){
            if(track.id == playlist.originalTrackList[i].id){
                isDuplicated = true;
                break;
            }
        }

        if(isDuplicated) {
            $scope.addAlert('danger', track.title + " is already in your playlist.");
            return;
        }

        playlist.originalTrackList.push(track);

        $scope.addAlert('success', track.title + " has been added to your playlist.");
        reloadPlaylist(playlist);
    }

    $scope.removeFromPlaylist = function(trackIndex){
        var playlist = $scope.library.playlists[0]; // default playlist for now

        //if(playlist == undefined) return;

        var track = playlist.originalTrackList[trackIndex];

        if($scope.player.track.id == track.id){
            $scope.player.pause();
        }

        playlist.originalTrackList.splice(trackIndex, 1);

        $scope.addAlert('success', track.title + " has been removed from your playlist.");
        reloadPlaylist(playlist);
    }

    var reloadPlaylist = function(playlist){
        if(playlist.length == 0) 
            return;

        playlist.pageCount = getPageCount(PAGE_SIZE, playlist.originalTrackList.length);

        if (playlist.originalTrackList.length > PAGE_SIZE)
            playlist.tracks = playlist.originalTrackList.slice(playlist.pageIndex*PAGE_SIZE, (playlist.pageIndex + 1) * PAGE_SIZE);
        else
            playlist.tracks = playlist.originalTrackList;

        $scope.library.playlists[0] = playlist;
        $scope.player.playlist = playlist.originalTrackList;

        if(playlist.pageIndex >= playlist.pageCount && playlist.pageCount > 0){
            playlist.pageIndex -= 1;
        }

        for(var i=0; i<playlist.originalTrackList.length; i++){
            if(!playlist.originalTrackList[i].artwork_url)
                playlist.originalTrackList[i].artwork_url = "img/default-artwork.png";
        }

        $scope.saveLibrary();
    }

    $scope.displayLibrary = function(){
        $scope.showLibrary = true;
    }

    $scope.hideLibrary = function(){
        $scope.showLibrary = false;
    }

    $scope.saveLibrary = function(){
        $localStorage.library = $scope.library;
    }

    var initLibrary = function () {
        $scope.library = $localStorage.library || {};
        $scope.library.playlists = $scope.library.playlists || [];

        var playlist = $scope.library.playlists[0];
        if(playlist == undefined){
            playlist = {};
            playlist.tracks = [];
            playlist.originalTrackList = [];
            playlist.pageIndex = 0;
            playlist.pageCount = 0;
        }

        reloadPlaylist(playlist);
    }

    initLibrary();

    $scope.addAlert = function(type, message) {
        if($scope.alerts.length > 2){
            $scope.alerts.splice(0, $scope.alerts.length-2);
        }

        $scope.alerts.push({type: type, msg: message});
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };
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
    .directive('libraryPagination', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/library-pagination.html'
        };
    })
    .directive('footerMusicPlayer', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/footer-music-player.html'
        };
    });