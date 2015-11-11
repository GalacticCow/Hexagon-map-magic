/**
 * Created by Matthew on 10/21/15.
 */

/*******************************************
 *         Initial variable setup          *
 *******************************************/

//Get canvas's element.  Used for drawing the grids and whatnot
var map = document.getElementById("map");
var ctx = map.getContext("2d");
var mapContainer = document.getElementById("mapContainer");

//length of edge, or radius from center to vertex.
var hexRadius = 60;

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

//HexBufferDistance is the manhattan distance the view needs to move to re-generate the grid.
//It's also used in the calculation to decide how big the grid needs to generate to.
var hexBufferDistance = 10;

//The mouse's position relative to the canvas.
var mouseX = 0, mouseY = 0;

//A variable storing whether or not the mouse is over a UI button (in which case forbid the use of tools)
var mouseOverButton = false;

//The main Grid object, empty until its constructor is called later.
var theGrid;

//The main LookupTable object.
var theTable;

//The main Menu object.
var theMenu;

//doNothing is used as a default for onApply and onReturn functions for tools.  Self explanatory, a doNothing function
//does nothing, so the return and apply statements just don't do things.
var doNothing = function() {};

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
 * @constructor
 */
function Hex(x, y, z) {
    var that = this;
    //x, y, and z are the cubic coordinates of the hex.
    that.x = x;
    that.y = y;
    that.z = z;

    //Calculate x/y cartesian coordinates, store in coords.
    that.coords = {x: x * 1.5 * hexRadius, y: Math.sqrt(3) * ((x/2) + z) * hexRadius};

    that.color = theTable.getProperty(x,y,z, "color");
    that.label = theTable.getProperty(x,y,z, "label");
    that.icon  = theTable.getProperty(x,y,z, "icon");
    that.paragraph = theTable.getProperty(x,y,z, "paragraph");

    /**
     * Draw() draws the hex on the canvas if it's visible in the viewport.
     */
    that.draw = function() {
        if(that.inView()) {
            var a = (Math.PI * 2)/6;
            ctx.beginPath();
            ctx.translate(that.coords.x - viewX, that.coords.y - viewY); //offset by the viewport here
            ctx.moveTo(hexRadius,0);
            for (var i = 1; i < 6; i++) {
                ctx.lineTo(hexRadius*Math.cos(a * i), hexRadius*Math.sin(a * i));
            }
            ctx.closePath();

            ctx.fillStyle = that.color;
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
            ctx.fill();

            //Now draw the label if it exists
            if(that.label != "") {
                ctx.font = "10px Arial";
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText(that.label,0,0);
            }

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

    /**
     * returns true if the viewport is within the buffer zone ( a larger rectangle around the viewport, specifically
     * 2 * hexBufferDistance * hexRadius pixels larger ).
     */
    that.inBufferZone = function() {
        //Because of how hexes work apparently, I need to double the buffer distance.
        //Then, again because of some weird hex wizardry. I need to add 1 * hexRadius to the y coordinates.
        //This lets the grid generate only when it's absolutely necessary.
        return (that.coords.x > viewX - hexRadius * (hexBufferDistance * 2) &&
                that.coords.x < viewX + map.width + hexRadius * (hexBufferDistance * 2) &&
                that.coords.y > viewY - hexRadius * (hexBufferDistance * 2 + 1) &&
                that.coords.y < viewY + map.height + hexRadius * (hexBufferDistance * 2 + 1) );
    };

    /**
     * Checks a given x/y coordinate point, and returns true if the point lies in this hex.
     * @param x
     * @param y
     * @returns {boolean}
     */
    that.pointInHex = function(x, y) {
        var cubicCoords = convertCartToCubic(x,y);
        //round the coordinates.
        cubicCoords = roundCubicToHex(cubicCoords);
        return (cubicCoords.x == that.x && cubicCoords.y == that.y && cubicCoords.z == that.z);
    };

    /**
     * Compares this hex with another hex.  Returns true if they have the same cubic coordinates, false otherwise
     * @param otherHex  Another hex object, to be compared to this one
     * @returns {boolean}  Whether or not the two hexes have the same cubic coordinates
     */
    that.equivalent = function(otherHex) {
        return (that.x == otherHex.x && that.y == otherHex.y && that.z == otherHex.z);
    };

    /**
     * Returns the distance between this hex and another hex.
     * @param otherHex  The other hex that this hex is to be compared to
     * @returns {number} The manhattan-distance between the two hexes.
     */
    that.distanceFrom = function(otherHex) {
        return Math.max(Math.abs(that.x - otherHex.x), Math.abs(that.y - otherHex.y), Math.abs(that.z - otherHex.z));
    }
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
            hex.z + directions[direction].z);
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
     * in the viewport, generateGridInView only creates the center tile and no tesselation.  If the center tile
     * is already in the middle of the screen, grid generation will be pointless, so don't bother with it.
     * @param x  The x cubic coordinate of the original hex
     * @param y  The y cubic coordinate of the original hex
     * @param z  The z cubic coordinate of the original hex
     */
    that.generateGridInView = function(x,y,z) {

        var originHex = new Hex(x,y,z);
        if(!that.shouldGenerateNewGrid(originHex)) { return; }

        //Now that we know it's a different (new) hex, start the tesselation in earnest.
        that.activeHexes = [];
        that.activeHexes.push(originHex);

        /**Generation of the full tessellation is done by generating concentric rings, checking if each one is within the
         canvas view, and stopping the generation if none of the hexes in the ring are in view. */
        for(var ringRadius = 1; ringRadius < 50; ringRadius++) {
            var ringContainsDrawableHex = false; //"Stop the loop" flag.  If nothing is drawn in this ring, don't do more rings
            var currentHex = that.getHexInDirection(originHex, 4, ringRadius); //4 is arbitrary here.  Starts ring at bottom-left.

            //You don't need to push the original currentHex -- it will be done at the very end of each ring.
            //Draw the ring!
            for(var currentDirection = 0; currentDirection < 6; currentDirection++) {
                for(var j = 0; j < ringRadius; j++) {
                    currentHex = that.getNeighbor(currentHex, currentDirection);
                    if(currentHex.inBufferZone()) { //use inBufferZone because it defines how big the tesselation should be.
                        that.activeHexes.push(currentHex);
                        ringContainsDrawableHex = true;
                    }
                }
            }
            if(!ringContainsDrawableHex) { break; } //Loop termination, no further rings from here will have a drawable hex.
        }
    };

    /**
     * Returns true if the viewport is far enough away from the origin tile to need to re-generate the grid,
     * or if the grid hasn't been generated yet.
     * @param originHex  The current hex to generate from -- is it far enough away?
     * @returns {boolean}  Whether or not a new tesselation should be generated.
     */
    that.shouldGenerateNewGrid = function(originHex) {
        if(that.activeHexes.length > 0) { //Accounts for initial scenario where getting activeHexes[0] causes an error
            if(originHex.distanceFrom(that.activeHexes[0]) <= hexBufferDistance) {
                return false;
            }
        }
        return true;
    };

    /**
     *  Deletes the list of tiles, forcing the grid to be regenerated regardless of position.
     */
    that.forceGridRegeneration = function() {
        that.activeHexes = [];
    };

    /**
     * Tries to find an active hex at the point given.  If it finds it, returns it.  Else, returns undefined.
     * @param x
     * @param y
     * @param z
     * @returns {*}  Hex, or undefined.  Check both when using this function
     */
    that.activeHexAt = function(x,y,z) {
        for(var i = 0; i < that.activeHexes.length; i++) {
            if(that.activeHexes[i].equivalent(new Hex(x,y,z))) {
                return that.activeHexes[i];
            }
        }
        return undefined;
    }
}

/**
 * LookupTable is an implementation of a hash table using Javascript's associative arrays.
 * @constructor
 */
function LookupTable() {
    var that = this;
    that.table = [];  //This is the actual associative array.  Lookup that.table[key] to get the hex info

    /**
     * Creates a lookup table based on the JSON file inputted.  This is the "load map" functionality.
     * @param JSONFilePath  The path of the .JSON file.
     */
    that.createTable = function(JSONFilePath) {
        that.table = []; //clear the previous table (if loading over an existing map)
        that.loadJSON(JSONFilePath,
            that.convertJSONDataToTable,
            function(xhr) { console.error(xhr); }
        );
    };

    /**
     * Actually does the XML request for the JSON loading.
     * @param path  The path of the JSON file
     * @param success  A function taking a "data" parameter (the JSON.parse-ed object) to be called upon successfully
     * loading the JSON file.  For now this should be convertJSONDataToTable.
     * @param error   A function taking the error log as a parameter, to be called upon failure to load the file.
     */
    that.loadJSON = function(path, success, error)
    {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (success)
                        success(JSON.parse(xhr.responseText));
                } else {
                    if (error)
                        error(xhr);
                }
            }
        };
        xhr.open("GET", path, true);
        xhr.send();
    };

    /**
     * Takes in the JSON-created object.  Uses that to create the associative array (the hash table).
     * The key will be in the form of "x y z" with spaces to separate the values.
     * @param data  The JSON object that has been JSON.parse()-ed
     */
    that.convertJSONDataToTable = function(data) {
        for(var i = 0; i < data.hexes.length; i++) {
            //The key will be an {x,y,z} object containing the hex's coords.  Value is the below info (an object).
            var key = data.hexes[i].x + " " + data.hexes[i].y + " " + data.hexes[i].z;
            that.table[key] = {
                color: data.hexes[i].color,
                icon: data.hexes[i].icon,
                label: data.hexes[i].label,
                paragraph: data.hexes[i].paragraph
            }
        }
        /**Important!  This is the real point where it's confirmed everything has loaded.*/
        //Redraw the grid with the newly created stuff if it already drew (prevents race conditions from loading
        //the grid before the XML request finishes.  Sometimes happens.).
        theGrid.forceGridRegeneration();
        //Now remove the overlay.  This is the real reason this thing exists!
        removeLoadingOverlay();
    };

    /**
     * Converts a set of cubic coordinates to a string that can be used as a key for the table.
     * @param x  the x value of the coordinate
     * @param y  the y value of the coordinate
     * @param z  the z value of the coordinate
     * @returns {string}  a key that can be used in the lookup table.
     */
    that.keyify = function(x, y, z){
        return x + " " + y + " " + z;
    };

    /**
     * Takes in a set of cubic coordinates, and a property name, and returns that property if it exists,
     * or a default property if it doesn't.
     * @param x  The x value
     * @param y  The y value
     * @param z  The z value
     * @param property
     * @returns {*}  The property you requested, or a default property if the entry isn't there.
     */
    that.getProperty = function(x, y, z, property){
        var key = that.keyify(x,y,z);
        if((key in that.table)) { //
            if(property == "color"     ) { return that.table[key].color; }
            if(property == "label"     ) { return that.table[key].label; }
            if(property == "icon"      ) { return that.table[key].icon; }
            if(property == "paragraph" ) { return that.table[key].paragraph; }
        }
        else {
            if(property == "color"     ) { return "#FFFFFF"; }
            else { return ""; } //everything else defaults to "".
        }

    };

    /**
     * Sets a property in a given hex to something different, then updates it in the table and the grid.
     * @param x
     * @param y
     * @param z
     * @param property
     * @param value
     */
    that.setProperty = function(x, y, z, property, value) {
        var key = that.keyify(x,y,z);
        //Get the entry to update (either grab it from the table or make a new one if it's not there).
        var updatedEntry;
        if((key in that.table)) { updatedEntry = that.table[key]; }
        else { updatedEntry = that.createBlankEntryAtCoords(x,y,z); }

        //Now do the actual operation.  Change the inputted property to the inputted value.
        if(property == "color"     ) { updatedEntry.color     = value; }
        if(property == "label"     ) { updatedEntry.label     = value; }
        if(property == "icon"      ) { updatedEntry.icon      = value; }
        if(property == "paragraph" ) { updatedEntry.paragraph = value; }
        that.table[key] = updatedEntry; //apply the change.

        //set color in Grid if it's actually in the grid, so it changes immediately rather than on reload.
        var hexThere = theGrid.activeHexAt(x,y,z);
        if(hexThere != undefined) {
            if(property == "color")     { hexThere.color     = value; }
            if(property == "label")     { hexThere.label     = value; }
            if(property == "icon" )     { hexThere.icon      = value; }
            if(property == "paragraph") { hexThere.paragraph = value; }
        }
    };

    /**
     * When there isn't an entry in the table, the LookupTable has to create a new one before it starts
     * applying various changes to it.  This function creates ta default "blank" entry at the inputted cubic coords.
     * @param x
     * @param y
     * @param z
     * @returns {{x: *, y: *, z: *, color: string, icon: string, label: string, paragraph: string}}
     */
    that.createBlankEntryAtCoords = function(x,y,z) {
        return {x: x, y: y, z: z, color: "#FFFFFF", icon: "", label: "", paragraph: ""};
    };

    that.deleteHex = function(x,y,z) {
        var key = that.keyify(x,y,z);
        if((key in that.table)) {
            delete that.table[key];
        }
        //Now update the actual displayed hex so you don't have to wait for it to be reloaded to show deletion
        var hexThere = theGrid.activeHexAt(x,y,z);
        if(hexThere != undefined) {
            hexThere.color = "#FFFFFF";
            hexThere.icon = "";
            hexThere.label = "";
            hexThere.paragraph = "";
        }
    }
}

/**
 * An object that deals with the Menu, switching between items, and storing the currently selected tool.
 * It also creates all the tools, and stores the master list of tools and their information.
 * @constructor
 */
function Menu() {
    var that = this;
    that.currentTool = ""; //No tool selected right now

    //All the tools, and relevant specific data.  TODO:  Make this a JSON config file.
    that.toolData = [["palette", false, doNothing, "palette_icon.png"],
                     ["label", true, function(x,y,z) {theTable.setProperty(x,y,z, "label", theMenu.currentLabel);}, "label_icon.png"],
                     ["icon", true, function(x,y,z) {theTable.setProperty(x,y,z, "icon", theMenu.currentIcon);}, "icon_icon.png"],
                     ["brush", true, function(x,y,z) {theTable.setProperty(x,y,z, "color", theMenu.currentColor);}, "brush_icon.svg"],
                     ["eraser", true, function(x,y,z) {theTable.deleteHex(x,y,z);}, "eraser_icon.png"]];

    that.toolNameToElement = []; //associative array that stores the tool button element for each tool.
    that.Tools = []; //The actual array of Tool objects, created after this.

    for(var i = 0; i < that.toolData.length; i++) {
        //Call constructor on tools.  This creates the menu elements too!
        that.Tools[that.toolData[i][0]] = new Tool(that.toolData[i][0], that.toolData[i][1], that.toolData[i][2], that.toolData[i][3]);
        that.toolNameToElement[that.toolData[i][0]] = document.getElementById(that.toolData[i][0] + "Button");
    }

    //Special case:  add color display to palette tool
    var colorDisplay = document.createElement("DIV");
    colorDisplay.id = "colorDisplay";
    that.toolNameToElement["palette"].appendChild(colorDisplay);

    //Defaults for picker tools.
    that.currentColor = "#FFFFFF";
    that.currentLabel = "Hey~!";
    that.currentIcon = "tree";

    /**
     * Deselects the previous tool, selects the current tool.
     * @param toolName  A string giving the name of a tool (e.g. "palette", "icon", "label", "brush")
     */
    that.switchTool = function(toolName) {
        console.log("switch to " + toolName);
        var oldTool = that.currentTool;
        if(that.currentTool != "") {  //Turn off the currently selected tool
            that.toggleSelection(that.currentTool);
        }
        if(oldTool != toolName) { //If it's a new tool (and not just turning off the old one) then switch it on.
            that.toggleSelection(toolName);
        }
        //Here, move the colorpicker offstage if you're deselecting the pallete
        if(that.currentTool != "palette") {
            document.getElementById('mycolorpicker').style.right = "-400px";
        }
    };

    /**
     * Turns a currently selected tool "off" (makes the button slide back up), or turns another tool "on"
     * @param toolName
     */
    that.toggleSelection = function(toolName) {
        console.log(toolName);
        if(that.currentTool == toolName) {
            that.toolNameToElement[toolName].style.marginTop = "";
            that.toolNameToElement[toolName].style.backgroundColor = "";
            that.currentTool = "";
        }
        else {
            that.toolNameToElement[toolName].style.marginTop = "0px";
            that.toolNameToElement[toolName].style.backgroundColor = "rgba(50,50,50,0.6)";
            that.currentTool = toolName;
            //Special case:  palette brings up the color picker.
            if(toolName == 'palette') {
                document.getElementById("mycolorpicker").style.right = "0px";
            }
        }
    };

    /**
     * Used by mouse event on the map, does exactly what it sounds like.  Calls the apply function for
     * the current tool.
     */
    that.applyCurrentTool = function() {
        if(that.currentTool != "") {
            that.Tools[that.currentTool].apply();
        }
    }
}


/**
 * update is called many times each second (using requestAnimationFrame(update)).  It applies all the periodic updates
 * that are necessary for the program.
 */
function updateDisplay() {
    requestAnimationFrame(updateDisplay); //This is the main update "loop".  Ignore WebStorm, it only takes one argument!
    ctx.clearRect(0,0,map.width,map.height);
    scaleCanvasToContainer(); //KEEP THIS BEFORE DRAWING FUNCTION!  It stops the flicker bug!  Woohoo!
    theGrid.drawHexes();
}

/**
 * genUpdates is used in the setInterval function.  It should be used for things that should run asynchronously from
 * the display loop, like movement and grid generation.  TODO:  Name this something better.
 */
function genUpdates() {
    updateMovement();
    updateGridGeneration();
}

/**
 * This function attempts to tessellate the grid using the viewport center as the origin.
 */
function updateGridGeneration() {
    var cubics = roundCubicToHex(convertCartToCubic(viewX + map.width/2, viewY + map.height/2));
    theGrid.generateGridInView(cubics.x, cubics.y, cubics.z);
}

/**
 * If the window has changed size, scale the canvas to fit it.
 */
function scaleCanvasToContainer() {
    if(map.width != mapContainer.clientWidth || map.height != mapContainer.clientHeight) {
        map.width = mapContainer.clientWidth;
        map.height = mapContainer.clientHeight;
        //Reset the view to the origin hex.
        viewX = 0 - map.width/2;
        viewY = 0 - map.height/2;
        theGrid.forceGridRegeneration(); //This should regenerate the grid with the proper buffer for the canvas size.
    }
}

/**
 * Converts a cartesian coordinate (x,y) to a cubic coordinate (x,y,z).
 * @param x  The cartesian x coordinate of the point to be converted
 * @param y  The cartesian y coordinate of the point to be converted
 * @returns {{x: number, y: number, z: number}}  An object containing the cubic x, y, and z coordinates
 * that correspond (based on the hexRadius) to the inputted point.
 */
function convertCartToCubic(x, y) {
    var cubicX = (2/3) * x / hexRadius;
    var cubicY = (0 - ((Math.sqrt(3)/3) * y + (x/3) )) / hexRadius;
    var cubicZ = ((Math.sqrt(3)/3) * y - (x/3) ) / hexRadius;
    return {x: cubicX, y: cubicY, z: cubicZ};
}

/**
 *
 * @param h
 * @returns {{x: number, y:number, z:number}}
 */
function roundCubicToHex(h) {
    var roundX = Math.round(h.x);
    var roundY = Math.round(h.y);
    var roundZ = Math.round(h.z);
    //However, rounding with Math.round isn't perfect for hex math.  Modify slightly if not perfect
    var xDiff = Math.abs(roundX - h.x);
    var yDiff = Math.abs(roundY - h.y);
    var zDiff = Math.abs(roundZ - h.z);

    if(xDiff > yDiff && xDiff > zDiff) {roundX = 0 - roundY - roundZ;}
    else if(yDiff > zDiff) {roundY = 0 - roundX - roundZ;}
    else {roundZ = 0 - roundX - roundY}

    return {x: roundX, y: roundY, z: roundZ};
}

/**
 * Set the loading overlay elements to fade out or fly off the screen.  Try to delete them after that.
 */
function removeLoadingOverlay() {
    var loadingOverLay = document.getElementById("loadingOverlay");
    loadingOverLay.style.opacity = 0;
    var loadingHex = document.getElementById("loadingHex");
    loadingHex.style.opacity = 0;
    var loadingText = document.getElementById("loadingText");
    loadingText.style.opacity = 0;
    setTimeout(deleteLoadingOverlayElements, 1500);
}

function deleteLoadingOverlayElements() {
    var loadingOverLay = document.getElementById("loadingOverlay");
    var loadingHex = document.getElementById("loadingHex");
    var loadingText = document.getElementById("loadingText");
    var parentNode = document.getElementById("parentNode");
    parentNode.removeChild(loadingOverLay);
    parentNode.removeChild(loadingHex);
    parentNode.removeChild(loadingText);
}

/**
 * Complicated, but essentially I want to setup a large portion of event listeners for each button in the UI, where
 * if the mouse is over any of them currently, switch on a variable which forbids usage of tools.  That way, you don't
 * accidentally paint the tile underneath, say, the movement button, while trying to click it.
 */
function setupButtonToolRestrictions() {
    var buttonList = [];
    buttonList.push("northButton", "southButton", "eastButton", "westButton");
    for(var j = 0; j < theMenu.toolData.length; j++) {
        buttonList.push(theMenu.toolData[j][0] + "Button");
    }
    for(var i = 0; i < buttonList.length; i++) {
        document.getElementById(buttonList[i]).onmouseover = function () {
            mouseOverButton = true;
        };
        document.getElementById(buttonList[i]).onmouseout = function () {
            mouseOverButton = false;
        };
    }
}

/**
 * Tool is a class that creates the elements for a tool, and sets up the functions used by the tool.  It's
 * a general purpose class for UI tools, used to modify hexes or otherwise.
 * @param name   The name of the tool, used in all the things.
 * @param hexTool    A boolean, whether or not the tool affects a clicked-on hex.
 * @param applyTool    A function, called when the tool is used (if hexTool, it should take in x,y,z)
 * @param iconFile     A filename for the icon that the tool should have.
 * @constructor
 */
var Tool = function(name, hexTool, applyTool, iconFile) {
    var that = this;
    that.name = name;
    that.isHexTool = hexTool;
    that.applyTool = applyTool;

    //Create the button Element, add it to the menu.
    var thisToolButtonElement = document.createElement("DIV");
    thisToolButtonElement.id = that.name + "Button";
    thisToolButtonElement.className = "menuButton moveButton";
    document.getElementById("menu").appendChild(thisToolButtonElement);

    //Create the icon element, set the icon image, add it to the button
    var thisToolIconElement = document.createElement("DIV");
    thisToolIconElement.id = that.name + "Icon";
    thisToolIconElement.className = "menuButtonIcon";
    thisToolIconElement.style.backgroundImage = "url(\'assets/" + iconFile + "\')";
    document.getElementById(that.name + "Button").appendChild(thisToolIconElement);
    document.getElementById(that.name + "Button").addEventListener("mousedown", function() {
        theMenu.switchTool(that.name);
    });

    /**
     * calls the applyTool function for this tool.  If isHexTool, it calls it with cubic coordinates in the
     * parameters, else it just calls it without any arguments.
     */
    that.apply = function() {
        if(that.isHexTool) {
            var cubicCoords = roundCubicToHex(convertCartToCubic(viewX + mouseX, viewY + mouseY));
            that.applyTool(cubicCoords.x, cubicCoords.y, cubicCoords.z);
        }
        else {
            applyTool();
        }
    };
};

/**
 * This function is called onload -- so until onload happens, all the important startup things won't happen.
 * This makes it so you don't gradually get a bunch of stuttering-to-life features, rather you get everything
 * at once.
 */
function startApp() {
    /**Call relevant constructors!**/
    theGrid = new Grid();
    theTable = new LookupTable();
    theTable.createTable("./sampleMap.JSON");
    theMenu = new Menu();

    /**Setup event listeners for everything!**/
    //Color picker
    ColorPicker(document.getElementById('mycolorpicker'), function(hex, hsv, rgb) {
        theMenu.currentColor = hex;
        var colorDisplay = document.getElementById("colorDisplay");
        colorDisplay.style.backgroundColor = hex;

    });
    //Click-able movement buttons
    document.getElementById("westButton").addEventListener("mousedown", moveViewWest);
    document.getElementById("eastButton").addEventListener("mousedown", moveViewEast);
    document.getElementById("northButton").addEventListener("mousedown", moveViewNorth);
    document.getElementById("southButton").addEventListener("mousedown", moveViewSouth);

    //Get mouseclick for tool usage
    map.addEventListener("mousedown", theMenu.applyCurrentTool);
    //Start ALL the restrictions for UI buttons so a tool can't be used when clicking on them.
    setupButtonToolRestrictions();
    //Stopping movement when you stop clicking the button.
    window.addEventListener("mouseup", stopViewMovement);
    //Recording the new mouse position whenever the mouse moves
    document.addEventListener("mousemove", onMouseMove, false);
    //getting the mouse position out of the window when the mouse moves outside the window
    mapContainer.addEventListener("mouseout", onMouseOut);
    //Arrow keys
    window.addEventListener("keydown", getKeyPress);
    window.addEventListener("keyup", getKeyUp);

    /**Start update loops**/
    setInterval(genUpdates, 1000/60); //The general updates --anything that has to run async from the display
    updateDisplay(); //the display function.  It loops itself using requestAnimationFrame.

    /*TODO: Finally, remove loading screen */
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
        if(e.keyCode == 37) { moveViewWest(); } //left arrow
        if(e.keyCode == 38) { moveViewNorth(); } //up arrow
        if(e.keyCode == 39) { moveViewEast(); } //right arrow
        if(e.keyCode == 40) { moveViewSouth(); } //down arrow
}

//getKeyUp basically stops the movement from the arrow keys as they come up.
function getKeyUp(e) {
    //stopping all movement freezes the view for a split second when I use it, so I split it into horizontal/vertical
    if(e.keyCode == 37 || e.keyCode == 39) { stopHorizontalViewMovement(); }
    if(e.keyCode == 38 || e.keyCode == 40) { stopVerticalViewMovement(); }
}

//getMousePos gets the mouse position on the canvas.
function getMousePos(e) {
    var rect = map.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

//onMouseMove calls getMousePos and updates the mouseX and mouseY variables
function onMouseMove(e) {
    var mousePos = getMousePos(e);
    mouseX = mousePos.x;
    mouseY = mousePos.y;
}

//onMouseOut moves the mouse far far away from the canvas when you move it out of the window
function onMouseOut(e) { mouseX = -10000000;  mouseY = -10000000;}


/************************************************
 * Everything Else (startup, last-minute stuff) *
 ************************************************/

//Start everything up!
window.onload = function() {
    startApp();
};