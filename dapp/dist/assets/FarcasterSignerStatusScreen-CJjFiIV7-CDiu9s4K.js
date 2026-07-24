import{d5 as F,d6 as T,d8 as I,da as d,dE as y,d7 as a,dG as k,en as _,dB as B,dA as n}from"./index-CXlKrUqI.js";import{h as O}from"./CopyToClipboard-DSTf_eKU-C3W4uHOT.js";import{n as q}from"./OpenLink-DZHy38vr-m_e3KpEy.js";import{C as E}from"./QrCode-BV7KfzAf-CQi1A9b8.js";import{n as A}from"./ScreenLayout-Yoa2TSpi-DcWpKHqg.js";import{l as h}from"./farcaster-DPlSjvF5-D5rfP922.js";import"./ModalHeader-CAqKnddp-DW_wjXlK.js";import"./Screen-CLdp3cO6-BpR48GZK.js";import"./index-Dq_xe9dz-CXiEWXll.js";let S="#8a63d2";const M=({appName:u,loading:m,success:i,errorMessage:e,connectUri:r,onBack:s,onClose:c,onOpenFarcaster:o})=>a.jsx(A,k||m?_?{title:e?e.message:"Add a signer to Farcaster",subtitle:e?e.detail:`This will allow ${u} to add casts, likes, follows, and more on your behalf.`,icon:h,iconVariant:"loading",iconLoadingStatus:{success:i,fail:!!e},primaryCta:r&&o?{label:"Open Farcaster app",onClick:o}:void 0,onBack:s,onClose:c,watermark:!0}:{title:e?e.message:"Requesting signer from Farcaster",subtitle:e?e.detail:"This should only take a moment",icon:h,iconVariant:"loading",iconLoadingStatus:{success:i,fail:!!e},onBack:s,onClose:c,watermark:!0,children:r&&k&&a.jsx(R,{children:a.jsx(q,{text:"Take me to Farcaster",url:r,color:S})})}:{title:"Add a signer to Farcaster",subtitle:`This will allow ${u} to add casts, likes, follows, and more on your behalf.`,onBack:s,onClose:c,watermark:!0,children:a.jsxs(L,{children:[a.jsx(N,{children:r?a.jsx(E,{url:r,size:275,squareLogoElement:h}):a.jsx(z,{children:a.jsx(B,{})})}),a.jsxs(P,{children:[a.jsx(V,{children:"Or copy this link and paste it into a phone browser to open the Farcaster app."}),r&&a.jsx(O,{text:r,itemName:"link",color:S})]})]})});let R=n.div`
  margin-top: 24px;
`,L=n.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`,N=n.div`
  padding: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 275px;
`,P=n.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`,V=n.div`
  font-size: 0.875rem;
  text-align: center;
  color: var(--privy-color-foreground-2);
`,z=n.div`
  position: relative;
  width: 82px;
  height: 82px;
`;const Y={component:()=>{let{lastScreen:u,navigateBack:m,data:i}=F(),e=T(),{requestFarcasterSignerStatus:r,closePrivyModal:s}=I(),[c,o]=d.useState(void 0),[j,x]=d.useState(!1),[w,v]=d.useState(!1),g=d.useRef([]),t=i==null?void 0:i.farcasterSigner;d.useEffect(()=>{let C=Date.now(),l=setInterval(async()=>{if(!(t!=null&&t.public_key))return clearInterval(l),void o({retryable:!0,message:"Connect failed",detail:"Something went wrong. Please try again."});t.status==="approved"&&(clearInterval(l),x(!1),v(!0),g.current.push(setTimeout(()=>s({shouldCallAuthOnSuccess:!1,isSuccess:!0}),y)));let p=await r(t==null?void 0:t.public_key),b=Date.now()-C;p.status==="approved"?(clearInterval(l),x(!1),v(!0),g.current.push(setTimeout(()=>s({shouldCallAuthOnSuccess:!1,isSuccess:!0}),y))):b>3e5?(clearInterval(l),o({retryable:!0,message:"Connect failed",detail:"The request timed out. Try again."})):p.status==="revoked"&&(clearInterval(l),o({retryable:!0,message:"Request rejected",detail:"The request was rejected. Please try again."}))},2e3);return()=>{clearInterval(l),g.current.forEach(p=>clearTimeout(p))}},[]);let f=(t==null?void 0:t.status)==="pending_approval"?t.signer_approval_url:void 0;return a.jsx(M,{appName:e.name,loading:j,success:w,errorMessage:c,connectUri:f,onBack:u?m:void 0,onClose:s,onOpenFarcaster:()=>{f&&(window.location.href=f)}})}};export{Y as FarcasterSignerStatusScreen,M as FarcasterSignerStatusView,Y as default};
