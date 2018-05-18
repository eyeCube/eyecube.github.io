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
    },
    add: function (obj) { this.dict[obj.id] = obj; },
    remove: function (obj) { delete this.dict[obj.id]; },
    new: function (char, x, y) {
        let thing = new this.Thing(char, x, y);
        thing.id = this._newID();
        this.add(thing);
        Game.addToGrid(thing);
        thing.stats = new Things.Stats();
        console.log(this.dict);
        return thing;
    },
    // create a thing w/ an "act" function
    new_actor: function (char, x, y) {
        let thing = this.new(char, x, y);
        Game.addActorLoop(thing);
        thing.isactor = true;
        return thing;
    },
    release_actor: function (obj) {
        Game.removeActor(obj);
    },
    destroy: function (obj) {
        Game.draw(obj.x, obj.y);
        Things.remove(obj);
        Game.removeFromGrid(obj.x, obj.y);
    },
    _newID: function () { return ++(this.nextID);},
}
// object containing stat info for a thing
Things.Stats = function () {
    this.hp = 1;
    this.hpcap = 1;
    this.o2 = 0;
    this.o2cap = 0;
    this.speed = AVG_SPEED;
    this.power = 0;
    this.armor = 0;
}
// Thing class
Things.Thing = function (char, x, y) {
    this.char = char;
    this.x = x;
    this.y = y;
    this.isactor = false;
    this.sinks = false;
    this.floats = false;
    this.fgcol = WHITE;
    this.bgcol = BLACK;
    this.name = Things.names[char];
    this.stats = null;
}
Things.Thing.prototype.port = function (x, y) {
    Game.removeFromGrid(this.x, this.y);
    this.x = x;
    this.y = y;
    Game.addToGrid(this);
}
Things.Thing.prototype.buff = function (stat, value = 1) { this.stats[stat] += value }
Things.Thing.prototype.debuff = function (stat, value = 1) { this.stats[stat] -= value }
Things.Thing.prototype.hurt = function (value) {
    this.stats.hp -= value;
    if (this.stats.hp <= 0) { this.kill(); }
}
Things.Thing.prototype.kill = function () { // kill an actor
    Things.release_actor(this);
    Things.destroy(this);
}


/*-----------------------------------*/
/* Other Thing-related namespaces... */
/*-----------------------------------*/


// monsters
var Mon = {
    bestiary: {
        'c': { hp: 1, spd: 12, pow: 0, arm: 0 },
        'f': { hp: 1, spd: 10, pow: 0, arm: 0 },
        //911: { hp: 1, spd: 5, pow: 1, arm: 0 },
    },
}
Mon.new = function (char, x, y) {
    let mon = Things.new_actor(char, x, y);
    let data = this.bestiary[char];
    mon.stats.hpcap = data.hp;
    mon.stats.hp    = data.hp;
    mon.stats.speed = data.spd;
    mon.stats.power = data.pow;
    mon.stats.armor = data.arm;
    mon.act = AI.coward;
    return mon;
}


// Action functions, for use in actor's "act" method
var Actions = {
    rest: function (actor) {
        Game.queueActor(TURN_LENGTH)
    },
    move: function (actor, dx, dy) {
        if (actor.y < SURFY) { dy = 1; } // prevent from going above surface
        // get appropriate action
        let thing = Game.thingat(actor.x + dx, actor.y + dy);
        if (thing) {
            if (thing.isactor) { this.fight(actor, thing); }
            else { this.pickup(actor, thing); }
        }
        else {
            actor.port(actor.x + dx, actor.y + dy);
            Game.queueActor(COST_MOVE * AVG_SPEED / actor.stats.speed);
        }
    },
    fight: function (atkr, dfnr) {
        let dmg = atkr.stats.power - dfnr.stats.armor;
        dfnr.hurt(dmg);
        Game.queueActor(COST_FIGHT * AVG_SPEED / atkr.stats.speed);
    }
}


// monster act scripts
var AI = {};
AI.coward = function () {
    let dx = 0;
    let dy = 0;

    let xf = this.x;
    let yf = this.y;
    let xt = pc.x;
    let yt = pc.y;
    let pdir = Math.atan2(yt - yf, xt - xf);
    dx = Math.round(Math.cos(pdir - Math.PI));
    dy = Math.round(Math.sin(pdir - Math.PI));

    Actions.move(this, dx, dy);
    Game.queueActor(100); //A TEST

    console.log("ai went");
}


// inventory
var Inv = {

}
Inv.Inventory = function () {
    this.dict = {};
    this.add = function (thing) { this.dict[thing.id] = thing; }
    this.remove = function (thing) { delete this.dict[thing.id]; }
}


