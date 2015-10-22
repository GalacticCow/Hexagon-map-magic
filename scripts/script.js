/**
 * Created by Matthew on 10/21/15.
 */

//Get canvas's element.  Used for drawing the grids and whatnot
map = document.getElementById("map");
var ctx = map.getContext("2d");

//Get button elements.  Used for moving the map around
westButton = document.getElementById("westButton");
eastButton = document.getElementById("eastButton");
northButton = document.getElementById("northButton");
southButton = document.getElementById("southButton");

//length of edge, or radius from center to vertex.
var hexRadius = 30;

/**
 * Draws a hexagon centered at the given x/y coordinates.
 * @param ctx
 * @param x
 * @param y
 */
function drawHex(ctx, x, y) {
    var a = (Math.PI * 2)/6;
    ctx.beginPath();
    ctx.translate(x,y);
    ctx.rotate(0); //maybe if I use pointy top rather than flat top, change this
    ctx.moveTo(hexRadius,0);
    for (var i = 1; i < 6; i++) {
        ctx.lineTo(hexRadius*Math.cos(a * i), hexRadius*Math.sin(a * i));
    }
    ctx.closePath();
    ctx.fillStyle = "#B8E68A";
    ctx.strokeStyle = "#000000";
    ctx.stroke();
    ctx.fill();
    //Undo translation.  Is this the way I want to do it though?  It's a little dirty...
    ctx.translate(0 - x, 0 - y);
}

/**
 * Takes in cubic coordinates.  Converts them to cartesian, then draws a hexagon there.
 * @param x
 * @param y
 * @param z
 */
function drawHexFromCubic(x,y,z) {
    var coords = getCartFromCubic(x,y,z);
    drawHex(ctx, coords.x, coords.y);
}

/**
 * Takes in cubic coordinates, verifies they are reasonable, and returns a cartesian coordinate pair.
 * @param x
 * @param y
 * @param z
 * @returns {{x: number, y: number}}
 */
function getCartFromCubic(x,y,z) {
    if(x + y + z != 0) {
        console.log("Error:  your cubic coordinates don't add up.");
    }
    var cartX = map.width/2 + (x * 1.5 * hexRadius);
    var cartY = map.height/2 + (Math.sqrt(3) * ((x/2) + z) * hexRadius);
    return {x: cartX, y: cartY}; //object with .x and .y coordinates
}

/**Test drawHexFromCubic hexagons via coordinates*/
drawHexFromCubic(0,0,0);
drawHexFromCubic(3,-2,-1);
drawHexFromCubic(-1,0,1);
drawHexFromCubic(1,-1,0);
drawHexFromCubic(-2,-1,3);
drawHexFromCubic(0,1,-1);
drawHexFromCubic(1,-2,1);
drawHexFromCubic(-2,4,-2);

/*
 Resources I've been using for stuff.  Will probably come in handy later.

 y = 3/2 * s * b
 b = 2/3 * y / s
 x = sqrt(3) * s * ( b/2 + r)
 x = - sqrt(3) * s * ( b/2 + g )
 r = (sqrt(3)/3 * x - y/3 ) / s
 g = -(sqrt(3)/3 * x + y/3 ) / s

 r + b + g = 0

 http://i.imgur.com/AJoDm.gif
 http://www.redblobgames.com/grids/hexagons/

 Current stackoverflow thread for full tesselation:
 http://stackoverflow.com/questions/33271449/tessellating-hexagons-over-a-rectangle
 */