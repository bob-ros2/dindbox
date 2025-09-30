import React from 'react';

interface JsonViewerProps {
  jsonString: string;
}

const highlightJson = (jsonStr: string): string => {
  if (!jsonStr) return '';
  
  return jsonStr
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?/g, (match) => {
      let cls = 'json-string';
      if (/:$/.test(match)) {
        cls = 'json-key';
      }
      return `<span class="${cls}">${match}</span>`;
    })
    .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
    .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
    .replace(/([,\[\]{}:])|(-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, (match, punctuation, number) => {
        if(number) {
            return `<span class="json-number">${number}</span>`;
        }
        return match;
    });
};

export const JsonViewer: React.FC<JsonViewerProps> = ({ jsonString }) => {
  let content;
  let formattedJson = '';
  try {
    const parsed = JSON.parse(jsonString);
    formattedJson = JSON.stringify(parsed, null, 2);
    content = { __html: highlightJson(formattedJson) };
  } catch (error) {
    // Show the raw string if it's not valid JSON
    content = { __html: `<span class="text-red-500">${jsonString}</span>` };
  }

  return (
    <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap break-all">
      <code dangerouslySetInnerHTML={content} />
    </pre>
  );
};
