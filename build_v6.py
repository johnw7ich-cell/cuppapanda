#!/usr/bin/env python3
"""Transform Cuppa Panda v3 (single 2MB file, embedded images) into v4:
- photos extracted to images/*.jpg (deduped), lazy-loaded
- meta description / OG tags / panda favicon
- working cart drawer (localStorage, currency-aware, email checkout)
- newsletter signup with validation + PANDA15 code
- footer socials + email linked
Original v3 kept untouched in ~/workspace/user/files/.
"""
import base64, hashlib, io, pathlib, re, sys
from PIL import Image

ROOT = pathlib.Path.home() / "workspace/cuppapanda-site-v6"
SRC = pathlib.Path.home() / "workspace/cuppapanda-handover/CuppaPanda-Handover/02-Website-and-Catalog/Homepage-v5-latest.html"
html = SRC.read_text(errors="ignore")
orig_len = len(html)

# --- 1. extract images, dedupe by content hash ---
IMGDIR = ROOT / "images"
IMGDIR.mkdir(exist_ok=True)
seen, counter = {}, [0]

def repl(m):
    b64 = m.group(1)
    raw = base64.b64decode(b64)
    h = hashlib.sha256(raw).hexdigest()
    if h not in seen:
        counter[0] += 1
        name = f"img-{counter[0]:02d}.jpg"
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((700, 700))
        im.save(IMGDIR / name, "JPEG", quality=80, optimize=True)
        seen[h] = name
    return f"images/{seen[h]}"

html = re.sub(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)", repl, html)
n_imgs = counter[0]
assert "data:image" not in html, "embedded image left behind"

# lazy-load product images (hero stays eager)
html = html.replace('<div class="thumb" onclick="flip(this)"><img src="',
                    '<div class="thumb" onclick="flip(this)"><img loading="lazy" decoding="async" src="')
html = html.replace('<div class="vis" onclick="flip(this)"><img src="',
                    '<div class="vis" onclick="flip(this)"><img loading="lazy" decoding="async" src="')

# --- 2. head: meta description, OG, favicon ---
head_extra = (
    '<meta name="description" content="Cuppa Panda — cute stationery, bag charms, squishies and blind boxes, hand-picked by a 14-year-old. Shipping to the UK, Ireland & Europe, free delivery over £35.">'
    '<meta property="og:title" content="Cuppa Panda — Cute Stationery, Bag Charms & Blind Boxes">'
    '<meta property="og:description" content="Cute things for your desk & your bag. Hand-picked, tested, and shipped across the UK, Ireland & Europe.">'
    '<meta property="og:type" content="website">'
    '<meta property="og:url" content="https://cuppapanda.com/">'
    '<meta name="twitter:card" content="summary">'
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E%F0%9F%90%BC%3C/text%3E%3C/svg%3E">'
)
html = html.replace("</title>", "</title>" + head_extra, 1)

# --- 3. CSS for cart, add buttons, newsletter message, footer links ---
css_extra = """
.cartbtn{border:2px solid var(--pink-deep);background:var(--pink-deep);color:#fff;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer;font-size:13px}
.addbtn{margin-top:9px;width:100%;border:none;background:var(--pink-deep);color:#fff;border-radius:999px;padding:9px 10px;font-weight:700;cursor:pointer;font-size:13px}
.addbtn:active{transform:scale(.97)}
#overlay{position:fixed;inset:0;background:rgba(58,50,56,.45);opacity:0;pointer-events:none;transition:.25s;z-index:40}
#overlay.open{opacity:1;pointer-events:auto}
#drawer{position:fixed;top:0;right:0;width:min(360px,92vw);height:100%;background:#fff;z-index:50;transform:translateX(105%);transition:.3s;display:flex;flex-direction:column;box-shadow:-8px 0 30px rgba(180,120,140,.25)}
#drawer.open{transform:none}
#drawer .dhead{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:2px dashed #f3cfd8}
#drawer .dhead b{font-size:17px}
#drawer .x{border:none;background:#fdf3f5;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer}
#items{flex:1;overflow-y:auto;padding:12px 16px}
.crow{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #f7e6eb}
.crow .nm{font-size:13px;font-weight:600;line-height:1.35}
.crow .pr{font-size:13px;color:var(--pink-deep);font-weight:800;white-space:nowrap}
.qty{display:flex;gap:6px;align-items:center;margin-top:5px}
.qty button{width:24px;height:24px;border-radius:50%;border:1.5px solid #f0c3d0;background:#fff;cursor:pointer;font-weight:800;line-height:1}
.qty .rm{width:auto;border-radius:999px;padding:0 9px;font-size:11px;color:var(--soft)}
#drawer .dfoot{padding:14px 16px;border-top:2px dashed #f3cfd8}
#drawer .tot{display:flex;justify-content:space-between;font-weight:800;font-size:16px;margin-bottom:6px}
#shipNote{font-size:12px;color:var(--soft);margin-bottom:10px;line-height:1.5}
#checkout{width:100%;border:none;background:var(--pink-deep);color:#fff;border-radius:999px;padding:13px;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 5px 0 #c74e72}
.empty{color:var(--soft);text-align:center;padding:26px 0;font-size:14px;line-height:1.6}
.newsmsg{margin-top:12px;font-size:14px;color:#ffe3ec;min-height:18px}
.newsmsg b{color:#fff;background:var(--pink-deep);padding:2px 9px;border-radius:6px;letter-spacing:1px}
footer a{color:var(--pink-deep);font-weight:700;text-decoration:none}
"""
html = html.replace("</style>", css_extra + "</style>", 1)

# --- 4. header cart button ---
html = html.replace(
    '<div class="curry"><button data-cur="GBP" class="on">£ GBP</button><button data-cur="EUR">€ EUR</button><button data-cur="USD">$ USD</button></div></header>',
    '<div class="curry"><button data-cur="GBP" class="on">£ GBP</button><button data-cur="EUR">€ EUR</button><button data-cur="USD">$ USD</button></div>'
    '<button class="cartbtn" id="cartBtn" type="button">🛒 Cart (<span id="cartCount">0</span>)</button></header>', 1)
assert 'id="cartBtn"' in html

# --- 5. hero pick Add to cart: dead link -> real button ---
html = html.replace('<a class="btn" href="#">Add to cart 🛒</a>',
                    '<button class="btn" type="button" id="heroAdd" style="border:none;cursor:pointer;font-size:15px">Add to cart 🛒</button>', 1)
assert 'id="heroAdd"' in html

# --- 6. newsletter: ids + message line ---
html = html.replace('<input type="email" placeholder="Your email address"><button>Join</button>',
                    '<input type="email" id="newsEmail" placeholder="Your email address"><button type="button" id="newsJoin">Join</button><p class="newsmsg" id="newsMsg"></p>', 1)
assert 'id="newsEmail"' in html

# --- 7. footer: linked email + socials ---
html = html.replace(
    'Contact: hello@cuppapanda.com · Instagram / TikTok @cuppapanda',
    'Contact: <a href="mailto:hello@cuppapanda.com">hello@cuppapanda.com</a> · '
    '<a href="https://www.instagram.com/cuppapanda" target="_blank" rel="noopener">Instagram @cuppapanda</a> · '
    '<a href="https://www.tiktok.com/@cuppapanda" target="_blank" rel="noopener">TikTok @cuppapanda</a>', 1)
assert "instagram.com/cuppapanda" in html

# blind-box step: link the tag shout-out too
html = html.replace('Film your unboxing and tag @cuppapanda!',
                    'Film your unboxing and tag <a href="https://www.instagram.com/cuppapanda" target="_blank" rel="noopener">@cuppapanda</a>!', 1)

# --- 8. cart drawer markup BEFORE the <script> (script wires it up on parse) ---
drawer = """
<div id="overlay"></div>
<aside id="drawer" aria-label="Shopping cart">
  <div class="dhead"><b>Your cart 🛒</b><button class="x" id="drawerClose" type="button" aria-label="Close cart">✕</button></div>
  <div id="items"></div>
  <div class="dfoot">
    <div class="tot"><span>Subtotal</span><span id="subTotal">£0.00</span></div>
    <p id="shipNote"></p>
    <button id="checkout" type="button">Checkout by email 📧</button>
    <p style="font-size:11px;color:var(--soft);margin-top:8px;line-height:1.5">Opening-soon checkout: this opens an email with your order pre-filled — we reply with a secure payment link. No payment is taken on this page.</p>
  </div>
</aside>
"""
assert html.count("<script>") == 1
html = html.replace("<script>", drawer + "<script>", 1)

# --- 9. new script: keep flip + currency, add cart + newsletter ---
script = """<script>
function flip(el){var img=el.querySelector('img');var t=img.getAttribute('src');img.setAttribute('src',img.dataset.alt);img.dataset.alt=t;}
var RATES={GBP:{r:0.75,s:'\\u00a3',t:'\\u00a335',th:35},EUR:{r:0.86,s:'\\u20ac',t:'\\u20ac40',th:40},USD:{r:1,s:'$',t:'$45',th:45}};
var CUR='GBP';
function charm(usd){var v=usd*RATES[CUR].r;return RATES[CUR].s+(Math.floor(v)+0.99).toFixed(2);}
function unit(usd){return Math.floor(usd*RATES[CUR].r)+0.99;}
function fmt(v){return RATES[CUR].s+v.toFixed(2);}
function money(usd){return fmt(unit(usd));}
function setCur(c){CUR=c;var R=RATES[c];document.querySelectorAll('.p').forEach(function(el){el.textContent=charm(parseFloat(el.dataset.usd));});document.getElementById('thresh').textContent=R.t;document.querySelectorAll('.curry button').forEach(function(b){b.classList.toggle('on',b.dataset.cur===c);});renderCart();}
document.querySelectorAll('.curry button').forEach(function(b){b.addEventListener('click',function(){setCur(b.dataset.cur);});});
/* ---------- cart ---------- */
var cart=[];try{cart=JSON.parse(localStorage.getItem('cuppapanda_cart')||'[]');}catch(e){cart=[];}
function saveCart(){try{localStorage.setItem('cuppapanda_cart',JSON.stringify(cart));}catch(e){}}
function cartQty(){return cart.reduce(function(a,i){return a+i.qty;},0);}
function cartTotalUsd(){return cart.reduce(function(a,i){return a+i.usd*i.qty;},0);}
function cartTotalCur(){return cart.reduce(function(a,i){return a+unit(i.usd)*i.qty;},0);}
function addToCart(name,usd){var f=cart.find(function(i){return i.name===name;});if(f){f.qty++;}else{cart.push({name:name,usd:usd,qty:1});}saveCart();renderCart();openDrawer();}
function changeQty(name,d){var f=cart.find(function(i){return i.name===name;});if(!f)return;f.qty+=d;if(f.qty<=0){cart=cart.filter(function(i){return i.name!==name;});}saveCart();renderCart();}
function removeItem(name){cart=cart.filter(function(i){return i.name!==name;});saveCart();renderCart();}
function renderCart(){
  document.getElementById('cartCount').textContent=cartQty();
  var box=document.getElementById('items');
  if(!cart.length){box.innerHTML='<div class="empty">Your cart is empty 🐼<br>Add something cute!</div>';}
  else{box.innerHTML=cart.map(function(i){return '<div class="crow"><div><div class="nm">'+i.name+'</div><div class="qty"><button type="button" onclick="changeQty(\\''+i.name.replace(/'/g,"\\\\'")+'\\',-1)">\\u2212</button><span>'+i.qty+'</span><button type="button" onclick="changeQty(\\''+i.name.replace(/'/g,"\\\\'")+'\\',1)">+</button><button type="button" class="rm" onclick="removeItem(\\''+i.name.replace(/'/g,"\\\\'")+'\\')">remove</button></div></div><div class="pr">'+fmt(unit(i.usd)*i.qty)+'</div></div>';}).join('');}
  var tot=cartTotalCur();document.getElementById('subTotal').textContent=fmt(tot);
  var th=RATES[CUR].th, conv=tot;
  document.getElementById('shipNote').textContent=!cart.length?'Free delivery over '+RATES[CUR].t+'.':(conv>=th?'\\ud83c\\udf89 You unlocked FREE delivery!':'Add '+RATES[CUR].s+(th-conv).toFixed(2)+' more for free delivery. Delivery is confirmed in your checkout email.');
  document.getElementById('checkout').style.opacity=cart.length?'1':'.5';
}
function openDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('overlay').classList.add('open');}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('overlay').classList.remove('open');}
document.getElementById('cartBtn').addEventListener('click',openDrawer);
document.getElementById('drawerClose').addEventListener('click',closeDrawer);
document.getElementById('overlay').addEventListener('click',closeDrawer);
document.getElementById('checkout').addEventListener('click',function(){
  if(!cart.length)return;
  var lines=cart.map(function(i){return i.qty+' x '+i.name+' \\u2014 '+fmt(unit(i.usd)*i.qty);});
  var body='Hi Cuppa Panda! I would like to order:\\n\\n'+lines.join('\\n')+'\\n\\nSubtotal: '+fmt(cartTotalCur())+' ('+CUR+')\\n\\nMy name: \\nDelivery address: \\n';
  window.location.href='mailto:hello@cuppapanda.com?subject='+encodeURIComponent('Cuppa Panda order')+'&body='+encodeURIComponent(body);
});
/* add-to-cart buttons on every product card */
document.querySelectorAll('.card').forEach(function(card){
  var h=card.querySelector('h4'),p=card.querySelector('.p');if(!h||!p)return;
  var b=document.createElement('button');b.type='button';b.className='addbtn';b.textContent='Add to cart \\ud83d\\uded2';
  b.addEventListener('click',function(){addToCart(h.textContent.trim(),parseFloat(p.dataset.usd));});
  card.querySelector('.body').appendChild(b);
});
var heroBtn=document.getElementById('heroAdd');
if(heroBtn){heroBtn.addEventListener('click',function(){var s=document.querySelector('#hero-pick .txt');addToCart(s.querySelector('h3').textContent.trim(),parseFloat(s.querySelector('.p').dataset.usd));});}
/* ---------- newsletter ---------- */
function joinClub(){
  var inp=document.getElementById('newsEmail'),msg=document.getElementById('newsMsg'),v=inp.value.trim();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)){msg.textContent='Please enter a valid email address \\ud83d\\udc9c';return;}
  try{var list=JSON.parse(localStorage.getItem('cuppapanda_club')||'[]');if(list.indexOf(v)===-1){list.push(v);localStorage.setItem('cuppapanda_club',JSON.stringify(list));}}catch(e){}
  msg.innerHTML='You are in! \\ud83c\\udf89 Your 15% off code is <b>PANDA15</b> \\u2014 use it on your first order.';
  inp.value='';
}
document.getElementById('newsJoin').addEventListener('click',joinClub);
document.getElementById('newsEmail').addEventListener('keydown',function(e){if(e.key==='Enter'){joinClub();}});
setCur('GBP');renderCart();
</script>"""
html = re.sub(r"<script>.*?</script>", lambda m: script, html, flags=re.S)

out = ROOT / "index.html"
out.write_text(html)
print(f"v3 {orig_len/1e6:.2f} MB single file -> v4 index.html {len(html)/1024:.0f} KB + {n_imgs} images in images/")
print("total images size KB:", sum(f.stat().st_size for f in IMGDIR.glob('*.jpg')) // 1024)
