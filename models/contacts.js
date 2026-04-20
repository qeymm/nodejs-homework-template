const mongoose = require("mongoose");
const Contact = require("./contactModel");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const listContacts = async () => {
  return await Contact.find({});
};

const getContactById = async (contactId) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findById(contactId);
};

const removeContact = async (contactId) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findByIdAndDelete(contactId);
};

const addContact = async (body) => {
  return await Contact.create(body);
};

const updateContact = async (contactId, body) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findByIdAndUpdate(contactId, body, { new: true });
};

const updateStatusContact = async (contactId, body) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findByIdAndUpdate(contactId, body, { new: true });
};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
};
