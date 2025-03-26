const Minio = require('minio')

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
})

minioClient.bucketExists('boss-worker-bucket', function (err, exists) {
    if (err) {
        return console.log('Error connect to Minio', err)
    }
    if (exists) {
        console.log('Connected to Minio!!:)')
    } else {
        console.log("Bucket does not exist")
    }
})

module.exports = minioClient