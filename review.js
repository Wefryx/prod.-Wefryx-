const form=document.getElementById('review-form');
const statusEl=document.getElementById('review-status');
const setStatus=(m,ok=false)=>{statusEl.textContent=m;statusEl.className='status '+(ok?'success':'')};
let sb=null;
if(window.supabase && window.WEFRYX_SUPABASE_URL && window.WEFRYX_SUPABASE_ANON_KEY && !window.WEFRYX_SUPABASE_URL.includes('YOUR-PROJECT')){sb=window.supabase.createClient(window.WEFRYX_SUPABASE_URL,window.WEFRYX_SUPABASE_ANON_KEY);}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!sb)return setStatus('Сайт ещё не подключён к Supabase. Заполни config.js.');
 const nickname=document.getElementById('nickname').value.trim();
 const service_type=document.getElementById('service_type').value;
 const rating=document.querySelector('input[name="rating"]:checked')?.value;
 const review_text=document.getElementById('review_text').value.trim();
 if(!nickname||!service_type||!rating||review_text.length<5)return setStatus('Заполни все поля и выбери оценку от 1 до 5.');
 const btn=form.querySelector('button');btn.disabled=true;setStatus('Отправляем отзыв...');
 try{const {error}=await sb.from('reviews').insert({nickname,service_type,rating:Number(rating),review_text,approved:false});if(error)throw error;form.reset();setStatus('Спасибо! Отзыв отправлен на проверку.',true);}catch(err){console.error(err);setStatus('Не удалось отправить отзыв: '+err.message)}finally{btn.disabled=false}
});
