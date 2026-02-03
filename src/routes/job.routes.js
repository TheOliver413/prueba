

const express = require('express')
const router = express.Router()
const JobController = require('../controllers/job.controllers');

router.post('/v1/sincronizar-proveedor', JobController.sincronizarProveedor);

module.exports = router