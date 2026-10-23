import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import {
  createPostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  reorderPostgresCmsRecords,
  updatePostgresCmsRecord
} from "../db/cmsRepository.js";
import { getPostgresPool } from "../db/postgres.js";
import ContactEmail from "../models/ContactEmail.model.js";
import ContactOffice from "../models/ContactOffice.model.js";
import ContactPhone from "../models/ContactPhone.model.js";
import ContactSettings from "../models/ContactSettings.model.js";
import WorkingHours from "../models/WorkingHours.model.js";

const DEFAULT_SETTINGS = {
  sectionTitle: "CONTACT US",
  phoneHeading: "PHONE",
  emailHeading: "EMAIL",
  officeHeading: "OFFICE",
  workingHoursHeading: "WORKING HOURS",
  ctaText: "Let's Work Together",
  ctaLink: "/contactus",
  ctaNewTab: false,
  sectionEnabled: true,
  phoneEnabled: true,
  emailEnabled: true,
  officeEnabled: true,
  workingHoursEnabled: true,
  ctaEnabled: true
};

const DEFAULT_PHONES = [
  {
    _id: "demo-p1",
    country: "India",
    countryCode: "IN",
    phone: "+91 XXXXX XXXXX",
    displayPhone: "+91 XXXXX XXXXX",
    whatsappEnabled: false,
    callEnabled: true,
    order: 1,
    status: "active"
  },
  {
    _id: "demo-p2",
    country: "United States",
    countryCode: "US",
    phone: "+1 (212) 555-0192",
    displayPhone: "+1 (212) 555-0192",
    whatsappEnabled: false,
    callEnabled: true,
    order: 2,
    status: "active"
  },
  {
    _id: "demo-p3",
    country: "United Kingdom",
    countryCode: "GB",
    phone: "+44 20 7946 0912",
    displayPhone: "+44 20 7946 0912",
    whatsappEnabled: false,
    callEnabled: true,
    order: 3,
    status: "active"
  },
  {
    _id: "demo-p4",
    country: "France",
    countryCode: "FR",
    phone: "+33 1 42 68 55 00",
    displayPhone: "+33 1 42 68 55 00",
    whatsappEnabled: false,
    callEnabled: true,
    order: 4,
    status: "active"
  },
  {
    _id: "demo-p5",
    country: "United States",
    countryCode: "US",
    phone: "+1 (310) 555-0144",
    displayPhone: "+1 (310) 555-0144",
    whatsappEnabled: false,
    callEnabled: true,
    order: 5,
    status: "active"
  }
];

const DEFAULT_EMAILS = [
  {
    _id: "demo-e1",
    email: "hello@theeditingtable.com",
    label: "Primary Email",
    primary: true,
    order: 1,
    status: "active"
  }
];

const DEFAULT_OFFICES = [
  {
    _id: "demo-o1",
    officeName: "Mohali Office",
    companyName: "NHK INFOTECH",
    addressLine1: "A-28, Industrial Area, Sector 73",
    addressLine2: "Mohali, Punjab 160055",
    city: "Mohali",
    state: "Punjab",
    country: "India",
    postalCode: "160055",
    order: 1,
    status: "active"
  }
];

const DEFAULT_HOURS = [
  {
    _id: "demo-h1",
    dayFrom: "Mon",
    dayTo: "Sat",
    openingTime: "10:00 AM",
    closingTime: "7:00 PM",
    closed: false,
    order: 1,
    status: "active"
  }
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function usesPostgres() {
  return isPostgresSelected();
}

async function requireContactStore(res) {
  if (usesPostgres()) return true;
  if (env.VERCEL_ENV === "preview") {
    res.status(503).json({ success: false, message: "Contact database is not configured.", data: null });
    return false;
  }
  if (!isDbConnected()) await connectDatabase().catch(() => {});
  if (isDbConnected()) return true;
  res.status(503).json({ success: false, message: "Contact database is unavailable.", data: null });
  return false;
}

async function listContactRecords(Model, filter = {}) {
  if (usesPostgres()) {
    return listPostgresCmsRecords(Model, {
      publicFilter: filter,
      orderField: "order"
    });
  }
  return Model.find(filter).sort({ order: 1, createdAt: 1 });
}

async function createContactRecord(Model, payload) {
  if (!usesPostgres()) return Model.create(payload);
  const document = new Model(payload);
  await document.validate();
  return createPostgresCmsRecord(Model, document._id.toString(), document.toObject());
}

async function updateContactRecord(Model, id, payload) {
  if (!usesPostgres()) return Model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  const existing = await getPostgresCmsRecord(Model, id);
  if (!existing) return null;
  const document = Model.hydrate(existing);
  document.set(payload);
  await document.validate({ validateModifiedOnly: true });
  const updates = {};
  const requestedPaths = Object.keys(payload);
  for (const schemaPath of Object.keys(Model.schema.paths)) {
    if (["_id", "__v", "createdAt", "updatedAt"].includes(schemaPath)) continue;
    if (!requestedPaths.some((requested) => requested === schemaPath ||
      schemaPath.startsWith(`${requested}.`) || requested.startsWith(`${schemaPath}.`))) continue;
    let target = updates;
    const parts = schemaPath.split(".");
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    target[parts.at(-1)] = document.get(schemaPath);
  }
  return updatePostgresCmsRecord(Model, id, updates);
}

async function deleteContactRecord(Model, id) {
  if (usesPostgres()) return updateContactRecord(Model, id, { deletedAt: new Date(), status: "inactive" });
  return Model.findByIdAndUpdate(id, { deletedAt: new Date(), status: "inactive" }, { new: true });
}

async function reorderContactRecords(Model, items) {
  const validItems = items.filter((item) => mongoose.isValidObjectId(item.id));
  if (usesPostgres()) {
    const reordered = validItems.length
      ? await reorderPostgresCmsRecords(Model, "order", validItems.map(({ id, order }) => ({ id: String(id), order: Number(order) })))
      : [];
    if (!reordered) return null;
    return listContactRecords(Model, { deletedAt: null });
  }
  const operations = validItems.map((item) => ({
    updateOne: { filter: { _id: item.id }, update: { $set: { order: Number(item.order) } } }
  }));
  if (operations.length) await Model.bulkWrite(operations);
  return listContactRecords(Model, { deletedAt: null });
}

async function clearPrimaryContactEmails(exceptId = null) {
  if (usesPostgres()) {
    if (exceptId) {
      await getPostgresPool().query(
        'UPDATE "contactemails" SET "primary" = FALSE, "updated_at" = now(), "__v" = "__v" + 1 WHERE "deleted_at" IS NULL AND "_id" <> $1',
        [String(exceptId)]
      );
    } else {
      await getPostgresPool().query(
        'UPDATE "contactemails" SET "primary" = FALSE, "updated_at" = now(), "__v" = "__v" + 1 WHERE "deleted_at" IS NULL'
      );
    }
    return;
  }
  const filter = { deletedAt: null, ...(exceptId ? { _id: { $ne: exceptId } } : {}) };
  await ContactEmail.updateMany(filter, { $set: { primary: false } });
}

// Helper to seed initial data if DB is empty
async function ensureInitialData() {
  if (!isDbConnected()) return;

  const phoneCount = await ContactPhone.countDocuments({ deletedAt: null });
  if (phoneCount === 0) {
    await ContactPhone.insertMany(
      DEFAULT_PHONES.map((p) => {
        const copy = { ...p };
        delete copy._id;
        return copy;
      })
    );
  }

  const emailCount = await ContactEmail.countDocuments({ deletedAt: null });
  if (emailCount === 0) {
    await ContactEmail.insertMany(
      DEFAULT_EMAILS.map((e) => {
        const copy = { ...e };
        delete copy._id;
        return copy;
      })
    );
  }

  const officeCount = await ContactOffice.countDocuments({ deletedAt: null });
  if (officeCount === 0) {
    await ContactOffice.insertMany(
      DEFAULT_OFFICES.map((o) => {
        const copy = { ...o };
        delete copy._id;
        return copy;
      })
    );
  }

  const hoursCount = await WorkingHours.countDocuments({ deletedAt: null });
  if (hoursCount === 0) {
    await WorkingHours.insertMany(
      DEFAULT_HOURS.map((h) => {
        const copy = { ...h };
        delete copy._id;
        return copy;
      })
    );
  }

  const settingsDoc = await ContactSettings.findOne({ settingsKey: "contact-settings" });
  if (!settingsDoc) {
    await ContactSettings.create({ settingsKey: "contact-settings", ...DEFAULT_SETTINGS });
  }
}

// ----------------------------------------------------
// PUBLIC API CONTROLLER: GET /api/contact
// ----------------------------------------------------
export async function getPublicContactInfo(req, res, next) {
  try {
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Contact database is not configured.", data: null });
    }
    if (usesPostgres()) {
      const [settingsRows, phones, emails, offices, workingHours] = await Promise.all([
        listPostgresCmsRecords(ContactSettings, { publicFilter: { settingsKey: "contact-settings" } }),
        listPostgresCmsRecords(ContactPhone, { publicFilter: { status: "active", deletedAt: null }, orderField: "order" }),
        listPostgresCmsRecords(ContactEmail, { publicFilter: { status: "active", deletedAt: null }, orderField: "order" }),
        listPostgresCmsRecords(ContactOffice, { publicFilter: { status: "active", deletedAt: null }, orderField: "order" }),
        listPostgresCmsRecords(WorkingHours, { publicFilter: { status: "active", deletedAt: null }, orderField: "order" })
      ]);
      return res.status(200).json({
        success: true,
        data: {
          settings: settingsRows[0] || DEFAULT_SETTINGS,
          phones: phones.length ? phones : DEFAULT_PHONES,
          emails: emails.length ? emails : DEFAULT_EMAILS,
          offices: offices.length ? offices : DEFAULT_OFFICES,
          workingHours: workingHours.length ? workingHours : DEFAULT_HOURS
        }
      });
    }

    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        data: {
          settings: DEFAULT_SETTINGS,
          phones: DEFAULT_PHONES,
          emails: DEFAULT_EMAILS,
          offices: DEFAULT_OFFICES,
          workingHours: DEFAULT_HOURS
        }
      });
    }

    await ensureInitialData();

    let settings = await ContactSettings.findOne({ settingsKey: "contact-settings" });
    if (!settings) {
      settings = DEFAULT_SETTINGS;
    }

    const phones = await ContactPhone.find({ status: "active", deletedAt: null }).sort({ order: 1, createdAt: 1 });
    const emails = await ContactEmail.find({ status: "active", deletedAt: null }).sort({ order: 1, createdAt: 1 });
    const offices = await ContactOffice.find({ status: "active", deletedAt: null }).sort({ order: 1, createdAt: 1 });
    const workingHours = await WorkingHours.find({ status: "active", deletedAt: null }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        settings,
        phones: phones.length > 0 ? phones : DEFAULT_PHONES,
        emails: emails.length > 0 ? emails : DEFAULT_EMAILS,
        offices: offices.length > 0 ? offices : DEFAULT_OFFICES,
        workingHours: workingHours.length > 0 ? workingHours : DEFAULT_HOURS
      }
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN SETTINGS CONTROLLER
// ----------------------------------------------------
export async function getAdminSettings(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    if (usesPostgres()) {
      const rows = await listPostgresCmsRecords(ContactSettings, { publicFilter: { settingsKey: "contact-settings" } });
      return res.status(200).json({ success: true, data: rows[0] || DEFAULT_SETTINGS });
    }
    if (!isDbConnected()) {
      return res.status(200).json({ success: true, data: DEFAULT_SETTINGS });
    }

    let settings = await ContactSettings.findOne({ settingsKey: "contact-settings" });
    if (!settings) {
      settings = await ContactSettings.create({ settingsKey: "contact-settings", ...DEFAULT_SETTINGS });
    }

    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminSettings(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const payload = { ...req.body };
    payload.updatedBy = req.user?.id;

    if (usesPostgres()) {
      const rows = await listPostgresCmsRecords(ContactSettings, { publicFilter: { settingsKey: "contact-settings" } });
      const settings = rows[0]
        ? await updateContactRecord(ContactSettings, rows[0]._id, payload)
        : await createContactRecord(ContactSettings, { settingsKey: "contact-settings", ...DEFAULT_SETTINGS, ...payload });
      return res.status(200).json({ success: true, message: "Contact settings updated successfully", data: settings });
    }

    const settings = await ContactSettings.findOneAndUpdate(
      { settingsKey: "contact-settings" },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Contact settings updated successfully",
      data: settings
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN PHONES CONTROLLER
// ----------------------------------------------------
export async function getAdminPhones(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const phones = await listContactRecords(ContactPhone, { deletedAt: null });
    return res.status(200).json({ success: true, data: phones });
  } catch (err) {
    next(err);
  }
}

export async function createAdminPhone(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const payload = { ...req.body };
    if (!payload.phone) {
      return res.status(400).json({ success: false, message: "Phone number is required", data: null });
    }

    const existing = usesPostgres()
      ? await listContactRecords(ContactPhone, { deletedAt: null })
      : null;
    const count = existing ? existing.length : await ContactPhone.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const phone = await createContactRecord(ContactPhone, payload);
    return res.status(201).json({ success: true, message: "Phone number added successfully", data: phone });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminPhone(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const phone = await updateContactRecord(ContactPhone, id, { ...req.body, updatedBy: req.user?.id });
    if (!phone) return res.status(404).json({ success: false, message: "Phone number not found", data: null });

    return res.status(200).json({ success: true, message: "Phone number updated successfully", data: phone });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminPhone(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const phone = await deleteContactRecord(ContactPhone, id);
    if (!phone) return res.status(404).json({ success: false, message: "Phone number not found", data: null });

    return res.status(200).json({ success: true, message: "Phone number deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminPhones(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });

    const updated = await reorderContactRecords(ContactPhone, items);
    if (!updated) return res.status(404).json({ success: false, message: "One or more phone numbers no longer exist", data: null });
    return res.status(200).json({ success: true, message: "Phones reordered successfully", data: updated });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN EMAILS CONTROLLER
// ----------------------------------------------------
export async function getAdminEmails(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const emails = await listContactRecords(ContactEmail, { deletedAt: null });
    return res.status(200).json({ success: true, data: emails });
  } catch (err) {
    next(err);
  }
}

export async function createAdminEmail(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const payload = { ...req.body };
    if (!payload.email) {
      return res.status(400).json({ success: false, message: "Email address is required", data: null });
    }

    if (payload.primary) {
      await clearPrimaryContactEmails();
    }

    const existing = usesPostgres() ? await listContactRecords(ContactEmail, { deletedAt: null }) : null;
    const count = existing ? existing.length : await ContactEmail.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const email = await createContactRecord(ContactEmail, payload);
    return res.status(201).json({ success: true, message: "Email address added successfully", data: email });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminEmail(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    if (req.body.primary) {
      await clearPrimaryContactEmails(id);
    }

    const email = await updateContactRecord(ContactEmail, id, { ...req.body, updatedBy: req.user?.id });
    if (!email) return res.status(404).json({ success: false, message: "Email address not found", data: null });

    return res.status(200).json({ success: true, message: "Email address updated successfully", data: email });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminEmail(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const email = await deleteContactRecord(ContactEmail, id);
    if (!email) return res.status(404).json({ success: false, message: "Email address not found", data: null });

    return res.status(200).json({ success: true, message: "Email address deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminEmails(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });
    const updated = await reorderContactRecords(ContactEmail, items);
    if (!updated) return res.status(404).json({ success: false, message: "One or more email addresses no longer exist", data: null });
    return res.status(200).json({ success: true, message: "Emails reordered successfully", data: updated });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN OFFICES CONTROLLER
// ----------------------------------------------------
export async function getAdminOffices(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const offices = await listContactRecords(ContactOffice, { deletedAt: null });
    return res.status(200).json({ success: true, data: offices });
  } catch (err) {
    next(err);
  }
}

export async function createAdminOffice(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const payload = { ...req.body };
    const existing = usesPostgres() ? await listContactRecords(ContactOffice, { deletedAt: null }) : null;
    const count = existing ? existing.length : await ContactOffice.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const office = await createContactRecord(ContactOffice, payload);
    return res.status(201).json({ success: true, message: "Office location added successfully", data: office });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminOffice(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const office = await updateContactRecord(ContactOffice, id, { ...req.body, updatedBy: req.user?.id });
    if (!office) return res.status(404).json({ success: false, message: "Office location not found", data: null });

    return res.status(200).json({ success: true, message: "Office location updated successfully", data: office });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminOffice(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const office = await deleteContactRecord(ContactOffice, id);
    if (!office) return res.status(404).json({ success: false, message: "Office location not found", data: null });

    return res.status(200).json({ success: true, message: "Office location deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminOffices(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });
    const updated = await reorderContactRecords(ContactOffice, items);
    if (!updated) return res.status(404).json({ success: false, message: "One or more offices no longer exist", data: null });
    return res.status(200).json({ success: true, message: "Offices reordered successfully", data: updated });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN WORKING HOURS CONTROLLER
// ----------------------------------------------------
export async function getAdminWorkingHours(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const hours = await listContactRecords(WorkingHours, { deletedAt: null });
    return res.status(200).json({ success: true, data: hours });
  } catch (err) {
    next(err);
  }
}

export async function createAdminWorkingHours(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const payload = { ...req.body };
    const existing = usesPostgres() ? await listContactRecords(WorkingHours, { deletedAt: null }) : null;
    const count = existing ? existing.length : await WorkingHours.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const hours = await createContactRecord(WorkingHours, payload);
    return res.status(201).json({ success: true, message: "Working hours added successfully", data: hours });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminWorkingHours(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const hours = await updateContactRecord(WorkingHours, id, { ...req.body, updatedBy: req.user?.id });
    if (!hours) return res.status(404).json({ success: false, message: "Working hours not found", data: null });

    return res.status(200).json({ success: true, message: "Working hours updated successfully", data: hours });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminWorkingHours(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const hours = await deleteContactRecord(WorkingHours, id);
    if (!hours) return res.status(404).json({ success: false, message: "Working hours not found", data: null });

    return res.status(200).json({ success: true, message: "Working hours deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminWorkingHours(req, res, next) {
  try {
    if (!await requireContactStore(res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });
    const updated = await reorderContactRecords(WorkingHours, items);
    if (!updated) return res.status(404).json({ success: false, message: "One or more working hours no longer exist", data: null });
    return res.status(200).json({ success: true, message: "Working hours reordered successfully", data: updated });
  } catch (err) {
    next(err);
  }
}
