
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
