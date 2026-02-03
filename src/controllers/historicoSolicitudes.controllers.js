const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const { detalleSolicitud, listaHistoricoSolicitudes, aprobarSolicitud, rechazarSolicitud,
	devolverColaborador, devolverGerencia, findTipoSolicitud, findNroProyectos,  detalleDocumento, grabarImportesDocumentoDetalle, anularImportesDocumentoDetalle ,
  findUsuariosSolicitantes,findEstadoSolicitud, findTipoMoneda, findPaisGasto,findSolicitudesFondosFijos, findTipoDocumento,findTipoActividad, findTipoGasto, 
  findClientes, findUnidadMinera, findArea, findCeco
} = require("../service/historicoSolicitudes.service.js");
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


  exports.detalleDocumento = (req, res) => {
	detalleDocumento(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });

  };
exports.listaHistoricoSolicitudes = (req, res) => {
	console.log("entra controller")
	listaHistoricoSolicitudes(req.body)
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

exports.devolverColaborador = (req, res) => {

	devolverColaborador(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information devolverColaborador" });
    });


};
exports.devolverGerencia = (req, res) => {

	devolverGerencia(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information devolverGerencia" });
    });


};
exports.grabarImportesDocumentoDetalle = (req, res) => {

	grabarImportesDocumentoDetalle(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information grabarImportesDocumentoDetalle" });
    });


};
exports.anularImportesDocumentoDetalle = (req, res) => {

	anularImportesDocumentoDetalle(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information anularImportesDocumentoDetalle" });
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

exports.findUsuariosSolicitantes = async (req, res) => {

	findUsuariosSolicitantes()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findUsuariosSolicitantes" });
		});
};
exports.findPaisGasto = async (req, res) => {

	findPaisGasto()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findPaisGasto" });
		});
};
exports.findEstadoSolicitud = async (req, res) => {

	findEstadoSolicitud()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findEstadoSolicitud" });
		});
};
exports.findTipoMoneda = async (req, res) => {

	findTipoMoneda()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoMoneda" });
		});
};
exports.findSolicitudesFondosFijos = async (req, res) => {

	findSolicitudesFondosFijos()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findSolicitudesFondosFijos" });
		});
};

exports.findTipoDocumento = async (req, res) => {

	findTipoDocumento()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoDocumento" });
		});
};

exports.findTipoActividad = async (req, res) => {

	findTipoActividad()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoActividad" });
		});
};

exports.findTipoGasto = async (req, res) => {

	findTipoGasto()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoGasto" });
		});
};


exports.findClientes = async (req, res) => {

	findClientes()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findClientes" });
		});
};


exports.findUnidadMinera = async (req, res) => {

	findUnidadMinera()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findUnidadMinera" });
		});
};


exports.findArea = async (req, res) => {

	findArea()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findArea" });
		});
};


exports.findCeco = async (req, res) => {

	findCeco()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findCeco" });
		});
};
