const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['node_modules/vercel/dist/index.js','env','add','APPLY_DEMO_UPGRADE','production,preview','--force','--yes'],{stdio:['pipe','ignore','pipe']});
child.stdin.end('true');child.stderr.on('data',c=>process.stderr.write(c));child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code;console.log(code===0?'Actualización controlada habilitada para el despliegue':'No se habilitó la actualización');});
