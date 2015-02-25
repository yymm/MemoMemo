$(document).ready(function(){

	marked.setOptions({
	  renderer: new marked.Renderer(),
	  gfm: true,
	  tables: true,
	  breaks: false,
	  pedantic: false,
	  sanitize: true,
	  smartLists: true,
	  smartypants: false,
	  highlight: function (code) {
	    return hljs.highlightAuto(code).value;
	  }
	});

	//
	// Toggle Dialog
	//
	$(document).ready(function(){
		$('a.showdlg').click(function(){
			var dialog = $(this).attr('href');
			if (dialog === "#entrydlg") {
				document.querySelector('#rest').classList.add('paser-active');
				document.querySelector('#rest').classList.remove('paser-inactive');
				document.querySelector('#mkd').classList.add('paser-inactive');
				document.querySelector('#mkd').classList.remove('paser-active');
				$('.publish-btn').css("background", "none");
				$('.publish-btn label').css("color", "#000");
				$('#publish').attr('checked', false);
				clear_addentry();
			}
			$(dialog).fadeIn(200);
			$('body').prepend('<div id="over">');
			$('#over').fadeIn(200);
			return false;
		});
	});
	
	$(document).ready(function(){
		$('a.closedlg').click(function(){
			closedlg($(this).attr('href'));
			return false;
		});
	});

	//
	// SocketIO event
	//
	namespace = '/memo';
	var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);

	var old_filter = null;
	var connecting = false;

	socket.on('connect', function() {
		socket.emit('recieve log', {log: 'Success to connect!'});
	});

	socket.on('memo response', function(msg) {
		memos = $.parseJSON(msg);
		if (memos.length != 10 || memos.length == 0) {
			old_filter = null;
			document.querySelector('#loading').classList.add("hidden");
		}
		for (i = 0; i < memos.length; ++i) {
			display_memo(memos[i]);
		}
	});

	socket.on('log response', function(msg) {
		console.log(msg);
		send_to_websocket();
	});

	//
	// UI event (Websocket)
	//
	function send_to_websocket(title, text, tag){
		if (typeof title === 'undefined') title = '';
		if (typeof text === 'undefined') text = '';
		if (typeof tag === 'undefined') tag = '';
		var filter = {
			query: {
				user_id: $('#user_id').html(),
				title: title,
				text: text,
				tag: tag,
			},
			offset: 0,
			limit: 10
		};
		if (old_filter &&
			filter.query.title == old_filter.query.title &&
			filter.query.text == old_filter.query.text &&
			filter.query.tag == old_filter.query.tag &&
			filter.offset == old_filter.offset &&
			filter.limit == old_filter.limit) {
			return;
		}
		old_filter = filter;
		$('#container').empty();
		document.querySelector('#loading').classList.remove("hidden");
		socket.emit('fetch memo', JSON.stringify(filter));
	}

	$('.submit-button').click(function(){
		title = $("#search-form [name=title]").val();
		text = $("#search-form [name=text]").val();
		tag = $("#search-form [name=tag]").val();
		send_to_websocket(title, text, tag);
		closedlg($('#searchdlg'));
	});

	$('.jsCumulus').click(function(){
		send_to_websocket('', '', $(this).text());
		closedlg($('#cumulusdlg'));
	});

	$('.tag').click(function(){
		send_to_websocket('', '', $(this).children('i').text());
		closedlg($('#tagdlg'));
	});

	$(window).bind('scroll', function(e) {
		if($(this).scrollTop() + $(this).height() >= $(document).height()) {
			if (old_filter == null) {
				return;
			}
			offset = old_filter['offset'];
			limit = old_filter['limit'];
			old_filter['offset'] = limit;
			old_filter['limit'] = limit + 10;
			socket.emit('fetch memo', JSON.stringify(old_filter));
		}
	});

	//
	// UI event (Ajax)
	//
	var update_flag = false;
	var update_date = null;
	var update_memo = null;

	function closedlg(jquery_obj) {
		var dialog = jquery_obj;
		$(dialog).fadeOut(200);
		$('#over').fadeOut(200);
		$('#over').remove();
	};

	function clear_addentry() {
		$('.memo-input-title').val("");
		$('.memo-input-text').val("");
		$('.memo-input-tag').val("");
		update_flag = false;
		update_date = null;
	}
	clear_addentry();

	$('.commit-button').click( function() {
		var url = '/add';	// {{{
		var memo = {
			title : $('input[name="title"]').val(),
			text : $('.memo-input-text').val(),
			tag : $('input[name="tag"]').val(),
			paser: document.querySelector(".paser-active").innerHTML,
			publish: ($("#publish").attr("checked") === undefined)? 0 : 1
		};
		if (!memo.title || !memo.text) {
			alertFlash("Nothing input...", 'warning');
			return false;
		}
		// Update check
		if (update_flag) {
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
				display_memo($.parseJSON(json_memo), true);
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
				closedlg($('#entrydlg'));
				alertFlash(msg, 'information');
			},
			error: function(){
				alertFlash('Connection Error: Please retry.', 'error');
			}
		});

	});	// }}}

	//
	// Display memo
	// 1. Get json_data, it include one memo(title, text, tag) from database.
	// 2. Create DOM
	// 3. Append this DOM
	// 4. Set attribute(edit, delete)
	//
	function display_memo(data, prepend){
		if (typeof prepend === 'undefined') prepend = false; 
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
				            "<var class='memo-tag'>"  + spchar_encoder(memo.tag) + "</var>";
		var h1_c =   "</div>";
		var a =         '<a class="memo-delete">delete</a>' + 
				        '<a class="memo-edit">edit</a><div class="memo-inner">';
		if (memo.paser == "Markdown") {
			memo.text = marked(memo.basetext);
		}
		var pub = "";
		if (memo.publish == 1) {
			pub = "<var class='memo-publish'><span class='fa fa-check-square'></span>Publish</var>"
		}
		var text =      memo.text; // html
		var meta =      '</div><p class="memo-title-only" style="display: none;">' + spchar_encoder(memo.title) + '</p>' +
				        '<p class="memo-text" style="display: none;">' + spchar_encoder(memo.basetext) + '</p>' + 
				        '<p class="memo-id" style="display: none;">' + memo.id + '</p>' +
						'<p class="memo-paser" style="display: none;">' + memo.paser + '</p>' +
						'<p class="memo-publish" style="display: none;">' + memo.publish + '</p>';
		var div_end= '</div>';

		return div + h1 + pub + h1_c + a + text + meta + div_end;
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
			var paser = $(this).closest('div').find('.memo-paser').text();
			var publish = $(this).closest('div').find('.memo-publish').text();
			$('.memo-input-title').val(spchar_decoder(title));
			$('.memo-input-text').val(spchar_decoder(text));
			$('.memo-input-tag').val(spchar_decoder(tag));
			if (paser == "Markdown") {
				document.querySelector('#mkd').classList.add('paser-active');
				document.querySelector('#mkd').classList.remove('paser-inactive');
				document.querySelector('#rest').classList.add('paser-inactive');
				document.querySelector('#rest').classList.remove('paser-active');
			} else {
				document.querySelector('#rest').classList.add('paser-active');
				document.querySelector('#rest').classList.remove('paser-inactive');
				document.querySelector('#mkd').classList.add('paser-inactive');
				document.querySelector('#mkd').classList.remove('paser-active');
			}
			if(publish == 0) {
				$('.publish-btn').css("background", "none");
				$('.publish-btn label').css("color", "#000");
				$('#publish').attr('checked', false);
			}else{
				$('.publish-btn').css("background", "#ff8800");
				$('.publish-btn label').css("color", "#FFF");
				$('#publish').attr('checked', true);
			}
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
	$('#publish-label').click(function(){
		var val = $('#publish').attr('checked');
		if(val == undefined) {
			$('.publish-btn').css("background", "#ff8800");
			$('.publish-btn label').css("color", "#FFF");
			$('#publish').attr('checked', true);
		}else{
			$('.publish-btn').css("background", "none");
			$('.publish-btn label').css("color", "#000");
			$('#publish').attr('checked', false);
		}
	});
	$('.paser-label').click(function(){
		var checked_id = $(this).attr("id");
		if (checked_id == "rest") {
			document.querySelector('#rest').classList.add('paser-active');
			document.querySelector('#rest').classList.remove('paser-inactive');
			document.querySelector('#mkd').classList.add('paser-inactive');
			document.querySelector('#mkd').classList.remove('paser-active');
		} else {
			document.querySelector('#mkd').classList.add('paser-active');
			document.querySelector('#mkd').classList.remove('paser-inactive');
			document.querySelector('#rest').classList.add('paser-inactive');
			document.querySelector('#rest').classList.remove('paser-active');
		}
	});

	//
	// UI event(Menu toggle)
	//
	var Toggle = document.querySelector("#toggle");
	Toggle.onclick = function() {
		Toggle.classList.toggle("on");
	};

	//
	// UI event(Book dialog: incremental search)
	//
	var title_list = [];

	// Initialize select
	document.querySelector("#tag-select").selectedIndex = 0;

	function cache_title_list() {
		var list = []
		var children = document.querySelector('#title-list').children;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var dic = {
				"title": child.querySelector('div').innerHTML,
				"tag": child.querySelector('span').innerHTML,
				"date": child.querySelector('i').innerHTML
			};
			list.push(dic);
		}
		return list;
	};

	function query_title_list(tag) {
		var list = document.querySelector('#title-list');
		if (list.length != 0) {
			list.innerHTML = '';
		}
		var l = title_list.filter(function(element) {
			return element.tag == tag;
		});
		for (var i = 0; i < l.length; i++) {
			var li = document.createElement("li");
			var date = document.createElement('i');
			date.innerHTML = l[i].date;
			var tag = document.createElement('span');
			tag.innerHTML = l[i].tag;
			var title = document.createElement('div');
			title.innerHTML = l[i].title;
			li.appendChild(date);
			li.appendChild(tag);
			li.appendChild(title);
			list.appendChild(li);
		}
	};

	document.querySelector("#tag-select").onchange = function() {
		if (title_list.length == 0) {
			title_list = cache_title_list();
		}
		query_title_list(this.options[this.selectedIndex].value);
	};
});
/* vim:set foldmethod=marker: */
