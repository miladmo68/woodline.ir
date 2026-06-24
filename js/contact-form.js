/**
 * Contact form — validation & submission (mirrors intershine booking logic)
 */
(function () {
  'use strict';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

  var contactForm = qs('#contactForm');
  var formWrapper = qs('.contact-form-wrapper');

  if (!contactForm || !formWrapper) return;

  contactForm.querySelectorAll('input, textarea').forEach(function (field) {
    if (field.type === 'checkbox') return;
    if (!field.parentElement.querySelector('.field-error')) {
      var errSpan = document.createElement('span');
      errSpan.className = 'field-error';
      errSpan.setAttribute('aria-live', 'polite');
      errSpan.setAttribute('role', 'alert');
      field.parentElement.appendChild(errSpan);
    }
  });

  var submitBtn = contactForm.querySelector('[type="submit"]');
  submitBtn.classList.add('btn-submit');
  var btnText = document.createElement('span');
  btnText.className = 'btn-text';
  btnText.textContent = submitBtn.textContent.trim();
  submitBtn.textContent = '';
  submitBtn.appendChild(btnText);
  var spinner = document.createElement('span');
  spinner.className = 'btn-spinner';
  submitBtn.appendChild(spinner);

  var successOverlay = document.createElement('div');
  successOverlay.className = 'form-success-overlay';
  successOverlay.innerHTML =
    '<div class="success-icon">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' +
      '</svg>' +
    '</div>' +
    '<h3>پیام شما ارسال شد!</h3>' +
    '<p>از تماس شما سپاسگزاریم. درخواست شما بررسی می\u200cشود و تا ۲۴ ساعت آینده با شما تماس خواهیم گرفت.</p>';
  formWrapper.appendChild(successOverlay);

  function fieldError(field, msg) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    var el = field.parentElement.querySelector('.field-error');
    if (el) el.textContent = msg;
  }

  function fieldClear(field) {
    field.classList.remove('is-invalid', 'is-valid');
    var el = field.parentElement.querySelector('.field-error');
    if (el) el.textContent = '';
  }

  function fieldOk(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    var el = field.parentElement.querySelector('.field-error');
    if (el) el.textContent = '';
  }

  function validateField(field) {
    var val = field.value.trim();

    if (field.required && !val) {
      fieldError(field, 'پر کردن این فیلد الزامی است.');
      return false;
    }
    if (field.type === 'email' && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        fieldError(field, 'لطفاً یک ایمیل معتبر وارد کنید.');
        return false;
      }
    }
    if (field.name === 'phone' && val) {
      if (!/^[\d\s\+\-\(\)\.]{7,20}$/.test(val)) {
        fieldError(field, 'لطفاً شماره تماس معتبر وارد کنید.');
        return false;
      }
    }

    if (field.required || val) fieldOk(field);
    return true;
  }

  contactForm.querySelectorAll('input[required], textarea[required]').forEach(function (field) {
    field.addEventListener('blur', function () { validateField(field); });
    field.addEventListener('input', function () {
      if (field.classList.contains('is-invalid')) validateField(field);
    });
  });

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
    var t = submitBtn.querySelector('.btn-text');
    if (t) t.textContent = on ? 'در حال ارسال\u2026' : 'ارسال پیام';
  }

  var formMessage = qs('#formMessage');
  function showError(msg) {
    if (!formMessage) return;
    formMessage.textContent = msg;
    formMessage.className = 'form-message error';
    formMessage.style.display = 'block';
    setTimeout(function () {
      formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }
  function hideError() {
    if (formMessage) formMessage.style.display = 'none';
  }

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideError();

    var allValid = true;
    contactForm.querySelectorAll('input[required], textarea[required]').forEach(function (field) {
      if (!validateField(field)) allValid = false;
    });

    var phoneField = contactForm.querySelector('[name="phone"]');
    var emailField = contactForm.querySelector('[name="email"]');
    var phoneVal = phoneField ? phoneField.value.trim() : '';
    var emailVal = emailField ? emailField.value.trim() : '';

    if (!phoneVal && !emailVal) {
      if (phoneField) fieldError(phoneField, 'لطفاً ایمیل یا شماره تماس وارد کنید.');
      if (emailField) fieldError(emailField, 'لطفاً ایمیل یا شماره تماس وارد کنید.');
      allValid = false;
    }

    if (!allValid) {
      var first = contactForm.querySelector('.is-invalid');
      if (first) first.focus();
      return;
    }

    setLoading(true);

    var fd = new FormData(contactForm);
    var payload = {};
    fd.forEach(function (value, key) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (!Array.isArray(payload[key])) payload[key] = [payload[key]];
        payload[key].push(value);
      } else {
        payload[key] = value;
      }
    });

    var endpoint = contactForm.getAttribute('action') || '/api/booking';

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      });
    })
    .then(function (result) {
      setLoading(false);

      if (result.ok && result.data && result.data.success) {
        contactForm.reset();
        contactForm.style.display = 'none';
        successOverlay.classList.add('visible');
        successOverlay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      if (result.status === 422 && result.data && result.data.errors) {
        var firstField = null;
        Object.keys(result.data.errors).forEach(function (name) {
          var field = contactForm.querySelector('[name="' + name + '"]');
          if (field) {
            fieldError(field, result.data.errors[name]);
            if (!firstField) firstField = field;
          }
        });
        if (firstField) firstField.focus();
        showError(result.data.message || 'لطفاً فیلدهای مشخص‌شده را اصلاح کنید.');
        return;
      }

      showError(
        (result.data && result.data.message) ||
        'خطایی در ارسال پیام رخ داد. لطفاً دوباره تلاش کنید یا مستقیماً با ما تماس بگیرید.'
      );
    })
    .catch(function () {
      setLoading(false);
      showError(
        'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید یا مستقیماً با ما تماس بگیرید.'
      );
    });
  });
})();
