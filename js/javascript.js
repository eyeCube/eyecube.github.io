
function printPage() {
	window.print();
}
function toggleOneTwoPage() {
	var element = document.getElementById("two-page-version-only");
	if (element.style.display === "none")
	{ 
		element.style.display = "block"; //
		//fadeInEffect();
	}
	else
	{ 
		element.style.display = "none"; //
		//fadeOutEffect();
	}
}

function fadeOutEffect() {
    var element = document.getElementById("two-page-version-only");
    var fadeEffect = setInterval(function () {
		if (!element.style.opacity) { element.style.opacity = 1; }
		if (element.style.opacity > 0)
		{ element.style.opacity -= 0.05; } 
		else
		{
            clearInterval(fadeEffect);
			element.style.display = "none";
        }
    }, 20);
}
function fadeInEffect() {
    var element = document.getElementById("two-page-version-only");
	element.style.display = "block";
    var fadeEffect = setInterval(function () {
		console.log(element.style.opacity);
		if (element.style.opacity < 1)
		{ 
			element.style.opacity += 0.05;
			console.log("hi");
		}
		else
		{ clearInterval(fadeEffect); }
    }, 20);
}

