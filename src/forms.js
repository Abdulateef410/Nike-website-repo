(() => {
  document.querySelectorAll("form[data-email-draft-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const recipient = form.dataset.recipient;
      const subject = form.dataset.subject || "Website message";
      const body = [...new FormData(form).entries()]
        .map(([key, value]) => `${key}: ${String(value).trim()}`)
        .join("\n");
      const status = document.getElementById(form.dataset.statusId || `${form.id}-status`);

      if (!recipient) {
        if (status) status.textContent = "This form is not configured yet.";
        return;
      }

      window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (status) status.textContent = "Your email app should open with this message ready to send.";
    });
  });
})();
