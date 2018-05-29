/*
 *  constants
 */

"use strict";


const BREAK = Symbol("break");

/*
 * simple, global, constant functions to prettify
 */

const DIRX = rads => Math.round(Math.cos(rads));
const DIRY = rads => -Math.round(Math.sin(rads));
const DIST = (xf, yf, xt, yt) => Math.sqrt((yt - yf) ** 2 + (xt - xf) ** 2);
const CHAR = code => String.fromCharCode(code);
const POINTDIR = (xf, yf, xt, yt) => Math.atan2(yf - yt, xt - xf); // swap y because our grid is inverted in y direction
const REMOVED = (arrayOld, item) => arrayOld.filter(el => el !== item); // return array w/ item removed
const ISITER = obj => obj !== null && typeof obj[Symbol.iterator] === 'function';
const LOG = x => console.log(x);
const RADTODEG = x => x * 360 / (Math.PI * 2);
const DDEGREES = (deg1, deg2) => { // difference btn. angles
    return ((((deg1 - deg2) % 360) + 540) % 360) - 180;
};
const INCLUDES = (lis, value) => {
    for (let i of lis) {
        if (i === value) { return true; }
    }
    return false;
};
const RESTRICTED = (value, _min, _max) => {
    value = Math.max(value, _min);
    value = Math.min(value, _max);
    return value;
};
// step over a bresenham line, performing a callback at each point on the line
// callback function takes value, index, len
// value is [x,y]; index is a number
// len is length of the array
// returns BREAK to stop the loop.
const STEPLINE = (x1, y1, x2, y2, callback) => {
    let points = Algo.bresenham(x1, y1, x2, y2);
    let len = points.length;
    for (let i = 0; i < len; i++) {
        if (callback([points[i][0], points[i][1]], i, len) == BREAK) {
            break;
        }
    }
};
// read text (and do something with it)
// fxn is a function that uses fileData (passed in to fxn automatically)
// read fileData as a string and do whatever you want with it
function READTEXT(path, fxn, callback) {
    _getTextFile(path, callback)
        .then(fxn)
        .catch(function (xhr) {
            LOG(xhr);
        });
}



/*
 * CONTANT VALUES
 */

// game data

const TILEW = 12;
const TILEH = 16;
const TILESET_SOURCE = "/../tilesets/green_12x16.png";

// gameplay constants //

const SURFY = 2;//3;
const COST_MOVE = 10;
const COST_PICKUP = 10;
const COST_FIGHT = 10;
const COST_FIRE = 10;
const AVG_SPEED = 10;
const TURN_LENGTH = 10;
const DEPTHO2DIV = 100; // meters down before oxygen loss increases by multiple of 1
const PRESSURE = 100; //
//const COSTMULT_MOVE_VERTICAL = 1; // multiplier: time cost to move up or down

// Colors //

const WHITE = "#aaffdd";
const NEUTRAL = "#1c8a51";
const DARK = "#133020";
const DEEP = "#18221d";
const BLACK = "#000000";
// unused...
const RED = "#ff240e";
const DARKRED = "#630000";
const GREEN = "#009900";
const DARKGREEN = "#002c00";
const BROWN = "#9c8065";
const YELLOW = "#f3c512";
const BLUE = "#095573"
const SEAGREEN = "#48a93c";
const SEAFOAM = "#8eed70";
const SKYBLUE = "#265eb5";


// Flags

const NEEDSAIR = Symbol();
const CANCLIMB = Symbol(); // can climb ladders
const CANOPEN = Symbol(); // can open doors (and conatiners?)
const SINKS = Symbol();
const FLOATS = Symbol();
const ISACTOR = Symbol();
const BLEEDING = Symbol();


/*
 * data objects
 */

const ROOM_TOWN = "town";
const ROOM_SEAS = "seas";
const ROOMNAMES = {
    "town": "Wessenerville",
    "seas": "the Seas of Morudia",
};

const DIRECTIONS = {
    "e": 0,
    "ne": 45,
    "n": 90,
    "nw": 135,
    "w": 180,
    "sw": 225,
    "s": 270,
    "se": 315,
};

const ASCIICHARMAP = {
    //  values starting at 0 and are x, y coordinates on the tileset...png.
    //  values will all be stretched to become the actual pixel coordinates
    //  in the image. For now to keep it prettier, just do the grid coords.
    "a": [1, 6],
    "b": [2, 6],
    "c": [3, 6],
    "d": [4, 6],
    "e": [5, 6],
    "f": [6, 6],
    "g": [7, 6],
    "h": [8, 6],
    "i": [9, 6],
    "j": [10, 6],
    "k": [11, 6],
    "l": [12, 6],
    "m": [13, 6],
    "n": [14, 6],
    "o": [15, 6],
    "p": [0, 7],
    "q": [1, 7],
    "r": [2, 7],
    "s": [3, 7],
    "t": [4, 7],
    "u": [5, 7],
    "v": [6, 7],
    "w": [7, 7],
    "x": [8, 7],
    "y": [9, 7],
    "z": [10, 7],
    "A": [1, 4],
    "B": [2, 4],
    "C": [3, 4],
    "D": [4, 4],
    "E": [5, 4],
    "F": [6, 4],
    "G": [7, 4],
    "H": [8, 4],
    "I": [9, 4],
    "J": [10, 4],
    "K": [11, 4],
    "L": [12, 4],
    "M": [13, 4],
    "N": [14, 4],
    "O": [15, 4],
    "P": [0, 5],
    "Q": [1, 5],
    "R": [2, 5],
    "S": [3, 5],
    "T": [4, 5],
    "U": [5, 5],
    "V": [6, 5],
    "W": [7, 5],
    "X": [8, 5],
    "Y": [9, 5],
    "Z": [10, 5],
    " ": [0, 2],
    '!': [1, 2],
    '\"': [2, 2],
    "#": [3, 2],
    "$": [4, 2],
    "%": [5, 2],
    "&": [6, 2],
    "'": [7, 2],
    "(": [8, 2],
    ")": [9, 2],
    "*": [10, 2],
    "+": [11, 2],
    ",": [12, 2],
    "-": [13, 2],
    ".": [14, 2],
    "/": [15, 2],
    "0": [0, 3],
    "1": [1, 3],
    "2": [2, 3],
    "3": [3, 3],
    "4": [4, 3],
    "5": [5, 3],
    "6": [6, 3],
    "7": [7, 3],
    "8": [8, 3],
    "9": [9, 3],
    ":": [10, 3],
    ";": [11, 3],
    "<": [12, 3],
    "=": [13, 3],
    ">": [14, 3],
    "?": [15, 3],
    "octo": [15, 0],
    "@": [0, 4],
    "[": [11, 5],
    "\\": [12, 5],
    "]": [13, 5],
    "~~": [7, 15],
    "^": [14, 5],
    "_": [15, 5],
    "`": [0, 6],
    "{": [11, 7],
    "|": [12, 7],
    "}": [13, 7],
    "~": [14, 7],
    "ae": [1, 9],
    "AE": [2, 9],
    "bigdot": [9, 15],
    "smalldot": [10, 15],
    "alpha": [0, 14],
    "beta": [1, 14],
    "theta": [9, 14],
    "omega": [10, 14],
    "delta": [11, 14],
    "pi": [10, 0],
    "sigma": [13, 15],
    "noise1": [0, 11],
    "noise2": [1, 11],
    "noise3": [2, 11],
    "ff": [4, 15],
};

const TILES_FROMTOWNMAP = {
    "0": "rock",
    "%": "wood",
    "/": "roofpos",
    "\\": "roofneg",
    "_": "rooftop",
    "L": "chimney",
    "+": "doorclosed",
    "!": "fountain",
    "#": "ladder",
    "]": "windowright",
    "[": "windowleft",
    "|": "antenna",
    "*": "star",
    "F": "falserock",
    "`": "surfrough",
    "~": "surf",
    ",": "water",
    /*" ": "water",
    ".": "water",
    "*": "water", //make everything underwater!!!*/
};