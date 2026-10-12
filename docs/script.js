// Open Autofill landing page interactions. No dependencies.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Sticky nav background ----------
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Scroll reveal ----------
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  $$('.reveal, .demo, .screens').forEach((el) => io.observe(el));

  // ---------- Feature card spotlight ----------
  $$('.feature').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - r.left}px`);
      card.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  });

  // ---------- Screens carousel ----------
  const screenBtns = $$('.screen-tabs button');
  const screenImgs = $$('.phone.main img');
  let screenIdx = 0;
  let screenTimer;
  function showScreen(i) {
    screenIdx = i;
    screenBtns.forEach((b, j) => b.classList.toggle('active', j === i));
    screenImgs.forEach((img, j) => img.classList.toggle('active', j === i));
  }
  function autoRotate() {
    if (reduced) return;
    screenTimer = setInterval(() => showScreen((screenIdx + 1) % screenImgs.length), 3500);
  }
  screenBtns.forEach((b) =>
    b.addEventListener('click', () => {
      clearInterval(screenTimer); // user took over
      showScreen(Number(b.dataset.screen));
    })
  );
  autoRotate();

  // ---------- Install tabs ----------
  $$('.install-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.install-tabs button').forEach((x) => x.classList.toggle('active', x === b));
      $$('.install-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === b.dataset.install));
    })
  );

  // ---------- Copy buttons ----------
  $$('.copy').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const text = btn.parentElement.querySelector('code').textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      } catch {
        /* clipboard blocked */
      }
    })
  );

  // ---------- Hero demo: Open Autofill fills the form ----------
  const demo = $('.demo');
  const body = $('.window-body');
  const cursor = $('#demo-cursor');
  const autofillBtn = $('#demo-autofill');
  const toast = $('#demo-toast');
  const fields = $$('[data-fill]', demo);

  function reset() {
    fields.forEach((f) => {
      f.classList.remove('active', 'done');
      if (f.classList.contains('input')) f.textContent = '';
    });
    toast.classList.remove('show');
  }

  function fillInstant() {
    fields.forEach((f) => {
      if (f.classList.contains('input')) f.textContent = f.dataset.fill;
      f.classList.add('done');
    });
    toast.classList.add('show');
  }

  function moveCursorTo(el, dx = 0.5, dy = 0.6) {
    const b = body.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    cursor.style.transform = `translate(${r.left - b.left + r.width * dx}px, ${r.top - b.top + r.height * dy}px)`;
  }

  async function typeInto(el, text) {
    el.classList.add('active');
    const step = Math.max(14, Math.min(45, 600 / text.length));
    for (let i = 1; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await sleep(step);
    }
    el.classList.remove('active');
    el.classList.add('done');
  }

  let running = false;
  async function loop() {
    if (running) return;
    running = true;
    const panelVisible = getComputedStyle($('.panel')).display !== 'none';
    while (true) {
      reset();
      await sleep(900);
      if (panelVisible) {
        cursor.style.opacity = '1';
        moveCursorTo(autofillBtn);
        await sleep(1000);
        autofillBtn.classList.add('pressed');
        await sleep(180);
        autofillBtn.classList.remove('pressed');
        await sleep(200);
        cursor.style.opacity = '0';
      }
      for (const f of fields) {
        if (f.classList.contains('checkbox')) {
          f.classList.add('done');
          await sleep(160);
        } else if (f.classList.contains('select')) {
          f.textContent = f.dataset.fill;
          f.classList.add('done');
          await sleep(160);
        } else {
          await typeInto(f, f.dataset.fill);
          await sleep(60);
        }
      }
      toast.classList.add('show');
      await sleep(3200);
    }
  }

  if (reduced) {
    fillInstant();
  } else {
    cursor.style.transition = 'transform 0.9s cubic-bezier(.22,1,.36,1), opacity .3s';
    new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          setTimeout(loop, 700);
        }
      },
      { threshold: 0.3 }
    ).observe(demo);
  }
})();
