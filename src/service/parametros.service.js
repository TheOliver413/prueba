const {saveParametros,deleteParametro } = require("../repository/parametros.repository.js");

exports.saveParametro = (params) => {
  return saveParametros(params);
};
exports.deleteParametro = (id) => {
  return deleteParametro(id);
};
