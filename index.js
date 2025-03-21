require('dotenv').config()

const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const Minio = require('minio')
const { Client } = require('pg')

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

const SECRET_KEY = process.env.SECRET_KEY


const client = new Client({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false,
    }
})

client.connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch(err => console.error('Connection error', err.stack))

const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']
    if (!token) {
        return res.status(401).send('Token is missing')
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send("Wrong token")
        }

        req.user = user
        next()
    })
}

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

app.post('/register', async (req, res) => {
    const { username, password } = req.body

    try {
        const userExists = await client.query('SELECT * FROM users WHERE username = $1', [username])
        if (userExists.rows.length > 0) {
            return res.status(400).send('User alreadt exist')
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const result = await client.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        )

        res.status(201).send('User registered:)')
    } catch (err) {
        console.error(err)
        res.status(500).send('Error with registration')
    }

})

app.post('/login', async (req, res) => {
    const { username, password } = req.body

    try {
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).send('Wrong password or username :((')
        }

        const user = result.rows[0]

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.status(400).send('Wrong password or username')
        }

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' })

        res.send({ token })
    } catch (err) {
        console.error(err)
        res.status(500).send('Error with signing in')
    }

    // const user = users.find(user => user.username === username)
    // if (!user) {
    //     return res.status(400).send('Wrong password or username')
    // }

    // const validPassword = await bcrypt.compare(password, user.password)
    // if (!validPassword) {
    //     return res.status(400).send('Wronf password or username')
    // }

    // const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' })

    // res.send({ token })
})

app.get('/list/:bucket', authenticateJWT, async (req, res) => {
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