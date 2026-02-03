

const express = require('express')
const router = express.Router()
const MisSolicitudesController = require('../controllers/misSolicitudes.controllers');
//const { route } = require('./misSolicitudes.routes');

router.get('/find', MisSolicitudesController.findAll);
router.post('/v1/lista-solicitudes', MisSolicitudesController.listaSolicitudes);
router.post('/v1/lista-log-movimientos', MisSolicitudesController.listaLogMovimientos);
router.post('/v1/lista-observacion-solicitud', MisSolicitudesController.findObservacionsolicitud);


router.post('/v1/detalle-solicitud', MisSolicitudesController.detalleSolicitud);
router.post('/v1/detalle-documento', MisSolicitudesController.detalleDocumento);

router.post('/v1/enviar-aprobar-fondo-fijo-viatico', MisSolicitudesController.enviarAprobarFondoFijoViatico);
router.post('/v1/enviar-aprobar-rendiciones', MisSolicitudesController.enviarAprobarRendiciones);
router.post('/v1/enviar-aprobar-reembolsos', MisSolicitudesController.enviarAprobarReembolsos);
router.post('/v1/guardar-reembolsos', MisSolicitudesController.guardarReembolsos);
router.post('/v1/guardar-rendiciones', MisSolicitudesController.guardarRendiciones);

router.post('/v1/aprobar-solicitud', MisSolicitudesController.aprobarSolicitud);
router.post('/v1/rechazar-solicitud', MisSolicitudesController.rechazarSolicitud);
router.post('/v1/devolver-colaborador', MisSolicitudesController.devolverColaborador);
router.post('/v1/devolver-gerencia', MisSolicitudesController.devolverGerencia);
router.post('/v1/datos-proyecto', MisSolicitudesController.datosProyecto);

router.post('/v1/usuario-solicitante_datos', MisSolicitudesController.findUsuariosSolicitantesDatos);
router.post('/v1/Obtencion_valor_tipo_cambio', MisSolicitudesController.Obtencionvalortipocambio)

router.post('/v1/agregar-documento-rendicion', MisSolicitudesController.agregarDocumentoRendicion);
router.post('/v1/agregar-documento-reembolso', MisSolicitudesController.agregarDocumentoReembolso);
router.post('/v1/eliminar-documento-detalle', MisSolicitudesController.eliminarDocumentoDetalle);

router.post('/v1/eliminar-solicitud-creada', MisSolicitudesController.eliminarsolicitudcreada);
router.post('/v1/validar-ruc', MisSolicitudesController.validarRuc);

router.post('/v1/validar-solicitudes-pendientes', MisSolicitudesController.validarsolicitudespendientes);

//Combos
router.get('/v1/find-nro-proyectos', MisSolicitudesController.findNroProyectos);
router.get('/v1/find-tipo-solicitud', MisSolicitudesController.findTipoSolicitud);
router.get('/v1/find-usuario-solicitante', MisSolicitudesController.findUsuariosSolicitantes);
router.get('/v1/find-pais-gasto', MisSolicitudesController.findPaisGasto);
router.get('/v1/find-estado-solicitud', MisSolicitudesController.findEstadoSolicitud);
router.get('/v1/find-tipo-moneda', MisSolicitudesController.findTipoMoneda);
router.post('/v1/find-solicitudes-fondos-fijos', MisSolicitudesController.findSolicitudesFondosFijos);
router.get('/v1/find-tipo-documento', MisSolicitudesController.findTipoDocumento);
router.get('/v1/find-tipo-actividad', MisSolicitudesController.findTipoActividad);
router.get('/v1/find-tipo-gasto', MisSolicitudesController.findTipoGasto);

router.post('/v1/find-tipo-cambio', MisSolicitudesController.findTipoCambio);

router.get('/v1/find-tipo-tasa', MisSolicitudesController.findTipoTasa);
router.get('/v1/find-impuestos', MisSolicitudesController.findImpuestos);

router.get('/v1/find-solicitantes', MisSolicitudesController.findSolicitantes);
router.get('/v1/find-entregar-a', MisSolicitudesController.findEntregarA);

router.post('/v1/find-pendiente-rendir', MisSolicitudesController.findPendienteRendir);

router.post('/v1/consultar-documento', MisSolicitudesController.consultarDocumento)

router.post('/v1/enviar-correo-notifica', MisSolicitudesController.enviarNotificacionCorreo)

router.post('/v1/actualizar-aprobar-fondo-fijo-viatico', MisSolicitudesController.actualizarAprobarFondoFijoViatico);
router.post('/v1/actualizar-url-rendicion-fondofijo-viatico', MisSolicitudesController.actualizarUrlRendicionDetalleFondoFijoViatico);
router.post('/v1/actualizar-url-reembolso-pasaje', MisSolicitudesController.actualizarUrlReembolsoPasaje);


module.exports = router