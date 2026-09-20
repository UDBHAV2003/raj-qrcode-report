export function initKeyboardNavigation() {
  // पहले से लगे पुराने लिसनर को हटाने के लिए एक यूनिक नाम का फंक्शन यूज़ करना बेहतर है, 
  // लेकिन फिलहाल इसे ऐसे ठीक करें:
  
  const handleKeyDown = (e) => {
    if (!["Enter", "ArrowDown", "ArrowUp"].includes(e.key)) return;

    const active = document.activeElement;
    if (!active || !["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName)) return;

    const fields = Array.from(
      document.querySelectorAll("input, select, textarea")
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        !el.disabled &&
        el.tabIndex !== -1 &&
        el.type !== "hidden" &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        !el.readOnly &&
        el.closest("datalist") === null
      );
    });

    const index = fields.indexOf(active);
    if (index === -1) return;

    // यहाँ हम तय करेंगे कि हमें क्या करना है
    let nextIndex = index;
    if (e.key === "Enter" || e.key === "ArrowDown") {
      nextIndex = Math.min(index + 1, fields.length - 1);
    } else if (e.key === "ArrowUp") {
      nextIndex = Math.max(index - 1, 0);
    }

    // अगर अगला फील्ड वही है जिस पर अभी हैं, तो कुछ न करें
    if (nextIndex === index) return;

    // इवेंट को पूरी तरह रोकें ताकि यह दोबारा ट्रिगर न हो
    e.preventDefault();
    e.stopImmediatePropagation();

    const nextField = fields[nextIndex];
    if (nextField) {
      nextField.focus();
      if (['text', 'number', 'password', 'search', 'email', 'url'].includes(nextField.type)) {
        nextField.select();
      }
    }
  };

  // 'capture' को true रखें ताकि यह सबसे पहले चले
  document.removeEventListener("keydown", handleKeyDown); // पुराना हटाने के लिए
  document.addEventListener("keydown", handleKeyDown, true);
}