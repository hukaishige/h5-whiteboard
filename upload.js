var filesByOwnerUrl = "http://192.168.27.34:8090/messaging/whiteboard/file/list?user={user}";
var uploadTokenUrl = "http://192.168.27.34:8090/messaging/pic/token?expiretime=600";
var uploadToPPTVUrl = 'http://api.grocery.pptv.com/upload_file.php?app=lpic';
var uploadToAppUrl = "http://192.168.27.34:8090/messaging/whiteboard/file/urls/store";

function loadFiles(){
	$('#files').empty();
	$('#files').append("<tr><th></th><th>name</th></tr>");

	$.ajax({
		url: format(filesByOwnerUrl, {user: user}),
		dataType : "jsonp",
	    jsonp:"jsonpcallback",
		success: function(data) {
			console.log(data);
			//$("#docBox").append('<option value=\"-1\">Select file</option>');
			$.each(data, function(key, val) {
				var inputHtml = '<input name="fileId" type="checkbox" onchange="selectFile('+val.id+');" value="'+val.id+'" />';
				
				$('#files').append("<tr><td>"+inputHtml+"</td><td>"+val.fileName+"</td></tr>");
				//$("#docBox").append('<option value=\"'+data[index].id+'\" selected="true">'+data[index].fileName+'</option>');
			});
			
		}
	});
}

function selectFile(id){
	$('input[type="checkbox"][name="fileId"]').each(function (item) {
		if($(this).val()!=id){
			$(this).attr("checked", false);
		}
	});
}

function updateTotalProgress() {
	$('span.plupload_total_status').html(uploader.total.percent + '%');
	$('div.plupload_progress_bar').css('width', uploader.total.percent + '%');
	$('span.upload_status').html('Uploaded '+uploader.total.uploaded+'/'+ uploader.files.length+' files');
}

function updateList() {
	$(".plupload_buttons,.plupload_upload_status").css("display", "inline");
	var fileList = $('ul.plupload_filelist').html(''), inputCount = 0, inputHTML;

	$.each(uploader.files, function(i, file) {
		inputHTML = '';

		if (file.status == plupload.DONE) {
			if (file.target_name) {
				inputHTML += '<input type="hidden" name="_' + inputCount + '_tmpname" value="' + plupload.xmlEncode(file.target_name) + '" />';
			}

			inputHTML += '<input type="hidden" name="_' + inputCount + '_name" value="' + plupload.xmlEncode(file.name) + '" />';
			inputHTML += '<input type="hidden" name="_' + inputCount + '_status" value="' + (file.status == plupload.DONE ? 'done' : 'failed') + '" />';

			inputCount++;

			$('#_count').val(inputCount);
		}

		fileList.append(
			'<li id="' + file.id + '">' +
				'<div class="plupload_file_name"><span>' + file.name + '</span></div>' +
				'<div class="plupload_file_action"><a href="#"></a></div>' +
				'<div class="plupload_file_status">' + file.percent + '%</div>' +
				'<div class="plupload_file_size">' + plupload.formatSize(file.size) + '</div>' +
				'<div class="plupload_clearer">&nbsp;</div>' +
				inputHTML +
			'</li>'
		);

		$('span.plupload_total_file_size').html(plupload.formatSize(uploader.total.size));
	
		if (uploader.total.queued === 0) {
			$('span.plupload_add_text').html('Add Files');
		} else {
			$('span.plupload_add_text').html(o.sprintf('%d files queued', uploader.total.queued));
		}
	
		$('a.plupload_start').toggleClass('plupload_disabled', uploader.files.length == (uploader.total.uploaded + uploader.total.failed));
	
		// Scroll to end of file list
		fileList[0].scrollTop = fileList[0].scrollHeight;
	
		updateTotalProgress();
	
		// Re-add drag message if there is no files
		if (!uploader.files.length && uploader.features.dragdrop && uploader.settings.dragdrop) {
			$('#' + id + '_filelist').append('<li class="plupload_droptext">' + "Drag files here." + '</li>');
		}
    });
}

var uploader;

function initUploader() {
	var picToken = "";
	var production = "ppyun_whiteboard";
	var uploadedFiles = {};
	var total = 0;
	var uploaded = 0;

	$.ajax({
			url : uploadTokenUrl,
			dataType : "jsonp",
			jsonp : "jsonpcallback",
			success : function(token) {
				picToken = token;

				var url = uploadToPPTVUrl;

				url = url + '&tk=' + picToken;

				url = url + '&prod=' + production;

				uploader = new plupload.Uploader({
					browse_button : 'browse1', // this can be an id of a
												// DOM element or
					// the DOM element itself
					url : url,
					file_data_name : 'upload',
				});

				uploader.init();

				uploader.bind('FilesAdded', function(up, files) {

					var html = '';
					total = files.length;
					uploaded = 0;

					updateList();
					$('.plupload_start').show();
					
					$('#uploadModal').modal('show');

				});

				uploader.bind('UploadProgress', function(up, file) {
					$('#' + file.id + ' div.plupload_file_status').html(file.percent + '%');

					updateTotalProgress();
				});

				uploader.bind('FileUploaded',
						function(up, file, info) {
							uploadedFiles[file.name] = $.parseJSON(info.response).data;
							console.log('[FileUploaded] File:' + file.name + " Info:", $.parseJSON(info.response).data);
							uploaded++;
						});

				uploader.bind('UploadComplete',
								function(up, file) {
									console.log('[UploadComplete] files:' + $.toJSON(uploadedFiles));

									$.ajax({
											url : uploadToAppUrl,
											method : "POST",
											dataType : "jsonp",
											jsonp : "jsonpcallback",
											data : {
												fileName : $('#fileName').val(),
												pages : $.toJSON(uploadedFiles),
												user : user
											},
											success : function(data) {
												console.log('save file successfully');
												loadFiles();

											}
										});

									var obj = uploader.splice(0, total);
								});

				uploader.bind('StateChanged',
								function() {
									if (uploader.total.uploaded
											+ uploader.total.failed == uploader.files.length) {
										updateList();
										$(".plupload_buttons,.plupload_upload_status").css("display", "inline");
										uploader.disableBrowse(false);

										$('.plupload_start').hide();
									}
								}
				);

				uploader.bind('Error', function(up, err) {
					console.log("Error #" + err.code + ": " + err.message);
				});

				document.getElementById('start-upload').onclick = function() {
					if ($('#fileName').val() != '') {
						uploader.start();
					} else {
						alert('please give a name!');
					}

				};
				
				uploaderInited = true;
			}
		});
}
