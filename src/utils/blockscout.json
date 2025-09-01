import fetch from "node-fetch";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import path from "path";

export async function getAbi(explorerBase, address) {
  const dir = path.resolve("abi-cache");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const cachePath = path.join(dir, `${address.toLowerCase()}.json`);
  if (existsSync(cachePath)) {
    try { return JSON.parse(readFileSync(cachePath, "utf8")); } catch {}
  }

  const url = `${explorerBase.replace(/\/+$/,"")}/api?module=contract&action=getabi&address=${address}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ABI fetch HTTP ${res.status}`);
  const data = await res.json();

  // Blockscout/Etherscan style
  let abiStr = data?.result ?? data?.ABI ?? null;
  if (data?.status === "0" && data?.message) {
    throw new Error(`Explorer says: ${data.message}`);
  }
  if (!abiStr) throw new Error(`No ABI in explorer response`);
  const abi = typeof abiStr === "string" ? JSON.parse(abiStr) : abiStr;

  writeFileSync(cachePath, JSON.stringify(abi, null, 2));
  return abi;
}
