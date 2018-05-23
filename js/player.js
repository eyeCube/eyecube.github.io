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
    'debug': ROT.VK_Q,
};
// process player input, return an action string
Player.commands = function (event) {
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }

    let action;
    let code = event.keyCode;
    let vk = "?"; /* find the corresponding constant */
    for (var name in ROT) {
        if (ROT[name] == code && name.indexOf("VK_") == 0) { vk = name; }
    }

    for (let act in this.commands_keys) {
        if (ROT[vk] == this.commands_keys[act]) {
            action = act;
        }
    }

    event.preventDefault(); // Cancel the default action to avoid it being handled twice
    return action;
};
// act function executed when it's player's turn
Player.pcAct = function () {

    Game.update();
    Hud.update();
    Game.engine.lock(); // freeze and wait for action
    window.addEventListener("keydown", Player.performAction);
}
Player.performAction = function (ev) {
    let that = Player;
    let action = that.commands(ev);
    if (action) {
        let didTurn = false;
        switch (action) {
            case 'e':
                didTurn = Actions.move(pc, 1, 0);
                break;
            case 'ne':
                didTurn = Actions.move(pc, 1, -1);
                break;
            case 'n':
                didTurn = Actions.move(pc, 0, -1);
                break;
            case 'nw':
                didTurn = Actions.move(pc, -1, -1);
                break;
            case 'w':
                didTurn = Actions.move(pc, -1, 0);
                break;
            case 'sw':
                didTurn = Actions.move(pc, -1, 1);
                break;
            case 's':
                didTurn = Actions.move(pc, 0, 1);
                break;
            case 'se':
                didTurn = Actions.move(pc, 1, 1);
                break;
            case 'self':
                didTurn = Actions.move(pc, 0, 0);
                break;
            case 'wait1':
                didTurn = true;
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
        if (didTurn) { that.pass_torch(); }
        else { Game.queueActor(0); } // did nothing; expend no energy.
    }
};
// resume engine, see if any other creature wants to take a turn
Player.pass_torch = function () {

    if (!Game.room.current === ROOM_TOWN) {
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

    window.removeEventListener("keydown", Player.performAction); // ignore pc input till next pc turn
    Game.engine.unlock(); // perform other actor turns
};
// input
Player.input_chooseTarget = function () {
    this.input_mode = "chooseTarget";

};




