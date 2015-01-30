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
			$(dialog).fadeIn(200);
			$('body').prepend('<div id="over">');
			$('#over').fadeIn(200);
			return false;
		})
	});
	
	$(document).ready(function(){
		$('a.closedlg').click(function(){
			var dialog = $(this).attr('href');
			$(dialog).fadeOut(200);
			$('#over').fadeOut(200);
			$('#over').remove();
			return false;
		})
	});

	//
	// SocketIO event
	//
	namespace = '/public';
	var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);

	socket.on('connect', function() {
		var path = location.pathname.substr(1);
		console.log(path);
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
		memo.fadeIn(500);
	}

	function create_dom_from_memo(memo)
	{ // {{{
		var div =    "<div class='memo-div' style='display: none;'>";
		var h1 =        "<div class='headline memo-title'>" + spchar_encoder(memo.title) +
				            "<var class='memo-date'>" + spchar_encoder(memo.date_time) + "</var>" +
				            "<var class='memo-tag'>"  + spchar_encoder(memo.tag) + "</var>" +
				        "</div>";
		if (memo.paser == "Markdown") {
			memo.text = marked(memo.basetext);
		}
		var text =      memo.text; // html

		var div_end= '</div>';

		return div + h1 + text + div_end;
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
});
/* vim:set foldmethod=marker: */
