'use strict';

var ploc = {};
ploc.opts = {};
ploc.opts.minItemsForToc = 3;
ploc.utils = {};


ploc.utils.reverseString = function (string) {
  return string.split("").reverse().join("");
};


ploc.utils.capitalizeString = function (string) {
  return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
};


ploc.utils.getAnchor = function (name) {
  return name.trim().toLowerCase().replace(/[^\w\- ]+/g, '').replace(/\s/g, '-').replace(/\-+$/, '');
};


// Helper function to get the doc data as JSON object - you can use this
// function to creata your own output instead of using ploc.getDoc(code).
ploc.getDocData = function (code) {

  // We need to work on a reversed string to avoid to fetch too much text, so the keywords for package, function and so on are looking ugly...
  var regexItem = /(?:\/\*{2,}\s*((?:.|\s)+?)\s*\*{2,}\/)\s*((?:.|\s)*?\s*([\w$#]+|".+?")(\.(?:[\w$#]+|".+?")){0,1}(\s+ydob){0,1}\s+(reggirt|epyt|erudecorp|noitcnuf|egakcap))\s*(?:(?:ECALPER\s+RO\s+){0,1}ETAERC){0,1}\s*$/gim
  /*
  - $1: description     (undefined | 'description of function' )
  - $2: code signature
  - $3: name
  - $4: parent          (undefined | 'nameOfParent.' )
  - $5: secondary type  (undefined | body )
  - $6: type            (package | function | procedure | type | trigger )
  */
  var regexHeaderSetext = /(^(?:\s*(?:\r\n|\n|\r))* {0,3}\S.+(?:\r\n|\n|\r) {0,3}=+ *)(?:\r\n|\n|\r)/;
  var regexHeaderAtx = /(^(?:\s*(?:\r\n|\n|\r))* {0,3}# +.+)(?:\r\n|\n|\r)/;
  var regexHeaderTop = /(?:\r\n|\n|\r){0,1}(.+)(?:\r\n|\n|\r)={3,}/;
  var regexLeadingWhitespace = /^(?:\s*(?:\r\n|\n|\r))*/;
  var match;
  var anchors = [];
  var data = {};
  data.header = '';
  data.toc = (ploc.opts.tocStyles ? '<ul style="' + ploc.opts.tocStyles + '">\n' : '');
  data.items = [];
  code = ploc.utils.reverseString(code);

  // Get base attributes.
  if (!regexItem.test(code)) {
    if (args.debug) console.warn('PLOC: Document contains no code to process!');
  } else {
    // Reset regexItem index to find all occurrences with exec.
    // Also see: https://www.tutorialspoint.com/javascript/regexItem_lastindex.htm
    regexItem.lastIndex = 0;
    while (match = regexItem.exec(code)) {
      var item = {};
      item.description = (match[1] === undefined) ? '' : ploc.utils.reverseString(match[1]);
      item.description
        .replace(/{{@}}/g, '@')   // Special SQL*Plus replacements. SQL*Plus is reacting on those special
        .replace(/{{#}}/g, '#')   // characters when they occur as the first character in a line of code.
        .replace(/{{\/}}/g, '/'); // That can be bad when you try to write Markdown with sample code.
      item.signature = ploc.utils.reverseString(match[2]);
      item.name = ploc.utils.reverseString(match[3]);
      item.parent = (match[4] === undefined) ? '' : ploc.utils.reverseString(match[4]);
      item.secondarytype = (match[5] === undefined) ? '' : ploc.utils.reverseString(match[5]);
      item.type = ploc.utils.capitalizeString(ploc.utils.reverseString(match[6]));
      data.items.push(item);
    }
  }

  // Calculate additional attributes.
  data.items.reverse().forEach(function (item, i) {

    // Process global document header, if provided in first item (index = 0).
    if (i === 0) {
      if (match = regexHeaderSetext.exec(data.items[i].description)) {
        data.header = match[1];
        data.items[i].description = data.items[i].description
          .replace(regexHeaderSetext, '')
          .replace(regexLeadingWhitespace, '');
      }
      else if (match = regexHeaderAtx.exec(data.items[i].description)) {
        data.header = match[1];
        data.items[i].description = data.items[i].description
          .replace(regexHeaderAtx, '')
          .replace(regexLeadingWhitespace, '');
      } else if (match = regexHeaderTop.exec(data.items[i].description)) {
        data.header = match[1];
        data.items[i].description = data.items[i].description
          .replace(regexHeaderTop, '')
          .replace(regexLeadingWhitespace, '');
      }
    }

    // Define item header and anchor for TOC.
    if (data.items[i].secondarytype !== '') {
      data.items[i].header = data.items[i].type + ' ' + data.items[i].parent + data.items[i].name;
    } else {
      data.items[i].header = data.items[i].type + ' ' + data.items[i].secondarytype + data.items[i].parent + data.items[i].name;

    }
    data.items[i].anchor = ploc.utils.getAnchor(data.items[i].header);
    // Ensure unique anchors.
    if (anchors.indexOf(data.items[i].anchor) !== -1) {
      var j = 0;
      var anchor = data.items[i].anchor;
      while (anchors.indexOf(data.items[i].anchor) !== -1 && j++ <= 100) {
        data.items[i].anchor = anchor + '-' + j;
      }
    }
    anchors.push(data.items[i].anchor);
    data.toc += (
      ploc.opts.tocStyles ?
        '<li><a href="#' + data.items[i].anchor + '">' + data.items[i].header + '</a></li>\n' :
        '- [' + data.items[i].header + '](#' + data.items[i].anchor + ')\n'
    );

  });

  data.toc += (ploc.opts.tocStyles ? '</ul>\n' : '');

  return data;
};


// The main function to create the Markdown document.
ploc.getDoc = function (code) {
  var doc = '';
  var docData = ploc.getDocData(code);
  var provideToc = (docData.items.length >= ploc.opts.minItemsForToc);

  if(docData.items.length == 0) return '';

  doc += (docData.header ? docData.header + '\n\n' : '');
  doc += (provideToc ? docData.toc + '\n\n' : '');

  docData.items.forEach(function (item, i) {
    var level = (i === 0 && !docData.header ? 1 : 2);
    doc += (
      ploc.opts.autoHeaderIds ?
        '<h' + level + '><a id="' + item.anchor + '"></a>' + item.header + '</h' + level + '>\n' +
        '<!--' + (level === 1 ? '=' : '-').repeat((15 + item.header.length + item.anchor.length)) + '-->\n\n'
        :
        '#'.repeat(level) + ' ' + item.header + '\n\n'
    ) +
      item.description + '\n\n' +
      'SIGNATURE\n\n' +
      '```sql\n' +
      item.signature + '\n' +
      '```\n\n\n';
  });

  return doc;
}


module.exports = ploc;
