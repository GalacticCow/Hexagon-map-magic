# Magical Hex Map

### What is it?

_Magical Hex Map_ is a new project I'm working on.  The goal is to create a website where you can create a map by
editing hexagonal tiles.  This map will be able to be saved on your computer, and you will be able to likewise load
any maps you have created in the past.  The primary use for this is for Dungeons and Dragons DMs, but any content
creator who needs to create a map and mark locations on it can also find use for it.

### Basic features

At the most basic level, _Magical Hex Map_ plans to implement an infinitely scrollable hexagon-tiled blank map.  Each
tile can be clicked on, and its contents edited.  The editable contents will include background color, an icon that
displays in the center of the tile, a label that displays below the icon (or in the center if there is no icon), and
a paragraph of text that will be viewable when the tile is clicked on.  Finally, the map will be able to be saved
(as a JSON text file) and loaded from such a saved file.

The map will be scrollable in all 4 directions via movement buttons on the edges of the browser window.  **NOTE:
THIS MAY CHANGE LATER IF I THINK IT'S DUMB, BUT THE BASIC FUNCTIONALITY SHOULD BE INFINITE SCROLLABILITY**  In
addition, there should be a "return to center" button that allows you to return to the (0,0,0) coordinate spot where
the application starts out (which will be marked somehow, probably be a red border around the origin grid tile).

The UI for the application will be very minimalistic.  You can click a tile to expand its details (including seeing
the paragraph blurb it contains).  There will be 4 buttons:  **edit color**, **edit label**, **edit icon**, and **edit
info**.  **Edit color** will open a simple color editor, where you can click on a color that the tile's background
will change to.  **Edit Label** will open a text box, which will change the text label visible in the tile.  **Edit
icon** will change the icon in the tile, via a small scrollable selector (the UI would look similar to how emojis
are selected in a chatroom application).  Finally, **edit info** opens a Markdown text editor which takes up most of
the screen.  These editors will be represented by appropriate icons.

These are the most basic features the web app will have.  More features and better UI may come in the future, but for
now the scope will be limited.