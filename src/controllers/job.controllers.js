const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const roles = process.env.ROLE_PARAMETRO || ["admin"];
const { sincronizarProveedor, enviarCorreoAprobacion } = require("../service/job.service.js");

exports.sincronizarProveedor = async (req, res) => {
	sincronizarProveedor()
		.then((token) => {
			return res.status(200).json(token);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sincronizarProveedor: " + err.message });
		});
};

exports.enviarCorreoAprobacion = async(req, res) => {
	console.log("Envíos de correos de aprobación");
	enviarCorreoAprobacion()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information insertarNotificaciones" });
		});
}