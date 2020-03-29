
function fadeOutEffect() {
    var fadeTarget = document.getElementById("fade");
    var fadeEffect = setInterval(function () {
        if (!fadeTarget.style.opacity) {
            fadeTarget.style.opacity = 1;
        }
        if (fadeTarget.style.opacity > 0) {
            fadeTarget.style.opacity -= 0.1;
        } else {
            clearInterval(fadeEffect);
        }
    }, 200);
}

document.getElementById("fade").addEventListener('click', fadeOutEffect);
