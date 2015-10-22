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
 * This is the hex object constructor.  It takes a cubic coordinate input.
 * @param x
 * @param y
 * @param z
 * @param color
 * @constructor
 */
function Hex(x, y, z, color) {
    //x, y, and z are the cubic coordinates of the hex.
    this.x = x;
    this.y = y;
    this.z = z;

    //Calculate x/y cartesian coordinates, store in coords.
    this.coords = {x: x * 1.5 * hexRadius, y: Math.sqrt(3) * ((x/2) + z) * hexRadius};

    //Background fill color for the tile
    this.color = color;

    /**
     * Draw draws the hex in the canvas, at the correct point in the view given the coordinates.
     */
    this.draw = function() {
        var a = (Math.PI * 2)/6;
        ctx.beginPath();
        ctx.translate(this.coords.x - viewX, this.coords.y - viewY); //offset by the viewport here
        ctx.rotate(0);
        ctx.moveTo(hexRadius,0);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(hexRadius*Math.cos(a * i), hexRadius*Math.sin(a * i));
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        ctx.fill();
        //Undo translation.  Is this the way I want to do it though?  It's a little dirty...
        ctx.translate(0 - (this.coords.x - viewX), 0 - (this.coords.y - viewY)); //reset the context's original position
    }
}

var HEXES = [];

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

//Stops all movement of the view.  Used when mouseup is detected.
function stopViewMovement() { currentViewMovementX = 0; currentViewMovementY = 0; }

//If there is a nonzero movement vector, apply it to the viewport.  Run this function every frame.
function updateMovement() { viewX += currentViewMovementX; viewY += currentViewMovementY; }

/**
 * update holds all the "every frame do this" things for now.  Later might separate these into
 * many functions, but for now it will hold every update function and thing to do every frame
 */
function update() {
    ctx.clearRect(0,0,map.width,map.height);
    drawHexes();
    updateMovement();
    scaleCanvasToContainer();
}

/**
 * Main draw function.  For now, draws all the hexagons in the HEXES array.  Later, will check which hexes are
 * in the current view, and will specifically draw them.  TODO: Tessellate hexes, including blank hexes, across view.
 */
function drawHexes() {
    for(var i = 0; i < HEXES.length; i++) {
        HEXES[i].draw();
    }
}

/**
 * If the window has changed size, scale the canvas to fit it.
 */
function scaleCanvasToContainer() {
    if(map.width != mapContainer.clientWidth || map.height != mapContainer.clientHeight) {
        map.width = mapContainer.clientWidth;
        map.height = mapContainer.clientHeight;
    }
}

//SETUP SOME TEST HEXES TO MAKE SURE EVERYTHING DISPLAYS CORRECTLY.  TODO:  REMOVE THIS BECAUSE IT'S FOR DEBUGGING
HEXES.push(new Hex(0,0,0,"#B8E68A"));
HEXES.push(new Hex(1,-1,0,"#FFFF99"));
HEXES.push(new Hex(-1,1,0,"#B8E68A"));
HEXES.push(new Hex(0,-1,1,"#B8E68A"));
HEXES.push(new Hex(0,1,-1,"#75D1FF"));
HEXES.push(new Hex(1,0,-1,"#75D1FF"));
HEXES.push(new Hex(-1,0,1,"#75D1FF"));
HEXES.push(new Hex(2,-1,-1,"#FFFF99"));

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