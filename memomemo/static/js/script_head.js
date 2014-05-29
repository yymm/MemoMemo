// Run finished DOM loading 
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
		$('.addentry-div').css('width', '30em');
		$('.addentry-div').css('height', '28em');
		$('.addentry-div').css('padding', '0.8em');
		$('.addentry-div').css('z-index', '50');
		$('.addentry-div form').css('display', 'inline-block');
		$('.addentry-div form').css('width', '25em');
		$('.addentry-div form').css('height', '25em');
	};
	
	hide_addentry = function()
	{
		$('.addentry-div').css('width', '40px');
		$('.addentry-div').css('height', '40px');
		$('.addentry-div form').css('display', 'none');
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
