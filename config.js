// Paste your Apps Script Web App URL (ends with /exec) between the quotes.
// Leave empty to keep the old localStorage-only demo mode (admin page only, no user portal).
window.SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxtfMhQSAAHkBf6tmJ3Gz2i60P_Hb6um0GXxlh3mK-peKZDsAcO9WvpB1DlY1feQKPEew/exec';

// Shown to members on the "subscribe & pay" screen. Fill in your real account details.
window.PAYMENT_INFO = {
  bank: '',        // e.g. 'ธนาคารกสิกรไทย'
  accountName: '', // e.g. 'บจก. ฟิตโฟลว์'
  accountNumber: '', // e.g. '123-4-56789-0'
  promptpay: ''    // optional PromptPay number
};
