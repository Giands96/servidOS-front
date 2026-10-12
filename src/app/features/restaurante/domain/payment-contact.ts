/**
 * Manual subscription payment contact (Yape + WhatsApp confirmation).
 * The owner fills `whatsappNumber` in international format, digits only (e.g. country code + number),
 * and drops the Yape QR image at `public/yape-qr.png`. While the number is empty the
 * WhatsApp control stays disabled.
 */
export const PAYMENT_CONTACT = { whatsappNumber: '', yapeQrSrc: 'yape-qr.png' } as const;
