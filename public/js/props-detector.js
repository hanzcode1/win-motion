/* ============================================================
   Props Detector - parse interface Props dari TypeScript
   ============================================================ */

/**
 * Parse props dari kode TypeScript composition.
 * Return array of field definitions:
 * {
 *   name: 'title',
 *   type: 'string' | 'number' | 'boolean' | 'color' | 'select' | 'json',
 *   label: 'Title',
 *   defaultValue: any,
 *   optional: boolean,
 *   options?: [...]  // untuk enum
 * }
 */
function detectPropsFromCode(code) {
  if (!code || typeof code !== 'string') return [];

  const fields = [];

  // 1. Cari interface Props atau type Props
  const interfaceMatch = code.match(
    /(?:export\s+)?(?:interface|type)\s+Props\s*(?:=\s*)?\{([\s\S]*?)\}/m
  );

  if (interfaceMatch) {
    const body = interfaceMatch[1];
    const fieldRegex = /(?:^|\n)\s*([a-zA-Z_$][\w$]*)\??\s*:\s*([^;,\n]+)/g;
    let m;
    while ((m = fieldRegex.exec(body)) !== null) {
      const name = m[1];
      const rawType = m[2].trim();
      const optional = code.includes(`${name}?`);
      const def = detectDefaultFromCode(code, name);
      fields.push(parseField(name, rawType, def, optional));
    }
  }

  // 2. Fallback: cari propTypes pattern di dalam function
  if (fields.length === 0) {
    fields.push(...detectFromUsage(code));
  }

  return fields;
}

/**
 * Parse type string → field definition
 */
function parseField(name, rawType, defaultValue, optional) {
  const t = rawType.toLowerCase();

  // Union type (enum) - e.g. 'left' | 'right' | 'center'
  const unionMatch = rawType.match(/'([^']+)'\s*\|\s*'([^']+)'/);
  if (unionMatch || rawType.includes('|')) {
    const options = [...rawType.matchAll(/'([^']+)'/g)].map(m => m[1]);
    if (options.length > 0) {
      return {
        name,
        type: 'select',
        label: humanize(name),
        defaultValue: defaultValue !== undefined ? defaultValue : options[0],
        optional,
        options
      };
    }
  }

  // String
  if (t.includes('string') && !t.includes('[]')) {
    // Cek apakah nama/type mengindikasikan warna
    const isColor = /color/i.test(name) || /^#[0-9a-f]{3,8}$/i.test(defaultValue || '');
    return {
      name,
      type: isColor ? 'color' : 'text',
      label: humanize(name),
      defaultValue: defaultValue !== undefined ? defaultValue : '',
      optional
    };
  }

  // Number
  if (t.includes('number')) {
    return {
      name,
      type: 'number',
      label: humanize(name),
      defaultValue: defaultValue !== undefined ? defaultValue : 0,
      optional
    };
  }

  // Boolean
  if (t.includes('boolean')) {
    return {
      name,
      type: 'checkbox',
      label: humanize(name),
      defaultValue: defaultValue !== undefined ? defaultValue : false,
      optional
    };
  }

  // Array
  if (t.includes('[]') || t.includes('array')) {
    return {
      name,
      type: 'json',
      label: humanize(name),
      defaultValue: defaultValue !== undefined ? defaultValue : [],
      optional
    };
  }

  // Object / unknown
  return {
    name,
    type: 'json',
    label: humanize(name),
    defaultValue: defaultValue !== undefined ? defaultValue : {},
    optional
  };
}

/**
 * Deteksi default value dari kode.
 * Pattern: `props.title || 'Hello'` atau `props.title ?? 'Hello'`
 * atau `const title = props.title || 'X'`
 */
function detectDefaultFromCode(code, propName) {
  // Pattern: props.NAME || 'xxx' / props.NAME ?? 'xxx' / props.NAME || number / props.NAME || true
  const patterns = [
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*'([^']*)'`, 'i'),
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*"([^"]*)"`, 'i'),
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*(-?\\d+\\.?\\d*)`, 'i'),
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*(true|false)`, 'i'),
  ];

  for (const re of patterns) {
    const m = code.match(re);
    if (m) {
      const val = m[1];
      if (val === 'true') return true;
      if (val === 'false') return false;
      if (/^-?\d/.test(val)) return Number(val);
      return val;
    }
  }

  // Pattern: destructure dengan default
  // const { title = 'Hello' } = props;
  const destructureRe = new RegExp(`\\b${propName}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(-?\\d+\\.?\\d*)|(true|false))`, 'i');
  const dm = code.match(destructureRe);
  if (dm) {
    if (dm[1] !== undefined) return dm[1];
    if (dm[2] !== undefined) return dm[2];
    if (dm[3] !== undefined) return Number(dm[3]);
    if (dm[4] === 'true') return true;
    if (dm[4] === 'false') return false;
  }

  return undefined;
}

/**
 * Fallback: cari `props.xxx` yang dipakai di kode
 */
function detectFromUsage(code) {
  const names = new Set();
  const re = /props\.([a-zA-Z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(code)) !== null) names.add(m[1]);

  return [...names].map(name => {
    const def = detectDefaultFromCode(code, name);
    const type =
      typeof def === 'boolean' ? 'checkbox' :
      typeof def === 'number' ? 'number' :
      (def && /^#[0-9a-f]{3,8}$/i.test(def)) ? 'color' :
      'text';
    return {
      name,
      type,
      label: humanize(name),
      defaultValue: def !== undefined ? def : (type === 'checkbox' ? false : type === 'number' ? 0 : ''),
      optional: true
    };
  });
}

/**
 * 'showIcon' → 'Show Icon'
 */
function humanize(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

/**
 * Build value props object dari field definitions
 */
function buildPropsFromFields(fields, values = {}) {
  const props = {};
  fields.forEach(f => {
    const v = values[f.name];
    if (v !== undefined && v !== null && v !== '') {
      props[f.name] = v;
    } else if (f.defaultValue !== undefined) {
      props[f.name] = f.defaultValue;
    }
  });
  return props;
}

// Export untuk dipakai global
window.PropsDetector = {
  detectPropsFromCode,
  buildPropsFromFields,
  humanize
};