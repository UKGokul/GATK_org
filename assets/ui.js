(function (global) {
  'use strict';

  const schema = global.GATKSchema || (typeof require === 'function' ? require('./schema') : null);

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toCountMap(items) {
    return items.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
  }

  function countMissingDocuments(application) {
    const docs = asArray(application.requiredDocuments);
    if (docs.length === 0) {
      return 0;
    }
    return docs.filter((doc) => !doc || doc.submitted !== true).length;
  }

  function computeDashboardMetrics(students, config, now = new Date()) {
    const studentList = asArray(students);
    const statusCounts = toCountMap(asArray(config && config.applicationStatuses));

    let applications = 0;
    let upcomingDeadlines = 0;
    let missingDocs = 0;

    studentList.forEach((student) => {
      asArray(student.applications).forEach((application) => {
        applications += 1;

        if (schema && schema.validateApplicationStatus(application.status, config) && statusCounts[application.status] !== undefined) {
          statusCounts[application.status] += 1;
        }

        if (schema && schema.isDeadlineWarning(application.deadline, config, now)) {
          upcomingDeadlines += 1;
        }

        missingDocs += countMissingDocuments(application);
      });
    });

    return {
      students: studentList.length,
      applications,
      upcomingDeadlines,
      missingDocs,
      statusCounts,
    };
  }

  function computeStudentMetrics(student, config, now = new Date()) {
    const applications = asArray(student && student.applications);
    const byStatus = toCountMap(asArray(config && config.applicationStatuses));

    let missingDocuments = 0;
    let upcomingDeadlines = 0;

    applications.forEach((application) => {
      if (schema && schema.validateApplicationStatus(application.status, config) && byStatus[application.status] !== undefined) {
        byStatus[application.status] += 1;
      }

      if (schema && schema.isDeadlineWarning(application.deadline, config, now)) {
        upcomingDeadlines += 1;
      }

      missingDocuments += countMissingDocuments(application);
    });

    return {
      applications: applications.length,
      byStatus,
      missingDocuments,
      upcomingDeadlines,
    };
  }

  function statusClassName(status) {
    return `status-badge status-${String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }

  function renderStatusBadge(status) {
    const label = status || 'Unknown';
    return `<span class="${statusClassName(label)}" role="status" aria-live="polite" aria-label="Application status: ${label}">${label}</span>`;
  }

  function renderDeadlineCountdown(deadline, config, now = new Date()) {
    if (!schema || !schema.validateDeadline(deadline)) {
      return '<span class="deadline deadline-invalid" role="note" aria-label="Invalid deadline">Invalid deadline</span>';
    }

    const left = schema.daysLeft(deadline, now);
    const warning = schema.isDeadlineWarning(deadline, config, now);
    const stateClass = warning ? 'deadline-warning' : left < 0 ? 'deadline-past' : 'deadline-ok';

    let text = `${left} days left`;
    if (left === 0) {
      text = 'Due today';
    } else if (left < 0) {
      text = `${Math.abs(left)} days overdue`;
    }

    return `<span class="deadline ${stateClass}" role="note" aria-label="Deadline ${deadline}. ${text}">${text}</span>`;
  }

  function applyAccessibleFormLabels(container) {
    if (!container || !container.querySelectorAll) {
      return;
    }

    container.querySelectorAll('input, select, textarea, button').forEach((control) => {
      if (control.getAttribute('aria-label')) {
        return;
      }

      const id = control.id;
      let labelText = '';
      if (id) {
        const linkedLabel = container.querySelector(`label[for="${id}"]`);
        if (linkedLabel) {
          labelText = linkedLabel.textContent.trim();
        }
      }

      if (!labelText) {
        labelText = control.getAttribute('name') || control.getAttribute('placeholder') || control.tagName.toLowerCase();
      }

      control.setAttribute('aria-label', labelText);
    });
  }

  const api = {
    computeDashboardMetrics,
    computeStudentMetrics,
    renderStatusBadge,
    renderDeadlineCountdown,
    applyAccessibleFormLabels,
    countMissingDocuments,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.GATKUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
