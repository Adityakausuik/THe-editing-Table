import assert from "node:assert/strict";
import test from "node:test";
import { validateEnquiryInput } from "./enquiry.validator.js";

const valid = {
  name: "Ava Sample",
  email: "ava@example.com",
  service: "Color Grading",
  description: "Please grade a short wedding film."
};

test("enquiry validation accepts required fields and optional contact details", () => {
  const result = validateEnquiryInput(valid);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.normalizedData.email, valid.email);
});

test("enquiry validation reports field-specific required and URL errors", () => {
  const result = validateEnquiryInput({ ...valid, service: "", referenceUrl: "not a URL" });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.service, "Please select a required service.");
  assert.equal(result.errors.referenceUrl, "Reference URL must be a valid website URL (including http/https).");
});

test("enquiry validation supports the existing public form field aliases", () => {
  const result = validateEnquiryInput({
    fullName: valid.name,
    email: valid.email,
    service: valid.service,
    projectDetails: valid.description,
    referenceLink: "https://drive.google.com/example",
    budgetRange: "$2,500 - $5,000"
  });
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedData.name, valid.name);
  assert.equal(result.normalizedData.description, valid.description);
});
