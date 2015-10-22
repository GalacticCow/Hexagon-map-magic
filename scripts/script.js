/**
 * Created by Matthew on 10/21/15.
 */

//Get canvas's element.  Used for drawing the grids and whatnot
map = document.getElementById("map");
var ctx = map.getContext("2d");

mapContainer = document.getElementById("mapContainer");

//length of edge, or radius from center to vertex.
var hexRadius = 50;

//viewport variables.  Default to geographic 0,0 being middle of screen.
var viewX = 0 - map.width/2;
var viewY = 0 - map.height/2;

//movement speed, pixels per frame that the viewport moves when you press the movement buttons.
var moveSpeed = 7;

//When moving (between mousedown and mouseup) store movement vector in these two variables.
var currentViewMovementX = 0;
var currentViewMovementY = 0;

//Hex movement model.  Add each of these to the relative cubic coordinates to move in a direction.
var directions = [ {x:1, y:-1, z:0}, {x:1, y:0, z:-1}, {x:0, y:1, z:-1},
                   {x:-1, y:1, z:0}, {x:-1, y:0, z:1}, {x:0, y:-1, z:1} ];

/**
 * This is the hex object constructor.  It takes a cubic coordinate input.
 * TODO:  Make it check the database of registered hexes, and apply the info it it's there.  Otherwise,
 *        make it white.  Then, you don't have to use "color" in the input.
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
    requestAnimationFrame(update); //This is the main update "loop".  Ignore WebStorm, it only takes one argument!
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
        //Reset the view to the origin hex.  TODO:  Decide once and for all if I want this to happen
        viewX = 0 - map.width/2;
        viewY = 0 - map.height/2;
    }
}

/**
 * generateGridInView tessellates hexes across the entire current view.  The input is the cubic
 * coordinates of a center tile to tessellate from.
 * @param x
 * @param y
 * @param z
 */
function generateGridInView(x,y,z) {
    HEXES = [];
    //create center tile
    var originHex = new Hex(x,y,z,"#FF0000");
    HEXES.push(originHex);

    /**Generation of the full tessellation is done by generating concentric rings, checking if each one is within the
    canvas view, and stopping the generation if none of the hexes in the ring are in view. */
    for(var ringRadius = 1; ringRadius < 25; ringRadius++) {
        var ringContainsDrawableHex = false; //"Stop the loop" flag.  If nothing is drawn in this ring, don't do more rings
        var currentHex = getHexInDirection(originHex, 4, ringRadius); //4 is arbitrary here.  Starts ring at bottom-left.
        currentHex.color = "#FF44FF"; //just to see the ring separately
        //You don't need to push this hex -- it will be done at the very end of each ring.

        //Draw the ring!
        for(var currentDirection = 0; currentDirection < 6; currentDirection++) {
            for(var j = 0; j < ringRadius; j++) {
                currentHex = getNeighbor(currentHex, currentDirection);
                if(hexIsInView(currentHex)) {
                    HEXES.push(currentHex);
                    ringContainsDrawableHex = true;
                }
            }
        }
        if(!ringContainsDrawableHex) { break; } //Loop termination, no further rings from here will have a drawable hex.
    }
}
/**Returns true if the hex is in the view, false if it is not.**/
function hexIsInView(hex) {
    //hexRadius is used as a buffer so it will display hexes that are visible but whose centers are not in view.
    return (hex.coords.x > viewX - hexRadius &&
            hex.coords.x < viewX + map.width + hexRadius &&
            hex.coords.y > viewY - hexRadius &&
            hex.coords.y < viewY + map.height + hexRadius);
}


/**Input a hex and a direction, it gives back the hex in that direction.  Direction is number from 0 to 5**/
function getNeighbor(hex, direction) {
    return new Hex(hex.x + directions[direction].x, hex.y + directions[direction].y,
        hex.z + directions[direction].z, hex.color);
}

/**Gets a hex at an inputted distance in an inputted direction relative to a source hex**/
function getHexInDirection(hex, direction, distance) {
    var output = hex;
    for(var i = 0; i < distance; i++) {
        output = getNeighbor(output, direction)
    }
    return output;
}

//Test full tessellation
generateGridInView(0,0,0);

//To generate a new tesselation across the rectangle, press g.
window.addEventListener("keydown", getKeyPress);
function getKeyPress(e) {
    console.log("in keypress? key = " + e);
    if(e.keyCode == 71) {
        generateGridInView(0,0,0);
    }
}

update();

//Set regular screen updates via updateDisplay()

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