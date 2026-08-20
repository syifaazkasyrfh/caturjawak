const menuBtn=document.querySelector(".menu-btn");
const nav=document.querySelector(".nav-links");

menuBtn?.addEventListener("click",()=>{
  nav.classList.toggle("open");
  if(nav.classList.contains("open")){
    nav.style.display="flex";
    nav.style.position="absolute";
    nav.style.top="82px";
    nav.style.left="0";
    nav.style.right="0";
    nav.style.padding="22px 8vw";
    nav.style.background="#f5f4ec";
    nav.style.flexDirection="column";
    nav.style.gap="18px";
  }else nav.style.display="";
});

document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener("click",()=>{
    if(nav?.classList.contains("open")){
      nav.classList.remove("open");
      nav.style.display="";
    }
  });
});

const revealItems=document.querySelectorAll(".style-card,.features > div,.quote-card");
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.style.opacity="1";
      entry.target.style.transform="translateY(0)";
      observer.unobserve(entry.target);
    }
  });
},{threshold:.12});

revealItems.forEach(item=>{
  item.style.opacity="0";
  item.style.transform="translateY(20px)";
  item.style.transition="opacity .6s ease, transform .6s ease";
  observer.observe(item);
});

const navbar=document.querySelector(".navbar");
window.addEventListener("scroll",()=>{
  navbar.style.boxShadow=window.scrollY>30?"0 8px 30px rgba(0,0,0,.06)":"none";
});

console.log("KStudio Hijab berhasil dimuat ✨");
