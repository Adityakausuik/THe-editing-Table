/* global confirm */
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import CmsOrderControls from "../components/CmsOrderControls.jsx";

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

export default function ContactSettingsCMS() {
  const [activeTab, setActiveTab] = useState("section"); // 'section', 'phones', 'emails', 'offices', 'hours', 'cta'
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [phones, setPhones] = useState([]);
  const [emails, setEmails] = useState([]);
  const [offices, setOffices] = useState([]);
  const [hours, setHours] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");

  // Modal State
  const [modalType, setModalType] = useState(null); // 'phone', 'email', 'office', 'hours'
  const [editingItem, setEditingItem] = useState(null);

  // Form States
  const [phoneForm, setPhoneForm] = useState({
    country: "India",
    countryCode: "IN",
    phone: "",
    displayPhone: "",
    label: "",
    whatsappEnabled: false,
    callEnabled: true,
    status: "active"
  });

  const [emailForm, setEmailForm] = useState({
    email: "",
    label: "",
    primary: false,
    status: "active"
  });

  const [officeForm, setOfficeForm] = useState({
    officeName: "Headquarters",
    companyName: "NHK INFOTECH",
    addressLine1: "A-28, Industrial Area, Sector 73",
    addressLine2: "Mohali, Punjab 160055",
    city: "Mohali",
    state: "Punjab",
    country: "India",
    postalCode: "160055",
    googleMapUrl: "",
    status: "active"
  });

  const [hoursForm, setHoursForm] = useState({
    dayFrom: "Mon",
    dayTo: "Sat",
    openingTime: "10:00 AM",
    closingTime: "7:00 PM",
    customText: "",
    closed: false,
    status: "active"
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sData, pData, eData, oData, hData] = await Promise.all([
        apiFetch("/api/v1/admin/contact/settings").catch(() => null),
        apiFetch("/api/v1/admin/contact/phones").catch(() => null),
        apiFetch("/api/v1/admin/contact/emails").catch(() => null),
        apiFetch("/api/v1/admin/contact/offices").catch(() => null),
        apiFetch("/api/v1/admin/contact/hours").catch(() => null)
      ]);

      if (sData?.data) setSettings({ ...DEFAULT_SETTINGS, ...sData.data });
      if (Array.isArray(pData?.data)) setPhones(pData.data);
      if (Array.isArray(eData?.data)) setEmails(eData.data);
      if (Array.isArray(oData?.data)) setOffices(oData.data);
      if (Array.isArray(hData?.data)) setHours(hData.data);
    } catch (err) {
      setError(err.message || "Failed to fetch contact settings data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const showToast = (msg) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 3500);
  };

  // ----------------------------------------------------
  // SETTINGS SAVE
  // ----------------------------------------------------
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/admin/contact/settings", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      showToast("Contact section settings updated successfully!");
    } catch (err) {
      setError(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // PHONE CRUD
  // ----------------------------------------------------
  const openPhoneModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setPhoneForm({
        country: item.country || "India",
        countryCode: item.countryCode || "IN",
        phone: item.phone || "",
        displayPhone: item.displayPhone || "",
        label: item.label || "",
        whatsappEnabled: Boolean(item.whatsappEnabled),
        callEnabled: item.callEnabled !== undefined ? item.callEnabled : true,
        status: item.status || "active"
      });
    } else {
      setPhoneForm({
        country: "India",
        countryCode: "IN",
        phone: "",
        displayPhone: "",
        label: "",
        whatsappEnabled: false,
        callEnabled: true,
        status: "active"
      });
    }
    setModalType("phone");
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingItem
        ? `/api/v1/admin/contact/phones/${editingItem._id}`
        : "/api/v1/admin/contact/phones";
      const method = editingItem ? "PUT" : "POST";

      await apiFetch(url, { method, body: JSON.stringify(phoneForm) });
      showToast(`Phone number ${editingItem ? "updated" : "added"} successfully!`);
      setModalType(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save phone number.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhone = async (id) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;
    try {
      await apiFetch(`/api/v1/admin/contact/phones/${id}`, { method: "DELETE" });
      showToast("Phone number deleted successfully.");
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to delete phone number.");
    }
  };

  const handleTogglePhoneStatus = async (item) => {
    try {
      const nextStatus = item.status === "active" ? "inactive" : "active";
      await apiFetch(`/api/v1/admin/contact/phones/${item._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      showToast(`Phone status set to ${nextStatus}.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to toggle status.");
    }
  };

  // ----------------------------------------------------
  // EMAIL CRUD
  // ----------------------------------------------------
  const openEmailModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setEmailForm({
        email: item.email || "",
        label: item.label || "",
        primary: Boolean(item.primary),
        status: item.status || "active"
      });
    } else {
      setEmailForm({
        email: "",
        label: "",
        primary: false,
        status: "active"
      });
    }
    setModalType("email");
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingItem
        ? `/api/v1/admin/contact/emails/${editingItem._id}`
        : "/api/v1/admin/contact/emails";
      const method = editingItem ? "PUT" : "POST";

      await apiFetch(url, { method, body: JSON.stringify(emailForm) });
      showToast(`Email address ${editingItem ? "updated" : "added"} successfully!`);
      setModalType(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save email address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmail = async (id) => {
    if (!confirm("Are you sure you want to delete this email address?")) return;
    try {
      await apiFetch(`/api/v1/admin/contact/emails/${id}`, { method: "DELETE" });
      showToast("Email address deleted successfully.");
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to delete email address.");
    }
  };

  const handleToggleEmailStatus = async (item) => {
    try {
      const nextStatus = item.status === "active" ? "inactive" : "active";
      await apiFetch(`/api/v1/admin/contact/emails/${item._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      showToast(`Email status set to ${nextStatus}.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to toggle status.");
    }
  };

  // ----------------------------------------------------
  // OFFICE CRUD
  // ----------------------------------------------------
  const openOfficeModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setOfficeForm({
        officeName: item.officeName || "Mohali Studio",
        companyName: item.companyName || "NHK INFOTECH",
        addressLine1: item.addressLine1 || "",
        addressLine2: item.addressLine2 || "",
        city: item.city || "Mohali",
        state: item.state || "Punjab",
        country: item.country || "India",
        postalCode: item.postalCode || "160055",
        googleMapUrl: item.googleMapUrl || "",
        status: item.status || "active"
      });
    } else {
      setOfficeForm({
        officeName: "Headquarters",
        companyName: "NHK INFOTECH",
        addressLine1: "A-28, Industrial Area, Sector 73",
        addressLine2: "Mohali, Punjab 160055",
        city: "Mohali",
        state: "Punjab",
        country: "India",
        postalCode: "160055",
        googleMapUrl: "",
        status: "active"
      });
    }
    setModalType("office");
  };

  const handleSaveOffice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingItem
        ? `/api/v1/admin/contact/offices/${editingItem._id}`
        : "/api/v1/admin/contact/offices";
      const method = editingItem ? "PUT" : "POST";

      await apiFetch(url, { method, body: JSON.stringify(officeForm) });
      showToast(`Office location ${editingItem ? "updated" : "added"} successfully!`);
      setModalType(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save office location.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffice = async (id) => {
    if (!confirm("Are you sure you want to delete this office location?")) return;
    try {
      await apiFetch(`/api/v1/admin/contact/offices/${id}`, { method: "DELETE" });
      showToast("Office location deleted successfully.");
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to delete office location.");
    }
  };

  const handleToggleOfficeStatus = async (item) => {
    try {
      const nextStatus = item.status === "active" ? "inactive" : "active";
      await apiFetch(`/api/v1/admin/contact/offices/${item._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      showToast(`Office status set to ${nextStatus}.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to toggle status.");
    }
  };

  // ----------------------------------------------------
  // WORKING HOURS CRUD
  // ----------------------------------------------------
  const openHoursModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setHoursForm({
        dayFrom: item.dayFrom || "Mon",
        dayTo: item.dayTo || "Sat",
        openingTime: item.openingTime || "10:00 AM",
        closingTime: item.closingTime || "7:00 PM",
        customText: item.customText || "",
        closed: Boolean(item.closed),
        status: item.status || "active"
      });
    } else {
      setHoursForm({
        dayFrom: "Mon",
        dayTo: "Sat",
        openingTime: "10:00 AM",
        closingTime: "7:00 PM",
        customText: "",
        closed: false,
        status: "active"
      });
    }
    setModalType("hours");
  };

  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingItem
        ? `/api/v1/admin/contact/hours/${editingItem._id}`
        : "/api/v1/admin/contact/hours";
      const method = editingItem ? "PUT" : "POST";

      await apiFetch(url, { method, body: JSON.stringify(hoursForm) });
      showToast(`Working hours ${editingItem ? "updated" : "added"} successfully!`);
      setModalType(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save working hours.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHours = async (id) => {
    if (!confirm("Are you sure you want to delete this working hours entry?")) return;
    try {
      await apiFetch(`/api/v1/admin/contact/hours/${id}`, { method: "DELETE" });
      showToast("Working hours entry deleted successfully.");
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to delete working hours.");
    }
  };

  const handleToggleHoursStatus = async (item) => {
    try {
      const nextStatus = item.status === "active" ? "inactive" : "active";
      await apiFetch(`/api/v1/admin/contact/hours/${item._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      showToast(`Working hours status set to ${nextStatus}.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to toggle status.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-forest">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            Studio Contact Management
          </span>
          <h1 className="font-serif text-3xl text-forest">Contact Settings</h1>
        </div>

        <button
          type="button"
          onClick={fetchAllData}
          disabled={loading}
          className="inline-flex items-center gap-2 p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} /> Refresh
        </button>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900 shadow-soft">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 shadow-soft">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-sage-border pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("section")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "section"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Settings className="h-3.5 w-3.5" /> Section &amp; Headings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("phones")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "phones"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Phone className="h-3.5 w-3.5" /> Phone Numbers ({phones.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emails")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "emails"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Mail className="h-3.5 w-3.5" /> Emails ({emails.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("offices")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "offices"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" /> Offices ({offices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("hours")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "hours"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Working Hours ({hours.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cta")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "cta"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" /> CTA Button
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: SECTION & HEADINGS
      ---------------------------------------------------- */}
      {activeTab === "section" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 bg-sage-card p-6 rounded-3xl border border-sage-border shadow-soft">
          <h2 className="font-serif text-2xl text-forest pb-2 border-b border-sage-border">
            Headings &amp; Block Visibility Settings
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Main Section Title
              </label>
              <input
                type="text"
                value={settings.sectionTitle}
                onChange={(e) => setSettings({ ...settings, sectionTitle: e.target.value })}
                className="field-luxury text-sm font-serif"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Phone Block Heading
              </label>
              <input
                type="text"
                value={settings.phoneHeading}
                onChange={(e) => setSettings({ ...settings, phoneHeading: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Email Block Heading
              </label>
              <input
                type="text"
                value={settings.emailHeading}
                onChange={(e) => setSettings({ ...settings, emailHeading: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Office Block Heading
              </label>
              <input
                type="text"
                value={settings.officeHeading}
                onChange={(e) => setSettings({ ...settings, officeHeading: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Working Hours Block Heading
              </label>
              <input
                type="text"
                value={settings.workingHoursHeading}
                onChange={(e) => setSettings({ ...settings, workingHoursHeading: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-sage-border/60">
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sectionEnabled}
                onChange={(e) => setSettings({ ...settings, sectionEnabled: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Enable Entire Contact Section
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.phoneEnabled}
                onChange={(e) => setSettings({ ...settings, phoneEnabled: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show Phone Block
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show Email Block
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.officeEnabled}
                onChange={(e) => setSettings({ ...settings, officeEnabled: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show Office Block
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.workingHoursEnabled}
                onChange={(e) => setSettings({ ...settings, workingHoursEnabled: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show Working Hours Block
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Section Settings"}
            </button>
          </div>
        </form>
      )}

      {/* ----------------------------------------------------
          TAB 2: PHONE NUMBERS
      ---------------------------------------------------- */}
      {activeTab === "phones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest">Manage International Phone Numbers</h2>
            <button
              type="button"
              onClick={() => openPhoneModal()}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2 text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Phone Number
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {phones.map((p) => (
              <div
                key={p._id}
                className={`rounded-3xl border bg-sage-card p-5 shadow-soft space-y-3 flex items-center justify-between ${
                  p.status === "active" ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-site bg-sage-secondary/80 px-2 py-0.5 rounded-lg border border-[rgb(72,125,72)]/30">
                      {p.countryCode}
                    </span>
                    <span className="font-serif text-lg font-semibold text-forest">{p.phone}</span>
                  </div>
                  <p className="text-xs text-sage-muted">{p.country} {p.label ? `• ${p.label}` : ""}</p>
                </div>

                <div className="flex items-center gap-2">
                  <CmsOrderControls
                    collection={phones}
                    setCollection={setPhones}
                    itemId={p._id}
                    endpoint="/api/v1/admin/contact/phones"
                    onError={setError}
                  />

                  <button
                    type="button"
                    onClick={() => handleTogglePhoneStatus(p)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      p.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-rose-200 text-rose-700 bg-rose-50"
                    }`}
                  >
                    {p.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openPhoneModal(p)}
                    className="p-2 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePhone(p._id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: EMAILS
      ---------------------------------------------------- */}
      {activeTab === "emails" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest">Manage Studio Emails</h2>
            <button
              type="button"
              onClick={() => openEmailModal()}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2 text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Email Address
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {emails.map((e) => (
              <div
                key={e._id}
                className={`rounded-3xl border bg-sage-card p-5 shadow-soft space-y-3 flex items-center justify-between ${
                  e.status === "active" ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg font-semibold text-forest">{e.email}</span>
                    {e.primary && (
                      <span className="bg-[rgb(72,125,72)] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  {e.label && <p className="text-xs text-sage-muted">{e.label}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <CmsOrderControls
                    collection={emails}
                    setCollection={setEmails}
                    itemId={e._id}
                    endpoint="/api/v1/admin/contact/emails"
                    onError={setError}
                  />

                  <button
                    type="button"
                    onClick={() => handleToggleEmailStatus(e)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      e.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-rose-200 text-rose-700 bg-rose-50"
                    }`}
                  >
                    {e.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEmailModal(e)}
                    className="p-2 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteEmail(e._id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: OFFICES
      ---------------------------------------------------- */}
      {activeTab === "offices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest">Manage Office Locations</h2>
            <button
              type="button"
              onClick={() => openOfficeModal()}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2 text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Office Location
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {offices.map((o) => (
              <div
                key={o._id}
                className={`rounded-3xl border bg-sage-card p-5 shadow-soft space-y-3 flex items-center justify-between ${
                  o.status === "active" ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
                }`}
              >
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-semibold text-forest">{o.companyName} ({o.officeName})</h3>
                  <p className="text-xs text-sage-muted">{o.addressLine1}</p>
                  <p className="text-xs text-sage-muted">{o.addressLine2}</p>
                </div>

                <div className="flex items-center gap-2">
                  <CmsOrderControls
                    collection={offices}
                    setCollection={setOffices}
                    itemId={o._id}
                    endpoint="/api/v1/admin/contact/offices"
                    onError={setError}
                  />

                  <button
                    type="button"
                    onClick={() => handleToggleOfficeStatus(o)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      o.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-rose-200 text-rose-700 bg-rose-50"
                    }`}
                  >
                    {o.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openOfficeModal(o)}
                    className="p-2 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteOffice(o._id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: WORKING HOURS
      ---------------------------------------------------- */}
      {activeTab === "hours" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest">Manage Working Hours</h2>
            <button
              type="button"
              onClick={() => openHoursModal()}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2 text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Working Hours
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {hours.map((h) => (
              <div
                key={h._id}
                className={`rounded-3xl border bg-sage-card p-5 shadow-soft space-y-3 flex items-center justify-between ${
                  h.status === "active" ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
                }`}
              >
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-semibold text-forest">{h.dayFrom} – {h.dayTo}</h3>
                  <p className="text-xs text-sage-muted">{h.closed ? "Closed" : `${h.openingTime} – ${h.closingTime}`}</p>
                </div>

                <div className="flex items-center gap-2">
                  <CmsOrderControls
                    collection={hours}
                    setCollection={setHours}
                    itemId={h._id}
                    endpoint="/api/v1/admin/contact/hours"
                    onError={setError}
                  />

                  <button
                    type="button"
                    onClick={() => handleToggleHoursStatus(h)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      h.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-rose-200 text-rose-700 bg-rose-50"
                    }`}
                  >
                    {h.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openHoursModal(h)}
                    className="p-2 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteHours(h._id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 6: CTA BUTTON
      ---------------------------------------------------- */}
      {activeTab === "cta" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 bg-sage-card p-6 rounded-3xl border border-sage-border shadow-soft">
          <h2 className="font-serif text-2xl text-forest pb-2 border-b border-sage-border">
            &ldquo;Let&apos;s Work Together&rdquo; CTA Button Settings
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Button Text
              </label>
              <input
                type="text"
                value={settings.ctaText}
                onChange={(e) => setSettings({ ...settings, ctaText: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Button URL / Link
              </label>
              <input
                type="text"
                value={settings.ctaLink}
                onChange={(e) => setSettings({ ...settings, ctaLink: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-sage-border/60">
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ctaEnabled}
                onChange={(e) => setSettings({ ...settings, ctaEnabled: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show CTA Button
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ctaNewTab}
                onChange={(e) => setSettings({ ...settings, ctaNewTab: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Open in New Tab
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save CTA Settings"}
            </button>
          </div>
        </form>
      )}

      {/* ----------------------------------------------------
          MODALS
      ---------------------------------------------------- */}
      {modalType === "phone" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md">
          <div className="relative max-w-md w-full rounded-3xl border border-sage-border bg-sage-card p-6 shadow-deep space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-border">
              <h3 className="font-serif text-xl text-forest">{editingItem ? "Edit Phone Number" : "Add Phone Number"}</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-sage-muted hover:text-forest">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Country Name</label>
                <input
                  type="text"
                  required
                  value={phoneForm.country}
                  onChange={(e) => setPhoneForm({ ...phoneForm, country: e.target.value })}
                  placeholder="e.g. India, United States"
                  className="field-luxury text-sm"
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Short Code (IN, US, GB, FR)</label>
                  <input
                    type="text"
                    required
                    value={phoneForm.countryCode}
                    onChange={(e) => setPhoneForm({ ...phoneForm, countryCode: e.target.value.toUpperCase() })}
                    placeholder="IN"
                    className="field-luxury text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phoneForm.phone}
                    onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value, displayPhone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="field-luxury text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-sage-border">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-2 rounded-full border text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69]">
                  {saving ? "Saving..." : "Save Phone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === "email" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md">
          <div className="relative max-w-md w-full rounded-3xl border border-sage-border bg-sage-card p-6 shadow-deep space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-border">
              <h3 className="font-serif text-xl text-forest">{editingItem ? "Edit Email Address" : "Add Email Address"}</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-sage-muted hover:text-forest">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  placeholder="hello@theeditingtable.com"
                  className="field-luxury text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Label (Optional)</label>
                <input
                  type="text"
                  value={emailForm.label}
                  onChange={(e) => setEmailForm({ ...emailForm, label: e.target.value })}
                  placeholder="Primary Studio Email"
                  className="field-luxury text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="primaryEmailCheck"
                  checked={emailForm.primary}
                  onChange={(e) => setEmailForm({ ...emailForm, primary: e.target.checked })}
                  className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
                />
                <label htmlFor="primaryEmailCheck" className="text-xs font-semibold text-forest cursor-pointer">
                  Set as Primary Studio Email
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-sage-border">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-2 rounded-full border text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69]">
                  {saving ? "Saving..." : "Save Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === "office" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md">
          <div className="relative max-w-md w-full rounded-3xl border border-sage-border bg-sage-card p-6 shadow-deep space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-border">
              <h3 className="font-serif text-xl text-forest">{editingItem ? "Edit Office Location" : "Add Office Location"}</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-sage-muted hover:text-forest">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOffice} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Company Name</label>
                  <input
                    type="text"
                    value={officeForm.companyName}
                    onChange={(e) => setOfficeForm({ ...officeForm, companyName: e.target.value })}
                    placeholder="NHK INFOTECH"
                    className="field-luxury text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Office Name</label>
                  <input
                    type="text"
                    value={officeForm.officeName}
                    onChange={(e) => setOfficeForm({ ...officeForm, officeName: e.target.value })}
                    placeholder="Headquarters"
                    className="field-luxury text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={officeForm.addressLine1}
                  onChange={(e) => setOfficeForm({ ...officeForm, addressLine1: e.target.value })}
                  placeholder="A-28, Industrial Area, Sector 73"
                  className="field-luxury text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={officeForm.addressLine2}
                  onChange={(e) => setOfficeForm({ ...officeForm, addressLine2: e.target.value })}
                  placeholder="Mohali, Punjab 160055"
                  className="field-luxury text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-sage-border">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-2 rounded-full border text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69]">
                  {saving ? "Saving..." : "Save Office"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === "hours" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md">
          <div className="relative max-w-md w-full rounded-3xl border border-sage-border bg-sage-card p-6 shadow-deep space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-border">
              <h3 className="font-serif text-xl text-forest">{editingItem ? "Edit Working Hours" : "Add Working Hours"}</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-sage-muted hover:text-forest">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Day From</label>
                  <input
                    type="text"
                    required
                    value={hoursForm.dayFrom}
                    onChange={(e) => setHoursForm({ ...hoursForm, dayFrom: e.target.value })}
                    placeholder="Mon"
                    className="field-luxury text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Day To</label>
                  <input
                    type="text"
                    required
                    value={hoursForm.dayTo}
                    onChange={(e) => setHoursForm({ ...hoursForm, dayTo: e.target.value })}
                    placeholder="Sat"
                    className="field-luxury text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Opening Time</label>
                  <input
                    type="text"
                    value={hoursForm.openingTime}
                    onChange={(e) => setHoursForm({ ...hoursForm, openingTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="field-luxury text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">Closing Time</label>
                  <input
                    type="text"
                    value={hoursForm.closingTime}
                    onChange={(e) => setHoursForm({ ...hoursForm, closingTime: e.target.value })}
                    placeholder="7:00 PM"
                    className="field-luxury text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-sage-border">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-2 rounded-full border text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69]">
                  {saving ? "Saving..." : "Save Hours"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
