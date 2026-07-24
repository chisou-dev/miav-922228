export const SITE_CONTROL_COLLECTION = "system_config";
export const SITE_CONTROL_DOC_ID = "siteControl";
export const SITE_CONTROL_DOC_PATH = `${SITE_CONTROL_COLLECTION}/${SITE_CONTROL_DOC_ID}`;

export type SiteControl = {
  traceEnabled: boolean;
  contactEnabled: boolean;
  updatedAt: string | null;
};

export const DEFAULT_SITE_CONTROL: SiteControl = {
  traceEnabled: true,
  contactEnabled: true,
  updatedAt: null,
};

export const TRACE_DISABLED_MESSAGE =
  "Trace registration is temporarily unavailable.";

export const CONTACT_DISABLED_MESSAGE =
  "Contact is temporarily unavailable.";
