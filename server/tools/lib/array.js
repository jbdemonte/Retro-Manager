module.exports = array;

function array(item) {
  return Array.isArray(item) ? item : (item !== undefined ? [item] : []);
}