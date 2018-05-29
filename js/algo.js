/*
 *
 */


var Algo = {

}
Algo.bresenham = function (x1, y1, x2, y2) {
    let dx = Math.abs(x2 - x1), sx = Math.sign(x2 - x1);
    let dy = -Math.abs(y2 - y1), sy = Math.sign(y2 - y1);
    let error = dx + dy, error2;
    let points = [];
    
    for (; ;) {
        points.push([x1, y1]);
        if (x1 === x2 && y1 === y2) { break }
        error2 = error * 2;
        if (error2 >= dy) {
            error += dy;
            x1 += sx;
        }
        if (error2 <= dx) {
            error += dx;
            y1 += sy;
        }
    }
    return points;
}