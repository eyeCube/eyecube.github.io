/*
 *  things
 *  monsters
 *  AIs
 *  actions
 */

"use strict";


// Things namespace
var Things = {
    dict: {},
    nextID: 0,
    names: {
        'b': "bubician",
        'c': "carlfish",
    },
    _newID: function () { return ++(this.nextID); },
};
Things.add = function (obj) { this.dict[obj.id] = obj };
Things.remove = function (obj) { delete this.dict[obj.id] };

// make, register and return a new generic Thing
Things.new = function (char, x, y) {
    let thing = new this.Thing(char, x, y);
    thing.id = this._newID();
    this.add(thing);
    Game.addToGrid(thing);

    return thing;
};

// create a thing w/ an "act" function
Things.new_actor = function (char, x, y) {
    let thing = this.new(char, x, y);
    Game.addActor(thing, true);
    thing.raise(ISACTOR);
    thing.stats = new Things.Stats();

    return thing;
};


// object containing stat info for a thing
Things.Stats = function () {
    this.hp = 1;
    this.hpcap = 1;
    this.o2 = 0;
    this.o2cap = 0;
    this.speed = AVG_SPEED;
    this.power = 0;
    this.armor = 0;
    this.sight = 0;
};


// Thing class
// To create a Thing, call Things.new() or Things.new_actor();
// To delete a Thing, call prototype method obj.destroy();
// UNLESS it is an actor, inwhichcase call obj.kill() instead!
Things.Thing = function (char, x, y) {
    this.char = char;
    this.x = x;
    this.y = y;
    this.flags = [];
    this.fgcol = WHITE;
    this.bgcol = BLACK;
    this.name = Things.names[char];
    this.stats = null;
};
Things.Thing.prototype.port = function (x, y) {
    Game.removeFromGrid(this);
    this.x = x;
    this.y = y;
    Game.addToGrid(this);
};
Things.Thing.prototype.buff = function (stat, value = 1) { this.stats[stat] += value };
Things.Thing.prototype.debuff = function (stat, value = 1) { this.stats[stat] -= value };
Things.Thing.prototype.on = function (value) { return INCLUDES(this.flags, value); };
Things.Thing.prototype.lower = function (value) { this.flags = REMOVED(this.flags, value); };
Things.Thing.prototype.raise = function (...vals) { // wave that flag, wave it wide and high
    for (let value of vals) {
        if (!INCLUDES(this.flags, value)) { this.flags.push(value) }
    }
};
Things.Thing.prototype.hurt = function (value) { // hurt an actor
    this.stats.hp -= value;
    if (this.stats.hp <= 0) { this.kill() }
};
Things.Thing.prototype.kill = function () { // kill an actor
    Game.removeActor(this);
    this.destroy();
};
Things.Thing.prototype.destroy = function () {
    Things.remove(this);
    Game.removeFromGrid(this);
};


// AI //

Things.Thing.prototype.ai_coward = function () {
    let pdir = POINTDIR(this.x, this.y, pc.x, pc.y) + Math.PI;
    let dx = Math.round(Math.cos(pdir));
    let dy = Math.round(Math.sin(pdir));

    Actions.move(this, dx, dy);
};
Things.Thing.prototype.ai_aggressive = function () {
    let pdir = POINTDIR(this.x, this.y, pc.x, pc.y);
    let dx = Math.round(Math.cos(pdir));
    let dy = Math.round(Math.sin(pdir));

    Actions.move(this, dx, dy);
};


/*-----------------------------------*/
/* Other Thing-related namespaces... */
/*-----------------------------------*/


/*
 * monsters
 */

var Mon = {
    bestiary: {
        'c': { hp: 12, spd: 5, pow: 1, arm: 0 },
        'f': { hp: 1, spd: 10, pow: 0, arm: 0 },
        //911: { hp: 1, spd: 5, pow: 1, arm: 0 },
    },
};
Mon.new = function (char, x, y) {
    let mon = Things.new_actor(char, x, y);
    let data = this.bestiary[char];
    mon.stats.hpcap = data.hp;
    mon.stats.hp = data.hp;
    mon.stats.speed = data.spd;
    mon.stats.power = data.pow;
    mon.stats.armor = data.arm;
    mon.act = mon.ai_aggressive;
    return mon;
};


/*
 * inventory
 */

var Inv = {

};
Inv.Inventory = function () {
    this.dict = {};
    this.add = function (thing) { this.dict[thing.id] = thing; }
    this.remove = function (thing) { delete this.dict[thing.id]; }
};


/*
 * flora
 */

var Flora = {
    dict: {},
    _floraData: {
        ')': { "fgcol": "transparent", "bgcol": SEAGREEN, },
        '(': { "fgcol": "transparent", "bgcol": SEAGREEN, },
    },
};
Flora.add = function (flor) { this.dict[flor.id] = flor };
Flora.remove = function (flor) { this.dict[flor.id] = null };
Flora.new = function (char, x, y) {
    let flor = new this.Flora(char, x, y);
    Flora.add(this);
    Game.addFlora(flor);
    return flor;
};
Flora.create_seaweed = function (x, y, height) {
    let lis = [];
    let ch;
    if (y % 2 == 0) { ch = ')'; } else ch = '(';
    for (let i = 0; i < height; i++) {
        let flor = this.new(ch, x, y - i);
        if (ch == ')') { ch = '(' } else ch = ')'
        flor.act = flor.act_seaweed;
        Game.addActor(flor, true);
        lis.push(flor);
    }
    return lis;
};
Flora.Flora = function (char, x, y) {
    this.char = char;
    this.x = x;
    this.y = y;
    let data = Flora._floraData[char];
    this.fgcol = data.fgcol;
    this.bgcol = data.bgcol;
};
Flora.Flora.prototype.kill = function () {
    Flora.remove(this);
    Game.removeFlora(this);
    Game.removeActor(this);
};
Flora.Flora.prototype.act_seaweed = function () {
    Game.queueActor(TURN_LENGTH * 3);
    if (this.char === ')') { this.char = '(' } else { this.char = ')' }
};


/*
 * Action functions, for use in actor's "act" method
 */

var Actions = {

};
// try to move...
// attack if an actor is there,
// pickup + move if a nonactor thing is there,
// climb ladders if the actor can climb,
// fall down if the actor is suspended in air.
// @returns: whether an action was taken.
//
Actions.move = function (actor, dx, dy) {
    //  check: if suspended in air when they made a move, fall.
    //  if you can't swim, can't climb, and there's nothing solid below you, fall.
    let thiscell = Game.cell(actor.x, actor.y);
    if (!(thiscell.swim || (actor.on(CANCLIMB) && thiscell.climb)
        || (Game.cell(actor.x, actor.y + 1).solid))) {
        dy = 1;
    }
    // get appropriate action //
    if (dx === 0 && dy === 0) { //rest
        Game.queueActor(TURN_LENGTH);
        return true;
    }
    let xto = actor.x + dx;
    let yto = actor.y + dy;
    if (!Game.wallat(xto, yto)) {
        // is a thing there?
        let thing = Game.thingat(xto, yto);
        if (thing) {
            if (thing.on(ISACTOR)) { // fight
                this.fight(actor, thing);
                return true;
            }
            else { // pickup
                this.pickup(actor, thing);
                actor.port(xto, yto);
                Game.queueActor(COST_PICKUP * AVG_SPEED / actor.stats.speed);
                return true;
            }
        }
        else { // move normally
            actor.port(xto, yto);
            Game.queueActor(COST_MOVE * AVG_SPEED / actor.stats.speed);
            return true;
        }
    }
    else return false; // no action taken
};
// fight
Actions.fight = function (atkr, dfnr) {
    let dmg = atkr.stats.power - dfnr.stats.armor;
    dfnr.hurt(dmg);
    Game.queueActor(COST_FIGHT * AVG_SPEED / atkr.stats.speed);
    if (atkr == pc) {
        let h;
        if (dfnr.stats.hp > 0) { h = "hit" } else { h = "kill" }
        Game.msg(`You ${h} the ${dfnr.name}`);
    }
    else if (dfnr == pc) { Game.msg(`The ${atkr.name} hit you`) }
};
// pick up a thing
Actions.pickup = function (actor, item) {
    console.log("pickup");
    /*
    actor.inv.additem(item);
    Game.removeFromGrid(item);*/
};
