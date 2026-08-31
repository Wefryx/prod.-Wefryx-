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
      const video=document.createElement('video'); video.src=x.video_url; video.muted=true; video.loop=true; video.playsInline=true; video.preload='metadata';
      video.addEventListener('mouseenter',()=>video.play().catch(()=>{}));
      video.addEventListener('mouseleave',()=>{video.pause(); video.currentTime=0});
      const play=document.createElement('span'); play.textContent='▶'; play.addEventListener('click',()=>{if(video.paused) video.play(); else video.pause()});
      thumb.append(video,play);
      if(x.title){const t=document.createElement('div');t.className='video-title';t.textContent=x.title;thumb.append(t)}
      if(x.duration){const d=document.createElement('div');d.className='video-duration';d.textContent=x.duration;thumb.append(d)}
      article.append(thumb); return article;
    };
    if(!shorts.length) shortList.innerHTML='<div class="portfolio-loading">ПОРТФОЛИО ПОКА ПУСТО</div>'; else shorts.forEach(x=>shortList.append(card(x,true)));
    if(!longs.length) longList.innerHTML='<div class="portfolio-loading">ПОРТФОЛИО ПОКА ПУСТО</div>'; else longs.forEach(x=>longList.append(card(x,false)));
  }catch(e){console.error(e);shortList.innerHTML='<div class="portfolio-loading">НЕ УДАЛОСЬ ЗАГРУЗИТЬ ПОРТФОЛИО</div>';longList.innerHTML='';}
}

if(window.supabase && window.WEFRYX_SUPABASE_URL && window.WEFRYX_SUPABASE_ANON_KEY){
  window.sb=window.supabase.createClient(window.WEFRYX_SUPABASE_URL,window.WEFRYX_SUPABASE_ANON_KEY);
  loadPortfolio();
  loadReviews();
}

async function loadReviews(){
 const box=document.querySelector('#reviews-list');
 if(!box||!window.sb)return;
 try{
  const {data,error}=await window.sb.from('reviews').select('*').eq('approved',true).order('created_at',{ascending:false}).limit(12);
  if(error)throw error; if(!data?.length){box.innerHTML='<div class="reviews-empty">ОТЗЫВОВ ПОКА НЕТ</div>';return;}
  const names={reels:'Монтаж Reels',long_video:'Монтаж длинного видео',commercial:'Рекламный монтаж',motion:'Моушен-дизайн'};
  box.innerHTML=''; data.forEach(x=>{const a=document.createElement('article');a.className='review';const initial=(x.nickname||'?').trim().charAt(0).toUpperCase();a.innerHTML=`<div class="review-head"><div class="avatar">${escapeHtml(initial)}</div><div><b>${escapeHtml(x.nickname)}</b><span>${names[x.service_type]||'Проект'}</span></div></div><p>${escapeHtml(x.review_text)}</p><div class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</div>`;box.append(a)});
 }catch(e){console.error(e)}
}
function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
