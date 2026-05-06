const jwt = require("jsonwebtoken");
const User = require("../models/user");

const { JWT_SECRET } = process.env;

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(payload.id);
    if (!user || user.token !== token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

