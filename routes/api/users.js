const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const User = require("../../models/user");
const auth = require("../../middlewares/auth");

const { JWT_SECRET } = process.env;

const router = express.Router();

const signupSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

const subscriptionSchema = Joi.object({
  subscription: Joi.string().valid("starter", "pro", "business").required(),
});

router.post("/signup", async (req, res, next) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const existing = await User.findOne({ email: value.email });
    if (existing) {
      return res.status(409).json({ message: "Email in use" });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    const created = await User.create({
      email: value.email,
      password: passwordHash,
    });

    res.status(201).json({
      user: {
        email: created.email,
        subscription: created.subscription,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const isMatch = await bcrypt.compare(value.password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
    user.token = token;
    await user.save();

    res.status(200).json({
      token,
      user: { email: user.email, subscription: user.subscription },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/logout", auth, async (req, res, next) => {
  try {
    req.user.token = null;
    await req.user.save();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/current", auth, async (req, res) => {
  res.status(200).json({
    email: req.user.email,
    subscription: req.user.subscription,
  });
});

// Optional task: update subscription
router.patch("/", auth, async (req, res, next) => {
  try {
    const { error, value } = subscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    req.user.subscription = value.subscription;
    await req.user.save();

    res.status(200).json({
      email: req.user.email,
      subscription: req.user.subscription,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

