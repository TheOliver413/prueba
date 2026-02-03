const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const { detalleSolicitud, listaSolicitudPorAprobacion, aprobarSolicitud, rechazarSolicitud,
	observarSolicitud, findTipoSolicitud, findNroProyectos, validarSolicitudPendienteRendicion,updateDetalleSolicitud } = require("../service/aprobacionSolicitud.service.js");
const roles = process.env.ROLE_APROBACION || ["admin"];

exports.findAll = (req, res) => {
	console.info(req.headers);
	console.info(req.params);
	const role = "admin";
	/*Validación*/
	if(roles.includes(role)){
		res.json({ "saludos": `Hola ${req.params.nombre || " Aprobacion"}` });
	}
	else{
		return res.status(405).send('Method Not Allowed.');
	}
};

exports.detalleSolicitud = (req, res) => {
	detalleSolicitud(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });

  };


exports.listaSolicitudPorAprobacion = (req, res) => {
	console.log("entra controller")
	listaSolicitudPorAprobacion(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });

  };


exports.aprobarSolicitud = (req, res) => {

	aprobarSolicitud(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });


};


exports.rechazarSolicitud = (req, res) => {

	rechazarSolicitud(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });


};

exports.observarSolicitud = (req, res) => {

	observarSolicitud(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });


};

exports.findNroProyectos = async (req, res) => {

	findNroProyectos()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information NombreProyectos" });
		});
};

exports.findTipoSolicitud = async (req, res) => {

	findTipoSolicitud()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoSolicitud" });
		});
};


exports.validarSolicitudPendienteRendicion = async (req, res) => {

	validarSolicitudPendienteRendicion(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information validarSolicitudPendienteRendicion" });
		});
};

exports.updateDetalleSolicitud = async (req, res) => {

	updateDetalleSolicitud(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information updateDetalleSolicitud" });
		});
};

