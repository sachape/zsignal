import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listMyReportsTool from "./tools/list-my-reports";

// The OAuth issuer MUST be the direct Supabase host — build it from the
// project ref (Vite inlines VITE_SUPABASE_PROJECT_ID at build time, keeping
// this file import-safe: no runtime env read).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "streamnco-mcp",
  title: "Streamnco MCP",
  version: "0.1.0",
  instructions:
    "Streamnco is a Twitch streamer growth copilot. Use `echo` to verify connectivity. Use `list_my_reports` to list the signed-in user's most recent analysis reports.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listMyReportsTool],
});
