const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'cadastro.html',
  'produtos.html',
  'resumo.html',
  'pagamento.html',
  'nota.html'
];

// Dictionary of component replacements to make first
const components = [
  {
    find: /w-full text-center text-3xl font-bold tracking-tighter border-2 border-slate-300 bg-slate-50 text-blue-900 rounded-2xl p-5 focus:outline-none focus:border-blue-900 transition-all(\s+mb-6)? placeholder-slate-400 shadow-inner/g,
    replace: (match, mb) => `input-padrao${mb || ''}`
  },
  {
    find: /w-full bg-blue-900 text-white text-xl font-black py-5 rounded-2xl hover:bg-blue-800 shadow-lg shadow-blue-900\/20 transition-all/g,
    replace: () => `btn-primary hover:bg-blue-800`
  },
  {
    find: /flex-1 bg-slate-100 text-blue-900 border border-slate-300 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all/g,
    replace: () => `btn-secondary hover:bg-slate-200`
  },
  {
    find: /flex-\[2\] bg-blue-900 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-900\/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all hover:bg-blue-800/g,
    replace: () => `btn-primary hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex-[2]`
  },
  {
    find: /w-full bg-white px-8 py-10 rounded-3xl shadow-xl border border-slate-200 text-center/g,
    replace: () => `card-padrao`
  }
];

files.forEach(fileName => {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${fileName}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove CDN
  content = content.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n?/g, '');
  
  // Enforce output.css link
  if (!content.includes('href="css/output.css"')) {
    content = content.replace(/href="css\/style\.css"/g, 'href="css/output.css"');
  }

  // Replace component classes
  components.forEach(comp => {
    content = content.replace(comp.find, comp.replace);
  });

  // Format all classes into multi-line
  content = content.replace(/class="([^"]+)"/g, (match, classes) => {
    // split by whitespace, filter empties
    const classList = classes.replace(/\n/g, ' ').split(/\s+/).filter(c => c.trim() !== '');
    if (classList.length <= 1) return match; // Leave single classes alone or format them? User wants ALL. Let's do >1.
    
    // Output formatted string
    const formatted = classList.join('\n    ');
    return `class="\n    ${formatted}\n  "`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${fileName}`);
});
