<%@ page language="java" contentType="text/html; charset=utf-8"
    pageEncoding="utf-8"%> 
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">

	<title>Whiteboard</title>
	<meta name="description" content="Draw">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="./css/style.css">
	<link rel="stylesheet" href="./css/jquery.plupload.queue.css" type="text/css" media="screen" />
    <link href="http://libs.baidu.com/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
   <script src="http://libs.baidu.com/jquery/2.0.0/jquery.min.js"></script>
   <script src="http://libs.baidu.com/bootstrap/3.0.3/js/bootstrap.min.js"></script>

<script src="./js/jquery.json.js"></script>

<!-- production -->
<script src="./js/queue/plupload.full.min.js"></script>
</head>
   <%
    String room = request.getParameter("room");
    Boolean master = Boolean.parseBoolean(request.getParameter("master"));
    String user = request.getParameter("user");
   %>
	<script>
		var master = <%=master%>;
		var room = '<%=room!=null?room:""%>';
		var user = '<%=user!=null?user:""%>';
		var app = 'pptv';
		var syncHistFlag = true;
		var review = false;
		
		if(master){
			/* $.ajax({
				url: "http://localhost:8090/messaging/file/owner?user="+user,
				dataType : "jsonp",
		        jsonp:"jsonpcallback",
				success: function(data) {
					console.log(data);
					//$("#docBox").append('<option value=\"-1\">Select file</option>');
					for(var index in data) {
						$("#docBox").append('<option value=\"'+data[index].id+'\" selected="true">'+data[index].fileName+'</option>');
					}
					
				}
			}); */
		}
		
	</script>

<body>
    <div id="drawArea">
		<canvas id="drawCanvas" width="1000px" height="800px">Canvas is not supported on this browser!</canvas>
	</div>

	<section id="colorSwatch">
		<input type="radio" name="color" id="color01" data-color="gold" checked><label for="color01"></label> 
		<input type="radio" name="color" id="color02" data-color="darkorange">	<label for="color02"></label>  
		<input type="radio" name="color" id="color03" data-color="navy">		<label for="color03"></label>  
		<input type="radio" name="color" id="color04" data-color="yellowgreen">	<label for="color04"></label>  
		<input type="radio" name="color" id="color05" data-color="firebrick">	<label for="color05"></label>  
		<input type="radio" name="color" id="color06" data-color="powderblue">	<label for="color06"></label> 
	</section>
	
	<div id="toolbar">
	    <a id="rectangle" href="#" class="toolbarButton rectangle" data-toggle="tooltip" data-placement="bottom" title="draw rectangle"></a>
        <a id="ellipse" href="#" class="toolbarButton hint--bottom ellipse"  data-toggle="tooltip" data-placement="bottom" title="draw ellipse"></a>
	    <a id="line" href="#" class="toolbarButton hint--bottom line"  data-toggle="tooltip" data-placement="bottom" title="draw line"></a>
	    <a id="pencil" href="#" class="toolbarButton hint--bottom pencil selected"  data-toggle="tooltip" data-placement="bottom" title="draw freeline"></a>
        <a id="rotateLeft" href="#" class="toolbarButton rotateleft hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="Rotate to Left"></a>
        <a id="rotateRight" href="#" class="toolbarButton rotateright hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="Rotate to Right"></a>
        <a id="zoomIn" href="#" class="toolbarButton zoomin hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="zoom in"></a>
        <a id="zoomOut" href="#" class="toolbarButton zoomout hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="zoom out"></a>
        <a id="drag" href="#" class="toolbarButton drag hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="drag" data-hint="drag"></a>
        <a id="pre" href="#" class="toolbarButton pre hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="pre page"></a>
        <a id="next" href="#" class="toolbarButton next hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="next page"></a>
		<a id="undo" href="#" class="toolbarButton undo hint--bottom"  data-toggle="tooltip" data-placement="bottom" title="undo"></a>
		<a href="#" id="selectFile">Select File</a>
    </div>

<div class="modal fade" id="filesModal" tabindex="-1" role="dialog" 
   aria-labelledby="myModalLabel" aria-hidden="true">
   <div class="modal-dialog">
      <div class="modal-content">
         <div class="modal-header">
            <button type="button" class="close" 
               data-dismiss="modal" aria-hidden="true">
                  &times;
            </button>
            <h4 class="modal-title" id="myModalLabel">Select file to demonstrate</h4>
            <a href="#" class="plupload_button plupload_add" id="browse1">Add Files</a>
         </div>
         <div class="modal-body">
             <table id="files" class="table table-hover">
		    </table>
         </div>
         <div class="modal-footer">
            <button type="button" class="btn btn-default" 
               data-dismiss="modal">Close
            </button>
            <button type="button" class="btn btn-primary" id="fileSelected">Ok</button>
         </div>
      </div><!-- /.modal-content -->
</div><!-- /.modal -->
</div>

<div class="modal fade" id="uploadModal" tabindex="-1" role="dialog" 
   aria-labelledby="myModalLabel" aria-hidden="true">
   <div class="modal-dialog">
      <div class="modal-content">
         <div class="modal-header">
            <button type="button" class="close" 
               data-dismiss="modal" aria-hidden="true">
                  &times;
            </button>
            <h4 class="modal-title" id="myModalLabel">Upload files</h4>
         </div>
         <div class="modal-body">
             <div class="plupload_wrapper plupload_scroll">
			<div id="_container" class="plupload_container">
				<div class="plupload">
					<div style="display: inline-block;">
						<label for="fileName">Name: </label> <input type="text" name="fileName" id="fileName" />
					</div>
					<div class="plupload_content">
						<div class="plupload_filelist_header">
							<div class="plupload_file_name">Filename</div>
							<div class="plupload_file_action">&nbsp;</div>
							<div class="plupload_file_status">
								<span>Status</span>
							</div>
							<div class="plupload_file_size">Size</div>
							<div class="plupload_clearer">&nbsp;</div>
						</div>

						<ul id="filelist" class="plupload_filelist"></ul>

						<div class="plupload_filelist_footer">
							<div class="plupload_file_name">
								<div class="plupload_buttons">
									<a href="#" class="plupload_button plupload_start"
										id='start-upload'>Start Upload</a>
								</div>
								<span class="upload_status"></span>
							</div>
							<div class="plupload_file_action"></div>
							<div class="plupload_file_status">
								<span class="plupload_total_status">0%</span>
							</div>
							<div class="plupload_file_size">
								<span class="plupload_total_file_size">0 b</span>
							</div>
							<div class="plupload_progress">
								<div class="plupload_progress_container">
									<div class="plupload_progress_bar"></div>
								</div>
							</div>
							<div class="plupload_clearer">&nbsp;</div>
						</div>
					</div>
				</div>
			</div>
			<input type="hidden" id="_count" name="_count" value="0" />
		</div>
         </div>
      </div><!-- /.modal-content -->
</div><!-- /.modal -->
</div>

<form id="uploadForm" method="post" action="#" target="uploadFrame" style="visibility:hidden;">
</form>
<iframe id="uploadFrame" name="uploadFrame" style="visibility:hidden;"></iframe>

<script src="./js/socket.io/socket.io.js"></script>
<script src="./js/whiteboard.js"></script>
<script src="./js/upload.js"></script>
<script src="./js/app.js"></script>
	
</body>
</html>
