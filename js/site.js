
const nav=document.querySelector('.navbar'); const mb=document.querySelector('.menu-btn'); const mn=document.querySelector('.mobile-nav');
window.addEventListener('scroll',()=>nav?.classList.toggle('scrolled',window.scrollY>20),{passive:true});
mb?.addEventListener('click',()=>{const o=mn.classList.toggle('open');mb.setAttribute('aria-expanded',o?'true':'false')});
mn?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mn.classList.remove('open');mb.setAttribute('aria-expanded','false')}));
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());


// Room photo lightbox: keeps navigation within the room the visitor opened.
(() => {
  const photos = [...document.querySelectorAll('section[id] .space-gallery img, section[id] .gallery-row img')];
  if (!photos.length) return;

  const lightbox = document.createElement('div');
  lightbox.className = 'image-lightbox';
  lightbox.setAttribute('role','dialog');
  lightbox.setAttribute('aria-modal','true');
  lightbox.setAttribute('aria-label','Expanded room photo');
  lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close image">×</button>
    <button class="lightbox-prev" type="button" aria-label="Previous photo">‹</button>
    <figure class="lightbox-figure">
      <img class="lightbox-image" alt="">
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button class="lightbox-next" type="button" aria-label="Next photo">›</button>`;
  document.body.appendChild(lightbox);

  const image = lightbox.querySelector('.lightbox-image');
  const caption = lightbox.querySelector('.lightbox-caption');
  const close = lightbox.querySelector('.lightbox-close');
  const prev = lightbox.querySelector('.lightbox-prev');
  const next = lightbox.querySelector('.lightbox-next');
  let group = [];
  let index = 0;
  let lastTrigger = null;

  function roomGroup(trigger){
    const section = trigger.closest('section[id]');
    return section ? [...section.querySelectorAll('.space-gallery img, .gallery-row img, .gallery-hidden img')] : [trigger];
  }
  function render(){
    const current = group[index];
    image.src = current.currentSrc || current.src;
    image.alt = current.alt || 'Visloft room photo';
    caption.textContent = current.alt || '';
    caption.hidden = !caption.textContent;
    const multiple = group.length > 1;
    prev.hidden = !multiple;
    next.hidden = !multiple;
  }
  function open(trigger){
    lastTrigger = trigger;
    group = roomGroup(trigger);
    index = Math.max(0, group.indexOf(trigger));
    render();
    lightbox.classList.add('open');
    document.body.classList.add('lightbox-open');
    close.focus();
  }
  function shut(){
    lightbox.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    if (lastTrigger) lastTrigger.focus({preventScroll:true});
  }
  function step(delta){
    index = (index + delta + group.length) % group.length;
    render();
  }

  photos.forEach(photo => {
    photo.tabIndex = 0;
    photo.setAttribute('role','button');
    photo.setAttribute('aria-label', `${photo.alt || 'Room photo'} — open larger`);
    photo.addEventListener('click', () => open(photo));
    photo.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(photo); }
    });
  });
  close.addEventListener('click', shut);
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) shut(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') shut();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // Basic horizontal-swipe support on phones.
  let touchX = null;
  lightbox.addEventListener('touchstart', e => { touchX = e.changedTouches[0]?.clientX ?? null; }, {passive:true});
  lightbox.addEventListener('touchend', e => {
    if (touchX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchX;
    const distance = endX - touchX;
    if (Math.abs(distance) > 45 && group.length > 1) step(distance > 0 ? -1 : 1);
    touchX = null;
  }, {passive:true});
})();

// V10: a gallery's full photo set includes photos hidden from the page preview.
document.querySelectorAll('[data-open-gallery]').forEach(btn => {
  btn.addEventListener('click', () => {
    const firstPhoto = btn.closest('section')?.querySelector('.space-gallery img');
    firstPhoto?.click();
  });
});
