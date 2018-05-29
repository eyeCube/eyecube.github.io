/*
 *  player
 */

"use strict";


// Player data and functions
// This is NOT the in-game Thing object controlled by the player (PC).
// PLayer.init() returns the Thing object that is the PC.
var Player = {

};
Player.init = function () {
    let player = Things.new_actor('@', 1, 0);
    player.name = "Jaek";
    player.stats.hpcap = 10;
    player.stats.hp = player.stats.hpcap;
    player.stats.o2cap = 400;
    player.stats.o2 = player.stats.o2cap;
    player.stats.power = 2;
    player.stats.sight = 20;
    player.raise(NEEDSAIR);
    player.raise(CANCLIMB);
    player.raise(CANOPEN);
    player.act = this.pcAct; //act is called when it is your turn
    // FOV
    player.fov = new ROT.FOV.PreciseShadowcasting(Game._callbackFxn_FOVnormal);
    return player;
};
Player.commands_keys = {
    'e': ROT.VK_L, // vi keys
    'ne': ROT.VK_U,
    'n': ROT.VK_K,
    'nw': ROT.VK_Y,
    'w': ROT.VK_H,
    'sw': ROT.VK_B,
    's': ROT.VK_J,
    'se': ROT.VK_N,
    'self': ROT.VK_PERIOD,
    'wait1': ROT.VK_T,
    'aim': ROT.VK_F,
    'escape': ROT.VK_ESCAPE,
    'select': ROT.VK_SPACE,
    'logscrollup': ROT.VK_Z,
    'logscrolldown': ROT.VK_X,
    'debug': ROT.VK_Q,
};
// process player input, return an action string
Player.commands = function (event) {
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    let action;
    let code = event.keyCode;
    let vk = "?";
    // find the corresponding constant
    for (var name in ROT) {
        if (ROT[name] === code && name.indexOf("VK_") === 0) { vk = name; }
    }
    // get an action string
    for (let act in this.commands_keys) {
        if (ROT[vk] === this.commands_keys[act]) {
            action = act;
        }
    }
    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
    return action;
};
// act function executed when it's player's turn
Player.pcAct = function () {
    Game.update();
    Hud.update();
    Game.engine.lock(); // freeze and wait for action
    Game.listen_playerAction();
}
Player.performAction = function (ev) {
    let that = Player;
    let action = that.commands(ev);
    let finish = false;
    if (action) {
        switch (action) {
            case 'e':
                finish = Actions.move(pc, 1, 0);
                break;
            case 'ne':
                finish = Actions.move(pc, 1, -1);
                break;
            case 'n':
                finish = Actions.move(pc, 0, -1);
                break;
            case 'nw':
                finish = Actions.move(pc, -1, -1);
                break;
            case 'w':
                finish = Actions.move(pc, -1, 0);
                break;
            case 'sw':
                finish = Actions.move(pc, -1, 1);
                break;
            case 's':
                finish = Actions.move(pc, 0, 1);
                break;
            case 'se':
                finish = Actions.move(pc, 1, 1);
                break;
            case 'self':
                finish = Actions.move(pc, 0, 0);
                break;
            case 'aim':
                that.action_aim();
                break;
            case 'logscrollup':
                Game.msg_scroll(-Game.logh);
                break;
            case 'logscrolldown':
                Game.msg_scroll(Game.logh);
                break;
            case 'wait1':
                finish = true;
                Game.queueActor(1);
                break;
            case 'waitx':
                // wait x number of semi-turns (chrons)
                break;
            case 'debug':
                pc.char = String.fromCharCode(pc.char.charCodeAt(0) + 1);
                console.log(pc.char.charCodeAt(0));
                break;
        };
        // end turn
        if (finish) { that.pass_torch() }
        else { Game.queueActor(0) } // did nothing; expend no energy
    }
};
// pass torch: calculate FOV, resume engine
Player.pass_torch = function () {

    if (Game.room.current !== ROOM_TOWN) {
        // reset tiles to not visible
        for (let i = 0; i < Game.view.height; i++) {
            for (let j = 0; j < Game.view.width; j++) {
                let xmap = j + Game.view.x;
                let ymap = i + Game.view.y;
                Game.tilesSeen[xmap + "," + ymap] = false;
            }
        }

        pc.fov.compute(pc.x, pc.y, pc.stats.sight, function (x, y, r, visibility) {
            Game.tilesSeen[x + "," + y] = true;
        });
    }

    Game.listen_stop_playerAction(); // ignore pc input till next pc turn
    Game.engine.unlock(); // perform other actor turns
};

//-----------------//
// PC-only actions //
//-----------------//

/* Aim & Fire
 * Player.targeted is the thing the player is aiming at,
 *  not necessarily the one he will hit.
*/
Player.action_aim = function () {
    Player._showAimPrompt();
    pc.stats.maxRange = 8; // TODO CHANGE TO DEPEND ON GEAR
    let mon;
    Player.targetsInRange = [];
    for (let monID in Things.dict) {
        // dict keys are strings, do NOT use strict comparison
        if (monID == pc.id) { continue }
        mon = Things.dict[monID];
        if (DIST(pc.x, pc.y, mon.x, mon.y) <= pc.stats.maxRange) {
            Player.targetsInRange.push(monID);
        }
    }
    // init temp vars for use with callback
    Player.dirChosen = null; // 
    Player.targeted = null; // selected thing to fire at
    Player.thingHit = null; // actual thing that will be hit if you fire
    Player.dirStr = "";
    Player.targetsConsidered = [];
    Player.selectID = 0;
    Game.listen_stop_playerAction();
    window.addEventListener("keydown", Player.doAim);
};

// input //

// auto-aim at targets
Player.doAim = function (ev) {
    function removeThisListener() {
        window.removeEventListener("keydown", thisFxn);
    }
    let thisFxn = Player.doAim;
    let dir;
    let resume = false;
    let selected = false;
    let action = Player.commands(ev);
    // aim
    if (action) {
        if (action === "escape") { resume = true }
        else if (action === "select") { selected = true }
        else { // get degrees direction from action string
            dir = DIRECTIONS[action];
        }
        if (dir !== undefined) {
            Player.dirStr = action;
            // select a new direction and the closest monster in that direction
            if (Player.dirChosen === null || dir !== Player.dirChosen) {
                let dist;
                let closest = 999999;
                let maxDiff = 30; // higher: more inclusive
                let t;
                Player.dirChosen = dir;
                Player.targetsConsidered = [];
                Player.selectID = 0;
                // get list of viable targets in the chosen direction
                for (let monID of Player.targetsInRange) {
                    let mon = Things.dict[monID];
                    let dirto = RADTODEG(POINTDIR(pc.x, pc.y, mon.x, mon.y));
                    let diff = Math.abs(DDEGREES(dirto, dir));
                    if (diff <= maxDiff) {
                        Player.targetsConsidered.push(mon);
                    }
                }
                // refresh screen
                Game.update()
                //
                if (Player.targetsConsidered.length === 0) {
                    Player._showAimPrompt("No targets there in range. ");
                    return;
                }
                // sort targets by proximity to player
                Player.targetsConsidered.sort(function (a, b) {
                    let dista = DIST(a.x, a.y, pc.x, pc.y);
                    let distb = DIST(b.x, b.y, pc.x, pc.y);
                    return dista - distb;
                });
                Player.targeted = Player.targetsConsidered[Player.selectID];
                Player._castAimLine(Player.targeted);
                Player._showTargeted(Player.targeted);
            }
            // if the player keeps pressing the same direction input
            // cycle through possible targets in the given direction
            else if (dir === Player.dirChosen) {
                if (Player.targetsConsidered.length) {
                    Player.selectID = (Player.selectID + 1) %
                        Player.targetsConsidered.length;
                    Game.update()
                    Player.targeted = Player.targetsConsidered[Player.selectID];
                    Player._castAimLine(Player.targeted);
                    Player._showTargeted(Player.targeted);
                }
            }
        }
    }
    // fire at target
    if (selected && Player.thingHit !== null) {
        let t = Player.thingHit;
        let dmg = pc.stats.power;
        t.hurt(dmg);
        LOG(`${t.name} hurt by ${dmg} dmg`)
        Game.queueActor(COST_FIRE);
        removeThisListener();
        Player.pass_torch(); // end pc turn
        return;
    }
    if (resume) { // resume player's turn
        Game.update();
        removeThisListener();
        Game.listen_playerAction();
    }
};

//-------------------//
// private functions //
//-------------------//

Player._showAimPrompt = function (addend) {
    if (addend === undefined) { addend = "" }
    Game.dbox(0, 0, Game.screen.width, 1, addend + "Aim where? <hjklyubn>");
};
Player._showTargeted = function (targeted) {
    let tg = targeted;
    let xt = tg.x - pc.x;
    let yt = tg.y - pc.y;
    let xs = (xt >= 0) ? "+" : "";
    let ys = (yt >= 0) ? "+" : "";
    let d = Math.round(Math.sqrt(xt ** 2 + yt ** 2));
    // underline targeted
    Game.draw(tg.x, tg.y, " ", "transparent", BLACK);
    Game.draw(tg.x, tg.y, [tg.char, "_"],
        [tg.fgcol, "transparent"]);
    // display info about target
    Game.dbox(0, 0, Game.screen.width, 1,
        `${Player.dirStr.toUpperCase()}-${Player.selectID + 1} `
        + `${d}m (X${xs}${xt},Y${ys}${yt}) `
        + `[${tg.char}] "${tg.name}" `
        + `| aim:<hjklyubn> select:<space>`
    );
};
Player._castAimLine = function (targeted) {
    // highlight trajectory and destination of missile
    STEPLINE(pc.x, pc.y, targeted.x, targeted.y, function (v, i, len) {
        if (i === 0) { return } // continue. Missile ignores caster.
        let x = v[0], y = v[1];
        let here = Game.monat(x, y);
        if (!here) { Game.draw(x, y, "*", "transparent", NEUTRAL) }
        if (here) {
            Game.draw(x, y, "!", "transparent", BLACK) // something in the way!
            Player.thingHit = here; // actual target of missile
            return BREAK; // destination reached
        }
    });
};




/*
let fov = new ROT.FOV.PreciseShadowcasting(Game._callbackFxn_FOVnormal);
        fov.compute(pc.x, pc.y, pc.stats.maxRange, function (x, y, r, visibility) {
            if (!r) { return false }
            let mon = Game.monat(x, y);
            if (mon !== null) {
                mon.hurt(pc.stats.power);
                
                LOG(`hurt ${mon.name}`);
                return false;
            }
        });
        */