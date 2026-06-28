const LOWER_NUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
const UPPER_NUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generatePassword(length, charset) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

function generatePesertaPassword() {
  return generatePassword(8, LOWER_NUM);
}

function generateQuizPassword() {
  return generatePassword(5, UPPER_NUM);
}

module.exports = { generatePassword, generatePesertaPassword, generateQuizPassword };
