var format = function (str, col) {
    col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 1);

    return str.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
        if (m == "{{") { return "{"; }
        if (m == "}}") { return "}"; }
        return col[n];
    });
};

function hasClass(obj, cls) {
    return obj.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
}

function addClass(obj, cls) {
    if (!hasClass(obj, cls)) obj.className += " " + cls;
}

function removeClass(obj, cls) {
    if (hasClass(obj, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        obj.className = obj.className.replace(reg, ' ');
    }
}

var uploaderInited = false;

function popFilesWin(){
	loadFiles();
	
	if(!uploaderInited){
		initUploader();
	}
	
	$('#filesModal').modal('show');
}

var progress = 0;

function next(){
	whiteboard.onPlaying(progress++);
	setTimeout(function(){
		next();
	}, Math.random()*5*1000);
}

var whiteboard;

function start(){
	whiteboard = new Whiteboard();
	whiteboard.canvasElementId = "drawCanvas";
	whiteboard.roomTokenUrl = "http://192.168.27.34:8090/messaging/room/token?user={user}&app={app}&room={room}";
	whiteboard.roomConnUrl = "http://192.168.27.34:8090/messaging/room/connection?user={user}&app={app}&room={room}&rmtk={rmtk}";
	
	whiteboard.pagesOfFileUrl = "http://192.168.27.34:8090/messaging/whiteboard/file/pages?fileId={fileId}";
	whiteboard.histDataOfRoomUrl = "http://192.168.27.34:8090/messaging/whiteboard/room/page/latest?room={room}";
	whiteboard.actionAddUrl = "http://192.168.27.34:8090/messaging/whiteboard/action/add";
	whiteboard.pageActionsUrl = "http://192.168.27.34:8090/messaging/whiteboard/room/page/actions?room={room}&fileId={fileId}&pageId={pageId}";
	whiteboard.roomPagesUrl = 'http://192.168.27.34:8090/messaging/whiteboard/room/pages?room={room}';
	
	whiteboard.review = review;
	whiteboard.syncHistFlag = syncHistFlag;
	
	whiteboard.start();
}

$(function () {
	$("[data-toggle='tooltip']").tooltip();
	
	$( "#selectFile" ).bind( "click", function() {
		popFilesWin();
	});
	
	$( "#fileSelected" ).bind( "click", function() {
		var fileId = $('input[type="checkbox"][name="fileId"]:checked').val();
		whiteboard.showFile(fileId);
		$('#filesModal').modal('hide');
	});
	
	start();
	
});
