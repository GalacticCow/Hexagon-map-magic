/**
 * Created by Matthew on 10/21/15.
 */

//Get canvas's element.  Used for drawing the grids and whatnot
map = document.getElementById("map");

//Get button elements.  Used for moving the map around
westButton = document.getElementById("westButton");
eastButton = document.getElementById("eastButton");
northButton = document.getElementById("northButton");
southButton = document.getElementById("southButton");

/**
 * Canvas testing function, for now only used for debug.  Prints an inputted string to the middle of the canvas.
 * @param stringIn
 */
var displayTextInCanvasCenter = function(stringIn) {
    var context = map.getContext("2d");
    context.font = "25px Arial";
    context.textAlign = "center";
    context.fillText(stringIn, map.width/2, map.height/2);
}

displayTextInCanvasCenter("Sample Text");