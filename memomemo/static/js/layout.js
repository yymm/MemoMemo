//
// Flash alert
//
function alertFlash(message, category){
	var prnt = document.createElement('div');
	var child = document.createElement('button');
	prnt.className = 'flash-alert';
	prnt.id = category === undefined ? 'important' : category;
	prnt.innerHTML = message;
	child.className = 'close-btn';
	child.textContent = 'x';
	child.onclick = function(){
		var closest_div = $(this).closest("div");
		closest_div.fadeOut('normal', function(){closest_div.remove();});
	};
	prnt.appendChild(child);
	var container = document.getElementById('alert-container');
	container.insertBefore(prnt, container.firstChild);
	setTimeout(function(){
		$('.flash-alert').fadeOut('normal', function(){
				$(this).remove();
		});
	}, 5000);
};
