# مستندات API احراز هویت KYC — آریا اکس

پایه آدرس: `/ariax-api`  
فرمت پاسخ: JSON با `charset=UTF-8`  
امنیت: فایل‌ها با AES-256-GCM رمزنگاری می‌شوند، اما روی دیسک در مسیر غیر Public `secure-storage/kyc/` نگهداری می‌شوند. مقدار ذخیره‌شده در دیتابیس همچنان از قالب منطقی `uploads/kyc/...` استفاده می‌کند و فقط بک‌اند اجازه خواندن فایل واقعی را دارد.

---

## احراز هویت

| نوع | هدر |
|-----|-----|
| عمومی | بدون توکن (پیش‌نویس و ثبت‌نام) |
| کاربر/ادمین | `Authorization: Bearer <token>` |

توکن از `POST /auth/login` دریافت می‌شود.

---

## ۱. ذخیره پیش‌نویس مرحله‌ای

`POST /kyc/drafts`  
`Content-Type: multipart/form-data`

### فیلدهای مشترک

| فیلد | نوع | توضیح |
|------|-----|-------|
| `step` | `1 \| 2 \| 3` | شماره مرحله |
| `draftToken` | string | اختیاری در مرحله ۱؛ اجباری در ۲ و ۳ |

### مرحله ۱ — اطلاعات پایه

| فیلد | الزامی |
|------|--------|
| `firstName`, `lastName` | بله |
| `nationalId` (۱۰ رقم) | بله |
| `phone` (`09xxxxxxxxx`) | بله |
| `email` | خیر |
| `nationalIdImage` (JPG/PNG ≤5MB) | بله |

### مرحله ۲ — سلفی زنده

| فیلد | الزامی |
|------|--------|
| `draftToken` | بله |
| `selfieImage` (JPG/PNG ≤5MB) | بله |
| `faceMatchScore` | خیر |
| `faceMatchStatus` | خیر (`verified`, `review`, `unavailable`, `failed`) |

### مرحله ۳ — تکمیلی

| فیلد | الزامی |
|------|--------|
| `draftToken` | بله |
| `homeAddress` | خیر |
| `supportingDocument` (JPG/PNG/PDF ≤10MB) | خیر |
| `supportingDocumentType` | خیر |

### پاسخ نمونه

```json
{
  "draftToken": "a1b2c3...",
  "currentStep": 2,
  "overallStatus": "draft",
  "step1Status": "approved",
  "step2Status": "pending",
  "step3Status": "pending",
  "faceMatchScore": 78.5,
  "kycDetails": {
    "fullName": "علی رضایی",
    "nationalId": "0012345678",
    "phone": "09121234567",
    "nationalIdImage": "data:image/jpeg;base64,...",
    "selfieImage": "data:image/jpeg;base64,..."
  }
}
```

---

## ۲. بازیابی پیش‌نویس

`GET /kyc/drafts/{draftToken}`

برای ادامه ثبت‌نام از همان مرحله‌ای که کاربر رها کرده است.

---

## ۳. وضعیت KYC کاربر جاری

`GET /kyc/me`  
نیاز به توکن کاربر.

---

## ۴. ثبت‌نام نهایی

`POST /auth/register`  
`Content-Type: multipart/form-data`

| فیلد | الزامی |
|------|--------|
| `draftToken` | بله (پس از تکمیل ۳ مرحله) |
| `username` | بله |
| `password` | بله (حداقل ۶ کاراکتر) |
| `email` | خیر |

پس از ثبت، `kyc_status` کاربر `pending` می‌شود.

---

## ۵. گزارش داخلی (فقط ادمین)

`GET /kyc/report`

### پاسخ

```json
{
  "summary": {
    "draft": 3,
    "pending_review": 5,
    "approved": 12,
    "rejected": 1
  },
  "rows": [
    {
      "id": 7,
      "draftToken": "...",
      "fullName": "علی رضایی",
      "currentStep": 3,
      "step1Status": "approved",
      "step2Status": "approved",
      "step3Status": "approved",
      "overallStatus": "draft",
      "faceMatchScore": 81
    }
  ]
}
```

---

## ۶. تأیید / رد پرونده (فقط ادمین)

`PUT /kyc/report/{applicationId}`

```json
{
  "overallStatus": "approved"
}
```

یا برای رد:

```json
{
  "overallStatus": "rejected",
  "rejectionReason": "تصویر سلفی نامشخص است"
}
```

---

## ۷. سلامت سرویس

`GET /health`

```json
{
  "ok": true,
  "db": "connected",
  "kycReady": true
}
```

اگر `kycReady: false` باشد، مایگریشن‌های `ariax_migrations_v4.sql` و `v5.sql` را اجرا کنید.

---

## کدهای خطای رایج

| کد | معنی |
|----|------|
| 400 | اعتبارسنجی (کد ملی، شماره، فایل) |
| 401 | توکن نامعتبر یا منقضی |
| 403 | دسترسی ادمین لازم است |
| 404 | پیش‌نویس یا پرونده یافت نشد |
| 500 | خطای دیتابیس یا رمزنگاری |
