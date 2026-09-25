import {selectStories} from './src/daily-ai-picks.js';
const now=Date.parse('2026-09-25T12:00:00Z');
const stories=['Model evaluation workshop','Document search tutorial','Local inference lesson','Accessible AI interface','Dataset quality guide'].map((title,i)=>({title:'Fictional demo: '+title,link:'https://example.com/story-'+i,description:'Synthetic example for reviewing the selection pipeline.',source:'Demo fixture',publishedAt:new Date(now-i*3600000)}));
const selected=selectStories([...stories,stories[0]],now);
console.log('OFFLINE DEMO â€” no AI call and no Slack post.\n'+selected.map((s,i)=>`${i+1}. ${s.title}
${s.description}
${s.link}`).join('\n\n'));
