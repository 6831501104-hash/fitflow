// Paste your Apps Script Web App URL (ends with /exec) between the quotes.
// Leave empty to keep the old localStorage-only demo mode (admin page only, no user portal).
window.SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwphqWnJxkoWja2a8QnyMF5cW-d42tTUcAPmGn-ZVPjeSkFE88Uae8x3umDoMKMgJ41ZA/exec';

// Shown to members on the "subscribe & pay" screen. Fill in your real account details.
window.PAYMENT_INFO = {
  bank: '',        // e.g. 'ธนาคารกสิกรไทย'
  accountName: '', // e.g. 'บจก. ฟิตโฟลว์'
  accountNumber: '', // e.g. '123-4-56789-0'
  promptpay: ''    // optional PromptPay number
};
