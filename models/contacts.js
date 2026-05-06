const mongoose = require("mongoose");
const Contact = require("./contactModel");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const listContacts = async (owner, { page = 1, limit = 20, favorite } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { owner };
  if (favorite !== undefined) {
    filter.favorite = favorite;
  }
  return await Contact.find(filter).skip(skip).limit(Number(limit));
};

const getContactById = async (contactId, owner) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findOne({ _id: contactId, owner });
};

const removeContact = async (contactId, owner) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findOneAndDelete({ _id: contactId, owner });
};

const addContact = async (body) => {
  return await Contact.create(body);
};

const updateContact = async (contactId, owner, body) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findOneAndUpdate({ _id: contactId, owner }, body, {
    new: true,
  });
};

const updateStatusContact = async (contactId, owner, body) => {
  if (!isValidObjectId(contactId)) return null;
  return await Contact.findOneAndUpdate({ _id: contactId, owner }, body, {
    new: true,
  });
};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
};
