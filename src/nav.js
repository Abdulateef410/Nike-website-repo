(() => {
  const menuButton = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("primary-navigation");
  const openIcon = document.getElementById("mobile-menu-open-icon");
  const closeIcon = document.getElementById("mobile-menu-close-icon");

  if (!menuButton || !menu || !openIcon || !closeIcon) return;

  let isMenuOpen = false;

  function setMenuOpen(open) {
    isMenuOpen = open;
    menu.classList.toggle("hidden", !open);
    openIcon.classList.toggle("hidden", open);
    closeIcon.classList.toggle("hidden", !open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  }

  menuButton.addEventListener("click", () => setMenuOpen(!isMenuOpen));

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (
      isMenuOpen &&
      !menu.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen) setMenuOpen(false);
  });

  const desktopBreakpoint = window.matchMedia("(min-width: 64rem)");
  desktopBreakpoint.addEventListener("change", (event) => {
    if (event.matches) setMenuOpen(false);
  });
})();
