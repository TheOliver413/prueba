const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const { detalleSolicitud, listaSolicitudAprobadoPorGerencia, validarpoveedores,compensardocumentosap,aprobarSolicitud, rechazarSolicitud,
	devolverColaborador, devolverGerencia, findTipoSolicitud, findNroProyectos,  detalleDocumento, grabarImportesDocumentoDetalle, anularImportesDocumentoDetalle ,
  findUsuariosSolicitantes,findEstadoSolicitud, findTipoMoneda, findPaisGasto,findSolicitudesFondosFijos, findTipoDocumento,findTipoActividad, findTipoGasto, 
  findClientes, findUnidadMinera, findArea, findCeco, downloadPdf, validarCierreFF, cierreFF, enviarSAP, updateEnviarTesoreria, getViewAsiento,confirmacionCompensacion,findTipoRendicion
} = require("../service/monitorContabilidad.service.js");
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
exports.listaSolicitudAprobadoPorGerencia = (req, res) => {
	console.log("entra controller")
	listaSolicitudAprobadoPorGerencia(req.body)
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

exports.compensardocumentosap = (req, res) => {

	compensardocumentosap(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });


};

exports.validarpoveedores = (req, res) => {

	validarpoveedores(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });


};


exports.downloadPdf = async (req, res) => {

	console.log("Entra a método downloadPdf");
	try {
        // Generar el PDF y enviarlo como respuesta
		await downloadPdf(req.body, res);
    } catch (error) {
        console.error("Error al generar el PDF:", error);
        // Solo enviar la respuesta de error si el PDF no se ha generado aún
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error generando el PDF" });
        }
    }
	//await downloadPdf(req.body, res);
	/*.then((listDespachos) => {
	  return res.status(200).json(listDespachos);
	})
	.catch((err) => {
	  return res
		.status(500)
		.json({ message: "Error getting information downloadPdf" });
	});*/
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


exports.validarCierreFF = async (req, res) => {

	validarCierreFF(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findCeco" });
		});
};


exports.cierreFF = async (req, res) => {

	var status = await cierreFF(req.body);
	const fechaActual = new Date().toISOString();
	if(status == 1)
	{
		return res
		.status(200)
		.json({ Fecha_Respuesta: fechaActual, Cod_Respuesta: "0" , message: "" });	
	}
	else{
		return res
		.status(500)
		.json({ Fecha_Respuesta: fechaActual, Cod_Respuesta: "1" , message: "Ocurrió un problema al enviar la información a SAP, volver a intentarlo" });	
	}

	/*cierreFF(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findCeco" });
		});*/
};


exports. enviarSAP = async (req, res) => {

	var status = await enviarSAP(req.body);
	const fechaActual = new Date().toISOString();
	if(status.code == 1)
	{
		return res
		.status(200)
		.json({ Fecha_Respuesta: fechaActual, Cod_Respuesta: "0" , message: "" });	
	}
	else{
		return res
		.status(500)
		.json({ Fecha_Respuesta: fechaActual, Cod_Respuesta: "1" , message: status.message });	
	}
};

exports.updateEnviarTesoreria = async (req, res) => {

	let updateResult = await updateEnviarTesoreria(req.body);
	const fechaActual = new Date().toISOString();
	if(updateResult.code == 1)
	{
		return res
		.status(200)
		.json({ Fecha_Respuesta: fechaActual, Cod_Respuesta: "0" , message: "Se ha actualizado la fecha de pagado por tesoreria" });	
	}else{
		return res
		.status(400)
		.json({ Fecha_Respuesta: fechaActual, Cod_Respuesta: "1" , message: updateResult.message });	
	}
};

exports.getViewAsiento = async( req, res) => { 
	console.log("Controller getViewAsiento - req.body:", req.body);
	const asiento = await getViewAsiento(req.body)
	if(asiento!== null && asiento !== undefined){
		return res
		.status(200)
		.json(asiento);
	}else{
		return res
		.status(400)
		.json({message: "Error al genenerar el asiento"})
	}
}

exports.confirmacionCompensacion = async( req, res) => { 
	console.log("Controller confirmacionCompensacion - req.body:", req.body);
	const asiento = await confirmacionCompensacion(req.body)
	if(asiento!== null && asiento !== undefined){
		return res
		.status(200)
		.json(asiento);
	}else{
		return res
		.status(400)
		.json({message: "Error al genenerar el asiento"})
	}
}

exports.findTipoRendicion = async (req, res) => {

	findTipoRendicion()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoRendicion" });
		});
};