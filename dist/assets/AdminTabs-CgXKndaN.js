import{j as a}from"./motion-DGR54_Di.js";import{L as i}from"./react-Bi8pVGlq.js";import{c as s,s as n,ap as r,ay as l}from"./index-hmy95fTx.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=s("ListChecks",[["path",{d:"m3 17 2 2 4-4",key:"1jhpwq"}],["path",{d:"m3 7 2 2 4-4",key:"1obspn"}],["path",{d:"M13 6h8",key:"15sg57"}],["path",{d:"M13 12h8",key:"h98zly"}],["path",{d:"M13 18h8",key:"oe0vm4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=s("ScrollText",[["path",{d:"M15 12h-5",key:"r7krc0"}],["path",{d:"M15 8h-5",key:"1khuty"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4",key:"zz82l3"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",key:"1ph1d7"}]]),p=[{key:"presentations",to:"/admin/dashboard",label:"Presentations",icon:n},{key:"videos",to:"/admin/videos",label:"Videos",icon:r},{key:"employees",to:"/admin/employees",label:"Employees",icon:l},{key:"master",to:"/admin/master-data",label:"Master data",icon:d},{key:"audit",to:"/admin/audit",label:"Audit log",icon:h}];function k({active:o}){return a.jsx("nav",{"aria-label":"Admin sections",className:"flex max-w-full gap-1.5 overflow-x-auto rounded-xl border border-white/15 bg-white/5 p-1",children:p.map(e=>{const t=e.key===o;return a.jsxs(i,{to:e.to,"aria-current":t?"page":void 0,title:e.label,className:`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${t?"bg-brand text-white":"text-slate-300 hover:bg-white/10 hover:text-white"}`,children:[a.jsx(e.icon,{size:14}),a.jsx("span",{className:t?"":"hidden xl:inline",children:e.label})]},e.to)})})}export{k as A};
