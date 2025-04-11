require('dotenv').config()

const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/authRoutes')
const fileRoutes = require('./routes/fileRoutes')


const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/files', fileRoutes)


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})