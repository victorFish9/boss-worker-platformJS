const jwt = require('jsonwebtoken')

const SECRET_KEY = process.env.SECRET_KEY

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

module.exports = authenticateJWT