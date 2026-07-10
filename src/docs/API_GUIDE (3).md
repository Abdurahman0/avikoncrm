# AvikonCRM — API Guide (Frontend)

Barcha API'lar **ikki panelga** bo'lingan:
- **A. SITE** — marketplace / mijoz tomoni (do'kon sayti)
- **B. CRM** — ichki xodim paneli (operator/admin)

---

## 0. Umumiy qoidalar

- **Base URL:** `https://<host>` (masalan ngrok yoki `http://127.0.0.1:8000`)
- **Auth:** `Authorization: Bearer <access_token>` (JWT)
- **Guest savat/liked:** `X-Device-Id: <uuid>` header (localStorage UUID)
- **ngrok bepul:** har so'rovga `ngrok-skip-browser-warning: true` qo'shing
- **Swagger:** `GET /docs/`

**Javob formati (standart envelope):**
```json
{ "status": "success", "data": { ... } }        // muvaffaqiyat
{ "status": "error", "message": "..." }          // xato
```
| Kod | Ma'no |
|-----|-------|
| 200/201 | OK |
| 400 | Validatsiya / noto'g'ri so'rov |
| 401 | Token yo'q / yaroqsiz |
| 403 | Ruxsat yo'q (yoki akkaunt pending/bloklangan) |
| 404 | Topilmadi |

**Auth ustunlari:** 🟢 public (token shart emas) · 🔵 login kerak · 🟡 guest device_id ham bo'ladi · 🔴 staff (operator/admin)

---

# A. SITE — Marketplace / mijoz tomoni

## A1. Auth (ro'yxat, kirish)
| Metod | Path | Auth | Tavsif |
|-------|------|:----:|--------|
| POST | `/api/auth/register/` | 🟢 | Jismoniy ro'yxat (passport + OTP) → pending_sms |
| POST | `/api/auth/register/company/` | 🟢 | Yuridik ro'yxat (direktor passport + kompaniya) → pending_sms |
| POST | `/api/auth/verify-otp/` | 🟢 | OTP tasdiqlash `{phone, code}` (hozir `000000`) → ACTIVE + JWT |
| POST | `/api/auth/resend-otp/` | 🟢 | OTP qayta yuborish `{phone}` |
| POST | `/api/auth/login/` | 🟢 | Kirish `{login: email/telefon, password}` |
| POST | `/api/auth/refresh/` | 🟢 | Access token yangilash `{refresh}` |
| GET | `/api/auth/me/` | 🔵 | Profil: `account_type`, `status`, `client` (verification_status, **can_order**) |

> Register/verify/login'da **`X-Device-Id`** yuborsangiz — guest savat/liked mijoz Client'iga ko'chadi.

## A2. Mahsulotlar (public katalog)
| Metod | Path | Auth | Tavsif |
|-------|------|:----:|--------|
| GET | `/api/unf/products/` | 🟢 | Mahsulotlar. Filtrlar: `search, group, segment, manufacturer, country, in_stock, has_price, min_price, max_price, minQuantity, include=all, limit, cursor` |
| GET | `/api/unf/product-groups/` | 🟢 | Guruhlar (kategoriya menyusi) |
| GET | `/api/unf/product-segments/` | 🟢 | Segmentlar |

> Har mahsulot: `id, code, name, price, stock, imageUrl, group, segment, manufacturer, country, category[]`.

## A3. Savat + Liked (mijoz yoki guest)
| Metod | Path | Auth | Tavsif |
|-------|------|:----:|--------|
| GET | `/api/clients/cart/` | 🟡 | Savat + jami summa (jonli narx) |
| POST | `/api/clients/cart/items/` | 🟡 | Qo'shish `{product_code, quantity}` |
| PATCH | `/api/clients/cart/items/<code>/` | 🟡 | Sonini o'zgartirish `{quantity}` |
| DELETE | `/api/clients/cart/items/<code>/` | 🟡 | O'chirish |
| GET | `/api/clients/favorites/` | 🟡 | Liked ro'yxati |
| POST | `/api/clients/favorites/` | 🟡 | Qo'shish `{product_code}` |
| DELETE | `/api/clients/favorites/<code>/` | 🟡 | O'chirish |

> Login qilgan → Client egaligida; guest → `X-Device-Id` header bilan.

## A4. Kompaniya (yuridik mijoz o'zi boshqaradi)
| Metod | Path | Auth | Tavsif |
|-------|------|:----:|--------|
| GET / POST | `/api/companies/` | 🔵 | A'zo kompaniyalar / yangi yaratish |
| GET | `/api/companies/<id>/` | 🔵 | Detali (faqat a'zo) |
| GET | `/api/companies/<id>/members/` | 🔵 | A'zolar (rol bilan) |
| POST | `/api/companies/<id>/invite/` | 🔵 | Taklif `{phone/email, role_id}` (members.manage) |
| POST | `/api/companies/invitations/accept/` | 🔵 | Taklifni qabul `{token}` |
| GET / POST | `/api/companies/<id>/branches/` | 🔵 | Filiallar |
| GET / PUT | `/api/companies/<id>/settings/` | 🔵 | Til/valyuta/vaqt zonasi |
| GET / POST | `/api/companies/<id>/documents/` | 🔵 | Hujjat/litsenziya (multipart: `document_type`, `file`) |
| GET / POST | `/api/companies/<id>/addresses/` | 🔵 | Manzillar (`?type=delivery`) |
| GET/PUT/DELETE | `/api/companies/<id>/addresses/<addr_id>/` | 🔵 | Manzil (o'zgartirish/o'chirish) |

## A5. Ma'lumotnomalar (formalar uchun)
| Metod | Path | Auth | Tavsif |
|-------|------|:----:|--------|
| GET | `/api/references/banks/` | 🔵 | Banklar (`?search=`) |
| GET | `/api/references/regions/` | 🔵 | Viloyatlar + tumanlar |
| GET | `/api/document-types/` | 🔵 | Hujjat turlari |
| GET / POST | `/api/roles/` | 🔵 | Kompaniya rollari (`?company=<id>`) |
| GET | `/api/permissions/` | 🔵 | Kompaniya permissionlari |

---

# B. CRM — Ichki panel (operator/admin)

> Barchasi 🔴 **staff token** (developer/admin/operator) + permission talab qiladi.

## B1. Dashboard va audit
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/api/dashboard/overview/` | Statistika |
| GET | `/api/audit-logs/` | Audit jurnali |

## B2. Mijozlar (CRM)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET / POST | `/api/clients/` | Mijozlar ro'yxati / yaratish (`?client_type=`) |
| GET/PUT/PATCH/DELETE | `/api/clients/<id>/` | Mijoz (**ai_summary**, interested_product, verification_status) |
| GET / POST | `/api/clients/statuses/` | CRM statuslar (pipeline) |

## B3. Shop tasdiqlash (verification)
| Metod | Path | Permission | Tavsif |
|-------|------|-----------|--------|
| GET | `/api/clients/review/` | clients.view | Tekshiruvdagi shoplar (`?verification_status=pending&search=`) |
| GET | `/api/clients/review/<id>/` | clients.view | To'liq: client + kompaniya + hujjatlar + **ai_summary** |
| PATCH | `/api/clients/review/<id>/` | clients.manage | Kerakli maydonlarni tahrirlash |
| POST | `/api/clients/review/<id>/verify/` | clients.verify | Tasdiqlash → `can_order=true` |
| POST | `/api/clients/review/<id>/reject/` | clients.verify | Rad etish `{reason}` |

## B4. Chatlar (AI + operator)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/api/chats/sessions/` | Chat sessiyalar |
| GET | `/api/chats/sessions/<id>/` | Sessiya detali |
| GET | `/api/chats/sessions/<id>/messages/` | Xabarlar |
| POST | `/api/chats/sessions/<id>/send-message/` | Operator xabar yuboradi |
| POST | `/api/chats/sessions/<id>/pause-ai/` | AI'ni to'xtatish |
| POST | `/api/chats/sessions/<id>/resume-ai/` | AI'ni davom ettirish |
| POST | `/api/chats/sessions/<id>/request-operator/` | Operator so'rash |
| POST | `/api/chats/sessions/<id>/mark-read/` | O'qildi deb belgilash |

## B5. Foydalanuvchilar va ruxsatlar (staff)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET / POST | `/api/users/` | Xodimlar (staff) |
| GET/PUT/PATCH/DELETE | `/api/users/<id>/` | Xodim |
| GET/PUT | `/api/users/<id>/permissions/` | Xodim permissionlari |
| GET | `/api/auth/roles/` | Staff rollar katalogi |
| GET | `/api/auth/permissions/` · `/api/auth/permissions/all/` | Staff permission katalogi |

## B6. Sozlamalar (AI + integratsiyalar)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET/POST/PUT | `/api/settings/ai/` | AI sozlamalari (**system_prompt DB'da tahrirlanadi**) |
| GET | `/api/settings/ai/active/` | Faol AI sozlama |
| GET/POST/PUT | `/api/settings/integrations/` | Telegram/Instagram/OpenAI kalitlari |
| GET | `/api/settings/integrations/events/` | Integratsiya hodisalari |
| POST | `/api/settings/integrations/webhooks/telegram/` | Telegram webhook (tashqi) |
| POST | `/api/settings/integrations/webhooks/instagram/` | Instagram webhook (tashqi) |

## B7. Xom 1C ma'lumoti (staff)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/api/unf/customers/` | 1C kontragentlar (`?search=`) |
| GET | `/api/unf/tables/` | 1C jadvallar ro'yxati |
| GET | `/api/unf/tables/<table>/` | Jadval satrlari |

---

## Muhim oqimlar (frontend uchun)

**1. Ro'yxat → order (site):**
```
register/ (yoki register/company/) → verify-otp {code:"000000"} → login → me
  me.client.can_order === false  →  "Buyurtma" tugmasi BLOKLANADI
  operator tasdiqlagach can_order=true  →  ochiladi
```

**2. Guest savat → login:**
```
X-Device-Id bilan cart/favorites → register/login (X-Device-Id bilan) → savat Client'ga ko'chadi
```

**3. Operator (CRM):**
```
clients/review/?verification_status=pending → detail (ai_summary + kompaniya + hujjat) → verify / reject
```

---

## Tayyor test akkauntlari
| Turi | Login | Parol |
|------|-------|-------|
| Staff (admin) | `admin@test.uz` | `Admin1234` |
| Jismoniy | `jismoniy@test.uz` | `Test1234` |
| Yuridik | `yuridik@test.uz` | `Test1234` |
| Developer | `developer` | `Password123!` |

OTP: **`000000`**. Batafsil payload namunalari: `EXAMPLES.md`. Verification oqimi: `SHOP_VERIFICATION.md`.
