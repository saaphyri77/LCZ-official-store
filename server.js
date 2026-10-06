const express=require('express');
const Stripe=require('stripe');
const path=require('path');
const app=express();
app.use(express.json());
app.use(express.static(__dirname));
const catalog={
 'Women Shorts Set':45,'Women Pants Set':55,'Women 3-Piece Set':75,
 'Men Shorts Set':50,'Men Pants Set':60,'Men 3-Piece Set':80
};
app.post('/api/create-checkout-session',async(req,res)=>{
 try{
  if(!process.env.STRIPE_SECRET_KEY) return res.status(500).json({error:'Stripe is not connected yet on the server.'});
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const items=Array.isArray(req.body.items)?req.body.items:[];
  if(!items.length) return res.status(400).json({error:'Cart is empty.'});
  const line_items=items.map(i=>{
    if(!(i.name in catalog)) throw new Error('Invalid product.');
    const quantity=Math.max(1,Math.min(10,Number(i.quantity)||1));
    const desc=[i.color&&`Color: ${i.color}`,i.size&&`Size: ${i.size}`].filter(Boolean).join(' • ');
    return {quantity,price_data:{currency:'usd',unit_amount:catalog[i.name]*100,product_data:{name:i.name,description:desc}}};
  });
  const base=(process.env.PUBLIC_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');
  const subtotalCents=items.reduce((sum,i)=>{
    if(!(i.name in catalog)) throw new Error('Invalid product.');
    const quantity=Math.max(1,Math.min(10,Number(i.quantity)||1));
    return sum + catalog[i.name]*100*quantity;
  },0);
  const shippingAmount=subtotalCents>=10000?0:899;
  const session=await stripe.checkout.sessions.create({
    mode:'payment',line_items,
    success_url:`${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${base}/cancel.html`,
    billing_address_collection:'auto',
    shipping_address_collection:{allowed_countries:['US']},
    shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:shippingAmount,currency:'usd'},display_name:shippingAmount===0?'Free U.S. Shipping':'Standard U.S. Shipping',delivery_estimate:{minimum:{unit:'business_day',value:3},maximum:{unit:'business_day',value:7}}}}],
    phone_number_collection:{enabled:true},
    allow_promotion_codes:true
  });
  res.json({url:session.url});
 }catch(e){res.status(400).json({error:e.message});}
});
const port=process.env.PORT||3000; app.listen(port,()=>console.log(`LCZ store running on ${port}`));
