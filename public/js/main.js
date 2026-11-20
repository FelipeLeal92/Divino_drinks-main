document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/content';
    let allContent = {}; // Store all fetched content

    // --- Lightbox State ---
    let currentAlbum = [];
    let currentIndex = 0;

    // --- DOM Elements ---
    const lightbox = document.querySelector('.lightbox');
    const lightboxImage = document.querySelector('.lightbox-image');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxPrev = document.querySelector('.lightbox-prev');
    const lightboxNext = document.querySelector('.lightbox-next');

    const escapeHtml = value => ContentUtils.escapeHtml(value);
    function setSafeHtml(element, html) {
        element.innerHTML = ContentUtils.richText(html);
    }

    // Função para buscar os dados da API
    async function fetchContent() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allContent = await response.json();
            return allContent;
        } catch (error) {
            console.error('Falha ao buscar conteúdo:', error);
            return null;
        }
    }

    // --- Lightbox Functions ---
    function showImage(index) {
        if (index >= 0 && index < currentAlbum.length) {
            lightboxImage.src = ContentUtils.imageUrl(currentAlbum[index]);
            lightboxImage.alt = `Foto ${index + 1} de ${currentAlbum.length}`;
            currentIndex = index;
        }
    }

    function openLightbox(album, index) {
        if (!album.length) return;
        currentAlbum = album;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        lightbox.previousFocus = document.activeElement;
        lightboxClose.focus();
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        showImage(index);
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        lightbox.previousFocus?.focus();
        document.body.style.overflow = '';
        currentAlbum = [];
        currentIndex = 0;
    }

    function showNextImage() {
        showImage((currentIndex + 1) % currentAlbum.length);
    }

    function showPrevImage() {
        showImage((currentIndex - 1 + currentAlbum.length) % currentAlbum.length);
    }

    // --- Population Functions ---
    function populateHero(hero) {
        if (!hero) return;
        // Título e subtítulo podem ter <br> - usamos innerHTML com escape
        document.getElementById('hero-title').innerHTML = escapeHtml(hero.title || '').replace(/&lt;br\s*\/?&gt;|\n/gi, '<br>');
        document.getElementById('hero-subtitle').innerHTML = escapeHtml(hero.subtitle || '').replace(/\n/g, '<br>');

        const heroSection = document.getElementById('home');
        if (hero.background_image) {
            // URL de imagem - validar se é URL segura
            heroSection.style.backgroundImage = `url("${ContentUtils.imageUrl(hero.background_image)}")`;
        }

        const phone = ContentUtils.whatsapp(hero.whatsapp_phone);
        document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
            const query = new URL(link.href).search;
            if (phone) link.href = 'https://wa.me/' + phone + query;
        });
        if (/^https:\/\//.test(hero.instagram_url || '')) {
            document.querySelectorAll('a[aria-label="Instagram da Divino Drinks"]').forEach(link => { link.href = hero.instagram_url; });
        }
        const badgesContainer = document.getElementById('hero-badges');
        badgesContainer.innerHTML = '';
        if (hero.badges) {
            hero.badges.forEach(badge => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-${escapeHtml(badge.icon)}"></i> <span>${escapeHtml(badge.text)}</span>`;
                badgesContainer.appendChild(li);
            });
        }
    }

    function populateAbout(about) {
        if (!about) return;
        // Descrição pode ter HTML simples (negrito, etc) - usar setSafeHtml
        const descEl = document.getElementById('about-description');
        if (descEl) {
            const paragraphs = String(about.description || '').replace(/\\n/g, '\n').split(/\n\s*\n/);
            setSafeHtml(descEl, paragraphs[0]);
            if (paragraphs.length > 1) {
                const details = document.createElement('details');
                const summary = document.createElement('summary');
                summary.textContent = 'Conheça mais sobre a Divino';
                const body = document.createElement('div');
                setSafeHtml(body, paragraphs.slice(1).join('\n\n'));
                details.append(summary, body);
                descEl.appendChild(details);
            }
        }

        const cardsContainer = document.getElementById('about-cards');
        cardsContainer.innerHTML = '';
        if (about.cards) {
            about.cards.forEach(card => {
                const div = document.createElement('div');
                div.className = 'about-card';
                div.innerHTML = `
                    <h3>${escapeHtml(card.title)}</h3>
                    <p>${escapeHtml(card.text)}</p>
                `;
                cardsContainer.appendChild(div);
            });
        }
    }

    function populateServices(services) {
        if (!services) return;
        const cardsContainer = document.getElementById('services-cards');
        cardsContainer.innerHTML = '';
        if (services.cards) {
            services.cards.forEach(card => {
                const article = document.createElement('article');
                article.className = 'card';
                // Escape all user content, allow <br> for newlines
                const paragraphs = String(card.text || '').replace(/\\n/g, '\n').split(/\n\s*\n/);
                const safeText = ContentUtils.richText(paragraphs[0]);
                const details = paragraphs.length > 1 ? `<details><summary>Sobre esta experiência</summary><div>${ContentUtils.richText(paragraphs.slice(1).join('\n\n'))}</div></details>` : '';
                article.innerHTML = `
                    <div class="card-image">
                        <img src="${escapeHtml(ContentUtils.imageUrl(card.image))}" alt="${escapeHtml(card.title)}" loading="lazy" decoding="async" />
                    </div>
                    <div class="service-copy">
                        <h3>${escapeHtml(card.title)}</h3>
                        <p>${safeText}</p>
                        ${details}
                    </div>
                `;
                cardsContainer.appendChild(article);
            });
        }
    }

    function populateTestimonials(testimonials) {
        if (!testimonials || !testimonials.testimonials) return;
        const track = document.getElementById('testimonials-track');
        track.innerHTML = '';

        testimonials.testimonials.forEach(testimonial_data => {
            const figure = document.createElement('figure');
            figure.className = 'testimonial';
            figure.innerHTML = `
                <div class="testimonial-image">
                    <img src="${escapeHtml(ContentUtils.imageUrl(testimonial_data.image))}" alt="Foto de ${escapeHtml(testimonial_data.author)}">
                </div>
                <blockquote>
                    <p>"${escapeHtml(testimonial_data.quote)}"</p>
                </blockquote>
                <figcaption>— ${escapeHtml(testimonial_data.author)}</figcaption>
            `;
            track.appendChild(figure);
        });
    }

    function populateGallery(gallery) {
        if (!gallery || !gallery.albums) return;
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '';
        gallery.albums.forEach((album) => {
            const a = document.createElement('a');
            a.href = '#'; // Prevent navigation
            a.className = 'gallery-item';
            a.innerHTML = `
                <div class="gallery-title">${escapeHtml(album.name)}</div>
                <img src="${escapeHtml(ContentUtils.imageUrl(album.thumbnail))}" alt="${escapeHtml(album.name)}">
            `;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (album.photos && album.photos.length > 0) {
                    openLightbox(album.photos, 0);
                }
            });
            grid.appendChild(a);
        });
    }

    function populateFooter(footer) {
        if (!footer) return;

        const descriptionEl = document.getElementById('footer-description');
        if (descriptionEl) {
            descriptionEl.innerText = footer.description || '';
        }

        const linksContainer = document.getElementById('footer-links');
        if (linksContainer) {
            linksContainer.innerHTML = `
                <li><a href="mailto:${escapeHtml(footer.contact)}">${escapeHtml(footer.contact)}</a></li>
                <li><a href="tel:${escapeHtml(String(footer.phone || '').replace(/[^+0-9]/g, ''))}">${escapeHtml(footer.phone)}</a></li>
                <li>Salvador, BA</li>
            `;
        }
    }

    // --- Main Function ---
    async function loadAndPopulateContent() {
        const content = await fetchContent();
        if (content) {
            populateHero(content.hero);
            populateAbout(content.about);
            populateServices(content.services);
            populateTestimonials(content.testimonials);
            populateGallery(content.gallery);
            populateFooter(content.footer);
        }
        const yearSpan = document.getElementById('year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }

    // --- Event Listeners ---
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', showPrevImage);
    lightboxNext.addEventListener('click', showNextImage);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) { // Close if clicking on the background
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('open')) {
            if (e.key === 'Tab') {
                const buttons = [...lightbox.querySelectorAll('button')];
                if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); }
                else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
            } else if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            } else if (e.key === 'ArrowLeft') {
                showPrevImage();
            }
        }
    });

    // Menu mobile
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        toggle.classList.toggle('open');
        const isOpen = nav.classList.contains('open');
        toggle.setAttribute('aria-expanded', isOpen);
        // Prevent body scrolling when menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close menu when a link is clicked
      nav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          nav.classList.remove('open');
          toggle.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }

    // Carousel simples
    (function carousel(){
      const track = document.querySelector('.carousel-track');
      const prev = document.querySelector('.carousel .prev');
      const next = document.querySelector('.carousel .next');
      if (!track) return;
      let index = 0;

      function update(direction){
        const slides = Array.from(track.children);
        if (slides.length === 0) return;
        index = (index + direction + slides.length) % slides.length;
        track.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: 'smooth' });
      }
      prev.addEventListener('click', () => update(-1));
      next.addEventListener('click', () => update(1));
      // A leitura dos depoimentos permanece sob controle do visitante.
    })();

    // Formulário: máscara simples de telefone e validações
    const tel = document.getElementById('telefone');
    if (tel) {
      tel.addEventListener('input', () => {
        let v = tel.value.replace(/\D/g,'').slice(0,11);
        const split = v.length > 10 ? 7 : 6;
        if (v.length > 6) tel.value = `(${v.slice(0,2)}) ${v.slice(2,split)}-${v.slice(split)}`;
        else if (v.length > 2) tel.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
        else tel.value = v;
      });
    }

    // Data mínima = hoje
    const dataEvento = document.getElementById('dataEvento');
    if (dataEvento) {
      const today = new Date(); 
      today.setHours(0,0,0,0);
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      dataEvento.min = iso;
    }

    // Envio do formulário (para backend Node)
    const form = document.getElementById('lead-form');
    const statusEl = document.querySelector('.form-status');
    const dateUnknown = document.getElementById('data-indefinida');
    const guestsUnknown = document.getElementById('convidados-indefinidos');
    function syncPlanningFields() {
      dataEvento.disabled = dateUnknown.checked;
      dataEvento.required = !dateUnknown.checked;
      const guests = document.getElementById('convidados');
      guests.disabled = guestsUnknown.checked;
      guests.required = !guestsUnknown.checked;
    }
    dateUnknown?.addEventListener('change', syncPlanningFields);
    guestsUnknown?.addEventListener('change', syncPlanningFields);
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const submit = form.querySelector('button[type="submit"]');
        if (submit.disabled) return;
        statusEl.textContent = 'Enviando...';

        const payload = {
          nome: form.nome.value.trim(),
          email: form.email.value.trim(),
          telefone: form.telefone.value.trim(),
          tipoEvento: form.tipoEvento.value,
          dataEvento: dateUnknown.checked ? '' : form.dataEvento.value,
          convidados: guestsUnknown.checked ? null : Number(form.convidados.value),
          mensagem: form.mensagem.value.trim()
        };

        // Validações simples
        if (
          !payload.nome ||
          !payload.email ||
          !payload.telefone ||
          !payload.tipoEvento ||
          (!dateUnknown.checked && !payload.dataEvento) ||
          (!guestsUnknown.checked && !payload.convidados)
        ) {
          statusEl.dataset.state = 'error';
          statusEl.textContent = 'Por favor, preencha todos os campos obrigatórios.';
          return;
        }

        submit.disabled = true;
        try {
          const res = await fetch('/api/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json().catch(() => ({}));


          if (!res.ok) {
            throw new Error(data.error || 'Falha no envio');
          }

          statusEl.dataset.state = 'success';
          statusEl.textContent = 'Recebemos seu pedido! Em breve entraremos em contato.';
          form.reset();
          syncPlanningFields();
        } catch (err) {
          console.error('Erro no envio:', err);
          statusEl.dataset.state = 'error';
          statusEl.textContent = err.message || 'Não foi possível enviar agora. Tente novamente em instantes.';
        } finally {
          submit.disabled = false;
        }
      });
    }

    /*==================== SHOW SCROLL UP ====================*/ 
    function scrollUp(){
        const scrollUp = document.getElementById('scroll-up');
        if (scrollUp) {
          // When the scroll is higher than 560 viewport height, add the show-scroll class
          if(window.scrollY >= 560) {
            scrollUp.classList.add('show-scroll');
          } else {
            scrollUp.classList.remove('show-scroll');
          }
        }
    }
    window.addEventListener('scroll', scrollUp);

    /*==================== WHATSAPP BUTTON ====================*/
    function whatsAppButton(){
        const whatsAppButton = document.getElementById('whatsapp-button');
        if (whatsAppButton) {
            // When the scroll is higher than 560 viewport height, add the show-scroll class
            if(window.scrollY >= 560) {
                whatsAppButton.classList.add('show-whatsapp');
            } else {
                whatsAppButton.classList.remove('show-whatsapp');
            }
        }
    }
    window.addEventListener('scroll', whatsAppButton, { passive: true });
    whatsAppButton();
    scrollUp();
    if ('IntersectionObserver' in window) {
      const contact = document.getElementById('contato');
      const whatsapp = document.getElementById('whatsapp-button');
      new IntersectionObserver(entries => {
        whatsapp?.classList.toggle('contact-visible', entries[0].isIntersecting);
      }).observe(contact);
    }

    /*==================== SCROLL SECTIONS ACTIVE LINK ====================*/
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav a');

    const onScroll = () => {
      const scrollPosition = window.scrollY + 150;

      sections.forEach(section => {
        if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
          const currentId = section.getAttribute('id');

          navLinks.forEach(link => {
            link.classList.remove('active-link');
            if (link.getAttribute('href') === `#${currentId}`) {
              link.classList.add('active-link');
            }
          });
        }
      });
    };

    window.addEventListener('scroll', onScroll);

    /*==================== SMOOTH SCROLLING ====================*/
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const id = this.getAttribute('href').slice(1);
            const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
            if (!id || id === 'topo') {
                nav?.classList.remove('open');
                toggle?.classList.remove('open');
                toggle?.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                window.scrollTo({ top: 0, behavior });
                return;
            }
            const target = id ? document.getElementById(id) : document.getElementById('topo');
            if (target) {
                target.scrollIntoView({
                    behavior,
                    block: 'start'
                });
            }
        });
    });

    // --- Initial Load ---
    loadAndPopulateContent();
});
