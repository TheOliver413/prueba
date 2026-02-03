

const express = require('express')
const router = express.Router()
const MatenimientoHerramientaController = require('../controllers/mantenimientoHerramienta.controllers');

router.get('/find', MatenimientoHerramientaController.findAll);
router.get('/herramientas', MatenimientoHerramientaController.listHerramientas);
router.get('/updateHerramienta', MatenimientoHerramientaController.updateHerramienta);
router.get('/mantenimientos', MatenimientoHerramientaController.listMantenimientos);
router.get('/insertMantenimiento', MatenimientoHerramientaController.insertOrEditMantenimientoHerramienta);
router.get('/deleteMantenimiento', MatenimientoHerramientaController.deleteMantenimientoHerramienta);
router.get('/historico', MatenimientoHerramientaController.listHistorico);

module.exports = router