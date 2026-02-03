

const express = require('express')
const router = express.Router()
const historicoSolicitudesController = require('../controllers/historicoSolicitudes.controllers');

/*
router.get('/find', historicoSolicitudesController.findAll);
router.post('/v1/lista-solicitud-aprobado-por-gerencia', historicoSolicitudesController.listaSolicitudAprobadoPorGerencia);
router.post('/v1/detalle-solicitud', historicoSolicitudesController.detalleSolicitud);
router.post('/v1/detalle-documento', historicoSolicitudesController.detalleDocumento);
router.post('/v1/aprobar-solicitud', historicoSolicitudesController.aprobarSolicitud);
router.post('/v1/rechazar-solicitud', historicoSolicitudesController.rechazarSolicitud);
router.post('/v1/devolver-colaborador', historicoSolicitudesController.devolverColaborador);
router.post('/v1/devolver-gerencia', historicoSolicitudesController.devolverGerencia);
router.post('/v1/grabar-importes-documento-detalle', historicoSolicitudesController.grabarImportesDocumentoDetalle);
router.post('/v1/anular-importes-documento-detalle', historicoSolicitudesController.anularImportesDocumentoDetalle);
*/
router.post('/v1/lista-historico-solicitudes', historicoSolicitudesController.listaHistoricoSolicitudes);


//Combos
router.get('/v1/find-nro-proyectos', historicoSolicitudesController.findNroProyectos);
router.get('/v1/find-tipo-solicitud', historicoSolicitudesController.findTipoSolicitud);
router.get('/v1/find-usuario-solicitante', historicoSolicitudesController.findUsuariosSolicitantes);
router.get('/v1/find-pais-gasto', historicoSolicitudesController.findPaisGasto);
router.get('/v1/find-estado-solicitud', historicoSolicitudesController.findEstadoSolicitud);
router.get('/v1/find-tipo-moneda', historicoSolicitudesController.findTipoMoneda);
router.get('/v1/find-solicitudes-fondos-fijos', historicoSolicitudesController.findSolicitudesFondosFijos);
router.get('/v1/find-tipo-documento', historicoSolicitudesController.findTipoDocumento);
router.get('/v1/find-tipo-actividad', historicoSolicitudesController.findTipoActividad);
router.get('/v1/find-tipo-gasto', historicoSolicitudesController.findTipoGasto);
router.get('/v1/find-clientes', historicoSolicitudesController.findClientes);
router.get('/v1/find-unidad-minera', historicoSolicitudesController.findUnidadMinera);
router.get('/v1/find-area', historicoSolicitudesController.findArea);
router.get('/v1/find-ceco', historicoSolicitudesController.findCeco);

module.exports = router