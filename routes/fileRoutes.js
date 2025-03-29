const express = require('express')
const { listFiles, downloadFile, getFileHistory, updateTaskStatus } = require('../controllers/fileController')
const authenticateJWT = require('../middleware/authenticateJWT')

const router = express.Router()

router.get('/list/:bucket', authenticateJWT, listFiles)
router.get('/download/:bucket/:object', downloadFile)
router.get('/history', getFileHistory)
router.put('/history/:fileId/status', authenticateJWT, updateTaskStatus)

module.exports = router