const express = require('express')
const { listFiles, downloadFile, getFileHistory } = require('../controllers/fileController')
const authenticateJWT = require('../middleware/authenticateJWT')

const router = express.Router()

router.get('/list/:bucket', authenticateJWT, listFiles)
router.get('/download/:bucket/:object', downloadFile)
router.get('/history', authenticateJWT, getFileHistory)

module.exports = router