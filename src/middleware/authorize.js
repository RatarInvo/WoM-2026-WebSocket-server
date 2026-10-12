const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null

    if (!token) {
      return res.status(401).json({ msg: 'Authorization required' })
    }

    const user = jwt.verify(token, process.env.JWT_SECRET)
    req.authUser = user

    return next()
  } catch (error) {
    return res.status(401).json({
      msg: 'Your session has expired. Please log in again.'
    })
  }
}