"use struct";

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
	$('a.showdlg').click(function(){
		var dialog = $(this).attr('href');
		if (dialog === "#entrydlg") {
			document.querySelector('#rest').classList.add('paser-active');
			document.querySelector('#rest').classList.remove('paser-inactive');
			document.querySelector('#mkd').classList.add('paser-inactive');
			document.querySelector('#mkd').classList.remove('paser-active');
            var content = get_publish(0);
            if (content) {
                $('.publish-status').html(content.inner);
                $("#publish-btn").removeClass();
                $("#publish-btn").addClass("pub-0");
                $("#publish-btn").css("background", content.color);
            }
			clear_addentry();
		}
		$(dialog).fadeIn(200);
		$('body').prepend('<div id="over">');
		$('#over').fadeIn(200);
		return false;
	});
	
	$('a.closedlg').click(function(){
		closedlg($(this).attr('href'));
		return false;
	});

	//
	// Ajax event
	//
	var old_filter = null;
	var connecting = false;

	//
	// UI event (Ajax)
	//
	function send_to_filter(title, text, tag, publish){
		if (typeof title === 'undefined') title = '';
		if (typeof text === 'undefined') text = '';
		if (typeof tag === 'undefined') tag = '';
		if (typeof publish === 'undefined') publish = 0;
		var filter = {
			query: {
				title: title,
				text: text,
				tag: tag,
                publish: publish
			},
			offset: 0,
			limit: 10
		};
		if (old_filter &&
			filter.query.title == old_filter.query.title &&
			filter.query.text == old_filter.query.text &&
			filter.query.tag == old_filter.query.tag &&
			filter.query.publish == old_filter.query.publish &&
			filter.offset == old_filter.offset &&
			filter.limit == old_filter.limit) {
			return;
		}
		old_filter = filter;
		$('#container').empty();
		document.querySelector('#loading').classList.remove("hidden");
		
        post_filter(filter);
	}

    // first load
    send_to_filter();

    function post_filter(f) {
		$.ajax({
			type: 'POST',
			url: '/filter',
			data: JSON.stringify(f),
			contentType: 'application/json',
			success: function(json_memos){
		        memos = $.parseJSON(json_memos);
		        if (memos.length != 10 || memos.length == 0) {
		        	old_filter = null;
		        	document.querySelector('#loading').classList.add("hidden");
		        }
		        for (i = 0; i < memos.length; ++i) {
		        	display_memo(memos[i]);
		        }
			},
			error: function(){
				alertFlash('Connection Error: Please retry.', 'error');
			}
		});
    }

	$('.submit-button').click(function(){
		title = $("#search-form [name=title]").val();
		text = $("#search-form [name=text]").val();
		tag = $("#search-form [name=tag]").val();
        var elem = $("#search-form [name=publish]");
        var publish = 0;
        if (elem) {
            publish = elem.val();
        }
		send_to_filter(title, text, tag, publish);
		closedlg($('#searchdlg'));
	});

	$('.jsCumulus').click(function(){
		send_to_filter('', '', $(this).text());
		closedlg($('#cumulusdlg'));
	});

	$('.tag').click(function(){
		send_to_filter('', '', $(this).children('i').text());
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
            post_filter(old_filter);
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
			publish: $("#publish-btn").attr("class").split("-")[1]
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
		var pub = "";
        if (memo.publish > 0) {
            var content = get_publish(memo.publish);
            if (content) {
                pub = "<span class='memo-publish " + content.fa + "' style='background: " + content.color + "'></span>";
            }
        }
		var h1 =        "<div class='headline memo-title'>" + pub + spchar_encoder(memo.title) +
				            "<var class='memo-date'>" + spchar_encoder(memo.date_time) + "</var>" +
				            "<var class='memo-tag'>"  + spchar_encoder(memo.tag) + "</var>";
		var h1_c =   "</div>";
		var a =         '<a class="memo-delete">delete</a>' + 
				        '<a class="memo-edit">edit</a><div class="memo-inner">';
		if (memo.paser == "Markdown") {
			memo.text = marked(memo.basetext);
		}
		var text =      memo.text; // html
		var meta =      '</div><p class="memo-title-only" style="display: none;">' + spchar_encoder(memo.title) + '</p>' +
				        '<p class="memo-text" style="display: none;">' + spchar_encoder(memo.basetext) + '</p>' + 
				        '<p class="memo-id" style="display: none;">' + memo.id + '</p>' +
						'<p class="memo-paser" style="display: none;">' + memo.paser + '</p>' +
						'<p class="memo-publish" style="display: none;">' + memo.publish + '</p>';
		var div_end= '</div>';

		return div + h1 + h1_c + a + text + meta + div_end;
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
            var content = get_publish(publish);
            if (content) {
                $('.publish-status').html(content.inner);
                $("#publish-btn").removeClass();
                $("#publish-btn").addClass("pub-" + publish);
                $("#publish-btn").css("background", content.color);
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
	$('.publish-item').click(function(){
        var content = get_publish($(this).get(0).className.split(" ")[1].split("-")[1]);
        if (content) {
            $('.publish-status').html(content.inner);
            $("#publish-btn").removeClass();
            $("#publish-btn").addClass("pub-" + content.id);
            $("#publish-btn").css("background", content.color);
        }
	});
    function get_publish(id) {
        var elem = $(".publish-" + id);
        if (elem.length == 0) {
            return null;
        }
        var color = elem.attr("style").split(" ")[1];
        var fa = elem.children("span").attr("class");
        var name = elem.text();
        var inner = elem.html();
        return {id: id, color: color, fa: fa, name: name, inner: inner};
    }
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
	document.querySelector("#search-publish-select").selectedIndex = 0;
	document.querySelector("#tag-select").selectedIndex = 0;
	document.querySelector("#publish-select").selectedIndex = 0;
	document.querySelector("#year-select").selectedIndex = 0;
	document.querySelector("#month-select").selectedIndex = 0;

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
            var publish = child.querySelector('p');
            if (publish) {
                dic["publish"] = publish.className;
            }
			list.push(dic);
		}
		return list;
	};

	function get_value_from_select(id) {
		var elem = document.querySelector(id);
        if (!elem) return null;
		return elem.options[elem.selectedIndex].value;
	};

	function filter_by_select(list) {
		var year = get_value_from_select("#year-select");
		// month
		if (year == "default") {
			document.querySelector("#month-select").disabled = true;
			document.querySelector("#month-select").selectedIndex = 0;
		} else {
			document.querySelector("#month-select").disabled = false;
		}
		var tag = get_value_from_select("#tag-select");
		var month = get_value_from_select("#month-select");
		var publish = get_value_from_select("#publish-select");
		var l = [];
		l = list.filter(function(elem) {
			if (tag == "default") {
				return true;
			}
			return (elem.tag.search(tag) >= 0)? 1 : 0;
		});
		l = l.filter(function(elem) {
			if (year == "default") {
				return true;
			}
			var y = elem.date.slice(0, 4);
			return y == year;
		});
		l = l.filter(function(elem) {
			if (month == "default") {
				return true;
			}
			var m = elem.date.slice(5, 7);
			return m == month;
		});
        if (publish) {
            l = l.filter(function(elem) {
	    		if (publish == "default") {
		    		return true;
			    }
                if (publish == "All") {
                    if (elem.publish) {
                        return true;
                    } else {
                        return false;
                    }
                }
                var pub = "fa fa-" + publish;
                return pub == elem.publish
            });
        }
		return l;
	};

	function query_title_list() {
		if (title_list.length == 0) {
			title_list = cache_title_list();
		}
		var list = document.querySelector('#title-list');
		if (list.length != 0) {
			list.innerHTML = '';
		}
		var l = filter_by_select(title_list.slice());
		for (var i = 0; i < l.length; i++) {
			var li = document.createElement("li");
			li.className = "memo-title";
			$(li).click(select_title);
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
		query_title_list();
	};
	document.querySelector("#year-select").onchange = function() {
		query_title_list();
	};
	document.querySelector("#month-select").onchange = function() {
		query_title_list();
	};
	document.querySelector("#publish-select").onchange = function() {
		query_title_list();
	};
	$(".memo-title").click(select_title);

	function select_title() {
		var title = $(this).children('div').text();
		var tag = $(this).children('span').text();
		send_to_filter(title, '', tag);
		closedlg($('#titledlg'));
	};

	//
	// UI event(change password)
	//

	$("#change-password").click(function(){
		var p = $("#change-password-input").val();
		$.ajax({
			type: 'POST',
			url: "/changepassword",
			data: JSON.stringify({"password": p}),
			contentType: 'application/json',
			success: function(json_memo){
				alertFlash("Success to change password.", 'information');
				$("#change-password-input").val('');
				Toggle.classList.toggle("on");
			},
			error: function(){
				alertFlash('Connection Error: Please retry.', 'error');
				Toggle.classList.toggle("on");
			}
		});

	});
});
/* vim:set foldmethod=marker: */
