const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const roles = process.env.ROLE_PARAMETRO || ["admin"];
const { InsertarTipoDeCambio } = require('.../service/job_tipo_cambio.service.js');

exports.InsertarTipoDeCambio = async (req, res) => {
	InsertarTipoDeCambio()
		.then((token) => {
			return res.status(200).json(token);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting InsertarTipoDeCambio: " + err.message });
		});
};
