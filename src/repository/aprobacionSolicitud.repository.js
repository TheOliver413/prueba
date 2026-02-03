const { ConnectionInstance } = require("../config/dataBaseConnection.js");

const QUERY = {
  findAll: `SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."DESPACHO";`,
  detalleSolicitud: `SELECT * FROM "anddesgastos".fn_aprobacion_solicitud_detalle_solicitud($1::VARCHAR);`,
  listaSolicitudPorAprobacion: `
	  SELECT 
        S.id_solicitud,
        S.nro_solicitud,
        TO_CHAR(S.fecha_envio_gerencia, 'DD/MM/YYYY')::VARCHAR AS fecha_aprobacion_gerencia,
        S.pais_gasto, 
        S.id_pais_proyecto ,
        S.pais_proyecto as pais_proyecto,
        S.cliente,
        S.unidad_minera,
        p.nro_proyecto , 
        S.data_propuesta , 
        s.usuario_solicitante AS usuario_solicitante,
        s.usuario_creacion AS usuario_creacion,
        s.area as area,
        s.tipo_solicitud,
        ptm.valor as tipo_moneda,
        CASE 
        WHEN tipo_solicitud IN ('Fondo Fijo', 'Viáticos') THEN s.importe_f_fijo 
        ELSE (
            SELECT SUM(
                CASE 
                    WHEN ptm.valor = 'USD' THEN importe_dolares 
                    ELSE importe_moneda_local 
                END
            ) 
            FROM "anddesgastos".solicitud_detalle
            WHERE id_solicitud = s.id_solicitud
            AND (anulado IS NULL OR anulado = FALSE)
        ) end as importe,
        s.ceco as centro_costo,
        case when s.tipo_solicitud in ('Fondo Fijo', 'Viáticos') then s.ind_activo else '' end as ind_activo,
        s.saldo_pendiente
    FROM "anddesgastos".solicitud S
    LEFT JOIN "anddesgastos".proyecto P ON S.id_proyecto  = P.id_proyecto
    LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda  = PTM.id_parametro and parametro = 'FILA'
    left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
    WHERE S.fecha_envio_gerencia  BETWEEN TO_DATE($1::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($2::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second'
    AND PES.codigo in('ES_SOL_PA')
    AND S.anulado_solicitud = false
    AND ($3::VARCHAR IS NULL OR P.nro_proyecto  = $3::VARCHAR)
    AND ($4::VARCHAR IS NULL OR s.tipo_solicitud  = $4::VARCHAR)
    AND ($5::VARCHAR IS NULL OR S.nro_solicitud  = $5::VARCHAR)
    AND S.gerente_proyecto = $6
    Order by s.fecha_creacion desc
    LIMIT $7 OFFSET $8;`,
  //SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."FN_APROBACION_SOLICITUD_LISTA_POR_APROBACION"($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR, $7::VARCHAR, $8::VARCHAR);
  countListaSolicitudPorAprobacion: `
  WITH total_count AS (
        SELECT COUNT(*) AS total_records
        FROM "anddesgastos".solicitud S
        LEFT JOIN "anddesgastos".proyecto P ON S.id_proyecto  = P.id_proyecto
        LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda  = PTM.id_parametro and parametro = 'FILA'
        left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
        WHERE S.fecha_solicitud  BETWEEN TO_DATE($1::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($2::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second'
        AND PES.codigo = 'ES_SOL_PA' --POR APROBACION | ES_SOL_PA
        AND ($3::VARCHAR IS NULL OR P.nro_proyecto  = $3::VARCHAR)
        AND ($4::VARCHAR IS NULL OR s.tipo_solicitud  = $4::VARCHAR)
        AND ($5::VARCHAR IS NULL OR S.nro_solicitud  = $5::VARCHAR)
        AND S.gerente_proyecto = $6
    )
    SELECT 
        total_records,
        CEIL(total_records / $7::float) AS total_pages
    FROM total_count;`,
  aprobarSolicitud: `
  SELECT * FROM "anddesgastos".fn_aprobacion_solicitud_aprobar_solicitud($1::VARCHAR, $2::VARCHAR)
  `,
  rechazarSolicitud: `SELECT * FROM "anddesgastos".fn_aprobacion_solicitud_rechazar_solicitud($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  observarSolicitud: `SELECT * FROM "anddesgastos".fn_aprobacion_solicitud_observar_solicitud($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  findNroProyectos: `
  SELECT DISTINCT po.nro_proyecto, po.id_proyecto as  id_proyecto
  FROM "anddesgastos".proyecto po
  --inner join "anddesgastos".solicitud s on po.id_proyecto = s.id_proyecto
  --left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
  where po.flag_activo = true
  ORDER BY nro_proyecto;`,
  findTipoSolicitud: `
  select valor as tipo_solicitud, id_parametro as id_tipo_solicitud from "anddesgastos".parametro
  where tabla = 'TIPO_SOLICITUD'
  and parametro = 'FILA'
  and flag_activo = true;`,
  findSolicitantes: `
  SELECT DISTINCT "SOLICITANTE"
FROM "ANDDES_HERRAMIENTAS_DEV"."SOLICITUD"
WHERE "ID_ESTADO" = 1
ORDER BY "SOLICITANTE";`,
  findEntregarA: `
  SELECT DISTINCT "ENTREGAR_A"
FROM "ANDDES_HERRAMIENTAS_DEV"."SOLICITUD"
WHERE "ID_ESTADO" = 1
ORDER BY "ENTREGAR_A";`,
validarSolicitudPendienteRendicion: `
  select * from "anddesgastos".solicitud s 
  inner join "anddesgastos".parametro pes2 on s.id_estado_solicitud = pes2.id_parametro
  where s.tipo_solicitud in ('Viáticos','Fondo Fijo')
  --and s.ind_activo = 'SI'
  and  pes2.codigo  in ('ES_SOL_ESAP', 'ES_SOL_ESTE', 'ES_SOL_AC') 
  --and pes2.codigo not in ('ES_SOL_RC', 'ES_SOL_RG')
  and s.nro_solicitud <> $1::VARCHAR
  and s.usuario_solicitante in (select s2.usuario_solicitante from "anddesgastos".solicitud s2 where s2.nro_solicitud = $1::VARCHAR)
  `,
  updateDetalleSolicitud: `
  UPDATE "anddesgastos".solicitud_detalle
  SET ind_retencion = $1::VARCHAR
  WHERE id_solicitud_detalle = $2::INTEGER
  `
};

exports.findAll = async () => {
  return ConnectionInstance()
    .query(QUERY.findAll)
    .then((resultSet) => {
      let listDespacho = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listDespacho.push(buildDespacho(row));
      }
      return listDespacho;
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });
};

exports.detalleSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nro_solicitud 
  } = params;


  if(nro_solicitud == "")
    nro_solicitud= null;

  return ConnectionInstance()
    .query(QUERY.detalleSolicitud,[
        nro_solicitud
    ] )
    .then((resultSet) => {
        console.log("resultset");
        console.log(resultSet.rows[0].fn_aprobacion_solicitud_detalle_solicitud)

      return { DetalleSolicitud : resultSet.rows[0].fn_aprobacion_solicitud_detalle_solicitud };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};

exports.listaSolicitudPorAprobacion = async (params) => {
    console.log("entra repository")
    console.log(params);
    // Asegurarse de que todas las propiedades están bien definidas
    var {
      fecha_inicio,
      fecha_fin,
      nro_proyecto = null,
      tipo_solicitud = null,
      nro_solicitud= null,
      user = null,
      page ,
      pageSize 
    } = params;
  
  
    if(nro_proyecto == "")
      nro_proyecto= null;
    if(tipo_solicitud == "")
        tipo_solicitud= null;
    if(nro_solicitud == "")
        nro_solicitud= null;

    const offsetValue = (page - 1) * pageSize;

    return Promise.all([
      ConnectionInstance().query(QUERY.listaSolicitudPorAprobacion, [fecha_inicio, fecha_fin, nro_proyecto, tipo_solicitud, nro_solicitud, user, pageSize, offsetValue]),
      ConnectionInstance().query(QUERY.countListaSolicitudPorAprobacion, [fecha_inicio, fecha_fin, nro_proyecto, tipo_solicitud, nro_solicitud, user, pageSize])
    ]).then(([resultSet, countResultSet]) => {
      let listDespacho = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listDespacho.push(buildListaSolicitud(row));
      }

      const totalRecords = countResultSet.rows[0].total_records;
      const totalPages = countResultSet.rows[0].total_pages;

      return {
        ListaSolicitudesPorAprobacion: listDespacho,
        REGISTROS_TOTALES: totalRecords,
        PAGINAS_TOTALES: totalPages,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting listaSolicitudPorAprobacion");
    });
    
};

exports.aprobarSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, usuario,usuario_solicitante
  } = params;

  console.log("params:", params);

  try{

      //===================================================================
      //Enviar correo de aprobacion
      let tenantID = process.env.TENANT_ID // Get from Azure App Registration
      let oAuthClientID = process.env.CLIENT_ID // Get from Azure App Registration
      let clientSecret = process.env.CLIENT_SECRET // Get from Azure App Registration
      let oAuthToken; // declared, gets defined if successfully fetched
      let asunto = `Solicitud aprobada - Notificación - Solicitud ${nro_solicitud}`;
      let destinatario = "miprueba@yopmail.com";
      let userFrom = "notificaciones.sap@anddes.com";
      let html =  `
              Estimado(a) ${usuario},<br />
              <br />
              Se ha enviado la solicitud: N°${nro_solicitud} del solicitante: ${usuario_solicitante} para su aprobación.<br />
              <br />
              Atentamente,<br />
              Anddes Rendición de Gastos<br />
              <br />
              IMPORTANTE: Correo generado automáticamente, por favor no responder.
              `;


      let msgPayload = {
        message: {
          subject: asunto,
          body: {
            contentType: "HTML",
            content: html
          },
          toRecipients: [{ emailAddress: { address: destinatario } }]
        }
      };

      const axios = require('axios'); //using axios as http helper
      await axios({ // Get OAuth token to connect as OAuth client
        method: 'post',
        url: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
        data: new URLSearchParams({
          client_id: oAuthClientID,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        }).toString()
      })
        .then(r => oAuthToken = r.data.access_token)

      let info = await axios({ // Send Email using Microsoft Graph
        method: 'post',
        url: `https://graph.microsoft.com/v1.0/users/${userFrom}/sendMail`,
        headers: {
          'Authorization': "Bearer " + oAuthToken,
          'Content-Type': 'application/json'
        },
        data: msgPayload
      });
      console.log('Correo enviado: %s', info);
      //===================================================================



    return ConnectionInstance()
    .query(QUERY.aprobarSolicitud,[
      nro_solicitud, usuario
    ] )
    .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
      const mensaje = resultSet.rows[0].mensaje;

      console.log("mensaje");
      console.log(mensaje);
  
      return { mensaje: mensaje };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });
  }
  catch(err){
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }
    
};


exports.rechazarSolicitud = async (params) => {
    console.log("entra repository")
    console.log(params);
  
    const {
      nro_solicitud, motivo, usuario
    } = params;
  
    console.log("params:", params);
  
    try{
      return ConnectionInstance()
      .query(QUERY.rechazarSolicitud,[
        nro_solicitud, motivo, usuario
      ] )
      .then((resultSet) => {
          console.log(resultSet);
  
          console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;
  
        console.log("mensaje");
        console.log(mensaje);
    
        return { mensaje: mensaje };
  
      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
    }
    catch(err){
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    }
      
  };


exports.observarSolicitud = async (params) => {
    console.log("entra repository")
    console.log(params);
  
    const {
      nro_solicitud, motivo, usuario
    } = params;
  
    console.log("params:", params);
  
    try{
      return ConnectionInstance()
      .query(QUERY.observarSolicitud,[
        nro_solicitud, motivo, usuario
      ] )
      .then((resultSet) => {
          console.log(resultSet);
  
          console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;
  
        console.log("mensaje");
        console.log(mensaje);
    
        return { mensaje: mensaje };
  
      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
    }
    catch(err){
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    }
      
  };



exports.despachoListaUnidadMedida = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nombre_tabla
  } = params;

  return ConnectionInstance()
    .query(QUERY.despachoListaUnidadMedida,[
      nombre_tabla
    ] )
    .then((resultSet) => {
      console.log(resultSet.rows);
      const listaUnidadMedida = resultSet.rows.map(row => ({
        ID_PARAMETRO: row.nro_solicitud,
        CODIGO: row.fecha_solicitud,
        VALOR: row.empresa
      }));
  
      //return {  listaUnidadMedida };
      return  resultSet.rows.map(row => ({
        ID_PARAMETRO: row.id_parametro,
        CODIGO: row.codigo,
        VALOR: row.valor
      })); ;

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};

exports.findNroProyectos = async () => {
  console.log("entra repository")
  return ConnectionInstance().query(QUERY.findNroProyectos, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildNroProyecto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nro de Proyectos");
    });
};

exports.findTipoSolicitud = async () => {
  return ConnectionInstance().query(QUERY.findTipoSolicitud, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoSolicitud(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nombre de Proyectos");
    });
};


exports.validarSolicitudPendienteRendicion = async (params) => {

  console.log("params", params);

  var {
    nro_solicitud
  } = params;

  console.log("nro_solicitud", nro_solicitud);

  return ConnectionInstance().query(QUERY.validarSolicitudPendienteRendicion, [nro_solicitud])
    .then((resultSet) => {
      console.log(resultSet.rows);
      return {
        RESULT: resultSet.rows,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nombre de validarSolicitudPendienteRendicion");
    });
};

exports.updateDetalleSolicitud = async (detallesSolicitud) => {
  const connection = await ConnectionInstance();

  try {
    for (const detalle of detallesSolicitud) {
      const query = QUERY.updateDetalleSolicitud;
      const values = ["S", detalle.id_solicitud_detalle];

      await connection.query(query, values);
    }

    return { RESULT: "Campo ind_retencion actualizado correctamente" };

  } catch (err) {
    console.error("Error al actualizar ind_retencion:", err);
    throw new Error("Error ejecutando updateDetalleSolicitud");
  } finally {
    connection.release && connection.release();
  }
};

const buildListaSolicitud = (row) => {
  return {
    id_solicitud: row.id_solicitud,
    nro_solicitud: row.nro_solicitud,
    fecha_aprobacion_gerencia: row.fecha_aprobacion_gerencia,
    pais_gasto: row.pais_gasto,
    id_pais_proyecto: row.id_pais_proyecto,
    pais_proyecto: row.pais_proyecto,
    cliente: row.cliente,
    unidad_minera: row.unidad_minera,
    nro_proyecto: row.nro_proyecto,
    data_propuesta: row.data_propuesta,
    usuario_solicitante: row.usuario_solicitante,
    usuario_creacion: row.usuario_creacion,
    area: row.area,
    tipo_solicitud: row.tipo_solicitud,
    tipo_moneda: row.tipo_moneda,
    importe: row.importe,
    centro_costo: row.centro_costo,
    ind_activo: row.ind_activo,
    saldo_pendiente: row.saldo_pendiente
  };
};

const buildNroProyecto = (row) => {
  return {
    nro_proyecto: row.nro_proyecto,
  };
};

const buildTipoSolicitud = (row) => {
  return {
    tipo_solicitud: row.tipo_solicitud,
  };
};

const buildSolicitante = (row) => {
  return {
    SOLICITANTES: row.SOLICITANTE,
  };
};

const buildEntregarA = (row) => {
  return {
    ENTREGAR_A: row.ENTREGAR_A,
  };
};

const buildDespacho = (row) => {
  return {
    id: row.ID_DESPACHO,
    idSolicitud: row.ID_SOLICITUD,
  };
};
