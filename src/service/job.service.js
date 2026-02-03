const { sincronizarProveedor, insertarPersonas, insertarProyectos, enviarCorreoAprobacion } = require("../repository/job.repository.js");

exports.sincronizarProveedor = () => {
  return sincronizarProveedor();
};

exports.insertarProyectos = () => {
  console.log("Service - Insertar Proveedores");

  return insertarProyectos();
};

exports.insertarPersonas = () => {
  console.log("Service - Insertar Personas");

  return insertarPersonas();
};

exports.enviarCorreoAprobacion = async() => {
  console.log("Service - enviarCorreoAprobacion");
  return enviarCorreoAprobacion();
};