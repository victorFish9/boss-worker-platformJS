const express = require('express')
const { listFiles, downloadFile, getFileHistory, updateTaskStatus, listGoogleDriveFiles, streamFileFromDrive } = require('../controllers/fileController')
const authenticateJWT = require('../middleware/authenticateJWT')

const router = express.Router()

router.get('/list/:bucket', authenticateJWT, listFiles)
router.get('/download/:bucket/:object', downloadFile)
router.get('/history', getFileHistory)
router.put('/history/:fileId/status', authenticateJWT, updateTaskStatus)

router.get('/google/list', authenticateJWT, listGoogleDriveFiles)
router.get('/google/list/:fileId', streamFileFromDrive)

module.exports = router