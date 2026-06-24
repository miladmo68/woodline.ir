/**
 * Kitchen Design Wizard — multi-step form connected to /api/booking
 */
(function () {
    'use strict';

    var form = document.getElementById('kitchenWizardForm');
    if (!form) return;

    var TOTAL_STEPS = 4;
    var currentStep = 1;

    var panels = form.querySelectorAll('.wizard-panel');
    var progressFill = document.getElementById('wizardProgressFill');
    var stepLabels = document.querySelectorAll('.wizard-steps-labels li');
    var btnBack = document.getElementById('wizardBack');
    var btnNext = document.getElementById('wizardNext');
    var btnSubmit = document.getElementById('wizardSubmit');
    var wizardShell = form.closest('.wizard-shell');
    var successEl = document.getElementById('wizardSuccess');
    var summaryEl = document.getElementById('wizardSummary');
    var formMessage = document.getElementById('wizardFormMessage');

    var styleInput = document.getElementById('kitchenStyleInput');
    var materialInput = document.getElementById('materialInput');
    var budgetInput = document.getElementById('budgetInput');

    function qs(name) {
        return form.querySelector('[name="' + name + '"]:checked');
    }

    function setStep(step) {
        currentStep = step;
        panels.forEach(function (panel) {
            panel.classList.toggle('active', parseInt(panel.getAttribute('data-step'), 10) === step);
        });
        stepLabels.forEach(function (label) {
            var n = parseInt(label.getAttribute('data-step-label'), 10);
            label.classList.toggle('active', n === step);
            label.classList.toggle('done', n < step);
        });
        if (progressFill) {
            progressFill.style.width = ((step / TOTAL_STEPS) * 100) + '%';
        }
        btnBack.disabled = step === 1;
        btnNext.style.display = step < TOTAL_STEPS ? 'inline-flex' : 'none';
        btnSubmit.style.display = step === TOTAL_STEPS ? 'inline-flex' : 'none';
        if (step === TOTAL_STEPS) buildSummary();
        hideFormMessage();
    }

    function buildSummary() {
        var style = styleInput.value || '—';
        var material = materialInput.value || '—';
        var budget = budgetInput.value || '—';
        summaryEl.innerHTML =
            '<strong>سبک:</strong> ' + style + '<br>' +
            '<strong>متریال:</strong> ' + material + '<br>' +
            '<strong>بودجه:</strong> ' + budget;
    }

    function syncHiddenFields() {
        var s = qs('style_choice');
        var m = qs('material_choice');
        var b = qs('budget_choice');
        if (s) styleInput.value = s.value;
        if (m) materialInput.value = m.value;
        if (b) budgetInput.value = b.value;
    }

    function clearStepError(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '';
    }

    function validateStep(step) {
        syncHiddenFields();
        if (step === 1) {
            if (!qs('style_choice')) {
                document.getElementById('styleError').textContent = 'لطفاً یک سبک انتخاب کنید.';
                return false;
            }
            clearStepError('styleError');
        }
        if (step === 2) {
            if (!qs('material_choice')) {
                document.getElementById('materialError').textContent = 'لطفاً یک متریال انتخاب کنید.';
                return false;
            }
            clearStepError('materialError');
        }
        if (step === 3) {
            if (!qs('budget_choice')) {
                document.getElementById('budgetError').textContent = 'لطفاً محدوده بودجه را انتخاب کنید.';
                return false;
            }
            clearStepError('budgetError');
        }
        if (step === 4) {
            var contact = document.getElementById('wizardContact');
            var phone = document.getElementById('wizardPhone');
            var email = document.getElementById('wizardEmail');
            var valid = true;

            if (!contact.value.trim()) {
                contact.classList.add('is-invalid');
                valid = false;
            } else {
                contact.classList.remove('is-invalid');
            }

            if (!phone.value.trim() && !email.value.trim()) {
                phone.classList.add('is-invalid');
                email.classList.add('is-invalid');
                valid = false;
            } else {
                phone.classList.remove('is-invalid');
                email.classList.remove('is-invalid');
            }

            if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                email.classList.add('is-invalid');
                valid = false;
            }

            return valid;
        }
        return true;
    }

    function hideFormMessage() {
        if (formMessage) formMessage.style.display = 'none';
    }

    function showFormMessage(msg) {
        if (!formMessage) return;
        formMessage.textContent = msg;
        formMessage.style.display = 'block';
    }

    btnNext.addEventListener('click', function () {
        if (!validateStep(currentStep)) return;
        if (currentStep < TOTAL_STEPS) setStep(currentStep + 1);
    });

    btnBack.addEventListener('click', function () {
        if (currentStep > 1) setStep(currentStep - 1);
    });

    form.querySelectorAll('input[type="radio"]').forEach(function (radio) {
        radio.addEventListener('change', syncHiddenFields);
    });

    btnSubmit.addEventListener('click', function (e) {
        e.preventDefault();
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        syncHiddenFields();
        if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
            if (!styleInput.value) setStep(1);
            else if (!materialInput.value) setStep(2);
            else if (!budgetInput.value) setStep(3);
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.classList.add('loading');

        var extraNote = document.getElementById('wizardMessage').value.trim();
        var autoMessage =
            'درخواست طراحی آشپزخانه\n' +
            'سبک: ' + styleInput.value + '\n' +
            'متریال: ' + materialInput.value + '\n' +
            'بودجه: ' + budgetInput.value +
            (extraNote ? '\n\nتوضیحات: ' + extraNote : '');

        var payload = {
            contact: document.getElementById('wizardContact').value.trim(),
            phone: document.getElementById('wizardPhone').value.trim(),
            email: document.getElementById('wizardEmail').value.trim(),
            service: 'طراحی آشپزخانه — ویزارد',
            kitchen_style: styleInput.value,
            material: materialInput.value,
            budget: budgetInput.value,
            message: autoMessage,
            website: form.querySelector('[name="website"]').value
        };

        fetch(form.getAttribute('action') || '/api/booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                return { ok: res.ok, status: res.status, data: data };
            });
        })
        .then(function (result) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('loading');

            if (result.ok && result.data && result.data.success) {
                form.style.display = 'none';
                document.querySelector('.wizard-progress').style.display = 'none';
                document.querySelector('.wizard-actions').style.display = 'none';
                successEl.hidden = false;
                return;
            }

            if (result.status === 422 && result.data && result.data.errors) {
                showFormMessage(result.data.message || 'لطفاً فیلدها را بررسی کنید.');
                return;
            }

            showFormMessage(
                (result.data && result.data.message) ||
                'خطا در ارسال. لطفاً دوباره تلاش کنید یا با ما تماس بگیرید.'
            );
        })
        .catch(function () {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('loading');
            showFormMessage('ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت را بررسی کنید.');
        });
    });

    setStep(1);
})();
