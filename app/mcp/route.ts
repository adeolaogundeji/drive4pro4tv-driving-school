import { sendWeeklyTimesheetReport } from "@/lib/weekly-report";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

const weeklyTool = {
  name: "send_weekly_timesheet_report",
  title: "Send weekly timesheet report",
  description: "Email the previous Monday-through-Sunday employee hours report to the driving school's configured notification address. Repeated calls for a successfully sent week do not send a duplicate.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

function jsonRpc(id: JsonRpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let message: JsonRpcRequest;
  try { message = await request.json() as JsonRpcRequest; }
  catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 }); }

  if (message.method === "initialize") return jsonRpc(message.id, {
    protocolVersion: "2025-06-18",
    capabilities: { tools: {} },
    serverInfo: { name: "Drive4Pro4TV Operations", version: "1.0.0" },
  });
  if (message.method === "notifications/initialized") return new Response(null, { status: 204 });
  if (message.method === "ping") return jsonRpc(message.id, {});
  if (message.method === "tools/list") return jsonRpc(message.id, { tools: [weeklyTool] });
  if (message.method === "tools/call") {
    if (message.params?.name !== weeklyTool.name) return Response.json({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32602, message: "Unknown tool" } }, { status: 400 });
    try {
      const report = await sendWeeklyTimesheetReport();
      const failed = report.status === "failed" || report.status === "not_configured";
      return jsonRpc(message.id, { content: [{ type: "text", text: JSON.stringify(report) }], isError: failed });
    } catch (error) {
      console.error("Weekly report tool failed", error);
      return jsonRpc(message.id, { content: [{ type: "text", text: "Weekly report could not be generated." }], isError: true });
    }
  }
  return Response.json({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32601, message: "Method not found" } }, { status: 404 });
}
