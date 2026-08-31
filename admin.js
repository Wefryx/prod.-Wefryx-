let sb;
const status=(id,msg)=>{const el=document.getElementById(id);if(el)el.textContent=msg};
let currentSession=null;

async function isAdmin(){
  const {data,error}=await sb.from('admin_users').select('user_id').eq('user_id',currentSession.user.id).maybeSingle();
  return !error && !!data;
}

async function init(){
 if(!window.supabase||!window.WEFRYX_SUPABASE_URL||window.WEFRYX_SUPABASE_URL.includes('YOUR-PROJECT')){status('loginStatus','Сначала заполни config.js данными Supabase.');return;}
 sb=window.supabase.createClient(window.WEFRYX_SUPABASE_URL,window.WEFRYX_SUPABASE_ANON_KEY);
 const {data:{session}}=await sb.auth.getSession();
 await handleSession(session);
 sb.auth.onAuthStateChange((_e,session)=>{setTimeout(()=>handleSession(session),0)});
}

async function handleSession(session){
 currentSession=session;
 const login=document.getElementById('login'),manager=document.getElementById('manager');
 if(!session){login.classList.remove('hidden');manager.classList.add('hidden');return;}
 if(!(await isAdmin())){
   await sb.auth.signOut();
   login.classList.remove('hidden');manager.classList.add('hidden');
   status('loginStatus','Этот аккаунт не имеет прав администратора.');
   return;
 }
 login.classList.add('hidden');manager.classList.remove('hidden');
 loadItems();loadReviewsAdmin();
}

document.getElementById('loginBtn').onclick=async()=>{
 if(!sb)return;
 const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error)status('loginStatus','Ошибка входа: '+error.message);
};
document.getElementById('logoutBtn').onclick=()=>sb.auth.signOut();

document.getElementById('uploadBtn').onclick=async()=>{
 const file=document.getElementById('file').files[0]; if(!file)return status('uploadStatus','Выбери видео.');
 const btn=document.getElementById('uploadBtn');btn.disabled=true;status('uploadStatus','Загружаем видео... Не закрывай страницу.');
 try{const ext=file.name.split('.').pop().toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from('portfolio-videos').upload(path,file,{contentType:file.type||'video/mp4',upsert:false});if(up.error)throw up.error;const {data:pub}=sb.storage.from('portfolio-videos').getPublicUrl(path);const ins=await sb.from('portfolio').insert({title:document.getElementById('title').value.trim()||'Без названия',duration:document.getElementById('duration').value.trim(),category:document.getElementById('category').value,published:true,video_path:path,video_url:pub.publicUrl});if(ins.error)throw ins.error;status('uploadStatus','Готово! Видео появилось на сайте.');document.getElementById('file').value='';document.getElementById('title').value='';document.getElementById('duration').value='';loadItems();}catch(e){console.error(e);status('uploadStatus','Ошибка: '+e.message)}finally{btn.disabled=false}
};

async function loadItems(){const box=document.getElementById('items');box.innerHTML='Загружаем...';const {data,error}=await sb.from('portfolio').select('*').order('created_at',{ascending:false});if(error){box.textContent=error.message;return}box.innerHTML='';(data||[]).forEach(x=>{const row=document.createElement('div');row.className='item';row.innerHTML=`<div><b>${escapeHtml(x.title)}</b><br><small>${x.category==='short'?'Короткое':'Длинное'} · ${x.duration||''}</small></div>`;const b=document.createElement('button');b.className='admin-btn danger';b.textContent='УДАЛИТЬ';b.onclick=()=>removeItem(x);row.append(b);box.append(row)})}
async function removeItem(x){if(!confirm('Удалить это видео?'))return;const a=await sb.storage.from('portfolio-videos').remove([x.video_path]);if(a.error)alert(a.error.message);const d=await sb.from('portfolio').delete().eq('id',x.id);if(d.error)alert(d.error.message);loadItems()}
function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

async function loadReviewsAdmin(){
 const box=document.getElementById('review-items'); if(!box)return; box.innerHTML='Загружаем...';
 const {data,error}=await sb.from('reviews').select('*').order('created_at',{ascending:false});
 if(error){box.textContent=error.message;return;} box.innerHTML='';
 const names={reels:'Монтаж Reels',long_video:'Длинное видео',commercial:'Рекламный монтаж',motion:'Моушен-дизайн'};
 (data||[]).forEach(x=>{
  const row=document.createElement('div');row.className='item';
  const info=document.createElement('div');info.innerHTML=`<b>${escapeHtml(x.nickname)}</b><br><small>${names[x.service_type]||'Проект'} · ${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)} · ${new Date(x.created_at).toLocaleDateString('ru-RU')}</small><p style="margin:7px 0 0;color:#aaa;font-size:10px">${escapeHtml(x.review_text)}</p>`;
  const actions=document.createElement('div');
  if(!x.approved){const a=document.createElement('button');a.className='admin-btn';a.textContent='ОПУБЛИКОВАТЬ';a.onclick=()=>moderateReview(x,true);actions.append(a)}else{const h=document.createElement('button');h.className='admin-btn';h.textContent='СКРЫТЬ';h.onclick=()=>moderateReview(x,false);actions.append(h)}
  const d=document.createElement('button');d.className='admin-btn danger';d.textContent='УДАЛИТЬ';d.onclick=()=>deleteReview(x);actions.append(d);row.append(info,actions);box.append(row);
 });
 if(!data?.length)box.innerHTML='<div class="status">Отзывов пока нет.</div>';
}
async function moderateReview(x,approved){const {error}=await sb.from('reviews').update({approved}).eq('id',x.id);if(error)alert(error.message);loadReviewsAdmin()}
async function deleteReview(x){if(!confirm('Удалить отзыв?'))return;const {error}=await sb.from('reviews').delete().eq('id',x.id);if(error)alert(error.message);loadReviewsAdmin()}
init();
