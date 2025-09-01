import 'dotenv/config';
import { readFileSync } from "fs";
import { ethers } from "ethers";
import { getAbi } from "./utils/blockscout.js";

const cfg = JSON.parse(readFileSync("./config/chains.json", "utf8"));

const rpc = process.env[cfg.rpcEnv] || "https://rpc.unit0.dev";
const explorerBase = process.env[cfg.explorerEnv] || "https://explorer.unit0.dev";

async function pickFunction(iface, candidates) {
  for (const sig of candidates) {
    try { iface.getFunction(sig); return sig; } catch {}
  }
  return null;
}

async function readClaimable(contract, iface, wallet, viewFns) {
  for (const sig of viewFns) {
    try {
      const fn = iface.getFunction(sig);
      const method = fn.name;
      const val = await contract[method](wallet.address);
      return BigInt(val.toString());
    } catch {}
  }
  return null;
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY kosong di .env");
  const provider = new ethers.JsonRpcProvider(rpc);
  const net = await provider.getNetwork();
  console.log(`Connected chainId: ${Number(net.chainId)}`);
  if (cfg.chainIdExpected && Number(net.chainId) !== cfg.chainIdExpected) {
    console.warn(`⚠️  Peringatan: chainId RPC (${Number(net.chainId)}) != expected (${cfg.chainIdExpected}). Pastikan RPC benar.`);
  }
  const wallet = new ethers.Wallet(pk, provider);
  const toAddress = (process.env.WALLET || wallet.address);

  for (const t of cfg.targets) {
    console.log(`\n=== Target: ${t.label} @ ${t.address} ===`);
    try {
      const abi = await getAbi(explorerBase, t.address);
      const contract = new ethers.Contract(t.address, abi, wallet);
      const iface = contract.interface;

      // 1) Claimable (opsional)
      const claimable = await readClaimable(contract, iface, wallet, cfg.viewFns);
      if (claimable !== null) {
        console.log(`Claimable view: ${ethers.formatUnits(claimable, 18)} (18 decimals assumed)`);
        if (claimable === 0n) {
          console.log("→ Nol. Tetap coba klaim (beberapa kontrak tidak expose view akurat).");
        }
      } else {
        console.log("Tidak ada fungsi view claimable; lanjut ke klaim langsung.");
      }

      // 2) Cari fungsi klaim
      const claimSig = await pickFunction(iface, cfg.claimFnCandidates);
      if (!claimSig) {
        console.log("❌ Tidak menemukan fungsi klaim yang dikenal pada ABI ini.");
        continue;
      }
      console.log(`Fungsi klaim terdeteksi: ${claimSig}`);

      // 3) Siapkan argumen sesuai signature
      const argsSet = [];
      switch (claimSig) {
        case "claim()":
          argsSet.push([]);
          break;
        case "claim(address)":
          argsSet.push([toAddress]);
          break;
        case "claim(address,address)":
          for (const token of (t.preferredTokens || [])) argsSet.push([toAddress, token]);
          if (argsSet.length === 0) throw new Error("Perlu token address untuk claim(address,address)");
          break;
        case "claim(address,address,uint256,bytes)":
        case "claim(address,uint256,bytes)":
        case "claim(bytes)":
          throw new Error(
            "Kontrak memerlukan signature EIP-712 (argumen bytes). Ambil typedData JSON dari Network tab, simpan ke typeddata.json, lalu jalankan mode signer lokal."
          );
        default:
          throw new Error(`Signature belum didukung: ${claimSig}`);
      }

      // 4) Eksekusi: simulasi dulu, lalu kirim tx
      for (const args of argsSet) {
        const method = claimSig.split("(")[0];
        console.log(`Simulasi ${method}(${args.map(a=>JSON.stringify(a)).join(", ")}) …`);
        try {
          await contract[method].staticCall(...args);
        } catch (e) {
          console.error("❌ Gagal simulasi:", e.reason || e.message);
          continue;
        }
        const gas = await contract[method].estimateGas(...args).catch(()=>null);
        const tx = await contract[method](...args, gas ? { gasLimit: gas * 12n / 10n } : {});
        console.log(`Tx hash: ${tx.hash}`);
        const rec = await tx.wait();
        console.log(`✅ Sukses di block ${rec.blockNumber}`);
      }
    } catch (e) {
      console.error(`Target ${t.label} error:`, e.message);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
