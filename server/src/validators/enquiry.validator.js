export function validateEnquiryInput(data) {
  const errors = {};

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.name = "Full name must be at least 2 characters.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== "string" || !emailRegex.test(data.email.trim())) {
    errors.email = "A valid email address is required.";
  }

  if (!data.service || typeof data.service !== "string" || data.service.trim() === "") {
    errors.service = "Please select a required service.";
  }

  if (!data.description || typeof data.description !== "string" || data.description.trim().length < 10) {
    errors.description = "Project description must be at least 10 characters.";
  }

  if (data.referenceUrl && typeof data.referenceUrl === "string" && data.referenceUrl.trim() !== "") {
    try {
      new URL(data.referenceUrl);
    } catch {
      errors.referenceUrl = "Reference URL must be a valid website URL (including http/https).";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
