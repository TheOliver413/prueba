

const express = require('express')
const router = express.Router()
const aprobacionSolicitudController = require('../controllers/aprobacionSolicitud.controllers');

router.get('/find', aprobacionSolicitudController.findAll);
router.post('/v1/lista-solicitud-por-aprobacion', aprobacionSolicitudController.listaSolicitudPorAprobacion);

router.post('/v1/detalle-solicitud', aprobacionSolicitudController.detalleSolicitud);

router.post('/v1/aprobar-solicitud', aprobacionSolicitudController.aprobarSolicitud);
router.post('/v1/rechazar-solicitud', aprobacionSolicitudController.rechazarSolicitud);
router.post('/v1/observar-solicitud', aprobacionSolicitudController.observarSolicitud);

//Combos
router.get('/v1/find-nro-proyectos', aprobacionSolicitudController.findNroProyectos);
router.get('/v1/find-tipo-solicitud', aprobacionSolicitudController.findTipoSolicitud);

router.post('/v1/validar-sol-pendiente-rendicion', aprobacionSolicitudController.validarSolicitudPendienteRendicion);

router.post('/v1/update-detalle-solicitud', aprobacionSolicitudController.updateDetalleSolicitud);

module.exports = router