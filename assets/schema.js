(function (global) {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeDate(isoDate) {
    if (!ISO_DATE_REGEX.test(isoDate)) {
      return null;
    }
    const parsed = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  function validateEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
  }

  function validateDeadline(deadline) {
    if (typeof deadline !== 'string') {
      return false;
    }
    const normalized = deadline.trim();
    if (!ISO_DATE_REGEX.test(normalized)) {
      return false;
    }

    const date = normalizeDate(normalized);
    if (!date) {
      return false;
    }

    const [year, month, day] = normalized.split('-').map(Number);
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }

  function validateApplicationStatus(status, config) {
    if (typeof status !== 'string' || !isPlainObject(config) || !Array.isArray(config.applicationStatuses)) {
      return false;
    }
    return config.applicationStatuses.includes(status);
  }

  function daysLeft(deadline, now = new Date()) {
    if (!validateDeadline(deadline)) {
      return null;
    }

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const due = normalizeDate(deadline);
    const diffMs = due.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  function isDeadlineWarning(deadline, config, now = new Date()) {
    if (!isPlainObject(config) || typeof config.deadlineWarningDays !== 'number') {
      return false;
    }

    const remaining = daysLeft(deadline, now);
    return remaining !== null && remaining >= 0 && remaining <= config.deadlineWarningDays;
  }

  function buildValidationErrors(application, config) {
    const errors = {};

    if (!validateEmail(application.email)) {
      errors.email = 'Email must be a valid format (example@domain.com).';
    }

    if (!validateDeadline(application.deadline)) {
      errors.deadline = 'Deadline must be in ISO format yyyy-mm-dd.';
    }

    if (!validateApplicationStatus(application.status, config)) {
      errors.status = 'Status must be one of config.applicationStatuses.';
    }

    return errors;
  }

  function validateApplication(application, config) {
    const errors = buildValidationErrors(application || {}, config || {});
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  const api = {
    validateEmail,
    validateDeadline,
    validateApplicationStatus,
    validateApplication,
    daysLeft,
    isDeadlineWarning,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.GATKSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
