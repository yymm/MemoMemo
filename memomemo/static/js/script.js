$(function(){
	var global_lock_check_status = false;

	$('#lock-check').click( function()
	{
		global_lock_check_status = this.checked;
		if (this.checked)
		{
			show_addentry();
		}
	});
	show_addentry = function()
	{
		$('.addentry-div').addClass('show-addentry-div');
		$('.addentry-form').css('display', 'inline-block');
	};
	hide_addentry = function()
	{
		$('.addentry-div').removeClass('show-addentry-div');
		$('.addentry-form').css('display', 'none');
	};
	clear_addentry = function()
	{
		$('.memo-input-title').val("");
		$('.memo-input-text').val("");
		$('.memo-input-tag').val("");
		$('#lock-check').attr('checked', false);
		global_lock_check_status = false;
	};
	$('.addentry-div').hover( function()
	{
		show_addentry();
	},
	function ()
	{
		if (global_lock_check_status == false)
		{
			hide_addentry();
		}
	});
	clear_addentry();

	/*
	 *
	 * Flash alert
	 *
	 */
	function alertFlash(message, category){
		var prnt = document.createElement('div');
		var child = document.createElement('button');
		prnt.className = 'flash-alert';
		prnt.id = category === undefined ? 'important' : category;
		prnt.textContent = message;
		child.className = 'close-btn';
		child.textContent = 'x';
		child.onclick = function(){
			var closest_div = $(this).closest("div");
			closest_div.fadeOut('normal', function(){closest_div.remove();});
		};
		prnt.appendChild(child);
		var container = document.getElementById('container');
		container.insertBefore(prnt, container.firstChild);
		setTimeout(function(){
			$('.flash-alert').fadeOut('normal', function(){$(this).remove();})}
		, 5000);
	}

	// Save a will be updating memo when the edit button click.(Because remove specified 'dd' from 'dl'.)
	// A updated 'dd' add head of 'dl'.(jQuery.prepend)
	var update_flag = false;
	var update_date = null;
	var update_memo = null;

	// Commit memo using Ajax
	$('.commit-button').click( function(){
		var url = '/add';
		var memo = {
			title : $('input[name="title"]').val(),
			text : $('.memo-input-text').val(),
			tag : $('input[name="tag"]').val()
		};
		// Update check
		if (update_flag)
		{
			url = '/update';
			memo['date'] = update_date;
		}
		var send_data = JSON.stringify(memo);

		$.ajax({
			type: 'POST',
			url: url,
			data: send_data,
			contentType: 'application/json',
			success: function(json_data){
				var memo_json = $.parseJSON(json_data);
				var memo_html = memo_dom_from_json(memo_json)
				var memo = $(memo_html).prependTo($('#container'));
				add_movement(memo);
				if (update_flag)
				{
					update_memo.fadeOut('slow', function(){update_memo.remove();});
					update_flag = false;
					update_date = null;
					update_memo = null;
					alertFlash('Updated at ' + memo_json['date_time'], 'information');
					clear_addentry();
					hide_addentry();
					return;
				}
				clear_addentry();
				hide_addentry();
				alertFlash('Added new post!', 'information');
			},
			error: function(){
				alertFlash('Connection Error: Please retry.', 'error');
			}
		});

	});

	//
	// WebSocket
	// * Ready to websocket
	// * Search


	var socket = io.connect('http://' + document.domain + ':' + location.port + '/memomemo');

	socket.on('connect', function() {
		send_to_websocket(null);
	});

	socket.on('memo response', function(message){
		var data = $.parseJSON(message);
		var memo_html = memo_dom_from_json(data);
		var memo = $(memo_html).appendTo($('#container'));
		add_movement(memo);
	});

	function send_to_websocket(filter){
		$('#container').empty();
		socket.emit('memo event', filter);
	};

	function memo_dom_from_json(memo)
	{
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
		var div_end= '</div>'

		return div + h1 + a + text + meta + div_end;
	};

	function add_movement(memo)
	{
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
			show_addentry();
			// Update Info
			update_memo = $(this).closest('div');
			update_flag = true;
			update_date = spchar_decoder(date);
		});
		// Delete using Ajax
		memo.find('.memo-delete').click(function(){
			var delete_div = $(this).closest('div');
			var memo_date = $(this).closest('div').find('.memo-date').text();
			var memo_title = $(this).closest('div').find('.memo-title-only').text();
			var ret = window.confirm("Are you sure you want to delete?\nTitle : " + memo_title)
			if (ret == true)
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
	};

	$('.submit-button').click(function(){
		var empty_to_zero = function(str){if(str){return str;}else{return 0;}};
		filter = {
			title: $("#search-form [name=title]").val(),
			tag: $("#search-form [name=tag]").val(),
		};
		//alertFlash('hi');
		send_to_websocket(filter);
	});

	$('.jsCumulus').click(function(){
		filter = {
			title: '',
			tag: $(this).text(),
		};
		//alertFlash('hi');
		send_to_websocket(filter);
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
});
