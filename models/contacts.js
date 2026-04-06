const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

const contactsPath = path.join(__dirname, 'contacts.json')

async function readContacts() {
  const data = await fs.readFile(contactsPath, 'utf-8')
  return JSON.parse(data)
}

async function writeContacts(contacts) {
  await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2))
}

const listContacts = async () => {
  return await readContacts()
}

const getContactById = async (contactId) => {
  const contacts = await readContacts()
  return contacts.find((c) => c.id === contactId) || null
}

const removeContact = async (contactId) => {
  const contacts = await readContacts()
  const idx = contacts.findIndex((c) => c.id === contactId)
  if (idx === -1) return null

  const [removed] = contacts.splice(idx, 1)
  await writeContacts(contacts)
  return removed
}

const addContact = async (body) => {
  const contacts = await readContacts()
  const newContact = { id: crypto.randomUUID(), ...body }
  contacts.push(newContact)
  await writeContacts(contacts)
  return newContact
}

const updateContact = async (contactId, body) => {
  const contacts = await readContacts()
  const idx = contacts.findIndex((c) => c.id === contactId)
  if (idx === -1) return null

  const updated = { ...contacts[idx], ...body, id: contacts[idx].id }
  contacts[idx] = updated
  await writeContacts(contacts)
  return updated
}

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
}
