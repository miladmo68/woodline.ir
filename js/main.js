(function ($) {
    "use strict";

    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();

    new WOW().init();

    // Floating capsule navbar + scroll progress
    var navWrap = document.getElementById('navFloatWrap');
    var topbar = document.querySelector('.topbar');
    var navCollapse = document.getElementById('navbarCollapse');
    var CAPSULE_THRESHOLD = 70;
    var DOCK_TOP = 10;
    var DESKTOP_BP = 992;

    function isMobileNav() {
        return window.innerWidth < DESKTOP_BP;
    }

    function syncNavOffset() {
        var h = topbar ? topbar.offsetHeight : 0;
        document.documentElement.style.setProperty('--nav-top-offset', h + 'px');
    }

    function updateNavOnScroll() {
        var scrollTop = window.scrollY || window.pageYOffset;
        var passedThreshold = scrollTop > CAPSULE_THRESHOLD;

        if (navWrap) {
            navWrap.classList.toggle('is-scrolled', scrollTop > 30);
            if (isMobileNav()) {
                navWrap.classList.toggle('is-capsule', passedThreshold);
            } else {
                navWrap.classList.remove('is-capsule');
            }
        }

        if (scrollTop > 30) {
            if (isMobileNav()) {
                if (passedThreshold) {
                    document.documentElement.style.setProperty('--nav-top-offset', DOCK_TOP + 'px');
                } else {
                    syncNavOffset();
                }
            } else {
                document.documentElement.style.setProperty('--nav-top-offset', '0px');
            }
        } else {
            syncNavOffset();
        }

        var docH = $(document).height() - $(window).height();
        var pct = docH > 0 ? Math.min(100, (scrollTop / docH) * 100) : 0;
        document.documentElement.style.setProperty('--scroll-pct', pct + '%');
    }

    if (navCollapse && navWrap) {
        navCollapse.addEventListener('show.bs.collapse', function () {
            navWrap.classList.add('menu-open');
        });
        navCollapse.addEventListener('hide.bs.collapse', function () {
            navWrap.classList.remove('menu-open');
        });
    }

    syncNavOffset();
    updateNavOnScroll();
    $(window).on('resize orientationchange', function () {
        syncNavOffset();
        updateNavOnScroll();
    });
    $(window).on('scroll', updateNavOnScroll);

    // Back to top
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
    });

    // Smooth scroll — account for fixed nav + topbar / capsule dock
    function getScrollOffset() {
        var navH = navWrap ? navWrap.offsetHeight : 70;
        var scrollTop = window.scrollY || window.pageYOffset;
        var topbarH = topbar ? topbar.offsetHeight : 0;

        if (scrollTop > 30) {
            if (isMobileNav() && scrollTop <= CAPSULE_THRESHOLD) {
                return navH + topbarH + 12;
            }
            if (isMobileNav()) {
                return navH + DOCK_TOP + 8;
            }
            return navH + 8;
        }

        if (!isMobileNav()) {
            return navH + topbarH;
        }

        return navH + topbarH + 12;
    }

    function closeMobileNav() {
        if (!navCollapse || !isMobileNav()) return;
        var collapse = bootstrap.Collapse.getInstance(navCollapse);
        if (collapse) {
            collapse.hide();
        } else if (navCollapse.classList.contains('show')) {
            navCollapse.classList.remove('show');
            navWrap.classList.remove('menu-open');
        }
    }

    $('a[href^="#"]').on('click', function (e) {
        var href = this.getAttribute('href');
        if (!href || href === '#') return;
        var target = $(href);
        if (target.length) {
            e.preventDefault();
            $('html, body').animate({
                scrollTop: target.offset().top - getScrollOffset()
            }, 800, 'easeInOutExpo');

            if ($(this).hasClass('nav-link')) {
                $('.navbar-nav .nav-link').removeClass('active');
                $(this).addClass('active');
            }

            closeMobileNav();
        }
    });

    // Active nav on scroll
    $(window).scroll(function () {
        var scrollPos = $(document).scrollTop() + getScrollOffset() + 40;
        var current = '';
        $('section[id], footer[id]').each(function () {
            if ($(this).offset().top <= scrollPos) {
                current = this.id;
            }
        });
        if (current) {
            $('.navbar-nav .nav-link').removeClass('active');
            $('.navbar-nav a[href="#' + current + '"]').addClass('active');
        }
    });

    // Counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });

    // Header carousel
    var heroCarousel = $(".header-carousel");
    heroCarousel.owlCarousel({
        autoplay: true,
        autoplayTimeout: 6000,
        smartSpeed: 1500,
        loop: true,
        nav: false,
        dots: true,
        items: 1,
        dotsData: true,
        rtl: true,
        autoHeight: false
    });

    function refreshHeroCarousel() {
        heroCarousel.trigger('refresh.owl.carousel');
    }
    setTimeout(refreshHeroCarousel, 150);
    $(window).on('load resize orientationchange', function () {
        setTimeout(refreshHeroCarousel, 50);
    });

    // Scroll reveal
    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal').forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        document.querySelectorAll('.reveal').forEach(function (el) {
            el.classList.add('revealed');
        });
    }

    // Portfolio lightbox
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = lightbox ? lightbox.querySelector('img') : null;

    document.querySelectorAll('.portfolio-item').forEach(function (item) {
        item.addEventListener('click', function () {
            var src = this.getAttribute('data-src');
            var imgEl = this.querySelector('img');
            var altText = imgEl ? imgEl.getAttribute('alt') : '';
            if (lightbox && lightboxImg && src) {
                lightboxImg.src = src;
                if (altText) lightboxImg.alt = altText;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    function closeLightbox() {
        if (lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (lightbox) {
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) closeLightbox();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
    });

    // Close mobile nav on link click
    $('.navbar-nav a, .nav-cta').on('click', function () {
        if ($('.navbar-collapse').hasClass('show')) {
            $('.navbar-toggler').click();
        }
    });

})(jQuery);
