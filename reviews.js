let sb=null;
if(window.supabase && window.WEFRYX_SUPABASE_URL && window.WEFRYX_SUPABASE_ANON_KEY && !window.WEFRYX_SUPABASE_URL.includes('YOUR-PROJECT')){sb=window.supabase.createClient(window.WEFRYX_SUPABASE_URL,window.WEFRYX_SUPABASE_ANON_KEY);}
const box=document.getElementById('all-reviews');
const names={reels:'Монтаж Reels',long_video:'Монтаж длинного видео',commercial:'Рекламный монтаж',motion:'Моушен-дизайн'};
async function loadAllReviews(){
 if(!sb)return;
 try{
  const {data,error}=await sb.from('reviews').select('*').eq('approved',true).order('created_at',{ascending:false});
  if(error)throw error;
  if(!data?.length){box.innerHTML='<div class="reviews-empty">ОТЗЫВОВ ПОКА НЕТ</div>';return;}
  box.innerHTML='';
  data.forEach(x=>{
    const a=document.createElement('article');a.className='review';
    const initial=(x.nickname||'?').trim().charAt(0).toUpperCase();
    const avatar=x.avatar_url?`<img class="avatar avatar-img" src="${escapeHtml(x.avatar_url)}" alt="Аватар ${escapeHtml(x.nickname)}" loading="lazy" decoding="async">`:`<div class="avatar">${escapeHtml(initial)}</div>`;
    a.innerHTML=`<div class="review-head">${avatar}<div><b>${escapeHtml(x.nickname)}</b><span>${names[x.service_type]||'Проект'}</span></div></div><p>${escapeHtml(x.review_text)}</p><div class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</div>`;
    box.append(a);
  });
 }catch(e){console.error(e);box.innerHTML='<div class="reviews-empty">НЕ УДАЛОСЬ ЗАГРУЗИТЬ ОТЗЫВЫ</div>';}
}
function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
loadAllReviews();
