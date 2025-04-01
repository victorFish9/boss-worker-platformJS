require('dotenv').config()

const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/authRoutes')
const fileRoutes = require('./routes/fileRoutes')


const app = express()
const port = 3001

app.use(cors({
    origin: "https://boss-worker-frontend-bo34.vercel.app",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}))
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/files', fileRoutes)


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})