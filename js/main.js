/*
 *  init, begin game
 */


Game.init();
var pc = Player.init();
Hud.init();
Game.start();
Game.msgSeed(`${Game.title} v_${Game.version}`);
Game.msg(`Welcome ${pc.name} to ${Game.roomName()}.`);
var global_updateInterval = setInterval(function () { Game.update() }, 32);
setTimeout(function () {
    Game.initTexture = false;
}, 100);


//TESTING
Mon.create('c', 50, 20);
Mon.create('c', 40, 20);
Mon.create('c', 60, 20);
Mon.create('c', 20, 20);
Flora.create_seaweed(16, 24, 2);
Flora.create_seaweed(19, 24, 5);
Flora.create_seaweed(21, 24, 4);
//





/*
console.log("pc sinkage report");
console.log(pc.flags);
console.log(pc.on(SINKS));
pc.raise(SINKS);
console.log(pc.on(SINKS));
pc.lower(SINKS);
console.log(pc.on(SINKS));
*/
