const { findAll, detalleSolicitud, listaHistoricoSolicitudes , aprobarSolicitud, rechazarSolicitud, devolverColaborador,
    devolverGerencia, findNroProyectos, findTipoSolicitud , grabarImportesDocumentoDetalle, anularImportesDocumentoDetalle,
    findTipoMoneda, findPaisGasto,findSolicitudesFondosFijos, findEstadoSolicitud,findUsuariosSolicitantes,
     findTipoDocumento, findTipoActividad, findTipoGasto,detalleDocumento,
     findClientes, findUnidadMinera, findArea, findCeco
   } = require("../repository/historicoSolicitudes.repository.js");
 
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
 exports.listaHistoricoSolicitudes = (req) => {
   console.log("Entra service listaHistoricoSolicitudes");
   return listaHistoricoSolicitudes(req)
 };
 
 exports.aprobarSolicitud = (req) => {
   console.log("Entra service aprobarSolicitud");
   return aprobarSolicitud(req)
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