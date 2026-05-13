/* PEOPLEWARE USER STRUCTURE v12 */
(function () {
  "use strict";

  function render(data = {}) {
    const items = normalizeItems(data.items || []);
    const stats = normalizeStats(items);
    const access = data.access || {};
    const filtered = applyFilter(items, data.state || {});

    const controls = window.PeoplewareStructure.renderControlBar({
      searchName: "user-search",
      filterName: "user-filter",
      sortName: "user-sort",
      search: data.state && data.state.search ? data.state.search : "",
      filter: data.state && data.state.filter ? data.state.filter : "all",
      sort: data.state && data.state.sort ? data.state.sort : "id",
      filters: [
        { value: "all", label: "All users" },
        { value: "active", label: "Active / using" },
        { value: "inactive", label: "Inactive" },
        { value: "debt", label: "Debt only" },
        { value: "balance", label: "Positive balance" }
      ],
      sorts: [
        { value: "id", label: "Default by ID" },
        { value: "name", label: "Name" },
        { value: "most_cards", label: "Most cards" },
        { value: "lowest_cards", label: "Lowest cards" },
        { value: "debt", label: "Highest debt" },
        { value: "balance", label: "Highest balance" }
      ]
    });

    return [
      '<div class="ec-user-peopleware ec-peopleware-module">',
        '<div class="ec-peopleware-toolbar">',
          '<div>',
            '<strong>Tenant Users</strong>',
            '<span>User cards, RFID ownership, balance, contact details, and usage records.</span>',
          '</div>',
          '<div class="ec-peopleware-actions">',
            '<button class="ec-peopleware-btn" type="button" data-user-refresh>Refresh</button>',
            '<button class="ec-peopleware-btn ec-peopleware-btn-primary" type="button" data-user-add ' + (access.canCreate ? "" : "disabled") + '>Add User</button>',
            '<button class="ec-peopleware-btn ec-peopleware-btn-danger" type="button" data-user-delete-all ' + (access.canDeleteAll ? "" : "disabled") + '>Delete All</button>',
          '</div>',
        '</div>',
        controls,
        '<div class="ec-peopleware-scroll">',
          '<div data-user-list>',
            renderList(filtered, access),
          '</div>',
        '</div>',
        '<div class="ec-peopleware-metrics">',
          metric("Users", stats.total),
          metric("Cards", stats.cards),
          metric("Balance", peso(stats.balance)),
          metric("Used kWh", num(stats.usedKwh, 2)),
        '</div>',
      '</div>'
    ].join("");
  }

  function renderList(items, access = {}) {
    if (!items.length) return empty();

    return '<div class="ec-peopleware-grid">' + items.map(function (item) {
      return window.PeoplewareStructure.renderPersonCard(item, {
        prefix: "user",
        role: "USER",
        canEdit: access.canEdit,
        canDelete: access.canDelete
      });
    }).join("") + '</div>';
  }

  function empty() {
    return '<div class="ec-peopleware-empty"><div><strong>No users found</strong><p>Try changing the search or filter.</p></div></div>';
  }

  function normalizeItems(raw) {
    const list = Array.isArray(raw) ? raw : unwrap(raw);

    return list.map(function (row, index) {
      const cards = Array.isArray(row.cards)
        ? row.cards
        : (Array.isArray(row.card_details) ? row.card_details : []);

      const cardTotal = cards.reduce(function (sum, card) {
        return sum + (Number(card.balance || 0) || 0);
      }, 0);

      const fallbackBalance = Number(pick(row.balance, row.credit_balance, 0)) || 0;
      const totalBalance = cards.length ? cardTotal : fallbackBalance;
      const cardCount = Number(pick(row.cards_count, row.card_count, cards.length, 0)) || 0;

      const hasDebt = cards.some(function (card) {
        return Number(card.balance || 0) < 0;
      }) || (cards.length === 0 && totalBalance < 0);

      const isUsing = Boolean(
        row.is_using ||
        row.active_session ||
        row.active_cards ||
        row.currently_using ||
        cards.some(function (card) {
          return String(card.status || "").toLowerCase() === "active_session";
        })
      );

      return {
        raw: row,
        id: pick(row.id, row.user_id, index + 1),
        name: pick(row.name, row.full_name, row.display_name, ""),
        birthdate: pick(row.birthdate, ""),
        gender: pick(row.gender, "Others"),
        image: pick(row.image, row.img, row.image_url, row.avatar, row.photo, row.profile_image, ""),
        email: pick(row.email, row.emails, ""),
        emails: toArray(pick(row.emails, row.email, [])),
        phone: pick(row.phone, row.number, row.contact, row.numbers, ""),
        numbers: toArray(pick(row.numbers, row.phone, row.number, row.contact, [])),
        address: pick(row.address, ""),
        balance: totalBalance,
        total_card_balance: totalBalance,
        has_debt: hasDebt,
        limit: Number(pick(row.limit, row.credit_limit, row.kwh_limit, 0)) || 0,
        used_kwh: Number(pick(row.used_kwh, row.total_used_kwh, row.kwh, 0)) || 0,
        cards: cardCount,
        raw_cards: cards,
        status: pick(row.status, "active"),
        created: pick(row.created, row.created_at, ""),
        is_using: isUsing,
        active_cards: Number(pick(row.active_cards, 0)) || 0
      };
    });
  }

  function applyFilter(items, state = {}) {
    let output = items.slice();
    const query = String(state.search || "").trim().toLowerCase();
    const filter = state.filter || "all";
    const sort = state.sort || "id";

    if (query) {
      output = output.filter(function (item) {
        return String(item.id).includes(query) || String(item.name || "").toLowerCase().includes(query);
      });
    }

    if (filter === "active") {
      output = output.filter(function (item) {
        return item.is_using || String(item.status).toLowerCase() === "active";
      });
    }

    if (filter === "inactive") {
      output = output.filter(function (item) {
        return !item.is_using && String(item.status).toLowerCase() !== "active";
      });
    }

    if (filter === "debt") {
      output = output.filter(function (item) {
        return item.has_debt;
      });
    }

    if (filter === "balance") {
      output = output.filter(function (item) {
        return Number(item.total_card_balance || item.balance || 0) > 0;
      });
    }

    output.sort(function (a, b) {
      if (sort === "name") return String(a.name).localeCompare(String(b.name));
      if (sort === "most_cards") return Number(b.cards || 0) - Number(a.cards || 0);
      if (sort === "lowest_cards") return Number(a.cards || 0) - Number(b.cards || 0);
      if (sort === "debt") return Number(a.total_card_balance || a.balance || 0) - Number(b.total_card_balance || b.balance || 0);
      if (sort === "balance") return Number(b.total_card_balance || b.balance || 0) - Number(a.total_card_balance || a.balance || 0);
      return Number(a.id || 0) - Number(b.id || 0);
    });

    return output;
  }

  function normalizeStats(items) {
    return {
      total: items.length,
      cards: items.reduce(function (sum, item) {
        return sum + Number(item.cards || 0);
      }, 0),
      balance: items.reduce(function (sum, item) {
        return sum + Number(item.total_card_balance || item.balance || 0);
      }, 0),
      usedKwh: items.reduce(function (sum, item) {
        return sum + Number(item.used_kwh || 0);
      }, 0)
    };
  }

  function unwrap(value) {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.users)) return value.users;
    if (Array.isArray(value.rows)) return value.rows;
    if (value.data) return unwrap(value.data);
    return [];
  }

  function toArray(value) {
    return window.PeoplewareStructure && window.PeoplewareStructure.toArray
      ? window.PeoplewareStructure.toArray(value)
      : (Array.isArray(value) ? value : [value].filter(Boolean));
  }

  function metric(label, value) {
    return window.PeoplewareStructure && window.PeoplewareStructure.metric
      ? window.PeoplewareStructure.metric(label, value)
      : "";
  }

  function num(value, digits = 0) {
    return window.PeoplewareStructure && window.PeoplewareStructure.formatNumber
      ? window.PeoplewareStructure.formatNumber(value, digits)
      : Number(value || 0).toFixed(digits);
  }

  function peso(value) {
    return window.PeoplewareStructure && window.PeoplewareStructure.formatPeso
      ? window.PeoplewareStructure.formatPeso(value)
      : "₱" + num(value, 2);
  }

  function pick() {
    for (let i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  window.PeoplewareUserStructure = {
    render: render,
    renderList: renderList,
    normalizeItems: normalizeItems,
    normalizeStats: normalizeStats,
    applyFilter: applyFilter
  };
})();
