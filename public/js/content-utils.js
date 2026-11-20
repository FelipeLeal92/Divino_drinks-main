window.ContentUtils = {
  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  },
  // Preserve the formatting used by existing content, without accepting attributes or executable tags.
  richText(value) {
    const escaped = this.escapeHtml(String(value ?? '').replace(/\\n/g, '\n'));
    return escaped.replace(/&lt;(\/?)(strong|b|em|i|br|p)\s*\/?&gt;/gi, '<$1$2>').replace(/\n/g, '<br>');
  },
  imageUrl(value) {
    const url = String(value || '');
    return /^\/?imagens\//.test(url) && !url.includes('..') ? '/' + url.replace(/^\//, '') : '';
  },
  whatsapp(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11 ? '55' + digits : digits;
  }
};
