/*
 *  init, begin game
 */


Game.init();
var pc = Player.init();
Hud.init();
Game.start();
Game.msgSeed(`Welcome ${pc.name} to the Seas of Morudia.`);



//TESTING
let c = Mon.new('c', 50, 20);
let f = Things.new('^', 63, 0);
Flora.create_seaweed(16, 24, 2);
Flora.create_seaweed(19, 24, 5);
let g = Flora.create_seaweed(21, 24, 4);
/*for (i of g) {
    i.kill();
}*/
f.bgcol = SKYBLUE;
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