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
    "record_filename": "2026/08/26/1787743096.335.wav"
  },
  "created_at": "2026-08-26T11:38:25Z"
}
```

---

## 3. ⚠️ Audio yozuv (recording) — HOZIRCHA OLIB BO'LMAYDI

Bu — frontendда adashmaslik uchun **muhim, aniq javob**:

- Utel har bir qo'ng'iroqни serverга `.wav` fayl sifatida yozib qo'yadi.
- Bu faylning **nomi/yo'li** bizga `raw_payload.record_filename` orqali keladi
  (masalan `"2026/08/26/1787743096.335.wav"`).
- **LEKIN** bu — faqat fayl nomi, **URL yoki playable link EMAS**. Uni ochish/
  eshittirish/yuklab olish uchun Utel API'sида **hech qanday hujjatlashtirilgan
  endpoint yo'q** (ochiq hujjatlarни to'liq tekshirdik).
- Shuning uchun hozircha frontendда **"qo'ng'iroqни eshitish" tugmasi qo'yib
  bo'lmaydi** — chunki backend ham bu faylни qayердан olishни bilмайди.

### Nima qilinmoqda
Utel support'га (`@utelsupport`) so'rov yuborilди: *"Qo'ng'iroq audio yozuvini
(`record_filename` orqali) yuklab olish yoki stream qilish uchun API endpoint
qanday?"* Javob kelganда:
1. Backendда shu faylни oluvchi/proksi qiluvchi endpoint qo'shiladi
   (masalan `GET /api/chats/sessions/<id>/messages/<id>/recording/`)
2. Shu hujjat yangиланади va sizga alohida xabar beriladi

**Hozircha frontend qila oladigan yagona narsa:** `raw_payload.record_filename`
mavjudligини (bo'sh emasligini) tekshirib, **"Yozuv mavjud (hali eshitib
bo'lmaydi)"** kabi statik belgi/ikonka ko'рsатиш — playable audio player emas.

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
4. **Audio tugmasi HOZIRCHA qo'ymang** — 3-bandда tushuntirilganidek, backend
   ham hali faylni bera olmaydi. Fақат `record_filename` bor/yo'qligини belgi
   sifatida ko'rsatish mumkin.

---

## 6. Hali tayyor emas (keyingi bosqichlar)
- **Audio yozuvni eshittirish/yuklab olish** — Utel support javobини kutmoqda.
- **Chiquvchi qo'ng'iroq CRM'дан boshlash** (click-to-call) — Utel API'i hali
  aniqlanmoqda.
