const { presellSummarySchema, serializePresellSummary } = require("./presells");

const presellReferenceSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    slug: { type: "string" },
    title: { type: "string" }
  }
};

const analyticsSummarySchema = {
  type: "object",
  required: ["totalUsers", "recentSales", "systemHealth"],
  properties: {
    totalUsers: { type: "number" },
    recentSales: { type: "number" },
    systemHealth: { type: "string", enum: ["healthy", "degraded"] }
  }
};

const analyticsOverviewSchema = {
  type: "object",
  required: ["totals", "byPresell", "recentEvents", "sources"],
  properties: {
    totals: {
      type: "object",
      properties: {
        views: { type: "number" },
        clicks: { type: "number" },
        redirects: { type: "number" },
        ctr: { type: "number" }
      }
    },
    byPresell: {
      type: "array",
      items: {
        type: "object",
        properties: {
          presell: presellReferenceSchema,
          views: { type: "number" },
          clicks: { type: "number" },
          redirects: { type: "number" },
          ctr: { type: "number" },
          avgTimeOnPage: { type: ["number", "null"] }
        }
      }
    },
    recentEvents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          presellId: { type: ["number", "null"] },
          eventType: { type: "string" },
          sessionKey: { type: ["string", "null"] },
          referrer: { type: ["string", "null"] },
          userAgent: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          deviceType: { type: ["string", "null"] },
          params: {
            type: "object",
            additionalProperties: true
          },
          createdAt: { type: ["string", "null"] }
        }
      }
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: ["string", "null"] },
          total: { type: "number" }
        }
      }
    }
  }
};

const presellStatisticsSchema = {
  type: "object",
  required: ["presell", "summary", "timeSeries", "gclidStats", "gclidDwellTime", "utmSources", "referrers", "recentEvents"],
  properties: {
    presell: presellSummarySchema,
    summary: analyticsOverviewSchema.properties.totals,
    timeSeries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          views: { type: "number" },
          clicks: { type: "number" },
          redirects: { type: ["number", "null"] },
          ctr: { type: "number" }
        }
      }
    },
    gclidStats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          gclid: { type: "string" },
          totalEvents: { type: "number" },
          views: { type: "number" },
          clicks: { type: "number" },
          redirects: { type: "number" },
          ctr: { type: "number" }
        }
      }
    },
    gclidDwellTime: {
      type: "array",
      items: {
        type: "object",
        properties: {
          gclid: { type: "string" },
          avgDwellSeconds: { type: "number" },
          sessionsWithClick: { type: "number" }
        }
      }
    },
    utmSources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          total: { type: "number" }
        }
      }
    },
    referrers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          referrer: { type: "string" },
          total: { type: "number" }
        }
      }
    },
    recentEvents: analyticsOverviewSchema.properties.recentEvents
  }
};

function serializeAnalyticsSummary(summary) {
  return {
    totalUsers: Number(summary.totalUsers || 0),
    recentSales: Number(summary.recentSales || 0),
    systemHealth: summary.systemHealth === "degraded" ? "degraded" : "healthy"
  };
}

function serializeAnalyticsOverview(overview) {
  return {
    totals: serializeTotals(overview.totals),
    byPresell: (overview.byPresell || []).map((item) => ({
      presell: {
        id: Number(item.id),
        slug: String(item.slug || ""),
        title: String(item.title || "")
      },
      views: Number(item.views || 0),
      clicks: Number(item.clicks || 0),
      redirects: Number(item.redirects || 0),
      ctr: Number(item.ctr || 0),
      avgTimeOnPage: item.avg_time_on_page != null ? Math.round(Number(item.avg_time_on_page)) : null
    })),
    recentEvents: (overview.recent || overview.recentEvents || []).map(serializeEvent),
    sources: (overview.sources || []).map((item) => ({
      source: item.source || null,
      total: Number(item.total || 0)
    }))
  };
}

function serializePresellStatistics(statistics, presell) {
  return {
    presell: serializePresellSummary(presell),
    summary: serializeTotals(statistics.summary),
    timeSeries: (statistics.timeSeries || []).map((item) => {
      const views = Number(item.views || 0);
      const clicks = Number(item.clicks || 0);
      const redirects = Number(item.redirects || 0);

      return {
        date: String(item.date || ""),
        views,
        clicks,
        redirects,
        ctr: views > 0 ? (clicks / views) * 100 : 0
      };
    }),
    gclidStats: (statistics.gclidStats || []).map((item) => ({
      gclid: String(item.gclid || ""),
      totalEvents: Number(item.total_events || item.totalEvents || 0),
      views: Number(item.views || 0),
      clicks: Number(item.clicks || 0),
      redirects: Number(item.redirects || 0),
      ctr: Number(item.views || 0) > 0
        ? (Number(item.clicks || 0) / Number(item.views || 0)) * 100
        : 0
    })),
    gclidDwellTime: (statistics.gclidDwellTime || []).map((item) => ({
      gclid: String(item.gclid || ""),
      avgDwellSeconds: Number(item.avg_dwell_seconds || item.avgDwellSeconds || 0),
      sessionsWithClick: Number(item.sessions_with_click || item.sessionsWithClick || 0)
    })),
    utmSources: (statistics.utmSources || []).map((item) => ({
      source: String(item.source || ""),
      total: Number(item.total || 0)
    })),
    referrers: (statistics.referrers || []).map((item) => ({
      referrer: String(item.referrer || ""),
      total: Number(item.total || 0)
    })),
    recentEvents: (statistics.recentEvents || []).map(serializeEvent),
    avgTimeOnPage: serializeAvgTimeOnPage(statistics.avgTimeOnPage)
  };
}

function serializeAvgTimeOnPage(row) {
  if (!row || row.avg_seconds === null || row.avg_seconds === undefined) {
    return null;
  }
  return {
    avgSeconds: Math.round(Number(row.avg_seconds)),
    sampleCount: Number(row.sample_count || 0)
  };
}

function serializeTotals(totals = {}) {
  return {
    views: Number(totals.views || 0),
    clicks: Number(totals.clicks || 0),
    redirects: Number(totals.redirects || 0),
    ctr: Number(totals.ctr || 0)
  };
}

function serializeEvent(event) {
  return {
    id: Number(event.id || 0),
    presellId: event.presell_id == null ? null : Number(event.presell_id),
    eventType: String(event.event_type || ""),
    sessionKey: event.session_key || null,
    referrer: event.referrer || null,
    userAgent: event.user_agent || null,
    country: event.country || null,
    deviceType: event.device_type || null,
    params: parseJson(event.params_json),
    createdAt: event.created_at || null
  };
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function serializePresellEventsPage({ rows, total, page, deviceOptions, countryOptions }) {
  const pageCount = Math.max(1, Math.ceil(total / 50));
  return {
    events: rows.map(serializeEvent),
    total,
    page,
    pageCount,
    deviceOptions,
    countryOptions
  };
}

module.exports = {
  analyticsSummarySchema,
  analyticsOverviewSchema,
  presellStatisticsSchema,
  serializeAnalyticsSummary,
  serializeAnalyticsOverview,
  serializePresellStatistics,
  serializePresellEventsPage
};
