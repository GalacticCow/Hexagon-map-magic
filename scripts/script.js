/**
 * Created by Matthew on 10/21/15.
 */

//Get canvas's element.  Used for drawing the grids and whatnot
map = document.getElementById("map");
var ctx = map.getContext("2d");

mapContainer = document.getElementById("mapContainer");

//length of edge, or radius from center to vertex.
var hexRadius = 30;

//viewport variables.  Default to geographic 0,0 being middle of screen.
var viewX = 0 - map.width/2;
var viewY = 0 - map.height/2;

//movement speed, pixels per frame that the viewport moves when you press the movement buttons.
var moveSpeed = 3;

//When moving (between mousedown and mouseup) store movement vector in these two variables.
var currentViewMovementX = 0;
var currentViewMovementY = 0;

/**
 * Draws a hexagon centered at the given x/y coordinates.
 * @param ctx
 * @param x
 * @param y
 */
function drawHex(ctx, x, y) {
    var a = (Math.PI * 2)/6;
    ctx.beginPath();
    ctx.translate(x - viewX,y - viewY); //offset by the viewport here
    ctx.rotate(0);
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
    ctx.translate(0 - (x - viewX), 0 - (y - viewY)); //reset the context back to the original position.
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
 * Coordinates centered around (0,0,0)/(0,0) point.
 * @param x
 * @param y
 * @param z
 * @returns {{x: number, y: number}}
 */
function getCartFromCubic(x,y,z) {
    if(x + y + z != 0) {
        console.log("Error:  your cubic coordinates don't add up.");
    }
    var cartX = x * 1.5 * hexRadius;
    var cartY = Math.sqrt(3) * ((x/2) + z) * hexRadius;
    return {x: cartX, y: cartY}; //object with .x and .y coordinates
}

//Setup event listeners for the movement buttons
document.getElementById("westButton").addEventListener("mousedown", moveViewWest);
document.getElementById("eastButton").addEventListener("mousedown", moveViewEast);
document.getElementById("northButton").addEventListener("mousedown", moveViewNorth);
document.getElementById("southButton").addEventListener("mousedown", moveViewSouth);

//Add movement termination event, on mouse up
window.addEventListener("mouseup", stopViewMovement);

//Setup the actual functions for how movement works
function moveViewWest() {currentViewMovementX = 0 - moveSpeed;}
function moveViewEast() {currentViewMovementX = moveSpeed;}
function moveViewNorth() {currentViewMovementY = 0 - moveSpeed;}
function moveViewSouth() {currentViewMovementY = moveSpeed;}

/**
 * Stops all movement of the view.  Used when mouseup is detected.
 */
function stopViewMovement() {
    currentViewMovementX = 0;
    currentViewMovementY = 0;
}

/**
 * If there is a nonzero movement vector, apply it to the viewport.  Run this function every frame.
 */
function updateMovement() {
    viewX += currentViewMovementX;
    viewY += currentViewMovementY;
}

/**
 * update holds all the "every frame do this" things for now.  Later might separate these into
 * many functions, but for now it will hold every update function and thing to do every frame
 */
function update() {
    ctx.clearRect(0,0,map.width,map.height);
    drawSampleHexes(); //DEBUG
    updateMovement();
    scaleCanvasToContainer();
}

function scaleCanvasToContainer() {
    if(map.width != mapContainer.clientWidth || map.height != mapContainer.clientHeight) {
        console.log("mw=" + map.width +" mh=" + map.height +
            " mcw=" + mapContainer.clientWidth + " mch=" + mapContainer.clientHeight);
        map.width = mapContainer.clientWidth;
        map.height = mapContainer.clientHeight;
        //recenter viewport.  TODO:  Make it not snap back to center after resizing
        viewX = 0 - map.width/2;
        viewY = 0 - map.height/2;
    }
}

/**
 * DEBUG:  Draws a bunch of various hexagons around the map.
 */
function drawSampleHexes() {
    drawHexFromCubic(0,0,0);
    drawHexFromCubic(1,0,-1);
    drawHexFromCubic(6,-4,-2);
    drawHexFromCubic(-1,-2,3);
    drawHexFromCubic(2,-2,0);
    drawHexFromCubic(1,4,-5);
}

//Set regular screen updates via updateDisplay()
setInterval(update, 1000/60);

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