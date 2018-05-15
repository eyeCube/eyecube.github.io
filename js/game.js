/*
 * 
 */

"use strict";


var Screen = {
    height:25,
    width:80,
}

var View = {
    height: 25,
    width: 80,
}

var Room = {
    height:1000,
    width:80,
}

var Names = {
    'b': "bubician",
}

var Hud = {
    element: null,
    init: function () {
        var hud = document.createElement("p");
        this.element = hud;
        hud.appendChild(document.createTextNode(this.getText()));
        document.getElementById("hud").appendChild(hud);
    },
    getText: function () {
        var text = "";
        text += pc.name + " ";
        text += "O2: " + pc.o2 + " ";
        text += "Pressure: " + pc.y;
        return text;
    },
    update: function () {
        this.element.innerHTML = this.getText();
    }
}


var Game = {
    display: null,

    init: function () {
        this.display = new ROT.Display({
            width: Screen.width,
            height: Screen.height,
            fontSize: 24,
            bg: "#000000",
            fontFamily: "monospace",
        });
        document.body.appendChild(this.display.getContainer());
        Hud.init();

        this._generateMap();
        this._drawMap();
    },
}

Game.map = {};
Game._generateMap = function () {
    var n = 0;
    for (var i = 0; i < Room.height; i++) {
        for (var j = 0; j < Room.width; j++) {
            this.map[j + ',' + i] = String.fromCharCode(183);
            n += 1;
        }
    }
}
Game._drawMap = function () {
    for (var i = 0; i < View.height; i++) {
        for (var j = 0; j < View.width; j++) {
            var char = this.map[j + "," + i];
            this.display.draw(j, i, char);
        }
    }
}

var Thing = function (char, x, y) {
    this.char = char;
    this.x = x;
    this.y = y;
    this.name = Names[char];
    this.o2 = 100;
}
Thing.prototype.move = function(x, y){
    this.x = x;
    this.y = y;
    Hud.update();
}

var commands = {
    'e': ROT.VK_L,
    'ne': ROT.VK_U,
    'n': ROT.VK_K,
    'nw': ROT.VK_Y,
    'w': ROT.VK_H,
    'sw': ROT.VK_B,
    's': ROT.VK_J,
    'se': ROT.VK_N,
}

window.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }

    var action;
    var code = event.keyCode;
    var vk = "?"; /* find the corresponding constant */
    for (var name in ROT) {
        if (ROT[name] == code && name.indexOf("VK_") == 0) { vk = name; }
    }
    
    for (var act in commands) {
        if (ROT[vk] == commands[act]) {
            action = act;
        }
    }

    console.log(action);

    if (action) {
        Player.act(action);
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
}, true);

var Player = {
    act: function (action) {
        switch (action) {
            case 'e':
                pc.move(pc.x + 1, pc.y);
                break;
            case 'ne':
                pc.move(pc.x + 1, pc.y - 1);
                break;
            case 'n':
                pc.move(pc.x, pc.y - 1);
                break;
            case 'nw':
                pc.move(pc.x - 1, pc.y - 1);
                break;
            case 'w':
                pc.move(pc.x - 1, pc.y);
                break;
            case 'sw':
                pc.move(pc.x - 1, pc.y + 1);
                break;
            case 's':
                pc.move(pc.x, pc.y + 1);
                break;
            case 'se':
                pc.move(pc.x + 1, pc.y + 1);
                break;
        }
    }
}

var pc = new Thing('@', 50, 15);
pc.name = "Jaek";



Game.init();


