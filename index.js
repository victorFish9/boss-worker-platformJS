const express = require('express')
const cors = require('cors')
const Minio = require('minio')

const app = express()
const port = 3001

app.use(cors())

const minioClient = new Minio.Client({
    endPoint: '16.16.66.55',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
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

app.get('/list/:bucket', async (req, res) => {
    const { bucket } = req.params
    const objectList = []

    // const stream = minioClient.listObjects(bucket, '', true)

    // stream.on('data', (obj) => {
    //     objectList.push(obj.name)
    // })

    // stream.on('end', () => {
    //     res.json({ files: objectList })
    // })

    // stream.on('error', (err) => {
    //     res.status(500).send('Error to get list of files: ' + err.message)
    // })


    try {
        const stream = minioClient.listObjects(bucket, '', true)

        for await (const obj of stream) {
            const tags = await new Promise((resolve, reject) => {
                minioClient.getObjectTagging(bucket, obj.name, (err, tags) => {
                    if (err) return reject(err);
                    resolve(tags)
                })
            })

            objectList.push({
                name: obj.name,
                tags: tags || {},
            })
        }

        res.json({ files: objectList })
    } catch (err) {
        res.status(500).send('error for getting files: ' + err.message)
    }
})

app.get('/download/:bucket/:object', (req, res) => {
    const { bucket, object } = req.params

    minioClient.getObject(bucket, object, (err, dataStream) => {
        if (err) {
            return res.status(500).send('Error with receiving data: ' + err.message)
        }

        res.setHeader('Content-Disposition', `attachment; filename=${object}`)
        res.setHeader('Content-Type', 'application/octet-stream')

        dataStream.pipe(res)
    })
})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})