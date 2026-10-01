(() => {
  document.documentElement.classList.add('motion-enabled');
  const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
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

  const heroShowcase = document.querySelector('.hero-showcase');
  if (heroShowcase) {
    const heroSection = heroShowcase.closest('.hero');
    let heroInView = true;
    let parallaxFrame = 0;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => heroShowcase.classList.add('is-visible'));
    });

    const updateHeroParallax = () => {
      parallaxFrame = 0;
      if (reducedMotionMedia.matches || !heroInView || !heroSection) return;
      const traveled = Math.min(Math.max(-heroSection.getBoundingClientRect().top, 0), heroSection.offsetHeight);
      const phoneFloat = Math.sin(traveled / 75) * 6;
      heroShowcase.style.setProperty('--hero-parallax-web', `${(traveled * .03).toFixed(2)}px`);
      heroShowcase.style.setProperty('--hero-parallax-phone', `${((traveled * .055) + phoneFloat).toFixed(2)}px`);
      heroShowcase.style.setProperty('--hero-parallax-detail', `${(traveled * .04).toFixed(2)}px`);
    };

    const queueHeroParallax = () => {
      if (!parallaxFrame) parallaxFrame = window.requestAnimationFrame(updateHeroParallax);
    };

    if (!reducedMotionMedia.matches) {
      window.addEventListener('scroll', queueHeroParallax, { passive: true });
      window.addEventListener('resize', queueHeroParallax);
      if ('IntersectionObserver' in window && heroSection) {
        const heroObserver = new IntersectionObserver(([entry]) => {
          heroInView = entry.isIntersecting;
          heroShowcase.classList.toggle('parallax-active', heroInView);
          if (heroInView) queueHeroParallax();
        });
        heroObserver.observe(heroSection);
      } else {
        heroShowcase.classList.add('parallax-active');
      }
      queueHeroParallax();
    }
  }

  const frictionCarousel = document.querySelector('[data-friction-carousel]');
  if (frictionCarousel) {
    const viewport = frictionCarousel.querySelector('.friction-viewport');
    const track = frictionCarousel.querySelector('.friction-track');
    const slides = Array.from(frictionCarousel.querySelectorAll('.friction-slide'));
    const dots = Array.from(frictionCarousel.querySelectorAll('[data-carousel-dot]'));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstClone = slides[0].cloneNode(true);
    const lastClone = slides[slides.length - 1].cloneNode(true);
    let position = 1;
    let startX = 0;
    let dragX = 0;
    let dragging = false;
    let inView = false;
    let timer;

    firstClone.setAttribute('aria-hidden', 'true');
    lastClone.setAttribute('aria-hidden', 'true');
    firstClone.inert = true;
    lastClone.inert = true;
    track.prepend(lastClone);
    track.append(firstClone);

    const currentIndex = () => (position - 1 + slides.length) % slides.length;
    const setTransform = (animate = true, offset = 0) => {
      track.style.transition = animate && !reduceMotion ? '' : 'none';
      track.style.transform = `translate3d(calc(${-position * 100}% + ${offset}px), 0, 0)`;
    };
    const syncState = () => {
      const activeIndex = currentIndex();
      dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === activeIndex)));
      slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== activeIndex)));
    };
    const clearTimer = () => window.clearTimeout(timer);
    const schedule = () => {
      clearTimer();
      if (!reduceMotion && inView && !dragging && !document.hidden) {
        timer = window.setTimeout(() => {
          position += 1;
          setTransform(true);
          syncState();
          schedule();
        }, 3000);
      }
    };
    const finishDrag = (event) => {
      if (!dragging) return;
      dragging = false;
      frictionCarousel.classList.remove('is-dragging');
      const threshold = Math.min(80, viewport.clientWidth * .16);
      if (dragX <= -threshold) position += 1;
      if (dragX >= threshold) position -= 1;
      dragX = 0;
      setTransform(true);
      syncState();
      if (event.pointerId !== undefined && viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      schedule();
    };

    setTransform(false);
    syncState();

    viewport.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      dragX = 0;
      clearTimer();
      frictionCarousel.classList.add('is-dragging');
      try {
        viewport.setPointerCapture?.(event.pointerId);
      } catch {
        // 部分自動化或舊版瀏覽器不提供有效的 pointer capture，拖曳本身仍可正常進行。
      }
      setTransform(false);
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      dragX = event.clientX - startX;
      setTransform(false, dragX);
    });
    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('dragstart', (event) => event.preventDefault());

    track.addEventListener('transitionend', () => {
      if (position === 0) {
        position = slides.length;
        setTransform(false);
      } else if (position === slides.length + 1) {
        position = 1;
        setTransform(false);
      }
      syncState();
    });

    dots.forEach((dot) => dot.addEventListener('click', () => {
      position = Number(dot.dataset.carouselDot) + 1;
      setTransform(true);
      syncState();
      schedule();
    }));

    document.addEventListener('visibilitychange', schedule);

    if ('IntersectionObserver' in window) {
      const carouselObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= .45;
        schedule();
      }, { threshold: [.45] });
      carouselObserver.observe(frictionCarousel);
    } else {
      inView = true;
      schedule();
    }
  }

  const marketplace = document.querySelector('.marketplace');
  const journeyPanels = Array.from(document.querySelectorAll('.marketplace [role="tabpanel"]'));
  let marketplaceInView = false;

  journeyPanels.forEach((panel) => {
    panel.querySelectorAll('.journey-grid > *').forEach((step, index) => {
      step.classList.add('journey-step');
      step.style.setProperty('--journey-delay', `${index * 180}ms`);
    });
  });

  const animateJourney = (panel) => {
    if (!panel) return;
    if (reducedMotionMedia.matches) {
      panel.classList.add('journey-visible');
      return;
    }
    panel.classList.remove('journey-visible');
    void panel.offsetWidth;
    window.requestAnimationFrame(() => panel.classList.add('journey-visible'));
  };

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
        if (isActive && marketplaceInView) animateJourney(panel);
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

  if (marketplace) {
    const showActiveJourney = () => {
      marketplaceInView = true;
      animateJourney(marketplace.querySelector('.tab-panel.active'));
    };
    if ('IntersectionObserver' in window && !reducedMotionMedia.matches) {
      const marketplaceObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        showActiveJourney();
        marketplaceObserver.unobserve(marketplace);
      }, { threshold: .16 });
      marketplaceObserver.observe(marketplace);
    } else {
      showActiveJourney();
    }
  }

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

  const connectorInteractiveCard = document.querySelector('[data-connector-card]');
  if (connectorInteractiveCard) {
    const testButton = connectorInteractiveCard.querySelector('[data-connector-test]');
    const testButtonLabel = connectorInteractiveCard.querySelector('[data-connector-test-label]');
    const settings = connectorInteractiveCard.querySelector('[data-connector-settings]');
    const loading = connectorInteractiveCard.querySelector('[data-connector-loading]');
    const progress = connectorInteractiveCard.querySelector('[data-connector-progress]');
    const progressBar = connectorInteractiveCard.querySelector('[data-connector-progress-bar]');
    const progressValue = connectorInteractiveCard.querySelector('[data-connector-progress-value]');
    const status = connectorInteractiveCard.querySelector('[data-connector-status]');
    const successAlert = connectorInteractiveCard.querySelector('[data-connector-alert]');
    let connectorRunning = false;
    let connectorFrame = 0;
    let connectorAlertTimer = 0;

    const updateConnectorProgress = (value) => {
      const rounded = Math.max(0, Math.min(100, Math.round(value)));
      progressBar.style.width = `${rounded}%`;
      progress.setAttribute('aria-valuenow', String(rounded));
      progressValue.textContent = `${rounded}%`;
    };

    const showConnectorAlert = () => {
      window.clearTimeout(connectorAlertTimer);
      successAlert.setAttribute('aria-hidden', 'false');
      successAlert.classList.add('is-visible');
      connectorAlertTimer = window.setTimeout(() => {
        successAlert.classList.remove('is-visible');
        successAlert.setAttribute('aria-hidden', 'true');
      }, 2000);
    };

    const finishConnectorTest = () => {
      updateConnectorProgress(100);
      loading.hidden = true;
      settings.hidden = false;
      status.setAttribute('aria-hidden', 'false');
      status.classList.add('is-visible');
      testButton.disabled = false;
      testButtonLabel.textContent = '重新測試';
      connectorRunning = false;
      showConnectorAlert();
    };

    const runConnectorProgress = () => {
      const duration = reducedMotionMedia.matches ? 450 : 1800;
      const startedAt = performance.now();
      const tick = (time) => {
        const elapsed = time - startedAt;
        const ratio = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - ratio, 3);
        updateConnectorProgress(eased * 100);
        if (ratio < 1) connectorFrame = window.requestAnimationFrame(tick);
        else finishConnectorTest();
      };
      connectorFrame = window.requestAnimationFrame(tick);
    };

    testButton.addEventListener('click', () => {
      if (connectorRunning) return;
      connectorRunning = true;
      window.cancelAnimationFrame(connectorFrame);
      window.clearTimeout(connectorAlertTimer);
      successAlert.classList.remove('is-visible');
      successAlert.setAttribute('aria-hidden', 'true');
      status.classList.remove('is-visible');
      status.setAttribute('aria-hidden', 'true');
      settings.hidden = true;
      loading.hidden = false;
      testButton.disabled = true;
      testButtonLabel.textContent = '連線中';
      updateConnectorProgress(0);
      runConnectorProgress();
    });
  }

  const timedSequenceInterval = 600;
  const timedSequenceDefinitions = [
    {
      section: document.querySelector('.friction.timed-sequence'),
      textSelector: '.sequence-copy > .eyebrow, .sequence-copy > h2, .sequence-copy > .number-list > li',
      visualSelectors: ['.friction-board']
    },
    {
      section: document.querySelector('.automation.timed-sequence'),
      textSelector: '.sequence-copy > .eyebrow, .sequence-copy > h2, .sequence-copy > .lead, .sequence-copy > .number-list > li',
      visualSelectors: ['.automation-phone-shot', '.connector-card']
    }
  ];

  const timedSequences = timedSequenceDefinitions.flatMap(({ section, textSelector, visualSelectors }) => {
    if (!section) return [];
    const textItems = Array.from(section.querySelectorAll(textSelector));
    textItems.forEach((item, index) => {
      item.classList.add('sequence-item');
      item.style.setProperty('--sequence-delay', `${index * timedSequenceInterval}ms`);
    });
    const visualItems = visualSelectors.map((selector) => section.querySelector(selector)).filter(Boolean);
    visualItems.forEach((item, index) => {
      item.classList.add('sequence-item');
      item.style.setProperty('--sequence-delay', `${(textItems.length + index) * timedSequenceInterval}ms`);
    });
    return [{ section, duration: (textItems.length + visualItems.length) * timedSequenceInterval }];
  });

  const activateTimedSequence = ({ section, duration }) => {
    section.classList.add('sequence-visible');
    window.setTimeout(() => section.classList.add('sequence-complete'), reducedMotionMedia.matches ? 0 : duration + 900);
  };

  if ('IntersectionObserver' in window && !reducedMotionMedia.matches) {
    const timedObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sequence = timedSequences.find((item) => item.section === entry.target);
        if (sequence) activateTimedSequence(sequence);
        timedObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -4%' });
    timedSequences.forEach(({ section }) => timedObserver.observe(section));
  } else {
    timedSequences.forEach(activateTimedSequence);
  }

  const automationSection = document.querySelector('.automation');
  const connectorCard = automationSection?.querySelector('.connector-card');
  if (automationSection && connectorCard && !reducedMotionMedia.matches) {
    let automationInView = false;
    let automationFrame = 0;
    const updateConnectorParallax = () => {
      automationFrame = 0;
      if (!automationInView) return;
      const rect = automationSection.getBoundingClientRect();
      const distanceFromCenter = (window.innerHeight * .5) - (rect.top + rect.height * .5);
      const offset = Math.max(-28, Math.min(28, distanceFromCenter * .055));
      connectorCard.style.setProperty('--connector-parallax', `${offset.toFixed(2)}px`);
    };
    const queueConnectorParallax = () => {
      if (!automationFrame) automationFrame = window.requestAnimationFrame(updateConnectorParallax);
    };
    const automationObserver = new IntersectionObserver(([entry]) => {
      automationInView = entry.isIntersecting;
      automationSection.classList.toggle('parallax-active', automationInView);
      if (automationInView) queueConnectorParallax();
    });
    automationObserver.observe(automationSection);
    window.addEventListener('scroll', queueConnectorParallax, { passive: true });
    window.addEventListener('resize', queueConnectorParallax);
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotionMedia.matches) {
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

  const flowSequence = document.querySelector('.flow-sequence');
  if (flowSequence) {
    const flowSteps = flowSequence.querySelectorAll('.flow-caption, .source-grid article, .flow-arrow, .flow-core, .people-grid article');
    flowSteps.forEach((step, index) => {
      step.classList.add('flow-step');
      step.style.setProperty('--flow-delay', `${index * 55}ms`);
    });
  }

  const roleCards = Array.from(document.querySelectorAll('.people-grid article'));
  const setRoleMessageState = (card, open) => {
    card.classList.toggle('message-open', open);
    card.setAttribute('aria-expanded', String(open));
    card.querySelector('.role-message')?.setAttribute('aria-hidden', String(!open));
  };
  const closeRoleMessages = (except) => {
    roleCards.forEach((card) => {
      if (card !== except) setRoleMessageState(card, false);
    });
  };

  roleCards.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');
    card.addEventListener('click', () => {
      const shouldOpen = !card.classList.contains('message-open');
      closeRoleMessages(card);
      setRoleMessageState(card, shouldOpen);
    });
    card.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      card.click();
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.people-grid article')) closeRoleMessages();
  });

  const stagedRevealItems = document.querySelectorAll('.staged-reveal');
  if ('IntersectionObserver' in window && !reducedMotionMedia.matches) {
    const stagedObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('visible', entry.isIntersecting && entry.intersectionRatio >= .08);
      });
    }, { threshold: [0, .08], rootMargin: '-4% 0px -4%' });
    stagedRevealItems.forEach((item) => stagedObserver.observe(item));
  } else {
    stagedRevealItems.forEach((item) => item.classList.add('visible'));
  }
})();
