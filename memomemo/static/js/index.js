$(document).ready(function(){
	//
	// SocketIO event
	//
	namespace = '/memo';
	var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);

	socket.on('connect', function() {
		socket.emit('recieve log', {log: 'Success to connect!'});
	});

	socket.on('memo response', function(msg) {
		display_memos(msg);
	});

	socket.on('log response', function(msg) {
		console.log(msg);
	});

	//
	// UI event (Websocket)
	//
	function send_to_websocket(filter){
		$('#container').empty();
		socket.emit('filter memo', JSON.stringify(filter));
	}

	$('.submit-button').click(function(){
		var empty_to_zero = function(str){if(str){return str;}else{return 0;}};
		filter = {
			user_id: $('#user_id').html(),
			title: $("#search-form [name=title]").val(),
			tag: $("#search-form [name=tag]").val(),
		};
		send_to_websocket(filter);
	});

	$('.jsCumulus').click(function(){
		filter = {
			user_id: $('#user_id').html(),
			title: '',
			tag: $(this).text(),
		};
		send_to_websocket(filter);
	});

	$('.tag').click(function(){
		filter = {
			user_id: $('#user_id').html(),
			title: '',
			tag: $(this).children('i').text(),
		};
		send_to_websocket(filter);
	});

	//
	// UI event (Ajax)
	//
	var update_flag = false;
	var update_date = null;
	var update_memo = null;

	function clear_addentry() {
		$('.memo-input-title').val("");
		$('.memo-input-text').val("");
		$('.memo-input-tag').val("");
		update_flag = false;
		update_date = null;
	}
	//clear_addentry();

	$('.commit-button').click( function(){
		var url = '/add';	// {{{
		var memo = {
			title : $('input[name="title"]').val(),
			text : $('.memo-input-text').val(),
			tag : $('input[name="tag"]').val()
		};
		if (!memo.title || !memo.text) {
			alertFlash("Nothing input...", 'warning');
			return false;
		}
		// Update check
		if (update_flag)
		{
			url = '/update';
			memo.date = update_date;
		}
		var send_data = JSON.stringify(memo);

		$.ajax({
			type: 'POST',
			url: url,
			data: send_data,
			contentType: 'application/json',
			success: function(json_memo){
				display_memos(json_memo, true);
				var msg = 'Added new post!';
				if (update_flag)
				{
					update_memo.fadeOut('slow', function(){
						update_memo.remove();
						update_memo = null;
					});
					msg = 'Updated at ' + $.parseJSON(json_memo).date_time;
				}
				clear_addentry();
				var dialog = $('#entrydlg');
				$(dialog).fadeOut(200);
				$('#over').fadeOut(200);
				$('#over').remove();
				alertFlash(msg, 'information');
			},
			error: function(){
				alertFlash('Connection Error: Please retry.', 'error');
			}
		});

	});	// }}}

	$('#setting').click(function(){
		$('.metanav').toggleClass('open-metanav');
		$('.setting').toggleClass('open');
	});

	//
	// Display memo
	// 1. Get json_data, it include one memo(title, text, tag) from database.
	// 2. Create DOM
	// 3. Append this DOM
	// 4. Set attribute(edit, delete)
	//
	function display_memos(json_memo, prepend){
		if (prepend === 'undefined') prepend = false; 
		var data = $.parseJSON(json_memo);
 		var memo_html = create_dom_from_memo(data);
		var memo;
		if (prepend) {
			memo = $(memo_html).prependTo($('#container'));
		} else {
			memo = $(memo_html).appendTo($('#container'));
		}
		set_attr(memo);
	}

	function create_dom_from_memo(memo)
	{ // {{{
		var div =    "<div class='memo-div' style='display: none;'>";
		var h1 =        "<div class='headline memo-title'>" + spchar_encoder(memo.title) +
				            "<var class='memo-date'>" + spchar_encoder(memo.date_time) + "</var>" +
				            "<var class='memo-tag'>"  + spchar_encoder(memo.tag) + "</var>" +
				        "</div>";
		var a =         '<a class="memo-delete">delete</a>' + 
				        '<a class="memo-edit">edit</a><div class="memo-inner">';
		var text =      memo.text; // html
		var meta =      '</div><p class="memo-title-only" style="display: none;">' + spchar_encoder(memo.title) + '</p>' +
				        '<p class="memo-text" style="display: none;">' + spchar_encoder(memo.basetext) + '</p>' + 
				        '<p class="memo-id" style="display: none;">' + memo.id + '</p>';
		var div_end= '</div>';

		return div + h1 + a + text + meta + div_end;
	}	// }}}

	function set_attr(memo)
	{	// {{{
		memo.fadeIn(500);
		// Add event when click this edit button
		memo.find('.memo-edit').click( function(){
			var title = $(this).closest('div').find('.memo-title-only').text();
			var text = $(this).closest('div').find('.memo-text').text();
			var date = $(this).closest('div').find('.memo-date').text();
			var tag = $(this).closest('div').find('.memo-tag').text();
			$('.memo-input-title').val(spchar_decoder(title));
			$('.memo-input-text').val(spchar_decoder(text));
			$('.memo-input-tag').val(spchar_decoder(tag));
			// Update Info
			update_memo = $(this).closest('div');
			update_flag = true;
			update_date = spchar_decoder(date);
			var dialog = $('#entrydlg');
			$(dialog).fadeIn(200);
			$('body').prepend('<div id="over">');
			$('#over').fadeIn(200);
		});
		// Delete using Ajax
		memo.find('.memo-delete').click(function(){
			var delete_div = $(this).closest('div');
			var memo_date = $(this).closest('div').find('.memo-date').text();
			var memo_title = $(this).closest('div').find('.memo-title-only').text();
			var ret = window.confirm("Are you sure you want to delete?\nTitle : " + memo_title);
			if (ret === true)
			{
				$.ajax({
					type: 'POST',
					url: '/delete',
					data: JSON.stringify({'date_time': memo_date}),
					contentType: 'application/json',
					success: function(json_data){
						delete_div.fadeOut('slow', function(){delete_div.remove();});
						alertFlash('Deleted.', 'important');
					},
					error: function(){
						alertFlash('Connection Error: Please retry.', 'error');
					}
				});
			}
		});
	}	// }}}

	// html encoder / decoder
	function spchar_encoder(html){
		return html	// {{{
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}	// }}}

	function spchar_decoder(text){
		return text	// {{{
			.replace(/&amp;/g, "&")
			.replace(/&it;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'");
	}	// }}}

	//
	// UI event(Edit form)
	//
	$('.clear-btn').click(function(){
		clear_addentry();
	});
	$('.public-btn').click(function(){
		console.log($('#public:checked').val());
		if($('#public:checked').val() === undefined) {
			$('.public-btn').css("background", "none");
			$('.public-btn label').css("color", "#000");
		}else{
			$('.public-btn').css("background", "#ff8800");
			$('.public-btn label').css("color", "#FFF");
		}
	});
});
/* vim:set foldmethod=marker: */
