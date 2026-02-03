const { ConnectionInstance } = require("../config/dataBaseConnection.js");

const QUERY = {
  findAll: `SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."DESPACHO";`,
  detalleSolicitud: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_detalle_solicitud($1::VARCHAR);`,
  detalleDocumento: `
  select 
  ptd.valor as tipo_documento,  
  pta.valor as tipo_actividad,
  ptg.valor as tipo_gasto,
  ptm.valor as tipo_moneda,
  sd.* 
  FROM "anddesgastos".solicitud_detalle sd
  left join "anddesgastos".parametro ptd on sd.id_tipo_documento = ptd.id_parametro and ptd.tabla ='TIPO_DOCUMENTO' and ptd.parametro = 'FILA'
  left join "anddesgastos".parametro pta on sd.id_tipo_actividad = pta.id_parametro and pta.tabla ='TIPO_ACTIVIDAD' and pta.parametro = 'FILA'
  left join "anddesgastos".parametro ptg on sd.id_tipo_gasto  = ptg.id_parametro and ptg.tabla ='TIPO_GASTO' and ptg.parametro = 'FILA'
  left join "anddesgastos".parametro ptm on sd.id_tipo_moneda  = ptm.id_parametro and ptm.tabla ='TIPO_MONEDA' and ptm.parametro = 'FILA'
   where sd.id_solicitud_detalle = $1::INTEGER;`,

   listaHistoricoSolicitudes: `
    SELECT 
      S.id_solicitud,
      S.nro_solicitud,
      TO_CHAR(S.fecha_envio_contabilidad, 'DD/MM/YYYY')::VARCHAR  AS fecha_envio_contabilidad,
      S.pais_gasto,
      S.pais_proyecto,
      S.id_pais_proyecto ,
      PPP.valor as pais_proyecto ,
      S.cliente,
      S.unidad_minera,
      p.nro_proyecto , 
      S.data_propuesta , 
      s.usuario_solicitante AS usuario_solicitante,
      s.usuario_creacion AS usuario_creacion,
      s.area as area,
      s.tipo_solicitud,
      TO_CHAR(S.fecha_envio_tesoreria, 'DD/MM/YYYY')::VARCHAR  AS fecha_envio_tesoreria,
      (
        SELECT nro_solicitud
        FROM "anddesgastos".solicitud
        WHERE id_solicitud = S.id_solicitud_referencia
        LIMIT 1
      ) AS nro_solicitud_rendicion_ref,
      (
        SELECT valor
        FROM "anddesgastos".parametro
        WHERE id_parametro = (
            SELECT id_estado_solicitud
            FROM "anddesgastos".solicitud
            WHERE id_solicitud = S.id_solicitud_referencia
            LIMIT 1
            )
      ) AS estado_solicitud_ref,
      CASE 
        WHEN S.tipo_solicitud IN ('Fondo Fijo', 'Viáticos') 
        THEN S.saldo_pendiente 
        ELSE 0 
      END AS saldo_sustentar_ref,
      ptm.valor as tipo_moneda,
      CASE 
        WHEN S.tipo_solicitud IN ('Fondo Fijo', 'Viáticos') THEN S.importe_f_fijo 
        ELSE 
            (SELECT 
                SUM(
                    CASE 
                        WHEN PTM.valor = 'USD' THEN SD.importe_dolares 
                        ELSE SD.importe_moneda_local 
                    END
                )
            FROM "anddesgastos".solicitud_detalle SD
            WHERE SD.id_solicitud = S.id_solicitud
              AND (SD.anulado IS NULL OR SD.anulado = false)
            ) 
    END AS importe,
      s.ceco as centro_costo,
      PES.valor as estado_solicitud
    FROM "anddesgastos".solicitud S
    LEFT JOIN "anddesgastos".proyecto P ON S.id_proyecto  = P.id_proyecto
    LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda  = PTM.id_parametro and parametro = 'FILA'
    left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
    left join "anddesgastos".parametro PPP on s.id_pais_proyecto  = PPP.id_parametro
    left join "anddesgastos".persona per on s.usuario_solicitante = per.email
    WHERE ($1::VARCHAR IS NULL OR P.nro_proyecto  = $1::VARCHAR)
    AND S.anulado_solicitud = false
    AND ($2::VARCHAR IS NULL OR s.nro_solicitud  = $2::VARCHAR)
    AND ($3::VARCHAR IS NULL OR S.pais_gasto  = $3::VARCHAR)
    AND ($4::VARCHAR IS NULL OR S.cliente  = $4::VARCHAR)
    AND ($5::VARCHAR IS NULL OR S.unidad_minera  = $5::VARCHAR)
    AND ($6::VARCHAR IS NULL OR S.area  = $6::VARCHAR)
    AND ($7::VARCHAR IS NULL OR S.ceco  = $7::VARCHAR)

    AND (
        ($8::VARCHAR IS NULL AND $15::VARCHAR IS NULL) OR 
        (S.fecha_creacion BETWEEN TO_DATE($8::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($15::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
    )
    AND (
        ($9::VARCHAR IS NULL AND $16::VARCHAR IS NULL) OR 
        (S.fecha_aprobacion_gerencia BETWEEN TO_DATE($9::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($16::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
    )
    AND (
        ($10::VARCHAR IS NULL AND $17::VARCHAR IS NULL) OR 
        (S.fecha_aprobacion_contabilidad BETWEEN TO_DATE($10::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($17::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
    )
    AND ($11::VARCHAR IS NULL OR S.tipo_solicitud  = $11::VARCHAR)
    AND ($12::VARCHAR IS NULL OR PES.valor = $12::VARCHAR) --estado solicitud
    AND ($13::BOOLEAN IS NULL OR S.flag_proveedor  = $13::BOOLEAN)
    AND ($14::BOOLEAN IS NULL OR S.flag_enviado_sap  = $14::BOOLEAN)
    AND ($18::BOOLEAN IS NULL OR S.pendiente_rendicion  = $18::BOOLEAN)
    AND ($19::VARCHAR IS NULL OR S.usuario_solicitante = $19::VARCHAR)
    AND (
        ($22::VARCHAR IS NULL) OR 
        (S.fecha_envio_tesoreria BETWEEN TO_DATE($22::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($22::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
    )
    AND ($23::VARCHAR IS NULL OR per.pais  = $23::VARCHAR) 
    Order by s.fecha_creacion desc
    LIMIT $20 OFFSET $21;`,
  //SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."FN_APROBACION_SOLICITUD_LISTA_POR_APROBACION"($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR, $7::VARCHAR, $8::VARCHAR);
  countListaHistoricoSolicitudes: `
  WITH total_count AS (
        SELECT COUNT(*) AS total_records
        FROM "anddesgastos".solicitud S
        LEFT JOIN "anddesgastos".proyecto P ON S.id_proyecto  = P.id_proyecto
        LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda  = PTM.id_parametro and parametro = 'FILA'
        left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
        left join "anddesgastos".parametro PPP on s.id_pais_proyecto  = PPP.id_parametro
        WHERE ($1::VARCHAR IS NULL OR P.nro_proyecto  = $1::VARCHAR)
        AND ($2::VARCHAR IS NULL OR s.nro_solicitud  = $2::VARCHAR)
        AND ($3::VARCHAR IS NULL OR S.pais_gasto  = $3::VARCHAR)
        AND ($4::VARCHAR IS NULL OR S.cliente  = $4::VARCHAR)
        AND ($5::VARCHAR IS NULL OR S.unidad_minera  = $5::VARCHAR)
        AND ($6::VARCHAR IS NULL OR S.area  = $6::VARCHAR)
        AND ($7::VARCHAR IS NULL OR S.ceco  = $7::VARCHAR)

        AND (
            ($8::VARCHAR IS NULL AND $15::VARCHAR IS NULL) OR 
            (S.fecha_creacion BETWEEN TO_DATE($8::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($15::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
        )
        AND (
            ($9::VARCHAR IS NULL AND $16::VARCHAR IS NULL) OR 
            (S.fecha_aprobacion_gerencia BETWEEN TO_DATE($9::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($16::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
        )
        AND (
            ($10::VARCHAR IS NULL AND $17::VARCHAR IS NULL) OR 
            (S.fecha_aprobacion_contabilidad BETWEEN TO_DATE($10::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($17::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
        )
        AND ($11::VARCHAR IS NULL OR S.tipo_solicitud  = $11::VARCHAR)
        AND ($12::VARCHAR IS NULL OR PES.valor = $12::VARCHAR) --estado solicitud
        AND ($13::BOOLEAN IS NULL OR S.flag_proveedor  = $13::BOOLEAN)
        AND ($14::BOOLEAN IS NULL OR S.flag_enviado_sap  = $14::BOOLEAN)
        AND ($18::BOOLEAN IS NULL OR S.pendiente_rendicion  = $18::BOOLEAN)
        AND ($19::VARCHAR IS NULL OR s.usuario_solicitante = $19::VARCHAR)
    )
    SELECT 
        total_records,
        CEIL(total_records / $20::float) AS total_pages
    FROM total_count;`,
  aprobarSolicitud: `
  SELECT * FROM "anddesgastos".fn_monitor_contabilidad_aprobar_solicitud($1::VARCHAR, $2::VARCHAR)
  `,
  rechazarSolicitud: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_rechazar_solicitud($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  devolverColaborador: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_devolver_colaborador($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  devolverGerencia: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_devolver_gerencia($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  grabarImportesDocumentoDetalle: `
  update "anddesgastos".solicitud_detalle set 	importe_moneda_local = $1::NUMERIC(18,2),
  importe_dolares = $2::NUMERIC(18,2),
  tipo_cambio = $3::NUMERIC(18,2),
  anulado = false
  where id_solicitud_detalle = $4::INTEGER;`,
  anularImportesDocumentoDetalle : `
  update "anddesgastos".solicitud_detalle set 	importe_moneda_local = $1::NUMERIC(18,2),
  importe_dolares = $2::NUMERIC(18,2),
  tipo_cambio = $3::NUMERIC(18,2),
  anulado = true
  where id_solicitud_detalle = $4::INTEGER;`,

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
  findUsuariosSolicitantes: `
  select concat(nombre_persona, ' ', apellido_persona)  as usuario_solicitante, email 
  from "anddesgastos".persona
 where flag_activo = true;`,
 findPaisGasto: `
 select valor as pais_gasto, id_parametro as id_pais_gasto from "anddesgastos".parametro
 where tabla = 'PAIS_GASTO'
 and parametro = 'FILA'
 and flag_activo = true;`,
 findEstadoSolicitud: `
 select valor as estado_solicitud, id_parametro as id_estado_solicitud from "anddesgastos".parametro
 where tabla = 'ESTADO_SOLICITUD'
 and parametro = 'FILA'
 and flag_activo = true;`,
 findTipoMoneda: `
 select valor as tipo_moneda, id_parametro as id_tipo_moneda from "anddesgastos".parametro
 where tabla = 'TIPO_MONEDA'
 and parametro = 'FILA'
 and flag_activo = true;`,

 findSolicitudesFondosFijos: `
 select s.nro_solicitud from "anddesgastos".solicitud s
 inner join "anddesgastos".parametro p on s.tipo_solicitud = p.valor
 where p.codigo in ('T_SOL_V', 'T_SOL_FF');--FONDOS FIJOS Y VIATICOS`,

 findTipoDocumento: `
 select valor as tipo_documento, id_parametro as id_tipo_documento from "anddesgastos".parametro
 where tabla = 'TIPO_DOCUMENTO'
 and parametro = 'FILA'
 and flag_activo = true;`,

 findTipoActividad: `
 select valor as tipo_actividad, id_parametro as id_tipo_actividad from "anddesgastos".parametro
 where tabla = 'TIPO_ACTIVIDAD'
 and parametro = 'FILA'
 and flag_activo = true;`,

 findTipoGasto: `
 select valor as tipo_gasto, id_parametro as id_tipo_gasto from "anddesgastos".parametro
 where tabla = 'TIPO_GASTO'
 and parametro = 'FILA'
 and flag_activo = true;`,

 findClientes: `
 SELECT DISTINCT s.cliente
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by cliente;`,
 findUnidadMinera: `
 SELECT DISTINCT s.unidad_minera
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by unidad_minera;`,
 findArea: `
 SELECT DISTINCT s.area
 FROM "anddesgastos".solicitud s
 where 1= 1
 group by area;`,
 findCeco: `
 SELECT DISTINCT s.ceco
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by ceco;`,
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
        console.log(resultSet.rows[0].fn_monitor_contabilidad_detalle_solicitud)

      return { DetalleSolicitud : resultSet.rows[0].fn_monitor_contabilidad_detalle_solicitud };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};


exports.detalleDocumento= async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    id_solicitud_detalle 
  } = params;


  if(id_solicitud_detalle == "")
    id_solicitud_detalle= null;

  return ConnectionInstance()
    .query(QUERY.detalleDocumento,[
      id_solicitud_detalle
    ] )
    .then((resultSet) => {
        console.log("resultset");
        console.log(resultSet.rows[0])

      return { DetalleDocumento : resultSet.rows[0] };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};

exports.listaHistoricoSolicitudes = async (params) => {
    console.log("entra repository")
    // Asegurarse de que todas las propiedades están bien definidas
    var {
      nro_proyecto = null,
      nro_solicitud= null,
      pais_gasto= null,
      pais_solicitante= null,
      cliente= null,
      unidad_minera= null,
      area= null,
      ceco= null,

      fecha_creacion_inicio = null,
      fecha_aprobacion_gerencia_inicio = null,
      fecha_aprobacion_contabilidad_inicio = null,
      tipo_solicitud = null,
      estado_solicitud= null,
      flag_proveedor= null,
      flag_enviado_sap= null,

      fecha_creacion_fin = null,
      fecha_aprobacion_gerencia_fin = null,
      fecha_aprobacion_contabilidad_fin = null,
      pendiente_rendicion = null,
      usuario_solicitante = null,
      fecha_pago_tesoreria = null,
      page ,
      pageSize 
    } = params;
  
  
    if(nro_proyecto == "")
      nro_proyecto= null;
    if(nro_solicitud == "")
        nro_solicitud= null;
    if(pais_gasto == "")
        pais_gasto= null;
    if(pais_solicitante == "")
        pais_solicitante= null;
    if(cliente == "")
        cliente= null;  
    if(unidad_minera == "")
        unidad_minera= null;  
    if(area == "")
        area= null;  
    if(ceco == "")
      ceco= null;  

    if(fecha_creacion_inicio == "")
        fecha_creacion_inicio= null;  
    if(fecha_aprobacion_gerencia_inicio == "")
        fecha_aprobacion_gerencia_inicio= null;  
    if(fecha_aprobacion_contabilidad_inicio == "")
      fecha_aprobacion_contabilidad_inicio= null;
    if(tipo_solicitud == "")
        tipo_solicitud= null;
    if(estado_solicitud == "")
        estado_solicitud= null;
    if(flag_proveedor == "")
        flag_proveedor= null;
    if(flag_enviado_sap == "")
        flag_enviado_sap= null;


    if(fecha_creacion_fin == "")
        fecha_creacion_fin= null;
    if(fecha_aprobacion_gerencia_fin == "")
        fecha_aprobacion_gerencia_fin= null;
    if(fecha_aprobacion_contabilidad_fin == "")
        fecha_aprobacion_contabilidad_fin= null;
    if(pendiente_rendicion == "")
        pendiente_rendicion= null;
    if(usuario_solicitante == "")
      usuario_solicitante = null;
    if(fecha_pago_tesoreria == "")
      fecha_pago_tesoreria= null;  
    const offsetValue = (page - 1) * pageSize;

    console.log(params);

    return Promise.all([
      ConnectionInstance().query(QUERY.listaHistoricoSolicitudes, [
        nro_proyecto,
        nro_solicitud,
        pais_gasto,
        cliente,
        unidad_minera,
        area,
        ceco,

        fecha_creacion_inicio ,
        fecha_aprobacion_gerencia_inicio ,
        fecha_aprobacion_contabilidad_inicio ,
        tipo_solicitud ,
        estado_solicitud,
        flag_proveedor,
        flag_enviado_sap,

        fecha_creacion_fin ,
        fecha_aprobacion_gerencia_fin ,
        fecha_aprobacion_contabilidad_fin ,
        pendiente_rendicion, usuario_solicitante, pageSize, offsetValue, fecha_pago_tesoreria,pais_solicitante]),
      ConnectionInstance().query(QUERY.countListaHistoricoSolicitudes, [
        nro_proyecto,
        nro_solicitud,
        pais_gasto,
        cliente,
        unidad_minera,
        area,
        ceco,

        fecha_creacion_inicio ,
        fecha_aprobacion_gerencia_inicio ,
        fecha_aprobacion_contabilidad_inicio ,
        tipo_solicitud ,
        estado_solicitud,
        flag_proveedor,
        flag_enviado_sap,

        fecha_creacion_fin ,
        fecha_aprobacion_gerencia_fin ,
        fecha_aprobacion_contabilidad_fin ,
        pendiente_rendicion, usuario_solicitante, pageSize])
    ]).then(([resultSet, countResultSet]) => {
      let lst = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        lst.push(buildListaSolicitud(row));
      }

      const totalRecords = countResultSet.rows[0].total_records;
      const totalPages = countResultSet.rows[0].total_pages;

      console.log(lst);
      console.log(totalRecords);
      console.log(totalPages);

      return {
        ListaSolicitudesAprobadoPorGerencia: lst,
        REGISTROS_TOTALES: totalRecords,
        PAGINAS_TOTALES: totalPages,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting ListaSolicitudesAprobadoPorGerencia");
    });
    
};

exports.aprobarSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, usuario
  } = params;

  console.log("params:", params);

  try{
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


exports.devolverColaborador = async (params) => {
    console.log("entra repository")
    console.log(params);
  
    const {
      nro_solicitud, motivo, usuario
    } = params;
  
    console.log("params:", params);
  
    try{
      return ConnectionInstance()
      .query(QUERY.devolverColaborador,[
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



  exports.devolverGerencia = async (params) => {
    console.log("entra repository")
    console.log(params);
  
    const {
      nro_solicitud, motivo, usuario
    } = params;
  
    console.log("params:", params);
  
    try{
      return ConnectionInstance()
      .query(QUERY.devolverGerencia,[
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


  exports.grabarImportesDocumentoDetalle = async (params) => {
    console.log("entra repository")
    console.log(params);
  
    const {
      importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle
    } = params;
  
    console.log("params:", params);
  
    try{
      return ConnectionInstance()
      .query(QUERY.grabarImportesDocumentoDetalle,[
        importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle
      ] )
      .then((resultSet) => {
          console.log(resultSet);
        if (resultSet && resultSet.rowCount > 0) {
          const mensaje = "Se grabo correctamente.";
          console.log("Mensaje:", mensaje);
          return { mensaje: mensaje };
        } else {
          console.error("No se pudo realizar la accion.");
          return { mensaje: "No se pudo realizar la accion." };
        }
  
      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al actualizar: " + err.message };
      });
    }
    catch(err){
      console.error("Error: ", err);
      return { mensaje: "Hubo un error al actualizar: " + err.message };
    }
      
  };


  exports.anularImportesDocumentoDetalle = async (params) => {
    console.log("entra repository")
    console.log(params);
  
    const {
      importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle
    } = params;
  
    console.log("params:", params);
  
    try{
      return ConnectionInstance()
      .query(QUERY.anularImportesDocumentoDetalle,[
        importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle
      ] )
      .then((resultSet) => {
        console.log(resultSet);

        if (resultSet && resultSet.rowCount > 0) {
          const mensaje = "Se Anulo correctamente el documento.";
          console.log("Mensaje:", mensaje);
          return { mensaje: mensaje };
        } else {
          console.error("No se pudo realizar la accion.");
          return { mensaje: "No se pudo realizar la accion." };
        }
  
      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al actualizar: " + err.message };
      });
    }
    catch(err){
      console.error("Error: ", err);
      return { mensaje: "Hubo un error al actualizar: " + err.message };
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

exports.findUsuariosSolicitantes = async () => {
  return ConnectionInstance().query(QUERY.findUsuariosSolicitantes, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildUsuarioSolicitante(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting usuarios solicitantes");
    });
};
exports.findPaisGasto = async () => {
  return ConnectionInstance().query(QUERY.findPaisGasto, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildPaisGasto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting pais gastos");
    });
};
exports.findEstadoSolicitud = async () => {
  return ConnectionInstance().query(QUERY.findEstadoSolicitud, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildEstadoSolicitud(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting estado solicitudes");
    });
};
exports.findTipoMoneda = async () => {
  return ConnectionInstance().query(QUERY.findTipoMoneda, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoMoneda(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Tipo moenda");
    });
};

exports.findSolicitudesFondosFijos = async () => {
  return ConnectionInstance().query(QUERY.findSolicitudesFondosFijos, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildSolicitudesFondosFijos(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findSolicitudesFondosFijos");
    });
};

exports.findTipoDocumento = async () => {
  return ConnectionInstance().query(QUERY.findTipoDocumento, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoDocumento(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findTipoDocumento");
    });
};

exports.findTipoActividad = async () => {
  return ConnectionInstance().query(QUERY.findTipoActividad, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoActividad(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findTipoActividad");
    });
};

exports.findTipoGasto = async () => {
  return ConnectionInstance().query(QUERY.findTipoGasto, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoGasto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Tipo moenda");
    });
};

exports.findClientes = async () => {
  return ConnectionInstance().query(QUERY.findClientes, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildClientes(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findClientes");
    });
};

exports.findUnidadMinera = async () => {
  return ConnectionInstance().query(QUERY.findUnidadMinera, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildUnidadMinera(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findUnidadMinera");
    });
};

exports.findArea = async () => {
  return ConnectionInstance().query(QUERY.findArea, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildArea(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findArea");
    });
};

exports.findCeco = async () => {
  return ConnectionInstance().query(QUERY.findCeco, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildCeco(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findCeco");
    });
};
const buildListaSolicitud = (row) => {
  return {
    id_solicitud: row.id_solicitud,
    nro_solicitud: row.nro_solicitud,
    fecha_envio_contabilidad: row.fecha_envio_contabilidad,
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
    estado_solicitud: row.estado_solicitud,

    estado_solicitud_ref: row.estado_solicitud_ref,
    nro_solicitud_rendicion_ref: row.nro_solicitud_rendicion_ref,
    saldo_sustentar_ref : row.saldo_sustentar_ref,
    fecha_envio_tesoreria: row.fecha_envio_tesoreria,

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

const buildDespacho = (row) => {
  return {
    id: row.ID_DESPACHO,
    idSolicitud: row.ID_SOLICITUD,
  };
};

const buildClientes = (row) => {
  return {
    cliente: row.cliente,
  };
};


const buildUnidadMinera = (row) => {
  return {
    unidad_minera: row.unidad_minera,
  };
};

const buildArea = (row) => {
  return {
    area: row.area,
  };
};

const buildCeco = (row) => {
  return {
    ceco: row.ceco,
  };
};


const buildUsuarioSolicitante = (row) => {
  return {
    usuario_solicitante: row.usuario_solicitante,
    email: row.email,
  };
};
const buildPaisGasto = (row) => {
  return {
    id_pais_gasto : row.id_pais_gasto,
    pais_gasto: row.pais_gasto,
  };
};


const buildEstadoSolicitud = (row) => {
  return {
    id_estado_solicitud : row.id_estado_solicitud,
    estado_solicitud: row.estado_solicitud,
  };
};

const buildTipoMoneda = (row) => {
  return {
    id_tipo_moneda : row.id_tipo_moneda,
    tipo_moneda: row.tipo_moneda,
  };
};

const buildTipoDocumento = (row) => {
  return {
    id_tipo_documento : row.id_tipo_documento,
    tipo_documento: row.tipo_documento,
  };
};
const buildTipoActividad = (row) => {
  return {
    id_tipo_actividad : row.id_tipo_actividad,
    tipo_actividad: row.tipo_actividad,
  };
};
const buildTipoGasto = (row) => {
  return {
    id_tipo_gasto : row.id_tipo_gasto,
    tipo_gasto: row.tipo_gasto,
  };
};
