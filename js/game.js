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
    if (pc.stats.hp < pc.stats.hpcap * 0.51) {
        el_hp.style.color = BLACK;
        el_hp.style.backgroundColor = LIGHT;
    }
    if (pc.stats.o2 < pc.stats.o2cap * 0.61) {
        el_o2.style.color = BLACK;
        el_o2.style.backgroundColor = LIGHT;
    }
};
Hud._getText = function () {
    return `>> [${pc.name}] <span id="hud_hp">HP:${pc.stats.hp}(${pc.stats.hpcap})</span>
Spd:${pc.stats.speed} Pow:${pc.stats.power} Arm:${pc.stats.armor}
<span id="hud_o2">O<sub>2</sub>:${Math.floor(pc.stats.o2 / pc.stats.o2cap * 100)}%</span>
<span id="hud_depth">P:${ Math.max(0, Game.bars(pc.y))}a</span>
T:${Game.time()}`;
};


// game
var Game = {
    title: "Sea of Green",
    version: "0.1.1",
    // grids
    map: {}, // terrain
    stuff: {}, // things
    floraGrid: {}, // decorations
    tilesSeen: {}, // tiles player can see on current turn
    overlay: {}, // objects drawn over normal screen
    //
    logElem: document.getElementById("log"),
    msgHistory: [],
    fontSize: 17,
    bgColor: NEUTRAL,
    display: null,
    scheduler: null,
    engine: null,
    chrons: 0, // chron: smallest unit of time which can pass.
    turn: 0, // turn: average time it takes an average joe to do an average task.
    msg_y: 0, // scroll pos for msg log
    logh: 80, // height of msg log
    initTexture: true,
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
        current: ROOM_SEAS,
        height: 25,
        width: 80,
    },
    _ghostAlpha: 0.075,
    _refreshMax: 60, // max number of frames of ghost decay after a move, depends on ghostAlpha
    _refresh: 250, // whether to update the screen
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
        bg: BLACK,
        layout: "tile",
        tileWidth: w,
        tileHeight: h,
        tileSet: tileset,
        tileMap: charmap,
    };
    ROT.Display.Rect.cache = true;
    this.display = new ROT.Display(dispSettings);
    this.initBG();
    this.initCanvases();
    let elem = document.getElementById("game");
    elem.appendChild(this.display.getContainer());
    this.logElem.style.width = (this.screen.width * w).toString() + "px";
    this.logElem.style.height = this.logh.toString() + "px";
    /*this.titleElem = document.getElementById("title");
    this.titleElem.innerHTML = this.title;*/

    this._generateMap_seas();
    this.scheduler = new ROT.Scheduler.Action(); // actor queue
    this.engine = new ROT.Engine(this.scheduler); // controls scheduler
    this.addActor(new this.turnIterator(), true);
    this.addActor(new this.chronIterator(), true);
};
Game.initBG = function () {
    // background terminal-style radial gradient
    let w = Game.screen.width * TILEW;
    let h = Game.screen.height * TILEH;
    let canv = Game.display.getContainer();
    let gradcanv = document.createElement("canvas");
    gradcanv.width = canv.width;
    gradcanv.height = canv.height;
    let gradctx = gradcanv.getContext("2d");
    gradctx.save();
    let grad = gradctx.createRadialGradient(w / 4, h / 2, 1, w / 4, h / 2, h * 5 / 7);
    grad.addColorStop(0, CATHODEBG);
    grad.addColorStop(1, "#000000");
    gradctx.fillStyle = grad;
    gradctx.setTransform(2, 0, 0, 1, 0, 0);
    gradctx.fillRect(0, 0, w / 2, h * 2);
    gradctx.restore();
    Game.gradCanv = gradcanv;
};
Game.initCanvases = function () {
    this.prevCanv = document.createElement("canvas");
    this.prevCanv.width = this.display.getContainer().width;
    this.prevCanv.height = this.display.getContainer().height;
    this.prevCtx = this.prevCanv.getContext("2d");
    this.renderedCanv = document.createElement("canvas");
    this.renderedCanv.width = this.display.getContainer().width;
    this.renderedCanv.height = this.display.getContainer().height;
    this.renderedCtx = this.renderedCanv.getContext("2d");
};

// call to begin running actor's "act" functions in order of the queue
Game.start = function () { this.engine.start() };
Game.setTile = function (x, y, strng) { Game.map[x + "," + y] = strng };
Game.bars = function (depth) { return Math.max(0, (depth - SURFY) / 10) + 1 };
Game.addActor = function (actor, repeat = false) { this.scheduler.add(actor, repeat) };
Game.removeActor = function (actor) { this.scheduler.remove(actor) };
Game.addToGrid = function (obj) { this.stuff[obj.x + "," + obj.y] = obj };
Game.removeFromGrid = function (obj) { this.stuff[obj.x + "," + obj.y] = null };
Game.addFlora = function (obj) { this.floraGrid[obj.x + "," + obj.y] = obj };
Game.removeFlora = function (obj) { this.floraGrid[obj.x + "," + obj.y] = null };
Game.roomName = function () { return ROOMNAMES[this.room.current] };
Game.addOverlay = function (obj) { this.overlay[obj.x + "," + obj.y] = obj };
Game.overat = function (x, y) { return this.overlay[x + "," + y] };
Game.tileat = function (x, y) { return this.map[x + "," + y] };
Game.wallat = function (x, y) { return this._terrainData[this.map[x + "," + y]].solid };
Game.florat = function (x, y) { return this.floraGrid[x + "," + y] };
Game.thingat = function (x, y) { return this.stuff[x + "," + y] };
Game.monat = function (x, y) {
    let mon = this.stuff[x + "," + y];
    if (mon && mon.on(ISACTOR)) { return mon; }
    else { return null; }
};

// update screen
Game.update = function () {
    if (this._refresh) {
        //LOG("updated");
        this._refresh -= 1;
        this.darken();
        this.render();
        this.drawGradient();
    }
};
// refresh screen, update function will redraw to canvas and begin animation
Game.refresh = function () {
    //LOG("refreshd");
    this._refresh = this._refreshMax
    //this._fadeIn -= 0.01;
};
var fff = 48;
// draw what's in the view
Game.render = function () {
    for (let x = 0; x < this.view.width; x++) {
        for (let y = 0; y < this.view.height; y++) {
            let xmap = x + this.view.x;
            let ymap = y + this.view.y;
            if (this.tilesSeen[x + "," + y]) {
                this.draw(xmap, ymap);
            }
            else if (ymap === SURFY) {
                let cell = this.cell(xmap, ymap);
                this.draw(xmap, ymap,
                    cell.char, cell.fgcol, cell.bgcol);
            }
            // TESTING
            if (Game.initTexture) {
                fff += 1;
                if (fff > 80) {fff=48}
                let ch = "full";
                this.draw(xmap, ymap, ch, "transparent", "transparent");
            }
            // /TESTING
        }
    }
};
Game.darken = function () {
    let ctx = this.display.getContext();
    ctx.globalCompositeOperation = "darken";
    ctx.fillStyle = "rgba(0,0,0,0.005)";
    ctx.fillRect(0, 0, this.screen.width * TILEW, this.screen.height * TILEH);
    ctx.globalCompositeOperation = "source-atop";
};
Game.drawGradient = function () {
    let ctx = this.display.getContext();
    ctx.globalAlpha = this._ghostAlpha;
    ctx.drawImage(this.gradCanv, 0, 0);
    ctx.globalAlpha = 1;
};
/*
Game.saveGhost = function () {
    let ctx = this.prevCtx;
    ctx.drawImage(this.display.getContainer(), 0, 0);
};
Game.saveImage = function () {
    let ctx = this.renderedCtx;
    ctx.drawImage(this.display.getContainer(), 0, 0);
};
Game.drawImage = function () {
    let ctx = this.display.getContext();
    ctx.drawImage(this.renderedCanv, 0, 0);
};*/

// return a string describing the current in-game time
Game.time = function () {
    let strng = "";
    let spd = AVG_SPEED;
    let t = this.chrons / spd; // total seconds
    let s = (Math.floor(t % 60)).toString();
    if (s.length === 1) { s = "0" + s }
    let m = (Math.floor((t / 60) % 60)).toString();
    if (m.length === 1) { m = "0" + m }
    let h = (Math.floor((t / (60 * 60)) % 24)).toString();
    if (h.length === 1) { h = "0" + h }
    strng += `${h}:${m}:${s}`;
    return strng;
};

Game.roomLoad = function (rm) {
    this.room.current = rm;
    if (rm === ROOM_SEAS) {
        this._generateMap();
        this._toggleFogOfWar(true);
    }
    else if (rm === ROOM_TOWN) {
        this._generateMap_town();
        this._toggleFogOfWar(false);
    }
};

// get an object containing info about a cell
Game.cell = function (x, y) {
    let data, name;
    if (x < 0 || x >= this.room.width || y < 0 || y >= this.room.height) {
        name = "rock";
    } else { name = this.map[x + "," + y]; }
    data = this._terrainData[name];
    return {
        "x": x, "y": y, name: name,
        char: data.char, fgcol: data.fgcol, bgcol: data.bgcol,
        opaque: data.opaque, solid: data.solid,
        swim: data.swim, climb: data.climb, breathe: data.breathe,
    }
};

// queue the current actor in the scheduler
// cost is the amount of time until the actor's next turn
Game.queueActor = function (cost) {
    this.scheduler.setDuration(cost);
};

// draw a cell
Game.draw = function (x, y, char, fgcol, bgcol) {    
    let xx = x - this.view.x;
    let yy = y - this.view.y;
    let charlist = [];
    let fglist = [];
    let bglist = [];
    let overlay = Game.overat(x, y);

    if (char !== undefined) {
        charlist.push(char);
        fglist.push(fgcol);
        bglist.push(bgcol);
    }
    else {
        let thing = Game.thingat(x, y);
        if (!thing) { thing = Game.florat(x, y) }
        if (!thing) { thing = Game.cell(x, y) }
        charlist.push(thing.char);
        fglist.push(thing.fgcol);
        bglist.push(thing.bgcol);
    }
    if (overlay !== undefined) {
        charlist.push(overlay.char);
        fglist.push(overlay.fgcol);
        bglist.push(overlay.bgcol);
    }
    this.display.draw(xx, yy, charlist, fglist, bglist);
};

// messages //
Game.msg = function (entry) {
    //  stack multiple repeated messages
    let prev = this.msgHistory[this.msgHistory.length - 1];
    let prevtext = prev[1];
    if (prevtext === entry) {
        let n = prev[0] + 1;
        this.msgHistory[this.msgHistory.length - 1] = [n, entry];
        this.msgLogBuild();
    } else { // non-repeated, normal entry
        this.msgHistory.push([1, entry]);
        this.logElem.innerText += `>> ${entry} \n`;
        Game.msgScroll(); // scroll to show msg
    }
};
// before Game.msg() is called, must seed the history to prevent key error.
Game.msgSeed = function (entry) {
    this.msgHistory = [[1, entry]];
    this.logElem.innerText = `>> ${entry} \n`;
};
Game.alert = function (strng) {
    this.logElem.innerText = "\n>> " + strng;
    Game.msgScroll(); // scroll to show msg
};
// add all messages from history into message log
Game.msgLogBuild = function () {
    this.logElem.innerText = "";
    for (let i of this.msgHistory) {
        let n = i[0];
        this.logElem.innerText += ">> ";
        if (n > 1) { this.logElem.innerText += ` (x${n})`; }
        this.logElem.innerText += " " + i[1] + "\n";
    }
    this.logElem.style.textAlign = "left";
    Game.msgScroll(); // scroll to show msg
}
// scroll the message log.
// @dy is pixels to scroll. Leave undefined to scroll to bottom.
Game.msgScroll = function (dy) {
    let ymax = this.logElem.scrollHeight;
    if (dy === undefined) { this.msg_y = ymax }
    else { this.msg_y = RESTRICTED(this.msg_y + dy, 0, ymax) }
    this.logElem.scrollTo(0, this.msg_y);
};

// dialogue box
Game.dbox = function (x, y, w, h, txt) {
    for (let j = 0; j < w; j++) {
        for (let i = 0; i < h; i++) {
            this.display.draw(x + j, y + i, " ", "transparent", BLACK);
        }
    }
    this.display.drawText(x, y, txt, w, "transparent", BLACK);
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

        // surf animation
        if (that.view.y <= SURFY) {
            let tern, key;
            for (let j = 0; j < that.room.width; j++) {
                if (Math.random() >
                    Math.max(0, Math.sin(j / 10 + that.turn / 3)) * 0.4 + 0.05) {
                    continue;
                }
                key = j + "," + SURFY;
                if (that.map[key] === "surf") {
                    tern = "surfrough"
                } else tern = "surf";
                that.map[key] = tern;
            }
        }

        // iterate things
        for (let id in Things.dict) {
            let obj = Things.dict[id];

            // gravas
            if (that.turn % 2 === 0) {
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

Game.listen_stop_playerAction = function () {
    window.removeEventListener("keydown", Player.performAction);
}
Game.listen_playerAction = function () {
    window.addEventListener("keydown", Player.performAction);
}

// Overlay: objects drawn atop normal screen.
// An overlay object is drawn juxtaposed on another object.
// Call createOverlay() to draw juxtaposing objects to the screen.
// Call clearOverlay() to destroy all overlay objects.
Game.Overlay = function (x, y, _char, _bg, _fg) {
    this.x = x;
    this.y = y;
    this.char = _char;
    this.bgcol = _bg;
    this.fgcol = _fg;
};
Game.createOverlay = function (x, y, ch, bg, fg) {
    if (bg === undefined) { bg = "transparent" }
    if (fg === undefined) { fg = "transparent" }
    let over = new this.Overlay(x, y, ch, fg, bg);
    this.addOverlay(over);
}
Game.clearOverlay = function () { this.overlay = {} }

// private functions //

Game._generateMap_init = function (discovered = false) {
    for (let i = 0; i < this.room.height; i++) {
        for (let j = 0; j < this.room.width; j++) {
            this.setTile(j, i, "water");
            this.stuff[j + "," + i] = null;
            this.floraGrid[j + "," + i] = null;
            this.tilesSeen[j + "," + i] = discovered;
        }
    }
};
Game._generateMap_seas = function () {
    let choice;
    this._generateMap_init();
    // surf
    for (let j = 0; j < this.room.width; j++) {
        if (Math.random() > 0.5) { choice = "surf" } else choice = "surfrough";
        this.setTile(j, SURFY, choice);
    }
    // water
    for (let i = 0; i < SURFY; i++) {
        for (let j = 0; j < this.room.width; j++) {
            this.setTile(j, i, "air");
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
    this._generateMap_init(true);
    for (let i = 0; i < this.room.height; i++) {
        for (let j = 0; j < this.room.width; j++) {
            this.setTile(j, i, "air");
        }
    }
    READTEXT("/../levels/town.txt", function (fileData) {
        let lines = fileData.split("\n");
        let tile;
        for (let y = 0, line; y < Game.room.height; y++) {
            line = lines[y];
            for (let x = 0; x < Game.room.width; x++) {
                if (line[x] === "\n") { continue }
                tile = TILES_FROMTOWNMAP[line[x]];
                if (tile === undefined) { continue }
                Game.setTile(x, y, tile);
            }
        }
    });
};

Game.Tile = function (char, fgcol, bgcol, opaque, solid, swim, climb, breathe) {
    this.char = char;
    this.fgcol = fgcol;
    this.bgcol = bgcol;
    this.opaque = opaque;
    this.solid = solid;
    this.swim = swim;
    this.climb = climb;
    this.breathe = breathe;
};
Game._terrainData = {
    /*  boolean values:                 opaque solid swim climb breathe */
    "air": new Game.Tile(
        " ", "transparent", "transparent", false, false, false, false, true),
    "sky": new Game.Tile(
        " ", "transparent", "transparent", false, false, false, false, true),
    "water": new Game.Tile(
        "smalldot", "transparent", "transparent", false, false, true, false, false),
    "surf": new Game.Tile(
        "~%2", "transparent", LIGHT, false, false, true, false, true),
    "surfrough": new Game.Tile(
        "~~%2", "transparent", LIGHT, false, false, true, false, true),
    "rock": new Game.Tile(
        "noise3", "transparent", "transparent", true, true, false, false, false),
    "wood": new Game.Tile(
        "noise2", "transparent", "transparent", true, true, false, false, false),
    "falserock": new Game.Tile(
        "noise3", "transparent", "transparent", true, true, false, false, false),
    "ladder": new Game.Tile(
        "#", "transparent", "transparent", false, false, false, true, true),
    "doorclosed": new Game.Tile(
        "+", "transparent", "transparent", true, true, false, false, true),
    "dooropen": new Game.Tile(
        "-", "transparent", "transparent", false, false, false, false, true),
    "fountain": new Game.Tile(
        "ff", "transparent", "transparent", false, false, false, false, true),
    "roofpos": new Game.Tile(
        "/", "transparent", "transparent", true, true, false, false, false),
    "roofneg": new Game.Tile(
        "\\", "transparent", "transparent", true, true, false, false, false),
    "rooftop": new Game.Tile(
        "_", "transparent", "transparent", true, true, false, false, false),
    "chimney": new Game.Tile(
        "L", "transparent", "transparent", true, true, false, false, false),
    "antenna": new Game.Tile(
        "|", "transparent", "transparent", true, true, false, false, false),
    "windowright": new Game.Tile(
        "]", "transparent", "transparent", false, true, false, false, false),
    "windowleft": new Game.Tile(
        "[", "transparent", "transparent", false, true, false, false, false),
    "star": new Game.Tile(
        "*", "transparent", "transparent", false, false, false, false, true),
};

// callback functions

Game._FOVnormal_callback = function (x, y) {
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


/*
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
    */
