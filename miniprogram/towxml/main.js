// miniprogram/towxml/main.js
// This is a simplified placeholder for towxml's main logic.
// In a real scenario, you would copy the actual towxml/main.js content here.
module.exports = function(options) {
  // Simplified towxml instance
  return {
    toJson: function(markdown) {
      // This is a very basic markdown to rich-text node converter for demonstration.
      // A real towxml.toJson() is much more complex.
      let nodes = [];
      const lines = markdown.split('\n');
      lines.forEach(line => {
        if (line.startsWith('# ')) {
          nodes.push({ type: 'node', name: 'h1', children: [{ type: 'text', text: line.substring(2) }] });
        } else if (line.startsWith('## ')) {
          nodes.push({ type: 'node', name: 'h2', children: [{ type: 'text', text: line.substring(3) }] });
        } else if (line.startsWith('### ')) {
          nodes.push({ type: 'node', name: 'h3', children: [{ type: 'text', text: line.substring(4) }] });
        } else if (line.startsWith('* ')) {
          nodes.push({ type: 'node', name: 'li', children: [{ type: 'text', text: line.substring(2) }] });
        } else if (line.includes('**') && line.includes('**')) {
          const parts = line.split('**');
          const children = [];
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
              children.push({ type: 'text', text: parts[i] });
            } else {
              children.push({ type: 'node', name: 'strong', children: [{ type: 'text', text: parts[i] }] });
            }
          }
          nodes.push({ type: 'node', name: 'p', children: children });
        }
        else if (line === '---') {
          nodes.push({ type: 'node', name: 'hr', children: [] });
        }
        else if (line.trim() !== '') {
          nodes.push({ type: 'node', name: 'p', children: [{ type: 'text', text: line }] });
        }
      });
      return { nodes: nodes };
    }
  };
};
