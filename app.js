
(function() {
    var currentState = {};
	var pageStates = [];
	var pageIndex = 0;
	
	var angleDelta = 90;
    var zoomDelta = 0.1;

/* Shapes definition */

	var Shape = function(type, fill, color, strokeW, lineCap, lineJoin){
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
		    var x = isTouchSupported ? (e.targetTouches[0].pageX - canvas.offsetLeft) : (e.offsetX || e.layerX - canvas.offsetLeft);
            var y = isTouchSupported ? (e.targetTouches[0].pageY - canvas.offsetTop) : (e.offsetY || e.layerY - canvas.offsetTop);
			
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
	
	Shape.prototype.draw = function(ctx){
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
	
	Shape.prototype.drawSelf = function(ctx){};

	var Pencil = function(){
		this.base=Shape;
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
			obj.page = pageIndex;
			obj.type = this.type;
			obj.fill = this.fill;
			obj.color = this.color;
			obj.strokeW = this.strokeW;
			obj.points=this.points;
			return obj;
		};
		this.fromJson=function(obj){
		    this.page = obj.page;
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
	
	Pencil.prototype = new Shape();

	var RegularShape = function(type, beginX, beginY, endX, endY, fill, color, strokeW){
		this.base=Shape;
		this.base(type);
		this.beginX = beginX||0;
		this.beginY = beginY||0;
		this.endX = endX||0;
		this.endY = endY||0;
		
		this.toJson=function(){
			var obj = new Object();
			obj.page = pageIndex;
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
		    this.page = obj.page;
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
	
	RegularShape.prototype = new Shape();

	var Line = function(){
		this.base = RegularShape;
		this.base('line');
		
		this.drawSelf=function(ctx){
			ctx.moveTo(this.beginX, this.beginY);
			ctx.lineTo(this.endX, this.endY);
			ctx.stroke();
		};
	}
	
	Line.prototype = new RegularShape();

	var Rect = function(){
		this.base = RegularShape;
		this.base('rectangle');
		
		this.drawSelf=function(ctx){
			var width = this.endX - this.beginX;
			var height = this.endY - this.beginY;
			ctx.fillRect(this.beginX, this.beginY, width, height);
			ctx.strokeRect(this.beginX, this.beginY, width, height);
		};
	}
	Rect.prototype = new RegularShape();

	var Ellipse = function(){
		this.base = RegularShape;
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
			ctx.fill();
		};
	}
	
	Ellipse.prototype = new RegularShape();

/* Document image definition*/

    var DocImage = function(){
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
					ctx.save();
					ctx.translate(_this.state.totalOffsetX, _this.state.totalOffsetY);
			        ctx.scale(_this.state.currentScale, _this.state.currentScale);
                    ctx.rotate(_this.state.currentAngle * Math.PI / 180);
			        drawInternal(_this, ctx);
					ctx.restore();
                }
			}else{
			    this.width = this.image.width;
			    this.height = this.image.height;
			    drawInternal(_this, ctx);
			}
		}
		
		drawInternal = function(_this,ctx){
            ctx.save();
		    ctx.drawImage(_this.image, -_this.image.width / 2, -_this.image.height / 2);
            ctx.restore();
		}
		
		this.toJson=function(){
			var obj = new Object();
			obj.page = pageIndex;
			obj.type = this.type;
			obj.src = this.src;
			obj.x = this.x;
			obj.y = this.y;
			obj.sx = this.sx;
			obj.sy = this.sy;
			obj.width = this.width;
			obj.height = this.height;
			return obj;
		};
		
		this.fromJson=function(obj){
		    this.page = obj.page;
		    this.src = obj.src;
			this.type = obj.type;
			this.x = obj.x;
			this.y = obj.y;
			this.sx = obj.sx;
			this.sy = obj.sy;
			this.width = obj.width;
			this.height = obj.height;
		}
	}
	
/* State definition */

	var State = function() {
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
	 };
	 
	 State.prototype.init = function(){
	    this.targetShape = new Pencil();
		this.lastOffsetX = canvas.width/2;
	    this.lastOffsetY = canvas.height/2;
	
	    this.totalOffsetX = this.offsetX + this.lastOffsetX;
	    this.totalOffsetY = this.offsetY + this.lastOffsetY;
	};
	 
	State.prototype.draw = function(ctx){
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
	
	State.prototype.onDown = function(ctx, e){
		e.preventDefault();
	  	this.isActive = true;
		
		if(this.drag){
		    this.dragStartX = isTouchSupported ? e.targetTouches[0].pageX : (e.offsetX || e.layerX);
            this.dragStartY = isTouchSupported ? e.targetTouches[0].pageY : (e.offsetY || e.layerY);
			
		   return;
		}
		
		this.targetShape = new constructorFunc[this.drawType]();
		this.targetShape.state = currentState;
		this.targetShape.color = color;
		this.targetShape.onDown(e);
		
		if(this.drawType!="image"){
		    this.shapes.push(this.targetShape);
		}
	};
	
	State.prototype.onMove = function(ctx, e){
		e.preventDefault(); // prevent continuous touch event process e.g. scrolling!
	  	if(!this.isActive) return;
		
		if(this.drag){
		    this.doDrag(ctx, e);
		    return;
		}
		
		this.targetShape.onMove(e);
		
		this.draw(ctx);
	};
	
	State.prototype.onUp = function(ctx, e){
		e.preventDefault();
	  	this.isActive = false;
	    if(this.drag){
	        this.lastOffsetX += this.offsetX;
	        this.lastOffsetY += this.offsetY;
			
			//console.log(this.lastOffsetX+"="+this.lastOffsetX);
	        return;
	    }
	    this.targetShape.onUp(e);
	  	publish(this.targetShape.toJson());
	}
	
	State.prototype.doDrag = function(ctx, e){
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
	
	State.prototype.rotate = function(ctx, delta) {
	    this.currentAngle += delta;
		this.currentAngle = this.currentAngle%360;
		this.bgImage.currentAngle = this.currentAngle;
		for(var i=0; i<this.shapes.length; i++) {
			this.shapes[i].currentAngle = this.currentAngle;
		}
        this.draw(ctx);
	}
	
	State.prototype.zoom = function(ctx, delta) {
	    this.currentScale += delta;
		this.bgImage.currentScale = this.currentScale;
		for(var i=0; i<this.shapes.length; i++) {
			this.shapes[i].currentScale = this.currentScale;
		}
        this.draw(ctx);
	}
	 
	State.prototype.clear = function(){
	    ctx.translate(0, 0);
	    ctx.clearRect (0 , 0, canvas.width , canvas.height );
	};
	
	State.prototype.undo = function(){
	    this.shapes.splice(this.shapes.length-1,1);
		this.draw(ctx);
	};
	
	var constructorFunc = {};
	constructorFunc['rectangle'] = Rect;
	constructorFunc['ellipse'] = Ellipse;
	constructorFunc['line'] = Line;
	constructorFunc['pencil'] = Pencil;
	constructorFunc['image'] = DocImage;
	
/* PubNub */

	var channel = 'mydraw';

	var pubnub = PUBNUB.init({
		publish_key     : 'pub-c-156a6d5f-22bd-4a13-848d-b5b4d4b36695',
		subscribe_key   : 'sub-c-f762fb78-2724-11e4-a4df-02ee2ddab7fe',
		leave_on_unload : true
	});

	pubnub.subscribe({
		channel: channel,
		callback: drawFromStream,
		presence: function(m){
   		}
	});

	function publish(obj) {
	    var data = {};
		data.index = pageIndex;
		data.imageUrl=currentState.bgImage.src;
		data.shapes = [];
		if(obj!=null){
		    data.shapes.push(obj);
		}
		pubnub.publish({
			channel: channel,
			message: data
		});
    }

	/* Mouse and touch events */
	
	document.getElementById('colorSwatch').addEventListener('click', function() {
		color = document.querySelector('#colorSwatch :checked').getAttribute('data-color');
	}, false);
	
	var isTouchSupported = 'ontouchstart' in window;
	var isPointerSupported = navigator.pointerEnabled;
	var isMSPointerSupported =  navigator.msPointerEnabled;
	
	var downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
	var moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
	var upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));
	
	var canvas = document.getElementById('drawCanvas');
	canvas.width = 1000;
	canvas.height = 800;
	var ctx = canvas.getContext('2d');
	
	canvas.addEventListener(downEvent, onDown, false);
	canvas.addEventListener(moveEvent, onMove, false);
	canvas.addEventListener(upEvent, onUp, false);
	
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
		
	function setButtonBg(target){
	    var buttons = document.getElementById("toolbar").getElementsByTagName("a");
	    for(var i=0;i<buttons.length;i++){
	        removeClass(buttons[i], 'selected');
	    }
		
		addClass(target, 'selected');
	}
	
	document.getElementById('rectangle').addEventListener('click', function() {
	    currentState.drawType = "rectangle";
		currentState.drag = false;
		setButtonBg(this);
	}, false);
	
	document.getElementById('ellipse').addEventListener('click', function() {
	    currentState.drawType = "ellipse";
		currentState.drag = false;
		setButtonBg(this);
	}, false);
	
	document.getElementById('line').addEventListener('click', function() {
	    currentState.drawType = "line";
		currentState.drag = false;
		setButtonBg(this);
	}, false);
	
	document.getElementById('pencil').addEventListener('click', function() {
	    currentState.drawType = "pencil";
		currentState.drag = false;
		setButtonBg(this);
	}, false);
	
	document.getElementById('drag').addEventListener('click', function() {
		currentState.drag = true;
		currentState.drawType = "drag";
		setButtonBg(this);
	}, false);
	
	document.getElementById('rotateLeft').addEventListener('click', function() {
		currentState.rotate(ctx, angleDelta);
	}, false);
	
	document.getElementById('rotateRight').addEventListener('click', function() {
		currentState.rotate(ctx, -angleDelta);
	}, false);
	
	document.getElementById('zoomIn').addEventListener('click', function() {
		currentState.zoom(ctx, zoomDelta);
	}, false);
	
	document.getElementById('zoomOut').addEventListener('click', function() {
		currentState.zoom(ctx, -zoomDelta);
	}, false);
	
	document.getElementById('pre').addEventListener('click', function() {
		pageIndex -= 1;
		if(pageIndex<0){
		    pageIndex = 0;
		}
		
		changeToPage(pageIndex);
	}, false);
	
	document.getElementById('next').addEventListener('click', function() {
		pageIndex += 1;
		if(pageIndex>2){
		    pageIndex = 2;
		}
		
		changeToPage(pageIndex);

	}, false);
	
	document.getElementById('undo').addEventListener('click', function() {
		currentState.undo();

	}, false);
	
	function changeToPage(index){
	    var state = pageStates[index];
		if(state==null){
	        state = new State();
			state.init();
			var bgImage = new DocImage();
			bgImage.state = state;
	        bgImage.src = "images/ppt"+index+".png";
	        state.bgImage = bgImage;
			state.targetShape = new Pencil();
		    pageStates.push(state);
		}

		currentState = state;
		
		currentState.draw(ctx);
		publish();
	}
	
    function drawFromStream(message) {
	    if(!message) return;
		var index = message.index;
		
		var state = pageStates[index];
		
		if(state==null){
	        state = new State();
			state.targetShape = new Pencil();
			state.init();
		    pageStates[index] = state;
		}
		
		var bgSrc = message.imageUrl;
		if(state.bgImage==""||state.bgImage.src!=bgSrc){
			var bgImage = new DocImage();
			bgImage.state = state;
	        bgImage.src = bgSrc;
			state.bgImage = bgImage;
		}
		
		for(var i in message.shapes) {
			var type = message.shapes[i].type;
			var obj = new constructorFunc[type]();
			obj.state = state;
			obj.fromJson(message.shapes[i]);
			
			state.shapes.push(obj);
		}
		
		currentState = state;
		redraw(ctx);
	}
	
	function onDown(e) {
	  	currentState.onDown(ctx, e);
	}
	
	function onMove(e) {
	    currentState.onMove(ctx, e);
	}
	
	function onUp(e) {
	  	currentState.onUp(ctx, e);
	}
	
	function redraw(ctx){
		currentState.draw(ctx);
	}
	
	function clear(ctx){
	    currentState.clear(ctx);
	}
	
	var rotate = function(ctx, angle) {
	    currentState.rotate(ctx, angle);
	}
	
	var zoom = function(ctx, scale) {
	   currentState.zoom(ctx, scale);
	}
	
	var state = new State();
	state.init();
	var bgImage = new DocImage();
	bgImage.src = "images/ppt0.png";
	
	state.bgImage = bgImage;
	
	bgImage.state = state;
	
	pageStates.push(state);
	currentState = state;
	
	currentState.targetShape = new Pencil();
	
	redraw(ctx);
	publish(bgImage.toJson());
	
	var color = document.querySelector('#colorSwatch :checked').getAttribute('data-color');
	 
	ctx.strokeStyle = color;
	ctx.lineWidth = '3';
	ctx.lineCap = ctx.lineJoin = 'round';
	
	var isActive = false;
    var obj;
	
	// Get Older and Past Drawings!
    if(drawHistory) {
	    pubnub.history({
	    	channel  : channel,
	    	count    : 50,
	    	callback : function(messages) {
	    		pubnub.each( messages[0], drawFromStream );
	    	}
	    });
	}
})();
