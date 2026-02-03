const { getAccessToken, getUrlPost, getSiteId, getDriveId, getFiles, getFileDownloadUrl } = require("../repository/sharepoint.repository.js");

exports.getAccessToken = () => {
  return getAccessToken();
};

exports.getUrlPost = (fileName) => {
  return getUrlPost(fileName);
};

exports.getSiteId = (token, hostname, siteName) => {
  return getSiteId(token, hostname, siteName);
};

exports.getDriveId = (token, siteId) => {
  return getDriveId(token, siteId);
};

exports.getFiles = (token, siteId, driveId, pathFiles ) => {
  return getFiles(token, siteId,  driveId, pathFiles);
};

exports.getFileDownloadUrl =  (accessToken, siteId, driveId, pathFiles, fileName)=>{
  return getFileDownloadUrl (accessToken, siteId, driveId, pathFiles, fileName);
}

