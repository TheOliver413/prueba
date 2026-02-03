const { findAll, detalleSolicitud, listaSolicitudAprobadoPorGerencia , validarpoveedores, compensardocumentosap,aprobarSolicitud, rechazarSolicitud, devolverColaborador,
   devolverGerencia, findNroProyectos, findTipoSolicitud , grabarImportesDocumentoDetalle, anularImportesDocumentoDetalle,
   findTipoMoneda, findPaisGasto,findSolicitudesFondosFijos, findEstadoSolicitud,findUsuariosSolicitantes,
    findTipoDocumento, findTipoActividad, findTipoGasto,detalleDocumento,
    findClientes, findUnidadMinera, findArea, findCeco, downloadPdf, cierreFF, validarCierreFF, enviarSAP, updateEnviadoTesoreria, findEstadoSolicitudRepository, getViewAsiento,confirmacionCompensacion,findTipoRendicion
  } = require("../repository/monitorContabilidad.repository.js");

exports.findAll = () => {
  return findAll();
};

exports.detalleSolicitud = (req) => {
  console.log("entra service");

  return detalleSolicitud(req);
};
exports.detalleDocumento = (req) => {
  console.log("entra service");

  return detalleDocumento(req);
};
exports.listaSolicitudAprobadoPorGerencia = (req) => {
  console.log("Entra service listaSolicitudAprobadoPorGerencia");
  return listaSolicitudAprobadoPorGerencia(req)
};

exports.aprobarSolicitud = (req) => {
  console.log("Entra service aprobarSolicitud");
  return aprobarSolicitud(req)
};

exports.compensardocumentosap = (req) => {
  console.log("Entra service aprobarSolicitud");
  return compensardocumentosap(req)
};

exports.validarpoveedores = (req) => {
  console.log("Entra service aprobarSolicitud");
  return validarpoveedores(req)
};

exports.downloadPdf = (req, res) => {
  console.log("Entra service downloadPdf");
  return downloadPdf(req,res)
};

exports.rechazarSolicitud = (req) => {
  console.log("Entra service rechazarSolicitud");
  return rechazarSolicitud(req)
};

exports.devolverColaborador = (req) => {
  console.log("Entra service devolverColaborador");
  return devolverColaborador(req)
};
exports.devolverGerencia = (req) => {
  console.log("Entra service devolverGerencia");
  return devolverGerencia(req)
};
exports.grabarImportesDocumentoDetalle = (req) => {
  console.log("Entra service grabarImportesDocumentoDetalle");
  return grabarImportesDocumentoDetalle(req)
};

exports.anularImportesDocumentoDetalle = (req) => {
  console.log("Entra service anularImportesDocumentoDetalle");
  return anularImportesDocumentoDetalle(req)
};



exports.findNroProyectos = () => {
  return findNroProyectos();
};

exports.findTipoSolicitud = () => {
  return findTipoSolicitud();
};

exports.findUsuariosSolicitantes = () => {
  return findUsuariosSolicitantes();
};
exports.findPaisGasto = () => {
  return findPaisGasto();
};
exports.findEstadoSolicitud = () => {
  return findEstadoSolicitud();
};
exports.findTipoMoneda = () => {
  return findTipoMoneda();
};
exports.findSolicitudesFondosFijos = () => {
  return findSolicitudesFondosFijos();
};
exports.findTipoDocumento = () => {
  return findTipoDocumento();
};

exports.findTipoActividad = () => {
  return findTipoActividad();
};
exports.findTipoGasto = () => {
  return findTipoGasto();
};

exports.findClientes = () => {
  return findClientes();
};

exports.findUnidadMinera = () => {
  return findUnidadMinera();
};

exports.findArea = () => {
  return findArea();
};

exports.findCeco = () => {
  return findCeco();
};

exports.validarCierreFF = (req) => {
  return validarCierreFF(req)
};

exports.cierreFF = (req) => {
  return cierreFF(req)
};

exports.enviarSAP = (req) => {
  return enviarSAP(req)
};

exports.updateEnviarTesoreria = async (params) => {
  const {estado_solicitud} = params;
  const estadoSolicitud = await findEstadoSolicitudRepository({estado_solicitud});
  if(estadoSolicitud.codigo !== "ES_SOL_ESAP"){
    return {
      code: 0,
      message: "Ya se ha pagado o no se ha enviado a SAP aún, no se puede pagar a tesoreria"
    }
  }

  return updateEnviadoTesoreria(params)
};

exports.getViewAsiento = (req) => {
  console.log("Service getViewAsiento - req recibido:", req);
  return getViewAsiento(req);
}

exports.confirmacionCompensacion = (req) => {
  console.log("Service confirmacionCompensacion - req recibido:", req);
  return confirmacionCompensacion(req);
}


exports.findTipoRendicion = (req) => {
  console.log("Service findTipoRendicion - req recibido:", req);
  return findTipoRendicion(req);
}