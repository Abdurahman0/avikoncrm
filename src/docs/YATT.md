# YaTT (Yakka tartibdagi tadbirkor) — Frontend integratsiya hujjati

## 1. YaTT nima va nega alohida?

**YaTT** — Yakka tartibdagi tadbirkor (individual entrepreneur / sole proprietor).
Bu **MChJ (kompaniya) emas** — huquqiy jihatdan YaTT alohida yuridik shaxs
hisoblanmaydi, balki **jismoniy shaxs o'z nomidan tadbirkorlik qiladi**. Shu
sababli tizimda YaTT quyidagilardan **farqlanadi**:

| | Jismoniy | **YaTT** | Yuridik (MChJ) | Budjet |
|---|---|---|---|---|
| Kim ro'yxatdan o'tadi | O'zi | O'zi (tadbirkor) | Direktor | Muassasa vakili |
| Kompaniya/tashkilot nomi kerakmi | Yo'q | **Ha** | Ha | Ha |
| INN kerakmi | Yo'q | **Ha** | Ha | Ha |
| `Company` yozuvi yaratiladimi | Yo'q | **Ha** (`company_type=yatt`) | Ha (`company_type=mchj`) | Yo'q |
| Bank rekvizitlari | Yo'q | Ixtiyoriy | Ixtiyoriy | — |

Platformada 4 ta mijoz turi bor: **jismoniy / yatt / yuridik / budjet**. Ular
`client_type` va `account_type` maydonlarida aynan shu 4 qiymatdan biri bo'lib
keladi (pastga qarang).

---

## 2. Qayerda ko'rinadi (maydonlar xaritasi)

Tizimda YaTT **ikkita joyda** aks etadi — ikkalasi ham bir vaqtda, avtomatik
belgilanadi (frontend faqat `company_type` ni tanlab yuboradi, qolganini backend
o'zi hisoblaydi):

| Maydon | Qayerda | Qiymatlar | YaTT uchun |
|--------|---------|-----------|------------|
| `company_type` | `Company` obyekti | `yatt` \| `mchj` | Frontend **tanlab yuboradi** (forma) |
| `client_type` | `Client` obyekti (CRM) | `jismoniy` \| `yatt` \| `yuridik` \| `budjet` | Avtomatik: `yatt` |
| `account_type` | `User` obyekti (`/me/`) | `jismoniy` \| `yatt` \| `yuridik` | Avtomatik: `yatt` |

> ⚠️ **Muhim:** MChJ tanlansa, `client_type`/`account_type` **`yuridik`** bo'ladi
> (`yatt` emas). Faqat `company_type=yatt` tanlansa hamma joyda `yatt` chiqadi.

---

## 3. Ro'yxatdan o'tish formasi — YaTT

Forma bosqichlari **MChJ bilan bir xil** — faqat foydalanuvchi
"Tashkilot turi" tanlovida **YaTT** ni belgilaydi. Backend bitta endpointda
ishlaydi: `POST /api/auth/register/company/`.

### 3.1. Forma maydonlari (UI tuzilishi tavsiyasi)

**1-blok — Tashkilot turi (radio/select, MAJBURIY birinchi savol):**
```
○ Yakka tartibdagi tadbirkor (YaTT)
○ MChJ (Mas'uliyati cheklangan jamiyat)
```
→ `company_type: "yatt"` yoki `"mchj"`

**2-blok — Tadbirkor/direktor passporti (MChJ'da "direktor" deb, YaTT'da
"tadbirkor" deb yozilishi tavsiya etiladi — matn farqi, backend bir xil):**
| Maydon | Turi | Majburiy |
|--------|------|:---:|
| `first_name` | matn | ✅ |
| `last_name` | matn | ✅ |
| `middle_name` | matn | — |
| `passport_series` | matn (2 harf, masalan `AD`) | ✅ |
| `passport_number` | matn (7 raqam) | ✅ |
| `pinfl` | matn (14 raqam, JSHSHIR) | ✅ |
| `birth_date` | sana `YYYY-MM-DD` | ✅ |
| `gender` | `male` \| `female` | ✅ |
| `phone` | `+998XXXXXXXXX` | ✅ |
| `email` | email | ✅ |
| `password` / `confirm_password` | matn (min 6) | ✅ |

**3-blok — Tadbirkorlik/tashkilot rekvizitlari:**
| Maydon | Turi | Majburiy | Izoh |
|--------|------|:---:|------|
| `company_name` | matn | ✅ | YaTT uchun: tadbirkorlik nomi (masalan "Yusupov Tadbirkorlik") |
| `inn` | matn | ✅ | YaTT ham STIR/INN'ga ega bo'ladi |
| `settlement_account` | matn | — | Hisob raqami (bo'lsa) |
| `bank` | matn | — | Bank nomi (bo'lsa) |
| `mfo` | matn | — | Bank MFO kodi |
| `legal_address` | matn | — | Ro'yxatdan o'tgan manzil |
| `real_address` | matn | — | Haqiqiy faoliyat manzili |

> YaTT'da ko'pincha bank rekvizitlari hali yo'q bo'lishi mumkin — shuning uchun
> `settlement_account/bank/mfo` **ixtiyoriy**. Majburiy: FIO+passport, INN,
> tashkilot nomi.

### 3.2. So'rov namunasi

```http
POST /api/auth/register/company/
Content-Type: application/json

{
  "first_name": "Sardor",
  "last_name": "Yusupov",
  "middle_name": "Baxtiyor o'g'li",
  "passport_series": "AD",
  "passport_number": "9876543",
  "pinfl": "51234567891234",
  "birth_date": "1990-05-01",
  "gender": "male",
  "phone": "+998901112233",
  "email": "sardor@example.com",
  "password": "parol1234",
  "confirm_password": "parol1234",

  "company_type": "yatt",
  "company_name": "Yusupov Tadbirkorlik",
  "inn": "305998877",
  "bank": "",
  "mfo": "",
  "settlement_account": "",
  "legal_address": "",
  "real_address": ""
}
```

### 3.3. Javob (201)

```json
{
  "status": "success",
  "message": "Akkaunt yaratildi. SMS kodni tasdiqlang.",
  "data": {
    "phone": "+998901112233",
    "status": "pending_sms",
    "account_type": "yatt",
    "company_id": "6428c98d-c482-46fc-a0f1-675cb52cc48d",
    "client_id": "ba708508-c933-4e83-9b3c-782fa985bd60",
    "next": "verify-otp",
    "dev_otp": "000000"
  }
}
```

`status: "pending_sms"` — akkaunt **hali faol emas**, OTP tasdiqlash kerak.
`dev_otp` faqat **dev/test muhitida** keladi (production'da yo'q — real SMS
yuboriladi).

### 3.4. Xatolar (400)

```json
// INN band bo'lsa
{ "inn": ["Bu INN bilan kompaniya allaqachon mavjud"] }

// PINFL band bo'lsa
{ "pinfl": ["Bu PINFL allaqachon mavjud"] }

// Parollar mos kelmasa
{ "confirm_password": ["Parollar mos emas"] }

// Telefon/email band bo'lsa
{ "phone": ["Bu telefon allaqachon ro'yxatdan o'tgan"] }
{ "email": ["Bu email allaqachon ro'yxatdan o'tgan"] }
```

---

## 4. OTP tasdiqlash → login

```http
POST /api/auth/verify-otp/
Content-Type: application/json

{ "phone": "+998901112233", "code": "000000" }
```
Javob — JWT tokenlar (`access`, `refresh`) qaytadi, akkaunt endi **faol**.

Keyingi loginlar oddiy: `POST /api/auth/login/ { "login": "<phone|email>", "password": "..." }`.

---

## 5. `/me/` — profil ma'lumoti (YaTT foydalanuvchisi uchun)

```http
GET /api/auth/me/
Authorization: Bearer <token>
```

```json
{
  "status": "success",
  "data": {
    "id": "...",
    "phone": "+998901112233",
    "email": "sardor@example.com",
    "role": "customer",
    "account_type": "yatt",
    "client_type": "yatt",
    "client_id": "ba708508-...",
    "client": {
      "id": "ba708508-...",
      "client_type": "yatt",
      "company_name": "Yusupov Tadbirkorlik",
      "inn": "305998877",
      "verification_status": "pending",
      "can_order": false
    }
  }
}
```

**Frontend shuni bilishi kerak:**
- `account_type === "yatt"` → UI'da "YaTT" belgisi/badge ko'rsatiladi (MChJ'dan
  vizual farqlash uchun, masalan turli rangdagi label).
- `client.can_order === false` bo'lsa — operator hali tasdiqlamagan, buyurtma
  tugmasi **bloklanadi** (bu YaTT'ga xos emas — barcha yuridik/yatt/budjet
  turlari uchun umumiy tasdiqlash oqimi, alohida hujjatda tushuntirilgan).

---

## 6. Kompaniya obyekti (`/api/companies/`)

```http
GET /api/companies/
Authorization: Bearer <token>
```
```json
{
  "data": [
    {
      "id": "6428c98d-...",
      "company_type": "yatt",
      "company_type_display": "Yakka tartibdagi tadbirkor (YaTT)",
      "legal_name": "Yusupov Tadbirkorlik",
      "inn": "305998877",
      "director_name": "Sardor Yusupov",
      "status": "active"
    }
  ]
}
```
`company_type_display` — tayyor o'zbekcha matn, frontend uni to'g'ridan-to'g'ri
ko'rsata oladi (tarjima kerak emas).

---

## 7. Frontend uchun UI tavsiyalari

1. **Tashkilot turi tanlovi — 4 variant, bitta ekranда**: Jismoniy shaxs / YaTT /
   MChJ / Budjet muassasa. Har birining qisqa izohi bilan (masalan YaTT ostida:
   "Yakka tartibdagi tadbirkor — jismoniy shaxs sifatida ro'yxatdan o'tgan
   tadbirkorlik").
2. YaTT va MChJ tanlanganda **bir xil forma** ko'rsatiladi (passport +
   tashkilot rekvizitlari) — faqat labellar ozgina farqlanishi mumkin:
   - MChJ: "Direktor ma'lumotlari", "Kompaniya nomi"
   - YaTT: "Tadbirkor ma'lumotlari", "Tadbirkorlik nomi"
3. Ro'yxatdan o'tgandan keyin (profil/dashboard sahifasida) `account_type`ga
   qarab badge chiqaring:
   - `jismoniy` → oddiy foydalanuvchi belgisi
   - `yatt` → "YaTT" belgisi
   - `yuridik` → "MChJ" belgisi
4. Guest holatida savat/sevimlilarga qo'shilgan mahsulotlar — ro'yxatdan
   o'tishda (`X-Device-Id` header bilan) avtomatik akkauntga ko'chadi. Bu YaTT
   registratsiyasida ham xuddi shunday ishlaydi — alohida kod kerak emas.

---

## 8. Tezkor tekshiruv jadvali (QA uchun)

| Test | Kutilgan natija |
|------|------------------|
| `company_type: "yatt"` bilan register | `account_type` va `client_type` = `"yatt"` |
| `company_type: "mchj"` bilan register | `account_type` va `client_type` = `"yuridik"` (`"yatt"` emas!) |
| YaTT'da `company_name`/`inn` bo'sh yuborilsa | 400 xato |
| YaTT'da passport maydonlaridan biri bo'sh | 400 xato |
| OTP tasdiqlanmagan holda login | 403 (`status: pending_sms`) |
| OTP `000000` bilan tasdiqlash (dev) | 200, token qaytadi |
