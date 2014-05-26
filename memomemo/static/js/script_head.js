// Run finished DOM loading 
$(function(){
	var global_lock_check_status;

	$('.particle-switch').click( function()
	{
		if (this.checked)
		{
			$('.draw').css('display', 'inline-block');
			$('#title-img').css('display', 'none');
		}
		else
		{
			$('.draw').css('display', 'none');
			$('#title-img').css('display', 'block');
			$('#title-img').css('text-align', 'center');
			$('#title-img').css('margin', '-0.7em');
		}
	});

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
		$('.addentry-div').css('width', '30em');
		$('.addentry-div').css('height', '28em');
		$('.addentry-div').css('padding', '0.8em');
		$('.addentry-div').css('z-index', '50');
		$('.addentry-div form').css('display', 'inline-block');
		$('.addentry-div form').css('width', '25em');
		$('.addentry-div form').css('height', '25em');
		$('.addentry-div img').css('display', 'none');
	};
	
	hide_addentry = function()
	{
		$('.addentry-div').css('width', '2em');
		$('.addentry-div').css('height', '2em');
		$('.addentry-div').css('padding', '0em');
		$('.addentry-div form').css('display', 'none');
		$('.addentry-div img').css('display', 'block');
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
});

// Run loading document
$(document).ready(function(){
	$('.click-here').click(function(){
		$('.title').slideToggle();
		var script_node = document.createElement('script');
		script_node.src = "static/js/partislide_title.js";
		document.body.appendChild(script_node);
	});
	clear_addentry();
	$('.particle-switch').attr('checked', false);
});
