const { findAll, detalleSolicitud, listaSolicitudPorAprobacion , aprobarSolicitud, rechazarSolicitud, 
  observarSolicitud, findNroProyectos, findTipoSolicitud, validarSolicitudPendienteRendicion,updateDetalleSolicitud
 } = require("../repository/aprobacionSolicitud.repository.js");

exports.findAll = () => {
  return findAll();
};

exports.detalleSolicitud = (req) => {
  console.log("entra service");

  return detalleSolicitud(req);
};

exports.listaSolicitudPorAprobacion = (req) => {
  console.log("Entra service listaSolicitudPorAprobacion");
  return listaSolicitudPorAprobacion(req)
};

exports.aprobarSolicitud = (req) => {
  console.log("Entra service aprobarSolicitud");
  return aprobarSolicitud(req)
};

exports.rechazarSolicitud = (req) => {
  console.log("Entra service rechazarSolicitud");
  return rechazarSolicitud(req)
};

exports.observarSolicitud = (req) => {
  console.log("Entra service observarSolicitud");
  return observarSolicitud(req)
};

exports.findNroProyectos = () => {
  return findNroProyectos();
};

exports.findTipoSolicitud = () => {
  return findTipoSolicitud();
};

exports.validarSolicitudPendienteRendicion = (req) => {
  return validarSolicitudPendienteRendicion(req);
};


exports.updateDetalleSolicitud = (req) => {
  return updateDetalleSolicitud(req);
};
