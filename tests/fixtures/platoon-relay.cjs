// Protocol-only substitute for the hosted Phoenix relay. The two browsers still use
// the bundled Realtime SDK/WebSocket API; authorize each join and writer in real SQL.
module.exports=function relay(pg,identityFor) {
  const sockets=new Set(),counts=new Map(),errors=[];
  async function attach(page) {
    await page.routeWebSocket('wss://tkkpdtfhcwwondonfjsi.supabase.co/realtime/v1/**',ws=>{
      const c={ws,channels:new Map()};sockets.add(c);let chain=Promise.resolve();
      const send=p=>ws.send(JSON.stringify(p));
      ws.onClose(()=>sockets.delete(c));
      ws.onMessage(raw=>{chain=chain.then(async()=>{
        const {topic,event,payload,ref}=JSON.parse(raw);
        const reply=(status='ok',response={})=>send({topic,event:'phx_reply',payload:{status,response},ref});
        if(event==='phx_join') {
          const name=topic.replace(/^realtime:/,''),id=identityFor(payload.access_token);
          if(!id||!payload.config.private||!await pg.rpc(id,'city_tanks_platoon_channel_v1',[name,false]))return reply('error');
          c.channels.set(topic,await pg.rpc(id,'city_tanks_platoon_channel_v1',[name,true]));return reply();
        }
        if(event==='phx_leave') {c.channels.delete(topic);return reply();}
        if(event==='heartbeat'||event==='access_token')return reply();
        if(event!=='broadcast'||!c.channels.get(topic))throw Error('unexpected publisher: '+topic+' '+event);
        counts.set(payload.event,(counts.get(payload.event)||0)+1);
        for(const peer of sockets)if(peer!==c && peer.channels.has(topic))peer.ws.send(JSON.stringify({topic,event,payload,ref:null}));
        reply();
      }).catch(e=>errors.push(e.message));});
    });
  }
  return {attach,counts,errors,sockets};
};
