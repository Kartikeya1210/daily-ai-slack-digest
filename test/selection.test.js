import test from 'node:test';import assert from 'node:assert/strict';import {selectStories} from '../src/daily-ai-picks.js';
test('excludes stale, future, invalid and duplicate stories; keeps newest five',()=>{
 const now=Date.parse('2026-09-25T12:00:00Z');const story=(title,time)=>({title,link:'https://example.com',publishedAt:new Date(time)});
 const rows=Array.from({length:8},(_,i)=>story('Item '+i,now-i*1000));
 const result=selectStories([...rows,story('Item 0',now),story('Old',now-4*86400000),story('Future',now+1),story('Bad','bad')],now);
 assert.equal(result.length,5);assert.deepEqual(result.map(r=>r.title),['Item 0','Item 1','Item 2','Item 3','Item 4']);
});
