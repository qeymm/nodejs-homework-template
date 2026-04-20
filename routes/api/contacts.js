const express = require("express");
const Joi = require("joi");

const {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
} = require("../../models/contacts");

const router = express.Router();

const createContactSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().min(1).required(),
});

const updateContactSchema = Joi.object({
  name: Joi.string().trim().min(1),
  email: Joi.string().trim().email(),
  phone: Joi.string().trim().min(1),
}).min(1);

const updateFavoriteSchema = Joi.object({
  favorite: Joi.boolean().required(),
});

router.get("/", async (req, res, next) => {
  try {
    const contacts = await listContacts();
    res.status(200).json(contacts);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await getContactById(id);
    if (!contact) {
      return res.status(404).json({ message: "Not found" });
    }
    res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { error, value } = createContactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "missing required name field" });
    }

    const created = await addContact(value);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await removeContact(id);
    if (!removed) {
      return res.status(404).json({ message: "Not found" });
    }
    res.status(200).json({ message: "contact deleted" });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateContactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "missing fields" });
    }

    const updated = await updateContact(id, value);
    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch("/:contactId/favorite", async (req, res, next) => {
  try {
    const { contactId } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "missing field favorite" });
    }

    const { error, value } = updateFavoriteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "missing field favorite" });
    }

    const updated = await updateStatusContact(contactId, value);
    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
