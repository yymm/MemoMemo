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
		if (global_lock_check_status === false)
		{
			hide_addentry();
		}
	});
	clear_addentry();
});
