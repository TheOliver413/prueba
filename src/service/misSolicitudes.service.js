const { findAll, detalleSolicitud, listaSolicitudes ,listaLogMovimientos,  enviarAprobarFondoFijoViatico,enviarAprobarRendiciones,enviarAprobarReembolsos, aprobarSolicitud, rechazarSolicitud, devolverColaborador,
    devolverGerencia, findNroProyectos,findUsuariosSolicitantes,validarsolicitudespendientes,Obtencionvalortipocambio,findUsuariosSolicitantesDatos,findEstadoSolicitud,agregarDocumentoRendicion, agregarDocumentoReembolso, eliminarsolicitudcreada, validarRuc, eliminarDocumentoDetalle, 
    datosProyecto, findTipoMoneda, findPaisGasto, findTipoSolicitud, findSolicitantes,findObservacionsolicitud,findSolicitudesFondosFijos, 
    findTipoDocumento, findTipoActividad, findTipoGasto, findTipoCambio, findEntregarA,detalleDocumento,guardarRendiciones, guardarReembolsos, findImpuestos, findTipoTasa, 
    findPendienteRendir, consultarDocumento ,enviarNotificacionCorreo, actualizarAprobarFondoFijoViatico,actualizarUrlRendicionDetalleFondoFijoViatico, actualizarUrlReembolsoPasaje} = require("../repository/misSolicitudes.repository.js");

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
  exports.listaSolicitudes = (req) => {
    console.log("Entra service listaSolicitudes");
    return listaSolicitudes(req)
  };

  exports.listaLogMovimientos = (req) => {
    console.log("Entra service listaLogMovimientos");
    return listaLogMovimientos(req)
  };
  
  exports.aprobarSolicitud = (req) => {
    console.log("Entra service aprobarSolicitud");
    return aprobarSolicitud(req)
  };

  exports.enviarAprobarFondoFijoViatico = (req) => {
    console.log("Entra service enviarAprobarFondoFijoViatico");
    return enviarAprobarFondoFijoViatico(req)
  };

  exports.enviarAprobarRendiciones = (req) => {
    console.log("Entra service enviarAprobarRendiciones");
    return enviarAprobarRendiciones(req)
  };

  exports.enviarAprobarReembolsos = (req) => {
    console.log("Entra service enviarAprobarReembolsos");
    return enviarAprobarReembolsos(req)
  };

  exports.guardarReembolsos = (req) => {
    console.log("Entra service guardarReembolsos");
    return guardarReembolsos(req)
  };

  exports.guardarRendiciones = (req) => {
    console.log("Entra service guardarRendiciones");
    return guardarRendiciones(req)
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
  exports.datosProyecto = (req) => {
    console.log("Entra service datosProyecto");
    return datosProyecto(req)
  };
  exports.findUsuariosSolicitantesDatos = (req) => {
    console.log("Entra service findUsuariosSolicitantesDatos");
    return findUsuariosSolicitantesDatos(req);
  };
  exports.Obtencionvalortipocambio = (req) => {
    console.log("Entra service Obtencionvalortipocambio");
    return Obtencionvalortipocambio(req);
  };
  exports.validarsolicitudespendientes = (req) => {
    console.log("Entra service validarsolicitudespendientes");
    return validarsolicitudespendientes(req);
  };
  exports.agregarDocumentoRendicion = (req) => {
    console.log("Entra service agregarDocumentoRendicion");
    return agregarDocumentoRendicion(req)
  };
  exports.agregarDocumentoReembolso = (req) => {
    console.log("Entra service agregarDocumentoReembolso");
    return agregarDocumentoReembolso(req)
  };
  exports.eliminarDocumentoDetalle = (req) => {
    console.log("Entra service eliminarDocumentoDetalle");
    return eliminarDocumentoDetalle(req)
  };
  exports.eliminarsolicitudcreada = (req) => {
    console.log("Entra service eliminarsolicitudcreada");
    return eliminarsolicitudcreada(req)
  };
  
  exports.validarRuc = async (ruc) => {
    console.log('Service: validando RUC', ruc);
    return await validarRuc(ruc);
  };  
  exports.findNroProyectos = () => {
    return findNroProyectos();
  };
  
  exports.findTipoSolicitud = () => {
    return findTipoSolicitud();
  };

  exports.findTipoTasa = () => {
    return findTipoTasa();
  };

  exports.findImpuestos = () => {
    return findImpuestos();
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
  exports.findSolicitudesFondosFijos = (req) => {
    return findSolicitudesFondosFijos(req);
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
  exports.findTipoCambio = (req) => {
    return findTipoCambio(req);
  };
  exports.findSolicitantes = () => {
    return findSolicitantes();
  };
  exports.findObservacionsolicitud = (req) => {
    console.log("Entra service findObservacionsolicitud");
    return findObservacionsolicitud(req);
  };
  
  exports.findEntregarA = () => {
    return findEntregarA();
  };
    
  exports.findPendienteRendir = (req) => {
    return findPendienteRendir(req);
  };

  exports.consultarDocumento = (req ) => {
    return consultarDocumento(req)
  }


  exports.enviarNotificacionCorreo = (req ) => {
    return enviarNotificacionCorreo(req)
  }

  exports.actualizarAprobarFondoFijoViatico = (req ) => {
    return actualizarAprobarFondoFijoViatico(req)
  }
  exports.actualizarUrlRendicionDetalleFondoFijoViatico = (req ) => {
    return actualizarUrlRendicionDetalleFondoFijoViatico(req)
  }
  exports.actualizarUrlReembolsoPasaje = (req) => {
    return actualizarUrlReembolsoPasaje(req)
  }
  