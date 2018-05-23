/*
 *  game
 *  HUD
 */

"use strict";


// HUD (HTML)
var Hud = {
    element: null,
};
Hud.init = function () {
    this.element = document.getElementById("hud");
    this.element.style.width = (Game.screen.width * TILEW).toString() + "px";
};
Hud.update = function () {
    this.element.innerHTML = this._getText();
    let el_o2 = document.getElementById("hud_o2");
    let el_hp = document.getElementById("hud_hp");
    if (pc.stats.hp <= pc.stats.hpcap / 2) { el_hp.style.color = YELLOW; }
    if (pc.stats.hp <= pc.stats.hpcap / 4) { el_hp.style.color = RED; }
    if (pc.stats.o2 < pc.stats.o2cap * 0.21) { el_o2.style.color = RED; }
    else if (pc.stats.o2 < pc.stats.o2cap * 0.61) { el_o2.style.color = YELLOW; }
};
Hud._getText = function () {
    return `[${pc.name}] <span id="hud_hp">HP:${pc.stats.hp}(${pc.stats.hpcap})</span>
Spd:${pc.stats.speed} Pow:${pc.stats.power} Arm:${pc.stats.armor}
<span id="hud_o2">O<sub>2</sub>:${Math.floor(pc.stats.o2 / pc.stats.o2cap * 100)}%</span>
<span id="hud_depth">P:${ Math.max(0, pc.y - SURFY)}m</span>
T:${Game.time()}`;
};


// game
var Game = {
    // grids
    map: {}, // terrain
    stuff: {}, // things
    floraGrid: {}, // decorations
    tilesSeen: {}, // tiles player can see on current turn
    //
    logElem: document.getElementById("log"),
    msgHistory: [],
    fontSize: 17,
    bgColor: SEAGREEN,
    display: null,
    scheduler: null,
    engine: null,
    chrons: 0, // chron: smallest unit of time which can pass.
    turn: 0, // turn: average time it takes an average joe to do an average task.
    //
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
};
Game.init = function () {
    var tileset = document.createElement("img");
    tileset.src = TILESET_SOURCE;
    let w = TILEW;
    let h = TILEH;
    let charmap = {};
    let mp;
    for (let i in ASCIICHARMAP) { // get charmap
        mp = ASCIICHARMAP[i];
        charmap[i] = [mp[0] * w, mp[1] * h]; // get proper pixel coords for each tile
    }
    // data for the ROT.js display object
    var dispSettings = {
        width: this.screen.width,
        height: this.screen.height,
        //tileColorize: true,
        bg: "transparent",
        layout: "tile",
        tileWidth: w,
        tileHeight: h,
        tileSet: tileset,
        tileMap: charmap,
    };
    this.display = new ROT.Display(dispSettings);
    let elem = document.getElementById("game");
    elem.appendChild(this.display.getContainer());
    this.logElem.style.width = (this.screen.width * w).toString() + "px";
    this.logElem.style.height = "90px";

    this._generateMap();
    this._generateMap_town();
    this.scheduler = new ROT.Scheduler.Action(); // actor queue
    this.engine = new ROT.Engine(this.scheduler); // controls scheduler
    this.addActor(new this.turnIterator(), true);
    this.addActor(new this.chronIterator(), true);
};

// call to begin running actor's "act" functions in order of the queue
Game.start = function () { this.engine.start(); };
Game.setTile = function (x, y, strng) { Game.map[x + "," + y] = strng; };
Game.bars = function (depth) { return depth / 10 + 1; };
Game.addActor = function (actor, repeat = false) { this.scheduler.add(actor, repeat); };
Game.removeActor = function (actor) { this.scheduler.remove(actor); };
Game.addToGrid = function (obj) { this.stuff[obj.x + "," + obj.y] = obj; };
Game.removeFromGrid = function (obj) { this.stuff[obj.x + "," + obj.y] = null; };
Game.addFlora = function (obj) { this.floraGrid[obj.x + "," + obj.y] = obj; };
Game.removeFlora = function (obj) { this.floraGrid[obj.x + "," + obj.y] = null; };
Game.tileat = function (x, y) { return this.map[x + "," + y]; };
Game.wallat = function (x, y) { return this._terrainData[this.map[x + "," + y]].solid; };
Game.florat = function (x, y) { return this.floraGrid[x + "," + y]; };
Game.thingat = function (x, y) { return this.stuff[x + "," + y]; };
Game.monat = function (x, y) {
    let mon = this.stuff[x + "," + y];
    if (mon && mon.isActor) { return mon; }
    else { return null; }
};
Game.time = function () {
    let strng = "";
    let spd = AVG_SPEED;
    let t = this.chrons / spd; // total seconds
    let s = (Math.floor(t % 60)).toString();
    if (s.length == 1) { s = "0" + s }
    let m = (Math.floor((t / 60) % 60)).toString();
    if (m.length == 1) { m = "0" + m }
    let h = (Math.floor((t / (60 * 60)) % 24)).toString();
    if (h.length == 1) { h = "0" + h }
    strng += `${h}:${m}:${s}`;
    return strng;
};

Game.update = function () {
    // draw what"s in the view
    for (let x = 0; x < this.view.width; x++) {
        for (let y = 0; y < this.view.height; y++) {
            let xmap = x + this.view.x;
            let ymap = y + this.view.y;
            if (this.tilesSeen[x + "," + y]) {
                this.draw(xmap, ymap);
            }
            else this.draw(xmap, ymap, " ", "transparent", DEEP);
        }
    }
    /*let keys = Player.commands_keys;
    let help = `North ${keys['n']}
East ${keys['e']}
South ${ keys['s']}
West ${ keys['w']}`;
    Game.dbox(0, 0, 50, Game.screen.height, help ); //Game.get_help();*/
};

// get an object containing info about a cell
Game.cell = function (x, y) {
    let data;
    if (x < 0 || x >= this.room.width || y < 0 || y >= this.room.height) {
        data = this._terrainData["rock"];
    } else {
        data = this._terrainData[this.map[x + "," + y]];
    }
    return {
        "x": x, "y": y, char: data.char, fgcol: data.fgcol,
        bgcol: data.bgcol, opaque: data.opaque, solid: data.solid,
        swim: data.swim, breathe: data.breathe, climb: data.climb,
    }
};

// queue an actor in the scheduler
// cost is the amount of time until the actor's next turn
Game.queueActor = function (cost) {
    this.scheduler.setDuration(cost);
};

// draw a cell
Game.draw = function (x, y, char, fgcol, bgcol) {
    let xx = x - this.view.x;
    let yy = y - this.view.y;

    if (char != undefined) {
        this.display.draw(xx, yy, char, fgcol, bgcol);
    }
    else {
        let thing = Game.thingat(x, y);
        if (!thing) thing = Game.florat(x, y);
        if (thing) { Game.draw_obj(thing); }
        else { Game.draw_obj(Game.cell(x, y)); }
    }
};
// draw an object
Game.draw_obj = function (obj) {
    let xx = obj.x - this.view.x;
    let yy = obj.y - this.view.y;

    this.display.draw(xx, yy, obj.char, obj.fgcol, obj.bgcol);
};

// messages //
Game.msg = function (entry) {
    //  stack multiple repeated messages
    let prev = this.msgHistory[this.msgHistory.length - 1];
    let prevtext = prev[1];
    if (prevtext == entry) {
        let n = prev[0] + 1;
        this.msgHistory[this.msgHistory.length - 1] = [n, entry];
        //  put text into HTML element
        this.logElem.innerText = "";
        for (let i of this.msgHistory) {
            let n = i[0];
            if (n > 1) { this.logElem.innerText += `(x${n})`; }
            this.logElem.innerText += " " + i[1] + "\n";
        }
    } else { // non-repeated, normal entry
        this.msgHistory.push([1, entry]);
        this.logElem.innerText += entry + "\n";
    }
    this.logElem.scrollTo(0, this.logElem.scrollHeight); // scroll to show msg
};
// before Game.msg() is called, must seed the history to prevent key error.
Game.msgSeed = function (entry) {
    this.msgHistory = [[1, entry]];
    this.logElem.innerText = entry + "\n";
};
// dialogue box
Game.dbox = function (x, y, w, h, txt) {
    this.display.drawText(x, y, txt, w);
};

// perform function each "chron" (the smallest unit of in-game time)
Game.chronIterator = function () {
    this.act = function () {
        Game.chrons++;
    }
};

// perform function each turn
Game.turnIterator = function () {
    let that = Game;
    this.act = function () {
        that.queueActor(TURN_LENGTH);

        that.turn++;

        if (that.view.y <= SURFY) {
            let tern, key;
            for (let j = 0; j < that.room.width; j++) {
                if (Math.random() >
                    Math.max(0, Math.sin(j / 10 + that.turn / 3)) * 0.4 + 0.05) {
                    continue;
                }
                key = j + "," + SURFY;
                if (that.map[key] == "surf") {
                    tern = "surfrough"
                } else tern = "surf";
                that.map[key] = tern;
            }
        }

        // iterate things
        for (let id in Things.dict) {
            let obj = Things.dict[id];

            // gravas
            if (that.turn % 2 == 0) {
                if (obj.on(SINKS)) {
                    obj.port(obj.x, obj.y + 1);
                }
                else if (obj.on(FLOATS) && obj.y > SURFY) {
                    obj.port(obj.x, obj.y - 1);
                }
            }

            // O2
            if (obj.on(NEEDSAIR)) {
                let cell = that.cell(obj.x, obj.y);
                if (cell.breathe) { // inhale
                    obj.stats.o2 = obj.stats.o2cap;
                }
                else { // hold breath
                    let lossRate = 1 + obj.y / DEPTHO2DIV;
                    obj.stats.o2 -= lossRate;
                    if (obj.stats.o2 <= 0) { // drown
                        obj.kill("drown");
                    }
                }
            }

            // bloody mess
            if (obj.on(BLEEDING)) {
                obj.hurt(1);
            }

            // 
        }
    };
};

// private functions //

Game._generateMap = function () {
    let choice;
    for (let i = SURFY; i < this.room.height; i++) {
        for (let j = 0; j < this.room.width; j++) {
            this.setTile(j, i, "water");
            this.stuff[j + "," + i] = null;
            this.floraGrid[j + "," + i] = null;
            this.tilesSeen[j + "," + i] = false;
        }
    }
    for (let j = 0; j < this.room.width; j++) {
        if (Math.random() > 0.5) { choice = "surf" } else choice = "surfrough";
        this.setTile(j, SURFY, choice);
    }
    for (let i = 0; i < SURFY; i++) {
        for (let j = 0; j < this.room.width; j++) {
            this.setTile(j, i, "sky");
        }
    }
    this.setTile(20, 14, "rock");
    this.setTile(20, 15, "rock");
    this.setTile(20, 16, "rock");
    this.setTile(20, 17, "rock");
    this.setTile(20, 18, "rock");
    this.setTile(20, 19, "rock");
    this.setTile(20, 20, "rock");

    this.setTile(12, 14, "rock");
    this.setTile(12, 15, "rock");
    this.setTile(12, 16, "rock");
    this.setTile(12, 17, "rock");
    this.setTile(12, 18, "rock");
    this.setTile(12, 19, "rock");
    this.setTile(12, 20, "rock");

    this.setTile(13, 14, "rock");
    this.setTile(14, 14, "rock");
    this.setTile(15, 14, "rock");
    this.setTile(16, 14, "rock");
    this.setTile(17, 14, "rock");
    this.setTile(18, 14, "rock");
    this.setTile(19, 14, "rock");

    this.setTile(13, 15, "air");
    this.setTile(14, 15, "air");
    this.setTile(15, 15, "air");
    this.setTile(16, 15, "air");
    this.setTile(17, 15, "air");
    this.setTile(18, 15, "air");
    this.setTile(19, 15, "air");

    this.setTile(13, 16, "air");
    this.setTile(13, 17, "air");
    this.setTile(13, 18, "air");
    this.setTile(13, 19, "air");
    this.setTile(14, 16, "air");
    this.setTile(14, 17, "air");
    this.setTile(14, 18, "air");
    this.setTile(14, 19, "air");
    this.setTile(15, 16, "air");
    this.setTile(15, 17, "air");
    this.setTile(15, 18, "air");
    this.setTile(15, 19, "air");
    this.setTile(16, 16, "air");
    this.setTile(16, 17, "air");
    this.setTile(16, 18, "rock");
    this.setTile(16, 19, "air");
    this.setTile(17, 16, "air");
    this.setTile(17, 17, "air");
    this.setTile(17, 18, "rock");
    this.setTile(17, 19, "air");
    this.setTile(18, 16, "air");
    this.setTile(18, 17, "air");
    this.setTile(18, 18, "rock");
    this.setTile(18, 19, "air");
    this.setTile(19, 16, "air");
    this.setTile(19, 17, "air");
    this.setTile(19, 18, "rock");
    this.setTile(19, 19, "air");

    this.setTile(13, 16, "ladder");
    this.setTile(13, 17, "ladder");
    this.setTile(13, 18, "ladder");
    this.setTile(13, 19, "ladder");

    this.setTile(17, 17, "rock");
};

Game._generateMap_town = function () {
    let listener = function () {
        LOG(this.responseText);
    }
    let oReq = new XMLHttpRequest();
    oReq.addEventListener("load", listener);
    oReq.open("GET", "/../levels/town.txt");
};


Game._terrainData = {
    "air": { // underwater air pocket
        char: " ", fgcol: "transparent", bgcol: BLACK,
        opaque: false, solid: false, swim: false, climb: false, breathe: true,
    },
    "sky": { // air above surface
        char: " ", fgcol: "transparent", bgcol: SKYBLUE,
        opaque: false, solid: false, swim: false, climb: false, breathe: true,
    },
    "water": {
        char: "smalldot", fgcol: "transparent", bgcol: SEAGREEN,
        opaque: false, solid: false, swim: true, climb: false, breathe: false,
    },
    "surf": {
        char: "~", fgcol: "transparent", bgcol: SEAFOAM,
        opaque: false, solid: false, swim: true, climb: false, breathe: true,
    },
    "surfrough": {
        char: "~~", fgcol: "transparent", bgcol: SEAFOAM,
        opaque: false, solid: false, swim: true, climb: false, breathe: true,
    },
    "rock": {
        char: "noise3", fgcol: "transparent", bgcol: BROWN,
        opaque: true, solid: true, swim: false, climb: false, breathe: false,
    },
    "ladder": {
        char: "#", fgcol: "transparent", bgcol: BLACK,
        opaque: false, solid: false, swim: false, climb: true, breathe: true,
    },
};

// callback functions

Game._callbackFxn_FOVnormal = function (x, y) {
    return !Game.cell(x, y).opaque;
};









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

// you only get accurate depth reading when in water.
// this could be used for pressure as well
Game.get_depthReading = function (obj) {
    if (this.cell(obj.x, obj.y).swim == true) { return obj.y; }
    else { return 0; }
}

STACK SAME MESSAGES IN A ROW INTO ONE MESSAGE WITH QUANTITY IDENTIFIER ON IT.
THIS BECAME MORE COMPLEX THAN I THOUGHT. MAY RETURN LATER.
    let lis = this.logElem.innerText.split('\n');
    let prevLine = lis[lis.length - 1];
    let pos = prevLine.search(')');
    let prevStr;
    if (pos !== -1) { prevStr = prevLine.slice(pos); }
    else prevStr = prevLine;
    if (prevStr == entry) {
        this.logElem.innerText = "";
        lis.pop();
        for (let i of lis) {
            this.logElem.innerText += i;
        }
        entry = "";
        this.logElem.innerText += entry;
    }
    THIS WOULD MAKE THINGS EASIER.
    msgHistory = [[1,"this message happened once"], [2,"this happened twice"],]
*/
