import{fb as o}from"./index-CXlKrUqI.js";import{c as m}from"./createLucideIcon-Cc9YfBd0.js";const w=async({operation:i,until:l,delay:n,interval:c,attempts:e,signal:s})=>{let r,a;n&&await o(n);let t=0;for(;t<e;){if(s!=null&&s.aborted)return{status:"aborted",result:r,attempts:t,error:a};t++;try{if(a=void 0,r=await i(),l(r))return{status:"success",result:r,attempts:t};t<e&&await o(c)}catch(u){u instanceof Error&&(a=u),t<e&&await o(c)}}return{status:"max_attempts",result:r,attempts:t,error:a}};/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],h=m("chevron-down",p);export{h as C,w as r};
