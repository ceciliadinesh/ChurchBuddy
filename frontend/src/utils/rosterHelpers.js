
export const ROSTER_SLOTS = [
    "7:00 AM",
    "7:30 AM",
    "9:45 AM",
    "6:00 PM",
  ];
  
  export const READING_ORDER = [
    "Ang.",
    "Rdng.1",
    "Rdng.2",
    "P.S.",
    "POF",
  ];
  
  export function getList(data) {
    return Array.isArray(data) ? data : data?.items || [];
  }
  
  export function getLectorName(lector, lectorId) {
    if (!lector) {
      return lectorId != null
        ? `Lector #${lectorId}`
        : "Unassigned";
    }
  
    const firstName =
      lector.first_name || lector.firstname || "";
  
    const lastName =
      lector.last_name || lector.lastname || "";
  
    const combined = `${firstName} ${lastName}`.trim();
  
    return (
      lector.full_name ||
      lector.name ||
      combined ||
      lector.email ||
      `Lector #${lectorId}`
    );
  }
  
  export function getAssignmentName(item) {
    return (
      item.lector_name ||
      getLectorName(item.lector, item.lector_id)
    );
  }
  
  export function getMassTime(item) {
    return (
      item.mass_slot?.mass_time ||
      item.mass_slot?.time ||
      item.mass_time ||
      item.slot_time ||
      ""
    );
  }
  
  export function formatMassTime(value) {
    if (!value) return "Time unavailable";
  
    const parts = String(value).split(":");
    const hour = Number(parts[0]);
    const minute = parts[1] || "00";
  
    if (Number.isNaN(hour)) return value;
  
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
  
    return `${displayHour}:${minute} ${period}`;
  }
  
  export function getDateOnly(value) {
    return String(value || "").slice(0, 10);
  }
  
  export function getReadingLabel(item) {
    const value = String(
      item.reading ||
        item.reading_type ||
        item.responsibility ||
        item.position_name ||
        item.position ||
        ""
    ).trim();
  
    if (!value) return "";
  
    const normalized = value.toLowerCase().replace(/\s+/g, "");
  
    const aliases = {
      ang: "Ang.",
      angelus: "Ang.",
      "rdng.1": "Rdng.1",
      reading1: "Rdng.1",
      "rdng.2": "Rdng.2",
      reading2: "Rdng.2",
      ps: "P.S.",
      "p.s.": "P.S.",
      pof: "POF",
    };
  
    return aliases[normalized] || value;
  }
  
  export function formatRosterDate(dateValue) {
    if (!dateValue) {
      return { date: "", day: "" };
    }
  
    const date = new Date(
      `${String(dateValue).slice(0, 10)}T12:00:00`
    );
  
    if (Number.isNaN(date.getTime())) {
      return { date: String(dateValue), day: "" };
    }
  
    return {
      date: date
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
        .toUpperCase(),
  
      day: date
        .toLocaleDateString("en-US", {
          weekday: "short",
        })
        .toUpperCase(),
    };
  }
  
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  export function groupCalendarAssignments(assignments) {
    const groups = {};
  
    assignments.forEach((item) => {
      const date = getDateOnly(
        item.assignment_date || item.date
      );
  
      if (!date) return;
  
      if (!groups[date]) {
        groups[date] = [];
      }
  
      groups[date].push(item);
    });
  
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        ...formatRosterDate(date),
  
        day: new Date(
          `${date}T12:00:00`
        ).toLocaleDateString("en-US", {
          weekday: "long",
        }),
  
        slots: [...items].sort((a, b) => {
          const timeA = getMassTime(a);
          const timeB = getMassTime(b);
  
          if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
          }
  
          return (
            (a.position_number || 0) -
            (b.position_number || 0)
          );
        }),
      }));
  }
  
  function getRosterSlotIndex(item) {
    const raw = String(getMassTime(item))
      .toLowerCase()
      .replace(/\s+/g, "");
  
    const compact = raw.replace(/[^a-z0-9]/g, "");
  
    if (
      compact.includes("700am") ||
      compact.includes("7am") ||
      compact.includes("0700")
    ) {
      return 0;
    }
  
    if (
      compact.includes("730am") ||
      compact.includes("730") ||
      compact.includes("0730")
    ) {
      return 1;
    }
  
    if (
      compact.includes("945am") ||
      compact.includes("945") ||
      compact.includes("0945")
    ) {
      return 2;
    }
  
    if (
      compact.includes("600pm") ||
      compact.includes("6pm") ||
      compact.includes("1800")
    ) {
      return 3;
    }
  
    return ROSTER_SLOTS.findIndex(
      (slot) =>
        raw === slot.toLowerCase().replace(/\s+/g, "")
    );
  }
  
  export function buildRosterGroups(assignments) {
    const byDate = new Map();
  
    assignments.forEach((item) => {
      const date = getDateOnly(
        item.assignment_date || item.date
      );
  
      if (!date) return;
  
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
  
      byDate.get(date).push(item);
    });
  
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateValue, items]) => {
        const slotItems = [[], [], [], []];
        const readingLabels = new Set();
  
        items.forEach((item) => {
          const label = getReadingLabel(item);
  
          if (label) {
            readingLabels.add(label);
          }
  
          const slot = getRosterSlotIndex(item);
  
          if (slot >= 0) {
            slotItems[slot].push(item);
          }
        });
  
        const labels = [...readingLabels].sort((a, b) => {
          const ai = READING_ORDER.indexOf(a);
          const bi = READING_ORDER.indexOf(b);
  
          if (ai === -1 && bi === -1) {
            return a.localeCompare(b);
          }
  
          if (ai === -1) return 1;
          if (bi === -1) return -1;
  
          return ai - bi;
        });
  
        const rowCount = Math.max(
          1,
          labels.length,
          ...slotItems.map((slot) => slot.length)
        );
  
        const rows = Array.from(
          { length: rowCount },
          (_, index) => ({
            reading: labels[index] || "",
            slots: slotItems.map((slot) =>
              slot[index]
                ? getAssignmentName(slot[index])
                : ""
            ),
          })
        );
  
        const unknownSlotItems = items.filter(
          (item) => getRosterSlotIndex(item) < 0
        );
  
        unknownSlotItems.forEach((item, index) => {
          const rowIndex = index % rows.length;
  
          const extra = [
            getReadingLabel(item),
            getAssignmentName(item),
          ]
            .filter(Boolean)
            .join(" — ");
  
          rows[rowIndex].slots[0] = [
            rows[rowIndex].slots[0],
            extra,
          ]
            .filter(Boolean)
            .join("; ");
        });
  
        return {
          dateValue,
          ...formatRosterDate(dateValue),
          rows,
        };
      });
  }
  
  export function buildRosterDocument(form, assignments) {
    const groups = buildRosterGroups(assignments);
  
    const monthYear =
      form?.title ||
      (form?.month && form?.year
        ? `${new Date(
            Number(form.year),
            Number(form.month) - 1,
            1
          ).toLocaleDateString("en-US", {
            month: "long",
          })} ${form.year}`
        : "MONTH YEAR");
  
    const bodyRows = groups
      .map((group) =>
        group.rows
          .map(
            (row, index) => `
        <tr class="${index === 0 ? "date-start" : ""}">
          ${
            index === 0
              ? `
                <td class="date" rowspan="${group.rows.length}">
                  ${escapeHtml(group.date)}
                </td>
                <td class="day" rowspan="${group.rows.length}">
                  ${escapeHtml(group.day)}
                </td>
              `
              : ""
          }
  
          <td class="reading">
            ${escapeHtml(row.reading)}
          </td>
  
          ${row.slots
            .map((name) => {
              const special =
                /community|school|liturgy team|youth|sodality/i.test(
                  name
                );
  
              return `
              <td class="${special ? "special" : "person"}">
                ${escapeHtml(name)}
              </td>
            `;
            })
            .join("")}
        </tr>
      `
          )
          .join("")
      )
      .join("");
  
    return `<!doctype html>
  <html>
  <head>
  <meta charset="utf-8">
  <title>Lectors List - ${escapeHtml(monthYear)}</title>
  
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
  
    * {
      box-sizing: border-box;
    }
  
    body {
      margin: 0;
      padding: 18px;
      color: #111;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }
  
    h1 {
      margin: 0 0 18px;
      text-align: center;
      font-size: 21px;
      font-weight: 700;
    }
  
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
      background: #fff;
    }
  
    th, td {
      border: 1px solid #222;
      padding: 5px 6px;
      height: 27px;
      vertical-align: middle;
    }
  
    th {
      background: #dedede;
      text-align: center;
      font-weight: 700;
      border: 2px solid #111;
    }
  
    td.date, td.day {
      text-align: center;
      vertical-align: middle;
      background: #f1f1f1;
    }
  
    td.reading {
      text-align: left;
      width: 8%;
    }
  
    td.person {
      text-align: left;
      overflow-wrap: anywhere;
    }
  
    td.special {
      text-align: center;
      font-weight: 700;
    }
  
    tr.date-start td {
      border-top: 2px solid #111;
    }
  
    th:nth-child(1) { width: 8%; }
    th:nth-child(2) { width: 7%; }
    th:nth-child(3) { width: 8%; }
  
    th:nth-child(4),
    th:nth-child(5),
    th:nth-child(6),
    th:nth-child(7) {
      width: 19.25%;
    }
  
    @media print {
      body { padding: 0; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
  </head>
  
  <body>
  <h1>LECTORS LIST FOR ${escapeHtml(monthYear).toUpperCase()}</h1>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Day</th>
        <th>Readings</th>
        ${ROSTER_SLOTS.map(
          (slot) => `<th>${slot}</th>`
        ).join("")}
      </tr>
    </thead>
  
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
  </body>
  </html>`;
  }
  