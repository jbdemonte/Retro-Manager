module.exports = GameList;

/**
 * Handle a multi-system game list
 * @constructor
 */
function GameList() {
  /**
   * HashMap
   * @type {{systemId: Game[]}}
   */
  var games = {};

  this.get = function (systemId) {
    return games[systemId];
  };

  /**
   * Store a list of game
   * @param {string} systemId
   * @param {Game[]} items
   */
  this.set = function (systemId, items) {
    games[systemId] = items;
  };

  /**
   * Return the game instance of a jsonGame data
   * @param {object} jsonGame
   * @return {Game}
   */
  this.retrieve = function (jsonGame) {
    return (games[jsonGame.sid] || [])
      .filter(function (game) {
        return game.id === jsonGame.id;
      })
      .shift();
  };
}