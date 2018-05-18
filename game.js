/*
 *  game
 *  HUD
 */

"use strict";


// HUD (HTML)
var Hud = {
    element: null,
}
Hud.init = function () {
    this.element = document.getElementById("hud");
}
Hud.update = function () {
    console.log("hud update");
    this.element.innerHTML = this._getText();
}
Hud._getText = function () {
    return `[${pc.name}] HP:${pc.stats.hp}(${pc.stats.hpcap})
Spd:${pc.stats.speed} Pow:${pc.stats.power} Arm:${pc.stats.armor}
O<sub>2</sub>:${Math.floor(pc.stats.o2 / pc.stats.o2cap * 100)}%
D:${ Math.max(0, pc.y - 1) }m`;
}


// game
var Game = {
    map: {},
    stuff: {},
    fontSize: 17,
    bgColor: SEAGREEN,
    display: null,
    scheduler: null,
    engine: null,
    turn: 0,


    screen: {
        height: 25,
        width: 80,
    },
    view: {
        height: 25,
        width: 80,
        x: 0,
        y: 0,
    },
    room: {
        height: 1000,
        width: 80,
    },
}
Game.init = function () {
    this.display = new ROT.Display({
        width: this.screen.width,
        height: this.screen.height,
        fontSize: this.fontSize,
        bg: this.bgColor,
        fontFamily: "monospace",
    });
    let elem = document.getElementById("game");
    elem.appendChild(this.display.getContainer());

    this._generateMap();
    this.scheduler = new ROT.Scheduler.Action(); // actor queue
    this.engine = new ROT.Engine(this.scheduler); // controls scheduler
    this.addActorLoop(new this.turn_iterator());
}
// call to begin running actor's "act" functions in order of the queue
Game.start = function () {
    this.engine.start();
}
Game.update = function () {
    // draw what's in the view
    for (let x = 0; x < this.view.width; x++) {
        for (let y = 0; y < this.view.height; y++) {
            let xmap = x + this.view.x;
            let ymap = y + this.view.y;
            this.draw(xmap, ymap);
        }
    }
}
Game.addActorLoop = function (actor) { this.scheduler.add(actor, true); }
Game.addEventActor = function (actor) { this.scheduler.add(actor, false); }
Game.removeActor = function (actor) { this.scheduler.remove(actor); }
// queue an actor in the scheduler
// cost is the amount of time until the actor's next turn
Game.queueActor = function (cost) {
    this.scheduler.setDuration(cost);
}
// draw a cell
Game.draw = function (x, y, char, fgcol, bgcol) {
    let xx = x - this.view.x;
    let yy = y - this.view.y;

    if (char != undefined) {
        this.display.draw(xx, yy, char, fgcol, bgcol);
    }
    else {
        let thing = Game.thingat(x, y);
        if (thing) { Game.draw_obj(thing); }
        else { Game.draw_obj(Game.cell(x, y)); }
    }
}
// draw an object
Game.draw_obj = function (obj) {
    let xx = obj.x - this.view.x;
    let yy = obj.y - this.view.y;
    
    this.display.draw(xx, yy, obj.char, obj.fgcol, obj.bgcol);
}
Game.cell = function (x, y) {
    let data = this._cellData[this.map[x + ',' + y]];
    return {
        "x": x, "y": y,
        "char": data.char,
        "fgcol": data.fgcol,
        "bgcol": data.bgcol
    }
}
Game.thingat = function (x, y) {
    return this.stuff[x + ',' + y];
}
Game.monat = function (x, y) {
    let mon = this.stuff[x + ',' + y];
    if (mon && mon.isActor) { return mon; }
    else { return null; }
}
Game.addToGrid = function (obj) {
    this.stuff[obj.x + ',' + obj.y] = obj;
}
Game.removeFromGrid = function (x, y) {
    this.stuff[x + ',' + y] = null;
}
// perform function each turn
Game.turn_iterator = function () {
    this.act = function () {
        console.log("turn iterator act");
        Game.queueActor(TURN_LENGTH);

        Game.turn++;

        // oxygen
        if (pc.y > SURFY) {
            let val = 1 + pc.y / 100;
            pc.stats.o2 -= val;
            console.log(pc.stats.o2);
        }
        else {
            pc.stats.o2 = pc.stats.o2cap;
        }

        // iterate things
        for (let id in Things.dict) {
            let obj = Things.dict[id];

            // gravas
            if (Game.turn % 2 == 0) {
                if (obj.sinks) {
                    obj.port(obj.x, obj.y + 1);
                }
                else if (obj.floats && obj.y > SURFY) {
                    obj.port(obj.x, obj.y - 1);
                }
            }

            // 
        }
    };
}
Game._generateMap = function () {
    for (let i = 0; i < this.room.height; i++) {
        for (let j = 0; j < this.room.width; j++) {
            this.map[j + ',' + i] = "water";
            this.stuff[j + ',' + i] = null;
        }
    }
    for (let j = 0; j < this.room.width; j++) {
        this.map[j + ',' + SURFY] = "surf";
    }
    for (let j = 0; j < this.room.width; j++) {
        this.map[j + ',' + (SURFY - 1)] = "sky";
    }
}
Game._cellData = {
    "water": {
        "char": String.fromCharCode(183),
        "fgcol": NEUTRAL,
        "bgcol": SEAGREEN,
    },
    "surf": {
        "char": '~',
        "fgcol": WHITE,
        "bgcol": SEAGREEN,
    },
    "sky": {
        "char": ' ',
        "fgcol": WHITE,
        "bgcol": SKYBLUE,
    },
}









/*
 *
Game._drawMap = function () {
    for (let i = 0; i < this.view.height; i++) {
        for (var j = 0; j < this.view.width; j++) {
            let x = j + this.view.x;
            let y = i + this.view.y;
            this.draw(x, y);
        }
    }
}
*/