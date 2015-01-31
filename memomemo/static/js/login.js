///////////// LOGIN ////////////////

$("#loginbox").mouseenter( function () {
   $("#loginbox").addClass("showbox");
});

$("#loginbox").mouseleave( function () {
  
  if (!$("#logintext,#loginpass").is(":focus")) {
   $("#loginbox").removeClass("showbox");
  }
  
});

$("#loginpass").focusout( function () {
   $("#loginbox").removeClass("showbox showpass");
});

$("#logintext, #loginpass").focusin( function () {
   $("#loginbox").addClass("showbox showpass");
});

///////////// SIGNUP ////////////////

$("#box").mouseenter( function () {
   $("#box").addClass("showbox");
});

$("#box").mouseleave( function () {
  
  if (!$("#signuptext, #signuppass").is(":focus")) {
   $("#box").removeClass("showbox");
   }
  
});

$("#signuppass").focusout( function () {
   $("#box").removeClass("showbox showpass");
});


$("#signuptext, #signuppass").focusin( function () {
   $("#box").addClass("showbox showpass");
});

///////////// OAUTH ////////////////

$("#oauthbox").mouseenter( function () {
   $("#oauthbox").addClass("showoauth");
});

$("#oauthbox").mouseleave( function () {
   $("#oauthbox").removeClass("showoauth");
});

$(document).ready(function(){

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
});
