const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const gravatar = require("gravatar");
const multer = require("multer");
const { Jimp } = require("jimp");
const path = require("path");
const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");

const User = require("../../models/user");
const auth = require("../../middlewares/auth");
const sendEmail = require("../../helpers/sendEmail");

const { JWT_SECRET, BASE_URL = "http://localhost:3000" } = process.env;

const router = express.Router();

const TMP_DIR = path.join(__dirname, "../../tmp");
const AVATARS_DIR = path.join(__dirname, "../../public/avatars");

const upload = multer({ dest: TMP_DIR });

function uploadAvatar(req, res, next) {
  upload.single("avatar")(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err instanceof multer.MulterError) {
      const messages = {
        MISSING_FIELD_NAME:
          'Form field name is missing. In Postman form-data use only one row: key "avatar", type File.',
        LIMIT_UNEXPECTED_FILE:
          'Unexpected file field. Use form-data key "avatar" (type File).',
      };
      return res
        .status(400)
        .json({ message: messages[err.code] || err.message });
    }
    return next(err);
  });
}

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

const resendVerifySchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

async function sendVerificationEmail(email, verificationToken) {
  const verifyURL = `${BASE_URL}/users/verify/${verificationToken}`;

  await sendEmail({
    to: email,
    subject: "Verify email",
    html: `<p>Please confirm your email. <a href="${verifyURL}">Verify email</a></p>`,
    text: `Please confirm your email: ${verifyURL}`,
  });
}

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
    const verificationToken = uuidv4();
    const created = await User.create({
      email: value.email,
      password: passwordHash,
      avatarURL: gravatar.url(value.email),
      verificationToken,
    });

    await sendVerificationEmail(created.email, verificationToken);

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

    if (!user.verify) {
      return res.status(401).json({ message: "Email not verified" });
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

router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.verificationToken,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(user._id, {
      verificationToken: null,
      verify: true,
    });

    res.status(200).json({ message: "Verification successful" });
  } catch (err) {
    next(err);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    if (!req.body?.email) {
      return res
        .status(400)
        .json({ message: "missing required field email" });
    }

    const { error, value } = resendVerifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
    }

    if (!user.verificationToken) {
      user.verificationToken = uuidv4();
      await user.save();
    }

    await sendVerificationEmail(user.email, user.verificationToken);

    res.status(200).json({ message: "Verification email sent" });
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

router.patch("/avatars", auth, uploadAvatar, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Avatar file is missing" });
    }

    const { path: tmpPath } = req.file;
    const filename = `${req.user._id}.png`;
    const resultPath = path.join(AVATARS_DIR, filename);

    const image = await Jimp.read(tmpPath);
    image.resize({ w: 250, h: 250 });
    await image.write(resultPath);

    await fs.unlink(tmpPath);

    const previousAvatar = req.user.avatarURL;
    if (previousAvatar && previousAvatar.startsWith("/avatars/")) {
      const previousPath = path.join(__dirname, "../../public", previousAvatar);
      await fs.unlink(previousPath).catch(() => {});
    }

    req.user.avatarURL = `/avatars/${filename}`;
    await req.user.save();

    res.status(200).json({ avatarURL: req.user.avatarURL });
  } catch (err) {
    next(err);
  }
});

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
