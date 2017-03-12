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

  /**
   * Return the gameList of a systemId, or a game if the gameId is provided
   * @param {string} systemId
   * @param {string} [gameId]
   * @return {Game[]|Game}
   */
  this.get = function (systemId, gameId) {
    if (gameId) {
      return games[systemId]
        .filter(function (game) {
          return game.id === gameId;
        })
        .pop();
    }
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