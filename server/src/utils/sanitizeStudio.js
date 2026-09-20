export function sanitizeStudio(data) {
  if (typeof data === "string") {
    if (/^(https?:\/\/|\/|data:|blob:|mailto:)/i.test(data)) return data;
    if (/@/.test(data) && !/\s/.test(data)) return data;
    return data
      .replace(/DaVinci Resolve Studio/gi, "DaVinci Resolve")
      .replace(/Fairlight Studio/gi, "Fairlight Audio")
      .replace(/JOIN OUR CREATIVE STUDIO/gi, "JOIN OUR CREATIVE TEAM")
      .replace(/Studio Resident/gi, "Resident Artist")
      .replace(/Studio Control Login/gi, "Admin Control Login")
      .replace(/Studio Control Dashboard/gi, "Admin Control Dashboard")
      .replace(/Studio Phone/gi, "Phone")
      .replace(/Studio Locations/gi, "Locations")
      .replace(/Studio Email/gi, "Email Address")
      .replace(/Studio Standards/gi, "Quality Standards")
      .replace(/Global Digital Studio/gi, "Global Remote")
      .replace(/The Editing Table — Full-Service Studio Capabilities/gi, "The Editing Table — Full-Service Creative Capabilities")
      .replace(/Full-Service Studio Capabilities/gi, "Full-Service Creative Capabilities")
      .replace(/The Editing Table — Dedicated Studio Infrastructure/gi, "The Editing Table — Dedicated Infrastructure")
      .replace(/Dedicated Studio Infrastructure/gi, "Dedicated Infrastructure")
      .replace(/Editorial Film Studio/gi, "Editorial Film House")
      .replace(/Vogue Lumière Studio/gi, "Vogue Lumière House")
      .replace(/Pacific Harbor Studios/gi, "Pacific Harbor Films")
      .replace(/Studio Oversight & Quality Assurance/gi, "Creative Oversight & Quality Assurance")
      .replace(/Studio Quality Gate & Delivery/gi, "Quality Gate & Delivery")
      .replace(/STUDIO RECRUITMENT/gi, "TEAM RECRUITMENT")
      .replace(/Studio Artists & Team/gi, "Artists & Team")
      .replace(/Studio Management/gi, "Platform Management")
      .replace(/Studio Team/gi, "Team Members")
      .replace(/Studio Admin/gi, "Admin")
      .replace(/Studio \/ Hybrid/gi, "Onsite / Hybrid")
      .replace(/studio flexibility/gi, "flexible schedules")
      .replace(/rapidly expanding studio/gi, "rapidly expanding team")
      .replace(/studio atmosphere/gi, "team atmosphere")
      .replace(/studio environment/gi, "work environment")
      .replace(/studio LUTs/gi, "creative LUTs")
      .replace(/studio's dedicated/gi, "dedicated")
      .replace(/studio's workflow/gi, "workflow")
      .replace(/the studio's/gi, "our")
      .replace(/The studio's/gi, "Our")
      .replace(/studio's/gi, "production's")
      .replace(/Studio's/gi, "Production's")
      .replace(/premier studios worldwide/gi, "premier creators worldwide")
      .replace(/commercial studios worldwide/gi, "commercial creators worldwide")
      .replace(/studios worldwide/gi, "creators worldwide")
      .replace(/Studios Worldwide/gi, "Creators Worldwide")
      .replace(/strategic studio vision/gi, "strategic creative vision")
      .replace(/extension of your studio team/gi, "extension of your team")
      .replace(/luxury studios/gi, "luxury productions")
      .replace(/partner studios/gi, "partners")
      .replace(/Partner Studios/gi, "Partners")
      .replace(/partner studio/gi, "partner")
      .replace(/Partner Studio/gi, "Partner")
      .replace(/Post Production Studio/gi, "Post-Production")
      .replace(/Post-Production Studio/gi, "Post-Production")
      .replace(/post-production studio/gi, "post-production house")
      .replace(/\bSTUDIO\b/g, "TEAM")
      .replace(/\bStudio\b/g, "Creative")
      .replace(/\bstudio\b/g, "creative")
      .replace(/\bStudios\b/g, "Creators")
      .replace(/\bstudios\b/g, "creators");
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeStudio);
  }
  if (data !== null && typeof data === "object") {
    const copy = {};
    for (const [key, val] of Object.entries(data)) {
      copy[key] = sanitizeStudio(val);
    }
    return copy;
  }
  return data;
}
