const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const client = require('../config/database')

const SECRET_KEY = process.env.SECRET_KEY

const register = async (req, res) => {
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
}

const login = async (req, res) => {
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
}

module.exports = { register, login }