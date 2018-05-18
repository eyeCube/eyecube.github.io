/*
 *  player
 */

"use strict";


// Player data and functions
// This is NOT the in-game Thing object controlled by the player (PC).
// PLayer.init() returns the Thing object that is the PC.
var Player = {
    init: function () {
        let player = Things.new_actor('&', 1, 0);
        player.name = "Jaek";
        player.stats.hpcap = 10;
        player.stats.hp = player.stats.hpcap;
        player.stats.o2cap = 100;
        player.stats.o2 = player.stats.o2cap;
        player.stats.power = 2;
        player.act = this.pcAct; //act is called when it is your turn
        return player;
    },
    commands_keys: {
        'e' : ROT.VK_L, // vi keys
        'ne': ROT.VK_U,
        'n' : ROT.VK_K,
        'nw': ROT.VK_Y,
        'w' : ROT.VK_H,
        'sw': ROT.VK_B,
        's' : ROT.VK_J,
        'se': ROT.VK_N,
        'rest'  : ROT.VK_PERIOD,
    },
    // process player input, return an action string
    commands: function (event) {
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
    },
    // act function executed when it's player's turn
    pcAct: function () {
        console.log("player turn begin");

        Game.update();
        Hud.update();
        Game.engine.lock(); // freeze and wait for action
        window.addEventListener("keydown", Player.performAction);
    },
    performAction: function (ev) {

        let action = Player.commands(ev);
        if (action) {

            switch (action) {
                case 'e':
                    Actions.move(pc, 1, 0);
                    break;
                case 'ne':
                    Actions.move(pc, 1, -1);
                    break;
                case 'n':
                    Actions.move(pc, 0, -1);
                    break;
                case 'nw':
                    Actions.move(pc, -1, -1);
                    break;
                case 'w':
                    Actions.move(pc, -1, 0);
                    break;
                case 'sw':
                    Actions.move(pc, -1, 1);
                    break;
                case 's':
                    Actions.move(pc, 0, 1);
                    break;
                case 'se':
                    Actions.move(pc, 1, 1);
                    break;
                case 'rest':
                    Actions.rest(pc);
                    break;
            }

            // end turn
            Player.pass_torch();
        }
    },
    // resume engine, see if any other creature wants to take a turn
    pass_torch: function () {
        console.log("player turn end");
        window.removeEventListener("keydown", pc);
        Game.engine.unlock(); // unfreeze
    },
}



