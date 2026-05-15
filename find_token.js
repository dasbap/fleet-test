const os = require('os'), path = require('path'), fs = require('fs');
const locs = [
  path.join(os.homedir(), '.vercel', 'auth.json'),
  path.join(process.env.APPDATA || '', 'com.vercel.cli', 'auth.json'),
  path.join(process.env.LOCALAPPDATA || '', 'vercel', 'auth.json'),
];
locs.forEach(l => {
  try { console.log(l + ':', fs.readFileSync(l, 'utf8')); }
  catch(e) { console.log(l + ': NOT FOUND'); }
});
