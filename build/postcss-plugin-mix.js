const postcss = require('postcss');
const fs = require('fs');

const REG_FAKE_MIX = /^\s*_mix\((.+)\)\s*$/;
const REG_COLOR_PROP = /color|^background$/;
const REG_PARAMS_SEP = /\s*,\s*/;
const REG_CSS_VAR = /^var\((--[^)]+)\)$/;
const REG_CSS_VARS = /var\(--[^)]+\)/g;
const REG_PERCENT = /^([0-9]{1,})%?$/;
const REG_CSS_VAR_NAME = /^--/;

const colors = {
  white: '#fff',
  black: '#000',
  transparent: undefined
};

function colorOrCssVar(color) {
  if (color in colors) return color;
  const match = color.match(REG_CSS_VAR);
  return match[1];
}

function parseParams(color1, color2, weight) {
  const params = [];

  params.push(colorOrCssVar(color1));
  params.push(colorOrCssVar(color2));

  if (!weight) {
    params.push(50);
  } else {
    const match = weight.match(REG_CSS_VAR) || weight.match(REG_PERCENT);
    params.push(match[1]);
  }

  return params;
}

module.exports = postcss.plugin('_mix', ({baseVars, vars, dest}) => {
  return (css, result) => {
    css.walkDecls(declaration => {
      // 声明了一个 css 变量
      if (REG_CSS_VAR_NAME.test(declaration.prop)) {
        baseVars[declaration.prop] = true;
      }

      const value = declaration.value;
      if (!value) return;

      // _mix expressions
      const match = value.match(REG_FAKE_MIX);
      if (match) {
        const params = match[1].split(REG_PARAMS_SEP);

        // weight is optional
        if (params.length !== 2 && params.length !== 3) {
          throw new Error('invalid mix', declaration.source.input.file, declaration.source.start.line, declaration.prop, declaration.value);
        } else {
          const values = parseParams(...params);
          values.forEach(value => {
            if (REG_CSS_VAR_NAME.test(value) && !(value in baseVars)) {
              throw new Error('unknown css var: ' + value);
            }
          });

          const prefix = values[0].startsWith('--') ? '' : '--';
          const prefix2 = values[1].startsWith('--') ? '' : '--';
          const newVar = prefix + values[0] + prefix2 + values[1] + prefix2 + values[2];
          vars[newVar] = values;

          declaration.value = `var(${newVar})`;
        }
      } else if (REG_COLOR_PROP.test(declaration.prop)) {
        declaration.value.replace(REG_CSS_VARS, v => {
          const match = v.match(REG_CSS_VAR);
          if (!match) {
            throw new Error('invalid css var expression: ' + declaration.value);
          }
          const cssVar = match[1];
          if (!(cssVar in baseVars)) {
            throw new Error('unknown css var: ' + cssVar + ', ' + declaration.value);
          }
        });
      }
    });
    fs.writeFileSync(dest, JSON.stringify(vars));
  };
});
