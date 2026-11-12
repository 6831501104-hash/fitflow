// Paste your Apps Script Web App URL (ends with /exec) between the quotes.
// Leave empty to keep the old localStorage-only demo mode (admin page only, no user portal).
window.SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzzH5aXoMWHFHSyUZXi_m2Qxj94jfnz_y0-8oRjOh52LRkk8IVr9KayKaNvELJpluBI0Q/exec';

// Shown to members on the "subscribe & pay" screen. Fill in your real account details.
window.PAYMENT_INFO = {
  bank: '',        // e.g. 'ธนาคารกสิกรไทย'
  accountName: '', // e.g. 'บจก. ฟิตโฟลว์'
  accountNumber: '', // e.g. '123-4-56789-0'
  promptpay: ''    // optional PromptPay number
};
