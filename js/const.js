/*
 *  constants
 */

"use strict";


/*
 * global simple functions to make things prettier
 */

const CHAR = code => String.fromCharCode(code);
const POINTDIR = (xf, yf, xt, yt) => Math.atan2(yt - yf, xt - xf);
const REMOVED = (arrayOld, item) => arrayOld.filter(el => el !== item);
const ITERABLE = obj => obj != null && typeof obj[Symbol.iterator] === 'function';
const LOG = (x) => console.log(x);

const INCLUDES = (lis, value) => {
    for (let i of lis) {
        if (i === value) { return true; }
    }
    return false;
};



/*
 * CONTANT VALUES
 */

// game data

const TILEW = 12;
const TILEH = 16;
const TILESET_SOURCE = "/../tilesets/terminal_12x16.png";

// gameplay constants //

const SURFY = 23;
const COST_MOVE = 10;
const COST_PICKUP = 10;
const COST_FIGHT = 10;
const AVG_SPEED = 10;
const TURN_LENGTH = 10;
const DEPTHO2DIV = 100; // meters down before oxygen loss increases by multiple of 1
const PRESSURE = 100; //
//const COSTMULT_MOVE_VERTICAL = 1; // multiplier: time cost to move up or down

// Colors //

const WHITE = "#ffffff";
const BLACK = "#000000";
const BROWN = "#5b3927";
const NEUTRAL = "#3c823d";
const DEEP = "#182219";
const RED = "#ff240e";
const YELLOW = "#f3c512";
const GREEN = "#00d131";
const SEAGREEN = "#21401e";
const SEAFOAM = "#4cc293";
const SKYBLUE = "#265eb5";

// Flags

let i = 0;
const NEEDSAIR = i; i += 1;
const CANCLIMB = i; i += 1; // can climb ladders
const SINKS = i; i += 1;
const FLOATS = i; i += 1;
const ISACTOR = i; i += 1;
const BLEEDING = i; i += 1;


/*
 * data objects
 */

i = 0;
const ROOM_TOWN = "town";
const ROOM_SEAS = "seas";
const ROOMNAMES = {
    "town": "Wessenerville",
    "seas": "the Seas of Morudia",
}

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
    "stairsright": [5, 14],
};

const TILES_FROMTOWNMAP = {
    "0": "rock",
    "/": "roofpos",
    "\\": "roofneg",
    "_": "rooftop",
    "L": "chimney",
    "+": "dooropen",
    "u": "well",
    "#": "ladder",
    "]": "windowright",
    "[": "windowleft",
    "|": "antenna",
    "*": "star",
    "F": "falserock",
    "S": "stairsright",
    "`": "surfrough",
    "~": "surf",
    ",": "water",
};