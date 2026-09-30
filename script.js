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
      heroShowcase.style.setProperty('--hero-parallax-web', `${(traveled * .04).toFixed(2)}px`);
      heroShowcase.style.setProperty('--hero-parallax-phone', `${(traveled * .08).toFixed(2)}px`);
      heroShowcase.style.setProperty('--hero-parallax-detail', `${(traveled * .06).toFixed(2)}px`);
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
    const flowSteps = flowSequence.querySelectorAll('.flow-label, .source-grid article, .flow-arrow, .flow-core, .people-grid article');
    flowSteps.forEach((step, index) => {
      step.classList.add('flow-step');
      step.style.setProperty('--flow-delay', `${index * 55}ms`);
    });
  }

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
