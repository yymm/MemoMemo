/*
 * Ajax and WebSocket
 */
$(function(){
	// Save a will be updating memo when the edit button click.(Because remove specified 'dd' from 'dl'.)
	// A updated 'dd' add head of 'dl'.(jQuery.prepend)
	var update_memo = null;

	// Commit memo using Ajax
	$('.commit-button').click( function(){
		var memo = {
			id : $('input[name="id"]').val(),
			title : $('input[name="title"]').val(),
			text : $('.memo-input-text').val(),
			tag : $('input[name="tag"]').val()
		};
		// Update check
		if (update_memo)
		{
			var ex = update_memo.closest('dd').find('.memo-id').text();
			var ac = memo['id'];
			if (ex != ac)
			{
				update_memo = null;
			}
		}
		var send_data = JSON.stringify(memo);

		$.ajax({
			type: 'POST',
			url: '/add',
			data: send_data,
			contentType: 'application/json',
			success: function(json_data){
				var memo_json = $.parseJSON(json_data);
				var memo_html = memo_dom_from_json(memo_json)
				show_memo($(memo_html).prependTo('.memo'));
				if (update_memo)
				{
					update_memo.fadeOut('slow', function(){update_memo.remove();});
					update_memo = null;
				}
			}
		});

		clear_addentry();
		hide_addentry();
	});

	//
	// WebSocket
	// * Ready to websocket
	// * Search
	//
    //var host = location.origin.replace(/^http/, 'ws') + "/memos";
    //var socket = new WebSocket(host);

	// Response
    //socket.onmessage = function(message){
		//var memo_json = $.parseJSON(message.data);
		//var memo_html = memo_dom_from_json(memo_json);
		//var memo = $(memo_html).appendTo($('.memo'));
		//show_memo(memo);
    //};

	// On open websocket
	//socket.onopen = function()
	//{
		//var filter = {
			//title : "",
			//tag : "",
			//days : 30
		//};
		//send_to_websocket(filter)
	//};

	//function send_to_websocket(filter)
	//{
		//$('.memo').empty();
		//var send_data = JSON.stringify(filter);
		//socket.send(send_data);
	//};

	function memo_dom_from_json(memo)
	{
		var dd =    "<dd class='memo-dd' style='display: none;'>";
		var h1 =        "<h1 class='memo-title'>" + spchar_encoder(memo.title) +
				            "<var class='memo-date'>" + spchar_encoder(memo.date_time) + "</var>" +
				            "<var class='memo-tag'>"  + spchar_encoder(memo.tag) + "</var>" +
				        "</h1>";
		var a =         '<a class="memo-delete">delete</a>' + 
				        '<a class="memo-edit">edit</a>';
		var text =      memo.text; // html
		var meta =      '<p class="memo-title-only" style="display: none;">' + spchar_encoder(memo.title) + '</p>' +
				        '<p class="memo-text" style="display: none;">' + spchar_encoder(memo.basetext) + '</p>' + 
				        '<p class="memo-id" style="display: none;">' + memo.id + '</p>';
		var dd_end= '</dd>'

		return dd + h1 + a + text + meta + dd_end;
	};

	function show_memo(memo)
	{
		memo.fadeIn(500);

		// Add event when click this edit button
		memo.find('.memo-edit').click( function()
		{
			var memo_id = $(this).closest('dd').find('.memo-id').text();
			var title = $(this).closest('dd').find('.memo-title-only').text();
			var text = $(this).closest('dd').find('.memo-text').text();
			var tag = $(this).closest('dd').find('.memo-tag').text();
			$('.memo-input-id').val(memo_id);
			$('.memo-input-title').val(spchar_decoder(title));
			$('.memo-input-text').val(spchar_decoder(text));
			$('.memo-input-tag').val(spchar_decoder(tag));
			show_addentry();
			update_memo = $(this).closest('dd');
		});
		// Delete using Ajax
		memo.find('.memo-delete').click(function(){
			var delete_dd = $(this).closest('dd');
			var memo_id = $(this).closest('dd').find('.memo-id').text();
			var memo_title = $(this).closest('dd').find('.memo-title-only').text();
			var ret = window.confirm("Are you sure you want to delete?\nTitle : " + memo_title)
			if (ret == true)
			{
				$.ajax({
					type: 'POST',
					url: '/delete',
					data: JSON.stringify({id: memo_id}),
					contentType: 'application/json',
					success: function(json_data){
						delete_dd.fadeOut('slow', function(){delete_dd.remove();});
					}
				});
			}
		});
	};

	$('#submit-button').click(function(){
		var empty_to_zero = function(str){if(str){return str;}else{return 0;}};
		filter = {
			title: $("#search-form [name=title]").val(),
			tag: $("#search-form [name=tag]").val(),
			days: empty_to_zero($("#search-form [name=date]").val())
		};
		//send_to_websocket(filter);
		ajax_filter_post(filter);
	});

	$('.jsCumulus').click(function(){
		filter = {
			title: "",
			tag: $(this).text(),
			days: 0
		};
		//send_to_websocket(filter);
		ajax_filter_post(filter);
	});

	// html encoder / decoder
	function spchar_encoder(html){
		return html
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};
	function spchar_decoder(text){
		return text
			.replace(/&amp;/g, "&")
			.replace(/&it;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'");
	};

	//
	// Ajax instead of WebSocket
	//
	
	$(document).ready(function(){
		var filter = {
			title : "",
			tag : "",
			days : 7
		};
		ajax_filter_post(filter);
	});

	function ajax_filter_post(filter){
        $('#load').css('visibility', 'visible');
		$('.memo').empty();
		$.ajax({
			type: 'POST',
			url: '/memomemo',
			data: JSON.stringify(filter),
			contentType: 'application/json',
			success: function(json){
				var memos = $.parseJSON(json);
				for (var i = 0; i < memos.length; ++i) {
					var memo_html = memo_dom_from_json($.parseJSON(memos[i]));
					var memo = $(memo_html).appendTo($('.memo'));
					show_memo(memo);
                    $('#load').css('visibility', 'hidden');
				}
			}
		});
	};
});
