# IP-telefoniya (Utel) — CRM'ga qo'shildi (Frontend uchun)

Endi CRM'да **telefon qo'ng'iroqlari** ham Telegram/Instagram kabi **ChatSession**
sifatida ko'rinadi — operator panelida alohida "kanal" yasashning hojati yo'q,
mavjud chat-session ro'yxati/komponentlaringiz shu ma'lumotni ham ko'rsatadi.

---

## 1. Nima o'zgardi

- `ChatSession.platform` ro'yxatiga yangi qiymat qo'shildi: **`"phone"`**
- Har bir telefon raqami — alohida `ChatSession` (`platform_user_id` = mijoz
  raqami, `+998...` formatda)
- Qo'ng'iroq hodisalari (boshlandi, javob berildi, tugadi...) — shu sessiyaning
  **xabarlari** (`ChatMessage`, `sender_type: "system"`) sifatida yoziladi
- Qo'ng'iroq **boshlanishi bilan** (`call_started`) — `operator_needed: true`
  bo'lib qoladi, ya'ni **"operator kerak"** ro'yxatida darhol ko'rinadi
- Bu — **matnli suhbat emas**, shuning uchun AI avtomatik javob bermaydi;
  faqat log/bildirishnoma sifatida ishlaydi

---

## 2. API — o'zgarish yo'q, faqat yangi `platform` qiymati

```
GET /api/chats/sessions/                    barcha sessiyalar
GET /api/chats/sessions/?platform=phone     faqat qo'ng'iroqlar
GET /api/chats/sessions/?operator_needed=true   jonli qo'ng'iroqlar shu yerda
GET /api/chats/sessions/<id>/messages/      bitta sessiyaning xabarlari (qo'ng'iroq tarixi)
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
  "latest_message": {
    "sender_type": "system",
    "content": "Qo'ng'iroq tugadi (chiquvchi) — operator: 602 — davomiyligi 68 soniya"
  }
}
```

### Xabar obyekti (`sender_type: "system"`)
```json
{
  "direction": "in",
  "sender_type": "system",
  "content": "Qo'ng'iroq tugadi (chiquvchi) — operator: 602 — davomiyligi 68 soniya",
  "raw_payload": {
    "event_type": "call_ended",
    "call_id": "5fdd319b-...",
    "phone": "+998781505568",
    "extension": "602",
    "connected": true,
    "direction": "outgoing",
    "started_at": 1787743096,
    "ended_at": 1787743170,
    "duration": 68,
    "record_filename": "2026/08/26/1787743096.335.wav",
    "recording_url": "https://api.cc381.utel.uz/storage/monitor/2026/08/26/1787743096.335.wav"
  },
  "created_at": "2026-08-26T11:38:25Z"
}
```

---

## 3. ✅ Audio yozuv (recording) — ENDI ISHLAYDI

Yangilanish: Utel support'дан aniq javob olinди. Har bir xabarda endi
**`raw_payload.recording_url`** keladi — bu **to'liq, TOKENSIZ ochiladigan**
audio URL (`<audio src="...">`, yuklab olish tugmasi yoki to'g'ridan-to'g'ri
`<a href>` — barchasi ishlaydi, alohida autentifikatsiya/proksi shart emas).

```json
"recording_url": "https://api.cc381.utel.uz/storage/monitor/2026/08/26/1787743096.335.wav"
```

**Frontendда qilишингiz kerak bo'lgan yagona narsa:**
```jsx
{message.raw_payload.recording_url && (
  <audio controls src={message.raw_payload.recording_url} />
)}
```
`recording_url` bo'sh bo'lishi mumkin (masalan javob berilmagan/juda qisqa
qo'ng'iroqlarda yozuv bo'lmaydi) — shuning uchun mavjudligини tekshiring.

### Eski (tarixiy) qo'ng'iroqlar ham CRM'da
Webhook o'rnatilishidan **oldingi** barcha qo'ng'iroqlar ham (Utel'нинг
`/call-history` API'i orqali) bir martalik backfill bilan CRM'ga tortilди —
ular ham xuddi shu tarzda `recording_url` bilan keladi
(`raw_payload.source: "call_history_sync"` orqali ajratish mumkin, kerak bo'lsa).
Yangi qo'ng'iroqlar endi **avtomatik, har 10 daqiqada** ham sinxronlanади
(webhook allaqachon real-time yozib turadi — bu faqat qo'shimcha kafolat).

---

## 4. Real-time (WebSocket) — allaqachon ishlaydi

```
ws://<host>/ws/chats/                 barcha sessiyalar uchun umumiy oqim
ws://<host>/ws/chats/<session_id>/    bitta sessiya uchun
```
```json
{ "type": "chat.session_updated", "session": {...} }
{ "type": "chat.message_created", "session_id": "...", "message": {...} }
```

---

## 5. Frontend uchun UI tavsiyalari

1. `platform === "phone"` — telefon ikonkasi ko'rsating.
2. `operator_needed: true` + `platform: "phone"` — jonli qo'ng'iroq, ajratib
   ko'rsating (indikator bilan).
3. `sender_type: "system"` xabarlar — oddiy xabardan vizual farqlansin (kulrang/
   kursiv, "tizim xabari" ko'rinishida).
4. **Audio player qo'ying** — `raw_payload.recording_url` mavjud bo'lsa,
   qo'ng'iroq xabari ичida `<audio controls>` yoki yuklab olish tugmasi
   ko'rsating (3-bandга qarang).

---

## 6. Hali tayyor emas (keyingi bosqich)
- **Chiquvchi qo'ng'iroq CRM'дан boshlash** (click-to-call) — Utel API'i hali
  aniqlanmoqda.
