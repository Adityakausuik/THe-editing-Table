import mongoose from "mongoose";
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
    label: "Primary Studio Email",
    primary: true,
    order: 1,
    status: "active"
  }
];

const DEFAULT_OFFICES = [
  {
    _id: "demo-o1",
    officeName: "Mohali Studio",
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
    const payload = req.body;
    payload.updatedBy = req.user?.id;

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
    const phones = await ContactPhone.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: phones });
  } catch (err) {
    next(err);
  }
}

export async function createAdminPhone(req, res, next) {
  try {
    const payload = req.body;
    if (!payload.phone) {
      return res.status(400).json({ success: false, message: "Phone number is required", data: null });
    }

    const count = await ContactPhone.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const phone = await ContactPhone.create(payload);
    return res.status(201).json({ success: true, message: "Phone number added successfully", data: phone });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminPhone(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    req.body.updatedBy = req.user?.id;
    const phone = await ContactPhone.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!phone) return res.status(404).json({ success: false, message: "Phone number not found", data: null });

    return res.status(200).json({ success: true, message: "Phone number updated successfully", data: phone });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminPhone(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const phone = await ContactPhone.findByIdAndUpdate(id, { deletedAt: new Date(), status: "inactive" }, { new: true });
    if (!phone) return res.status(404).json({ success: false, message: "Phone number not found", data: null });

    return res.status(200).json({ success: true, message: "Phone number deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminPhones(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });

    const bulkOps = items
      .filter((i) => mongoose.isValidObjectId(i.id))
      .map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } }
        }
      }));

    if (bulkOps.length > 0) {
      await ContactPhone.bulkWrite(bulkOps);
    }

    const updated = await ContactPhone.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
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
    const emails = await ContactEmail.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: emails });
  } catch (err) {
    next(err);
  }
}

export async function createAdminEmail(req, res, next) {
  try {
    const payload = req.body;
    if (!payload.email) {
      return res.status(400).json({ success: false, message: "Email address is required", data: null });
    }

    if (payload.primary) {
      await ContactEmail.updateMany({ deletedAt: null }, { $set: { primary: false } });
    }

    const count = await ContactEmail.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const email = await ContactEmail.create(payload);
    return res.status(201).json({ success: true, message: "Email address added successfully", data: email });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminEmail(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    if (req.body.primary) {
      await ContactEmail.updateMany({ _id: { $ne: id }, deletedAt: null }, { $set: { primary: false } });
    }

    req.body.updatedBy = req.user?.id;
    const email = await ContactEmail.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!email) return res.status(404).json({ success: false, message: "Email address not found", data: null });

    return res.status(200).json({ success: true, message: "Email address updated successfully", data: email });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminEmail(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const email = await ContactEmail.findByIdAndUpdate(id, { deletedAt: new Date(), status: "inactive" }, { new: true });
    if (!email) return res.status(404).json({ success: false, message: "Email address not found", data: null });

    return res.status(200).json({ success: true, message: "Email address deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminEmails(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });

    const bulkOps = items
      .filter((i) => mongoose.isValidObjectId(i.id))
      .map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } }
        }
      }));

    if (bulkOps.length > 0) {
      await ContactEmail.bulkWrite(bulkOps);
    }

    const updated = await ContactEmail.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
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
    const offices = await ContactOffice.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: offices });
  } catch (err) {
    next(err);
  }
}

export async function createAdminOffice(req, res, next) {
  try {
    const payload = req.body;
    const count = await ContactOffice.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const office = await ContactOffice.create(payload);
    return res.status(201).json({ success: true, message: "Office location added successfully", data: office });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminOffice(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    req.body.updatedBy = req.user?.id;
    const office = await ContactOffice.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!office) return res.status(404).json({ success: false, message: "Office location not found", data: null });

    return res.status(200).json({ success: true, message: "Office location updated successfully", data: office });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminOffice(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const office = await ContactOffice.findByIdAndUpdate(id, { deletedAt: new Date(), status: "inactive" }, { new: true });
    if (!office) return res.status(404).json({ success: false, message: "Office location not found", data: null });

    return res.status(200).json({ success: true, message: "Office location deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminOffices(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });

    const bulkOps = items
      .filter((i) => mongoose.isValidObjectId(i.id))
      .map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } }
        }
      }));

    if (bulkOps.length > 0) {
      await ContactOffice.bulkWrite(bulkOps);
    }

    const updated = await ContactOffice.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
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
    const hours = await WorkingHours.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: hours });
  } catch (err) {
    next(err);
  }
}

export async function createAdminWorkingHours(req, res, next) {
  try {
    const payload = req.body;
    const count = await WorkingHours.countDocuments({ deletedAt: null });
    payload.order = payload.order ?? count + 1;
    payload.createdBy = req.user?.id;
    payload.updatedBy = req.user?.id;

    const hours = await WorkingHours.create(payload);
    return res.status(201).json({ success: true, message: "Working hours added successfully", data: hours });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminWorkingHours(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    req.body.updatedBy = req.user?.id;
    const hours = await WorkingHours.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!hours) return res.status(404).json({ success: false, message: "Working hours not found", data: null });

    return res.status(200).json({ success: true, message: "Working hours updated successfully", data: hours });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminWorkingHours(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const hours = await WorkingHours.findByIdAndUpdate(id, { deletedAt: new Date(), status: "inactive" }, { new: true });
    if (!hours) return res.status(404).json({ success: false, message: "Working hours not found", data: null });

    return res.status(200).json({ success: true, message: "Working hours deleted successfully", data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminWorkingHours(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });

    const bulkOps = items
      .filter((i) => mongoose.isValidObjectId(i.id))
      .map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } }
        }
      }));

    if (bulkOps.length > 0) {
      await WorkingHours.bulkWrite(bulkOps);
    }

    const updated = await WorkingHours.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, message: "Working hours reordered successfully", data: updated });
  } catch (err) {
    next(err);
  }
}
