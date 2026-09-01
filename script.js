const burger=document.querySelector('#burger'),nav=document.querySelector('#nav');
burger?.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
document.querySelectorAll('.faq-item').forEach(item=>item.addEventListener('click',()=>{
 const answer=item.nextElementSibling, open=answer.classList.toggle('open');
 item.querySelector('b').textContent=open?'−':'+';
}));

async function loadPortfolio(){
  const shortList=document.querySelector('#shorts-list');
  const longList=document.querySelector('#longs-list');
  if(!shortList||!longList||!window.supabase) return;
  try{
    const {data,error}=await window.sb.from('portfolio').select('*').eq('published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error) throw error;
    shortList.innerHTML=''; longList.innerHTML='';
    const shorts=(data||[]).filter(x=>x.category==='short');
    const longs=(data||[]).filter(x=>x.category==='long');

    const card=(x,vertical)=>{
      const article=document.createElement('article'); article.className='video-card '+(vertical?'vertical':'horizontal');
      const thumb=document.createElement('div'); thumb.className='thumb long';

      // Быстрое превью: если thumbnail_url есть, MP4 вообще не загружается на карточке.
      if(x.thumbnail_url){
        const img=document.createElement('img');
        img.className='video-poster';
        img.src=x.thumbnail_url;
        img.alt=x.title||'Видео из портфолио';
        img.loading='lazy';
        img.decoding='async';
        thumb.append(img);
      } else {
        // Старые ролики без превью остаются рабочими.
        const video=document.createElement('video');
        video.src=x.video_url; video.muted=true; video.loop=true; video.playsInline=true; video.preload='metadata';
        video.addEventListener('mouseenter',()=>video.play().catch(()=>{}));
        video.addEventListener('mouseleave',()=>{video.pause(); video.currentTime=0});
        thumb.append(video);
      }

      const play=document.createElement('span'); play.className='video-play'; play.textContent='▶'; play.setAttribute('aria-label','Открыть видео');
      thumb.append(play);
      if(x.title){const t=document.createElement('div');t.className='video-title';t.textContent=x.title;thumb.append(t)}
      if(x.duration){const d=document.createElement('div');d.className='video-duration';d.textContent=x.duration;thumb.append(d)}
      article.addEventListener('click',()=>openVideoModal(x));
      article.setAttribute('role','button'); article.setAttribute('tabindex','0');
      article.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openVideoModal(x)}});
      thumb.querySelector('.video-play').addEventListener('click',(e)=>{e.stopPropagation();openVideoModal(x)});
      article.append(thumb); return article;
    };
    if(!shorts.length) shortList.innerHTML='<div class="portfolio-loading">ПОРТФОЛИО ПОКА ПУСТО</div>'; else shorts.forEach(x=>shortList.append(card(x,true)));
    if(!longs.length) longList.innerHTML='<div class="portfolio-loading">ПОРТФОЛИО ПОКА ПУСТО</div>'; else longs.forEach(x=>longList.append(card(x,false)));
  }catch(e){console.error(e);shortList.innerHTML='<div class="portfolio-loading">НЕ УДАЛОСЬ ЗАГРУЗИТЬ ПОРТФОЛИО</div>';longList.innerHTML='';}
}

function ensureVideoModal(){
  if(document.getElementById('video-modal')) return;
  const modal=document.createElement('div');
  modal.id='video-modal';
  modal.className='video-modal';
  modal.innerHTML=`
    <div class="video-modal-backdrop" data-close-video></div>
    <div class="video-modal-dialog" role="dialog" aria-modal="true" aria-label="Просмотр видео">
      <button class="video-modal-close" type="button" aria-label="Закрыть" data-close-video>×</button>
      <video class="video-modal-player" controls playsinline preload="metadata"></video>
      <div class="video-modal-info">
        <div class="video-modal-title"></div>
        <div class="video-modal-meta"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>closeVideoModal();
  modal.querySelectorAll('[data-close-video]').forEach(el=>el.addEventListener('click',close));
}

function openVideoModal(x){
  ensureVideoModal();
  const modal=document.getElementById('video-modal');
  const player=modal.querySelector('.video-modal-player');
  const title=modal.querySelector('.video-modal-title');
  const meta=modal.querySelector('.video-modal-meta');
  title.textContent=x.title||'Видео';
  meta.textContent=`${x.category==='short'?'Монтаж Reels / короткое видео':'Монтаж длинного видео'}${x.duration?' · '+x.duration:''}`;
  player.src=x.video_url;
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  player.currentTime=0;
  player.play().catch(()=>{});
}

function closeVideoModal(){
  const modal=document.getElementById('video-modal');
  if(!modal) return;
  const player=modal.querySelector('.video-modal-player');
  player.pause();
  player.removeAttribute('src');
  player.load();
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

document.addEventListener('keydown',(e)=>{if(e.key==='Escape') closeVideoModal()});

if(window.supabase && window.WEFRYX_SUPABASE_URL && window.WEFRYX_SUPABASE_ANON_KEY){
  window.sb=window.supabase.createClient(window.WEFRYX_SUPABASE_URL,window.WEFRYX_SUPABASE_ANON_KEY);
  loadPortfolio();
  loadReviews();
}

async function loadReviews(){
 const box=document.querySelector('#reviews-list');
 if(!box||!window.sb)return;
 try{
  const {data,error}=await window.sb.from('reviews').select('*').eq('approved',true).order('created_at',{ascending:false}).limit(3);
  if(error)throw error;
  if(!data?.length){box.innerHTML='<div class="reviews-empty">ОТЗЫВОВ ПОКА НЕТ</div>';return;}
  const names={reels:'Монтаж Reels',long_video:'Монтаж длинного видео',commercial:'Рекламный монтаж',motion:'Моушен-дизайн'};
  box.innerHTML='';
  data.forEach(x=>{
    const a=document.createElement('article');
    a.className='review';
    const initial=(x.nickname||'?').trim().charAt(0).toUpperCase();
    const avatar=x.avatar_url
      ? `<img class="avatar avatar-img" src="${escapeHtml(x.avatar_url)}" alt="Аватар ${escapeHtml(x.nickname)}" loading="lazy" decoding="async">`
      : `<div class="avatar">${escapeHtml(initial)}</div>`;
    a.innerHTML=`<div class="review-head">${avatar}<div><b>${escapeHtml(x.nickname)}</b><span>${names[x.service_type]||'Проект'}</span></div></div><p>${escapeHtml(x.review_text)}</p><div class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</div>`;
    box.append(a);
  });
 }catch(e){console.error(e);box.innerHTML='<div class="reviews-empty">НЕ УДАЛОСЬ ЗАГРУЗИТЬ ОТЗЫВЫ</div>'}
}

function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
