# Shop tasdiqlash (Verification) — Frontend hujjati

Bu hujjat **shop/mijoz tasdiqlash** oqimini frontend uchun tushuntiradi.

- **Base URL:** `https://<ngrok>.ngrok-free.app` (yoki `http://127.0.0.1:8000`)
- **Auth:** `Authorization: Bearer <access_token>`
- **ngrok bepul uchun:** har so'rovga `ngrok-skip-browser-warning: true` header qo'shing.

---

## 1. Umumiy mantiq

Har bir ro'yxatdan o'tgan mijoz (jismoniy **va** yuridik) — `Client` ("shop").
Har bir shop **tasdiqlash holatiga** ega:

| verification_status | Ma'nosi | Order berish |
|---------------------|---------|:------------:|
| `pending`  | Tekshiruvda (yangi ro'yxatdan o'tgan) | ❌ |
| `verified` | Operator tasdiqlagan | ✅ |
| `rejected` | Operator rad etgan (sabab bilan) | ❌ |

**Qoida:** Shop `verified` bo'lmaguncha **order bera olmaydi**. Buni bitta flag
bildiradi: **`can_order`** (`true`/`false`).

```
Ro'yxatdan o'tish → pending (can_order=false)
        │  yuridik bo'lsa: kompaniya + litsenziya/hujjat qo'shadi
        ▼
Operator ko'rib chiqadi (review)
        ├── verify  → verified (can_order=true)  → order bera oladi
        └── reject  → rejected (can_order=false) → sabab ko'rsatiladi
```

> Shop `pending`/`rejected` bo'lsa ham platformada **hamma narsani qila oladi**
> (mahsulot ko'radi, savat/liked, profil tahrirlaydi) — faqat **order** bloklanadi.

---

## 2. CUSTOMER (mijoz) tomoni

### Holatni olish — `GET /api/auth/me/`
Javobdagi `client` obyektida:
```json
{
  "client": {
    "client_type": "yuridik",
    "verification_status": "pending",
    "can_order": false,
    "rejection_reason": ""
  }
}
```

### Frontend nima qiladi
- **`can_order === false`** → "Buyurtma berish" tugmasini **bloklash** (disabled).
- Holat bo'yicha banner/badge ko'rsatish:
  - `pending` → 🟡 "Akkauntingiz tekshirilmoqda. Tasdiqlangач buyurtma bera olasiz."
  - `verified` → 🟢 "Tasdiqlangan" (order ochiq)
  - `rejected` → 🔴 "Rad etildi: {rejection_reason}" (qayta hujjat yuklashni taklif qilish)
- Yuridik mijoz `pending` bo'lsa — kompaniya hujjatlarini (litsenziya va h.k.)
  yuklashni davom ettira oladi (`POST /api/companies/<id>/documents/`).

---

## 3. OPERATOR (staff) tomoni

Operator = ichki xodim (staff `operator` / `admin` / `developer` roli).
Kerakli permission: `clients.view`, `clients.manage`, `clients.verify`
(operator roliga berilgan). Customer bu endpointlarga kira olmaydi → **403**.

### 3.1. Tekshiruvdagi shoplar ro'yxati
```http
GET /api/clients/review/?verification_status=pending
GET /api/clients/review/?verification_status=verified
GET /api/clients/review/?search=<INN | nom | telefon>
Authorization: Bearer <operator_token>
```
Javob:
```json
{
  "status": "success",
  "count": 17,
  "data": [
    {
      "id": "fb8f13c8-...",
      "client_type": "yuridik",
      "full_name": "Yur Rev",
      "phone": "+998900000090",
      "inn": "555666777",
      "company_name": "Review Test MChJ",
      "verification_status": "pending",
      "can_order": false
    }
  ]
}
```

### 3.2. Bitta shop — to'liq ma'lumot (client + kompaniya + hujjatlar)
```http
GET /api/clients/review/<id>/
```
Javob (yuridik uchun `company` bloki bo'ladi; jismoniy uchun `null`):
```json
{
  "status": "success",
  "data": {
    "full_name": "Yur Rev",
    "client_type": "yuridik",
    "verification_status": "pending",
    "can_order": false,
    "company": {
      "legal_name": "Review Test MChJ",
      "inn": "555666777",
      "bank": "Ipoteka Bank",
      "mfo": "00842",
      "director": "Yur Rev",
      "documents": [
        { "id": "...", "type": "INN guvohnomasi", "file": "https://.../media/company_docs/xxx.pdf" }
      ],
      "addresses": [ { "type": "Yuridik manzil", "street": "...", "house": "..." } ],
      "branches_count": 1
    }
  }
}
```

### 3.3. Kerakli maydonlarni tahrirlash (review paytida)
```http
PATCH /api/clients/review/<id>/
Content-Type: application/json

{ "region": "Toshkent", "notes": "Hujjatlar tekshirildi", "company_name": "...", "inn": "..." }
```
> `clients.manage` permission kerak. Client maydonlari (region, notes, company_name,
> inn, full_name, phone, email, ...) tahrirlanadi.

### 3.4. Tasdiqlash
```http
POST /api/clients/review/<id>/verify/
```
Javob:
```json
{ "status": "success", "message": "Tasdiqlandi",
  "data": { "verification_status": "verified", "can_order": true } }
```

### 3.5. Rad etish (sabab bilan)
```http
POST /api/clients/review/<id>/reject/
Content-Type: application/json

{ "reason": "Litsenziya hujjati yuklanmagan" }
```
Javob:
```json
{ "status": "success", "message": "Rad etildi",
  "data": { "verification_status": "rejected", "rejection_reason": "Litsenziya hujjati yuklanmagan", "can_order": false } }
```

---

## 4. To'liq oqim (ketma-ketlik)

1. **Mijoz ro'yxatdan o'tadi**
   - Jismoniy: `POST /api/auth/register/`
   - Yuridik: `POST /api/auth/register/company/` (kompaniya + direktor)
   - `POST /api/auth/verify-otp/` `{ code: "000000" }` → ACTIVE + token
   - → `client.verification_status = pending`, `can_order = false`
2. **(Yuridik) hujjat/litsenziya yuklaydi** → `POST /api/companies/<id>/documents/`
3. **Operator** `GET /api/clients/review/` dan pending shopni ochadi (3.2)
4. Kerak bo'lsa **tahrirlaydi** (3.3)
5. **Verify** yoki **Reject** (3.4 / 3.5)
6. Mijoz tomonida `GET /api/auth/me/` → `can_order` yangilanadi
   - `true` → "Buyurtma" tugmasi ochiladi

---

## 5. Muhim eslatmalar (frontend)

- **Order tugmasi** har doim `me.client.can_order` ga qarab ochiladi/bloklanadi.
- Order moduli (buyurtma berish) hozir qurilmoqda — u ham `can_order` ni tekshiradi,
  shuning uchun frontend tugmani oldindan bloklab qo'ysa, backend ham himoyalangan.
- `verification_status` va `rejection_reason` — banner/badge uchun.
- Barcha yozuv (verify/reject/patch) faqat **operator token** bilan; customer → 403.
- Header eslatmalari: `Authorization`, `ngrok-skip-browser-warning`, savat uchun `X-Device-Id`.

---

## 6. Holat rangi (tavsiya)

| Status | Rang | Badge matni |
|--------|------|-------------|
| pending | 🟡 sariq | "Tekshirilmoqda" |
| verified | 🟢 yashil | "Tasdiqlangan" |
| rejected | 🔴 qizil | "Rad etildi" (+ sabab) |
