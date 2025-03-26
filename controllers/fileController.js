const client = require('../config/database')
const minioClient = require('../config/minio')

const listFiles = async (req, res) => {
    const { bucket } = req.params
    const objectList = []


    try {
        const stream = minioClient.listObjects(bucket, '', true)

        for await (const obj of stream) {
            const tags = await new Promise((resolve, reject) => {
                minioClient.getObjectTagging(bucket, obj.name, (err, tags) => {
                    if (err) return reject(err);
                    resolve(tags)
                })
            })

            const stat = await new Promise((resolve, reject) => {
                minioClient.statObject(bucket, obj.name, (err, stat) => {
                    if (err) return reject(err)
                    resolve(stat)
                })
            })

            const fileData = {
                name: obj.name,
                bucket,
                tags: JSON.stringify(tags || {}),
                lastModified: stat.lastModified
            }

            objectList.push(fileData)

            await client.query(`
                INSERT INTO files (name, bucket, tags, last_modified)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (name) DO UPDATE 
                SET tags = EXCLUDED.tags, last_modified = EXCLUDED.last_modified;
                `, [fileData.name, fileData.bucket, fileData.tags, fileData.lastModified])
        }

        res.json({ files: objectList })
    } catch (err) {
        res.status(500).send('error for getting files: ' + err.message)
    }
}

const downloadFile = (req, res) => {
    const { bucket, object } = req.params

    minioClient.getObject(bucket, object, (err, dataStream) => {
        if (err) {
            return res.status(500).send('Error with receiving data: ' + err.message)
        }

        res.setHeader('Content-Disposition', `attachment; filename=${object}`)
        res.setHeader('Content-Type', 'application/octet-stream')

        dataStream.pipe(res)
    })
}

const getFileHistory = async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM files ORDER BY last_modified DESC;')
        res.json({ files: result.rows })
    } catch (err) {
        console.error("Error fetching file history: ", err)
        res.status(500).send('Error fetching file history')
    }
}

module.exports = { listFiles, downloadFile, getFileHistory }