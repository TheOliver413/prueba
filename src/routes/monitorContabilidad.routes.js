

const express = require('express')
const router = express.Router()
const monitorContabilidadController = require('../controllers/monitorContabilidad.controller');

router.get('/find', monitorContabilidadController.findAll);
router.post('/v1/lista-solicitud-aprobado-por-gerencia', monitorContabilidadController.listaSolicitudAprobadoPorGerencia);

router.post('/v1/detalle-solicitud', monitorContabilidadController.detalleSolicitud);
router.post('/v1/detalle-documento', monitorContabilidadController.detalleDocumento);

router.post('/v1/aprobar-solicitud', monitorContabilidadController.aprobarSolicitud);
router.post('/v1/rechazar-solicitud', monitorContabilidadController.rechazarSolicitud);
router.post('/v1/devolver-colaborador', monitorContabilidadController.devolverColaborador);
router.post('/v1/devolver-gerencia', monitorContabilidadController.devolverGerencia);
router.post('/v1/grabar-importes-documento-detalle', monitorContabilidadController.grabarImportesDocumentoDetalle);
router.post('/v1/anular-importes-documento-detalle', monitorContabilidadController.anularImportesDocumentoDetalle);

router.post('/v1/compensar-documento-sap', monitorContabilidadController.compensardocumentosap);
router.post("/v1/download-pdf", monitorContabilidadController.downloadPdf);
router.post('/v1/validar-poveedores', monitorContabilidadController.validarpoveedores);


//Combos
router.get('/v1/find-nro-proyectos', monitorContabilidadController.findNroProyectos);
router.get('/v1/find-tipo-solicitud', monitorContabilidadController.findTipoSolicitud);
router.get('/v1/find-usuario-solicitante', monitorContabilidadController.findUsuariosSolicitantes);
router.get('/v1/find-pais-gasto', monitorContabilidadController.findPaisGasto);
router.get('/v1/find-estado-solicitud', monitorContabilidadController.findEstadoSolicitud);
router.get('/v1/find-tipo-moneda', monitorContabilidadController.findTipoMoneda);
router.get('/v1/find-solicitudes-fondos-fijos', monitorContabilidadController.findSolicitudesFondosFijos);
router.get('/v1/find-tipo-documento', monitorContabilidadController.findTipoDocumento);
router.get('/v1/find-tipo-actividad', monitorContabilidadController.findTipoActividad);
router.get('/v1/find-tipo-gasto', monitorContabilidadController.findTipoGasto);
router.get('/v1/find-clientes', monitorContabilidadController.findClientes);
router.get('/v1/find-unidad-minera', monitorContabilidadController.findUnidadMinera);
router.get('/v1/find-area', monitorContabilidadController.findArea);
router.get('/v1/find-ceco', monitorContabilidadController.findCeco);

router.post('/v1/validar-cierre-ff', monitorContabilidadController.validarCierreFF);
router.post('/v1/cierre-ff', monitorContabilidadController.cierreFF);

router.post('/v1/enviar-sap', monitorContabilidadController.enviarSAP);
router.post('/v1/enviar-tesoreria', monitorContabilidadController.updateEnviarTesoreria);
router.post("/v1/visualizarAsiento", monitorContabilidadController.getViewAsiento);
router.post("/v1/confirmacionCompensacion", monitorContabilidadController.confirmacionCompensacion);

router.get('/v1/find-tipo-retencion', monitorContabilidadController.findTipoRendicion);

module.exports = router