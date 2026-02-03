

const express = require('express')
const router = express.Router()
const SharepointController = require('../controllers/sharepoint.controllers');

router.post('/v1/get-token', SharepointController.getAccessToken);
router.post('/v1/get-url-post', SharepointController.getUrlPost);
router.post('/v1/get-site-id', SharepointController.getSiteId);
router.post('/v1/get-drive-id', SharepointController.getDriveId);
router.post('/v1/get-files', SharepointController.getFiles);
router.post('/v1/get-file-download-url', SharepointController.getFileDownloadUrl);
router.post('/v1/get-file-download-url-interno', SharepointController.getFileDownloadUrlInterno);

module.exports = router