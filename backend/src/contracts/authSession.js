const { getAdminPathConfig } = require("../services/adminPathService");

const loginRequestSchema = {
  type: "object",
  required: ["username", "password"],
  properties: {
    username: { type: "string", minLength: 1 },
    password: { type: "string", minLength: 1 }
  }
};

const sessionSchema = {
  type: "object",
  required: ["authenticated", "authStrategy", "csrfToken", "user", "capabilities", "links"],
  properties: {
    authenticated: { type: "boolean" },
    authStrategy: { type: "string", enum: ["session-cookie"] },
    csrfToken: { type: ["string", "null"] },
    user: {
      type: ["object", "null"],
      properties: {
        username: { type: "string" }
      }
    },
    capabilities: {
      type: "array",
      items: { type: "string" }
    },
    links: {
      type: "object",
      properties: {
        session: { type: "string" },
        login: { type: "string" },
        logout: { type: "string" },
        contracts: { type: "string" },
        templates: { type: "string" },
        previews: { type: "string" },
        presells: { type: "string" },
        analytics: { type: "string" },
        analyticsSummary: { type: "string" }
      }
    }
  }
};

function serializeAdminSession({ authenticated, username, csrfToken }) {
  const isAuthenticated = Boolean(authenticated);
  const { buildLegacyAdminPath } = getAdminPathConfig();

  return {
    authenticated: isAuthenticated,
    authStrategy: "session-cookie",
    csrfToken: csrfToken || null,
    user: isAuthenticated ? { username: String(username || "admin") } : null,
    capabilities: isAuthenticated
      ? [
        "presells:read",
        "presells:write",
        "templates:read",
        "analytics:read",
        "uploads:write",
        "preview:write"
      ]
      : [],
    links: {
      session: "/api/admin/session",
      login: buildLegacyAdminPath("/login"),
      logout: buildLegacyAdminPath("/logout"),
      contracts: "/api/admin/contracts",
      templates: "/api/admin/templates",
      previews: "/api/admin/previews",
      presells: "/api/admin/presells",
      analytics: "/api/admin/analytics",
      analyticsSummary: "/api/admin/analytics/summary"
    }
  };
}

module.exports = {
  loginRequestSchema,
  sessionSchema,
  serializeAdminSession
};
