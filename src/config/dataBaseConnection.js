const pg = require("pg");
let connection = null;
let connection_le = null;

exports.createConnection = async function () {
  try {
    if (connection == null) {
      let client = new pg.Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
          rejectUnauthorized: false,
        },
      });
      await client.connect();
      await client.query(`SET TIME ZONE 'America/Bogota';`);
      console.info("connection created");
      connection = client;
    }
    return connection;
  } catch (error) {
    console.error("Error creating db connection", error);
  }
};

exports.ConnectionInstance = function () {
  return connection;
};

exports.createConnection_le = async function () {
  try {
    if (connection_le == null) {
      let client = new pg.Client({
        host: process.env.DB_HOST_LE,
        port: parseInt(process.env.DB_PORT_LE),
        database: process.env.DB_DATABASE_LE,
        user: process.env.DB_USER_LE,
        password: process.env.DB_PASSWORD_LE,
        ssl: {
          rejectUnauthorized: false,
        },
      });
      await client.connect();
      await client.query(`SET TIME ZONE 'America/Bogota';`);
      console.info("connection created");
      connection_le = client;
    }
    return connection_le;
  } catch (error) {
    console.error("Error creating db connection", error);
  }
};

exports.ConnectionInstance_le = function () {
  return connection_le;
};