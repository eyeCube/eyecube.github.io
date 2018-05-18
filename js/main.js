/*
 *  init, begin game
 */


Game.init();
var pc = Player.init();
let c = Mon.new('c', 50, 20);
let f = Things.new('^', 63, 0);
f.bgcol = SKYBLUE;
Hud.init();
Game.start();
