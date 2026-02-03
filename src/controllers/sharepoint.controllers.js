const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const roles = process.env.ROLE_PARAMETRO || ["admin"];
const { getAccessToken, getUrlPost, getSiteId, getDriveId, getFiles, getFileDownloadUrl } = require("../service/sharepoint.service.js");

exports.getAccessToken = async (req, res) => {

	getAccessToken()
		.then((token) => {
			return res.status(200).json(token);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sharepoint token: " + err.message });
		});
};

exports.getUrlPost = async (req, res) => {

	const { file_name } = req.body;

	if (!file_name) {
		return res.status(400).json({ error: 'fileName is required' });
	}

	getUrlPost(file_name)
		.then((url) => {
			return res.status(200).json(url);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sharepoint URL Post" });
		});
};

exports.getSiteId = async (req, res) => {


	const { host_name, site_name, token } = req.body;

	getSiteId(token, host_name, site_name )
		.then((siteId) => {
			return res.status(200).json(siteId);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sharepoint site id: " + err.message });
		});
};

exports.getDriveId = async (req, res) => {


	const { token, site_id } = req.body;

	getDriveId(token, site_id)
		.then((driveId) => {
			return res.status(200).json(driveId);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sharepoint site id: " + err.message });
		});
};

exports.getFiles = async (req, res) => {


	const { token, site_id, drive_id, path_files } = req.body;

	getFiles( token, site_id, drive_id, path_files)
		.then((files) => {
			return res.status(200).json(files);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sharepoint site id: " + err.message });
		});
};

exports.getFileDownloadUrl = async (req, res) => {


	const { token, site_id, drive_id, path_files, file_name } = req.body;

	getFileDownloadUrl( token, site_id, drive_id, path_files, file_name)
		.then((fileDownloadUrl) => {
			return res.status(200).json(fileDownloadUrl);
		})
		.catch((err) => {
			return res.status(500).json({ message: "Error getting sharepoint site id: " + err.message });
		});
};

exports.getFileDownloadUrlInterno = async (req, res) => {

	
	const { fullPath } = req.body;
	console.log("fullPath");
	console.log(fullPath);


	if(!fullPath){
		return res.status(400).json({ message: "No existe documento a descargar." });
	}
	else{

		const token = null;
		const site_id = process.env.SITE_ID;
		const drive_id = process.env.DRIVE_ID;
		
		const path_files =  process.env.PATH_FILES + fullPath.substring(0, fullPath.lastIndexOf('/')); //fullPath.substring(0, lastSlashIndex + 1);  // Incluye el último '/'
		const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);//.substring(lastSlashIndex + 1);
	
		console.log("path_files", path_files);
		console.log("fileName", fileName);
	
		getFileDownloadUrl( token, site_id, drive_id, path_files, fileName)
			.then((fileDownloadUrl) => {
				return res.status(200).json(fileDownloadUrl);
			})
			.catch((err) => {
				return res.status(500).json({ message: "Error getting sharepoint site id: " + err.message });
			});
	}


};