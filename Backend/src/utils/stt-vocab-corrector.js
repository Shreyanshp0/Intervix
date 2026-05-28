class SttVocabCorrector {
  constructor() {
    this.rules = [
      { regex: /\bnode\s*js\b/gi, replacement: 'Node.js' },
      { regex: /\breact\s*js\b/gi, replacement: 'React' },
      { regex: /\bmongo\s*db\b/gi, replacement: 'MongoDB' },
      { regex: /\bj\s*w\s*t\b/gi, replacement: 'JWT' },
      { regex: /\bweb\s*rtc\b/gi, replacement: 'WebRTC' },
      { regex: /\bmern\b/gi, replacement: 'MERN' },
      { regex: /\bjavascript\b/gi, replacement: 'JavaScript' },
      { regex: /\btailwind\b/gi, replacement: 'Tailwind' },
      { regex: /\btypescript\b/gi, replacement: 'TypeScript' },
      { regex: /\bredux\b/gi, replacement: 'Redux' },
      { regex: /\bdsa\b/gi, replacement: 'DSA' },
      { regex: /\bapi\b/gi, replacement: 'API' },
      { regex: /\bapis\b/gi, replacement: 'APIs' },
      { regex: /\bhtml\b/gi, replacement: 'HTML' },
      { regex: /\bcss\b/gi, replacement: 'CSS' },
      { regex: /\bsql\b/gi, replacement: 'SQL' },
      { regex: /\bnosql\b/gi, replacement: 'NoSQL' },
      { regex: /\bgraphql\b/gi, replacement: 'GraphQL' },
      { regex: /\buse\s*reducer\b/gi, replacement: 'useReducer' },
      { regex: /\buse\s*state\b/gi, replacement: 'useState' },
      { regex: /\buse\s*effect\b/gi, replacement: 'useEffect' },
      { regex: /\buse\s*context\b/gi, replacement: 'useContext' },
      { regex: /\bcontext\s*api\b/gi, replacement: 'Context API' },
    ];
  }

  /**
   * Cleans up phonetically recognized technical terms to their canonical programmer casing
   * @param {string} text Raw transcription string
   * @returns {string} Fully corrected technical text
   */
  correct(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let corrected = text;
    for (const rule of this.rules) {
      corrected = corrected.replace(rule.regex, rule.replacement);
    }
    return corrected;
  }
}

export default new SttVocabCorrector();
