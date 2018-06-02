/*
 *  player
 */

"use strict";


// Player data and functions
// This is NOT the in-game object controlled by the player (PC).
// Player.init() returns the Thing object that is the PC.
var Player = {

};
Player.init = function () {
    let obj = Things.create_actor('@', 1, 0);
    obj.name = "Jaek";
    obj.stats.hpcap = 10;
    obj.stats.hp = obj.stats.hpcap;
    obj.stats.o2cap = 400;
    obj.stats.o2 = obj.stats.o2cap;
    obj.stats.power = 2;
    obj.stats.sight = 10;
    obj.raise(NEEDSAIR);
    obj.raise(CANCLIMB);
    obj.raise(CANOPEN);
    obj.act = this.pcAct; //act is called when it is your turn
    // FOV
    obj.fov = new ROT.FOV.PreciseShadowcasting(Game._FOVnormal_callback);
    return obj;
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
// pc obj "act" function, executed to begin player turn
Player.pcAct = function () {
    Player.fov_update();
    Game.render();
    Game.refresh();
    Hud.update();
    Game.engine.lock(); // freeze and wait for action
    Game.listen_playerAction(); // activate listener function for player action
}
// listener function for player action
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
                Game.msgScroll(-Game.logh);
                break;
            case 'logscrolldown':
                Game.msgScroll(Game.logh);
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
    Player.targeted = undefined; // selected thing to fire at
    Player.thingHit = undefined; // actual thing that will be hit if you fire
    Player.dirChosen = undefined; // current aiming direction
    Player.dirStr = ""; // string describing aiming direction
    Player.targetsConsidered = [];
    Player.selectID = 0;
    Game.listen_stop_playerAction();
    window.addEventListener("keydown", Player.doAim);
};

//-----------//
// listeners //
//-----------//

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
            if (Player.dirChosen === undefined || dir !== Player.dirChosen) {
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
                Game.refresh()
                Game.clearOverlay();
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
                    Game.refresh()
                    Game.clearOverlay();
                    Player.targeted = Player.targetsConsidered[Player.selectID];
                    Player._castAimLine(Player.targeted);
                    Player._showTargeted(Player.targeted);
                }
            }
        }
    }
    // fire at target & end pc turn
    if (selected && Player.thingHit !== undefined) {
        let tg = Player.thingHit;
        let dmg = pc.stats.power;
        tg.hurt(dmg);
        Game.queueActor(COST_FIRE);
        Game.msgLogBuild();
        Game.clearOverlay();
        removeThisListener();
        Player.pass_torch();
        return;
    }
    if (resume) { // no action taken, resume player's turn
        Game.msgLogBuild();
        Game.refresh();
        Game.clearOverlay();
        removeThisListener();
        Game.listen_playerAction();
    }
};
Player.fov_update = function () {
    if (!INCLUDES(ROOMS_NOFOV, Game.room.current)) { // some rooms disable FOV
        // reset tiles to not visible
        let xmap, ymap;
        for (let i = 0; i < Game.view.height; i++) {
            for (let j = 0; j < Game.view.width; j++) {
                xmap = j + Game.view.x;
                ymap = i + Game.view.y;
                Game.tilesSeen[xmap + "," + ymap] = false;
            }
        }
        // show tiles pc can see
        pc.fov.compute(pc.x, pc.y, pc.stats.sight, function (x, y, r, visibility) {
            //if (Game.cell(x, y).swim && DORTHO(pc.x,pc.y,x,y) > pc.stats.sight) { return }
            Game.tilesSeen[x + "," + y] = true;
        });
    }
};

//-------------------//
// private functions //
//-------------------//

Player._showAimPrompt = function (addend) {
    if (addend === undefined) { addend = "" }
    Game.alert(addend + "Aim where? <hjklyubn>");
};
Player._showTargeted = function (targeted) {
    const tg = targeted;
    const xt = tg.x - pc.x;
    const yt = tg.y - pc.y;
    const xs = (xt >= 0) ? "+" : "";
    const ys = (yt >= 0) ? "+" : "";
    const d = Math.round(Math.sqrt(xt ** 2 + yt ** 2));
    // underline targeted
    Game.createOverlay(tg.x, tg.y, "_");
    // display info about target
    Game.alert(`${Player.dirStr.toUpperCase()}-${Player.selectID + 1} `
        + `${d}m (X${xs}${xt},Y${ys}${yt}) `
        + `[${tg.char}] "${tg.name}" `
        + `| select:<space> aim:<hjklyubn>`
    );
};
Player._castAimLine = function (targeted) {
    // highlight trajectory and destination of missile
    STEPLINE(pc.x, pc.y, targeted.x, targeted.y, function (v, i, len) {
        if (i === 0) { return } // continue. Missile ignores caster.
        const x = v[0], y = v[1];
        let here = Game.monat(x, y);
        if (!here) { Game.createOverlay(x, y, "*") }
        if (here) {
            Game.createOverlay(x, y, "!"); // something in the way!
            Player.thingHit = here; // actual target of missile
            return BREAK; // destination reached
        }
        if (Game.cell(x, y).solid) {
            Game.createOverlay(x, y, "!"); // something in the way!
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
