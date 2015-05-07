var time = 0;
//var socket;

var Whiteboard = function() {
	var _whiteboard = this;
	
	this.roomTokenUrl = "http://192.168.27.34:8090/messaging/room/token?user={user}&app={app}&room={room}";
	this.roomConnUrl = "http://192.168.27.34:8090/messaging/room/connection?user={user}&app={app}&room={room}&rmtk={rmtk}";
	
	this.pagesOfFileUrl = "http://192.168.27.34:8090/messaging/whiteboard/file/pages?fileId={fileId}";
	this.histDataOfRoomUrl = "http://192.168.27.34:8090/messaging/whiteboard/room/page/latest?room={room}";
	this.actionAddUrl = "http://192.168.27.34:8090/messaging/whiteboard/action/add";
	this.pageActionsUrl = "http://192.168.27.34:8090/messaging/whiteboard/room/page/actions?room={room}&fileId={fileId}&pageId={pageId}";
	this.roomPagesUrl = 'http://192.168.27.34:8090/messaging/whiteboard/room/pages?room={room}';
	
	this.roomPagesLoaded = false;
	
    this.currentFile = false;
    this.files = [];
	
	this.angleDelta = 90;
    this.zoomDelta = 0.1;
    
    this.color;
    
    this.canvasElementId = "drawCanvas";
    this.socket = false;
    
    this.review = false;
    this.syncHistFlag = true;
    this.reviewProgress = 0;
    this.reviewPages = false;
    this.reviewToShowPage;
    this.reviewData=[];
    this.reviewEndtime;
    this.reviewLastTime = -1;

	/* Mouse and touch events */
	
	document.getElementById('colorSwatch').addEventListener('click', function() {
		_whiteboard.color = document.querySelector('#colorSwatch :checked').getAttribute('data-color');
	}, false);
	
	var isTouchSupported = 'ontouchstart' in window;
	var isPointerSupported = navigator.pointerEnabled;
	var isMSPointerSupported =  navigator.msPointerEnabled;
	
	var downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
	var moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
	var upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));
	
	this.canvas = document.getElementById(this.canvasElementId);
	this.canvas.width = 1000;
	this.canvas.height = 800;
	this.ctx = this.canvas.getContext('2d');
	this.ctx.strokeStyle = document.querySelector('#colorSwatch :checked').getAttribute('data-color');
	this.ctx.lineWidth = '3';
	this.ctx.lineCap = this.ctx.lineJoin = 'round';
	
	this.isActive = false;
	
	this.onDown = function(e) {
		if(_whiteboard.currentFile){
			_whiteboard.currentFile.currentState.onDown(_whiteboard.ctx, e);
		}
	}

	this.onMove = function(e) {
		if(_whiteboard.currentFile){
			_whiteboard.currentFile.currentState.onMove(_whiteboard.ctx, e);
		}	
	}

	this.onUp = function(e) {
		if(_whiteboard.currentFile){
			_whiteboard.currentFile.currentState.onUp(_whiteboard.ctx, e);
		}
	}
	
	this.canvas.addEventListener(downEvent, this.onDown, false);
	this.canvas.addEventListener(moveEvent, this.onMove, false);
	this.canvas.addEventListener(upEvent, this.onUp, false);
	
	document.getElementById('rectangle').addEventListener('click', function() {
		_whiteboard.changeDrawTool('rectangle', false, this);
	}, false);
	
	document.getElementById('ellipse').addEventListener('click', function() {
		_whiteboard.changeDrawTool('ellipse', false, this);
	}, false);
	
	document.getElementById('line').addEventListener('click', function() {
		_whiteboard.changeDrawTool('line', false, this);
	}, false);
	
	document.getElementById('pencil').addEventListener('click', function() {
		_whiteboard.changeDrawTool('pencil', false, this);
	}, false);
	
	document.getElementById('drag').addEventListener('click', function() {
		_whiteboard.changeDrawTool('drag', true, this);
	}, false);
	
	document.getElementById('rotateLeft').addEventListener('click', function() {
		_whiteboard.currentFile.currentState.rotate(ctx, _whiteboard.angleDelta);
	}, false);
	
	document.getElementById('rotateRight').addEventListener('click', function() {
		_whiteboard.currentFile.currentState.rotate(ctx, -_whiteboard.angleDelta);
	}, false);
	
	document.getElementById('zoomIn').addEventListener('click', function() {
		_whiteboard.currentFile.currentState.zoom(ctx, _whiteboard.zoomDelta);
	}, false);
	
	document.getElementById('zoomOut').addEventListener('click', function() {
		_whiteboard.currentFile.currentState.zoom(ctx, -_whiteboard.zoomDelta);
	}, false);
	
	document.getElementById('pre').addEventListener('click', function() {
		_whiteboard.currentFile.pageId -= 1;
		if(_whiteboard.currentFile.pageId<0){
			_whiteboard.currentFile.pageId = 0;
		}else{
			_whiteboard.changeToPage(_whiteboard.currentFile.pageId);
		}
		
	}, false);
	
	document.getElementById('next').addEventListener('click', function() {
		
		if(_whiteboard.currentFile.pageId<_whiteboard.currentFile.totalPage-1){
			_whiteboard.currentFile.pageId += 1;
			_whiteboard.changeToPage(_whiteboard.currentFile.pageId);
		}	

	}, false);
	
	document.getElementById('undo').addEventListener('click', function() {
		_whiteboard.currentFile.currentState.undo();

	}, false);
	
};

/* Shapes definition */

Whiteboard.Shape = function(type, fill, color, strokeW, lineCap, lineJoin){
	this.type = type||'line';
	this.fill = fill||'#8ED6FF';
	this.color = color||'#000000';
	this.strokeW = strokeW||'2';
	this.lineCap = lineCap||'round';
	this.lineJoin = lineJoin||'round';
	this.currentScale = 1;
	this.currentAngle = 0;
	this.state = {};
	
	this.eventInternal = function(e, fun){
	    var x = this.state._whiteboard.isTouchSupported ? (e.targetTouches[0].pageX - this.state._whiteboard.canvas.offsetLeft) : (e.offsetX || e.layerX - this.state._whiteboard.canvas.offsetLeft);
        var y = this.state._whiteboard.isTouchSupported ? (e.targetTouches[0].pageY - this.state._whiteboard.canvas.offsetTop) : (e.offsetY || e.layerY - this.state._whiteboard.canvas.offsetTop);
		
		x = (x - this.state.totalOffsetX)/this.state.currentScale;
		y = (y - this.state.totalOffsetY)/this.state.currentScale;
		if(this.state.currentAngle == 90||this.state.currentAngle == -270){
		    var tmp = x;
		    x = y;
		    y = -tmp;
		}else if(this.state.currentAngle == 180||this.state.currentAngle == -180){
		    x = -x;
		    y = -y;
		}else if(this.state.currentAngle == 270||this.state.currentAngle == -90){
			var tmp = x;
		    x = -y;
		    y = tmp;
		}
		
		fun.call(this, x, y);
	}

	this.onDown = function(e){
		this.eventInternal(e, this.onDownSelf);
	};
	this.onMove = function(e){
	    this.eventInternal(e, this.onMoveSelf);
	};
	this.onUp = function(e){
	    this.eventInternal(e, this.onUpSelf);
	};
	
}

Whiteboard.Shape.prototype.draw = function(ctx){
	    ctx.save();
		ctx.lineWidth = this.strokeW;
		ctx.strokeStyle = this.color;
		ctx.fillStyle = this.fill;
		ctx.lineCap = this.lineCap;
		ctx.lineJoin = this.lineJoin;
		ctx.beginPath();
		this.drawSelf(ctx);
		ctx.restore();
	};

Whiteboard.Shape.prototype.drawSelf = function(ctx){};

Whiteboard.Pencil = function(){
	this.base=Whiteboard.Shape;
	this.base('pencil');
	this.points = [];
	
	this.drawSelf=function(ctx){
		ctx.moveTo(this.points[0].x, this.points[0].y);

		for(var i=1; i<this.points.length; i++) {
			ctx.lineTo(this.points[i].x, this.points[i].y);
		}
		ctx.stroke();
	};
	this.toJson=function(){
		var obj = new Object();
		obj.type = this.type;
		obj.fill = this.fill;
		obj.color = this.color;
		obj.strokeW = this.strokeW;
		obj.points=this.points;
		return obj;
	};
	this.fromJson=function(obj){
		this.type = obj.type;
		this.fill = obj.fill;
		this.color = obj.color;
		this.strokeW = obj.strokeW;
		this.points=obj.points;
	};
	this.onDownSelf=function(x, y){
	    this.points.push({x: (x << 0), y: (y << 0)});
	};
	this.onMoveSelf = function(x, y){
		this.points.push({x: (x << 0), y: (y << 0)});
	}
	this.onUpSelf=function(x, y){
	    this.points.push({x: (x << 0), y: (y << 0)});
	};
}

Whiteboard.Pencil.prototype = new Whiteboard.Shape();

Whiteboard.RegularShape = function(type, beginX, beginY, endX, endY, fill, color, strokeW){
	this.base=Whiteboard.Shape;
	this.base(type);
	this.beginX = beginX||0;
	this.beginY = beginY||0;
	this.endX = endX||0;
	this.endY = endY||0;
	
	this.toJson=function(){
		var obj = new Object();
		obj.type = this.type;
		obj.beginX = this.beginX;
		obj.beginY = this.beginY;
		obj.endX = this.endX;
		obj.endY = this.endY;
		obj.fill = this.fill;
		obj.color = this.color;
		obj.strokeW = this.strokeW;
		return obj;
	};
	
	this.fromJson=function(obj){
		this.type = obj.type;
		this.beginX = obj.beginX;
		this.beginY = obj.beginY;
		this.endX = obj.endX;
		this.endY = obj.endY;
		this.fill = obj.fill;
		this.color = obj.color;
		this.strokeW = obj.strokeW;
	};
	
	this.onDownSelf=function(x, y){
		this.beginX = x;
        this.beginY = y;
		this.endX = x;
        this.endY = y;
	};
	
	this.onMoveSelf = function(x, y){
		this.endX = x;
        this.endY = y;
	}
	
	this.onUpSelf=function(x, y){
	};
}

Whiteboard.RegularShape.prototype = new Whiteboard.Shape();

Whiteboard.Line = function(){
	this.base = Whiteboard.RegularShape;
	this.base('line');
	
	this.drawSelf=function(ctx){
		ctx.moveTo(this.beginX, this.beginY);
		ctx.lineTo(this.endX, this.endY);
		ctx.stroke();
	};
}

Whiteboard.Line.prototype = new Whiteboard.RegularShape();

Whiteboard.Rect = function(){
	this.base = Whiteboard.RegularShape;
	this.base('rectangle');
	
	this.drawSelf=function(ctx){
		var width = this.endX - this.beginX;
		var height = this.endY - this.beginY;
		//ctx.fillRect(this.beginX, this.beginY, width, height);
		ctx.strokeRect(this.beginX, this.beginY, width, height);
	};
}
Whiteboard.Rect.prototype = new Whiteboard.RegularShape();

Whiteboard.Ellipse = function(){
	this.base = Whiteboard.RegularShape;
	this.base('ellipse');
	this.drawSelf=function(ctx){	
		var x = (this.beginX + this.endX)/2;
		var y = (this.beginY + this.endY)/2;
		var a = Math.abs((this.beginX - this.endX)/2);
		var b = Math.abs((this.beginY - this.endY)/2);
		var k = .5522848,
		ox = a * k,
		oy = b * k;

		ctx.moveTo(x - a, y);
		ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
		ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
		ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
		ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
		ctx.closePath();
		ctx.stroke();
		//ctx.fill();
	};
}

Whiteboard.Ellipse.prototype = new Whiteboard.RegularShape();

/* Document image definition*/

Whiteboard.DocImage = function(){
	this._whiteboard = false;
    this.image = "";
    this.type = "image";
    this.src = "";
    this.x = 0;
    this.y = 0;
	this.sx = 0;
	this.sy = 0;
	this.width = 0;
	this.height = 0;
	this.state = {};
	
	this.draw = function(ctx){
	     var _this = this
	    if(this.image == ""){
		    this.image = new Image();
			if(this.src==""){
			    return;
			}
			this.image.src = this.src;
			this.image.onload = function () {
			    _this.width = _this.image.width;
				_this.height = _this.image.height;
//				ctx.save();
//				ctx.translate(_this.state.totalOffsetX, _this.state.totalOffsetY);
//		        ctx.scale(_this.state.currentScale, _this.state.currentScale);
//                ctx.rotate(_this.state.currentAngle * Math.PI / 180);
                
				_this._whiteboard.redraw(ctx);
		        //drawInternal(_this, ctx);
				//ctx.restore();
            }
		}else{
		    this.width = this.image.width;
		    this.height = this.image.height;
		    this.drawInternal(_this, ctx);
		}
	}
	
	this.drawInternal = function(_this,ctx){
        ctx.save();
	    ctx.drawImage(_this.image, -_this.image.width / 2, -_this.image.height / 2);
        ctx.restore();
	}
	
	this.toJson=function(){
		var obj = new Object();
		obj.type = this.type;
//		obj.src = this.src;
//		obj.x = this.x;
//		obj.y = this.y;
//		obj.sx = this.sx;
//		obj.sy = this.sy;
//		obj.width = this.width;
//		obj.height = this.height;
		return obj;
	};
	
	this.fromJson=function(obj){
//	    this.src = obj.src;
		this.type = obj.type;
//		this.x = obj.x;
//		this.y = obj.y;
//		this.sx = obj.sx;
//		this.sy = obj.sy;
//		this.width = obj.width;
//		this.height = obj.height;
	}
}

/*File definition*/

Whiteboard.File = function(){
	this.fileId = 1;
	this.fileName = "ppt";
	this.pages = [];
	this.pageStates = [];
	this.currentState = {};
	this.pageId = 0;
	this.totalPage = 0;
}

/* State definition */

Whiteboard.State = function() {
   this._whiteboard = false;
   this.canvas = false;
   this.ctx = false;
   this.file = {};
   this.bgImage = {};
   this.shapes = [];
   this.currentScale = 1;
   this.currentAngle = 0;
   this.dragStartX = 0;
   this.dragStartY = 0;
   this.offsetX = 0;
   this.offsetY = 0;

   this.lastOffsetX = 0;
   this.lastOffsetY = 0;

   this.totalOffsetX = 0;
   this.totalOffsetY = 0;
   
   this.drag = false;
   this.drawType = 'pencil';
   this.targetShape = {};
   
   this.isActive = false;
   
   this.fileId = 1;
   this.pageId = 0;
   this.time = 0;
 };
 
Whiteboard.State.prototype.init = function(){
    this.targetShape = new Whiteboard.Pencil();
	this.lastOffsetX = this.canvas.width/2;
    this.lastOffsetY = this.canvas.height/2;

    this.totalOffsetX = this.offsetX + this.lastOffsetX;
    this.totalOffsetY = this.offsetY + this.lastOffsetY;
};
 
Whiteboard.State.prototype.draw = function(ctx){
    this.clear(ctx);
	ctx.save();
	ctx.translate(this.totalOffsetX, this.totalOffsetY);
    ctx.scale(this.currentScale, this.currentScale);
	ctx.rotate(this.currentAngle * Math.PI / 180);
	
	this.bgImage.draw(ctx);
	
	for(var i=0; i<this.shapes.length; i++) {
		this.shapes[i].draw(ctx);
    }
	
	ctx.restore();
};

Whiteboard.State.prototype.onDown = function(ctx, e){
	e.preventDefault();
  	this.isActive = true;
	if(this.drag){
	    this.dragStartX = isTouchSupported ? e.targetTouches[0].pageX : (e.offsetX || e.layerX);
        this.dragStartY = isTouchSupported ? e.targetTouches[0].pageY : (e.offsetY || e.layerY);
		
	   return;
	}
	
	this.targetShape = new Whiteboard.constructorFunc[this.drawType]();
	this.targetShape.state = this._whiteboard.currentFile.currentState;
	this.targetShape.color = this._whiteboard.color;
	this.targetShape.onDown(e);
	
	if(this.drawType!="image"){
	    this.shapes.push(this.targetShape);
	}
};

Whiteboard.State.prototype.onMove = function(ctx, e){
	e.preventDefault(); // prevent continuous touch event process e.g. scrolling!
  	if(!this.isActive) return;
	
	if(this.drag){
	    this.doDrag(ctx, e);
	    return;
	}
	
	this.targetShape.onMove(e);
	
	this.draw(ctx);
};

Whiteboard.State.prototype.onUp = function(ctx, e){
	e.preventDefault();
  	this.isActive = false;
    if(this.drag){
        this.lastOffsetX += this.offsetX;
        this.lastOffsetY += this.offsetY;
		
		//console.log(this.lastOffsetX+"="+this.lastOffsetX);
        return;
    }
    this.targetShape.onUp(e);
    this._whiteboard.publish(this.targetShape.toJson());
}

Whiteboard.State.prototype.doDrag = function(ctx, e){
	var x = isTouchSupported ? e.targetTouches[0].pageX : (e.offsetX || e.layerX);
    var y = isTouchSupported ? e.targetTouches[0].pageY : (e.offsetY || e.layerY);

    this.offsetX = (x - this.dragStartX)/this.currentScale;
	this.offsetY = (y - this.dragStartY)/this.currentScale;
	
	this.totalOffsetX = this.offsetX + this.lastOffsetX;
	this.totalOffsetY = this.offsetY + this.lastOffsetY;
	//console.log("X"+":"+this.offsetX+"+"+this.lastOffsetX+"="+this.totalOffsetX);
	//console.log(this.offsetY+"+"+this.lastOffsetY+"="+this.totalOffsetY);
	this.draw(ctx);
}

Whiteboard.State.prototype.rotate = function(ctx, delta) {
    this.currentAngle += delta;
	this.currentAngle = this.currentAngle%360;
	this.bgImage.currentAngle = this.currentAngle;
	for(var i=0; i<this.shapes.length; i++) {
		this.shapes[i].currentAngle = this.currentAngle;
	}
    this.draw(ctx);
}

Whiteboard.State.prototype.zoom = function(ctx, delta) {
    this.currentScale += delta;
	this.bgImage.currentScale = this.currentScale;
	for(var i=0; i<this.shapes.length; i++) {
		this.shapes[i].currentScale = this.currentScale;
	}
    this.draw(ctx);
}
 
Whiteboard.State.prototype.clear = function(){
    this.ctx.translate(0, 0);
    this.ctx.clearRect (0 , 0, this.canvas.width , this.canvas.height );
};

Whiteboard.State.prototype.undo = function(){
    this.shapes.splice(this.shapes.length-1,1);
	this.draw(ctx);
};

Whiteboard.State.prototype.getBgSrc = function(){
	return this.file.pages[this.pageId].uri;
}

Whiteboard.constructorFunc = {};

Whiteboard.constructorFunc['rectangle'] = Whiteboard.Rect;
Whiteboard.constructorFunc['ellipse'] = Whiteboard.Ellipse;
Whiteboard.constructorFunc['line'] = Whiteboard.Line;
Whiteboard.constructorFunc['pencil'] = Whiteboard.Pencil;
Whiteboard.constructorFunc['image'] = Whiteboard.DocImage;

Whiteboard.prototype.storeAction = function(toPost){
	var form = $("#uploadForm");
	form.empty();
    form.attr('action', this.actionAddUrl);
    
    var roomInput = $("<input type='hidden' name='room' />").prependTo(form);
    roomInput.attr('value', toPost.room);
    
    var fileIdInput = $("<input type='hidden' name='fileId' />").prependTo(form);
    fileIdInput.attr('value', toPost.fileId);
    
    var pageUrlInput = $("<input type='hidden' name='pageUrl' />").prependTo(form);
    pageUrlInput.attr('value', toPost.pageUrl);
    
    var pageIdInput = $("<input type='hidden' name='pageId' />").prependTo(form);
    pageIdInput.attr('value', toPost.pageId);
    
    var timeInput = $("<input type='hidden' name='time' />").prependTo(form);
    timeInput.attr('value', toPost.time);
    
    var dataInput = $("<input type='hidden' name='data' />").prependTo(form);
    dataInput.attr('value', toPost.data);
    
    form.submit();
	
}

Whiteboard.prototype.changeToPage = function(pageId){
	var _this = this;
    var state = this.getState(pageId);
	if(state==null){
        state = new Whiteboard.State();
        state._whiteboard = this;
        state.canvas = this.canvas;
        state.ctx = this.ctx;
        state.pageId = pageId;
        state.file = this.currentFile;
		state.init();
		var bgImage = new Whiteboard.DocImage();
		bgImage._whiteboard = this;
		bgImage.state = state;
        bgImage.src = state.getBgSrc();
        state.bgImage = bgImage;
		state.targetShape = new Whiteboard.Pencil();
		this.currentFile.pageStates.push(state);
		
		$.ajax({
			url:format(this.pageActionsUrl, {room: room, fileId: this.currentFile.fileId, pageId: pageId}),
			dataType : "jsonp",
	        jsonp:"jsonpcallback",
	        success:function(drawData){
	        	if(drawData!=null){
	        		for(var i in drawData.items) {
	    				var item = drawData.items[i];
	    				if(item.data==""){continue;}
							item = $.parseJSON(item.data);
							var obj = new Whiteboard.constructorFunc[item.type]();
							obj.state = state;
							obj.fromJson(item);
							state.shapes.push(obj);
	        		}
	        		
	        		_this.currentFile.currentState = state;
					
	        		_this.currentFile.currentState.draw(_this.ctx);
	        		_this.publish();
				}
			}
		});
	}else{
		_this.currentFile.currentState = state;
	
		_this.currentFile.currentState.draw(_this.ctx);
		_this.publish();
	}

}

Whiteboard.prototype.getState = function(pageId){
	for(var i in this.currentFile.pageStates){
		var state = this.currentFile.pageStates[i];
		if(state.pageId==pageId){
			return state;
		}
	}
}

Whiteboard.prototype.drawFromMessage = function(pageId, drawData){
	var _this = this;
    var state =this.getState(pageId);
	if(state==null){
        state = new Whiteboard.State();
        state._whiteboard = this;
        state.canvas = this.canvas;
        state.ctx = this.ctx;
        state.pageId = pageId;
        state.file = this.currentFile;
		state.init();
		var bgImage = new Whiteboard.DocImage();
		bgImage._whiteboard = this;
		bgImage.state = state;
        bgImage.src = state.getBgSrc();
        state.bgImage = bgImage;
		state.targetShape = new Whiteboard.Pencil();
		this.currentFile.pageStates.push(state);
		
		if(drawData.items!=null){
    		for(var i in drawData.items) {
				var item = drawData.items[i];
				if(item.data==""){continue;}
					item = $.parseJSON(item.data);
					var obj = new this.constructorFunc[item.type]();
					obj.state = state;
					obj.fromJson(item);
					state.shapes.push(obj);
    		}
    		
    		this.currentFile.currentState = state;
			
    		this.currentFile.currentState.draw(this.ctx);
		}else{
			$.ajax({
				url:format(this.pageActionsUrl, {room: room, fileId: this.currentFile.fileId, pageId: pageId}),
				dataType : "jsonp",
		        jsonp:"jsonpcallback",
		        success:function(drawData){
		        	if(drawData.items!=null){
		        		for(var i in drawData.items) {
		    				var item = drawData.items[i];
		    				if(item.data==""){continue;}
								item = $.parseJSON(item.data);
								var obj = new Whiteboard.constructorFunc[item.type]();
								obj.state = state;
								obj.fromJson(item);
								state.shapes.push(obj);
		        		}
		        		
		        		_this.currentFile.currentState = state;
						
		        		_this.currentFile.currentState.draw(_this.ctx);
					}
				}
			});
		}
		
	}else{
		
		if(drawData.items!=null){
    		for(var i in drawData.items) {
				var item = drawData.items[i];
				var obj = new Whiteboard.constructorFunc[item.type]();
				obj.state = state;
				obj.fromJson(item);
				state.shapes.push(obj);
    		}
		}
		
		this.currentFile.currentState = state;
	
		this.currentFile.currentState.draw(_this.ctx);
	}

}

Whiteboard.prototype.getFile = function(fileId){
	for(var i in this.files){
		var file = this.files[i];
		if(file.fileId==fileId){
			return file;
		}
	}
}

Whiteboard.prototype.drawFromStream = function(data) {
    if(!data) return;
    this.currentFile = data.file;
    
	var pageId = data.pageId;
	
	var state = this.getState(pageId);
	
	if(state==null){
        state = new Whiteboard.State();
        state._whiteboard = this;
        state.canvas = this.canvas;
        state.ctx = this.ctx;
        state.pageId = pageId;
        state.file = this.currentFile;
		state.targetShape = new Whiteboard.Pencil();
		state.init();
		var bgImage = new Whiteboard.DocImage();
		bgImage._whiteboard = this;
		bgImage.state = state;
        bgImage.src = state.getBgSrc();
        state.bgImage = bgImage;
        this.currentFile.pageStates.push(state);
	}
	
	this.currentFile.currentState = state;
	
	if(data.items!=null){
		for(var i in data.items) {
			var item = data.items[i];
			if(item==""||item.data==''){continue;}
			var action = $.parseJSON(item.data);
			
			var obj = new Whiteboard.constructorFunc[action.type]();
			obj.state = state;
			obj.fromJson(action);
			state.shapes.push(obj);
		}
	}
	
	this.redraw(this.ctx);
}

Whiteboard.prototype.showFile = function(fileId){
	var drawData = {};
    var file = this.getFile(fileId);
    var _this = this;
    
    if(file==null){
    	file = new Whiteboard.File();
    	file.fileId = fileId;
    	file.pageId = 0;
    	$.ajax({
    		url: format(_this.pagesOfFileUrl, {fileId: fileId}),
        	dataType : "jsonp",
            jsonp:"jsonpcallback",
        	success: function(pages){
    		    console.log(pages);
    		    file.totalPage = pages.length;
    		    file.pages = pages;
    		    _this.files.push(file);
    		    _this.currentFile = file;
    		    _this.changeToPage(0);
        	}
    	});
    }else{
    	_this.currentFile = file;
    	_this.changeToPage(file.pageId);
    }
}

Whiteboard.prototype.initWebSocket = function(){
	var _this = this;
	$.ajax({
    	url: format(_this.roomTokenUrl, {room: room, user: user, app: app}),
    	dataType : "jsonp",
        jsonp:"jsonpcallback",
    	success: function(token){
    		$.ajax({
    			url: format(_this.roomConnUrl, {room: room, user: user, app: app, rmtk: token}),
    			dataType : "jsonp",
    	        jsonp:"jsonpcallback",
    			success: function(conn) {
    				if(conn!=null){
    					_this.socket =  io.connect(conn+"&rmtk="+token);
    					
    					_this.socket.emit('join', {roomId: room, userName: user, app:app, master: master});

    					_this.socket.on('connect', function() {
    						console.log('connected');
    					});
    					
    					_this.socket.on('message', function(data) {
    						var message = data.body.content;
    						if(message!=null){
    							var drawData = $.parseJSON(message);
    							var fileId = drawData.fileId;
    							var pageId = drawData.pageId;
    						    var file = _this.getFile(fileId);
    						    
    						    if(file==null){
    						    	file = new Whiteboard.File();
    						    	file.fileId = fileId;
    						    	file.pageId = pageId;
    						    	$.ajax({
    						    		url: format(_this.pagesOfFileUrl, {fileId: fileId}),
    						        	dataType : "jsonp",
    						            jsonp:"jsonpcallback",
    						        	success: function(pages){
    						    		    console.log(pages);
    						    		    file.totalPage = pages.length;
    						    		    file.pages = pages;
    						    		    _this.files.push(file);
    						    		    drawData.file = file;
    						    		    
    						    		    _this.currentFile = file;
    						    		    
    						    		    _this.drawFromMessage(pageId, drawData);
    						        	}
    						    	});
    						    }else{
    						    	file.fileId = fileId;
    						    	file.pageId = pageId;
    						    	drawData.file = file;

    						    	_this.currentFile = file;
    						    	_this.drawFromMessage(pageId, drawData);
    						    }
    					    	
    						 }
    						
    						console.log('get data: ' + message);
    					});
    					
    					_this.socket.on('disconnect', function() {
    						console.log('disconnected');
    					});
    				}

    			}
    		});
    	}
	});
}

Whiteboard.prototype.drawAction = function(drawData){
	var _this = this;
	if(drawData!=null){
		if(drawData.items!=null){
			for(var i in drawData.items) {
				var item = drawData.items[i];
				if(item.time>progress){
					break;
				}else{
					toShowItem = item;
				}
			}
			
			lastTime = toShowItem.time;
		}
	}
	
	console.log("drawing: "+$.toJSON(toShowItem));
	
	var toDraw = {};
	toDraw.fileId = drawData.fileId;
	toDraw.pageId = drawData.pageId;
	toDraw.items = [toShowItem];
	
	var file = this.getFile(toDraw.fileId);
	    
    if(file==null){
    	file = new Whiteboard.File();
    	file.fileId = toDraw.fileId;
    	file.pageId = toDraw.pageId;
    	$.ajax({
    		url: format(_this.pagesOfFileUrl, {fileId: toDraw.fileId}),
        	dataType : "jsonp",
            jsonp:"jsonpcallback",
        	success: function(pages){
    		    console.log(pages);
    		    file.totalPage = pages.length;
    		    file.pages = pages;
    		    _this.files.push(file);
    		    toDraw.file = file;
    		    _this.drawFromStream(toDraw);
        	}
    	});
    }else{
    	file.fileId = toDraw.fileId;
    	file.pageId = toDraw.pageId;
    	toDraw.file = file;
    	_this.drawFromStream(toDraw);
    }
}

Whiteboard.prototype.drawHist = function(drawData){
	var fileId = drawData.fileId;
	var pageId = drawData.pageId;
    var pageUrl = drawData.pageUrl;
    var file = this.getFile(fileId);
    var _this = this;
    
    if(file==null){
    	file = new Whiteboard.File();
    	file.fileId = fileId;
    	file.pageId = pageId;
    	$.ajax({
    		url: format(this.pagesOfFileUrl, {fileId: fileId}),
        	dataType : "jsonp",
            jsonp:"jsonpcallback",
        	success: function(pages){
    		    console.log(pages);
    		    file.pages = pages;
    		    file.totalPage = pages.length;
    		    _this.files.push(file);
    		    
    		    drawData.file = file;
    		    _this.drawFromStream(drawData);
        	}
    	});
    }else{
    	file.fileId = fileId;
    	file.pageId = pageId;
    	drawData.file = file;
    	_this.drawFromStream(drawData);
    }
}

Whiteboard.prototype.publish = function(obj) {
	if(!master){
		return;
	}
	var t = time++;
	var msg = {};
	msg.room = room;
	msg.fileId = this.currentFile.fileId;
	msg.pageId = this.currentFile.currentState.pageId;
	msg.time = t;
	if(obj!=null){
	    msg.items = [obj];
	}

	if(this.socket!=null){
		this.socket.emit('message', {header:{from: user, roomId: room, version:'1.0.0', time: (new Date()).getTime()}, body:{content:$.toJSON(msg)}});
	}
	
	this.storeAction({
		room: room,
	    fileId: this.currentFile.fileId,
	    pageUrl: this.currentFile.pages[this.currentFile.currentState.pageId].uri,
	    pageId: this.currentFile.currentState.pageId,
	    time:t,
	    data: obj==null?"":$.toJSON(obj)
	});
//	$.ajax({
//		url: "http://localhost:8090/messaging/whiteboard/add",
//		dataType : "jsonp",
//        jsonp:"jsonpcallback",
//		type: "POST",
//		data: {
//			room: room,
//		    fileId: currentFile.fileId,
//		    pageUrl: currentFile.pages[currentFile.currentState.pageId].uri,
//		    pageId: currentFile.currentState.pageId,
//		    time:t,
//		    data: obj==null?"":$.toJSON(obj)
//		},
//		success: function( data ) {
//			
//		}
//	});
}

Whiteboard.prototype.syncHist = function() {
	var _this = this;
	$.ajax({
		url: format(this.histDataOfRoomUrl, {room: room}),
		dataType : "jsonp",
        jsonp:"jsonpcallback",
		success: function(drawData) {
			if(drawData!=null){
				_this.drawHist(drawData);
			}

		}
	});
}

Whiteboard.prototype.setButtonBg = function(target){
    var buttons = document.getElementById("toolbar").getElementsByTagName("a");
    for(var i=0;i<buttons.length;i++){
        removeClass(buttons[i], 'selected');
    }
	
	addClass(target, 'selected');
}

Whiteboard.prototype.changeDrawTool = function(type, drag, target){
	this.currentFile.currentState.drawType = type;
	this.currentFile.currentState.drag = drag;
	this.setButtonBg(target);
}

Whiteboard.prototype.redraw = function(ctx){
	if(this.currentFile){
		this.currentFile.currentState.draw(ctx);
	}
}

Whiteboard.prototype.clear = function(ctx){
	if(this.currentFile){
		this.currentFile.currentState.clear(ctx);
	}
}

Whiteboard.prototype.rotate = function(ctx, angle) {
	if(this.currentFile){
		this.currentFile.currentState.rotate(ctx, angle);
	}
}

Whiteboard.prototype.zoom = function(ctx, scale) {
	if(this.currentFile!=null){
		this.currentFile.currentState.zoom(ctx, scale);
	}
};

Whiteboard.prototype.onPlaying = function(reviewProgress){
	var _this = this;
	
	if(this.reviewLastTime>=this.reviewEndtime){
		return;
	}
	
	if(!this.roomPagesLoaded){
		$.ajax({
			url:format(this.roomPagesUrl, {room: room}),
			dataType : "jsonp",
		    jsonp:"jsonpcallback",
		    success:function(data){
		    	_this.roomPagesLoaded = true;
		    	_this.reviewPages = data.pages;
		    	_this.reviewEndtime = data.endtime;
		    	
		    	_this.play(reviewProgress);
		    }
		});
	}else{
		_this.play(reviewProgress);
	}
	
}

Whiteboard.prototype.play = function(reviewProgress){
	var _this = this;
	$.each(_this.reviewPages, function(key, val) {
		if(reviewProgress<val.time){
			return false;
		}else{
			_this.reviewToShowPage = val;
		}
	});
	
	var exist = false;
	$.each(_this.reviewData, function(key, val) {
		if(val.fileId==_this.reviewToShowPage.fileId&&val.pageId==_this.reviewToShowPage.pageId){
			exist = true;
			return false;
		}
	});
	
	if(!exist){
		$.ajax({
			url:format(_this.pageActionsUrl, {room: room, fileId:_this.reviewToShowPage.fileId, pageId:_this.reviewToShowPage.pageId}),
			dataType : "jsonp",
            jsonp:"jsonpcallback",
	        success:function(drawData){
	        	_this.reviewData.push({fileId:_this.reviewToShowPage.fileId, pageId:_this.reviewToShowPage.pageId, drawData:drawData});
	        	
	        	_this.drawAction(drawData);
				    
			}
		});
	}else{
		$.each(_this.reviewData, function(key, val) {
			if(val.fileId==_this.reviewToShowPage.fileId&&val.pageId==_this.reviewToShowPage.pageId){
				_this.drawAction(val.drawData);
				return false;
			}
		});
	}
}

Whiteboard.prototype.start = function(){
	if(this.review){
		next();
	}else{
		if(this.syncHistFlag){
			this.syncHist();
		}
		this.initWebSocket();
	}
}
