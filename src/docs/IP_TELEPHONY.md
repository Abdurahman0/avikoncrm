# IP-telefoniya (Utel) — CRM'ga qo'shildi (Frontend uchun)

Endi CRM'да **telefon qo'ng'iroqlari** ham Telegram/Instagram kabi **ChatSession**
sifatida ko'rinadi — operator panelида alohida "kanal" yasashнинг hojati yo'q,
mavjud chat-session ro'yxati/komponentlaringiz shu ma'lumotни ham ko'rsatади.

---

## 1. Nima o'zgardi

- `ChatSession.platform` ro'yxatiga yangi qiymat qo'shildi: **`"phone"`**
- Har bir telefon raqami — alohida `ChatSession` (`platform_user_id` = mijoz
  raqami, `+998...` formatда)
- Qo'ng'iroq hodisalari (boshlandi, javob berildi, tugadi...) — shu sessiyaнинг
  **xabarlari** (`ChatMessage`, `sender_type: "system"`) sifatida yoziladi
- Qo'ng'iroq **boshlanishi bilan** (`call_started`) — `operator_needed: true`
  bo'lib qoladi, ya'ni **"operator kerak"** ro'yxatida darhol ko'rinadi
- Bu — **matnli suhbat emas**, shuning uchun AI avtomatik javob bermaydi;
  faqat log/bildirishnoma sifatida ishlaydi

---

## 2. API — o'zgarish yo'q, faqat yangi `platform` qiymati

Frontend allaqachon ishlatadigan endpointlar bilan ishlaydi:

```
GET /api/chats/sessions/                    barcha sessiyalar (platform=phone bilan filtrlash mumkin)
GET /api/chats/sessions/?platform=phone     faqat qo'ng'iroqlar
GET /api/chats/sessions/?operator_needed=true   operator kerak bo'lganlar (jonli qo'ng'iroqlar shu yerda)
GET /api/chats/sessions/<id>/messages/      bitta sessiyaнинг xabarlari (qo'ng'iroq tarixi)
POST /api/chats/sessions/<id>/mark-read/    o'qilgan deb belgilash
```

### Session obyekti (misol)
```json
{
  "id": "b3a1...-uuid",
  "client": null,
  "platform": "phone",
  "platform_user_id": "+998781505568",
  "title": "Tel: +998781505568",
  "operator_needed": true,
  "last_customer_message_at": "2026-08-26T11:38:25Z",
  "unread_count": 3,
  "latest_message": {
    "sender_type": "system",
    "content": "Qo'ng'iroq tugadi (chiquvchi) — operator: 602 — davomiyligi 68 soniya",
    "created_at": "2026-08-26T11:38:25Z"
  }
}
```
> `client` — agar shu raqam bo'yicha CRM'да mavjud mijoz topilsa, avtomatik
> bog'lanadi (aks holda `null`).

### Xabar obyekti (`sender_type: "system"`)
```json
{
  "id": "...",
  "direction": "in",
  "sender_type": "system",
  "content": "Qo'ng'iroq boshlandi (kiruvchi)",
  "raw_payload": {
    "event_type": "call_started",
    "call_id": "...",
    "phone": "+998781505568",
    "extension": "602",
    "connected": true,
    "direction": "incoming",
    "started_at": 1787743096,
    "ended_at": null,
    "duration": null
  },
  "created_at": "2026-08-26T11:38:19Z"
}
```

### Xabar matnlari (`content`) — tayyor, o'zbek tilida
| Hodisa | Namuna matn |
|---|---|
| Qo'ng'iroq boshlandi | `Qo'ng'iroq boshlandi (kiruvchi)` |
| Ichki raqamga ulanmoqda | `Ichki raqamga ulanmoqda (chiquvchi)` |
| Javob berildi | `Qo'ng'iroqqa javob berildi (chiquvchi)` |
| Tugadi (gaplashilgan) | `Qo'ng'iroq tugadi (chiquvchi) — operator: 602 — davomiyligi 68 soniya` |
| Tugadi (javobsiz) | `Qo'ng'iroq tugadi (kiruvchi) — javob berilmadi` |
| Yozuv saqlandi | `Qo'ng'iroq yozuvi saqlandi (kiruvchi)` |
| O'tkazildi | `Qo'ng'iroq boshqa operatorga uzatildi` |

`raw_payload.extension` — qo'ng'iroqni qabul qilgan/qilgan operatorнинг ichki
raqami (agar bilinsa). `raw_payload.direction`: `incoming` (kiruvchi) /
`outgoing` (chiquvchi) / `internal` (ichki).

---

## 3. Real-time (WebSocket) — allaqachon ishlaydi, qo'shimcha kod shart emas

```
ws://<host>/ws/chats/                 barcha sessiyalar uchun umumiy oqim
ws://<host>/ws/chats/<session_id>/    bitta sessiya uchun
```
Voqealar:
```json
{ "type": "chat.session_updated", "session": { ...yuqoridagi shakl... } }
{ "type": "chat.message_created", "session_id": "...", "message": { ...yuqoridagi shakl... } }
```
Qo'ng'iroq boshlanганда `chat.session_updated` (`operator_needed: true` bilan) va
`chat.message_created` (system xabar) ketма-ket keladi — mavjud handler'lar
buni Telegram/Instagram xabari kabi qabul qiladi, faqat `platform: "phone"` va
`sender_type: "system"`ни alohida ko'rsatishни (masalan telefon ikonkasi bilan)
qo'shsangiz bo'ldi.

---

## 4. Frontend uchun UI tavsiyalari

1. **Sessiya ro'yxatida** `platform === "phone"` bo'lsa — telefon ikonkasi
   ko'rsating (Telegram/Instagram loqotипи o'rniga).
2. **`operator_needed: true` + `platform: "phone"`** — bu **jonli qo'ng'iroq**
   degani, ro'yxat boshida/alohida "Jonli qo'ng'iroqlar" bo'limида ажратиб
   ko'rsatish tavsiya etiladi (masalan qizil/yashil indikator bilan).
3. **`sender_type: "system"`** xabarlar — oddiy mijoz/operator xabaridан
   farqли (kulrang, kursiv yoki markazlashgan "tizim xabari" ko'rinishida
   chizish tavsiya etiladi — chunki bu kimдир yozgan matn emas, tizim log'i).
4. Sessiya sarlavhasида (`title: "Tel: +998..."`) raqam ko'rinади — agar
   `client` bog'langan bo'lsa, uning ismini ko'rsatишни afzal ko'ring
   (`client.full_name`).
5. Qo'ng'iroq **yozuvi (audio)** hozircha API orqali berilмайди — faqat
   metadata (vaqt, davomiylik, kim bilan). Kerak bo'lsa keyingi bosqichда
   qo'shiladi.

---

## 5. Hali tayyor emas (keyingi bosqich)
- **Chiquvchi qo'ng'iroq CRM'дан boshlash** (click-to-call tugmasi) — Utel
  API'i hali aniqlanmoqda, tayyor bo'lganda alohida xabar beriladi.
- Qo'ng'iroq yozuvini (audio) frontendда eshittirish.
