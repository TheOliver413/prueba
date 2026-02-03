const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const { detalleSolicitud,listaSolicitudes,listaLogMovimientos, enviarAprobarFondoFijoViatico, enviarAprobarRendiciones,enviarAprobarReembolsos, aprobarSolicitud, rechazarSolicitud,
	devolverColaborador, devolverGerencia, findTipoSolicitud, findNroProyectos,findUsuariosSolicitantes,validarsolicitudespendientes,Obtencionvalortipocambio,findUsuariosSolicitantesDatos,findEstadoSolicitud,
	 findTipoMoneda, findPaisGasto,findSolicitudesFondosFijos, findTipoDocumento,agregarDocumentoRendicion,agregarDocumentoReembolso, eliminarsolicitudcreada, validarRuc, eliminarDocumentoDetalle,  findTipoActividad, findTipoGasto,findObservacionsolicitud, findSolicitantes, findEntregarA, detalleDocumento, datosProyecto,
	 guardarReembolsos, guardarRendiciones, findTipoCambio, findImpuestos, findTipoTasa,findPendienteRendir, consultarDocumento ,enviarNotificacionCorreo, actualizarAprobarFondoFijoViatico, actualizarUrlRendicionDetalleFondoFijoViatico, actualizarUrlReembolsoPasaje
	} = require("../service/misSolicitudes.service.js");
const roles = process.env.ROLE_SOLICITUD || ["admin"];


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
exports.listaSolicitudes = (req, res) => {
	console.log("entra controller")
	listaSolicitudes(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information despachos" });
    });

  };

  exports.listaLogMovimientos = (req, res) => {
	console.log("entra controller")
	listaLogMovimientos(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information listaLogMovimientos" });
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

exports.enviarAprobarFondoFijoViatico = (req, res) => {

	enviarAprobarFondoFijoViatico(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information enviarAprobarFondoFijoViatico" });
    });


};
exports.enviarAprobarRendiciones = (req, res) => {

	enviarAprobarRendiciones(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information enviarAprobarRendiciones" });
    });


};
exports.enviarAprobarReembolsos = (req, res) => {

	enviarAprobarReembolsos(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information enviarAprobarReembolsos" });
    });


};

exports.guardarReembolsos = (req, res) => {

	guardarReembolsos(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information guardarReembolsos" });
    });


};

exports.guardarRendiciones = (req, res) => {

	guardarRendiciones(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information guardarRendiciones" });
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
exports.agregarDocumentoRendicion = (req, res) => {

	agregarDocumentoRendicion(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information agregarDocumentoRendicion" });
    });


};

exports.agregarDocumentoReembolso = (req, res) => {

	agregarDocumentoReembolso(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information agregarDocumentoReembolso" });
    });


};

exports.eliminarDocumentoDetalle = (req, res) => {

	eliminarDocumentoDetalle(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information eliminarDocumentoDetalle" });
    });


};

exports.eliminarsolicitudcreada = (req, res) => {

	eliminarsolicitudcreada(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information eliminarDocumentoDetalle" });
    });


};

exports.validarRuc = async (req, res) => {
  const { ruc } = req.body;
  console.log(`Controller: POST /v1/validar-ruc - RUC recibido: ${ruc}`);

  if (!ruc) {
    return res.status(400).json({ error: 'RUC es requerido' });
  }

  try {
    const resultado = await validarRuc(ruc);

    if (!resultado.existe) {
      return res.status(404).json(resultado);
    }

    return res.status(200).json(resultado);

  } catch (error) {
    console.error('Controller: Error al validar RUC en SAP:', error.message);
    return res.status(500).json({
      error: 'Error al consultar SAP',
      detalle: error.message,
    });
  }
};

exports.datosProyecto = (req, res) => {

	datosProyecto(req.body)
    .then((listDespachos) => {
      return res.status(200).json(listDespachos);
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ message: "Error getting information datosProyecto" });
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
exports.Obtencionvalortipocambio = async (req, res) => {

	Obtencionvalortipocambio(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information Obtencionvalortipocambio" });
		});
};validarsolicitudespendientes

exports.validarsolicitudespendientes = async (req, res) => {

	validarsolicitudespendientes(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information Obtencionvalortipocambio" });
		});
};

exports.findUsuariosSolicitantesDatos = async (req, res) => {

	findUsuariosSolicitantesDatos(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findUsuariosSolicitantesDatos" });
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

	findSolicitudesFondosFijos(req.body)
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
exports.findTipoCambio = async (req, res) => {

	findTipoCambio(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoCambio" });
		});
};

exports.findSolicitantes = async (req, res) => {

	findSolicitantes()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information Solicitantes" });
		});
};

exports.findObservacionsolicitud = async (req, res) => {

	findObservacionsolicitud(req.body)
		.then((listDespachos) => {
			return res.status(200).json(listDespachos);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information Observacion solicitud" });
		});
};

exports.findEntregarA = async (req, res) => {

	findEntregarA()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information EntregarA" });
		});
};

exports.findTipoTasa = async (req, res) => {

	findTipoTasa()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findTipoTasa" });
		});
};

exports.findImpuestos = async (req, res) => {

	findImpuestos()
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information findImpuestos" });
		});
};


exports.findPendienteRendir = async (req, res) => {

	findPendienteRendir(req.body)
		.then((listResult) => {
			return res.status(200).json(listResult);
		})
		.catch((err) => {
			return res
				.status(500)
				.json({ message: "Error getting information mis_solicitudes" });
		});
};

exports.consultarDocumento = async(req, res) => { 
	const response = await  consultarDocumento(req.body)

	if (response.isExistDocument){

		return res
		.status(200)
		.json(response);

	}else{
		return res
		.status(200)
		.json(response);
	}
}

exports.enviarNotificacionCorreo = async(req, res) => { 
	const response = await  enviarNotificacionCorreo(req.body)
		return res
		.status(200)
		.json(response);

	
}
exports.actualizarAprobarFondoFijoViatico = async(req, res) => { 
	const response = await  actualizarAprobarFondoFijoViatico(req.body)
		return res
		.status(200)
		.json(response);

	
}
exports.actualizarUrlRendicionDetalleFondoFijoViatico = async(req, res) => { 
	const response = await  actualizarUrlRendicionDetalleFondoFijoViatico(req.body)
		return res
		.status(200)
		.json(response);

	
}
exports.actualizarUrlReembolsoPasaje = async(req, res) => {
	const response = await  actualizarUrlReembolsoPasaje(req.body)
		return res
		.status(200)
		.json(response);
}	