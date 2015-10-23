/**
 * Created by Matthew on 10/21/15.
 */

/*******************************************
 *         Initial variable setup          *
 *******************************************/

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

/*******************************************
 *         Classes and Functions           *
 *******************************************/

/**
 * This is the hex object constructor.  It takes a cubic coordinate input.
 * TODO:  Make it check the database of registered hexes, and apply the info it it's there.  Otherwise,
 *        make it white.  Then, you don't have to use "color" in the input.
 * @param x  The x parameter in the cubic coordinate system
 * @param y  The y parameter in the cubic coordinate system
 * @param z  The z parameter in the cubic coordinate system
 * @param color  TEMPORARY!  The color the hex should display as.  TODO:  Get the color from the database.
 * @constructor
 */
function Hex(x, y, z, color) {
    var that = this;
    //x, y, and z are the cubic coordinates of the hex.
    that.x = x;
    that.y = y;
    that.z = z;

    //Calculate x/y cartesian coordinates, store in coords.
    that.coords = {x: x * 1.5 * hexRadius, y: Math.sqrt(3) * ((x/2) + z) * hexRadius};

    //Background fill color for the tile
    that.color = color;

    /**
     * Draw() draws the hex on the canvas if it's visible in the viewport.
     */
    that.draw = function() {
        if(that.inView()) {
            var a = (Math.PI * 2)/6;
            ctx.beginPath();
            ctx.translate(that.coords.x - viewX, that.coords.y - viewY); //offset by the viewport here
            ctx.rotate(0);
            ctx.moveTo(hexRadius,0);
            for (var i = 1; i < 6; i++) {
                ctx.lineTo(hexRadius*Math.cos(a * i), hexRadius*Math.sin(a * i));
            }
            ctx.closePath();
            ctx.fillStyle = that.color;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
            ctx.fill();
            //Draw debug coordinates in hex
            ctx.font = "12pt Calibri";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#000000";
            ctx.fillText("(" + that.x + "," + that.y + "," + that.z + ")", 0, 0);
            //Undo translation.  Is this the way I want to do it though?  It's a little dirty...
            ctx.translate(0 - (that.coords.x - viewX), 0 - (that.coords.y - viewY)); //reset the context's original position
        }
    };

    /**
     * If the hex is visible at all in the viewport (even partially) then it returns true, else it returns false.
     * @returns {boolean}
     */
    that.inView = function() {
        //hexRadius is used as a buffer so it will display hexes that are visible but whose centers are not in view.
        return (that.coords.x > viewX - hexRadius &&
                that.coords.x < viewX + map.width + hexRadius &&
                that.coords.y > viewY - hexRadius &&
                that.coords.y < viewY + map.height + hexRadius);
    };
}

/**
 * This is the constructor for the Grid itself.  The Grid contains, most importantly, a list of hexes that are loaded
 * (and thus may be drawn if they're in the viewport).  It also contains various methods for drawing multiple hexes,
 * constructing spacial relationships between hexes, and instantiating hexes in the first place based on the viewport.
 * @constructor
 */
function Grid() {
    var that = this;  //Grid object alias.  Prevents scope bugs in methods.
    that.activeHexes = []; //This is the array where all the hexes that are being drawn or are loaded are stored.

    /**
     * The main draw function.  Attempts to draw all activeHexes by calling their draw function.  Hex.draw()
     * may still decide not to draw the hex if it's not visible in the viewport.
     */
    that.drawHexes = function() {
        for(var i = 0; i < that.activeHexes.length; i++) {
            that.activeHexes[i].draw();
        }
    };

    /**
     * getNeighbor takes in a hex and a direction.  It instantiates a new hex to this direction, and returns it.
     * @param hex  The original hex to create the outputted neighbor from
     * @param direction  The direction in relation to the original hex.  A number from 0 to 5.
     * @returns {Hex}  The neighbor in the inputted direction relative to the inputted hex.
     */
    that.getNeighbor = function(hex, direction) {
        return new Hex(hex.x + directions[direction].x, hex.y + directions[direction].y,
            hex.z + directions[direction].z, "#FFFFFF");
    };

    /**
     * getHexInDirection returns a hex at a given distance from an original hex in a given direction.  It can
     * be thought of as similar to getNeighbor, but at a changeable distance from the original hex.
     * @param hex  The original hex, from which the outputted hex is relative to.
     * @param direction  The direction, a number from 0 to 5, to get the outputted hex from
     * @param distance  The distance (in tiles) that the outputted hex will be in relation to the original hex.
     * @returns {Hex}  The returned hex according to the distance and direction, relative to the original hex.
     */
   that.getHexInDirection = function(hex, direction, distance) {
        var output = hex;
        for(var i = 0; i < distance; i++) {
            output = that.getNeighbor(output, direction)
        }
        return output;
    };

   /**
    * generateGridInView tessellates hexes across the entire current view.  The input is the cubic
    * coordinates of a center tile to tessellate from.  If the center tile and its neighbors are not visible
    * in the viewport, generateGridInView only creates the center tile and no tesselation.
    * @param x  The x cubic coordinate of the original hex
    * @param y  The y cubic coordinate of the original hex
    * @param z  The z cubic coordinate of the original hex
    */
   that.generateGridInView = function(x,y,z) {
        that.activeHexes = [];
        //create center tile
        var originHex = new Hex(x,y,z,"#FF0000");
        that.activeHexes.push(originHex);

        /**Generation of the full tessellation is done by generating concentric rings, checking if each one is within the
         canvas view, and stopping the generation if none of the hexes in the ring are in view. */
        for(var ringRadius = 1; ringRadius < 50; ringRadius++) {
            var ringContainsDrawableHex = false; //"Stop the loop" flag.  If nothing is drawn in this ring, don't do more rings
            var currentHex = that.getHexInDirection(originHex, 4, ringRadius); //4 is arbitrary here.  Starts ring at bottom-left.
            currentHex.color = "#FF44FF"; //just to see the ring separately
            //You don't need to push the original currentHex -- it will be done at the very end of each ring.
            //Draw the ring!
            for(var currentDirection = 0; currentDirection < 6; currentDirection++) {
                for(var j = 0; j < ringRadius; j++) {
                    currentHex = that.getNeighbor(currentHex, currentDirection);
                    if(currentHex.inView()) {
                        that.activeHexes.push(currentHex);
                        ringContainsDrawableHex = true;
                    }
                }
            }
            if(!ringContainsDrawableHex) { break; } //Loop termination, no further rings from here will have a drawable hex.
        }
    };
}

/**
 * update is called many times each second (using requestAnimationFrame(update)).  It applies all the periodic updates
 * that are necessary for the program.
 */
function update() {
    requestAnimationFrame(update); //This is the main update "loop".  Ignore WebStorm, it only takes one argument!
    ctx.clearRect(0,0,map.width,map.height);
    scaleCanvasToContainer(); //KEEP THIS BEFORE DRAWING FUNCTION!  It stops the flicker bug!  Woohoo!
    Grid.drawHexes();
    drawCenterDot();
    updateMovement();
}

function drawCenterDot() {
    ctx.fillStyle = "#0000FF";
    ctx.beginPath();
    ctx.arc(map.width/2,map.height/2,3,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
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

/**Various minor functions for movement and events.  For sanity's sake, I'm not going
 * to bother with the jsdoc comments for each and every one of them.  They're really
 * self-explanatory anyways.*/

//Setup the actual functions for how movement works
function moveViewWest() {currentViewMovementX = 0 - moveSpeed;}
function moveViewEast() {currentViewMovementX = moveSpeed;}
function moveViewNorth() {currentViewMovementY = 0 - moveSpeed;}
function moveViewSouth() {currentViewMovementY = moveSpeed;}

//Stops all movement of the view.  Used when mouseup is detected.
function stopViewMovement() {stopHorizontalViewMovement(); stopVerticalViewMovement(); }
//Separated into horizontal and vertical.  This is so I can separately deal with keyUp arrow key movement.
function stopHorizontalViewMovement() { currentViewMovementX = 0; }
function stopVerticalViewMovement() { currentViewMovementY = 0; }

//If there is a nonzero movement vector, apply it to the viewport.  Run this function every frame.
function updateMovement() { viewX += currentViewMovementX; viewY += currentViewMovementY; }

//KeyPress function for keyboard event listener.  Currently, it's only used for debugging keys.
function getKeyPress(e) {
    if(e.keyCode == 71) { //G key.  Tessellates the grid to 0,0,0.  Debug only.
        Grid.generateGridInView(0,0,0);
    }
    if(e.keyCode == 37) { moveViewWest(); }
    if(e.keyCode == 38) { moveViewNorth(); }
    if(e.keyCode == 39) { moveViewEast(); }
    if(e.keyCode == 40) { moveViewSouth(); }
}

function getKeyUp(e) {
    //stopping all movement freezes the view for a split second when I use it, so I split it into horizontal/vertical
    if(e.keyCode == 37 || e.keyCode == 39) { stopHorizontalViewMovement(); }
    if(e.keyCode == 38 || e.keyCode == 40) { stopVerticalViewMovement(); }
}

/*******************************************
 *            Event Listeners              *
 *******************************************/

//Setup event listeners for the movement buttons
document.getElementById("westButton").addEventListener("mousedown", moveViewWest);
document.getElementById("eastButton").addEventListener("mousedown", moveViewEast);
document.getElementById("northButton").addEventListener("mousedown", moveViewNorth);
document.getElementById("southButton").addEventListener("mousedown", moveViewSouth);

//Add movement termination event, on mouse up
window.addEventListener("mouseup", stopViewMovement);

//Get arrow key codes -- used for alternative movement and also grid
window.addEventListener("keydown", getKeyPress);
window.addEventListener("keyup", getKeyUp);

/********************************************************************
 * Instantiations, initializations, finalization, last minute calls *
 ********************************************************************/

//Instantiate the grid itself.
Grid = new Grid();

//Test full tessellation
Grid.generateGridInView(0,0,0);

//Start the update loop
update();




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