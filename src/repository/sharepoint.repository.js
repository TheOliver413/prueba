const { ConnectionInstance } = require("../config/dataBaseConnection.js");

const QUERY = {};

const getAccessToken = async () => {
  try {
    const url = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    body.append("client_id", process.env.CLIENT_ID);
    body.append("client_secret", process.env.CLIENT_SECRET);
    body.append("scope", process.env.SCOPES);
    body.append("grant_type", "client_credentials");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const response_json = await response.json();
    console.log('response_json:', response_json); // Para depuración

    if (!response.ok) {
      const errorMessage = response_json.error && response_json.error.message ? response_json.error.message : 'Unknown error';
      console.error(`Error Message: ${errorMessage}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }

    const token = response_json.access_token;

    return { token };
  } catch (err) {
    console.error("Error: ", err);
    throw new Error("Error: ", err);
  }
};

const getUrlPost = async (fileName) => {

  const nameFile = fileName.substring(fileName.lastIndexOf('/') + 1);
  console.log('repository')
  const siteId = process.env.SITE_ID;
  const driveId = process.env.DRIVE_ID;
  const pathFiles = process.env.PATH_FILES + fileName.substring(0, fileName.lastIndexOf('/'));
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:${pathFiles}/${nameFile}:/content`
  return { url };
};

const getSiteId = async (accessToken, hostname, siteName) => {
  try {
    const myHeaders = new Headers();

    const tokenResponse = accessToken ? accessToken : await getAccessToken();
    const access_Token = tokenResponse.token ? tokenResponse.token : tokenResponse;

    myHeaders.append("Authorization", `Bearer ${access_Token}`);
    const requestOptions = {
      method: "GET",
      headers: myHeaders
    };

    const site_id = (hostname ? hostname : process.env.DOMAIN);
    const site_name = (siteName ? siteName : process.env.SITE);

    const url = `https://graph.microsoft.com/v1.0/sites/${site_id}.sharepoint.com:/sites/${site_name}`

    const response = await fetch(url, requestOptions);
    const response_json = await response.json();
    console.log('response_json:', response_json);

    if (!response.ok) {
      const errorMessage = response_json.error && response_json.error.message ? response_json.error.message : 'Unknown error';
      console.error(`Error Message: ${errorMessage}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }

    const siteId = response_json.id

    return { siteId };

  } catch (err) {
    console.error("Error: ", err.message);
    throw new Error(`Error: ${err.message}`);
  }
};

const getDriveId = async (accessToken, siteId) => {
  try {
    const myHeaders = new Headers();

    const tokenResponse = accessToken ? accessToken : await getAccessToken();
    const access_Token = tokenResponse.token ? tokenResponse.token : tokenResponse;

    myHeaders.append("Authorization", `Bearer ${access_Token}`);
    const requestOptions = {
      method: "GET",
      headers: myHeaders
    };

    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`
    console.log('url: ', url)
    const response = await fetch(url, requestOptions);
    const response_json = await response.json();
    console.log('response_json:', response_json);

    if (!response.ok) {
      const errorMessage = response_json.error && response_json.error.message ? response_json.error.message : 'Unknown error';
      console.error(`Error Message: ${errorMessage}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }

    const driveId = response_json.value[0].id // Asume que la primera biblioteca de documentos es la que necesitas

    return { driveId };

  } catch (err) {
    console.error("Error: ", err.message);
    throw new Error(`Error: ${err.message}`);
  }
};

const getFiles = async (accessToken, siteId, driveId, pathFiles) => {
  try {
    const myHeaders = new Headers();

    const tokenResponse = accessToken ? accessToken : await getAccessToken();
    const access_Token = tokenResponse.token ? tokenResponse.token : tokenResponse;

    myHeaders.append("Authorization", `Bearer ${access_Token}`);
    const requestOptions = {
      method: "GET",
      headers: myHeaders
    };

    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:${pathFiles}:/children`
    console.log('url: ', url)
    const response = await fetch(url, requestOptions);
    const response_json = await response.json();
    console.log('response_json:', response_json);

    if (!response.ok) {
      const errorMessage = response_json.error && response_json.error.message ? response_json.error.message : 'Unknown error';
      console.error(`Error Message: ${errorMessage}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }

    return response_json.value.map(file => ({
      name: file.name,
      id: file.id,
      isFolder: file.folder !== undefined,
      downloadUrl: file['@microsoft.graph.downloadUrl'] //
    }));

  } catch (err) {
    console.error("Error: ", err.message);
    throw new Error(`Error: ${err.message}`);
  }
};


const getFileDownloadUrl = async (accessToken, siteId, driveId, pathFiles, fileName) => {
  try {
    const myHeaders = new Headers();

    const tokenResponse = accessToken ? accessToken : await getAccessToken();
    const access_Token = tokenResponse.token ? tokenResponse.token : tokenResponse;

    myHeaders.append("Authorization", `Bearer ${access_Token}`);
    const requestOptions = {
      method: "GET",
      headers: myHeaders
    };

    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:${pathFiles}/${fileName}`;

    console.log('url: ', url);
    const response = await fetch(url, requestOptions);
    const response_json = await response.json();
    console.log('response_json:', response_json);

    if (!response.ok) {
      const errorMessage = response_json.error && response_json.error.message ? response_json.error.message : 'Unknown error';
      console.error(`Error Message: ${errorMessage}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }
    const downloadUrl = response_json['@microsoft.graph.downloadUrl'];
    return { downloadUrl }

  } catch (err) {
    console.error("Error: ", err.message);
    throw new Error(`Error: ${err.message}`);
  }
};

module.exports = {
  getAccessToken,
  getUrlPost,
  getSiteId,
  getDriveId,
  getFiles,
  getFileDownloadUrl
};