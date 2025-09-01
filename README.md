# UNIT0 Auto-Claim Bot

### 1) Persiapan
- Install Node 18+
- `cp .env.example .env` lalu isi `PRIVATE_KEY`, `RPC_UNIT0`, `WALLET` (opsional)
- `npm i`

### 2) Jalanin
- `npm run claim`

Skrip akan:
- Ambil ABI kontrak dari Blockscout `explorer.unit0.dev` (REST `action=getabi`)  
- Deteksi fungsi klaim, simulasi, lalu kirim transaksi

### 3) Jika kontrak butuh EIP-712
- Di website Units, buka DevTools Network → request `/contract?type=CLAIM` (pakai query `?t=<timestamp>` kalau perlu agar tidak 304)
- Simpan JSON `domain/types/message` sebagai `typeddata.json`
- (Hubungi penulis skrip — modul signer lokal akan dipasang untuk varian `claim(bytes)`)

> Catatan: alamat yang saat ini dicoba:
> - UnitsClaimV1: `0xC8C3072325970c79EA639dDeb746c610e0A692E8`
> - PossibleVesting: `0x077A4ACB4B8596Aa499862e69C7DDa65dbD4E33A`
> Kamu bisa tambah/hapus target di `config/chains.json`.
