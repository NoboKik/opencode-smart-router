import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface SmartRouterOptions {
  keys?: string[];
  providers?: string[];
}

const STATE = join(homedir(), ".config", "opencode", "smart-router-state.json");

let keys: string[] = [];
let providers: string[] = ["opencode-go"];
let idx = 0;
let ready = false;
let cli: any = null;
let currentSID = "";
let retryTimer: any = null;
let retryCount = 0;

function cur() {
  return keys.length > 0 ? keys[idx % keys.length] : null;
}

function rot() {
  if (keys.length === 0) return;
  idx = (idx + 1) % keys.length;
}

function isErrorEvent(s: string): boolean {
  if (s.includes('"type":"session.error"')) {
    return /"statusCode":(401|429)|insufficient_quota|unauthorized|Invalid API key|usage|quota/i.test(s);
  }
  if (/usage|subscribe to Go|No payment method/i.test(s)) return true;
  return false;
}

async function doRetry() {
  if (!cli?.session || !currentSID) return;
  try {
    await cli.session.prompt({
      path: { id: currentSID },
      body: { parts: [{ type: "text", text: "Continue" }] },
    });
  } catch {}
}

const hooks = {
  "chat.headers": (_i: any, o: any) => {
    try {
      if (_i?.sessionID) currentSID = _i.sessionID;
      const pid = _i?.model?.providerID;
      if (!pid || !providers.includes(pid)) return;
      const k = cur();
      if (k) o.headers = { ...o.headers, Authorization: `Bearer ${k}` };
    } catch {}
  },
  event: (evt: any) => {
    try {
      if (retryTimer) return;
      const s = typeof evt === "string" ? evt : JSON.stringify(evt ?? "");
      if (!isErrorEvent(s)) return;
      rot();
      if (++retryCount >= keys.length) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        doRetry();
      }, 200);
    } catch {}
  },
};

export default (async (input: any, opts?: SmartRouterOptions) => {
  cli = input.client;

  if (ready) return hooks;
  ready = true;

  keys = opts?.keys ?? [];
  if (opts?.providers) providers = opts.providers;

  try {
    if (existsSync(STATE)) {
      const st = JSON.parse(readFileSync(STATE, "utf8"));
      const n = keys.length;
      if (n > 0) idx = (st.session ?? 0) % n;
      st.session = ((st.session ?? 0) + 1) % (n || 1);
      const d = join(homedir(), ".config", "opencode");
      if (!existsSync(d)) mkdirSync(d, { recursive: true });
      writeFileSync(STATE, JSON.stringify(st));
    }
  } catch {}

  return hooks;
});
