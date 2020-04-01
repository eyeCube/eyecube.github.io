
var moreLess_busy = false;

function printPage() {
	var op = 1;
    var element = document.getElementById("two-page-version-only");
	element.style.opacity = op;
	window.print();
	if (element.style.display === "none")
	{ 
		op = 0;
		element.style.opacity = op;
	}
}

function toggleOneTwoPage() {
	var element = document.getElementById("two-page-version-only");
	if (moreLess_busy)
	{ return; }
	moreLess_busy = true;
	if (element.style.display === "none")
	{ 
		element.style.display = "block";
		fadeInEffect();
	}
	else
	{ 
		fadeOutEffect();
	}
}

function fadeOutEffect() {
	var op = 1;
    var element = document.getElementById("two-page-version-only");
	element.style.opacity = op;
    var fadeEffect = setInterval(function () {
		if (element.style.opacity > 0)
		{
			element.style.opacity = op;
			op -= 0.03;
		} 
		else
		{
            clearInterval(fadeEffect);
			element.style.display = "none";
			moreLess_busy = false;
        }
    }, 10);
}
function fadeInEffect() {
	var op = 0;
    var element = document.getElementById("two-page-version-only");
	element.style.display = "block";
    var fadeEffect = setInterval(function () {
		if (element.style.opacity < 1)
		{ 
			element.style.opacity = op;
			op += 0.03;
		}
		else
		{ 
			clearInterval(fadeEffect);
			moreLess_busy = false; 
		}
    }, 10);
}

