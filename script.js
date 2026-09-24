(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (menuButton && mobileNav) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '開啟導覽');
      mobileNav.classList.remove('open');
      document.body.classList.remove('menu-open');
    };

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? '開啟導覽' : '關閉導覽');
      mobileNav.classList.toggle('open', !isOpen);
      document.body.classList.toggle('menu-open', !isOpen);
    });

    mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 920) closeMenu();
    });
  }

  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const defaultTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
  if (defaultTab) {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab === defaultTab)));
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      const isDefault = panel.id === defaultTab.getAttribute('aria-controls');
      panel.hidden = !isDefault;
      panel.classList.toggle('active', isDefault);
    });
  }
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));

      document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
        const activePanelId = tab.getAttribute('aria-controls');
        const isActive = panel.id === activePanelId;
        panel.hidden = !isActive;
        panel.classList.toggle('active', isActive);
      });
    });

    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = tabs.indexOf(tab);
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
      nextTab.focus();
      nextTab.click();
    });
  });

  document.querySelectorAll('.faq-item button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      button.querySelector('i').textContent = isOpen ? '＋' : '－';
      answer.hidden = isOpen;
      item.classList.toggle('open', !isOpen);
    });
  });

  const demoForm = document.querySelector('#demo-form');
  const formStatus = document.querySelector('#form-status');
  if (demoForm && formStatus) {
    demoForm.addEventListener('submit', (event) => {
      event.preventDefault();
      formStatus.textContent = '表單尚未串接送出端點；上架 Wix 前請設定接收方式。';
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('visible'));
  }
})();
