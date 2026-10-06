// Shared, provider-independent safety check. The same source is used by the client and the
// Supabase Edge Functions so web-search requests cannot bypass the UI guard.
export { checkQuerySafety } from "../../../supabase/functions/_shared/vexSafety";
