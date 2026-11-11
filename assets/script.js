// === Modal helpers ===
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
}

function openViaClick(type) {
    window.location.hash = type;
}

function checkHashAndOpenModal() {
    const hash = window.location.hash;
    document.querySelectorAll('.modal').forEach(el => el.style.display = 'none');
    if (hash === '#privacy') openModal('privacy-modal');
}

// === Cookie banner ===
function acceptCookies() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('cookiesAccepted', 'true');
}

// === Scroll reveal ===
function initScrollReveal() {
    const elements = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(el => observer.observe(el));
}

// === Dynamic year ===
function setDynamicYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll('.dynamic-year').forEach(el => {
        el.textContent = year;
    });
}

// === Form validation ===
function initForm() {
    const form = document.getElementById('secureForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        document.querySelectorAll('.input-field').forEach(el => el.classList.remove('error-field'));
        document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');

        const nameInput = document.getElementById('form-name');
        const phoneInput = document.getElementById('form-phone');
        const messageInput = document.getElementById('form-message');

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const message = messageInput ? messageInput.value.trim() : '';

        let hasError = false;

        const nameRegex = /^[А-Яа-яЁёA-Za-z\s\-]{2,100}$/;
        if (!nameRegex.test(name)) {
            nameInput.classList.add('error-field');
            document.getElementById('error-name').style.display = 'block';
            hasError = true;
        }

        const phoneRegex = /^\+[0-9\s\-()]{9,18}$/;
        if (!phoneRegex.test(phone)) {
            phoneInput.classList.add('error-field');
            document.getElementById('error-phone').style.display = 'block';
            hasError = true;
        }

        if (message.length > 1000) {
            messageInput.classList.add('error-field');
            document.getElementById('error-message').style.display = 'block';
            hasError = true;
        }

        if (!document.getElementById('agree-policy').checked) {
            alert('Для отправки формы необходимо дать согласие на обработку персональных данных.');
            return;
        }

        if (hasError) return;

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка…';

        const formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('message', message);
        formData.append('agree_policy', document.getElementById('agree-policy').checked ? 'yes' : 'no');
        formData.append('page_url', window.location.href);

        fetch('send.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('✨ Заявка отправлена! Я свяжусь с вами в ближайшее время — обычно отвечаю лично в течение дня.');
                form.reset();
            } else {
                alert('Ошибка: ' + (data.message || 'Попробуйте снова или напишите мне в WhatsApp.'));
            }
        })
        .catch(() => {
            alert('Произошла техническая ошибка соединения. Попробуйте снова или напишите мне напрямую в WhatsApp: https://wa.me/79242454243');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Записаться на консультацию';
        });
    });

    // Live input error clearing
    document.querySelectorAll('.input-field').forEach(function (element) {
        element.addEventListener('input', function () {
            this.classList.remove('error-field');
            const key = this.id.replace('form-', '');
            const errorDiv = document.getElementById('error-' + key);
            if (errorDiv) errorDiv.style.display = 'none';
        });
    });
}

// === Smooth scroll for links ===
function initSmoothNav() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#privacy') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            const nav = document.querySelector('.nav');
            if (nav && nav.classList.contains('nav-open')) {
                nav.classList.remove('nav-open');
                const burger = document.getElementById('navBurger');
                if (burger) {
                    burger.setAttribute('aria-expanded', 'false');
                    burger.setAttribute('aria-label', 'Открыть меню');
                }
            }
        });
    });
}

// === Mobile burger nav ===
function initMobileNav() {
    const nav = document.getElementById('nav');
    const burger = document.getElementById('navBurger');
    if (!nav || !burger) return;
    burger.addEventListener('click', function () {
        const open = nav.classList.toggle('nav-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    document.addEventListener('click', function (e) {
        if (!nav.classList.contains('nav-open')) return;
        if (!nav.contains(e.target)) {
            nav.classList.remove('nav-open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Открыть меню');
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
            nav.classList.remove('nav-open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Открыть меню');
        }
    });
}

// === Cookie banner init ===
function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;
    if (!localStorage.getItem('cookiesAccepted')) {
        banner.style.display = 'block';
    }
}

// === Escape closes modals ===
function initModalEscape() {
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.modal').forEach(m => {
            if (m.style.display === 'flex') m.style.display = 'none';
        });
    });
}

// === Init ===
document.addEventListener('DOMContentLoaded', function () {
    checkHashAndOpenModal();
    setDynamicYear();
    initScrollReveal();
    initSmoothNav();
    initMobileNav();
    initCookieBanner();
    initModalEscape();
    initForm();
});

window.addEventListener('hashchange', checkHashAndOpenModal);
