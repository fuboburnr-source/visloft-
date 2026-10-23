const params=new URLSearchParams(location.search);
const space=params.get('space'),professional=params.get('professional');
const spaceField=document.getElementById('space'),proField=document.getElementById('professional'),kind=document.getElementById('inquiry_type');
if(space && [...spaceField.options].some(o=>o.value===space && !o.disabled)){kind.value='Space rental';spaceField.value=space;}
if(professional && [...proField.options].some(o=>o.value===professional)){kind.value='Professional';proField.value=professional;}
const closedSpaces=["Media Room", "Event Lounge + Terrace", "Corporate Meeting Suite + Balcony", "Standalone Rooftop Terrace", "Small Media Room", "Open Yoga Studio", "Wellness Room", "Multi-Level Premium Event Lounge"];
const form=document.getElementById('inquiry-form'),status=document.getElementById('form-status'),submit=form.querySelector('button[type=submit]');
const staticHost=location.protocol==='file:' || location.hostname.endsWith('github.io');
const recipient='Visloft00@gmail.com';
function inquiryEmail(data){
  const labels={first_name:'First name',last_name:'Last name',email:'Email',phone:'Phone',preferred_contact:'Preferred reply',inquiry_type:'Inquiry type',space:'Preferred space',professional:'Professional',date:'Preferred date',guests:'Guests',start_time:'Start time',end_time:'End time',message:'Message'};
  return Object.entries(labels).filter(([key])=>data[key]).map(([key,label])=>label+': '+data[key]).join('\n');
}
if(staticHost){
  submit.textContent='Compose Email Inquiry';
  const explanation=document.createElement('p');explanation.className='fineprint';
  explanation.textContent='Your email app will open with a prepared inquiry. Please press Send in your email app to submit your request.';
  submit.insertAdjacentElement('beforebegin',explanation);
}
form.addEventListener('submit',async e=>{
  e.preventDefault();status.className='form-status';
  const data=Object.fromEntries(new FormData(form).entries());
  if(data.inquiry_type==='Space rental' && closedSpaces.includes(data.space)){
    status.className='form-status error';status.textContent='Jarvis Location space bookings are temporarily paused. Please choose a Distillery District Location venue.';return;
  }
  if(staticHost){
    const subject='Visloft inquiry: '+(data.space||data.professional||data.inquiry_type||'General');
    const body=inquiryEmail(data);
    const mailto='mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    status.className='form-status';
    status.textContent='Opening an email draft. Your request is not sent until you send the email.';
    window.location.href=mailto;
    return;
  }
  status.textContent='Sending…';submit.disabled=true;
  try{
    const r=await fetch('api/contact.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||!out.ok)throw new Error(out.message||'Unable to send');
    status.className='form-status success';
    status.textContent='Thanks — your inquiry has been received. Visloft will follow up after reviewing availability.';
    form.reset();
  }catch(err){
    status.className='form-status error';
    status.textContent='Your inquiry could not be sent. Please email Visloft00@gmail.com or try again.';
  }finally{submit.disabled=false;}
});
