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
 try{
  const ext=file.name.split('.').pop().toLowerCase();
  const id=crypto.randomUUID();
  const path=`${id}.${ext}`;
  status('uploadStatus','Создаём быстрое превью...');
  const thumbnail=await createVideoThumbnail(file);
  const thumbnailPath=`${id}.jpg`;
  status('uploadStatus','Загружаем видео и превью... Не закрывай страницу.');
  const up=await sb.storage.from('portfolio-videos').upload(path,file,{contentType:file.type||'video/mp4',upsert:false,cacheControl:'31536000'});
  if(up.error)throw up.error;
  const thumbUp=await sb.storage.from('portfolio-videos').upload(thumbnailPath,thumbnail,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});
  if(thumbUp.error)throw thumbUp.error;
  const {data:pub}=sb.storage.from('portfolio-videos').getPublicUrl(path);
  const {data:thumbPub}=sb.storage.from('portfolio-videos').getPublicUrl(thumbnailPath);
  const ins=await sb.from('portfolio').insert({title:document.getElementById('title').value.trim()||'Без названия',duration:document.getElementById('duration').value.trim(),category:document.getElementById('category').value,published:true,video_path:path,video_url:pub.publicUrl,thumbnail_path:thumbnailPath,thumbnail_url:thumbPub.publicUrl});
  if(ins.error)throw ins.error;
  status('uploadStatus','Готово! Видео появилось на сайте.');
  document.getElementById('file').value='';document.getElementById('title').value='';document.getElementById('duration').value='';loadItems();
 }catch(e){console.error(e);status('uploadStatus','Ошибка: '+e.message)}finally{btn.disabled=false}
};

async function createVideoThumbnail(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file);const video=document.createElement('video');video.preload='metadata';video.muted=true;video.playsInline=true;
  const cleanup=()=>URL.revokeObjectURL(url);
  video.onloadeddata=()=>{video.currentTime=Math.min(0.1,Math.max(0,(video.duration||1)/10));};
  video.onseeked=()=>{try{const maxW=900,ratio=video.videoWidth/video.videoHeight||16/9,w=Math.min(maxW,video.videoWidth||900),h=Math.round(w/ratio),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,w,h);canvas.toBlob(blob=>{cleanup();if(blob)resolve(blob);else reject(new Error('Не удалось создать превью.'))},'image/jpeg',0.82);}catch(e){cleanup();reject(e)}};
  video.onerror=()=>{cleanup();reject(new Error('Не удалось прочитать видео для создания превью.'))};video.src=url;
 });
}

async function loadItems(){
 const box=document.getElementById('items');box.innerHTML='Загружаем...';
 const {data,error}=await sb.from('portfolio').select('*').order('created_at',{ascending:false});
 if(error){box.textContent=error.message;return;}box.innerHTML='';
 (data||[]).forEach(x=>{const row=document.createElement('div');row.className='item';row.innerHTML=`<div><b>${escapeHtml(x.title)}</b><br><small>${x.category==='short'?'Короткое':'Длинное'} · ${escapeHtml(x.duration||'')}</small></div>`;const b=document.createElement('button');b.className='admin-btn danger';b.textContent='УДАЛИТЬ';b.onclick=()=>removeItem(x);row.append(b);box.append(row)});
 if(!data?.length)box.innerHTML='<div class="status">Видео пока нет.</div>';
}
async function removeItem(x){if(!confirm('Удалить это видео?'))return;const paths=[x.video_path,x.thumbnail_path].filter(Boolean);const a=await sb.storage.from('portfolio-videos').remove(paths);if(a.error)alert(a.error.message);const d=await sb.from('portfolio').delete().eq('id',x.id);if(d.error)alert(d.error.message);loadItems()}

async function loadReviewsAdmin(){
 const box=document.getElementById('review-items');if(!box)return;box.innerHTML='Загружаем...';
 const {data,error}=await sb.from('reviews').select('*').order('created_at',{ascending:false});
 if(error){box.textContent=error.message;return;}box.innerHTML='';
 const names={reels:'Монтаж Reels',long_video:'Длинное видео',commercial:'Рекламный монтаж',motion:'Моушен-дизайн'};
 (data||[]).forEach(x=>{
  const row=document.createElement('div');row.className='item review-admin-item';
  const initial=(x.nickname||'?').trim().charAt(0).toUpperCase();
  const avatarWrap=document.createElement('div');avatarWrap.className='review-admin-avatar';
  if(x.avatar_url){const img=document.createElement('img');img.className='avatar avatar-img';img.src=x.avatar_url;img.alt='Аватар';avatarWrap.append(img)}else{const av=document.createElement('div');av.className='avatar';av.textContent=initial;avatarWrap.append(av)}
  const info=document.createElement('div');info.className='review-admin-info';info.innerHTML=`<b>${escapeHtml(x.nickname)}</b><br><small>${names[x.service_type]||'Проект'} · ${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)} · ${new Date(x.created_at).toLocaleDateString('ru-RU')}</small><p>${escapeHtml(x.review_text)}</p>`;
  const controls=document.createElement('div');controls.className='review-admin-controls';
  const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.className='avatar-file';
  const avatarBtn=document.createElement('button');avatarBtn.className='admin-btn';avatarBtn.textContent=x.avatar_url?'ЗАМЕНИТЬ АВАТАР':'ДОБАВИТЬ АВАТАР';avatarBtn.onclick=()=>file.click();
  file.addEventListener('change',()=>updateReviewAvatar(x,file.files[0]));
  controls.append(avatarBtn,file);
  if(x.avatar_url){const removeAvatar=document.createElement('button');removeAvatar.className='admin-btn danger';removeAvatar.textContent='УБРАТЬ АВАТАР';removeAvatar.onclick=()=>removeReviewAvatar(x);controls.append(removeAvatar)}
  if(!x.approved){const a=document.createElement('button');a.className='admin-btn';a.textContent='ОПУБЛИКОВАТЬ';a.onclick=()=>moderateReview(x,true);controls.append(a)}else{const h=document.createElement('button');h.className='admin-btn';h.textContent='СКРЫТЬ';h.onclick=()=>moderateReview(x,false);controls.append(h)}
  const d=document.createElement('button');d.className='admin-btn danger';d.textContent='УДАЛИТЬ ОТЗЫВ';d.onclick=()=>deleteReview(x);controls.append(d);
  row.append(avatarWrap,info,controls);box.append(row);
 });
 if(!data?.length)box.innerHTML='<div class="status">Отзывов пока нет.</div>';
}

async function updateReviewAvatar(x,file){
 if(!file)return;
 if(file.size>5*1024*1024){alert('Аватар должен быть не больше 5 МБ.');return;}
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
 const path=`${x.id}/${crypto.randomUUID()}.${ext}`;
 const up=await sb.storage.from('review-avatars').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false,cacheControl:'31536000'});
 if(up.error){alert(up.error.message);return;}
 const {data:pub}=sb.storage.from('review-avatars').getPublicUrl(path);
 const upd=await sb.from('reviews').update({avatar_path:path,avatar_url:pub.publicUrl}).eq('id',x.id);
 if(upd.error){await sb.storage.from('review-avatars').remove([path]);alert(upd.error.message);return;}
 if(x.avatar_path)await sb.storage.from('review-avatars').remove([x.avatar_path]);
 loadReviewsAdmin();
}
async function removeReviewAvatar(x){
 if(!confirm('Убрать аватар этого отзыва?'))return;
 if(x.avatar_path)await sb.storage.from('review-avatars').remove([x.avatar_path]);
 const {error}=await sb.from('reviews').update({avatar_path:null,avatar_url:null}).eq('id',x.id);
 if(error)alert(error.message);loadReviewsAdmin();
}
async function moderateReview(x,approved){const {error}=await sb.from('reviews').update({approved}).eq('id',x.id);if(error)alert(error.message);loadReviewsAdmin()}
async function deleteReview(x){if(!confirm('Удалить отзыв?'))return;if(x.avatar_path)await sb.storage.from('review-avatars').remove([x.avatar_path]);const {error}=await sb.from('reviews').delete().eq('id',x.id);if(error)alert(error.message);loadReviewsAdmin()}
function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
init();
