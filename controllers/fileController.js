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
        const result = await client.query(`
            SELECT 
                id,
                name,
                bucket,
                tags,
                last_modified,
                completed,
                CASE 
                    WHEN completed THEN 'completed'
                    ELSE 'pending'
                END as status
            FROM files 
            ORDER BY last_modified DESC
        `);

        const files = result.rows.map(file => {
            // Для PostgreSQL драйвер уже преобразует jsonb в объект JavaScript
            // Просто убедимся, что tags - это массив
            const tags = Array.isArray(file.tags) ? file.tags : [];

            return {
                ...file,
                tags: tags.map(tag => ({
                    // Убедимся, что каждый тег имеет Key и Value
                    Key: tag.Key || '',
                    Value: tag.Value || ''
                }))
            };
        });

        res.json({ files });
    } catch (err) {
        console.error("Error fetching file history:", err);
        res.status(500).json({ error: 'Error fetching file history' });
    }
};

const updateTaskStatus = async (req, res) => {
    const { fileId } = req.params;
    const { completed } = req.body;

    if (!fileId || typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'Invalid request parameters' });
    }

    try {

        const fileResult = await client.query(
            `SELECT id FROM files WHERE id = $1`,
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: 'File not found in database' });
        }

        const file = fileResult.rows[0];



        const updateResult = await client.query(
            `UPDATE files 
             SET completed = $1
             WHERE id = $2
             RETURNING *`,
            [completed, fileId]
        );

        res.json({
            success: true,
            file: updateResult.rows[0]
        });

    } catch (err) {
        console.error("Error updating task status:", err);
        res.status(500).json({
            error: 'Failed to update task status',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

module.exports = { listFiles, downloadFile, getFileHistory, updateTaskStatus }